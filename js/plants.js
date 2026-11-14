import * as THREE from 'three';

// Modèles de décor (arbres, rochers, étals, légumes…) d'un niveau, pris dans des bibliothèques libres
// (voir models/<niveau>/LICENSE.txt) puis nettoyés dans Blender : triangles seuls, sans texture, origine au pied,
// hauteur 1. Pour chaque triangle : position, couleur d'origine, rôle (matériau d'origine : 0 = bois…)
// et numéro de morceau (partie d'un seul tenant, ex. une touffe de feuillage). On les recolore à la
// construction et ils se fusionnent dans le décor comme les autres primitives : aucun appel de dessin en plus.
// Les modèles de chaque niveau sont préfixés (ex. « p_ » pour Paris) : leurs noms ne se croisent pas.
const BASE = new URL('../models/', import.meta.url).href;

const MODELS = {};
const loaded = {};

export function loadPlants(level = 'japon') {
  return (loaded[level] ||= loadSet(level));
}

async function loadSet(level) {
  const [index, bin] = await Promise.all([
    fetch(BASE + level + '/plants.json').then((r) => r.json()),
    fetch(BASE + level + '/plants.bin').then((r) => r.arrayBuffer()),
  ]);
  for (const [key, m] of Object.entries(index)) {
    const n = m.tris;
    let o = m.off;
    const pos = new Float32Array(bin, o, n * 9); o += n * 36;
    const col = new Uint8Array(bin, o, n * 3); o += n * 3;
    const role = new Uint8Array(bin, o, n); o += n;
    o += (4 - (o % 4)) % 4;
    const part = new Uint16Array(bin, o, n);
    MODELS[key] = { n, pos, col, role, part, parts: m.parts, w: m.w, d: m.d };
  }
  return MODELS;
}

export const plant = (key) => {
  const m = MODELS[key];
  if (!m) throw new Error('modèle de décor inconnu : ' + key);
  return m;
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();

// Ajoute le modèle `key` au Builder b : p = position du pied, h = hauteur, s = [largeur, profondeur]
// relatives (1 = proportions d'origine), ry = rotation autour de la verticale.
// paint(role, part, i, up, orig) renvoie une couleur ('#rrggbb') ou null pour garder celle d'origine ;
// up = composante verticale de la normale du triangle (1 = face tournée vers le ciel).
// Renvoie la matrice appliquée (pour placer ensuite des détails sur le modèle, voir surface()).
export function addPlant(b, key, p, h, paint, { s = [1, 1], ry = 0 } = {}) {
  const m = plant(key);
  _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(h * s[0], h, h * s[1]));
  const pos = new Float32Array(m.n * 9), col = new Float32Array(m.n * 9);
  const cache = {};
  for (let i = 0; i < m.n; i++) {
    for (let k = 0; k < 3; k++) {
      _v.fromArray(m.pos, i * 9 + k * 3).applyMatrix4(_m).toArray(pos, i * 9 + k * 3);
    }
    _a.fromArray(pos, i * 9 + 3).sub(_v.fromArray(pos, i * 9));
    _b.fromArray(pos, i * 9 + 6).sub(_v);
    const up = _n.crossVectors(_a, _b).normalize().y;
    const r = m.role[i], pt = m.part[i];
    const want = paint ? paint(r, pt, i, up, m.col.subarray(i * 3, i * 3 + 3)) : null;
    if (want) _c.set(want);
    else _c.setRGB(m.col[i * 3] / 255, m.col[i * 3 + 1] / 255, m.col[i * 3 + 2] / 255, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) col.set([_c.r, _c.g, _c.b], i * 9 + k * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  b.parts.push(g);
  return _m.clone();
}

// Surface horizontale (tournée vers le ciel) des triangles des rôles `roles` entre les hauteurs y0 et y1
// (relatives : modèle de hauteur 1, avant rotation) : { x0, x1, z0, z1, y }, pour y poser des objets
export function shelf(key, roles, y0, y1) {
  const m = plant(key);
  const r = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y: 0 };
  for (let i = 0; i < m.n; i++) {
    if (!roles.includes(m.role[i])) continue;
    const o = i * 9;
    _a.set(m.pos[o + 3] - m.pos[o], m.pos[o + 4] - m.pos[o + 1], m.pos[o + 5] - m.pos[o + 2]);
    _b.set(m.pos[o + 6] - m.pos[o], m.pos[o + 7] - m.pos[o + 1], m.pos[o + 8] - m.pos[o + 2]);
    if (_n.crossVectors(_a, _b).normalize().y < 0.9) continue;
    const y = (m.pos[o + 1] + m.pos[o + 4] + m.pos[o + 7]) / 3;
    if (y < y0 || y > y1) continue;
    for (let k = 0; k < 3; k++) {
      r.x0 = Math.min(r.x0, m.pos[o + k * 3]); r.x1 = Math.max(r.x1, m.pos[o + k * 3]);
      r.z0 = Math.min(r.z0, m.pos[o + k * 3 + 2]); r.z1 = Math.max(r.z1, m.pos[o + k * 3 + 2]);
    }
    r.y = Math.max(r.y, y);
  }
  return r;
}

// n points pris au hasard à la surface des triangles du rôle `role` (centres des triangles, dans le repère
// du monde grâce à la matrice renvoyée par addPlant), avec leur normale
export function surface(key, matrix, role, n, rnd = Math.random) {
  const m = plant(key);
  const ids = [];
  for (let i = 0; i < m.n; i++) if (m.role[i] === role) ids.push(i);
  const out = [];
  for (let k = 0; k < n && ids.length; k++) {
    const i = ids[(rnd() * ids.length) | 0];
    const a = new THREE.Vector3().fromArray(m.pos, i * 9).applyMatrix4(matrix);
    const b = new THREE.Vector3().fromArray(m.pos, i * 9 + 3).applyMatrix4(matrix);
    const c = new THREE.Vector3().fromArray(m.pos, i * 9 + 6).applyMatrix4(matrix);
    const nor = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    out.push({ p: a.add(b).add(c).multiplyScalar(1 / 3), n: nor });
  }
  return out;
}
