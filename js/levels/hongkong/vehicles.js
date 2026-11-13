import * as THREE from 'three';
import { Builder, U, vcMat, pick } from '../../geo.js';
import { TRAIN_HALF_W, TRAIN_TOP, RAMP_LEN } from '../../config.js';

// Obstacles de Hong Kong : minibus (« public light bus » crème au toit rouge ou vert) garés en file, toit
// plat où l'on court ; taxis rouges qui foncent vers le joueur (un seul à la fois) ; rampes de planches
// sur tréteaux de bambou ; barrières de chantier. Fenêtres et phares allumés : matière lumineuse.

const W = TRAIN_HALF_W * 2;
const BALL = new THREE.SphereGeometry(1, 12, 8);
const SMOOTH = new THREE.MeshLambertMaterial({ vertexColors: true });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const BUS_LEN = 7.0, BUS_GAP = 1.2;
const TAXI_LEN = 4.6, TAXI_TOP = 1.55;

// ---------- Minibus (avant vers +z, toit plat à TRAIN_TOP) ----------
function minibusGeo(roof) {
  const f = new Builder(), s = new Builder(), g = new Builder();
  const zc = -BUS_LEN / 2, CREAM = '#f2ecd8';
  f.add(U.box, CREAM, [0, 1.15, zc], [W, 1.5, BUS_LEN - 0.2]);
  f.add(U.box, roof, [0, 2.25, zc], [W - 0.04, 0.7, BUS_LEN - 0.3]);
  f.add(U.box, roof, [0, TRAIN_TOP - 0.03, zc], [W - 0.2, 0.06, BUS_LEN - 0.5]);
  f.add(U.box, '#2a2a30', [0, 0.4, zc], [W, 0.2, BUS_LEN - 0.1]);
  // vitres éclairées de l'intérieur, passagers en silhouette
  for (const sx of [-1, 1]) {
    g.add(U.box, '#f0f4e0', [sx * (W / 2 + 0.005), 1.55, zc - 0.3], [0.02, 0.62, BUS_LEN - 1.8]);
    for (let k = 0; k < 5; k++) f.add(U.box, '#3a3a44', [sx * (W / 2 + 0.012), 1.45, zc + 2 - k * 1.1], [0.02, 0.36, 0.3]);
    for (let k = 0; k < 6; k++) f.add(U.box, CREAM, [sx * (W / 2 + 0.014), 1.55, zc + 2.65 - k * 1.08], [0.02, 0.66, 0.06]);
    for (const z of [zc + BUS_LEN / 2 - 1.3, zc - BUS_LEN / 2 + 1.3]) {
      s.add(U.cyl, '#1a1a1c', [sx * (W / 2 - 0.12), 0.42, z], [0.42, 0.3, 0.42], [0, 0, Math.PI / 2]);
      s.add(U.cyl, '#b8bcc0', [sx * (W / 2 + 0.02), 0.42, z], [0.2, 0.04, 0.2], [0, 0, Math.PI / 2]);
    }
  }
  // avant : pare-brise, panneau de destination orange, phares ; arrière : feux rouges
  g.add(U.box, '#c8d8e8', [0, 1.6, -0.05], [W - 0.2, 0.7, 0.02]);
  f.add(U.box, '#1a1a1c', [0, 2.15, -0.06], [1.4, 0.26, 0.04]);
  g.add(U.box, '#ff9a2a', [0, 2.15, -0.03], [1.3, 0.18, 0.02]);
  for (const sx of [-1, 1]) {
    g.add(U.box, '#fff8e0', [sx * 0.8, 0.75, -0.04], [0.3, 0.16, 0.02]);
    g.add(U.box, '#ff2a2a', [sx * 0.85, 0.85, -BUS_LEN + 0.06], [0.2, 0.3, 0.02]);
  }
  f.add(U.box, '#b8bcc0', [0, 0.45, -0.02], [W, 0.18, 0.08]);
  return { flat: f.build(), smooth: s.build(), glow: g.build() };
}

// ---------- Taxi rouge (4,6 m, avant vers +z) ----------
function taxiGeo() {
  const f = new Builder(), s = new Builder(), g = new Builder();
  const zc = -TAXI_LEN / 2, R = '#d8202a', SILVER = '#d8dcdf';
  f.add(U.box, R, [0, 0.68, zc], [1.82, 0.62, TAXI_LEN - 0.2]);
  f.add(U.box, SILVER, [0, 1.22, zc - 0.25], [1.64, 0.55, 2.3]);
  f.add(U.box, SILVER, [0, TAXI_TOP - 0.03, zc - 0.25], [1.58, 0.06, 2.2]);
  f.add(U.box, '#26303a', [0, 1.2, zc + 0.92], [1.5, 0.46, 0.06], [-0.45, 0, 0]);
  for (const sx of [-1, 1]) {
    for (const dz of [-0.75, 0.3]) f.add(U.box, '#26303a', [sx * 0.825, 1.22, zc + dz], [0.02, 0.4, 0.9]);
    for (const z of [zc + 1.35, zc - 1.35]) {
      s.add(U.cyl, '#1a1a1c', [sx * 0.86, 0.36, z], [0.36, 0.26, 0.36], [0, 0, Math.PI / 2]);
      s.add(U.cyl, SILVER, [sx * 0.99, 0.36, z], [0.16, 0.02, 0.16], [0, 0, Math.PI / 2]);
    }
    g.add(U.box, '#fff6d0', [sx * 0.66, 0.72, 0.03], [0.34, 0.16, 0.04]);
    g.add(U.box, '#ff2a2a', [sx * 0.75, 0.75, -TAXI_LEN + 0.08], [0.24, 0.14, 0.04]);
  }
  f.add(U.box, SILVER, [0, 0.42, 0.04], [1.9, 0.18, 0.14]);
  // enseigne « TAXI » lumineuse sur le toit
  g.add(U.box, '#fff4b0', [0, TAXI_TOP + 0.12, zc - 0.1], [0.8, 0.2, 0.3]);
  f.add(U.box, '#1a1a1c', [0, TAXI_TOP + 0.12, zc + 0.06], [0.5, 0.08, 0.01]);
  return { flat: f.build(), smooth: s.build(), glow: g.build() };
}

const meshes = (m) => [new THREE.Mesh(m.flat, vcMat), new THREE.Mesh(m.smooth, SMOOTH), new THREE.Mesh(m.glow, GLOW)];

export function hongKongVehicleKit() {
  const buses = ['#d8202a', '#2a8a4a'].map(minibusGeo);
  const taxi = taxiGeo();
  function buildBuses(cars) {
    const g = new THREE.Group();
    for (let i = 0; i < cars; i++) {
      for (const m of meshes(pick(buses))) { m.position.z = -i * (BUS_LEN + BUS_GAP); g.add(m); }
    }
    g.userData.len = cars * BUS_LEN + (cars - 1) * BUS_GAP;
    g.userData.top = TRAIN_TOP;
    return g;
  }
  function buildTaxi() {
    const g = new THREE.Group();
    g.add(...meshes(taxi));
    g.userData.len = TAXI_LEN;
    g.userData.top = TAXI_TOP;
    return g;
  }
  return {
    rampGeo: rampGeo(),
    low: lowBarriers(),
    highGeo: signGate(),
    hitch: null,
    // un seul taxi quand il roule ; à l'arrêt, une file de minibus
    buildVehicle: (cars, moving) => (moving ? buildTaxi() : buildBuses(cars)),
    warmup() {
      const g = new THREE.Group();
      g.add(buildBuses(2), buildTaxi());
      return g;
    },
  };
}

// ---------- Rampe : planches sur tréteaux de bambou ----------
function rampGeo() {
  const b = new Builder();
  const L = Math.hypot(RAMP_LEN, TRAIN_TOP), a = Math.atan2(TRAIN_TOP, RAMP_LEN);
  b.add(U.box, '#a8845a', [0, TRAIN_TOP / 2, RAMP_LEN / 2], [2.0, 0.1, L], [a, 0, 0]);
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    b.add(U.box, '#7a5a38', [0, TRAIN_TOP * (1 - t) + 0.06, RAMP_LEN * t], [2.02, 0.03, 0.06], [a, 0, 0]);
  }
  for (const t of [0.3, 0.6]) {
    const h = TRAIN_TOP * (1 - t);
    for (const x of [-0.85, 0.85]) b.add(U.cyl, '#c8b070', [x, h / 2, RAMP_LEN * t], [0.05, h, 0.05]);
    b.add(U.cyl, '#c8b070', [0, h - 0.1, RAMP_LEN * t], [0.05, 1.8, 0.05], [0, 0, Math.PI / 2]);
  }
  for (const x of [-1.2, 1.2]) {   // cônes de chantier au pied
    b.add(U.cone8, '#ff6a1a', [x, 0.35, RAMP_LEN + 0.2], [0.18, 0.7, 0.18]);
    b.add(U.cyl, '#f4f0e8', [x, 0.42, RAMP_LEN + 0.2], [0.12, 0.08, 0.12]);
  }
  return b.build();
}

// ---------- Obstacles bas (à sauter) ----------
function lowBarriers() {
  const out = [];
  let b = new Builder();   // barrières de chantier en plastique rouge et blanc
  for (const x of [-0.62, 0.62]) {
    b.add(U.box, '#d8202a', [x, 0.5, 0], [1.2, 0.9, 0.4]);
    for (const dy of [0.35, 0.7]) b.add(U.box, '#f4f0e8', [x, dy, 0.21], [1.1, 0.12, 0.02]);
    b.add(U.box, '#b8181e', [x, 0.03, 0], [1.25, 0.06, 0.55]);
  }
  out.push({ geo: b.build(), depth: 0.6, h: 1.0 });

  b = new Builder();   // caisses de polystyrène du marché aux poissons sur un diable
  for (let i = 0; i < 6; i++) b.add(U.box, '#f4f4f8', [-0.6 + (i % 3) * 0.6, 0.25 + ((i / 3) | 0) * 0.42, 0], [0.56, 0.38, 0.5]);
  for (let i = 0; i < 6; i++) b.add(U.box, '#4a8ad8', [-0.6 + (i % 3) * 0.6, 0.25 + ((i / 3) | 0) * 0.42, 0.26], [0.4, 0.06, 0.01]);
  b.add(U.box, '#3a3c48', [0, 0.04, 0], [2.0, 0.08, 0.6]);
  out.push({ geo: b.build(), depth: 0.6, h: 1.0 });

  b = new Builder();   // pile de cartons scotchés
  for (const [x, y, s] of [[-0.7, 0.3, 0.6], [0, 0.32, 0.64], [0.7, 0.28, 0.56], [-0.35, 0.82, 0.5], [0.35, 0.8, 0.48]]) {
    b.add(U.box, '#c8a070', [x, y, 0], [s, s * 0.9, s * 0.9], [0, x * 0.3, 0]);
    b.add(U.box, '#d8c8a0', [x, y + s * 0.451, 0], [s * 0.15, 0.01, s * 0.92], [0, x * 0.3, 0]);
  }
  out.push({ geo: b.build(), depth: 0.7, h: 1.0 });

  b = new Builder();   // botte de bambous posée sur deux tréteaux
  for (const x of [-0.9, 0.9]) for (const dz of [-0.2, 0.2]) b.add(U.box, '#5a5a62', [x, 0.35, dz], [0.06, 0.7, 0.06], [dz, 0, 0]);
  for (let k = 0; k < 7; k++) b.add(U.cyl, k % 2 ? '#c8b070' : '#b8a060', [0, 0.75 + (k % 3) * 0.08, -0.15 + (k % 4) * 0.1], [0.06, 2.6, 0.06], [0, 0, Math.PI / 2]);
  b.add(U.box, '#d8202a', [0, 0.8, 0], [0.1, 0.3, 0.4]);
  out.push({ geo: b.build(), depth: 0.5, h: 1.0 });
  return out;
}

// ---------- Obstacle haut (à passer en roulade) : portique de bambou avec enseigne de chantier ----------
function signGate() {
  const b = new Builder();
  for (const x of [-1.25, 1.25]) {
    b.add(U.cyl, '#c8b070', [x, 1.5, 0], [0.06, 3.0, 0.06]);
    b.add(U.box, '#5a5a62', [x, 0.06, 0], [0.4, 0.12, 0.4]);
  }
  b.add(U.cyl, '#c8b070', [0, 2.8, 0], [0.06, 2.8, 0.06], [0, 0, Math.PI / 2]);
  b.add(U.box, '#f2c230', [0, 2.05, 0], [2.4, 1.2, 0.05]);
  for (let i = 0; i < 6; i++) b.add(U.box, i % 2 ? '#141414' : '#f2c230', [-1.0 + i * 0.4, 1.55, 0.03], [0.4, 0.18, 0.02]);
  b.add(U.box, '#141414', [0, 2.25, 0.03], [0.12, 0.4, 0.02]);
  b.add(U.box, '#141414', [0, 1.95, 0.03], [0.12, 0.1, 0.02]);
  for (const x of [-0.9, 0.9]) b.add(BALL, '#ff3a2a', [x, 2.7, 0.05], [0.07, 0.07, 0.07]);
  return b.build();
}
