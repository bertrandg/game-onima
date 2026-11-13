import * as THREE from 'three';
import {
  LANES, GRAVITY, JUMP_V, FAST_DROP_V, SLIDE_TIME, PLAYER_H, PLAYER_SLIDE_H, speedAt,
} from './config.js';
import { World } from './world.js';
import { Obstacles } from './obstacles.js';
import { Girl } from './girl.js';
import { Candies, CANDY_POINTS } from './candies.js';
import { LevelUpFx } from './fx.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import * as Scores from './scores.js';
import { LEVELS, levelById, isUnlocked as unlockedWith } from './levels/index.js';

// ---------- Rendu ----------
const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);

scene.fog = new THREE.Fog('#ffffff', 80, 270);
const sound = new Sound();
const girl = new Girl();

// ---------- Niveaux ----------
// Chaque niveau chargé a son propre groupe d'objets (monde, obstacles, objets à ramasser).
// Un niveau n'est téléchargé et construit qu'au moment où on le choisit.
const contexts = {};
let ctx = null;                       // niveau actif
let world, obstacles, candies;        // raccourcis vers le niveau actif

function activate(c) {
  for (const k of Object.keys(contexts)) contexts[k].root.visible = contexts[k] === c;
  ctx = c;
  world = c.world;
  obstacles = c.obstacles;
  candies = c.candies;
  scene.fog.color.set(c.def.fog);
  scene.fog.near = 80;
  scene.fog.far = 270;
  girl.setPalettes(c.def.palettes);
}

// un même niveau demandé deux fois pendant son chargement (flèches puis Jouer) n'est construit qu'une fois
const pendingLoads = {};
function loadLevel(id) {
  if (contexts[id]) return Promise.resolve(contexts[id]);
  return (pendingLoads[id] ||= buildLevel(id).finally(() => { delete pendingLoads[id]; }));
}
async function buildLevel(id) {
  const meta = levelById(id);
  const def = (await meta.load()).default;
  const root = new THREE.Group();
  scene.add(root);
  const c = { id: meta.id, meta, def, root };
  c.world = new World(root, def.world);
  c.candies = new Candies(root, def.items());
  // un niveau peut fournir son propre moteur d'obstacles (ex. New York et ses égouts)
  const opts = { onHorn: () => sound.horn(), candies: c.candies, kit: def.obstacleKit(), world: c.world, sound, fog: scene.fog, fogColor: def.fog };
  c.obstacles = def.obstacles ? def.obstacles(root, opts) : new Obstacles(root, opts);
  contexts[meta.id] = c;
  const prev = ctx;
  activate(c);
  resetWorld();
  warmUp();
  if (prev) activate(prev);
  return c;
}

const isUnlocked = (meta) => unlockedWith(meta, Scores);
let selectedLevel = Scores.getLevel();
if (!isUnlocked(levelById(selectedLevel))) selectedLevel = 'japon';
scene.add(girl.root);

// ---------- État ----------
const player = {};
let state = 'menu';         // menu | running | paused | dying | over
let dist = 0, speed = 0, runTime = 0, deathT = 0, shake = 0, nextMilestone = 500;
let deathVy = 0, deathPush = 0, soulOut = false, deathZoom = 0;   // défaite : chute, recul, envol de l'âme, rapprochement de la caméra
let candyCount = 0;
const totalScore = () => Math.floor(dist) + candyCount * CANDY_POINTS;
let camAngle = Math.PI, viewShift = 1;
let playerName = Scores.getName();
const camPos = new THREE.Vector3(0, 1.6, -4.2);
const camLook = new THREE.Vector3(0, 1.2, 0);

function resetPlayer() {
  deathZoom = 0;
  Object.assign(player, {
    lane: 1, x: 0, y: 0, z: 0, vy: 0, h: PLAYER_H, grounded: true, coyote: 0, under: false,
    jumpBuf: 0, slideT: 0, slideQueued: false,
  });
  girl.reset();
  girl.root.position.set(0, 0, 0);
}

function resetWorld() {
  resetPlayer();
  dist = 0; speed = 0; runTime = 0; deathT = 0; shake = 0; nextMilestone = 500;
  candyCount = 0;
  candies.reset();
  obstacles.reset(0);
  world.reset(0);
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
const screens = ['menu', 'help', 'scores', 'pause', 'over'];
let scoresBack = 'menu';
const fx = new LevelUpFx($('fx'));
let lastGlow = 0;
let highlightId = null;

function show(name) {
  for (const s of screens) $('screen-' + s).classList.toggle('hidden', s !== name);
  const inRun = name === null && (state === 'running' || state === 'dying');
  $('hud').classList.toggle('hidden', !inRun);
  document.body.classList.toggle('in-run', inRun);
}

let scoresLevel = 'japon';
function renderScores() {
  // onglets : un tableau par niveau
  const tabs = $('scores-tabs');
  tabs.innerHTML = '';
  for (const L of LEVELS) {
    const b = document.createElement('button');
    b.className = 'tab' + (L.id === scoresLevel ? ' on' : '');
    b.textContent = `${L.icon} ${L.name}`;
    b.addEventListener('click', () => { scoresLevel = L.id; renderScores(); });
    tabs.appendChild(b);
  }
  const list = Scores.loadScores(scoresLevel).slice(0, 10);
  const body = $('scores-body');
  body.innerHTML = '';
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">Aucun score pour l’instant.<br>À toi de jouer !</td></tr>';
    return;
  }
  list.forEach((e, i) => {
    const tr = document.createElement('tr');
    if (e.id === highlightId) tr.className = 'me';
    const medal = ['🥇', '🥈', '🥉'][i] || (i + 1);
    tr.innerHTML = `<td class="rank">${medal}</td><td class="name"></td><td class="pts">${e.score.toLocaleString('fr-FR')}</td>`;
    tr.querySelector('.name').textContent = e.name;
    body.appendChild(tr);
  });
}

function openScores(from) {
  scoresBack = from;
  scoresLevel = from === 'over' && ctx ? ctx.id : selectedLevel;
  renderScores();
  show('scores');
}

// ---------- Boutons du coin (son, plein écran, pause) ----------
function updateMuteBtn() {
  document.body.classList.toggle('is-muted', sound.muted);
  $('btn-mute').setAttribute('aria-label', sound.muted ? 'Activer le son' : 'Couper le son');
}

const fsTarget = document.documentElement;
const canFullscreen = !!(fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen);
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFullscreen() {
  if (isFullscreen()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const p = (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen).call(fsTarget, { navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => {});
  }
}
function updateFullscreenBtn() {
  const fs = isFullscreen();
  document.body.classList.toggle('is-fullscreen', fs);
  $('btn-fs').setAttribute('aria-label', fs ? 'Quitter le plein écran' : 'Plein écran');
}
// pas d'API plein écran (ex. Safari sur iPhone) : on cache le bouton
if (!canFullscreen) document.body.classList.add('no-fullscreen');
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
window.addEventListener('keydown', (e) => {
  if ((e.key === 'f' || e.key === 'F') && !(e.target instanceof HTMLInputElement) && canFullscreen) toggleFullscreen();
});

// Sélecteur de niveau de l'écran d'accueil : le niveau courant entre deux flèches,
// le décor 3D derrière le menu est celui du niveau affiché (même verrouillé)
function renderLevels() {
  const i = Math.max(0, LEVELS.findIndex((L) => L.id === selectedLevel));
  const L = LEVELS[i];
  const open = isUnlocked(L);
  const card = $('level-card');
  card.classList.toggle('locked', !open);
  const best = Scores.bestOnLevel(L.id);
  $('lv-icon').textContent = L.icon;
  $('lv-lock').hidden = open;
  $('lv-name').textContent = L.name;
  $('lv-sub').textContent = open
    ? (best ? `Record : ${best.toLocaleString('fr-FR')}` : L.subtitle)
    : `${L.unlock.score.toLocaleString('fr-FR')} pts au ${levelById(L.unlock.level).name}`;
  $('level-dots').innerHTML = LEVELS.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('');
  const hasMany = LEVELS.length > 1;
  $('lv-prev').hidden = $('lv-next').hidden = !hasMany;
  $('btn-play').classList.toggle('locked', !open);
  $('btn-play').textContent = open ? 'Jouer ▶' : '🔒 Verrouillé';
}

function stepLevel(dir) {
  const i = LEVELS.findIndex((L) => L.id === selectedLevel);
  const L = LEVELS[(i + dir + LEVELS.length) % LEVELS.length];
  selectedLevel = L.id;
  if (isUnlocked(L)) Scores.setLevel(L.id);
  $('name-error').textContent = '';
  const card = $('level-card');
  card.classList.remove('slide-l', 'slide-r');
  void card.offsetWidth;
  card.classList.add(dir > 0 ? 'slide-r' : 'slide-l');
  renderLevels();
  showMenuLevel();
}

// affiche derrière le menu le décor du niveau choisi (téléchargé à ce moment-là s'il ne l'est pas encore)
async function showMenuLevel() {
  const id = selectedLevel;
  if (!contexts[id]) {
    $('level-card').classList.add('loading');
    try {
      await loadLevel(id);
    } catch (e) {
      if (selectedLevel === id) $('name-error').textContent = 'Impossible de charger ce niveau, vérifie ta connexion.';
      return;
    } finally {
      if (selectedLevel === id) $('level-card').classList.remove('loading');
    }
  }
  if (state !== 'menu') return;
  if (selectedLevel === id && ctx !== contexts[id]) {
    activate(contexts[id]);
    resetWorld();
  }
  camAngle = Math.PI;
  snapCamera();   // le préchauffage du chargement a déplacé la caméra
}

$('lv-prev').addEventListener('click', () => stepLevel(-1));
$('lv-next').addEventListener('click', () => stepLevel(1));
window.addEventListener('keydown', (e) => {
  if (state !== 'menu' || $('screen-menu').classList.contains('hidden') || e.target instanceof HTMLInputElement) return;
  if (e.key === 'ArrowLeft') stepLevel(-1);
  else if (e.key === 'ArrowRight') stepLevel(1);
});
renderLevels();

// code secret : 10 tapes d'affilée sur l'héroïne de l'accueil débloquent tous les niveaux
let charaTaps = 0, charaLastTap = 0;
$('menu-chara').querySelector('img').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const img = e.currentTarget;
  img.classList.remove('boop');
  void img.offsetWidth;
  img.classList.add('boop');
  const now = performance.now();
  charaTaps = now - charaLastTap < 700 ? charaTaps + 1 : 1;
  charaLastTap = now;
  sound.init();
  sound.lane();
  if (charaTaps < 10) return;
  charaTaps = 0;
  if (LEVELS.every(isUnlocked)) return;
  Scores.setAllUnlocked();
  renderLevels();
  celebrateUnlock({ icon: '🔓', name: 'Tous les niveaux' }, '✨ Code secret !', 'Tous les niveaux sont débloqués');
});

// prénom par défaut tant que le joueur n'a pas écrit le sien
const DEFAULT_NAMES = ['Sakura', 'Momo', 'Yuzu', 'Hanami', 'Mochi'];
if (!playerName) playerName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
$('name-input').value = playerName;
$('btn-play').addEventListener('click', () => {
  const n = $('name-input').value.trim().slice(0, 12);
  if (!n) {
    $('name-error').textContent = 'Écris ton prénom pour jouer ✿';
    $('name-input').classList.remove('shake');
    void $('name-input').offsetWidth;
    $('name-input').classList.add('shake');
    $('name-input').focus();
    return;
  }
  const L = levelById(selectedLevel);
  if (!isUnlocked(L)) {
    $('name-error').textContent = '';   // la carte grisée et le bouton « Verrouillé » suffisent : on secoue juste la carte
    const card = $('level-card');
    card.classList.remove('shake', 'slide-l', 'slide-r');
    void card.offsetWidth;
    card.classList.add('shake');
    return;
  }
  $('name-error').textContent = '';
  playerName = n;
  Scores.setName(n);
  $('name-input').blur();
  startRun(true);
});
$('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-play').click(); });
$('btn-scores').addEventListener('click', () => openScores('menu'));
$('btn-help').addEventListener('click', () => show('help'));
$('btn-help-back').addEventListener('click', () => show('menu'));
$('btn-scores-back').addEventListener('click', () => show(scoresBack));
$('btn-pause').addEventListener('click', () => pause());
$('btn-resume').addEventListener('click', () => resume());
$('btn-restart').addEventListener('click', () => startRun(false));
$('btn-pause-menu').addEventListener('click', () => toMenu());
$('btn-again').addEventListener('click', () => startRun(false));
$('btn-over-scores').addEventListener('click', () => openScores('over'));
$('btn-over-menu').addEventListener('click', () => toMenu());
$('btn-mute').addEventListener('click', () => { sound.init(); sound.setMuted(!sound.muted); updateMuteBtn(); });
$('btn-fs').addEventListener('click', toggleFullscreen);
updateMuteBtn();
updateFullscreenBtn();

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
}

// ---------- Déblocage d'un niveau en cours de partie ----------
let pendingUnlock = null;   // niveau qui se débloquera si on atteint son score pendant cette partie
function celebrateUnlock(L, title = '🔓 Nouveau niveau débloqué !', hint = "À choisir sur l'écran d'accueil") {
  const el = $('unlock');
  $('unlock-icon').textContent = L.icon;
  $('unlock-name').textContent = L.name;
  $('unlock-title').textContent = title;
  $('unlock-hint').textContent = hint;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  sound.unlock();
  if (navigator.vibrate) navigator.vibrate([40, 50, 40, 50, 120]);
  // pluie de confettis : éléments créés une seule fois au démarrage, on relance juste leur animation
  const box = $('confetti-box');
  box.classList.remove('go');
  void box.offsetWidth;
  box.classList.add('go');
  clearTimeout(celebrateUnlock.t);
  celebrateUnlock.t = setTimeout(() => box.classList.remove('go'), 3400);
}
(function buildConfetti() {
  const box = document.createElement('div');
  box.id = 'confetti-box';
  const cols = ['#ff7fb0', '#ffd23f', '#7fe0b0', '#6fc3ff', '#c39bff', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('i');
    c.className = i % 4 === 0 ? 'confetti star' : 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.setProperty('--c', cols[i % cols.length]);
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
    c.style.setProperty('--r', `${(Math.random() - 0.5) * 1080}deg`);
    c.style.setProperty('--d', `${1.6 + Math.random() * 1.0}s`);
    c.style.animationDelay = `${Math.random() * 0.5}s`;
    box.appendChild(c);
  }
  $('fx-layer').appendChild(box);
  // dessine une première fois les icônes des niveaux (emoji en grand) pour éviter l'à-coup à l'affichage
  const warm = document.createElement('div');
  warm.className = 'glyph-warm';
  warm.textContent = LEVELS.map((L) => L.icon).join('') + '🔓';
  document.body.appendChild(warm);
  setTimeout(() => warm.remove(), 1500);
})();

// ---------- Déroulement ----------
let loading = false;
async function startRun(fromMenu) {
  if (loading) return;
  const id = fromMenu ? selectedLevel : ctx.id;
  if (!contexts[id]) {
    loading = true;
    $('level-loading-name').textContent = levelById(id).name;
    $('level-loading').classList.remove('hidden');
    try {
      await loadLevel(id);
    } catch (e) {
      $('level-loading').classList.add('hidden');
      $('name-error').textContent = 'Impossible de charger ce niveau, vérifie ta connexion.';
      loading = false;
      return;
    }
    $('level-loading').classList.add('hidden');
    loading = false;
  }
  activate(contexts[id]);
  fx.stop();
  deathFx.reset();
  $('death-dim').classList.remove('on');
  sound.init();
  resetWorld();
  state = 'running';
  camAngle = Math.PI;
  snapCamera();
  $('hud-best').textContent = Scores.bestFor(ctx.id, playerName).toLocaleString('fr-FR');
  $('hud-item-ico').textContent = ctx.meta.item;
  pendingUnlock = LEVELS.find((L) => L.unlock && L.unlock.level === ctx.id && !isUnlocked(L)) || null;
  // efface le bandeau de la partie précédente : sinon son animation se rejoue quand le HUD réapparaît
  $('toast').classList.remove('show');
  $('toast').textContent = '';
  $('hud-name').textContent = playerName;
  hudScore = -1; hudDist = -1;
  $('hud-candies').textContent = '0';
  $('hud-candybar').style.width = '0%';
  show(null);
  sound.startMusic(ctx.def.music);
}

function pause() {
  if (state !== 'running') return;
  state = 'paused';
  sound.stopMusic();
  show('pause');
}

function resume() {
  if (state !== 'paused') return;
  state = 'running';
  show(null);
  sound.startMusic();
}

function toMenu() {
  fx.stop();
  deathFx.reset();
  $('death-dim').classList.remove('on');
  sound.stopMusic();
  activate(contexts[selectedLevel] || ctx);
  resetWorld();
  state = 'menu';
  camAngle = Math.PI;
  renderLevels();
  show('menu');
  showMenuLevel();
}

function die(crash) {
  fx.stop();
  state = 'dying';
  const kind = deathKind(crash);
  girl.die(kind);
  deathFx.start(kind, player.x, player.y, player.z);
  $('death-dim').classList.add('on');
  fxEl('hit-flash', 0, 0, 400);
  deathT = 0;
  deathZoom = 0;
  deathVy = kind === 'bonk' ? 3 : 0;
  deathPush = kind === 'bonk' ? 3.5 : kind === 'trip' ? -2.5 : 0;   // rebond en arrière, glissade en avant
  soulOut = false;
  shake = kind === 'bonk' ? 0.35 : 0.12;
  sound.ouch(kind);
  sound.stopMusic();
  if (navigator.vibrate) navigator.vibrate(kind === 'faint' || kind === 'sink' ? 60 : 120);
}

// passer l'envol de l'âme : un toucher ou une touche
function skipDeath() {
  if (state === 'dying' && deathT > 0.9) gameOver();
}
window.addEventListener('pointerdown', skipDeath);
window.addEventListener('keydown', skipDeath);

function gameOver() {
  state = 'over';
  const score = totalScore();
  const before = LEVELS.filter(isUnlocked).length;
  const prevBest = Scores.bestFor(ctx.id, playerName);
  const { entry, rank } = Scores.addScore(ctx.id, playerName, score);
  const newly = LEVELS.filter(isUnlocked).length > before
    ? LEVELS.find((L) => L.unlock && L.unlock.level === ctx.id && isUnlocked(L)) : null;
  highlightId = entry.id;
  $('over-score').textContent = score.toLocaleString('fr-FR');
  $('over-detail').textContent = `${Math.floor(dist).toLocaleString('fr-FR')} m  +  ${candyCount} ${ctx.meta.item} × ${CANDY_POINTS}`;
  $('over-best').textContent = Math.max(prevBest, score).toLocaleString('fr-FR');
  const msg = score > prevBest && prevBest > 0 ? 'Nouveau record personnel ! ✨'
    : rank === 1 ? 'Meilleur score du tableau ! 👑'
    : rank <= 10 ? `Tu entres dans le top 10 (n°${rank}) !`
    : 'Courage, tu peux aller plus loin !';
  $('over-msg').textContent = newly ? `🔓 Nouveau niveau débloqué : ${newly.name} !` : msg;
  show('over');
}

// ---------- Contrôles ----------
const active = () => state === 'running';
// un niveau peut changer la voie visée (ex. au-dessus du canal des égouts, on saute de 2 voies)
function moveLane(d) {
  const to = obstacles.laneTarget ? obstacles.laneTarget(player, d) : player.lane + d;
  if (to < 0 || to > 2 || to === player.lane) return;
  player.lane = to;
  sound.lane();
  laneFx(d);
}
new Input({
  left() { moveLane(-1); },
  right() { moveLane(1); },
  up() { player.jumpBuf = 0.15; },
  down() {
    if (!player.grounded) { player.vy = Math.min(player.vy, FAST_DROP_V); player.slideQueued = true; }
    else if (player.slideT <= 0) { player.slideT = SLIDE_TIME; sound.slide(); }
  },
  pause() { if (state === 'running') pause(); else if (state === 'paused') resume(); },
}, active);

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- Bonbons et niveaux ----------
function collectCandies(n) {
  for (let i = 0; i < n; i++) {
    candyCount++;
    popCollect();
    if (candyCount % 10 === 0) {
      const level = candyCount / 10;
      sound.candy(9);
      fx.start({
        onPeak: () => {
          const p = girl.levelUp(level);
          sound.levelUp();
          sparkles.burst(player.x, player.y + 1, player.z);
          showLevelUp(p.name);
          if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
        },
      });
    } else {
      sound.candy((candyCount % 10) - 1);
    }
  }
  $('hud-candies').textContent = candyCount;
  const bar = $('hud-candybar');
  bar.style.width = `${(candyCount % 10) * 10}%`;
}

function showLevelUp(name) {
  const el = $('levelup');
  $('levelup-name').textContent = `✨ ${name} ✨`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// Gerbe d'étoiles autour de l'héroïne
const sparkles = (() => {
  const N = 60;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 6 : 15, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
  }
  g.fill();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.35, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.1,
  }));
  pts.visible = false;
  pts.frustumCulled = false;
  scene.add(pts);
  const palette = ['#fff4a3', '#ffb3d9', '#b8e6ff', '#ffffff', '#ffd23f'].map((h) => new THREE.Color(h));
  let life = 0;
  return {
    points: pts,
    burst(x, y, z) {
      for (let i = 0; i < N; i++) {
        pos.set([x, y, z], i * 3);
        const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 2, s = 2.5 + Math.random() * 3;
        vel.set([Math.cos(a) * s, e * s * 0.6 + 2, Math.sin(a) * s], i * 3);
        const k = palette[i % palette.length];
        col.set([k.r, k.g, k.b], i * 3);
      }
      geo.attributes.color.needsUpdate = true;
      life = 1;
      pts.visible = true;
    },
    update(dt) {
      if (life <= 0) return;
      life -= dt * 1.2;
      for (let i = 0; i < N * 3; i += 3) {
        vel[i + 1] -= 6 * dt;
        pos[i] += vel[i] * dt; pos[i + 1] += vel[i + 1] * dt; pos[i + 2] += vel[i + 2] * dt - speed * dt * 0.8;
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.size = 0.35 * Math.max(0, life) + 0.05;
      if (life <= 0) pts.visible = false;
    },
  };
})();

// ---------- Petits effets à l'écran (DOM) ----------
const fxLayer = $('fx-layer');
const _scr = new THREE.Vector3();
function toScreen(x, y, z) {
  _scr.set(x, y, z).project(camera);
  return { x: (_scr.x + 1) / 2 * window.innerWidth, y: (1 - _scr.y) / 2 * window.innerHeight };
}
function fxEl(cls, x, y, life, html = '') {
  const el = document.createElement('div');
  el.className = cls;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = html;
  fxLayer.appendChild(el);
  setTimeout(() => el.remove(), life);
  return el;
}
// "+10" qui s'envole avec des coeurs et des étoiles autour de l'héroïne
function popCollect() {
  const p = toScreen(player.x, player.y + 1.7, player.z);
  fxEl('pop-score', p.x + (Math.random() - 0.5) * 30, p.y, 950, `+${CANDY_POINTS}`);
  const bits = ['♥', '✦', '♥', '✧', '♡'];
  const cols = ['#ff7fb0', '#ffd23f', '#ff9ec7', '#9fd8ff', '#c9a6ff'];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55 + (Math.random() - 0.5) * 0.3;
    const d = 45 + Math.random() * 30;
    const el = fxEl('pop-bit', p.x, p.y + 20, 850, bits[i]);
    el.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    el.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    el.style.setProperty('--r', `${(Math.random() - 0.5) * 120}deg`);
    el.style.setProperty('--c', cols[i]);
  }
}
// traits de vitesse et poussière derrière l'héroïne quand elle change de voie
function laneFx(dir) {
  girl.dash(dir);
  const p = toScreen(player.x - dir * 0.6, player.y + 0.8, player.z);
  const el = fxEl('dash', p.x, p.y, 500, '<i></i><i></i><i></i><b></b><b></b>');
  el.style.setProperty('--dir', dir > 0 ? 1 : -1);
}

// ---------- Défaite : petite animation selon le choc, puis l'âme s'envole ----------
// (pas de sang : étoiles, poussière, bulles ou spirales, puis une âme kawaii qui monte au ciel)
const SOUL_AT = 1.25, OVER_AT = 3.9;   // secondes après le choc
const deathFx = (() => {
  const sprite = (size, draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const starTex = sprite(64, (g, n) => {
    g.translate(n / 2, n / 2);
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 28; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  });
  const puffTex = sprite(64, (g, n) => {
    const grd = g.createRadialGradient(n / 2, n / 2, 2, n / 2, n / 2, n / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, n, n);
  });
  const glowTex = sprite(128, (g, n) => {
    const grd = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.35, 'rgba(200,230,255,0.35)'); grd.addColorStop(1, 'rgba(180,210,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, n, n);
  });

  // gerbes de particules (étoiles, ou bouffées rondes : poussière, bulles)
  function burst(tex, n, size) {
    const pos = new Float32Array(n * 3).fill(-1000), col = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    const c = new THREE.Color();
    return {
      start(o, cols, { speed = 3, up = 2, spread = 0.3, grav = 6 }) {
        this.grav = grav;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = (0.4 + Math.random() * 0.6) * speed;
          pos.set([o.x + (Math.random() - 0.5) * spread, o.y + (Math.random() - 0.5) * spread, o.z + (Math.random() - 0.5) * spread], i * 3);
          vel.set([Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r * 0.6], i * 3);
          c.set(cols[i % cols.length]);
          col.set([c.r, c.g, c.b], i * 3);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        mat.opacity = 1;
        pts.visible = true;
        this.t = 0;
      },
      update(dt) {
        if (!pts.visible) return;
        this.t += dt;
        for (let i = 0; i < n; i++) {
          const j = i * 3;
          vel[j + 1] -= this.grav * dt;
          pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
          vel[j] *= 1 - dt * 1.5; vel[j + 2] *= 1 - dt * 1.5;
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - this.t / 1.3);
        if (this.t > 1.3) pts.visible = false;
      },
      hide() { pts.visible = false; },
    };
  }
  const stars = burst(starTex, 28, 0.32), puffs = burst(puffTex, 22, 0.55);

  // couronne d'étoiles (ou de spirales) qui tourne au-dessus de sa tête
  const ring = new THREE.Group();
  const ringMat = new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false });
  for (let i = 0; i < 5; i++) { const sp = new THREE.Sprite(ringMat); sp.scale.setScalar(0.24); ring.add(sp); }
  ring.visible = false;
  scene.add(ring);

  // l'âme : petit fantôme lumineux aux oreilles de chat, yeux fermés souriants, auréole dorée
  const soul = new THREE.Group();
  const soulMat = new THREE.MeshBasicMaterial({ color: '#eef8ff', transparent: true, opacity: 0.9, depthWrite: false });
  const add = (geo, mat, p, s = [1, 1, 1], r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); soul.add(m); return m; };
  add(new THREE.SphereGeometry(0.28, 20, 14), soulMat, [0, 0, 0], [1, 1.1, 0.9]);
  add(new THREE.ConeGeometry(0.22, 0.55, 16), soulMat, [0.06, -0.38, 0], [1, 1, 0.8], [Math.PI, 0, -0.35]);
  for (const sx of [-1, 1]) add(new THREE.ConeGeometry(0.08, 0.17, 8), soulMat, [sx * 0.15, 0.3, 0], [1, 1, 1], [0, 0, -sx * 0.4]);
  const inkMat = new THREE.MeshBasicMaterial({ color: '#5a6aa0', transparent: true, depthWrite: false });
  const blushMat = new THREE.MeshBasicMaterial({ color: '#ffb0c8', transparent: true, depthWrite: false });
  for (const sx of [-1, 1]) {
    add(new THREE.TorusGeometry(0.04, 0.009, 6, 12, Math.PI), inkMat, [sx * 0.1, 0.03, 0.25]);   // yeux fermés ^ ^
    add(new THREE.SphereGeometry(0.035, 8, 6), blushMat, [sx * 0.16, -0.04, 0.23], [1, 0.6, 0.4]);
  }
  const haloMat = new THREE.MeshBasicMaterial({ color: '#ffe070', transparent: true, depthWrite: false });
  add(new THREE.TorusGeometry(0.15, 0.022, 8, 28), haloMat, [0, 0.46, 0], [1, 1, 1], [Math.PI / 2 - 0.25, 0, 0]);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.scale.setScalar(1.7);
  soul.add(aura);
  const sparks = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#fff2b0', transparent: true, depthWrite: false })); sp.scale.setScalar(0.12); soul.add(sp); return sp; });
  soul.scale.setScalar(1.5);
  soul.visible = false;
  scene.add(soul);
  const soulMats = [soulMat, inkMat, blushMat, haloMat, aura.material, ...sparks.map((x) => x.material)];
  // rai de lumière qui descend du ciel sur elle
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.5, 16, 20, 1, true).translate(0, 8, 0),
    new THREE.MeshBasicMaterial({ color: '#fff4d0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.visible = false;
  scene.add(beam);

  const RING = {
    bonk: { cols: '#ffe24a', dz: 0.75, dx: 0 }, head: { cols: '#ffe24a', dx: 0.75, dz: 0 },
    trip: { cols: '#ffe24a', dz: -0.75, dx: 0 }, faint: { cols: '#c89aff', dz: 0.75, dx: 0 },
  };
  let kind = null, t = 0, soulT = -1;
  const o = new THREE.Vector3(), base = new THREE.Vector3();

  return {
    start(k, x, y, z) {
      kind = k; t = 0; soulT = -1;
      o.set(x, y + 1.0, z);
      if (k === 'sink') puffs.start(o.set(x, y + 0.2, z), ['#8aff6a', '#c8ff9a', '#5ad84a'], { speed: 0.8, up: 2.5, spread: 0.8, grav: -0.5 });
      else if (k === 'faint') stars.start(o, ['#c89aff', '#ff9ad8', '#ffffff'], { speed: 1.5, up: 1.5, grav: 1 });
      else {
        stars.start(o, ['#ffe24a', '#ffffff', '#ffb0d8', '#9ad8ff'], { speed: 3.2, up: 3, grav: 7 });
        puffs.start(o.set(x, y + 0.25, z), ['#f4ece0', '#e8dcc8', '#ffffff'], { speed: 1.6, up: 0.6, spread: 0.5, grav: 0.5 });
      }
      const r = RING[k];
      ring.visible = !!r;
      if (r) ringMat.color.set(r.cols);
    },
    reset() {
      kind = null; soulT = -1;
      stars.hide(); puffs.hide();
      ring.visible = soul.visible = beam.visible = false;
    },
    // l'âme quitte le corps (x, y = sol sous elle, z)
    soul(x, y, z) {
      soulT = 0;
      base.set(x, y + 0.6, z);
      soul.position.copy(base);
      soul.visible = beam.visible = true;
      beam.position.set(x, y, z);
    },
    // hauteur atteinte par l'âme (la caméra lève les yeux pour la suivre)
    get lift() { return soulT < 0 ? 0 : soul.position.y - base.y; },
    get kind() { return kind; },
    get soulVisible() { return soul.visible; },
    update(dt, girlPos) {
      if (!kind) return;
      t += dt;
      stars.update(dt);
      puffs.update(dt);
      if (ring.visible) {
        const r = RING[kind];
        ring.position.set(girlPos.x + r.dx, girlPos.y + 0.75, girlPos.z + r.dz);
        ring.children.forEach((sp, i) => {
          const a = t * 4 + (i / 5) * Math.PI * 2;
          sp.position.set(Math.cos(a) * 0.35, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.35);
        });
        ringMat.opacity = Math.max(0, 1 - Math.max(0, t - 1.4) / 0.5);
        if (t > 1.9) ring.visible = false;
      }
      if (soulT < 0) return;
      soulT += dt;
      // monte en ondulant, apparaît puis s'efface en haut
      soul.position.set(base.x + Math.sin(soulT * 2.4) * 0.3, base.y + soulT * 2.3 + soulT * soulT * 0.25, base.z);
      soul.rotation.z = Math.sin(soulT * 2.4) * 0.15;
      const pulse = 1.5 * (1 + Math.sin(soulT * 5) * 0.05);
      soul.scale.set(pulse, pulse, pulse);
      const a = Math.min(1, soulT / 0.4) * (1 - Math.max(0, soulT - 2.2) / 1.2);
      for (const m of soulMats) m.opacity = Math.max(0, a) * (m === soulMat ? 0.9 : 1);
      sparks.forEach((sp, i) => {
        const ang = soulT * 3 + (i * Math.PI * 2) / 3;
        sp.position.set(Math.cos(ang) * 0.45, Math.sin(soulT * 4 + i) * 0.2, Math.sin(ang) * 0.45);
      });
      beam.material.opacity = 0.15 * Math.min(1, soulT / 0.5) * Math.max(0, 1 - Math.max(0, soulT - 2.0) / 1.4);
      if (soulT > 3.4) soul.visible = beam.visible = false;
    },
  };
})();

// type de défaite selon ce qui a été percuté (rien = malus)
function deathKind(crash) {
  if (!crash) return 'faint';
  if (crash.kind === 'sludge') return 'sink';
  if (crash.kind === 'low') return 'trip';
  if (crash.kind === 'high') return 'head';
  return 'bonk';   // véhicules, murs, portes, réservoirs, flancs de rampe ou d'escalier
}

// ---------- Physique ----------
function step(dt) {
  speed = speedAt(dist) * Math.min(1, 0.35 + runTime * 0.75);
  player.z -= speed * dt;
  dist += speed * dt;
  obstacles.move(dt);

  player.x += (LANES[player.lane] - player.x) * (1 - Math.exp(-dt * 16));
  player.jumpBuf -= dt;
  player.coyote -= dt;
  if (player.slideT > 0) player.slideT -= dt;

  if (player.jumpBuf > 0 && (player.grounded || player.coyote > 0)) {
    // saut spécial du niveau (ex. au pied d'une échelle des égouts : bond jusqu'à la surface)
    player.vy = (obstacles.jumpBoost && obstacles.jumpBoost(player)) || JUMP_V;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuf = 0;
    player.slideT = 0;
    player.slideQueued = false;
    sound.jump();
  }

  player.vy -= GRAVITY * dt;
  player.y += player.vy * dt;
  player.h = player.slideT > 0 ? PLAYER_SLIDE_H : PLAYER_H;

  const { ground, crash } = obstacles.resolve(player);
  if (crash) { die(crash); return; }

  if (candies.hitFugu(player)) { die(); return; }
  const got = candies.collect(player);
  if (got) collectCandies(got);

  if (player.y <= ground) {
    if (!player.grounded && player.vy < -4) {
      sound.land();
      if (player.slideQueued) { player.slideT = SLIDE_TIME; sound.slide(); }
    }
    player.slideQueued = false;
    player.y = ground;
    if (player.vy < 0) player.vy = 0;
    player.grounded = true;
    player.coyote = 0.1;
  } else {
    player.grounded = false;
  }
}

// ---------- Caméra ----------
// 0 en paysage, 1 sur un téléphone en portrait
const portrait = () => THREE.MathUtils.clamp((1.1 - camera.aspect) / 0.6, 0, 1);

function camTargets(out, look) {
  const back = (1 - Math.cos(camAngle)) / 2;   // 0 = face à elle (menu), 1 = derrière (course)
  const pf = portrait();
  // menu : cadrage rapproché ; après une défaite, la caméra s'approche doucement d'elle et de son âme
  const r = THREE.MathUtils.lerp(2.75, 6.6 + pf * 1.1, back) * (1 - 0.42 * deathZoom);
  const base = obstacles.baseY ? obstacles.baseY(player) : 0;   // sol de référence (rue ou égouts)
  const camY = THREE.MathUtils.lerp(1.25, base + (player.y - base) * 0.75 + 3.3 + pf * 1.0, back);
  const follow = 0.8 + pf * 0.2;
  out.set(player.x * follow * back + Math.sin(camAngle) * r, camY, player.z - Math.cos(camAngle) * r);
  look.set(player.x * (0.9 + pf * 0.1) * back, THREE.MathUtils.lerp(0.98, base + (player.y - base) * 0.6 + 1.1, back), player.z - 10 * back);
  // l'âme s'envole : la caméra la suit des yeux
  const lift = deathFx.lift;
  out.y -= deathZoom * 1.3;
  if (lift > 0) { look.y += lift * 0.8; out.y += lift * 0.25; }
  if (obstacles.clampCam) obstacles.clampCam(out, look, player);
}

function snapCamera() {
  camTargets(camPos, camLook);
}

const _tp = new THREE.Vector3(), _tl = new THREE.Vector3();
function updateCamera(dt) {
  const running = state !== 'menu';
  // au menu, la caméra regarde la voie et le mont Fuji (l'héroïne est l'illustration 2D)
  camAngle += (Math.PI - camAngle) * (1 - Math.exp(-dt * (running ? 2.6 : 6)));
  camTargets(_tp, _tl);
  // si la caméra passe au-dessus d'un train, on la monte pour garder l'héroïne en vue
  if (running) {
    const gCam = obstacles.groundAt(camPos.x, _tp.z, 0.8, player.under);
    if (gCam > 0) _tp.y = Math.max(_tp.y, gCam + 2.4);
  }
  const k = 1 - Math.exp(-dt * 10);
  camPos.x += (_tp.x - camPos.x) * k;
  // suivi vertical plus vif quand l'écart est grand (chute dans les égouts, bond hors du puits)
  camPos.y += (_tp.y - camPos.y) * (1 - Math.exp(-dt * (6 + Math.min(12, Math.abs(_tp.y - camPos.y) * 3))));
  camPos.z = _tp.z;
  camLook.lerp(_tl, k);
  if (!Number.isFinite(camPos.x + camPos.y + camPos.z + camLook.x + camLook.y)) snapCamera();
  camera.position.copy(camPos);
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;
    shake = Math.max(0, shake - dt * 1.5);
  }
  camera.lookAt(camLook);

  const fov = running ? 62 + portrait() * 16 + (speed - 14) * 0.3 : 50;
  camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3));

  // En menu, décale la vue pour laisser la place au panneau
  viewShift += ((state === 'menu' ? 1 : 0) - viewShift) * (1 - Math.exp(-dt * 4));
  const w = window.innerWidth, h = window.innerHeight;
  if (viewShift > 0.002) {
    if (w > h) camera.setViewOffset(w, h, w * 0.2 * viewShift, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.2 * viewShift, w, h);
  } else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

// ---------- Boucle ----------
let last = performance.now();
const _sp = new THREE.Vector3();
const scoreEl = $('score');
const distEl = $('hud-dist');
let hudScore = -1, hudDist = -1;
function frame(now) {
  requestAnimationFrame(frame);
  // intervalle borné et toujours valide (onglet en arrière-plan, horloge incohérente…)
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) || 0;
  last = now;

  if (state === 'running') {
    runTime += dt;
    const n = Math.max(1, Math.ceil(dt * 120));
    for (let i = 0; i < n && state === 'running'; i++) step(dt / n);
    obstacles.update(player.z, speed, dist);
    // le HUD n'est modifié que si la valeur change (évite des recalculs de mise en page)
    const sc = totalScore(), dm = Math.floor(dist);
    if (sc !== hudScore) { hudScore = sc; scoreEl.textContent = sc.toLocaleString('fr-FR'); }
    if (dm !== hudDist) { hudDist = dm; distEl.textContent = dm.toLocaleString('fr-FR'); }
    if (pendingUnlock && sc >= pendingUnlock.unlock.score) {
      celebrateUnlock(pendingUnlock);
      pendingUnlock = null;
    }
    if (dist >= nextMilestone) {
      toast(`${nextMilestone} m ! Plus vite ✿`);
      sound.milestone();
      nextMilestone += 500;
    }
  } else if (state === 'dying') {
    deathT += dt;
    deathZoom = Math.min(1, deathZoom + dt * 0.9);
    // elle retombe au sol (après un choc en l'air), recule ou glisse un peu
    const g = obstacles.groundAt(player.x, player.z, 0, player.under);
    deathVy -= GRAVITY * dt;
    player.y = Math.max(g, player.y + deathVy * dt);
    if (player.y <= g) deathVy = 0;
    player.z += deathPush * dt;
    deathPush *= Math.exp(-dt * 5);
    // immobile, apaisée : son âme s'envole au ciel
    if (!soulOut && deathT > SOUL_AT) {
      soulOut = true;
      deathFx.soul(player.x, g, player.z);
      sound.soul();
    }
    if (deathT > OVER_AT) gameOver();
  }

  if (state !== 'paused') {
    world.update(dt, player.z, state === 'running' ? speed : 0);
    candies.update(dt, player.z, player);
    sparkles.update(dt);
    deathFx.update(dt, girl.root.position);
    let mode = 'idle';
    if (state === 'running') mode = player.slideT > 0 ? 'roll' : player.grounded ? 'run' : 'jump';
    else if (state === 'dying' || state === 'over') mode = 'dead';
    girl.animate(mode, dt, { speed, slideFrac: 1 - Math.max(0, player.slideT) / SLIDE_TIME, vy: player.vy });
    girl.root.position.set(player.x, player.y, player.z);
    girl.root.visible = state !== 'menu';
    girl.root.rotation.y = state === 'running' ? (LANES[player.lane] - player.x) * -0.12 : 0;
    world.setShadow(player.x, obstacles.groundAt(player.x, player.z, 0, player.under), player.y, player.z);
    updateCamera(dt);
    if (obstacles.frame) obstacles.frame(dt, player, camera, { running: state === 'running', speed });
    world.scenery.update(dt, player.z, camera, renderer.getPixelRatio());

    if (fx.active) {
      _sp.set(player.x, player.y + 1.0, player.z).project(camera);
      fx.update(dt, (_sp.x + 1) / 2 * window.innerWidth, (1 - _sp.y) / 2 * window.innerHeight);
    }
    const glow = fx.glow;
    if (glow !== lastGlow) { girl.setGlow(glow); lastGlow = glow; }
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Accès de test : ouvrir la page avec #debug
if (location.hash === '#debug') {
  window.__onima = { player, get obstacles() { return obstacles; }, camera, get world() { return world; }, get candies() { return candies; }, loadLevel, get level() { return ctx && ctx.id; }, addCandies: (n) => collectCandies(n), fx, renderer, get candyCount() { return candyCount; }, get state() { return state; }, get dist() { return dist; }, get speed() { return speed; }, celebrate: (id) => celebrateUnlock(levelById(id)), get deathKind() { return deathFx.kind; }, get soulVisible() { return deathFx.soulVisible; } };
}

// Préchauffage : compile tous les shaders et envoie toutes les textures au GPU dès le chargement,
// pour éviter les à-coups la première fois qu'un train, une friandise ou l'effet de level up apparaît
function warmUp() {
  const g = new THREE.Group();
  g.add(obstacles.warmupGroup(), candies.warmupGroup());
  g.position.set(0, 0, -8);
  scene.add(g);
  sparkles.points.visible = true;
  for (const t of Object.values(girl.faceTex)) renderer.initTexture(t);
  g.traverse((o) => {
    for (const m of [].concat(o.material || [])) if (m.map) renderer.initTexture(m.map);
  });
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 1, -8);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  scene.remove(g);
  sparkles.points.visible = false;
}

try {
  activate(await loadLevel(selectedLevel));
} catch (e) {
  selectedLevel = 'japon';
  renderLevels();
  activate(await loadLevel('japon'));
}
resetWorld();
snapCamera();
show('menu');
document.body.classList.add('ready');
requestAnimationFrame(frame);
