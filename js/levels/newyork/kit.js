import * as THREE from 'three';

// Pièces modulaires du « Downtown City MegaKit » de Quaternius (licence CC0), converties en un binaire
// compact (models/nykit) : seules les faces extérieures sont gardées, regroupées par matériau du jeu.
// Chaque pièce fait 2 ou 4 m de large et 3 m de haut, centrée en x, posée en y = 0, façade vers +z.
const BASE = new URL('../../../models/nykit/', import.meta.url).href;

let KIT = null;
// bande (de haut en bas) de chaque matériau dans trimsheet.jpg
const SHEET = { trim: 0, metal: 1, interior: 2 };
const matKey = (m) => (SHEET[m] !== undefined ? 'ksheet' : 'k' + m);

export async function loadKit() {
  if (KIT) return KIT;
  const [index, bin] = await Promise.all([
    fetch(BASE + 'kit.json').then((r) => r.json()),
    fetch(BASE + 'kit.bin').then((r) => r.arrayBuffer()),
  ]);
  const F = new Float32Array(bin, 0, index.floats);
  const I = new Uint16Array(bin, index.floats * 4, index.indices);
  KIT = { pieces: index.pieces, F, I, cache: {} };
  return KIT;
}

// textures du kit (répétées : les « trim sheets » se prolongent en largeur)
export function makeKitMats() {
  const loader = new THREE.TextureLoader();
  const tex = (name) => {
    const t = loader.load(BASE + name);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  const lit = (name) => new THREE.MeshLambertMaterial({ map: tex(name), vertexColors: true });
  // ksheet : moulures, métal et intérieurs empilés en trois bandes (un seul appel de dessin)
  return { kbrick: lit('brick.jpg'), ksheet: lit('trimsheet.jpg'), korn: lit('orn.jpg'), kdirt: lit('dirt.jpg'), kfacade: lit('facades.jpg') };
}

// géométrie d'une pièce, par matériau ; interior = 0, 1 ou 2 (pièce éclairée ou sombre derrière les vitres)
function pieceGeos(name, interior) {
  const key = name + '/' + interior;
  if (KIT.cache[key]) return KIT.cache[key];
  const P = KIT.pieces[name];
  if (!P) throw new Error('pièce inconnue : ' + name);
  const out = [];
  for (const part of P.parts) {
    const [v0, nv] = part.v, [i0, ni] = part.i;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    for (let k = 0; k < nv; k++) {
      const o = (v0 + k) * 8;
      pos.set([KIT.F[o], KIT.F[o + 1], KIT.F[o + 2]], k * 3);
      nor.set([KIT.F[o + 3], KIT.F[o + 4], KIT.F[o + 5]], k * 3);
      let u = KIT.F[o + 6], v = 1 - KIT.F[o + 7];
      const row = SHEET[part.m];
      if (row !== undefined) {
        // bande de la feuille commune : u divisé par 3 (la bande contient 3 fois le motif, sauf les intérieurs)
        v = (2 - row + Math.min(0.995, Math.max(0.005, v))) / 3;
        u = part.m === 'interior' ? (Math.min(1, Math.max(0, u)) + interior) / 3 : u / 3;
      }
      uv.set([u, v], k * 2);
      col.set(part.t, k * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(KIT.I.slice(i0, i0 + ni), 1));
    out.push({ key: matKey(part.m), geo: g });
  }
  KIT.cache[key] = out;
  return out;
}

export const pieceWidth = (name) => { const P = KIT.pieces[name]; return P.max[0] - P.min[0]; };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
// ajoute une pièce dans un TexBuilder : p = position, rotY = rotation (π/2 : façade tournée vers +x),
// tint = teinte multipliée, sc = échelle [x, y, z] ou nombre
export function addPiece(t, name, p, rotY = Math.PI / 2, { interior = 0, tint = null, sc = 1 } = {}) {
  const s = typeof sc === 'number' ? [sc, sc, sc] : sc;
  _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(0, rotY, 0)), _s.set(s[0], s[1], s[2]));
  for (const { key, geo } of pieceGeos(name, interior)) {
    const g = geo.clone().applyMatrix4(_m);
    if (tint) {
      const c = g.attributes.color;
      for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint[0], c.getY(i) * tint[1], c.getZ(i) * tint[2]);
    }
    (t.parts[key] ||= []).push(g);
  }
}
