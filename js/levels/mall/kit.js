import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, U, vcMat, pick } from '../../geo.js';
import { RAMP_LEN } from '../../config.js';

// Obstacles du centre commercial : îlots-vitrines (on court dessus, on y monte par un petit escalier de
// podium), petit train du centre qui roule vers l'héroïne, files de caddies, panneaux « sol glissant »,
// bancs fleuris, chariots de colis ; et la banderole des soldes à passer en roulade.

const UNIT = 4.6, GAP = 0.6;           // un îlot (ou un wagon) et l'écart entre deux
export const KIOSK_TOP = 1.7;          // dessus des îlots : on y court
const TRAIN_TOP = 1.75;                // toit du petit train
const BALL = new THREE.SphereGeometry(1, 12, 8);
const SMOOTH = new THREE.MeshLambertMaterial({ vertexColors: true });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const carLen = (c) => c * UNIT + (c - 1) * GAP;

// ---------- Îlots-vitrines ----------
// un îlot de UNIT m (de z = 0 à -UNIT) : socle blanc et liseré de couleur, vitrine éclairée sous un
// plateau de verre, enseigne au bout côté joueur
const KIOSKS = [
  { band: '#ff5aa8', items: ['#ffd23f', '#ffffff', '#5ac8fa', '#ff8a3a'], shape: 'sph' },   // bijoux
  { band: '#3a6ad8', items: ['#1a1a1e', '#e8302a', '#ffffff', '#7ae07a'], shape: 'box' },   // coques de téléphone
  { band: '#2ab87a', items: ['#ffb0c8', '#fff0a0', '#a8e8ff', '#c8ffc0'], shape: 'sph' },   // macarons
  { band: '#f2a640', items: ['#1a1a1e', '#7a4a2a', '#e8302a', '#3a6ad8'], shape: 'box' },   // lunettes de soleil
];
function kioskGeos(k) {
  const f = new Builder(), g = new Builder();
  const T = KIOSK_TOP;
  f.add(U.box, '#f6f4f0', [0, 0.55, -UNIT / 2], [2.0, 1.1, UNIT]);
  f.add(U.box, k.band, [0, 1.0, -UNIT / 2], [2.04, 0.12, UNIT + 0.04]);
  f.add(U.box, '#d8d4cc', [0, 0.05, -UNIT / 2], [2.06, 0.1, UNIT + 0.06]);
  // vitrine : montants chromés, fond lumineux, produits
  for (const x of [-0.96, 0.96]) for (const z of [-0.1, -UNIT / 2, -UNIT + 0.1]) f.add(U.box, '#c8ccd4', [x, (1.1 + T) / 2, z], [0.06, T - 1.1, 0.06]);
  g.add(U.box, '#f8f4ff', [0, 1.12, -UNIT / 2], [1.86, 0.02, UNIT - 0.3]);
  for (let i = 0; i < 12; i++) {
    const x = -0.6 + (i % 3) * 0.6, z = -0.5 - Math.floor(i / 3) * 1.1, c = k.items[i % k.items.length];
    if (k.shape === 'sph') f.add(U.sph0, c, [x, 1.22, z], [0.1, 0.08, 0.1]);
    else f.add(U.box, c, [x, 1.2, z], [0.18, 0.06, 0.32]);
  }
  f.add(U.box, '#c8ccd4', [0, T - 0.02, -UNIT / 2], [2.0, 0.04, UNIT]);        // plateau (on court dessus)
  f.add(U.box, '#e8f6ff', [0, T - 0.035, -UNIT / 2], [1.8, 0.01, UNIT - 0.2]);
  // enseigne au bout et petites lumières
  f.add(U.box, k.band, [0, 0.62, 0.02], [1.6, 0.4, 0.04]);
  for (let i = 0; i < 5; i++) g.add(U.box, '#ffffff', [-0.6 + i * 0.3, 0.62, 0.045], [0.16, 0.16, 0.01]);
  return { flat: f.build(), glow: g.build() };
}

// petit escalier de podium jusqu'au dessus de l'îlot (pied en z = RAMP_LEN, sommet en z = 0)
function rampGeo() {
  const b = new Builder();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const h = KIOSK_TOP * (n - i) / n, z = RAMP_LEN * (i + 0.5) / n;
    b.add(U.box, i % 2 ? '#e8e4dc' : '#f4f0ea', [0, h / 2, z], [1.9, h, RAMP_LEN / n + 0.01]);
    b.add(U.box, '#ff5aa8', [0, h + 0.005, z + RAMP_LEN / n / 2 - 0.05], [1.9, 0.012, 0.08]);   // nez de marche
  }
  for (const x of [-1.0, 1.0]) b.add(U.box, '#c8ccd4', [x, KIOSK_TOP / 2 + 0.45, RAMP_LEN / 2], [0.06, 0.06, Math.hypot(RAMP_LEN, KIOSK_TOP)], [Math.atan2(KIOSK_TOP, RAMP_LEN), 0, 0]);
  return b.build();
}

// ---------- Petit train du centre (roule vers le joueur, locomotive devant) ----------
function locoGeos() {
  const f = new Builder(), s = new Builder(), g = new Builder();
  f.add(U.box, '#e8302a', [0, 0.75, -UNIT / 2 - 0.4], [1.7, 1.1, UNIT - 1.6]);
  f.add(U.box, '#ffd23f', [0, 0.25, -UNIT / 2], [1.8, 0.3, UNIT - 0.2]);
  s.add(U.cyl, '#e8302a', [0, 0.95, -0.9], [0.62, 1.4, 0.62], [Math.PI / 2, 0, 0]);   // chaudière
  s.add(U.cyl, '#ffd23f', [0, 0.95, -0.18], [0.64, 0.06, 0.64], [Math.PI / 2, 0, 0]);
  s.add(U.cyl, '#1a1a1e', [0, 1.75, -0.6], [0.16, 0.5, 0.16]);                        // cheminée
  s.add(U.cyl, '#ffd23f', [0, 2.02, -0.6], [0.22, 0.08, 0.22]);
  f.add(U.box, '#3a6ad8', [0, TRAIN_TOP - 0.06, -UNIT / 2 - 0.8], [1.9, 0.12, 2.4]);   // toit de la cabine
  for (const x of [-0.85, 0.85]) f.add(U.box, '#ffd23f', [x, 1.45, -UNIT / 2 - 0.8], [0.08, 0.55, 2.2]);
  // visage kawaii à l'avant
  for (const x of [-0.25, 0.25]) {
    s.add(BALL, '#ffffff', [x, 1.05, -0.12], [0.14, 0.16, 0.06]);
    s.add(BALL, '#1a1010', [x, 1.03, -0.07], [0.08, 0.1, 0.04]);
    g.add(BALL, '#ffffff', [x - 0.03, 1.08, -0.04], [0.025, 0.025, 0.01]);
  }
  s.add(BALL, '#ff8ab0', [-0.4, 0.85, -0.14], [0.08, 0.05, 0.03]);
  s.add(BALL, '#ff8ab0', [0.4, 0.85, -0.14], [0.08, 0.05, 0.03]);
  f.add(U.box, '#1a1010', [0, 0.78, -0.13], [0.2, 0.04, 0.02]);
  g.add(BALL, '#fff4b0', [0, 0.42, 0.02], [0.14, 0.14, 0.05]);                         // phare
  for (const z of [-0.8, -2.2, -3.6]) for (const x of [-0.9, 0.9]) s.add(U.cyl, '#1a1a1e', [x, 0.28, z], [0.28, 0.12, 0.28], [0, 0, Math.PI / 2]);
  return { flat: f.build(), smooth: s.build(), glow: g.build() };
}
function wagonGeos(c) {
  const f = new Builder(), s = new Builder();
  f.add(U.box, c, [0, 0.55, -UNIT / 2], [1.7, 0.6, UNIT - 0.4]);
  f.add(U.box, '#ffd23f', [0, 0.22, -UNIT / 2], [1.8, 0.24, UNIT - 0.2]);
  for (const z of [-1.3, -3.0]) f.add(U.box, '#f4f0e8', [0, 0.95, z], [1.4, 0.2, 0.8]);   // banquettes
  for (const x of [-0.8, 0.8]) for (const z of [-0.35, -UNIT + 0.35]) f.add(U.box, '#ffffff', [x, 1.25, z], [0.08, 1.0, 0.08]);
  f.add(U.box, '#ffffff', [0, TRAIN_TOP - 0.05, -UNIT / 2], [1.9, 0.1, UNIT - 0.3]);       // auvent rayé
  for (let i = 0; i < 6; i++) f.add(U.box, c, [-0.79 + i * 0.316, TRAIN_TOP - 0.02, -UNIT / 2], [0.16, 0.06, UNIT - 0.28]);
  for (const z of [-0.8, -3.8]) for (const x of [-0.9, 0.9]) s.add(U.cyl, '#1a1a1e', [x, 0.22, z], [0.22, 0.1, 0.22], [0, 0, Math.PI / 2]);
  return { flat: f.build(), smooth: s.build() };
}

// ---------- Barrières basses (à sauter) et banderole (à passer dessous) ----------
function cartsGeo() {   // file de trois caddies emboîtés, en travers de la voie
  const b = new Builder();
  for (const x of [-0.75, 0, 0.75]) {
    for (const y of [0.45, 0.9]) b.add(U.box, '#c8ccd4', [x, y, 0], [0.62, 0.03, 0.9]);
    for (const sx of [-0.3, 0.3]) b.add(U.box, '#c8ccd4', [x + sx, 0.68, 0], [0.03, 0.46, 0.9]);
    for (let k = 0; k < 5; k++) b.add(U.box, '#c8ccd4', [x, 0.68, -0.4 + k * 0.2], [0.62, 0.46, 0.02]);
    b.add(U.box, '#e8302a', [x, 1.0, 0.48], [0.64, 0.06, 0.06]);   // poignée
    for (const sx of [-0.25, 0.25]) for (const z of [-0.38, 0.38]) b.add(U.cyl, '#1a1a1e', [x + sx, 0.06, z], [0.06, 0.04, 0.06], [0, 0, Math.PI / 2]);
    for (const sx of [-0.25, 0.25]) b.add(U.box, '#9aa0a8', [x + sx, 0.25, 0], [0.03, 0.4, 0.03]);
  }
  return b.build();
}
function wetFloorGeo() {   // panneaux « sol glissant », seau et serpillière, flaque
  const b = new Builder();
  for (const x of [-0.7, 0.7]) {
    for (const d of [-1, 1]) b.add(U.box, '#ffd23f', [x, 0.5, d * 0.16], [0.5, 1.0, 0.03], [d * 0.32, 0, 0]);
    b.add(U.box, '#1a1a1e', [x, 0.62, 0.32], [0.3, 0.06, 0.01], [0.32, 0, 0]);
    b.add(U.cone4, '#1a1a1e', [x, 0.45, 0.3], [0.1, 0.14, 0.01], [0.32, Math.PI / 4, 0]);
  }
  b.add(U.cyl, '#3a6ad8', [0, 0.2, 0], [0.22, 0.4, 0.22]);
  b.add(U.cyl6, '#c8a878', [0.05, 0.75, 0], [0.025, 1.2, 0.025], [0, 0, 0.2]);
  b.add(U.box, '#8ad0ff', [0, 0.004, 0.3], [2.0, 0.008, 0.6]);
  return b.build();
}
function benchGeo() {   // banc de la galerie et ses deux bacs de fleurs
  const b = new Builder();
  b.add(U.box, '#b08a5a', [0, 0.48, 0], [1.2, 0.08, 0.5]);
  b.add(U.box, '#b08a5a', [0, 0.78, -0.2], [1.2, 0.3, 0.06]);
  for (const x of [-0.5, 0.5]) b.add(U.box, '#4a4a52', [x, 0.24, 0], [0.08, 0.48, 0.45]);
  for (const x of [-0.95, 0.95]) {
    b.add(U.box, '#f4f0e8', [x, 0.32, 0], [0.5, 0.64, 0.5]);
    b.add(U.sph, '#3a8a3a', [x, 0.8, 0], [0.3, 0.22, 0.3]);
    for (let k = 0; k < 4; k++) b.add(U.sph0, ['#ff5a8a', '#ffd23f', '#ffffff', '#b07aff'][k], [x + Math.cos(k * 1.6) * 0.18, 0.98, Math.sin(k * 1.6) * 0.18], [0.06, 0.06, 0.06]);
  }
  return b.build();
}
function parcelsGeo() {   // chariot de livraison chargé de colis
  const b = new Builder();
  b.add(U.box, '#2a6ad8', [0, 0.12, 0], [2.0, 0.08, 0.8]);
  for (const x of [-0.85, 0.85]) for (const z of [-0.32, 0.32]) b.add(U.cyl, '#1a1a1e', [x, 0.06, z], [0.06, 0.05, 0.06], [0, 0, Math.PI / 2]);
  const boxes = [[-0.55, 0.37, 0.8, 0.42], [0.35, 0.33, 0.9, 0.34], [-0.4, 0.72, 0.6, 0.3], [0.4, 0.68, 0.6, 0.36]];
  for (const [x, y, w, h] of boxes) {
    b.add(U.box, '#c8945a', [x, y, 0], [w, h, 0.62]);
    b.add(U.box, '#e8d4a8', [x, y, 0.312], [0.12, h, 0.01]);   // scotch
  }
  b.add(U.box, '#2a6ad8', [0.98, 0.6, 0], [0.04, 1.0, 0.7]);
  return b.build();
}

// lettres en petits carrés (police de 3 × 5) pour la banderole
const FONT = {
  S: ['111', '100', '111', '001', '111'], O: ['111', '101', '101', '101', '111'], L: ['100', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], '-': ['000', '000', '111', '000', '000'],
  5: ['111', '100', '111', '001', '111'], 0: ['111', '101', '101', '101', '111'], '%': ['101', '001', '010', '100', '101'],
};
function highGeo() {   // banderole « SOLDES -50% » entre deux poteaux : roulade !
  const b = new Builder();
  for (const x of [-1.2, 1.2]) {
    b.add(U.cyl6, '#c8ccd4', [x, 1.45, 0], [0.05, 2.9, 0.05]);
    b.add(U.cyl, '#3a3a40', [x, 0.04, 0], [0.22, 0.08, 0.22]);
    b.add(U.sph0, '#e8302a', [x, 2.95, 0], [0.08, 0.08, 0.08]);
  }
  b.add(U.box, '#e8302a', [0, 2.05, 0], [2.3, 0.95, 0.04]);
  for (let k = 0; k < 12; k++) b.add(U.cone4, k % 2 ? '#ffd23f' : '#ffffff', [-1.05 + k * 0.19, 1.52, 0], [0.09, 0.12, 0.02], [Math.PI, Math.PI / 4, 0]);   // fanions
  const txt = 'SOLDES-50%';
  const px = 0.055;
  let x0 = -(txt.length * 4 - 1) * px / 2;
  for (const ch of txt) {
    const g = FONT[ch];
    g.forEach((row, r) => [...row].forEach((v, c) => { if (v === '1') for (const z of [-0.025, 0.025]) b.add(U.box, '#ffffff', [x0 + c * px, 2.2 - r * px, z], [px * 0.92, px * 0.92, 0.012]); }));
    x0 += 4 * px;
  }
  return b.build();
}

// un groupe de maillages (facettes, lisse, lumineux)
function group(parts) {
  const g = new THREE.Group();
  if (parts.flat) g.add(new THREE.Mesh(parts.flat, vcMat));
  if (parts.smooth) g.add(new THREE.Mesh(parts.smooth, SMOOTH));
  if (parts.glow) g.add(new THREE.Mesh(parts.glow, GLOW));
  return g;
}

export function mallObstacleKit() {
  const kiosks = KIOSKS.map(kioskGeos);
  const loco = locoGeos();
  const wagons = ['#5ac8fa', '#7ae07a', '#b07aff', '#ff8ab0'].map(wagonGeos);
  // un véhicule = ses éléments fusionnés par matière (géométries mises en cache par composition) :
  // trois appels de dessin au plus, quel que soit le nombre d'îlots ou de wagons
  const cache = {};
  const composed = (parts, key) => {
    if (cache[key]) return cache[key];
    const out = {};
    for (const k of ['flat', 'smooth', 'glow']) {
      const geos = parts.map((p, i) => p[k] && p[k].clone().translate(0, 0, -i * (UNIT + GAP))).filter(Boolean);
      if (geos.length) out[k] = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
    }
    return (cache[key] = out);
  };
  // toutes les compositions sont préparées d'avance (pas de nouvelle géométrie pendant la course) : un
  // convoi d'îlots est d'un seul modèle, le petit train a sa locomotive puis ses wagons
  for (let cars = 1; cars <= 3; cars++) {
    for (let k = 0; k < kiosks.length; k++) composed(new Array(cars).fill(kiosks[k]), 'k' + k + ':' + cars);
    composed([loco, ...wagons.slice(0, cars - 1)], 't' + cars);
  }
  const buildVehicle = (cars, moving) => {
    const k = (Math.random() * kiosks.length) | 0;
    const g = group(moving ? composed(null, 't' + cars) : composed(null, 'k' + k + ':' + cars));
    g.userData.len = carLen(cars);
    g.userData.top = moving ? TRAIN_TOP : KIOSK_TOP;
    return g;
  };
  return {
    rampGeo: rampGeo(),
    rampLen: RAMP_LEN,
    carLen,
    low: [
      { geo: cartsGeo(), depth: 0.9, h: 1.0 },
      { geo: wetFloorGeo(), depth: 0.6, h: 1.0 },
      { geo: benchGeo(), depth: 0.5, h: 1.0 },
      { geo: parcelsGeo(), depth: 0.8, h: 1.0 },
    ],
    highGeo: highGeo(),
    hitch: null,
    buildVehicle,
    // toutes les compositions, pour envoyer leurs géométries à la carte graphique dès le chargement
    warmup() {
      const g = new THREE.Group();
      Object.values(cache).forEach((parts, i) => { const m = group(parts); m.position.x = (i % 6) * 2.5; m.position.z = -Math.floor(i / 6) * 16; g.add(m); });
      return g;
    },
  };
}
