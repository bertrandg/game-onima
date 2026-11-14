import * as THREE from 'three';

// Modèles de végétation du Japon (arbres feuillus, conifère, rochers), pris dans des bibliothèques libres
// (voir Crédits du README) puis nettoyés dans Blender : triangles seuls, sans texture, origine au pied,
// hauteur 1. Pour chaque triangle : position, couleur d'origine, rôle (matériau d'origine : 0 = bois…)
// et numéro de morceau (partie d'un seul tenant, ex. une touffe de feuillage). On les recolore à la
// construction et ils se fusionnent dans le décor comme les autres primitives : aucun appel de dessin en plus.
const BASE = new URL('../models/japon/', import.meta.url).href;

let MODELS = null;

export async function loadPlants() {
  if (MODELS) return MODELS;
  const [index, bin] = await Promise.all([
    fetch(BASE + 'plants.json').then((r) => r.json()),
    fetch(BASE + 'plants.bin').then((r) => r.arrayBuffer()),
  ]);
  MODELS = {};
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
  const m = MODELS && MODELS[key];
  if (!m) throw new Error('modèle de végétation inconnu : ' + key);
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
