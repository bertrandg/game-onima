import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { Scenery, makeMist, makeSunGlow, hash } from '../../scenery.js';

// Lointain de Paris 1900 : ciel doré, tour Eiffel en treillis, toits de Paris et monuments
export const SKY = {
  top: '#6c8cd4',
  mid: '#c4b8ea',
  pink: '#f4c2c8',
  horizon: '#ffd8b4',
  low: '#ffe6cc',
  mist: '#f2d8cc',
  sun: '#fff0c0',
};
export const FOG_COLOR = SKY.horizon;
const SUN_DIR = new THREE.Vector3(-0.55, 0.12, -1).normalize();
const TOWER_POS = new THREE.Vector3(38, -6, -720);   // au bout du boulevard, visible entre les immeubles
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

// poutre entre deux points (boîte orientée)
function beam(b, color, p1, p2, t) {
  _d.set(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const len = _d.length();
  _q.setFromUnitVectors(_up, _d.normalize());
  _e.setFromQuaternion(_q);
  b.add(U.box, color, [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2], [t, len, t], [_e.x, _e.y, _e.z]);
}

// ---------- Tour Eiffel ----------
function makeEiffel() {
  const b = new Builder();
  const H = 250;
  const col = '#7a5a48', dark = '#5e4436';
  // demi-largeur selon la hauteur : base très évasée, sommet effilé
  const w = (y) => 52 * Math.pow(1 - y / H, 2.3) + 1.6;
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  const levels = [];
  for (let i = 0; i <= 24; i++) levels.push((i / 24) ** 1.25 * H * 0.97);
  // quatre arêtiers
  for (let i = 0; i < levels.length - 1; i++) {
    const y1 = levels[i], y2 = levels[i + 1];
    for (const [sx, sz] of corners) {
      const p1 = [sx * w(y1), y1, sz * w(y1)], p2 = [sx * w(y2), y2, sz * w(y2)];
      beam(b, col, p1, p2, y1 < H * 0.18 ? 3.2 : 1.8 - (y1 / H) * 1.2);
    }
  }
  // treillis croisé sur les quatre faces (au-dessus du premier étage, et dans chaque pilier en dessous)
  for (let i = 0; i < levels.length - 1; i++) {
    const y1 = levels[i], y2 = levels[i + 1];
    if (y1 < H * 0.18) continue;
    for (let f = 0; f < 4; f++) {
      const [ax, az] = corners[f], [bx, bz] = corners[(f + 1) % 4];
      const A1 = [ax * w(y1), y1, az * w(y1)], B2 = [bx * w(y2), y2, bz * w(y2)];
      const B1 = [bx * w(y1), y1, bz * w(y1)], A2 = [ax * w(y2), y2, az * w(y2)];
      beam(b, dark, A1, B2, 0.6);
      beam(b, dark, B1, A2, 0.6);
    }
  }
  // grandes arches entre les pieds
  for (let f = 0; f < 4; f++) {
    const [ax, az] = corners[f], [bx, bz] = corners[(f + 1) % 4];
    let prev = null;
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, a = t * Math.PI;
      const yb = H * 0.035 + Math.sin(a) * H * 0.1;
      const ww = w(yb);
      const x = (ax + (bx - ax) * t) * ww, z = (az + (bz - az) * t) * ww;
      const p = [x * (1 - 0.15 * Math.sin(a)), yb, z * (1 - 0.15 * Math.sin(a))];
      if (prev) beam(b, dark, prev, p, 1.0);
      prev = p;
    }
  }
  // plateformes (1er, 2e étage) et campanile
  for (const [hy, th] of [[H * 0.18, 4], [H * 0.38, 3]]) {
    const ww = w(hy) + 3;
    b.add(U.box, col, [0, hy, 0], [ww * 2, th, ww * 2]);
    b.add(U.box, '#e8c890', [0, hy + th / 2 + 0.4, 0], [ww * 2 - 1, 0.6, ww * 2 - 1]);
  }
  b.add(U.box, col, [0, H * 0.9, 0], [7, 3, 7]);
  b.add(U.box, '#e8c890', [0, H * 0.94, 0], [4.5, 6, 4.5]);
  b.add(U.cyl6, dark, [0, H * 0.99, 0], [0.8, 14, 0.8]);
  b.add(U.sph, '#fff4c0', [0, H * 1.02, 0], [1.6, 1.6, 1.6]);
  const g = b.build();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  m.position.copy(TOWER_POS);
  m.rotation.y = 0.5;
  return m;
}

// ---------- Toits de Paris en couches, avec monuments ----------
function makeSkyline() {
  const group = new THREE.Group();
  const mist = new THREE.Color(SKY.mist);
  const layers = [
    { r: 780, h: [30, 55], color: '#b8b4d6', seed: 5 },
    { r: 600, h: [24, 44], color: '#a4a6c8', seed: 9 },
    { r: 450, h: [18, 32], color: '#9497b4', seed: 13 },
  ];
  for (const L of layers) {
    const b = new Builder();
    const top = new THREE.Color(L.color);
    const roof = top.clone().lerp(new THREE.Color('#5a6478'), 0.35);
    let a = 0, i = 0;
    while (a < Math.PI * 2) {
      const wA = (8 + hash(L.seed + i) * 18) / L.r;
      const h = L.h[0] + hash(L.seed + i * 3) * (L.h[1] - L.h[0]);
      const am = a + wA / 2, x = Math.cos(am) * L.r, z = Math.sin(am) * L.r;
      const rotY = -am + Math.PI / 2;
      const c = top.clone().lerp(mist, hash(i * 7 + L.seed) * 0.25);
      b.add(U.box, `#${c.getHexString()}`, [x, h / 2 - 20, z], [wA * L.r + 0.5, h + 40, 6], [0, rotY, 0]);
      b.add(U.roof, `#${roof.getHexString()}`, [x, h - 20, z], [6, 5, wA * L.r + 0.5], [0, rotY + Math.PI / 2, 0]);   // toit mansardé
      if (hash(i * 11 + L.seed) > 0.5) b.add(U.box, `#${roof.getHexString()}`, [x + 2, h - 14, z], [1.2, 3, 1.2]);   // cheminée
      a += wA;
      i++;
    }
    group.add(new THREE.Mesh(b.build(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
  }
  // monuments : Sacré-Cœur sur sa butte, dôme du Panthéon, Invalides, tours de Notre-Dame
  const b = new Builder();
  const place = (ang, r) => [Math.cos(ang) * r, Math.sin(ang) * r];
  {
    const [x, z] = place(-1.75, 700);
    b.add(U.sph, '#a8b49a', [x, -40, z], [120, 80, 90]);                 // butte Montmartre
    b.add(U.box, '#f2ece2', [x, 46, z], [40, 22, 30]);
    b.add(U.sph, '#f6f2ea', [x, 66, z], [14, 20, 14]);
    b.add(U.cone8, '#f6f2ea', [x, 90, z], [3, 10, 3]);
    for (const dx of [-14, 14]) b.add(U.sph, '#f2ece2', [x + dx, 58, z], [7, 10, 7]);
    b.add(U.box, '#f2ece2', [x + 22, 66, z], [6, 40, 6]);
  }
  {
    const [x, z] = place(-1.25, 620);
    b.add(U.box, '#c6c2d8', [x, 15, z], [40, 30, 30]);
    b.add(U.cyl, '#c6c2d8', [x, 38, z], [12, 18, 12]);
    b.add(U.sph, '#b4b4cc', [x, 48, z], [12, 12, 12]);
    b.add(U.cone8, '#b4b4cc', [x, 62, z], [2, 8, 2]);
  }
  {
    const [x, z] = place(-2.15, 560);
    b.add(U.box, '#bab6d0', [x, 15, z], [30, 30, 24]);
    b.add(U.sph, '#d8b860', [x, 40, z], [10, 13, 10]);                 // dôme doré des Invalides
    b.add(U.cone8, '#d8b860', [x, 56, z], [1.6, 9, 1.6]);
  }
  {
    const [x, z] = place(-0.95, 520);
    for (const dx of [-9, 9]) b.add(U.box, '#c0bcd2', [x + dx, 26, z], [12, 52, 12]);
    b.add(U.box, '#c0bcd2', [x, 16, z + 14], [24, 32, 30]);
    b.add(U.cone8, '#b0acc4', [x, 54, z + 22], [1.5, 22, 1.5]);
  }
  group.add(new THREE.Mesh(b.build(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
  return group;
}

export function parisScenery(root) {
  return new Scenery(root, {
    sky: SKY,
    sunDir: SUN_DIR,
    fujiCap: false,
    fireflyColors: ['#fff0b0', '#ffd27a', '#fff6d8', '#ffe0a0'],   // lueurs des becs de gaz
    far: () => [makeEiffel(), makeSkyline(), makeMist(560, 60, 0.7, SKY.mist), makeMist(400, 40, 0.5, SKY.mist), makeSunGlow(SUN_DIR)],
  });
}
