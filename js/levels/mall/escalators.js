import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, TexBuilder, U, vcMat } from '../../geo.js';
import { FLOOR_H, SLAB, CEIL, ESC_LEN, LANE_HX } from './dims.js';
import { SLOT, slotUV } from './shops.js';

// Escalators du centre commercial. Un escalator occupe une voie sur ESC_LEN mètres et relie deux étages
// voisins ; il monte (dir = 1 : pied en bas, en z = 0) ou descend (dir = -1 : pied en haut). Tout est
// construit dans le repère de l'étage du bas (y = 0) avec le pied en z = 0 et l'arrivée en z = -ESC_LEN.
// Les marches défilent (texture animée) ; balustrades de verre, mains courantes, carter sous la pente.
// Autour, la trémie de l'étage du haut et le panneau « ▲ Étage n » au-dessus du pied. À l'étage
// d'arrivée, la voie est fermée par un totem publicitaire ou une cloison (on ne peut pas y passer).

const L = ESC_LEN, H = FLOOR_H;
const SLOPE = Math.atan2(H, L), LS = Math.hypot(H, L);
const STEEL = '#c8ccd4', DARK = '#1a1a1e', TRIM = '#e8eaee';

export const stepsMat = new THREE.MeshLambertMaterial({ map: stepsTexture() });
export const glassMat = new THREE.MeshLambertMaterial({ color: '#bfe8f4', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });

function stepsTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4c54'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#5e6068';
  for (let x = 2; x < 64; x += 5) g.fillRect(x, 0, 2, 64);   // rainures
  g.fillStyle = '#2a2a30'; g.fillRect(0, 0, 64, 6);           // nez de marche
  g.fillStyle = '#f2c230'; g.fillRect(0, 0, 4, 64); g.fillRect(60, 0, 4, 64);   // bords jaunes
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// boîte posée le long de la pente : centrée sur la ligne des marches + dy, à l'abscisse x
function slant(b, dir, color, x, dy, w, h) {
  b.add(U.box, color, [x, H / 2 + dy, -L / 2], [w, h, LS + 0.02], [dir * SLOPE, 0, 0]);
}

// panneau vertical triangulaire sous la pente (cache le vide sous l'escalator), face vers +x ou -x
function underPanel(dir, x, side, color) {
  const pts = dir > 0 ? [[0, 0], [L, H], [L, 0]] : [[0, 0], [0, H], [L, 0]];   // (u = -z, y)
  const s = new THREE.Shape();
  const P = side > 0 ? pts : [...pts].reverse();
  s.moveTo(P[0][0], P[0][1]); s.lineTo(P[1][0], P[1][1]); s.lineTo(P[2][0], P[2][1]); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  // le plan (u, y) devient le plan (z = -u, y) en x : rotation d'un quart de tour autour de y
  g.rotateY(Math.PI / 2);
  g.translate(x, 0, 0);
  const b = new Builder();
  b.add(g, color);
  return b.parts[0];
}

// bande de marches texturée (une marche de 0,4 m par répétition de la texture)
function stepsGeo(dir) {
  const g = new THREE.PlaneGeometry(1.5, LS, 1, 1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (LS / 0.4));   // v croît vers l'arrivée
  g.rotateX(-Math.PI / 2);                 // à plat, longueur le long de -z
  g.rotateX(dir * SLOPE);                  // incliné comme la pente
  g.translate(0, H / 2 + 0.04, -L / 2);
  return g;
}

// l'escalator lui-même (repère de l'étage du bas)
function bodyGeos(dir) {
  const f = new Builder();
  for (const sx of [-1, 1]) {
    slant(f, dir, STEEL, sx * 0.86, 0.05, 0.14, 0.5);        // jupes latérales
    slant(f, dir, DARK, sx * 0.86, 1.32, 0.12, 0.09);        // main courante
    slant(f, dir, TRIM, sx * 0.86, 0.36, 0.08, 0.06);        // pied de la balustrade
    f.parts.push(underPanel(dir, sx * 0.97, sx, '#dcdfe6'));
    // retours de la main courante aux deux paliers
    for (const end of [0, 1]) {
      const z = end ? -L - 0.5 : 0.5, y = end ? (dir > 0 ? H : 0) : (dir > 0 ? 0 : H);
      f.add(U.box, DARK, [sx * 0.86, y + 1.0, z], [0.12, 0.09, 1.1]);
      f.add(U.box, STEEL, [sx * 0.86, y + 0.5, z + (end ? -0.5 : 0.5)], [0.14, 1.0, 0.14]);
    }
  }
  slant(f, dir, '#d8dce4', 0, -0.32, 1.86, 0.5);            // carter sous la pente
  // peignes et plaques de palier, aux deux bouts
  for (const end of [0, 1]) {
    const z = end ? -L - 0.45 : 0.45, y = end ? (dir > 0 ? H : 0) : (dir > 0 ? 0 : H);
    f.add(U.box, '#9aa0a8', [0, y + 0.02, z], [1.6, 0.04, 0.9]);
    f.add(U.box, '#f2c230', [0, y + 0.045, z + (end ? 0.42 : -0.42)], [1.5, 0.012, 0.05]);
  }
  const glass = new Builder();
  for (const sx of [-1, 1]) slant(glass, dir, '#ffffff', sx * 0.86, 0.84, 0.03, 0.92);
  const gl = glass.build();
  gl.deleteAttribute('color');
  return { flat: f.build(), steps: stepsGeo(dir), glass: gl };
}

// trémie dans la dalle de l'étage du haut : chants de la dalle, balustrades latérales de verre ; pour
// un escalator qui descend, une balustrade ferme aussi le bout de la trémie (on y entre par le pied)
function wellGeos(down) {
  const f = new Builder(), gl = new Builder();
  const y0 = H;
  for (const sx of [-1, 1]) {
    f.add(U.box, TRIM, [sx * (LANE_HX - 0.04), y0 - SLAB / 2, -L / 2], [0.08, SLAB, L]);   // chant de la dalle
    f.add(U.box, STEEL, [sx * (LANE_HX - 0.06), y0 + 0.06, -L / 2], [0.1, 0.12, L]);
    f.add(U.box, DARK, [sx * (LANE_HX - 0.06), y0 + 1.1, -L / 2], [0.1, 0.08, L]);
    gl.add(U.box, '#ffffff', [sx * (LANE_HX - 0.06), y0 + 0.6, -L / 2], [0.03, 0.95, L - 0.1]);
    for (let k = 0; k <= 4; k++) f.add(U.box, STEEL, [sx * (LANE_HX - 0.06), y0 + 0.58, -k * (L / 4)], [0.06, 1.05, 0.06]);
  }
  for (const z of [-0.04, -L + 0.04]) f.add(U.box, TRIM, [0, y0 - SLAB / 2, z], [LANE_HX * 2 - 0.16, SLAB, 0.08]);
  if (down) {
    f.add(U.box, STEEL, [0, y0 + 0.06, -L + 0.06], [LANE_HX * 2 - 0.2, 0.12, 0.1]);
    f.add(U.box, DARK, [0, y0 + 1.1, -L + 0.06], [LANE_HX * 2 - 0.2, 0.08, 0.1]);
    gl.add(U.box, '#ffffff', [0, y0 + 0.6, -L + 0.06], [LANE_HX * 2 - 0.25, 0.95, 0.03]);
  }
  const g = gl.build();
  g.deleteAttribute('color');
  return { flat: f.build(), glass: g };
}

// totem publicitaire qui ferme la voie au bord d'une trémie (étage d'arrivée d'un escalator qui monte)
// ou cloison sous un escalator qui descend : repère de l'étage où il se trouve, en z = 0
function blockerGeos(tall, ad) {
  const f = new Builder(), t = new TexBuilder();
  const h = tall ? CEIL : 3.6;
  f.add(U.box, '#2a2a34', [0, h / 2, -0.15], [LANE_HX * 2 - 0.1, h, 0.3]);
  f.add(U.box, '#e8eaee', [0, 0.1, -0.15], [LANE_HX * 2, 0.2, 0.4]);
  f.add(U.box, '#e8eaee', [0, h - 0.06, -0.15], [LANE_HX * 2, 0.12, 0.36]);
  t.quad('sign', [0, h - 0.8, 0.005], [2.3, 0.44], slotUV(SLOT.ad(ad)), '#ffffff', 0);
  t.quad('sign', [0, 1.4, 0.005], [2.1, 1.5], [0.001, 0.001, 0.003, 0.003], ['#ffd0e4', '#d0ecff', '#fff0b0', '#d8f4d0', '#e8d8ff', '#ffe0c8'][ad], 0);   // affiche (coin blanc de l'atlas, teinté)
  for (const sx of [-1, 1]) f.add(U.box, '#f2c230', [sx * 1.1, 1.4, 0.01], [0.06, 1.5, 0.04]);
  return { flat: f.build(), sign: t.build()[0].geo };
}

// panneau suspendu au-dessus du pied d'un escalator : « ▲ Étage 4 · Sport »
function signGeo(dir, to, yBase) {
  const f = new Builder(), t = new TexBuilder();
  const y = yBase + CEIL - 0.95;
  for (const sx of [-1, 1]) f.add(U.box, '#9aa0a8', [sx * 0.9, y + 0.55, 0], [0.03, 0.7, 0.03]);
  f.add(U.box, dir > 0 ? '#1a7a3a' : '#c8501a', [0, y, -0.05], [2.4, 0.5, 0.08]);
  t.quad('sign', [0, y, 0.0], [2.3, 0.44], slotUV(dir > 0 ? SLOT.up(to) : SLOT.down(to)), '#ffffff', 0);
  return { flat: f.build(), sign: t.build()[0].geo };
}

// flèche lumineuse au pied (sprite) : verte pour monter, orange pour descendre
function arrowTexture(up) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const col = up ? '#4ae07a' : '#ff9a3a';
  g.shadowColor = col; g.shadowBlur = 18;
  g.fillStyle = col;
  g.translate(64, 64);
  if (!up) g.rotate(Math.PI);
  g.beginPath();
  g.moveTo(0, -50); g.lineTo(46, -2); g.lineTo(16, -2); g.lineTo(16, 48); g.lineTo(-16, 48); g.lineTo(-16, -2); g.lineTo(-46, -2);
  g.closePath(); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Prototypes partagés : construits une fois, assemblés pour chaque escalator
export function escalatorKit(signMat) {
  const K = {
    body: { 1: bodyGeos(1), '-1': bodyGeos(-1) },
    well: { down: wellGeos(true), up: wellGeos(false) },
    totem: [0, 1, 2, 3, 4, 5].map((i) => blockerGeos(false, i)),
    wall: [0, 1, 2, 3, 4, 5].map((i) => blockerGeos(true, i)),
    signs: {},
    arrows: { 1: new THREE.SpriteMaterial({ map: arrowTexture(true), transparent: true, depthWrite: false }), '-1': new THREE.SpriteMaterial({ map: arrowTexture(false), transparent: true, depthWrite: false }) },
    signMat,
  };
  for (let to = 1; to <= 5; to++) K.signs['1:' + to] = signGeo(1, to, 0);
  for (let to = 0; to <= 4; to++) K.signs['-1:' + to] = signGeo(-1, to, H);
  // les dix escalators possibles (sens, étage visé ; la publicité en découle), fusionnés d'avance
  for (let to = 1; to <= 5; to++) mergedGeos(K, { dir: 1, to, ad: (to * 2) % 6 });
  for (let to = 0; to <= 4; to++) mergedGeos(K, { dir: -1, to, ad: (to * 2 + 1) % 6 });
  return K;
}

// Un escalator complet pour la connexion c = { a, lane, dir, zNear, from, to, ad } : un groupe placé en
// (voie, sol de l'étage du bas, pied). Les pièces sont fusionnées par matière (une géométrie par
// combinaison sens / étage visé / publicité, mise en cache) : quatre appels de dessin et la flèche.
const merged = {};
function mergedGeos(K, c) {
  const key = c.dir + ':' + c.to + ':' + c.ad;
  if (merged[key]) return merged[key];
  const B = K.body[c.dir], W = c.dir > 0 ? K.well.up : K.well.down;
  // à l'étage d'arrivée, la voie est fermée devant la trémie (totem) ou sous la descente (cloison)
  const blk = c.dir > 0 ? K.totem[c.ad] : K.wall[c.ad];
  const by = c.dir > 0 ? H : 0;
  const S = K.signs[c.dir + ':' + c.to];   // panneau au-dessus du pied, 1,2 m devant
  const t = (g, y, z) => g.clone().translate(0, y, z);
  return (merged[key] = {
    flat: mergeGeometries([B.flat, W.flat, t(blk.flat, by, 0), t(S.flat, 0, 1.2)], false),
    glass: mergeGeometries([B.glass, W.glass], false),
    sign: mergeGeometries([t(blk.sign, by, 0), t(S.sign, 0, 1.2)], false),
  });
}

export function buildEscalator(K, c, x) {
  const G = mergedGeos(K, c);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(G.flat, vcMat), new THREE.Mesh(K.body[c.dir].steps, stepsMat), new THREE.Mesh(G.glass, glassMat), new THREE.Mesh(G.sign, K.signMat));
  const arrow = new THREE.Sprite(K.arrows[c.dir]);
  arrow.scale.set(1.3, 1.3, 1);
  arrow.position.set(0, (c.dir > 0 ? 0 : H) + 2.2, 2.2);
  g.add(arrow);
  g.position.set(x, c.a * FLOOR_H, c.zNear);
  g.userData.arrow = arrow;
  g.userData.arrowY = arrow.position.y;
  return g;
}
