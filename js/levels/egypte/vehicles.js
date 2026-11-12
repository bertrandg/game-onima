import * as THREE from 'three';
import { Builder, U, vcMat, pick } from '../../geo.js';
import { TRAIN_HALF_W, TRAIN_TOP, CAR_LEN, CAR_GAP, RAMP_LEN } from '../../config.js';
import { PAINT } from './textures.js';

// Obstacles de l'Égypte : convois de traîneaux chargés de blocs de pierre géants (arrêtés, on court sur
// les blocs), chars tirés par deux chevaux qui foncent vers le joueur (on saute par-dessus l'attelage),
// rampes de briques crues, jarres, paniers et banderoles. Les pièces arrondies (chevaux, roues, cocher)
// sont lissées : une matière à facettes et une matière lisse par véhicule.

const W = TRAIN_HALF_W * 2;
const BALL = new THREE.SphereGeometry(1, 14, 10);
const SMOOTH = new THREE.MeshLambertMaterial({ vertexColors: true });
const WOOD = '#8a6038', WOOD2 = '#5a3c22', ROPE = '#c8a868';

// ---------- Traîneau chargé d'un bloc (10 m, avant vers +z, dessus du bloc à TRAIN_TOP) ----------
const STONES = [
  { stone: '#ece0c4', joint: '#c8b896', mark: '#c0442c' },   // calcaire de Toura
  { stone: '#d0907a', joint: '#a86a58', mark: '#f4ecd8' },   // granit rose d'Assouan
  { stone: '#e2c494', joint: '#bc9c6c', mark: '#2a5aa8' },   // grès
];
function sledGeo(s) {
  const b = new Builder();
  const zc = -CAR_LEN / 2, L = CAR_LEN - 0.4, Y = 0.55;
  // patins recourbés à l'avant, traverses, rouleaux de bois
  for (const x of [-0.8, 0.8]) {
    b.add(U.box, WOOD2, [x, 0.22, zc], [0.24, 0.3, L]);
    b.add(U.box, WOOD2, [x, 0.42, zc + L / 2 + 0.2], [0.24, 0.3, 0.6], [-0.6, 0, 0]);
  }
  for (let i = 0; i < 7; i++) b.add(U.box, WOOD, [0, 0.43, zc - L / 2 + 0.6 + i * ((L - 1.2) / 6)], [W, 0.16, 0.3]);
  for (let i = 0; i < 4; i++) b.add(U.cyl, '#9a7a4a', [0, 0.12, zc - L / 2 + 1 + i * ((L - 2) / 3)], [0.12, W + 0.3, 0.12], [0, 0, Math.PI / 2]);
  // le bloc : faces dressées, lignes de taille, marques de carrier à l'ocre
  const H = TRAIN_TOP - Y;
  b.add(U.box, s.stone, [0, Y + H / 2, zc], [W - 0.1, H, L - 0.3]);
  b.add(U.box, s.joint, [0, TRAIN_TOP - 0.03, zc], [W - 0.06, 0.06, L - 0.26]);
  for (const sx of [-1, 1]) {
    for (let k = 1; k < 4; k++) b.add(U.box, s.joint, [sx * (W / 2 - 0.04), Y + k * (H / 4), zc], [0.02, 0.03, L - 0.35]);
    b.add(U.box, s.mark, [sx * (W / 2 - 0.03), Y + H * 0.55, zc + 1.5], [0.02, 0.5, 0.06]);
    b.add(U.box, s.mark, [sx * (W / 2 - 0.03), Y + H * 0.55, zc + 1.5], [0.02, 0.06, 0.6]);
    b.add(U.box, s.mark, [sx * (W / 2 - 0.03), Y + H * 0.4, zc - 2.2], [0.02, 0.34, 0.34], [0.785, 0, 0]);
  }
  // cordages qui serrent le bloc sur le traîneau
  for (const dz of [-2.6, 0, 2.6]) {
    b.add(U.box, ROPE, [0, TRAIN_TOP + 0.01, zc + dz], [W + 0.02, 0.05, 0.14]);
    for (const sx of [-1, 1]) b.add(U.box, ROPE, [sx * (W / 2 - 0.01), Y + H / 2, zc + dz], [0.05, H + 0.05, 0.14]);
  }
  // avant et arrière : traverse de bois et anneaux de traction
  b.add(U.box, s.joint, [0, Y + H / 2, zc + (L - 0.3) / 2 + 0.01], [W - 0.2, H - 0.2, 0.02]);
  b.add(U.box, WOOD2, [0, 0.6, zc + L / 2 + 0.05], [W, 0.2, 0.2]);
  for (const sx of [-0.6, 0.6]) b.add(U.cyl, ROPE, [sx, 0.62, zc + L / 2 + 0.25], [0.12, 0.04, 0.12], [Math.PI / 2, 0, 0]);
  return b.build();
}

// ---------- Char et attelage (avant vers +z) ----------
const CHARIOT_LEN = 2.6, CHARIOT_TOP = 1.45;
function chariotGeo() {
  const flat = new Builder(), smooth = new Builder();
  const zc = -CHARIOT_LEN / 2;
  // caisse en arc, plaquée d'or et de cuir rouge
  flat.add(U.box, WOOD, [0, 0.72, zc], [1.5, 0.08, 1.2]);
  for (const sx of [-1, 1]) {
    flat.add(U.box, PAINT.red, [sx * 0.72, 1.05, zc], [0.06, 0.7, 1.1]);
    flat.add(U.box, PAINT.gold, [sx * 0.75, 1.42, zc], [0.06, 0.06, 1.1]);
  }
  flat.add(U.box, PAINT.red, [0, 1.05, zc + 0.58], [1.5, 0.7, 0.06]);
  flat.add(U.box, PAINT.gold, [0, CHARIOT_TOP - 0.03, zc + 0.58], [1.52, 0.08, 0.08]);
  for (let i = 0; i < 5; i++) flat.add(U.box, i % 2 ? PAINT.blue : PAINT.gold, [-0.6 + i * 0.3, 1.05, zc + 0.62], [0.2, 0.2, 0.02], [0, 0, 0.785]);
  // grandes roues à six rayons, essieu, timon
  for (const sx of [-1, 1]) {
    smooth.add(new THREE.TorusGeometry(0.62, 0.07, 8, 24), '#5a3c22', [sx * 0.95, 0.66, zc - 0.1], [1, 1, 1], [0, Math.PI / 2, 0]);
    smooth.add(new THREE.TorusGeometry(0.6, 0.03, 6, 24), PAINT.gold, [sx * 1.0, 0.66, zc - 0.1], [1, 1, 1], [0, Math.PI / 2, 0]);
    for (let k = 0; k < 6; k++) flat.add(U.box, WOOD, [sx * 0.95, 0.66, zc - 0.1], [0.04, 1.18, 0.05], [(k * Math.PI) / 3, 0, 0]);
    smooth.add(BALL, PAINT.gold, [sx * 1.0, 0.66, zc - 0.1], [0.1, 0.1, 0.1]);
  }
  flat.add(U.cyl, WOOD2, [0, 0.66, zc - 0.1], [0.05, 2.0, 0.05], [0, 0, Math.PI / 2]);
  flat.add(U.box, WOOD2, [0, 0.9, 0.9], [0.08, 0.08, 2.4], [0.15, 0, 0]);
  // cocher kawaii : couronne bleue khépresh, pagne blanc, rênes
  const y = 0.76;
  smooth.add(BALL, '#f4ecd8', [0, y + 0.45, zc - 0.1], [0.24, 0.32, 0.2]);
  smooth.add(BALL, '#c87a4a', [0, y + 0.9, zc - 0.1], [0.22, 0.24, 0.2]);
  smooth.add(BALL, '#c87a4a', [0, y + 1.25, zc - 0.08], [0.24, 0.25, 0.24]);
  smooth.add(BALL, PAINT.blue, [0, y + 1.42, zc - 0.15], [0.26, 0.24, 0.27]);
  smooth.add(BALL, PAINT.gold, [0, y + 1.42, zc + 0.08], [0.05, 0.05, 0.05]);
  for (const sx of [-1, 1]) {
    smooth.add(BALL, '#1a1410', [sx * 0.09, y + 1.27, zc + 0.12], [0.04, 0.06, 0.03]);
    smooth.add(BALL, '#f09a8a', [sx * 0.15, y + 1.18, zc + 0.1], [0.04, 0.03, 0.02]);
    flat.add(U.box, '#3a2a1a', [sx * 0.2, y + 0.95, zc + 1.3], [0.02, 0.02, 2.6], [0.12, 0, 0]);
  }
  smooth.add(BALL, PAINT.turq, [0, y + 1.02, zc - 0.04], [0.25, 0.08, 0.22]);
  return { flat: flat.build(), smooth: smooth.build() };
}

// deux chevaux harnachés devant le char (de z = 0 à z = +3.6), plumets et couvertures brodées
function horsesGeo() {
  const flat = new Builder(), smooth = new Builder();
  const coats = [['#f2ece2', '#d8cfc0'], ['#7a4a2a', '#4a2a18']];
  for (const sx of [-1, 1]) {
    const [c1, c2] = coats[sx < 0 ? 0 : 1];
    const x = sx * 0.45, z = 2.2;
    smooth.add(BALL, c1, [x, 1.25, z], [0.32, 0.38, 0.85]);
    smooth.add(U.cyl, c1, [x, 1.6, z + 0.85], [0.13, 0.75, 0.16], [-0.7, 0, 0]);
    smooth.add(BALL, c1, [x, 1.95, z + 1.2], [0.13, 0.15, 0.3], [0.5, 0, 0]);
    smooth.add(BALL, c2, [x, 1.86, z + 1.45], [0.1, 0.1, 0.12]);
    for (const s2 of [-1, 1]) {
      smooth.add(BALL, '#1a1410', [x + s2 * 0.11, 2.0, z + 1.28], [0.03, 0.04, 0.03]);
      flat.add(U.cone4, c1, [x + s2 * 0.06, 2.12, z + 1.05], [0.04, 0.12, 0.04]);
    }
    flat.add(U.box, c2, [x, 1.75, z + 0.75], [0.06, 0.55, 0.12], [-0.7, 0, 0]);
    smooth.add(U.cyl, c2, [x, 1.2, z - 0.9], [0.06, 0.5, 0.06], [0.5, 0, 0]);
    for (const [dx, dz] of [[-0.15, 0.5], [0.15, 0.5], [-0.15, -0.5], [0.15, -0.5]]) {
      smooth.add(U.cyl, c1, [x + dx, 0.5, z + dz], [0.06, 1.0, 0.06]);
      smooth.add(BALL, c1, [x + dx, 0.82, z + dz], [0.09, 0.2, 0.1]);
      flat.add(U.cyl6, '#2a2522', [x + dx, 0.04, z + dz], [0.075, 0.08, 0.075]);
    }
    // couverture brodée, collier, plumet d'autruche coloré
    smooth.add(BALL, sx < 0 ? PAINT.red : PAINT.blue, [x, 1.5, z + 0.05], [0.34, 0.14, 0.6]);
    for (let i = 0; i < 5; i++) flat.add(U.box, PAINT.gold, [x + sx * 0.33, 1.38, z - 0.4 + i * 0.22], [0.02, 0.12, 0.1]);
    smooth.add(BALL, PAINT.gold, [x, 1.58, z + 0.62], [0.2, 0.24, 0.12], [-0.6, 0, 0]);
    for (let i = 0; i < 3; i++) smooth.add(BALL, [PAINT.red, '#f4ecd8', PAINT.blue][i], [x, 2.28 + i * 0.12, z + 1.08 - i * 0.04], [0.06, 0.1, 0.05]);
  }
  for (const sx of [-1, 1]) flat.add(U.box, '#3a2a1c', [sx * 0.9, 1.1, 1.2], [0.05, 0.05, 2.4]);
  flat.add(U.box, WOOD2, [0, 1.62, 2.82], [1.3, 0.08, 0.1]);   // joug
  return { flat: flat.build(), smooth: smooth.build() };
}

export function egyptVehicleKit() {
  const sleds = STONES.map(sledGeo);
  const chariot = chariotGeo(), team = horsesGeo();

  function buildSleds(cars) {
    const g = new THREE.Group();
    const geo = pick(sleds);
    for (let i = 0; i < cars; i++) {
      const m = new THREE.Mesh(geo, vcMat);
      m.position.z = -i * (CAR_LEN + CAR_GAP);
      g.add(m);
    }
    return g;
  }
  function buildChariot() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(chariot.flat, vcMat), new THREE.Mesh(chariot.smooth, SMOOTH));
    g.add(new THREE.Mesh(team.flat, vcMat), new THREE.Mesh(team.smooth, SMOOTH));
    g.userData.len = CHARIOT_LEN;
    g.userData.top = CHARIOT_TOP;
    return g;
  }

  return {
    rampGeo: rampGeo(),
    low: lowBarriers(),
    highGeo: bannerGate(),
    // chevaux devant le char qui arrive : obstacle bas à sauter (comme les fiacres de Paris)
    hitch: { len: 3.6, h: 1.75, halfW: 0.95 },
    buildVehicle: (cars, moving) => (moving ? buildChariot() : buildSleds(cars)),
    warmup() {
      const g = new THREE.Group();
      sleds.forEach((s, i) => { const m = new THREE.Mesh(s, vcMat); m.position.x = i * 3; g.add(m); });
      g.add(buildChariot());
      return g;
    },
  };
}

// ---------- Rampe : remblai de briques crues et poutres, comme sur les chantiers des pyramides ----------
function rampGeo() {
  const b = new Builder();
  const L = Math.hypot(RAMP_LEN, TRAIN_TOP), a = Math.atan2(TRAIN_TOP, RAMP_LEN);
  b.add(U.box, '#b8946a', [0, TRAIN_TOP / 2 - 0.05, RAMP_LEN / 2], [2.0, 0.14, L], [a, 0, 0]);
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    b.add(U.box, WOOD2, [0, TRAIN_TOP * (1 - t) + 0.04, RAMP_LEN * t], [2.02, 0.06, 0.12], [a, 0, 0]);
  }
  // flancs en briques crues, en gradins
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7, h = TRAIN_TOP * (1 - t);
      b.add(U.box, i % 2 ? '#a8845a' : '#9a7650', [sx * 0.95, h / 2, RAMP_LEN * t], [0.16, h, RAMP_LEN / 7]);
    }
  }
  b.add(U.box, '#d8b884', [0, 0.04, RAMP_LEN + 0.4], [2.4, 0.08, 0.8]);   // sable répandu au pied
  return b.build();
}

// ---------- Obstacles bas (à sauter) ----------
function lowBarriers() {
  const out = [];
  let b = new Builder();   // jarres sur un lit de paille
  b.add(U.box, '#e2c27a', [0, 0.06, 0], [2.3, 0.12, 0.9]);
  for (const [x, s, c] of [[-0.75, 1.0, '#c46a3a'], [0, 1.1, '#d88a4a'], [0.75, 0.95, '#b8582e']]) {
    b.add(BALL, c, [x, 0.5 * s, 0], [0.34 * s, 0.42 * s, 0.34 * s]);
    b.add(U.cyl, c, [x, 0.92 * s, 0], [0.12 * s, 0.16 * s, 0.12 * s]);
    b.add(U.cyl, PAINT.blue, [x, 0.55 * s, 0], [0.35 * s, 0.06, 0.35 * s]);
    b.add(U.cyl, '#f4ecd8', [x, 0.64 * s, 0], [0.33 * s, 0.03, 0.33 * s]);
  }
  out.push({ geo: b.build(), depth: 0.8, h: 1.0 });

  b = new Builder();   // bloc de grès tombé, couvert de hiéroglyphes
  b.add(U.box, '#e2c494', [0, 0.45, 0], [2.3, 0.9, 0.8], [0, 0.05, 0.04]);
  b.add(U.box, '#c8a474', [0, 0.92, 0], [2.32, 0.06, 0.82], [0, 0.05, 0.04]);
  const glyphCols = [PAINT.blue, PAINT.red, PAINT.green, PAINT.gold];
  for (let i = 0; i < 8; i++) b.add(U.box, glyphCols[i % 4], [-0.95 + i * 0.27, 0.45 + (i % 2) * 0.15, 0.42], [0.16, 0.16, 0.02], [0, 0, i * 0.4]);
  for (let i = 0; i < 6; i++) b.add(U.box, '#d8b884', [-1.0 + i * 0.4, 0.06, 0.5], [0.3, 0.1, 0.25]);
  out.push({ geo: b.build(), depth: 0.8, h: 1.0 });

  b = new Builder();   // paniers de roseau débordant de fruits
  for (const x of [-0.7, 0.7]) {
    b.add(U.cyl, '#c8a058', [x, 0.32, 0], [0.48, 0.64, 0.48]);
    for (let k = 0; k < 4; k++) b.add(U.cyl, '#a8803c', [x, 0.12 + k * 0.16, 0], [0.49, 0.03, 0.49]);
    for (let i = 0; i < 7; i++) b.add(BALL, ['#d8402a', '#7a2a6a', '#e8b838', '#6a9a3a'][i % 4], [x + Math.cos(i) * 0.28, 0.72 + (i % 3) * 0.06, Math.sin(i) * 0.28], [0.14, 0.14, 0.14]);
  }
  b.add(U.box, '#c8a058', [0, 0.2, 0], [0.5, 0.4, 0.5], [0, 0.4, 0]);
  out.push({ geo: b.build(), depth: 0.9, h: 1.0 });

  b = new Builder();   // caisses de rouleaux de papyrus
  for (const x of [-0.6, 0.6]) {
    b.add(U.box, WOOD, [x, 0.4, 0], [1.1, 0.8, 0.8]);
    for (const dy of [0.1, 0.7]) b.add(U.box, WOOD2, [x, dy, 0.41], [1.12, 0.08, 0.02]);
    for (let i = 0; i < 4; i++) b.add(U.cyl, '#f2e2b8', [x - 0.35 + i * 0.23, 0.9, 0], [0.09, 0.7, 0.09], [Math.PI / 2, 0, 0]);
  }
  out.push({ geo: b.build(), depth: 0.8, h: 1.0 });
  return out;
}

// ---------- Obstacle haut (à passer en roulade) : banderole peinte entre deux mâts ----------
function bannerGate() {
  const b = new Builder();
  for (const x of [-1.25, 1.25]) {
    b.add(U.cyl, WOOD, [x, 1.5, 0], [0.08, 3.0, 0.08]);
    b.add(U.cone8, PAINT.gold, [x, 3.15, 0], [0.12, 0.3, 0.12]);
    b.add(U.box, '#8a7a5a', [x, 0.08, 0], [0.4, 0.16, 0.4]);
  }
  b.add(U.box, WOOD2, [0, 2.75, 0], [2.7, 0.1, 0.1]);
  // toile rayée et disque solaire
  for (let i = 0; i < 9; i++) b.add(U.box, i % 2 ? '#f4ecd8' : PAINT.blue, [-1.1 + i * 0.275, 2.1, 0], [0.275, 1.2, 0.04]);
  b.add(U.cyl, PAINT.red, [0, 2.1, 0.03], [0.32, 0.02, 0.32], [Math.PI / 2, 0, 0]);
  b.add(U.cyl, PAINT.gold, [0, 2.1, 0.04], [0.36, 0.01, 0.36], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) b.add(U.box, PAINT.gold, [s * 0.65, 2.15, 0.04], [0.6, 0.12, 0.01], [0, 0, s * 0.15]);
  for (let i = 0; i < 10; i++) b.add(U.cone4, [PAINT.red, PAINT.gold][i % 2], [-1.1 + i * 0.245, 1.42, 0], [0.1, 0.2, 0.03], [Math.PI, 0, 0]);
  return b.build();
}
