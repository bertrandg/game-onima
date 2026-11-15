import * as THREE from 'three';
import { Builder, U, pick } from '../../geo.js';
import { addPlant } from '../../plants.js';
import { bendMaterial } from './bend.js';
import { labelTex } from './textures.js';

// Matières du niveau : toutes déformées par la pente et les virages (voir bend.js)
export const flatMat = bendMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
export const smoothMat = bendMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }));
export const glowMat = bendMaterial(new THREE.MeshBasicMaterial({ vertexColors: true }));
const texMat = (t) => bendMaterial(new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));

export const SNOW = '#f4f8fd';
export const SNOW_SHADE = '#d6e2f2';

// ---------- Neige modelée : tremplins et bosses ----------
// Grille de la surface : profil(t) le long de la pente (t = 0 au pied, 1 au bout), épaules arrondies sur
// les côtés. Le maillage va de z = 0 (pied, côté joueur) à z = -L.
function snowSurface(W, L, nx, nz, profile, color, { back = 0, dye = null } = {}) {
  const pos = [], col = [], idx = [];
  const cA = new THREE.Color(color), cB = new THREE.Color(SNOW_SHADE), cD = dye && new THREE.Color(dye), c = new THREE.Color();
  const rows = [];
  for (let j = 0; j <= nz; j++) rows.push({ t: j / nz, z: -(j / nz) * L });
  if (back) rows.push({ t: 1, z: -L - back, drop: true });
  rows.forEach((r, j) => {
    for (let i = 0; i <= nx; i++) {
      const s = i / nx * 2 - 1;                       // -1 … 1 en travers
      const shoulder = Math.min(1, (1 - Math.abs(s)) / 0.28);
      const sh = Math.sin((shoulder * Math.PI) / 2);
      const h = r.drop ? 0 : profile(r.t) * sh;
      pos.push(s * (W / 2 + (1 - sh) * 0.35), h, r.z);
      // flancs et bas plus bleutés, liseré de teinture bleue au bord du tremplin
      // faces qui descendent (côté aval, à l'ombre) plus bleutées : le relief se lit sur la neige
      const fall = r.drop ? 0.6 : Math.max(0, profile(Math.max(0, r.t - 0.04)) - profile(Math.min(1, r.t + 0.04))) * 5;
      c.copy(cA).lerp(cB, Math.min(1, (1 - sh) * 0.7 + fall));
      if (cD && !r.drop && r.t > 0.94 && sh > 0.6) c.copy(cD);
      col.push(c.r, c.g, c.b);
    }
  });
  const w = nx + 1;
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i, b = a + 1, d = a + w, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  g.dispose();
  return ng;
}

export const KICK_H = 1.1;
export const kickLen = (speed) => 6 + speed * 0.12;
export const kickProfile = (t) => KICK_H * Math.pow(t, 1.7);
// tremplin d'une voie : surface creusée, liseré bleu, piquets orange de part et d'autre du bord
export function kickerMesh(L) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(snowSurface(1.7, L, 8, 14, kickProfile, SNOW, { back: 1.4, dye: '#2a66d8' }), smoothMat));
  const b = new Builder();
  for (const sx of [-1, 1]) {
    b.add(U.cyl, '#ff7a1a', [sx * 1.15, 0.6 + KICK_H * 0.3, -L + 0.2], [0.03, 1.2, 0.03]);
    b.add(U.box, '#ff7a1a', [sx * 1.15 - sx * 0.12, 1.25 + KICK_H * 0.3, -L + 0.2], [0.22, 0.14, 0.01]);
    b.add(U.cyl, '#2a66d8', [sx * 0.9, 0.04, 0.0], [0.06, 0.08, 0.06]);
  }
  g.add(new THREE.Mesh(b.build(), flatMat));
  return g;
}

export const BUMP_H = 0.65, BUMP_L = 6;
export const bumpProfile = (t) => BUMP_H * 0.5 * (1 - Math.cos(t * Math.PI * 2));
const bumpGeos = {};
// bosse de neige sur n voies côte à côte
export function bumpGeo(lanesWide) {
  return (bumpGeos[lanesWide] ||= snowSurface(1.8 * lanesWide - 0.1, BUMP_L, 6 * lanesWide, 12, bumpProfile, SNOW));
}

// ---------- Barre de slide (rail) en hauteur ----------
export const RAIL_TOP = 2.8;
export function railMesh(L) {
  const b = new Builder();
  const seg = Math.max(2, Math.ceil(L / 3));
  const bar = new THREE.BoxGeometry(1, 1, 1, 1, 1, seg);
  b.add(bar, '#e8ecf2', [0, RAIL_TOP - 0.05, -L / 2], [0.12, 0.1, L]);
  b.add(bar, '#ff3a8a', [0, RAIL_TOP - 0.13, -L / 2], [0.14, 0.06, L]);
  for (let z = 0.4; z < L; z += 4) {
    b.add(U.cyl, '#3a3f4a', [0, (RAIL_TOP - 0.16) / 2, -z], [0.045, RAIL_TOP - 0.16, 0.045]);
    b.add(U.box, '#2a2f38', [0, 0.03, -z], [0.5, 0.06, 0.5]);
  }
  // bouts arrondis
  b.add(U.sph, '#ffd23f', [0, RAIL_TOP - 0.06, 0], [0.09, 0.09, 0.09]);
  b.add(U.sph, '#ffd23f', [0, RAIL_TOP - 0.06, -L], [0.09, 0.09, 0.09]);
  bar.dispose();
  const m = new THREE.Mesh(b.build(), flatMat);
  m.userData.own = true;
  return m;
}

// ---------- Skieurs arrêtés au milieu de la piste ----------
const JACKETS = ['#e8302a', '#ffd23f', '#1ab8b0', '#8a4ae0', '#ff7a1a', '#1f3a7a', '#2a2a30', '#ff5aa8', '#3aa84a', '#f4f4f4'];
const PANTS = ['#1a1a24', '#2a3a5a', '#3a2a2a', '#4a4a52', '#1a2a3a', '#f4f4f4'];
const HELMETS = ['#ffffff', '#1a1a1e', '#ff5aa8', '#e8302a', '#3aa8ff', '#ffd23f'];
const SKIS = ['#e8302a', '#1a1a1e', '#3aa8ff', '#ffd23f', '#ff7a1a', '#ffffff'];

function skiPair(b, color, w = 0.1, len = 1.7, gap = 0.13) {
  for (const sx of [-1, 1]) {
    b.add(U.box, color, [sx * gap, 0.02, 0], [w, 0.03, len]);
    b.add(U.box, color, [sx * gap, 0.06, -len / 2 - 0.05], [w * 0.95, 0.03, 0.18], [0.5, 0, 0]);
    b.add(U.box, '#2a2a30', [sx * gap, 0.05, 0.05], [w * 0.8, 0.05, 0.36]);
  }
}
function head(b, y, z, helmet, lens, beanie = false) {
  b.add(U.sph, '#f2c8a8', [0, y, z], [0.11, 0.12, 0.11]);
  if (beanie) {
    b.add(U.sph, helmet, [0, y + 0.04, z], [0.125, 0.11, 0.125]);
    b.add(U.sph, '#ffffff', [0, y + 0.17, z], [0.05, 0.05, 0.05]);
    b.add(U.cyl, '#ffffff', [0, y + 0.02, z], [0.128, 0.04, 0.128]);
  } else {
    b.add(U.sph, helmet, [0, y + 0.04, z + 0.01], [0.14, 0.13, 0.145]);
  }
  b.add(U.box, '#1a1a1e', [0, y + 0.03, z - 0.1], [0.2, 0.07, 0.05]);
  b.add(U.box, lens, [0, y + 0.03, z - 0.125], [0.18, 0.055, 0.02]);
}
// skieur debout, face vers -z (pente), un peu fléchi, bâtons plantés
function standingSkier(b, c) {
  skiPair(b, c.ski);
  for (const sx of [-1, 1]) {
    b.add(U.box, c.boot, [sx * 0.13, 0.15, 0.02], [0.13, 0.22, 0.28]);
    b.add(U.cyl, c.pants, [sx * 0.13, 0.42, -0.05], [0.07, 0.36, 0.07], [-0.35, 0, 0]);
    b.add(U.cyl, c.pants, [sx * 0.12, 0.74, -0.02], [0.08, 0.36, 0.08], [0.3, 0, 0]);
  }
  b.add(U.cyl, c.pants, [0, 0.92, 0.04], [0.17, 0.18, 0.15]);
  b.add(U.cyl, c.jacket, [0, 1.2, 0], [0.19, 0.46, 0.16], [0.18, 0, 0]);
  b.add(U.box, c.trim, [0, 1.2, -0.15], [0.03, 0.4, 0.02], [0.18, 0, 0]);
  b.add(U.cyl, c.trim, [0, 1.42, -0.02], [0.1, 0.1, 0.1]);
  for (const sx of [-1, 1]) {
    b.add(U.cyl, c.jacket, [sx * 0.24, 1.2, -0.08], [0.06, 0.38, 0.06], [-0.6, 0, sx * 0.25]);
    b.add(U.sph, '#1a1a1e', [sx * 0.29, 1.03, -0.22], [0.06, 0.06, 0.06]);
    // bâton planté dans la neige, un peu en avant et sur le côté
    b.add(U.cyl, '#c8ccd4', [sx * 0.36, 0.55, -0.32], [0.012, 1.05, 0.012], [-0.15, 0, -sx * 0.12]);
    b.add(U.cyl, '#1a1a1e', [sx * 0.42, 0.1, -0.39], [0.05, 0.01, 0.05]);
  }
  head(b, 1.58, -0.03, c.helmet, c.lens);
}
// snowboardeur assis dans la neige, planche en travers
function sittingBoarder(b, c) {
  b.add(U.box, c.ski, [0, 0.03, -0.55], [1.5, 0.04, 0.28]);
  b.add(U.box, c.ski, [0.78, 0.07, -0.55], [0.14, 0.04, 0.26], [0, 0, 0.4]);
  b.add(U.box, c.ski, [-0.78, 0.07, -0.55], [0.14, 0.04, 0.26], [0, 0, -0.4]);
  for (const sx of [-1, 1]) {
    b.add(U.box, c.boot, [sx * 0.24, 0.13, -0.55], [0.14, 0.18, 0.28]);
    b.add(U.cyl, c.pants, [sx * 0.2, 0.32, -0.38], [0.08, 0.4, 0.08], [0.9, 0, 0]);
    b.add(U.cyl, c.pants, [sx * 0.17, 0.32, -0.08], [0.09, 0.36, 0.09], [-1.0, 0, 0]);
  }
  b.add(U.sph, c.pants, [0, 0.16, 0.08], [0.2, 0.14, 0.18]);
  b.add(U.cyl, c.jacket, [0, 0.45, 0.12], [0.2, 0.46, 0.17], [0.3, 0, 0]);
  for (const sx of [-1, 1]) {
    b.add(U.cyl, c.jacket, [sx * 0.24, 0.42, 0.1], [0.065, 0.36, 0.065], [0, 0, sx * 0.5]);
    b.add(U.sph, '#1a1a1e', [sx * 0.36, 0.25, 0.12], [0.065, 0.06, 0.065]);
  }
  head(b, 0.82, 0.18, c.helmet, c.lens, true);
}
// enfant en chasse-neige, dossard
function kidPlough(b, c) {
  for (const sx of [-1, 1]) {
    b.add(U.box, c.ski, [sx * 0.2, 0.02, -0.05], [0.08, 0.03, 1.05], [0, sx * 0.3, 0]);
    b.add(U.box, c.boot, [sx * 0.15, 0.12, 0.02], [0.11, 0.18, 0.22]);
    b.add(U.cyl, c.pants, [sx * 0.12, 0.38, 0.0], [0.065, 0.4, 0.065], [0, 0, -sx * 0.15]);
  }
  b.add(U.cyl, c.pants, [0, 0.62, 0.02], [0.14, 0.14, 0.12]);
  b.add(U.cyl, c.jacket, [0, 0.82, 0], [0.16, 0.34, 0.14]);
  b.add(U.box, '#ffffff', [0, 0.84, -0.14], [0.22, 0.2, 0.01]);
  b.add(U.box, '#e8302a', [0, 0.84, -0.147], [0.1, 0.1, 0.005]);
  for (const sx of [-1, 1]) {
    b.add(U.cyl, c.jacket, [sx * 0.2, 0.78, -0.05], [0.05, 0.3, 0.05], [-0.4, 0, sx * 0.5]);
    b.add(U.sph, c.trim, [sx * 0.3, 0.66, -0.12], [0.05, 0.05, 0.05]);
  }
  head(b, 1.1, -0.02, c.helmet, c.lens);
}

function outfit() {
  return {
    jacket: pick(JACKETS), pants: pick(PANTS), helmet: pick(HELMETS), ski: pick(SKIS),
    boot: pick(['#f4f4f8', '#1a1a1e', '#3a6ad8', '#e8302a']), trim: pick(['#ffffff', '#ffd23f', '#1a1a1e', '#3ff0c0']),
    lens: pick(['#ff8a2a', '#3a8aff', '#c8f03a', '#ff4a8a']),
  };
}

// Quelques variantes préparées au chargement : { geo, h (hauteur), w (largeur), d (longueur) }
export function buildSkiers() {
  const out = { stand: [], sit: [], kid: [] };
  for (let i = 0; i < 6; i++) { const b = new Builder(); standingSkier(b, outfit()); out.stand.push({ geo: b.build(), h: 1.75, w: 0.75, d: 1.75 }); }
  for (let i = 0; i < 4; i++) { const b = new Builder(); sittingBoarder(b, outfit()); out.sit.push({ geo: b.build(), h: 1.0, w: 1.6, d: 0.9 }); }
  for (let i = 0; i < 3; i++) { const b = new Builder(); kidPlough(b, outfit()); out.kid.push({ geo: b.build(), h: 1.25, w: 0.7, d: 1.1 }); }
  return out;
}

// ---------- Pylône de télésiège (protégé par un matelas en mousse) et siège ----------
export const PYLON_H = 11;
const steel = (role, part, i, up) => (up > 0.7 ? '#e8eef6' : '#7a8290');   // un peu de neige sur le dessus
export function pylonGeo() {
  const b = new Builder();
  addPlant(b, 's_pylon', [0, 0, 0], PYLON_H, steel);
  // matelas de protection rouge et blanc autour du pied
  for (let k = 0; k < 4; k++) b.add(U.cyl, k % 2 ? '#ffffff' : '#e8202a', [0, 0.3 + k * 0.5, 0], [0.62, 0.5, 0.62]);
  b.add(U.cyl, SNOW, [0, 2.32, 0], [0.6, 0.06, 0.6]);
  b.add(U.box, '#ffd23f', [0, 1.6, -0.63], [0.3, 0.3, 0.02]);
  b.add(U.box, '#1a1a1e', [0, 1.6, -0.645], [0.14, 0.18, 0.01]);
  b.add(U.cyl, SNOW_SHADE, [0, 0.02, 0], [1.1, 0.04, 1.1]);
  return b.build();
}
export function chairGeo() {
  const b = new Builder();
  addPlant(b, 's_chair', [0, 0, 0], 2.3, (role, part, i, up) => (up > 0.75 ? '#f4f8fd' : null));
  const g = b.build();
  g.translate(0, -2.3, 0);   // accroché au câble par le haut
  return g;
}

// ---------- Arche gonflable avec banderole (à passer en position de recherche) ----------
export const ARCH_LOW = 1.25;
export function archMesh() {
  const g = new THREE.Group();
  const b = new Builder();
  for (const sx of [-1, 1]) {
    b.add(U.cyl, '#e8202a', [sx * 6.6, 1.6, 0], [0.45, 3.2, 0.45]);
    b.add(U.sph, '#e8202a', [sx * 6.6, 3.2, 0], [0.45, 0.45, 0.45]);
    b.add(U.cyl, '#ffffff', [sx * 6.6, 2.4, 0], [0.46, 0.25, 0.46]);
    b.add(U.cyl, '#2a2a30', [sx * 6.6, 0.1, 0], [0.55, 0.2, 0.55]);
  }
  b.add(U.cyl, '#e8202a', [0, 3.3, 0], [0.4, 13.2, 0.4], [0, 0, Math.PI / 2]);
  for (let x = -5.5; x <= 5.5; x += 2.2) b.add(U.cyl, '#2a2a30', [x, 2.65, 0], [0.012, 0.9, 0.012]);
  g.add(new THREE.Mesh(b.build(), smoothMat));
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 0.9, 12, 1), ARCH_MAT());
  banner.position.set(0, ARCH_LOW + 0.45, 0);
  g.add(banner);
  return g;
}
let _archMat = null;
const ARCH_MAT = () => (_archMat ||= texMat(labelTex('▼  ZONE LENTE · RALENTIR  ▼', { w: 1024, h: 80, bg: '#ffd23f', fg: '#1a1a1e', font: 'bold 54px sans-serif' })));

// ---------- Filet orange (à sauter depuis une bosse) ----------
export const FENCE_H = 0.75;
export function fenceGeo() {
  const b = new Builder();
  for (const sx of [-1, 1]) b.add(U.cyl, '#2a2a30', [sx * 0.85, 0.5, 0], [0.03, 1.0, 0.03]);
  for (let k = 0; k < 4; k++) b.add(U.box, '#ff6a00', [0, 0.18 + k * 0.17, 0], [1.72, 0.025, 0.02]);
  for (let x = -0.8; x <= 0.81; x += 0.16) b.add(U.box, '#ff7a1a', [x, 0.42, 0], [0.02, 0.6, 0.02]);
  b.add(U.box, '#ffffff', [0, 0.73, 0], [1.72, 0.06, 0.03]);
  return b.build();
}

// ---------- Panneau « Ralentir » en triangle sur trépied ----------
let _signMat = null;
export function signMesh() {
  const g = new THREE.Group();
  const b = new Builder();
  b.add(U.cyl, '#2a2a30', [0, 0.65, 0.12], [0.03, 1.3, 0.03], [0.2, 0, 0]);
  for (const sx of [-1, 1]) b.add(U.cyl, '#2a2a30', [sx * 0.3, 0.6, -0.1], [0.03, 1.25, 0.03], [-0.15, 0, sx * 0.25]);
  b.add(U.box, '#1a1a1e', [0, 1.05, -0.02], [1.06, 0.72, 0.03]);
  g.add(new THREE.Mesh(b.build(), flatMat));
  _signMat ||= texMat(labelTex(['⚠', 'RALENTIR'], { w: 256, h: 180, bg: '#ffd23f', fg: '#1a1a1e', font: 'bold 52px sans-serif', border: '#1a1a1e' }));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.68), _signMat);
  p.position.set(0, 1.05, 0.0);   // face +z : lisible par le joueur, qui arrive du haut de la pente
  g.add(p);
  return g;
}

// ---------- Dameuse qui remonte la piste (deux voies), gyrophare orange ----------
export function snowcatGeo() {
  const b = new Builder();
  const RED = '#d8202a';
  for (const sx of [-1, 1]) {
    b.add(U.box, '#1a1a1e', [sx * 1.25, 0.55, 0], [0.9, 1.0, 4.4]);
    for (let z = -1.6; z <= 1.6; z += 0.8) b.add(U.cyl, '#5a5f6a', [sx * 1.25, 0.55, z], [0.38, 0.92, 0.38], [0, 0, Math.PI / 2]);
    for (let z = -2.1; z <= 2.1; z += 0.21) b.add(U.box, '#3a3a40', [sx * 1.25, 1.06, z], [0.92, 0.04, 0.08]);
  }
  b.add(U.box, RED, [0, 1.35, 0.2], [2.0, 0.9, 4.2]);
  b.add(U.box, RED, [0, 2.2, -0.4], [1.9, 1.0, 1.9]);                           // cabine
  b.add(U.box, '#1a2a3a', [0, 2.3, -1.36], [1.8, 0.7, 0.04]);                    // pare-brise (vers le joueur : -z)
  for (const sx of [-1, 1]) b.add(U.box, '#1a2a3a', [sx * 0.96, 2.3, -0.4], [0.03, 0.6, 1.6]);
  b.add(U.box, '#f4f4f4', [0, 2.75, -0.4], [2.0, 0.1, 2.0]);
  b.add(U.box, RED, [0, 1.95, 1.4], [1.9, 0.5, 1.4]);
  // lame à l'avant (vers le joueur), fraise et peigne à l'arrière
  b.add(U.box, '#d8dce4', [0, 0.75, -2.95], [3.4, 1.1, 0.25], [0.25, 0, 0]);
  b.add(U.box, '#ffd23f', [0, 1.33, -2.85], [3.4, 0.08, 0.3]);
  for (const sx of [-1, 1]) b.add(U.box, '#5a5f6a', [sx * 0.7, 1.0, -2.4], [0.15, 0.15, 1.0], [0.3, 0, 0]);
  b.add(U.cyl, '#5a5f6a', [0, 0.45, 2.75], [0.35, 3.0, 0.35], [0, 0, Math.PI / 2]);
  b.add(U.box, '#2a2a30', [0, 0.12, 3.15], [3.0, 0.08, 0.6]);
  // phares et gyrophare
  for (const sx of [-0.7, 0.7]) b.add(U.box, '#fff8c8', [sx, 2.82, -1.2], [0.24, 0.14, 0.08]);
  b.add(U.cyl, '#ff8a00', [0, 2.95, -0.4], [0.14, 0.24, 0.14]);
  return b.build().rotateY(Math.PI);   // l'avant (lame, pare-brise) tourné vers le joueur, qui arrive par +z
}

// ---------- Jalons de piste (piste rouge ; côté droit : tête orange fluo) ----------
export function jalonGeo(right) {
  const b = new Builder();
  b.add(U.cyl, '#d8202a', [0, 0.75, 0], [0.025, 1.5, 0.025]);
  b.add(U.cyl, '#ffffff', [0, 1.05, 0], [0.027, 0.1, 0.027]);
  if (right) b.add(U.cyl, '#ff7a00', [0, 1.37, 0], [0.03, 0.26, 0.03]);
  b.add(U.cyl, SNOW_SHADE, [0, 0.02, 0], [0.09, 0.04, 0.09]);
  return b.build();
}
