import * as THREE from 'three';
import { Builder, U, vcMat, pick } from '../../geo.js';
import { TRAIN_HALF_W, TRAIN_TOP, RAMP_LEN } from '../../config.js';
import { loadPlants, addPlant, plant } from '../../plants.js';

await loadPlants('hongkong');

// Obstacles de Hong Kong : minibus (« public light bus » crème au toit rouge ou vert) garés en file, toit
// où l'on court ; taxis rouges et argent qui foncent vers le joueur (un seul à la fois) ; rampes de planches
// sur tréteaux de bambou ; barrières de chantier. Minibus et taxi sont des modèles de Poly Pizza
// (models/hongkong/LICENSE.txt) recolorés ; phares, feux et intérieur éclairé : matière lumineuse.

const W = TRAIN_HALF_W * 2;
const BALL = new THREE.SphereGeometry(1, 12, 8);
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const BUS_LEN = 7.0, BUS_GAP = 1.2;
const TAXI_LEN = 4.6, TAXI_TOP = 1.55;

// Modèle posé dans la boîte de l'obstacle : largeur `w` (carrosserie, rétroviseurs en plus), hauteur `h`,
// longueur `len`, avant en z = 0, arrière vers -z. Renvoie la matrice appliquée.
function place(b, key, { w, h, len, body }, paint) {
  const m = plant(key);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, bx0 = 1e9, bx1 = -1e9;
  for (let i = 0; i < m.n * 3; i++) {
    const x = m.pos[i * 3], z = m.pos[i * 3 + 2];
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    if (m.role[(i / 3) | 0] === body) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); }
  }
  const sx = w / (h * (bx1 - bx0)), sz = len / (h * (z1 - z0));
  const M = addPlant(b, key, [-(bx0 + bx1) / 2 * h * sx, 0, -z1 * h * sz], h, paint, { s: [sx, sz] });
  return M;
}

// Hauteur relative (0 = sol, 1 = toit) du centre du triangle i d'un modèle
const triY = (m, i) => (m.pos[i * 9 + 1] + m.pos[i * 9 + 4] + m.pos[i * 9 + 7]) / 3;

// Triangles des rôles `roles` du modèle, déplacés par M et légèrement décollés vers l'extérieur, en matière
// lumineuse (phares, feux arrière) : couleur color[rôle]
function glowRoles(g, key, M, color) {
  const m = plant(key), pos = [], col = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], n = new THREE.Vector3(), e = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < m.n; i++) {
    const want = color[m.role[i]];
    if (!want) continue;
    for (let k = 0; k < 3; k++) v[k].fromArray(m.pos, i * 9 + k * 3).applyMatrix4(M);
    n.subVectors(v[1], v[0]).cross(e.subVectors(v[2], v[0])).normalize().multiplyScalar(0.012);
    c.set(want);
    for (let k = 0; k < 3; k++) { pos.push(v[k].x + n.x, v[k].y + n.y, v[k].z + n.z); col.push(c.r, c.g, c.b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map(() => 0), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.parts.push(geo);
}

// ---------- Minibus (« public light bus » : modèle de jeremy, Poly Pizza, CC-BY ; avant vers +z) ----------
// Rôles du modèle : 0 carrosserie, 1 pneus et intérieur, 2 pare-chocs, 3 vitres et montants, 4 phares,
// 5 sièges, 6 feux arrière. Carrosserie crème, toit et bandeau au-dessus des vitres rouges ou verts.
function minibusGeo(roof) {
  const f = new Builder(), g = new Builder();
  const m = plant('h_minibus');
  const M = place(f, 'h_minibus', { w: W - 0.1, h: TRAIN_TOP, len: BUS_LEN, body: 0 }, (role, part, i) => {
    if (role === 0) return triY(m, i) > 0.86 ? roof : '#f2ecd8';
    if (role === 3) return '#3a4048';
    if (role === 5) return '#5a3a2e';
    if (role === 2) return '#9aa0a8';
    return null;
  });
  glowRoles(g, 'h_minibus', M, { 4: '#fff6d8', 6: '#ff2a2a' });
  // intérieur éclairé, vu par les vitres (sièges en silhouette devant) : cloison centrale et fond
  g.add(U.box, '#d8cfa8', [0, 1.75, -BUS_LEN / 2 - 0.2], [0.02, 0.9, BUS_LEN - 1.8]);
  g.add(U.box, '#b8ae88', [0, 1.75, -BUS_LEN + 0.35], [W - 0.4, 0.9, 0.02]);
  return { flat: f.build(), glow: g.build() };
}

// ---------- Taxi rouge (modèle de Quaternius, Poly Pizza, CC0 ; avant vers +z) ----------
// Rôles : 0 noir (pneus, joints), 1 gris (jantes, pare-chocs), 2 carrosserie, 3 vitres, 4 phares, 5 feux.
// Carrosserie rouge et toit argenté comme les taxis de Kowloon, enseigne « TAXI » lumineuse.
function taxiGeo() {
  const f = new Builder(), g = new Builder();
  const m = plant('h_taxi');
  const M = place(f, 'h_taxi', { w: 1.85, h: 1.5, len: TAXI_LEN, body: 2 }, (role, part, i) => {
    if (role === 2) return triY(m, i) > 0.68 ? '#d8dcdf' : '#d8202a';
    if (role === 3) return '#26303a';
    return null;
  });
  glowRoles(g, 'h_taxi', M, { 4: '#fff6d0', 5: '#ff2a2a' });
  return { flat: f.build(), glow: g.build() };
}

const meshes = (m) => [new THREE.Mesh(m.flat, vcMat), new THREE.Mesh(m.glow, GLOW)];

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
