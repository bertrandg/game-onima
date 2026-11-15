import * as THREE from 'three';
import { Obstacles } from '../../obstacles.js';
import { Builder, U, vcMat, pick, rand } from '../../geo.js';
import { LANES, SPAWN_AHEAD, DESPAWN_BEHIND } from '../../config.js';

// Les passerelles d'échafaudage de bambou, au-dessus de la rue. Par tronçons de 120 à 240 m, des
// portiques de bambou portent un plancher de planches à 5,4 m au-dessus des trois voies. On y monte par
// une rampe de planches au début du tronçon, ou en sautant depuis le toit d'un minibus (le plancher se
// traverse par en dessous et porte quand on retombe dessus). Là-haut : climatiseurs, plantes, cordes à
// linge, réservoirs d'eau, et des planches manquantes par lesquelles on retombe dans la rue (sans
// perdre). Au bout du tronçon, on redescend d'un saut. La rue continue en dessous, toujours visible.
//
// p.under (le drapeau d'étage du moteur) veut dire ici « sur les passerelles ».

export const UP_Y = 5.4;                  // dessus du plancher
const DECK_T = 0.16;                      // épaisseur des planches
export const MOD = 4;                     // module de plancher (4 m)
export const RAMP_UP_LEN = 18;            // rampe de la rue au plancher
const DECK_HX = LANES[2] + 1.3;           // demi-largeur du plancher (les trois voies)
const POST_X = 4.95;                      // poteaux de bambou, sur les bordures des trottoirs
const P_HALF_X = 0.32, P_HALF_Z = 0.35;
const BAMBOO = '#c8b070', BAMBOO2 = '#b09858', TIE = '#1e1a16';
const BALL = new THREE.SphereGeometry(1, 12, 8);
const SMOOTH = new THREE.MeshLambertMaterial({ vertexColors: true });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const CAP = { frame: 180, plank: 520, broken: 80 };

const rampY = (o, z) => UP_Y * Math.min(1, Math.max(0, (o.zNear - z) / RAMP_UP_LEN)) + 0;
const laneOfX = (x) => Math.max(0, Math.min(2, Math.round(x / LANES[2]) + 1));

// ---------- Géométries ----------
// portique de 4 m (centré en z) : poteaux et contreventements de bambou, traverse sous le plancher,
// garde-corps, lanternes rouges suspendues au bord
function frameGeos() {
  const f = new Builder(), s = new Builder(), g = new Builder();
  for (const sx of [-1, 1]) {
    const x = sx * POST_X;
    s.add(U.cyl, BAMBOO, [x, (UP_Y + 1.3) / 2, 0], [0.08, UP_Y + 1.3, 0.08]);
    for (let y = 0.6; y < UP_Y + 1.2; y += 0.9) f.add(U.box, BAMBOO2, [x, y, 0], [0.18, 0.04, 0.18]);   // nœuds
    s.add(U.cyl, BAMBOO2, [x + sx * 0.12, UP_Y / 2, 0], [0.05, Math.hypot(UP_Y, MOD), 0.05], [Math.atan2(MOD, UP_Y), 0, 0]);   // contreventement
    // garde-corps : deux lisses de bambou, ligatures noires
    for (const y of [UP_Y + 0.55, UP_Y + 1.05]) s.add(U.cyl, BAMBOO, [sx * (DECK_HX + 0.2), y, 0], [0.05, MOD + 0.05, 0.05], [Math.PI / 2, 0, 0]);
    s.add(U.cyl, BAMBOO2, [sx * (DECK_HX + 0.2), UP_Y + 0.55, 0], [0.05, 1.1, 0.05]);
    for (const y of [UP_Y + 0.55, UP_Y + 1.05]) f.add(U.box, TIE, [sx * (DECK_HX + 0.2), y, 0], [0.12, 0.12, 0.12]);
    f.add(U.box, '#7a5a3a', [sx * (DECK_HX + 0.35), UP_Y - DECK_T / 2, 0], [0.7, DECK_T, MOD]);   // planche de rive
    // lanterne rouge accrochée sous la rive
    f.add(U.box, TIE, [sx * (DECK_HX + 0.55), UP_Y - 0.35, 0], [0.02, 0.4, 0.02]);
    s.add(BALL, '#c8202a', [sx * (DECK_HX + 0.55), UP_Y - 0.78, 0], [0.22, 0.27, 0.22]);
    g.add(BALL, '#ff5a3a', [sx * (DECK_HX + 0.55), UP_Y - 0.78, 0], [0.14, 0.18, 0.14]);
    f.add(U.cyl, '#d8a030', [sx * (DECK_HX + 0.55), UP_Y - 0.52, 0], [0.09, 0.05, 0.09]);
  }
  // traverse et longerons sous le plancher (au-dessus de 4,9 m : on passe dessous)
  s.add(U.cyl, BAMBOO, [0, UP_Y - 0.3, 0], [0.09, POST_X * 2, 0.09], [0, 0, Math.PI / 2]);
  for (const x of [-DECK_HX + 0.1, -1.3, 1.3, DECK_HX - 0.1]) f.add(U.box, '#5a4430', [x, UP_Y - DECK_T - 0.08, 0], [0.14, 0.16, MOD]);
  return { flat: f.build(), smooth: s.build(), glow: g.build() };
}

// plancher d'une voie sur un module : cinq planches de bois un peu disjointes
function plankGeo() {
  const b = new Builder();
  const W = LANES[2] - LANES[1];
  for (let k = 0; k < 5; k++) {
    const z = -MOD / 2 + 0.4 + k * 0.8;
    b.add(U.box, ['#9a7a52', '#8a6a44', '#a4845a', '#927248', '#8e6e46'][k], [0, UP_Y - DECK_T / 2, z], [W - 0.04, DECK_T, 0.76]);
    for (const x of [-0.9, 0.9]) b.add(U.box, '#3a3028', [x, UP_Y + 0.002, z], [0.04, 0.004, 0.04]);   // clous
  }
  return b.build();
}

// bord d'une planche cassée au bord d'un trou (centré sur la limite du trou)
function brokenGeo() {
  const b = new Builder();
  for (let k = 0; k < 5; k++) b.add(U.box, k % 2 ? '#8a6a44' : '#9a7a52', [-1.0 + k * 0.5, UP_Y - DECK_T / 2 - 0.1, 0.25], [0.42, DECK_T, 0.5 + (k % 3) * 0.2], [0.5 + (k % 2) * 0.3, 0, (k - 2) * 0.1]);
  for (const x of [-1.25, 1.25]) {   // poteaux de ruban rouge et blanc
    b.add(U.box, '#d8202a', [x, UP_Y + 0.45, 0.4], [0.06, 0.9, 0.06]);
    b.add(U.box, '#f4f0e8', [x, UP_Y + 0.5, 0.4], [0.07, 0.2, 0.07]);
  }
  return b.build();
}

// rampe de planches de la rue au plancher (pied en z = 0, sommet vers -z)
function rampGeos() {
  const f = new Builder(), s = new Builder();
  const L = Math.hypot(RAMP_UP_LEN, UP_Y), a = Math.atan2(UP_Y, RAMP_UP_LEN);
  f.add(U.box, '#9a7a52', [0, UP_Y / 2 - 0.08, -RAMP_UP_LEN / 2], [2.4, 0.14, L], [a, 0, 0]);
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    f.add(U.box, '#6a5038', [0, UP_Y * t + 0.02, -RAMP_UP_LEN * t], [2.42, 0.04, 0.08], [a, 0, 0]);   // tasseaux
  }
  for (let i = 1; i < 6; i++) {   // tréteaux de bambou
    const t = i / 6, h = UP_Y * t;
    for (const x of [-1.1, 1.1]) s.add(U.cyl, BAMBOO, [x, h / 2, -RAMP_UP_LEN * t], [0.06, h, 0.06]);
    s.add(U.cyl, BAMBOO2, [0, h - 0.2, -RAMP_UP_LEN * t], [0.05, 2.3, 0.05], [0, 0, Math.PI / 2]);
  }
  for (const x of [-1.25, 1.25]) {   // main courante
    s.add(U.cyl, BAMBOO, [x, UP_Y / 2 + 0.9, -RAMP_UP_LEN / 2], [0.05, L, 0.05], [Math.PI / 2 - a, 0, 0]);
    for (let i = 0; i <= 6; i++) { const t = i / 6; s.add(U.cyl, BAMBOO2, [x, UP_Y * t + 0.45, -RAMP_UP_LEN * t], [0.04, 0.9, 0.04]); }
    f.add(U.box, '#ff6a1a', [x * 1.05, 0.35, 0.3], [0.3, 0.7, 0.3]);   // plots au pied
  }
  return { flat: f.build(), smooth: s.build() };
}

// flèche rose lumineuse au pied de la rampe : « monte par ici »
function arrowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.shadowColor = '#ff4fa8'; g.shadowBlur = 18;
  g.fillStyle = '#ff8ac8';
  g.beginPath();
  g.moveTo(64, 14); g.lineTo(110, 62); g.lineTo(80, 62); g.lineTo(80, 112); g.lineTo(48, 112); g.lineTo(48, 62); g.lineTo(18, 62);
  g.closePath(); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Obstacles des passerelles (posés sur le plancher, centrés en z) ----------
function triMesh(f, s, g) {
  const grp = new THREE.Group();
  if (f.parts.length) grp.add(new THREE.Mesh(f.build(), vcMat));
  if (s.parts.length) grp.add(new THREE.Mesh(s.build(), SMOOTH));
  if (g && g.parts.length) grp.add(new THREE.Mesh(g.build(), GLOW));
  return grp;
}
const builders = () => [new Builder(), new Builder(), new Builder()];
const Y = UP_Y;

function acUnits() {   // climatiseurs empilés, tuyaux, flaque de condensation
  const [f, s] = builders();
  for (const [x, y] of [[-0.55, 0.32], [0.55, 0.32], [0, 0.82]]) {
    f.add(U.box, '#e8eaee', [x, Y + y, 0], [0.95, 0.5, 0.6]);
    s.add(U.cyl, '#5a5e68', [x - 0.15, Y + y, 0.31], [0.18, 0.02, 0.18], [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) f.add(U.box, '#9a9ea8', [x + 0.25, Y + y - 0.15 + k * 0.1, 0.305], [0.3, 0.02, 0.01]);
  }
  s.add(U.cyl, '#d8d8d8', [0.9, Y + 0.6, -0.1], [0.04, 1.2, 0.04]);
  f.add(U.box, '#4a6a8a', [0.3, Y + 0.005, 0.5], [0.8, 0.01, 0.4]);
  return triMesh(f, s);
}

function plants() {   // pots de fleurs, petit arbre, cage à oiseau en bambou
  const [f, s, g] = builders();
  f.add(U.box, '#6a5a4a', [0, Y + 0.05, 0], [2.2, 0.1, 0.6]);
  for (const x of [-0.75, 0.75]) {
    s.add(U.cyl, '#c86a3a', [x, Y + 0.35, 0], [0.3, 0.6, 0.3]);
    s.add(BALL, '#2a7a3a', [x, Y + 0.85, 0], [0.38, 0.32, 0.38]);
    for (let k = 0; k < 4; k++) s.add(BALL, ['#ff5a8a', '#ffd040', '#ffffff', '#ff8a3a'][k], [x + Math.cos(k * 1.6) * 0.25, Y + 0.95, Math.sin(k * 1.6) * 0.25], [0.07, 0.07, 0.07]);
  }
  // cage à oiseau ronde sur un tabouret, oiseau jaune
  f.add(U.box, '#c8202a', [0, Y + 0.3, 0], [0.4, 0.6, 0.4]);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    s.add(U.cyl, BAMBOO, [Math.cos(a) * 0.22, Y + 0.85, Math.sin(a) * 0.22], [0.012, 0.5, 0.012]);
  }
  s.add(BALL, BAMBOO, [0, Y + 1.12, 0], [0.24, 0.1, 0.24]);
  s.add(BALL, '#ffd040', [0, Y + 0.8, 0], [0.07, 0.07, 0.09]);
  g.add(BALL, '#ffffff', [0.03, Y + 0.83, 0.07], [0.015, 0.015, 0.015]);
  return triMesh(f, s, g);
}

function laundry() {   // corde à linge de bambou à hauteur de tête : roulade !
  const [f, s] = builders();
  for (const x of [-1.25, 1.25]) {
    s.add(U.cyl, BAMBOO, [x, Y + 1.5, 0], [0.05, 3.0, 0.05]);
    f.add(U.box, '#5a5a62', [x, Y + 0.06, 0], [0.3, 0.12, 0.3]);
  }
  s.add(U.cyl, BAMBOO, [0, Y + 2.6, 0], [0.05, 2.7, 0.05], [0, 0, Math.PI / 2]);
  const cols = ['#ff8ab0', '#8ad0ff', '#fff0a0', '#a8f0b0', '#ffffff', '#c86a4a', '#6a4ab0'];
  let x = -1.05;
  while (x < 1.0) {
    const w = rand(0.28, 0.5), h = rand(0.7, 1.05), c = pick(cols);
    f.add(U.box, c, [x + w / 2, Y + 2.58 - h / 2, 0], [w, h, 0.03]);
    if (Math.random() < 0.4) f.add(U.box, c, [x + w / 2, Y + 2.2, 0], [w + 0.3, 0.16, 0.03]);   // manches
    f.add(U.box, '#e8e4dc', [x + 0.04, Y + 2.6, 0.02], [0.03, 0.08, 0.03]);   // pinces
    x += w + 0.06;
  }
  return triMesh(f, s);
}

function waterTank() {   // réservoir d'eau bleu sur son pied d'acier : infranchissable
  const [f, s] = builders();
  for (const [x, z] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) f.add(U.box, '#4a4c58', [x, Y + 0.6, z], [0.1, 1.2, 0.1]);
  f.add(U.box, '#4a4c58', [0, Y + 1.22, 0], [1.9, 0.08, 1.2]);
  s.add(U.cyl, '#3a7ad8', [0, Y + 2.4, 0], [1.05, 2.3, 1.05]);
  s.add(U.cyl, '#2a5ab0', [0, Y + 3.6, 0], [1.08, 0.14, 1.08]);
  for (const y of [1.8, 3.0]) s.add(U.cyl, '#2a5ab0', [0, Y + y, 0], [1.07, 0.06, 1.07]);
  f.add(U.box, '#f4f0e8', [0, Y + 2.5, 1.06], [0.9, 0.5, 0.02]);
  f.add(U.box, '#d8202a', [0, Y + 2.5, 1.07], [0.6, 0.12, 0.01]);
  for (let k = 0; k < 6; k++) f.add(U.box, '#8a8e98', [0.95, Y + 1.4 + k * 0.4, 0.4], [0.04, 0.04, 0.4]);   // échelle
  return triMesh(f, s);
}

// fin d'un tronçon : bord de plancher peint en jaune et noir, feux clignotants
function endGeo() {
  const f = new Builder(), g = new Builder();
  for (let k = 0; k < 16; k++) f.add(U.box, k % 2 ? '#141414' : '#f2c230', [-DECK_HX + 0.25 + k * (DECK_HX * 2 / 16), UP_Y - DECK_T / 2, -0.05], [DECK_HX * 2 / 16, DECK_T + 0.02, 0.12]);
  for (const x of [-DECK_HX - 0.2, DECK_HX + 0.2]) g.add(BALL, '#ff9a2a', [x, UP_Y + 1.25, 0], [0.1, 0.1, 0.1]);
  return { flat: f.build(), glow: g.build() };
}

// ---------- Moteur d'obstacles à deux étages ----------
export class ScaffoldObstacles extends Obstacles {
  constructor(root, opts) {
    const street = new THREE.Group();
    root.add(street);
    super(street, opts);
    this.root = root;
    this.sound = opts.sound;
    this.up = new THREE.Group();
    root.add(this.up);

    // plancher et portiques : maillages instanciés (un appel de dessin par matière, quelle que soit la longueur)
    const fr = frameGeos();
    const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; this.up.add(m); return m; };
    this.inst = {
      frame: [inst(fr.flat, vcMat, CAP.frame), inst(fr.smooth, SMOOTH, CAP.frame), inst(fr.glow, GLOW, CAP.frame)],
      plank: [inst(plankGeo(), vcMat, CAP.plank)],
      broken: [inst(brokenGeo(), vcMat, CAP.broken)],
    };
    this.geo = { ramp: rampGeos(), end: endGeo() };
    this.arrowMat = new THREE.SpriteMaterial({ map: arrowTexture(), transparent: true, depthWrite: false });
    this.make = { ac: acUnits, plants, laundry, tank: waterTank };
    this.proto = {};
    for (const k of Object.keys(this.make)) this.proto[k] = [0, 1].map(() => this.make[k]());
    this.reset(0);
  }

  reset(startZ) {
    super.reset(startZ);
    if (!this.up) return;   // appelé une première fois par le constructeur parent
    for (const o of this.uList || []) if (o.mesh) this.up.remove(o.mesh);
    for (const s of this.sections || []) if (s.mesh) this.up.remove(s.mesh);
    this.uList = [];
    this.sections = [];
    this.uCursor = startZ - 40;
    this.uBusy = [startZ, startZ, startZ];
    this.uLast = null;
    this.nextSection = startZ - rand(110, 170);
    this.under = false;
    this.dirty = true;
    this.rebuild();
  }

  warmupGroup() {
    const g = super.warmupGroup();
    for (const k of Object.keys(this.proto)) g.add(this.proto[k][0].clone());
    g.add(new THREE.Mesh(this.geo.ramp.flat, vcMat), new THREE.Mesh(this.geo.ramp.smooth, SMOOTH), new THREE.Sprite(this.arrowMat));
    g.add(new THREE.Mesh(this.geo.end.flat, vcMat), new THREE.Mesh(this.geo.end.glow, GLOW));
    return g;
  }

  // ---------- Tronçons de passerelle ----------
  sectionAt(z) {
    for (const s of this.sections) if (z <= s.zStart && z > s.zEnd) return s;
    return null;
  }
  // y a-t-il une planche sous ce point ?
  deckAt(x, z) {
    if (Math.abs(x) > DECK_HX) return false;
    const s = this.sectionAt(z);
    if (!s) return false;
    const k = Math.floor((s.zStart - z) / MOD);
    return !s.gaps.has(k * 3 + laneOfX(x));
  }

  // réécrit les instances de tous les tronçons (à l'ajout ou au retrait d'un tronçon ou d'un trou)
  rebuild() {
    if (!this.dirty) return;
    this.dirty = false;
    const m = new THREE.Matrix4();
    let nf = 0, np = 0, nb = 0;
    const F = this.inst.frame, Pl = this.inst.plank[0], Br = this.inst.broken[0];
    for (const s of this.sections) {
      for (let k = 0; k < s.n; k++) {
        const zc = s.zStart - k * MOD - MOD / 2;
        if (nf < CAP.frame) { m.makeTranslation(0, 0, zc); for (const f of F) f.setMatrixAt(nf, m); nf++; }
        for (let l = 0; l < 3; l++) {
          if (s.gaps.has(k * 3 + l)) {
            // bords cassés au début et à la fin du trou
            if (!s.gaps.has((k - 1) * 3 + l) && nb < CAP.broken) { m.makeTranslation(LANES[l], 0, zc + MOD / 2); Br.setMatrixAt(nb++, m); }
            if (!s.gaps.has((k + 1) * 3 + l) && nb < CAP.broken) { m.makeRotationY(Math.PI); m.setPosition(LANES[l], 0, zc - MOD / 2); Br.setMatrixAt(nb++, m); }
          } else if (np < CAP.plank) { m.makeTranslation(LANES[l], 0, zc); Pl.setMatrixAt(np++, m); }
        }
      }
    }
    for (const f of F) { f.count = nf; f.instanceMatrix.needsUpdate = true; }
    Pl.count = np; Pl.instanceMatrix.needsUpdate = true;
    Br.count = nb; Br.instanceMatrix.needsUpdate = true;
  }

  addSection(z, len) {
    const n = Math.round(len / MOD);
    const s = { zStart: z, zEnd: z - n * MOD, n, gaps: new Set() };
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.geo.end.flat, vcMat), new THREE.Mesh(this.geo.end.glow, GLOW));
    g.position.z = s.zEnd;
    s.mesh = g;
    this.up.add(g);
    this.sections.push(s);
    this.dirty = true;
    return s;
  }

  // rampe de la rue jusqu'au plancher, pied en z
  addRamp(lane, z) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.geo.ramp.flat, vcMat), new THREE.Mesh(this.geo.ramp.smooth, SMOOTH));
    const arrow = new THREE.Sprite(this.arrowMat);
    arrow.scale.set(1.2, 1.2, 1);
    arrow.position.set(0, 2.2, 1.5);
    g.add(arrow);
    g.position.set(LANES[lane], 0, z);
    this.scene.add(g);
    const o = { kind: 'upramp', lane, x: LANES[lane], halfW: 1.2, zNear: z, zFar: z - RAMP_UP_LEN, mesh: g, arrow };
    this.list.push(o);
    this.busy[lane] = Math.min(this.busy[lane], z - RAMP_UP_LEN - 8);
    return o;
  }

  // ---------- Rue ----------
  spawnObstacles(z, speed, dist) {
    // un nouveau tronçon : rampe dans une voie libre, plancher à partir du haut de la rampe
    if (dist > 60 && z < this.nextSection) {
      const minGap = Math.max(7, speed * 0.55);
      const lanes = [0, 1, 2].filter((l) => this.busy[l] - z >= minGap && !(this.reserve && this.reserve.lane === l)
        && !this.list.some((o) => o.moving && o.lane === l));
      if (lanes.length) {
        this.addRamp(pick(lanes), z);
        const s = this.addSection(z - RAMP_UP_LEN, rand(120, 240));
        this.nextSection = s.zEnd - rand(140, 260);
      }
    }
    // zone d'arrivée au bout d'un tronçon : rien dans la rue sur 14 m
    for (const s of this.sections) {
      if (z <= s.zEnd + 4 && z > s.zEnd - 14) for (let l = 0; l < 3; l++) this.busy[l] = Math.min(this.busy[l], s.zEnd - 14);
    }
    return super.spawnObstacles(z, speed, dist);
  }

  // le malus ne se pose jamais sur une rampe (ni juste devant)
  barrierNear(lane, z) {
    for (const o of this.list) if (o.kind === 'upramp' && o.lane === lane && z <= o.zNear + 4 && z >= o.zFar - 4) return { kind: 'ramp', d: 0 };
    return super.barrierNear(lane, z);
  }

  // ---------- Passerelles : obstacles ----------
  addUp(o) {
    o.x = LANES[o.lane];
    if (o.mesh) { o.mesh.position.x = o.x; o.mesh.position.z = (o.zNear + o.zFar) / 2; this.up.add(o.mesh); }
    this.uList.push(o);
    return o;
  }

  addUpObstacle(lane, z, type) {
    const spec = { ac: { kind: 'low', h: 1.0, depth: 0.7 }, plants: { kind: 'low', h: 1.0, depth: 0.6 }, laundry: { kind: 'high', depth: 0.3 }, tank: { kind: 'wall', depth: 1.2 } }[type];
    const o = this.addUp({ kind: spec.kind, h: spec.h || 0, lane, halfW: type === 'tank' ? 1.15 : 1.0, zNear: z, zFar: z - spec.depth, mesh: pick(this.proto[type]).clone(), type });
    this.uBusy[lane] = Math.min(this.uBusy[lane], z - spec.depth);
    return o;
  }

  // planches manquantes dans une voie, sur un ou deux modules : on retombe dans la rue
  addGap(s, lane, k, n = 1) {
    for (let i = 0; i < n; i++) s.gaps.add((k + i) * 3 + lane);
    const zNear = s.zStart - k * MOD, zFar = zNear - n * MOD;
    this.dirty = true;
    this.uBusy[lane] = Math.min(this.uBusy[lane], zFar);
    return this.addUp({ kind: 'gap', lane, zNear, zFar, mesh: null });
  }

  spawnUpRow(z, speed, dist) {
    const s = this.sectionAt(z);
    if (!s) return 6;
    // ni sur l'arrivée de la rampe, ni dans les derniers mètres (on redescend) : l'arrière de l'obstacle
    // le plus profond (réservoir, 1,2 m) reste à 14 m du bout
    if (z > s.zStart - 10 || z - 1.2 < s.zEnd + 14) return 6;
    const diff = Math.min(1, dist / 2500);
    const rowGap = Math.max(16, speed * 1.15) + rand(0, 8) * (1 - diff * 0.5);
    const minGap = Math.max(8, speed * 0.6);
    const free = [0, 1, 2].filter((l) => this.uBusy[l] - z >= minGap);
    this.upCandies(z);
    if (Math.random() < 0.15) return rowGap * 0.6;   // respiration
    const lanes = free.sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.55 ? 1 : 2;
    let wall = false;
    for (const l of lanes.slice(0, count)) {
      const r = Math.random();
      if (r < 0.24) {
        const k = Math.ceil((s.zStart - z) / MOD), n = Math.random() < 0.4 ? 2 : 1;
        if ((k + n) * MOD < s.zStart - s.zEnd - 14) this.addGap(s, l, k, n);
      } else if (r < 0.44) this.addUpObstacle(l, z, 'ac');
      else if (r < 0.58) this.addUpObstacle(l, z, 'plants');
      else if (r < 0.82 || wall) this.addUpObstacle(l, z, 'laundry');
      else { this.addUpObstacle(l, z, 'tank'); wall = true; }
    }
    return rowGap;
  }

  // friandises : plus nombreuses là-haut (c'est la récompense de la montée)
  upCandies(z) {
    const C = this.candies;
    if (!C || this.uLast === null) { this.uLast = z; return; }
    const zFrom = this.uLast - 3, zTo = z + 3;
    this.uLast = z;
    if (zFrom - zTo < 7 || Math.random() > 0.85) return;
    const l = pick([0, 1, 2]);
    if (this.uList.some((o) => o.lane === l && o.zNear > zTo - 2 && o.zFar < zFrom + 2)) return;
    const z0 = zFrom - Math.random() * Math.max(0, zFrom - zTo - 7);
    for (let i = 0; i < 3; i++) C.placeAt(LANES[l], UP_Y + 0.9, z0 - i * 2.2, -1, i * 0.6);
  }

  update(pz, speed, dist) {
    super.update(pz, speed, dist);
    while (this.uCursor > pz - SPAWN_AHEAD * 0.65) this.uCursor -= this.spawnUpRow(this.uCursor, speed, dist);
    const limit = pz + DESPAWN_BEHIND;
    let j = 0;
    for (const o of this.uList) {
      if (o.zFar > limit) { if (o.mesh) this.up.remove(o.mesh); } else this.uList[j++] = o;
    }
    this.uList.length = j;
    const before = this.sections.length;
    this.sections = this.sections.filter((s) => { if (s.zEnd > limit) { this.up.remove(s.mesh); return false; } return true; });
    if (this.sections.length !== before) this.dirty = true;
    this.rebuild();
  }

  // ---------- Collisions ----------
  resolve(p) {
    if (p.under) {
      const r = this.resolveUp(p);
      if (r) return r;
    }
    this.under = false;
    const r = super.resolve(p);
    // rampes vers les passerelles
    for (const o of this.list) {
      if (o.kind !== 'upramp' || Math.abs(p.x - o.x) > o.halfW || p.z > o.zNear || p.z < o.zFar) continue;
      const h = rampY(o, p.z);
      if (p.y >= h - 1.0) r.ground = Math.max(r.ground, h);
      else r.crash = o;   // arrivé de côté contre la rampe
    }
    // on retombe sur le plancher par-dessus (haut de la rampe, saut depuis un toit) : on est sur les passerelles
    if (!r.crash && p.vy <= 0 && p.y <= UP_Y + 0.02 && p.y >= UP_Y - 0.35 && this.deckAt(p.x, p.z)) {
      p.under = true;
      this.under = true;
      r.ground = UP_Y;
    }
    return r;
  }

  // sur les passerelles ; renvoie null quand on est retombé sous le plancher (on repasse aux règles de la rue)
  resolveUp(p) {
    const deck = this.deckAt(p.x, p.z);
    if (!deck && p.y < UP_Y - 0.4) {
      p.under = false;
      if (this.sound && this.sound.fall) this.sound.fall();
      return null;
    }
    this.under = true;
    let crash = null;
    const ry = p.y - UP_Y;
    const zMin = p.z - P_HALF_Z, zMax = p.z + P_HALF_Z;
    for (const o of this.uList) {
      if (o.kind === 'gap' || Math.abs(p.x - o.x) > o.halfW + P_HALF_X) continue;
      if (zMin > o.zNear || zMax < o.zFar) continue;
      if (o.kind === 'low') { if (ry < o.h) crash = o; }
      else if (o.kind === 'high') { if (ry + p.h > 1.32 && ry < 2.75) crash = o; }
      else if (o.kind === 'wall' && ry < 5) crash = o;
    }
    // sans planche dessous, le sol est celui de la rue (on tombe, sauf si l'on saute par-dessus le trou)
    return { ground: deck ? UP_Y : super.groundAt(p.x, p.z), crash };
  }

  groundAt(x, z, margin = 0, under = false) {
    if (under && this.deckAt(x, z)) return UP_Y;
    let g = super.groundAt(x, z, margin);
    for (const o of this.list) {
      if (o.kind === 'upramp' && Math.abs(x - o.x) <= o.halfW + margin && z <= o.zNear && z >= o.zFar) g = Math.max(g, rampY(o, z));
    }
    return g;
  }

  baseY(p) { return p.under ? UP_Y : 0; }

  // dans la rue sous une passerelle, la caméra reste sous le plancher (sauf si l'héroïne passe au-dessus)
  clampCam(out, look, p) {
    if (p.under || p.y + p.h > UP_Y - 0.3 || !this.sectionAt(out.z)) return;
    out.y = Math.min(out.y, UP_Y - 0.65);
    look.y = Math.min(look.y, out.y - 0.4);
  }

  frame() {
    const t = performance.now() / 1000;
    for (const o of this.list) if (o.arrow) o.arrow.position.y = 2.2 + Math.sin(t * 5) * 0.2;
  }
}
