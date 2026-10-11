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

// ---------- Rendu ----------
const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);

const world = new World(scene);
const sound = new Sound();
const candies = new Candies(scene);
const obstacles = new Obstacles(scene, { onHorn: () => sound.horn(), candies });
const girl = new Girl();
scene.add(girl.root);

// ---------- État ----------
const player = {};
let state = 'menu';         // menu | running | paused | dying | over
let dist = 0, speed = 0, runTime = 0, deathT = 0, shake = 0, nextMilestone = 500;
let candyCount = 0;
const totalScore = () => Math.floor(dist) + candyCount * CANDY_POINTS;
let camAngle = Math.PI, viewShift = 1;
let playerName = Scores.getName();
const camPos = new THREE.Vector3(0, 1.6, -4.2);
const camLook = new THREE.Vector3(0, 1.2, 0);

function resetPlayer() {
  Object.assign(player, {
    lane: 1, x: 0, y: 0, z: 0, vy: 0, h: PLAYER_H, grounded: true, coyote: 0,
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

function renderScores() {
  const list = Scores.loadScores().slice(0, 10);
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

// ---------- Déroulement ----------
function startRun(fromMenu) {
  fx.stop();
  sound.init();
  resetWorld();
  state = 'running';
  camAngle = Math.PI;
  snapCamera();
  $('hud-best').textContent = Scores.bestFor(playerName).toLocaleString('fr-FR');
  $('hud-name').textContent = playerName;
  hudScore = -1; hudDist = -1;
  $('hud-candies').textContent = '0';
  $('hud-candybar').style.width = '0%';
  show(null);
  sound.startMusic();
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
  sound.stopMusic();
  resetWorld();
  state = 'menu';
  camAngle = Math.PI;
  show('menu');
}

function die() {
  fx.stop();
  state = 'dying';
  deathT = 0;
  shake = 0.6;
  sound.crash();
  sound.stopMusic();
  if (navigator.vibrate) navigator.vibrate(120);
}

function gameOver() {
  state = 'over';
  const score = totalScore();
  const prevBest = Scores.bestFor(playerName);
  const { entry, rank } = Scores.addScore(playerName, score);
  highlightId = entry.id;
  $('over-score').textContent = score.toLocaleString('fr-FR');
  $('over-detail').textContent = `${Math.floor(dist).toLocaleString('fr-FR')} m  +  ${candyCount} 🍡 × ${CANDY_POINTS}`;
  $('over-best').textContent = Math.max(prevBest, score).toLocaleString('fr-FR');
  const msg = score > prevBest && prevBest > 0 ? 'Nouveau record personnel ! ✨'
    : rank === 1 ? 'Meilleur score du tableau ! 👑'
    : rank <= 10 ? `Tu entres dans le top 10 (n°${rank}) !`
    : 'Courage, tu peux aller plus loin !';
  $('over-msg').textContent = msg;
  show('over');
}

// ---------- Contrôles ----------
const active = () => state === 'running';
new Input({
  left() { if (player.lane > 0) { player.lane--; sound.lane(); } },
  right() { if (player.lane < 2) { player.lane++; sound.lane(); } },
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
    player.vy = JUMP_V;
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
  if (crash) { die(); return; }

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
  const r = THREE.MathUtils.lerp(2.75, 6.6 + pf * 1.1, back);   // menu : cadrage rapproché
  const camY = THREE.MathUtils.lerp(1.25, player.y * 0.75 + 3.3 + pf * 1.0, back);
  const follow = 0.8 + pf * 0.2;
  out.set(player.x * follow * back + Math.sin(camAngle) * r, camY, player.z - Math.cos(camAngle) * r);
  look.set(player.x * (0.9 + pf * 0.1) * back, THREE.MathUtils.lerp(0.98, player.y * 0.6 + 1.1, back), player.z - 10 * back);
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
    const gCam = obstacles.groundAt(camPos.x, _tp.z, 0.8);
    if (gCam > 0) _tp.y = Math.max(_tp.y, gCam + 2.4);
  }
  const k = 1 - Math.exp(-dt * 10);
  camPos.x += (_tp.x - camPos.x) * k;
  camPos.y += (_tp.y - camPos.y) * (1 - Math.exp(-dt * 6));
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
    if (dist >= nextMilestone) {
      toast(`${nextMilestone} m ! Plus vite ✿`);
      sound.milestone();
      nextMilestone += 500;
    }
  } else if (state === 'dying') {
    deathT += dt;
    if (deathT > 1.3) gameOver();
  }

  if (state !== 'paused') {
    world.update(dt, player.z, state === 'running' ? speed : 0);
    candies.update(dt, player.z);
    sparkles.update(dt);
    let mode = 'idle';
    if (state === 'running') mode = player.slideT > 0 ? 'roll' : player.grounded ? 'run' : 'jump';
    else if (state === 'dying' || state === 'over') mode = 'dead';
    girl.animate(mode, dt, { speed, slideFrac: 1 - Math.max(0, player.slideT) / SLIDE_TIME, vy: player.vy });
    girl.root.position.set(player.x, player.y, player.z);
    girl.root.visible = state !== 'menu';
    girl.root.rotation.y = state === 'running' ? (LANES[player.lane] - player.x) * -0.12 : 0;
    world.setShadow(player.x, obstacles.groundAt(player.x, player.z), player.y, player.z);
    updateCamera(dt);
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
  window.__onima = { player, obstacles, camera, candies, addCandies: (n) => collectCandies(n), fx, renderer, get candyCount() { return candyCount; }, get state() { return state; }, get dist() { return dist; }, get speed() { return speed; } };
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

resetWorld();
warmUp();
snapCamera();
show('menu');
document.body.classList.add('ready');
requestAnimationFrame(frame);
