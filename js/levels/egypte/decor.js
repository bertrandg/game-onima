import * as THREE from 'three';
import { Builder, TexBuilder, U, pick, rand } from '../../geo.js';
import { Painter, S, PAPYRUS_SHAFT, PAPYRUS_CAP, AMPHORA, JAR, BOWL } from './shapes.js';
import { PAINT, decorAtlas } from './textures.js';
import { loadPlants, addPlant, plant } from '../../plants.js';

await loadPlants('egypte');   // palmiers (modèles de Quaternius, voir models/egypte/LICENSE.txt)

// Décor latéral de l'Égypte, en trois zones qui se suivent : l'allée des sphinx devant les temples,
// les bords du Nil, puis le souk. Chaque élément est construit face à +x (vers la voie quand il est
// à gauche), origine au sol, centré en z. Pièces lisses et peintes (statues, colonnes, jarres) dans la
// matière « eg » de l'atlas, flammes et ors dans « glow », pierre taillée et bois à facettes.

const STONE = '#e2c99a', STONE2 = '#d2b583', STONE3 = '#c4a273', GRANITE = '#c48a6a';
const WOOD = '#8a6038', WOOD2 = '#6a4628', BRONZE = '#b8823a', GOLD = PAINT.gold, BLUE = PAINT.blue;
const P = (b, t) => new Painter(b, t);

// matériaux des pièces lisses et lumineuses (créés au chargement du niveau)
export function makeTexMats() {
  const atlas = decorAtlas();
  return {
    eg: new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true }),
    glow: new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true }),
  };
}

// triangle peint dans le plan yz, face à +x (voiles latines, fanions)
const TRI = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1, 0, 1, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  g.setIndex([0, 1, 2]);
  return g;
})();
// pyramidion et obélisque : tronc de pyramide à base carrée (tourné de 45° pour avoir les faces à plat)
const FRUSTUM = new THREE.CylinderGeometry(0.71, 1, 1, 4, 1).rotateY(Math.PI / 4);
const PYRAMID = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);

// ---------- Visages et coiffes ----------
// visage kawaii sur une tête sphérique de rayon r centrée en c, tournée vers +x
function face(p, c, r, { eye = '#1a1410', blush = '#f08a8a', mouth = '#7a3a2a' } = {}) {
  const [x, y, z] = c;
  for (const s of [-1, 1]) {
    p.smooth(S.sphLo, eye, [x + r * 0.84, y + r * 0.06, z + s * r * 0.36], [r * 0.13, r * 0.18, r * 0.13]);
    p.glow(S.sphLo, '#ffffff', [x + r * 0.95, y + r * 0.14, z + s * r * 0.33], [r * 0.045, r * 0.05, r * 0.045]);
    p.flat(U.box, eye, [x + r * 0.8, y + r * 0.08, z + s * r * 0.62], [r * 0.05, r * 0.035, r * 0.3], [0, 0, 0]);   // trait de khôl
    p.flat(U.box, eye, [x + r * 0.86, y + r * 0.34, z + s * r * 0.36], [r * 0.05, r * 0.04, r * 0.26], [s * 0.2, 0, 0]);   // sourcils
    p.smooth(S.sphLo, blush, [x + r * 0.78, y - r * 0.2, z + s * r * 0.56], [r * 0.08, r * 0.06, r * 0.13]);
  }
  p.smooth(S.sphLo, mouth, [x + r * 0.95, y - r * 0.34, z], [r * 0.05, r * 0.04, r * 0.13]);
}

// némès (coiffe rayée bleu et or), uræus et barbe postiche, sur une tête de rayon r
function nemes(p, c, r, { beard = true, crown = false } = {}) {
  const [x, y, z] = c;
  p.paint(S.sph, 'nemes', [x - r * 0.16, y + r * 0.14, z], [r * 1.02, r * 1.08, r * 1.12]);
  p.flat(U.box, GOLD, [x + r * 0.55, y + r * 0.64, z], [r * 0.2, r * 0.16, r * 1.5]);   // bandeau du front
  for (const s of [-1, 1]) {   // pans qui tombent sur les épaules
    for (let i = 0; i < 6; i++) {
      p.flat(U.box, i % 2 ? BLUE : GOLD, [x + r * 0.15, y - r * (0.25 + i * 0.22), z + s * r * 0.92], [r * 0.4, r * 0.22, r * 0.18], [s * 0.1, 0, 0]);
    }
  }
  p.smooth(S.sphLo, GOLD, [x + r * 0.78, y + r * 0.82, z], [r * 0.1, r * 0.16, r * 0.1]);   // uræus
  p.glow(S.sphLo, '#ff3a2a', [x + r * 0.86, y + r * 0.88, z], [r * 0.03, r * 0.03, r * 0.03]);
  if (beard) {
    p.flat(U.box, BLUE, [x + r * 0.62, y - r * 0.78, z], [r * 0.2, r * 0.5, r * 0.18]);
    for (let i = 0; i < 3; i++) p.flat(U.box, GOLD, [x + r * 0.63, y - r * (0.62 + i * 0.16), z], [r * 0.21, r * 0.04, r * 0.19]);
  }
  if (crown) {   // double couronne : blanche en haut, rouge autour
    p.smooth(S.cyl, PAINT.red, [x - r * 0.2, y + r * 1.0, z], [r * 0.75, r * 0.5, r * 0.75]);
    p.smooth(S.cone, '#f4ecd8', [x - r * 0.2, y + r * 1.7, z], [r * 0.45, r * 1.2, r * 0.45]);
    p.smooth(S.sphLo, '#f4ecd8', [x - r * 0.2, y + r * 2.32, z], [r * 0.18, r * 0.2, r * 0.18]);
  }
}

// ---------- Allée des sphinx ----------
// sphinx couché sur son socle, tête de pharaon tournée vers la voie
function sphinx(b, t) {
  const p = P(b, t);
  const body = pick(['#e2bc7c', '#d8b070', '#e8c488']);
  // socle mouluré, disque ailé gravé sur la face avant
  p.flat(U.box, STONE3, [0, 0.12, 0], [3.9, 0.24, 1.9]);
  p.flat(U.box, STONE, [0, 0.72, 0], [3.6, 1.0, 1.6]);
  p.flat(U.box, STONE2, [0, 1.28, 0], [3.85, 0.14, 1.82]);
  p.panel('wing', [1.81, 0.72, 0], [1.5, 0.72]);
  p.panel('glyphCol', [0, 0.72, 0.81], [3.2, 0.5], '#ffffff', 0);
  const y = 1.35;
  // corps de lion : croupe, dos, poitrail, pattes avant allongées, queue enroulée
  p.smooth(S.sph, body, [-0.85, y + 0.42, 0], [0.62, 0.44, 0.58]);
  p.smooth(S.sph, body, [-0.15, y + 0.4, 0], [0.95, 0.4, 0.5]);
  p.smooth(S.sph, body, [0.55, y + 0.55, 0], [0.5, 0.56, 0.5]);
  for (const s of [-1, 1]) {
    p.smooth(S.sphLo, body, [-0.95, y + 0.24, s * 0.42], [0.52, 0.26, 0.2]);   // cuisses
    p.smooth(S.sphLo, body, [1.05, y + 0.12, s * 0.24], [0.62, 0.12, 0.15]);   // pattes avant
  }
  for (let k = 0; k < 4; k++) {
    const a = k * 0.6;
    p.smooth(S.sphLo, body, [-1.38 + Math.sin(a) * 0.25, y + 0.12 + k * 0.04, 0.5 - Math.cos(a) * 0.2], [0.08, 0.08, 0.08]);
  }
  // collier large sur le poitrail
  p.smooth(S.sphLo, PAINT.turq, [0.86, y + 0.62, 0], [0.18, 0.38, 0.46]);
  p.smooth(S.sphLo, GOLD, [0.9, y + 0.46, 0], [0.15, 0.2, 0.36]);
  // tête de pharaon
  const hc = [0.82, y + 1.28, 0], r = 0.34;
  p.smooth(S.sph, '#e8b478', hc, [r, r * 1.06, r * 0.96]);
  nemes(p, hc, r);
  face(p, hc, r);
}

// obélisque de granit rose gravé, pyramidion d'électrum
function obelisk(b, t) {
  const p = P(b, t);
  const H = rand(10, 13);
  p.flat(U.box, STONE3, [0, 0.25, 0], [1.9, 0.5, 1.9]);
  p.flat(U.box, STONE, [0, 0.8, 0], [1.5, 0.6, 1.5]);
  p.flat(FRUSTUM, GRANITE, [0, 1.1 + H / 2, 0], [0.62, H, 0.62]);
  const mid = (0.62 + 0.44) / 2 * 0.71;   // demi-largeur à mi-hauteur
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    p.panel('glyphCol', [Math.sin(a) * (mid + 0.02), 1.1 + H * 0.48, Math.cos(a) * (mid + 0.02)], [mid * 1.7, H * 0.9], '#ffd8c8', a);
  }
  p.glow(PYRAMID, '#ffd860', [0, 1.1 + H + 0.32, 0], [0.31, 0.64, 0.31]);
}

// palmier dattier : modèle de Quaternius (trois variantes) recoloré, couronne un peu resserrée, régimes
// de dattes sous les palmes. Feuilles et stipe se distinguent par leur couleur d'origine (vert / brun).
const PALMS = ['e_palm1', 'e_palm2', 'e_palm3'];
const isLeaf = (c) => c[1] > c[0];
const palmPaint = (role, part, i, up, orig) => {
  if (!isLeaf(orig)) return i % 3 ? '#8a6a42' : '#6e5232';
  return up > 0.6 ? '#7aae48' : up > 0.1 ? '#5a9a3a' : '#3f7a2c';
};
// sommet du stipe (relatif, modèle de hauteur 1) : le plus haut triangle brun
const crowns = {};
function crown(key) {
  if (crowns[key]) return crowns[key];
  const m = plant(key);
  let best = null;
  for (let i = 0; i < m.n; i++) {
    if (isLeaf(m.col.subarray(i * 3, i * 3 + 3))) continue;
    const o = i * 9, y = (m.pos[o + 1] + m.pos[o + 4] + m.pos[o + 7]) / 3;
    if (!best || y > best[1]) best = [(m.pos[o] + m.pos[o + 3] + m.pos[o + 6]) / 3, y, (m.pos[o + 2] + m.pos[o + 5] + m.pos[o + 8]) / 3];
  }
  return (crowns[key] = best);
}
function palm(b, t) {
  const p = P(b, t);
  const key = pick(PALMS), H = rand(6.8, 8.6), ry = rand(0, Math.PI * 2), k = rand(0.68, 0.8);
  const mat = addPlant(b, key, [0, 0, 0], H, palmPaint, { s: [k, k], ry });
  // le décor est tourné au hasard : la couronne ne dépasse pas 2,4 m de rayon autour du pied (comme
  // l'emprise prévue), pour que rien ne retombe au-dessus de la chaussée
  const g = b.parts[b.parts.length - 1], pos = g.attributes.position;
  let reach = 0;
  for (let i = 0; i < pos.count; i++) reach = Math.max(reach, Math.hypot(pos.getX(i), pos.getZ(i)));
  const squeeze = Math.min(1, 2.4 / reach);
  if (squeeze < 1) {
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * squeeze, pos.getY(i), pos.getZ(i) * squeeze);
    g.computeVertexNormals();
  }
  const top = new THREE.Vector3(...crown(key)).applyMatrix4(mat).multiply(new THREE.Vector3(squeeze, 1, squeeze));
  for (let c = 0; c < 3; c++) {   // régimes de dattes
    const a = c * 2.1 + 0.4;
    for (let n = 0; n < 5; n++) p.smooth(S.sphLo, n % 2 ? '#d87a2a' : '#c0502a', [top.x + Math.cos(a) * 0.32 + rand(-0.1, 0.1), top.y - 0.3 - n * 0.08, top.z + Math.sin(a) * 0.32 + rand(-0.1, 0.1)], [0.1, 0.12, 0.1]);
  }
}

// brasero de bronze sur trépied, flammes vives
function brazier(b, t) {
  const p = P(b, t);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.flat(U.box, '#5a3a1c', [Math.cos(a) * 0.32, 0.65, Math.sin(a) * 0.32], [0.06, 1.35, 0.06], [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]);
  }
  p.smooth(BOWL(), BRONZE, [0, 1.2, 0], [1.0, 1.0, 1.0]);
  p.smooth(S.torus, GOLD, [0, 1.5, 0], [0.55, 0.55, 0.55], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) p.glow(S.sphLo, '#ff6a1a', [rand(-0.25, 0.25), 1.42, rand(-0.25, 0.25)], [0.1, 0.06, 0.1]);
  p.glow(S.cone, '#ff8a1a', [0, 1.85, 0], [0.32, 0.8, 0.32]);
  p.glow(S.cone, '#ffd040', [0.05, 1.8, 0.04], [0.2, 0.62, 0.2]);
  p.glow(S.cone, '#fff4b0', [0, 1.7, 0], [0.1, 0.36, 0.1]);
}

// ---------- Temples ----------
const BW = 7, BLEN = 16;   // profondeur et longueur des grandes façades
// pylône : tour de grès au mur en fruit, grand relief, corniche à gorge, disque ailé, mâts à oriflammes
function pylon(b, t) {
  const p = P(b, t);
  const H = rand(18, 22), tilt = 0.065, x0 = 3.0;
  const xAt = (y) => x0 - Math.tan(tilt) * y;
  p.flat(U.box, STONE2, [-0.6, H / 2, 0], [4.8, H, BLEN]);
  p.flat(U.box, STONE, [xAt(H / 2) - 0.5, H / 2, 0], [1.0, H / Math.cos(tilt), BLEN - 0.02], [0, 0, tilt]);
  // reliefs : pharaon et dieu en bas, registres de hiéroglyphes au-dessus
  const relief = (y, h, region, z, w) => p.panel(region, [xAt(y) + 0.02, y, z], [w, h / Math.cos(tilt)], '#ffffff', Math.PI / 2, tilt);
  relief(5.2, 8, 'pylon', 0, 15.2);
  for (let y = 9.2; y < H - 2.5; y += 4) for (const z of [-5.7, -1.9, 1.9, 5.7]) relief(y + 2, 4, 'wall', z, 3.8);
  // tores d'angle et corniche à gorge
  for (const z of [-BLEN / 2, BLEN / 2]) p.smooth(S.cylLo, STONE3, [xAt(H / 2), H / 2, z], [0.24, H, 0.24], [0, 0, tilt]);
  p.smooth(S.cylLo, STONE3, [xAt(H), H, 0], [0.24, BLEN, 0.24], [Math.PI / 2, 0, 0]);
  p.panel('gorge', [xAt(H) + 0.45, H + 0.8, 0], [BLEN + 0.6, 1.8], '#ffffff', Math.PI / 2, -0.5);
  p.flat(U.box, STONE, [xAt(H) - 1.6, H + 1.85, 0], [5.6, 0.4, BLEN + 0.8]);
  p.panel('wing', [xAt(H - 1.5) + 0.03, H - 1.5, 0], [6, 1.5], '#ffffff', Math.PI / 2, tilt);
  // mâts de cèdre dans leurs niches, oriflammes rouges et blanches qui flottent
  for (const z of [-4.2, 4.2]) {
    p.flat(U.box, shadeHex(STONE2, 0.8), [xAt(4) + 0.05, H * 0.45, z], [0.2, H * 0.9, 1.0]);
    p.smooth(S.cylLo, '#9a7044', [x0 + 0.6, (H + 6) / 2, z], [0.18, H + 6, 0.18]);
    p.glow(S.cone, GOLD, [x0 + 0.6, H + 6.3, z], [0.22, 0.6, 0.22]);
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < 6; i++) {
        p.flat(U.box, k ? '#f4ecd8' : PAINT.red, [x0 + 0.6, H + 5 - k * 1.2 - i * 0.05, z - 0.35 - i * 0.55], [0.03, 0.45 - i * 0.05, 0.56], [Math.sin(i + k) * 0.25, 0, 0]);
      }
    }
    p.smooth(S.box, '#1a1410', [x0 + 0.62, 2.2, z], [0.4, 0.2, 0.4]);
  }
}

// portique à colonnes papyriformes peintes, mur du fond couvert de reliefs, architrave, corniche
function colonnade(b, t) {
  const p = P(b, t);
  p.flat(U.box, STONE3, [0, 0.4, 0], [BW, 0.8, BLEN]);
  p.flat(U.box, STONE2, [-3.2, 6, 0], [0.6, 12, BLEN]);
  for (const z of [-6, -2, 2, 6]) for (const y of [3.0, 7.0]) p.panel('wall', [-2.89, y, z], [4, 4]);
  p.flat(U.box, '#5a4630', [-1.0, 10.9, 0], [4.6, 0.3, BLEN]);   // plafond (vu d'en dessous)
  p.flat(U.box, STONE, [0, 11.4, 0], [BW, 0.8, BLEN]);
  p.flat(U.box, STONE, [2.2, 10.35, 0], [1.3, 1.1, BLEN]);   // architrave
  for (const z of [-6, -2, 2, 6]) p.panel('wing', [2.86, 10.35, z], [4, 1.0]);
  p.panel('gorge', [3.0, 12.4, 0], [BLEN + 0.4, 1.4], '#ffffff', Math.PI / 2, -0.5);
  p.flat(U.box, STONE2, [0.4, 13.2, 0], [BW - 0.6, 0.3, BLEN + 0.6]);
  for (const z of [-6, -2, 2, 6]) {
    p.flat(U.cyl, STONE2, [2.2, 0.95, z], [0.95, 0.3, 0.95]);
    p.paint(PAPYRUS_SHAFT(), 'colBands', [2.2, 1.1, z], [1.65, 6.9, 1.65]);
    p.paint(PAPYRUS_CAP(), 'gorge', [2.2, 7.95, z], [1.25, 1.5, 1.25]);
    p.flat(U.box, STONE2, [2.2, 9.6, z], [1.3, 0.3, 1.3]);
  }
  // offrandes entre les colonnes : jarres et bouquets de lotus
  for (const z of [-4, 0, 4]) if (Math.random() < 0.6) {
    p.smooth(AMPHORA(), '#c46a3a', [0.6, 0.8, z], [0.8, 1.0, 0.8]);
    p.smooth(S.cyl, BLUE, [0.6, 1.25, z], [0.37, 0.06, 0.37]);
  }
}

// colosse assis devant le mur d'enceinte (pharaon à la double couronne)
function colossus(b, t) {
  const p = P(b, t);
  p.flat(U.box, STONE2, [-2.6, 6, 0], [1.6, 12, BLEN]);
  for (const z of [-6, -2, 2, 6]) for (const y of [2.4, 6.4]) p.panel('wall', [-1.79, y, z], [4, 4]);
  p.panel('gorge', [-1.6, 12.6, 0], [BLEN, 1.4], '#ffffff', Math.PI / 2, -0.5);
  p.flat(U.box, STONE, [-2.3, 13.4, 0], [2.4, 0.3, BLEN + 0.4]);
  // socle et trône gravés
  const sk = '#c87a4a';
  p.flat(U.box, STONE3, [0.6, 0.6, 0], [4.4, 1.2, 4.2]);
  p.panel('glyphCol', [2.81, 0.6, 0], [3.8, 0.9]);
  p.flat(U.box, STONE, [-0.2, 3.0, 0], [3.0, 3.6, 3.4]);
  for (const s of [-1, 1]) p.panel('pylon', [-0.2, 3.0, s * 1.71], [2.8, 3.0], '#ffffff', s > 0 ? 0 : Math.PI);
  p.flat(U.box, STONE, [-1.3, 6.6, 0], [0.8, 4.2, 3.2]);   // dossier
  // jambes, pagne, torse, bras posés sur les genoux
  for (const s of [-1, 1]) {
    p.smooth(S.sph, sk, [0.9, 4.95, s * 0.62], [1.5, 0.48, 0.55]);
    p.smooth(S.cyl, sk, [2.2, 2.85, s * 0.62], [0.42, 3.4, 0.42]);
    p.smooth(S.sph, sk, [2.45, 1.3, s * 0.62], [0.55, 0.16, 0.34]);
    p.smooth(S.sph, sk, [0.0, 7.4, s * 1.18], [0.42, 0.52, 0.42]);   // épaules
    p.smooth(S.cyl, sk, [0.15, 6.3, s * 1.2], [0.3, 1.9, 0.3], [0, 0, 0.12]);
    p.smooth(S.cyl, sk, [1.2, 5.25, s * 1.08], [0.26, 2.0, 0.26], [0, 0, -1.35]);
    p.smooth(S.sph, sk, [2.25, 5.2, s * 1.0], [0.36, 0.2, 0.28]);   // mains
  }
  p.smooth(S.sph, '#f4ecd8', [0.8, 5.25, 0], [1.25, 0.42, 1.25]);   // pagne
  p.flat(U.box, GOLD, [1.95, 5.1, 0], [0.3, 0.7, 0.4]);
  p.smooth(S.sph, sk, [-0.1, 6.8, 0], [0.75, 1.5, 1.08]);
  p.smooth(S.sph, PAINT.turq, [0.32, 7.75, 0], [0.48, 0.55, 1.05]);   // pectoral
  p.smooth(S.sph, GOLD, [0.4, 7.55, 0], [0.4, 0.3, 0.85]);
  const hc = [0.15, 8.9, 0], r = 0.78;
  p.smooth(S.sph, sk, hc, [r, r * 1.08, r * 0.95]);
  nemes(p, hc, r, { crown: true });
  face(p, hc, r);
}

// mur d'enceinte couvert de reliefs (entre deux grands monuments)
function templeWall(b, t) {
  const p = P(b, t);
  const H = rand(8.5, 10.5);
  p.flat(U.box, STONE2, [-0.8, H / 2, 0], [2.4, H, BLEN]);
  p.flat(U.box, STONE3, [0.5, 0.3, 0], [0.4, 0.6, BLEN]);
  for (const z of [-6, -2, 2, 6]) {
    p.panel('wall', [0.41, 2.6, z], [4, 4]);
    p.panel('wall', [0.41, 6.6, z], [4, 4], '#f8f0e4');
  }
  p.smooth(S.cylLo, STONE3, [0.42, H - 0.1, 0], [0.2, BLEN, 0.2], [Math.PI / 2, 0, 0]);
  p.panel('gorge', [0.85, H + 0.6, 0], [BLEN + 0.2, 1.4], '#ffffff', Math.PI / 2, -0.5);
  p.flat(U.box, STONE, [-0.6, H + 1.3, 0], [3.0, 0.3, BLEN + 0.2]);
}

// ---------- Bords du Nil ----------
// touffe de papyrus : tiges fines et ombelles en éventail
function papyrus(b, t) {
  const p = P(b, t);
  const n = 9 + ((Math.random() * 6) | 0);
  p.smooth(S.sphLo, '#5a7a3a', [0, 0.05, 0], [0.55, 0.12, 0.55]);
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0, 0.35), h = rand(1.6, 2.9), lx = Math.cos(a) * rand(0.05, 0.25), lz = Math.sin(a) * rand(0.05, 0.25);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    p.smooth(S.cylLo, '#5a9a3a', [x + lx / 2, h / 2, z + lz / 2], [0.025, h, 0.025], [lz / h, 0, -lx / h]);
    p.smooth(S.cone, '#6aa83e', [x + lx, h + 0.06, z + lz], [0.12, 0.2, 0.12], [Math.PI, 0, 0]);
    for (let k = 0; k < 7; k++) {
      const ka = (k / 7) * Math.PI * 2;
      b.add(U.box, k % 2 ? '#8ac24a' : '#a2d45a', [x + lx + Math.cos(ka) * 0.16, h + 0.2, z + lz + Math.sin(ka) * 0.16], [0.36, 0.015, 0.05], [0, -ka, 0.5]);
    }
  }
}

// chadouf : balancier pour puiser l'eau, seau de cuir côté fleuve (-x), contrepoids de terre côté voie
function shaduf(b, t) {
  const p = P(b, t);
  for (const z of [-0.45, 0.45]) p.flat(U.box, WOOD2, [0, 1.1, z], [0.18, 2.2, 0.18]);
  p.flat(U.box, WOOD2, [0, 2.2, 0], [0.16, 0.16, 1.2]);
  p.flat(U.box, WOOD, [-0.2, 2.6, 0], [4.6, 0.12, 0.12], [0, 0, 0.35]);
  p.smooth(S.sph, '#8a6a4a', [1.95, 1.75, 0], [0.38, 0.34, 0.38]);
  p.flat(U.box, '#5a4a3a', [-2.32, 2.15, 0], [0.02, 1.9, 0.02]);
  p.smooth(S.cyl, '#7a4a28', [-2.32, 1.15, 0], [0.2, 0.32, 0.2]);
  p.smooth(S.cyl, '#3a8aa8', [-2.32, 1.3, 0], [0.17, 0.02, 0.17]);
  p.smooth(S.sphLo, '#7a6a4a', [-0.3, 0.1, 0.4], [0.6, 0.1, 0.4]);
}

// jarres et amphores peintes, posées dans le sable
function jars(b, t) {
  const p = P(b, t);
  p.flat(U.box, '#d8b884', [0, 0.04, 0], [1.2, 0.08, 2.0]);   // natte de jonc
  const n = 3 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const big = Math.random() < 0.5, s = big ? rand(0.9, 1.2) : rand(0.55, 0.8);
    const x = rand(-0.5, 0.5), z = -0.8 + i * 0.45 + rand(-0.1, 0.1);
    const clay = pick(['#c46a3a', '#b8582e', '#d88a4a', '#e8d2a8']);
    p.smooth(big ? AMPHORA() : JAR(), clay, [x, 0, z], [s * 0.7, s, s * 0.7], [rand(-0.05, 0.05), rand(0, 6), 0]);
    p.smooth(S.cyl, pick([BLUE, PAINT.black, PAINT.red]), [x, s * 0.5, z], [s * 0.34, s * 0.05, s * 0.34]);
    p.smooth(S.cyl, PAINT.white, [x, s * 0.58, z], [s * 0.33, s * 0.02, s * 0.33]);
  }
}

// ibis blanc à tête noire qui pêche
function ibis(b, t) {
  const p = P(b, t);
  for (const z of [-0.08, 0.08]) p.smooth(S.cylLo, '#3a3030', [0, 0.32, z], [0.015, 0.64, 0.015]);
  p.smooth(S.sph, '#f6f2ea', [-0.05, 0.78, 0], [0.32, 0.2, 0.18], [0, 0, -0.2]);
  p.smooth(S.sph, '#2a2420', [-0.35, 0.72, 0], [0.12, 0.08, 0.12]);   // plumes de la queue
  for (let i = 0; i < 4; i++) p.smooth(S.sphLo, '#2a2420', [0.22 + i * 0.05, 0.9 + i * 0.12 - i * i * 0.01, 0], [0.05, 0.07, 0.05]);
  p.smooth(S.sph, '#2a2420', [0.42, 1.27, 0], [0.09, 0.08, 0.08]);
  for (let i = 0; i < 5; i++) p.flat(U.box, '#2a2420', [0.52 + i * 0.07, 1.25 - i * i * 0.012, 0], [0.08, 0.025, 0.025], [0, 0, -0.15 * i]);
  for (const s of [-1, 1]) p.glow(S.sphLo, '#ffffff', [0.46, 1.3, s * 0.06], [0.015, 0.015, 0.015]);
}

// le Nil : eau qui scintille, berge de limon, roseaux sur l'autre rive et felouque à voile latine
function river(b, t) {
  const p = P(b, t);
  const W = 14;
  // berge de limon côté voie (+x)
  // (le sol général du niveau est en y = 0 : l'eau est posée juste au-dessus, les berges aussi)
  p.flat(U.box, '#8a6a48', [W / 2 - 0.3, 0.06, 0], [0.6, 0.12, BLEN]);
  p.flat(U.box, '#a8885e', [W / 2 - 0.05, 0.1, 0], [0.3, 0.08, BLEN]);
  p.paint(S.plane, 'water', [0, 0.035, 0], [W, BLEN, 1], [-Math.PI / 2, 0, 0], '#e8f4ff');
  for (let i = 0; i < 6; i++) p.glow(S.box, '#f8fcff', [rand(-4, 4), 0.045, rand(-7, 7)], [rand(0.3, 1.2), 0.01, 0.06]);   // reflets du soleil
  // berge opposée : roseaux et palmiers
  p.flat(U.box, '#7a8a3a', [-W / 2 + 0.2, 0.08, 0], [0.6, 0.16, BLEN]);
  for (let i = 0; i < 14; i++) {
    const z = -BLEN / 2 + i * 1.15, h = rand(1, 2);
    p.flat(U.box, '#6a9a3a', [-W / 2 + 0.3, h / 2, z], [0.08, h, 0.25], [rand(-0.2, 0.2), 0, rand(-0.2, 0.2)]);
  }
  if (Math.random() < 0.6) {   // felouque
    const z = rand(-3, 3), x = rand(-2, 1.5);
    p.smooth(S.sph, '#7a4a28', [x, 0.12, z], [0.75, 0.38, 2.6]);
    p.flat(U.box, '#a8784a', [x, 0.45, z], [1.2, 0.06, 4.2]);
    p.smooth(S.sph, PAINT.blue, [x, 0.32, z], [0.77, 0.06, 2.62]);
    p.smooth(S.cylLo, WOOD2, [x, 2.8, z + 0.6], [0.06, 5, 0.06]);
    p.smooth(S.cylLo, WOOD2, [x, 3.5, z - 0.6], [0.05, 6.6, 0.05], [1.0, 0, 0]);
    p.paint(TRI, 'sail', [x + 0.05, 0.8, z + 2.9], [1, 5.6, 5.8], [0, 0, 0]);
    p.smooth(S.sph, '#c46a3a', [x - 0.2, 0.82, z - 1.2], [0.18, 0.22, 0.18]);   // batelier
    p.smooth(S.sph, '#f4ecd8', [x - 0.2, 1.12, z - 1.2], [0.14, 0.15, 0.14]);
  }
}

// palmeraie sur l'autre rive (lointain : modèle simplifié)
function farPalms(b) {
  for (let i = 0; i < 5; i++) {
    const z = -6 + i * 3 + rand(-0.8, 0.8), x = rand(-2, 2), h = rand(5, 8);
    addPlant(b, 'e_palmfar', [x, 0, z], h, palmPaint, { s: [0.8, 0.8], ry: rand(0, Math.PI * 2) });
  }
  b.add(U.box, '#c8a074', [2, 1.2, 4], [3, 2.4, 3]);   // maison de terre
  b.add(U.box, '#b08860', [2, 2.5, 4], [3.2, 0.2, 3.2]);
}

// ---------- Souk ----------
// étal d'épices : pyramides de poudres colorées, sacs ouverts, store rayé sur perches
function spiceStall(b, t) {
  const p = P(b, t);
  p.flat(U.box, WOOD, [0, 0.45, 0], [1.4, 0.9, 2.8]);
  p.panel(pick(['carpet0', 'carpet1', 'carpet2', 'carpet3']), [0.71, 0.5, 0], [2.7, 0.8]);
  const spices = ['#d8402a', '#e8a838', '#f2d23a', '#6a9a3a', '#8a4a2a', '#c8702a'];
  for (let i = 0; i < 6; i++) {
    const z = -1.05 + (i % 3) * 1.05, x = i < 3 ? 0.3 : -0.3, c = spices[i];
    p.smooth(BOWL(), '#e8d8b8', [x, 0.9, z], [0.75, 0.6, 0.75]);
    p.smooth(S.cone, c, [x, 1.2, z], [0.32, 0.5, 0.32]);
  }
  for (const z of [-1.8, 1.8]) {   // sacs de jute retroussés
    p.smooth(S.sph, '#c8a878', [0.3, 0.4, z], [0.38, 0.42, 0.36]);
    p.smooth(S.cyl, pick(spices), [0.3, 0.78, z], [0.3, 0.06, 0.28]);
  }
  for (const [x, z] of [[0.8, -1.4], [0.8, 1.4], [-0.7, -1.4], [-0.7, 1.4]]) p.flat(U.box, WOOD2, [x, 1.3, z], [0.07, 2.6 - (x < 0 ? -0.3 : 0), 0.07]);
  p.panel('awning', [0.05, 2.75, 0], [3.1, 1.8], '#ffffff', Math.PI / 2, 1.15);
  for (let i = 0; i < 7; i++) p.flat(TRI, i % 2 ? PAINT.red : '#f4ecd8', [0.84, 2.42, -1.4 + i * 0.42 + 0.42], [1, 0.22, 0.42], [Math.PI, 0, 0]);   // franges
}

// étal de poteries vernissées
function potteryStall(b, t) {
  const p = P(b, t);
  for (const y of [0.4, 1.1]) p.flat(U.box, WOOD, [0, y, 0], [1.2, 0.08, 2.6]);
  for (const z of [-1.25, 1.25]) for (const x of [-0.55, 0.55]) p.flat(U.box, WOOD2, [x, 0.7, z], [0.07, 1.4, 0.07]);
  const glazes = ['#2a7ab0', '#3aa8a0', '#c46a3a', '#e8d2a8', '#4a9a5a', '#d8a838'];
  for (const y of [0.44, 1.14]) {
    for (let i = 0; i < 5; i++) {
      const s = rand(0.38, 0.55);
      p.smooth(Math.random() < 0.5 ? JAR() : AMPHORA(), pick(glazes), [rand(-0.25, 0.25), y, -1.0 + i * 0.5], [s * 0.8, s, s * 0.8]);
    }
  }
  for (let i = 0; i < 3; i++) p.smooth(BOWL(), pick(glazes), [0.2, 0, -0.6 + i * 0.6], [0.6, 0.6, 0.6]);
}

// marchand de lanternes : armature de cuivre et verres colorés qui brillent
function lanternStall(b, t) {
  const p = P(b, t);
  for (const z of [-1.1, 1.1]) p.flat(U.box, WOOD2, [0, 1.3, z], [0.1, 2.6, 0.1]);
  p.flat(U.box, WOOD2, [0, 2.55, 0], [0.1, 0.1, 2.4]);
  const glass = ['#ffb040', '#ff6a8a', '#6ad0ff', '#a8ff7a', '#ffe070'];
  for (let i = 0; i < 5; i++) {
    const z = -0.9 + i * 0.45, y = 2.0 - (i % 2) * 0.3;
    p.flat(U.box, '#3a2a1a', [0, (2.55 + y) / 2, z], [0.01, 2.55 - y, 0.01]);
    p.glow(S.sphLo, glass[i], [0, y - 0.18, z], [0.13, 0.2, 0.13]);
    p.smooth(S.cone, BRONZE, [0, y + 0.08, z], [0.15, 0.18, 0.15]);
    p.smooth(S.cone, BRONZE, [0, y - 0.44, z], [0.1, 0.12, 0.1], [Math.PI, 0, 0]);
  }
  p.flat(U.box, '#7a5a3a', [0, 0.35, 0], [0.9, 0.7, 2.2]);
  for (let i = 0; i < 4; i++) p.glow(S.sphLo, pick(glass), [0.1, 0.82, -0.75 + i * 0.5], [0.14, 0.14, 0.14]);
}

// portant à tapis : trois tapis suspendus
function carpetRack(b, t) {
  const p = P(b, t);
  for (const z of [-1.5, 1.5]) p.flat(U.box, WOOD2, [0, 1.3, z], [0.1, 2.6, 0.1]);
  p.flat(U.box, WOOD2, [0, 2.58, 0], [0.1, 0.1, 3.2]);
  for (let i = 0; i < 3; i++) {
    const r = pick(['carpet0', 'carpet1', 'carpet2', 'carpet3']);
    p.panel(r, [0.06 - i * 0.12, 1.5, -0.95 + i * 0.95], [0.9, 2.0]);
    p.panel(r, [-0.06 - i * 0.12, 1.5, -0.95 + i * 0.95], [0.9, 2.0], '#d8d0c8', -Math.PI / 2);
  }
  p.flat(U.box, '#a82a2a', [0.4, 0.2, 0], [0.8, 0.4, 1.2]);   // tapis roulés
  p.smooth(S.cyl, '#1f3f8a', [0.4, 0.55, 0.2], [0.18, 1.3, 0.18], [Math.PI / 2, 0, 0]);
}

// chameau couché, tapis de selle à pompons
function camel(b, t) {
  const p = P(b, t);
  const fur = pick(['#d8b07a', '#c89a68', '#e2c08a']);
  p.smooth(S.sph, fur, [-0.2, 0.62, 0], [1.05, 0.55, 0.55]);
  p.smooth(S.sph, fur, [-0.25, 1.15, 0], [0.42, 0.42, 0.38]);   // bosse
  for (const s of [-1, 1]) {
    p.smooth(S.sph, fur, [0.55, 0.2, s * 0.32], [0.5, 0.16, 0.16]);
    p.smooth(S.sph, fur, [-0.9, 0.22, s * 0.36], [0.42, 0.2, 0.18]);
  }
  for (let i = 0; i < 5; i++) p.smooth(S.sphLo, fur, [0.75 + i * 0.13, 0.85 + i * 0.2 - (i > 3 ? 0.08 : 0), 0], [0.2 - i * 0.012, 0.22, 0.18 - i * 0.01]);
  const hc = [1.38, 1.72, 0], r = 0.26;
  p.smooth(S.sph, fur, hc, [r * 1.2, r, r * 0.9]);
  p.smooth(S.sph, shadeHex(fur, 1.06), [1.68, 1.64, 0], [0.16, 0.14, 0.15]);   // museau
  for (const s of [-1, 1]) p.smooth(S.sphLo, fur, [1.24, 1.98, s * 0.14], [0.05, 0.09, 0.05]);
  face(p, [hc[0] + 0.04, hc[1], 0], r, { blush: '#f09a8a' });
  // tapis de selle rouge à bordure dorée, pompons
  p.smooth(S.sph, PAINT.red, [-0.25, 1.0, 0], [0.62, 0.36, 0.6]);
  p.smooth(S.torus, GOLD, [-0.25, 1.02, 0], [0.62, 0.62, 0.62], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) p.glow(S.sphLo, pick(['#ffd040', '#4a9aff', '#ff6a8a']), [-0.75 + i * 0.2, 0.7, 0.62], [0.06, 0.08, 0.06]);
  p.flat(U.box, PAINT.blue, [1.15, 1.45, 0], [0.06, 0.08, 0.5], [0, 0, 0.8]);   // licol
}

// maisons de terre crue du souk : moucharabiehs, portes bleues, stores, tapis aux fenêtres
function houses(b, t) {
  const p = P(b, t);
  const splits = pick([[8, 8], [6, 5, 5], [5, 6, 5], [5.5, 5, 5.5]]);
  let z = BLEN / 2;
  for (const w of splits) {
    const zc = z - w / 2, H = rand(7, 12), D = 7;
    const tint = pick(['#f2e2c8', '#ffffff', '#e8d6d0', '#f4dcc0', '#dce8f0']);
    const body = pick(['#c8a07a', '#d2ae86', '#bca088', '#d8b8a0']);
    p.flat(U.box, body, [-D / 2 + 0.3, H / 2, zc], [D, H, w - 0.05]);
    for (let yy = 0; yy < H - 0.5; yy += 4) for (let zz = -w / 2; zz < w / 2 - 0.1; zz += 4) {
      const pw = Math.min(4, w / 2 - zz), ph = Math.min(4, H - yy);
      p.panel('mud', [0.32, yy + ph / 2, zc + zz + pw / 2], [pw, ph], tint);
    }
    // porte bleue et encadrement
    const dz = zc + rand(-w / 4, w / 4);
    p.panel('door', [0.34, 1.65, dz], [1.6, 3.3]);
    p.flat(U.box, '#f2ead8', [0.36, 3.4, dz], [0.12, 0.25, 1.9]);
    // auvent de boutique au rez-de-chaussée
    if (Math.random() < 0.7) {
      const az = zc + (dz > zc ? -w / 4 : w / 4);
      p.panel('awning', [0.95, 3.4, az], [Math.min(3, w / 2), 1.6], '#ffffff', Math.PI / 2, 1.05);
      p.flat(U.box, '#4a2e1c', [0.34, 1.5, az], [0.06, 2.2, Math.min(2.2, w / 2 - 0.6)]);   // échoppe ouverte
      for (let k = 0; k < 4; k++) p.smooth(JAR(), pick(['#c46a3a', '#2a7ab0', '#e8d2a8']), [0.6, 0.0, az - 0.75 + k * 0.5], [0.22, 0.32, 0.22]);
      p.glow(S.sphLo, '#ffd890', [0.6, 2.6, az], [0.12, 0.16, 0.12]);
    }
    // étages : fenêtres en arc, moucharabieh en saillie, tapis pendu
    for (let fy = 4.6; fy < H - 1.6; fy += 3.2) {
      const nW = Math.max(1, Math.floor(w / 2.6));
      for (let k = 0; k < nW; k++) {
        const wz = zc - w / 2 + (k + 0.5) * (w / nW);
        if (Math.random() < 0.35) {
          p.flat(U.box, WOOD2, [0.75, fy, wz], [0.8, 2.0, 1.5]);
          p.panel('mashra', [1.16, fy, wz], [1.3, 1.75]);
          p.flat(U.box, WOOD, [0.8, fy + 1.1, wz], [1.0, 0.16, 1.7]);
          p.flat(U.box, WOOD, [0.8, fy - 1.05, wz], [1.0, 0.12, 1.7]);
        } else {
          p.flat(U.box, '#2a1c14', [0.34, fy, wz], [0.06, 1.3, 0.8]);
          p.smooth(S.cyl, '#2a1c14', [0.34, fy + 0.65, wz], [0.4, 0.06, 0.4], [0, 0, Math.PI / 2]);
          p.flat(U.box, '#f2ead8', [0.4, fy - 0.72, wz], [0.2, 0.1, 1.0]);
          if (Math.random() < 0.3) p.panel(pick(['carpet0', 'carpet1', 'carpet2', 'carpet3']), [0.46, fy - 1.3, wz], [1.0, 1.3]);
          else if (Math.random() < 0.4) p.smooth(JAR(), '#c46a3a', [0.55, fy - 0.68, wz], [0.3, 0.38, 0.3]);
        }
      }
    }
    // toit : acrotère crénelé, jarres, ombrière de palmes ou pigeonnier
    p.flat(U.box, body, [0.15, H + 0.3, zc], [0.4, 0.6, w - 0.05]);
    for (let zz = -w / 2 + 0.4; zz < w / 2; zz += 0.9) p.flat(U.box, body, [0.15, H + 0.75, zc + zz], [0.4, 0.3, 0.45]);
    if (Math.random() < 0.4) {
      p.smooth(S.cone, '#d8b890', [-2, H + 2, zc], [1.2, 4, 1.2]);
      for (let i = 0; i < 8; i++) p.flat(U.box, '#3a2a1a', [-2 + Math.cos(i) * 0.7, H + 1 + (i % 3) * 0.8, zc + Math.sin(i) * 0.7], [0.12, 0.12, 0.12]);
    } else {
      for (const [x, zz] of [[-1, -1.5], [-1, 1.5], [-3, -1.5], [-3, 1.5]]) p.flat(U.box, WOOD2, [x, H + 1.2, zc + zz], [0.1, 2.4, 0.1]);
      p.flat(U.box, '#a8945a', [-2, H + 2.4, zc], [2.6, 0.12, 3.6]);
    }
    z -= w;
  }
  shiftX(b, t, DECOR.houses.w / 2 - 1.2);   // façade (balcons compris) au bord avant de l'élément
}

// décale tout un élément en x (après coup)
function shiftX(b, t, dx) {
  for (const g of b.parts) g.translate(dx, 0, 0);
  for (const k of Object.keys(t.parts)) for (const g of t.parts[k]) g.translate(dx, 0, 0);
}

// ---------- Sols des zones ----------
const STRIP = 32;
function templeGround(b) {   // dallage de grès en bordure de l'allée, sable qui s'y dépose
  b.add(U.box, '#d8bc8a', [0, 0.06, 0], [3.4, 0.12, STRIP]);
  for (let i = 0; i <= 16; i++) b.add(U.box, '#b8986a', [0, 0.122, -STRIP / 2 + i * 2], [3.4, 0.006, 0.06]);
  b.add(U.box, '#b8986a', [0.2, 0.122, 0], [0.06, 0.006, STRIP]);
  for (let i = 0; i < 10; i++) b.add(U.box, pick(['#e8cc96', '#f0d8a8']), [rand(-1.4, 1.2), 0.125, rand(-15, 15)], [rand(0.4, 1.4), 0.01, rand(0.6, 2)]);
  b.add(U.box, '#c8a878', [1.6, 0.14, 0], [0.24, 0.28, STRIP]);
}
function bank(b) {   // berge de sable et de limon, touffes d'herbe
  b.add(U.box, '#d8b884', [0, 0.05, 0], [3.4, 0.1, STRIP]);
  for (let i = 0; i < 16; i++) {   // touffes d'herbe : quelques brins fins et penchés
    const x = rand(-1.4, 1.4), z = rand(-15.5, 15.5), c = pick(['#8aae4a', '#6a9a3a', '#a2be5a']);
    for (let k = 0; k < 4; k++) b.add(U.box, c, [x + (k - 1.5) * 0.05, 0.22, z], [0.025, rand(0.25, 0.4), 0.05], [rand(-0.3, 0.3), 0, (k - 1.5) * 0.25]);
  }
  for (let i = 0; i < 12; i++) b.add(U.box, pick(['#b8a088', '#a89070']), [rand(-1.5, 1.5), 0.11, rand(-15.5, 15.5)], [0.2, 0.08, 0.16], [0, rand(0, 3), 0]);
  b.add(U.box, '#c8a070', [1.6, 0.12, 0], [0.2, 0.22, STRIP]);
}
function souqGround(b) {   // terre battue, pierres plates, paille
  b.add(U.box, '#c9a676', [0, 0.05, 0], [3.4, 0.1, STRIP]);
  for (let i = 0; i < 16; i++) b.add(U.box, pick(['#b8946a', '#d4b486', '#a8865e']), [rand(-1.4, 1.4), 0.105, rand(-15, 15)], [rand(0.4, 0.9), 0.01, rand(0.4, 0.9)], [0, rand(0, 3), 0]);
  for (let i = 0; i < 20; i++) b.add(U.box, '#e8d080', [rand(-1.5, 1.5), 0.105, rand(-15.5, 15.5)], [0.3, 0.01, 0.02], [0, rand(0, 3), 0]);
  b.add(U.box, '#a88a62', [1.6, 0.12, 0], [0.2, 0.22, STRIP]);
}

// ---------- Portes et guirlandes au-dessus de l'avenue (une seule matière : facettes) ----------
// porte monumentale entre deux pylônes, linteau orné du disque ailé, tourné vers le joueur (+z)
function pylonGate(b) {
  for (const s of [-1, 1]) {
    b.add(U.box, STONE2, [s * 8.6, 9, 0], [6.4, 18, 4.0]);
    b.add(U.box, STONE, [s * 5.75, 6, 0], [0.7, 12, 3.0]);
    // face avant : deux registres, chacun avec un pharaon peint et des colonnes de hiéroglyphes gravés
    const cx = s * 8.6, fz = 2.02;
    for (const ry of [2.2, 9.6]) {
      for (const dy of [0, 6.2]) b.add(U.box, BLUE, [cx, ry + dy, fz], [5.8, 0.12, 0.03]);
      const px = cx - s * 1.6;
      b.add(U.box, '#b8603a', [px, ry + 3.4, fz], [0.9, 2.0, 0.04]);              // torse
      b.add(U.box, '#f4ecd8', [px, ry + 1.9, fz], [1.1, 1.1, 0.04]);              // pagne
      for (const lx of [-0.25, 0.25]) b.add(U.box, '#b8603a', [px + lx, ry + 0.75, fz], [0.28, 1.3, 0.04]);
      b.add(U.box, '#b8603a', [px, ry + 4.85, fz], [0.6, 0.75, 0.04]);            // tête
      b.add(U.box, GOLD, [px - s * 0.1, ry + 5.1, fz + 0.01], [0.8, 0.6, 0.04]);   // némès
      b.add(U.box, BLUE, [px - s * 0.1, ry + 5.15, fz + 0.02], [0.8, 0.1, 0.04]);
      b.add(U.box, PAINT.turq, [px, ry + 4.3, fz + 0.01], [1.2, 0.25, 0.04]);     // collier
      b.add(U.box, '#b8603a', [px + s * 0.75, ry + 3.9, fz], [1.0, 0.22, 0.04]);  // bras tendu
      b.add(U.box, BLUE, [px - s * 0.6, ry + 2.9, fz + 0.01], [0.1, 3.4, 0.04]);  // sceptre
      for (let c = 0; c < 4; c++) {
        const gx = cx + s * (0.05 + c * 0.62);
        for (const lx of [-0.27, 0.27]) b.add(U.box, BLUE, [gx + lx, ry + 3.1, fz], [0.03, 5.6, 0.03]);
        for (let k = 0; k < 6; k++) b.add(U.box, (k + c) % 4 ? '#7a5228' : PAINT.red, [gx, ry + 0.8 + k * 0.9, fz], [0.3, 0.32, 0.03], [0, 0, ((k * 7 + c) % 5) * 0.3]);
      }
    }
    b.add(U.box, STONE3, [s * 8.6, 18.4, 0.3], [6.8, 0.8, 4.8]);
    b.add(U.box, GOLD, [s * 8.6, 18.0, 2.42], [6.8, 0.12, 0.04]);
    // flanc tourné vers l'avenue : colonnes de hiéroglyphes gravés, filets bleus
    for (let y = 1.2; y < 16; y += 2.6) {
      b.add(U.box, BLUE, [s * 5.39, y + 1.15, 0], [0.04, 0.08, 3.8]);
      for (let k = 0; k < 5; k++) b.add(U.box, k === 2 ? PAINT.red : '#7a5228', [s * 5.39, y + 0.35 + (k % 2) * 0.3, -1.5 + k * 0.75], [0.04, 0.3, 0.26], [k * 0.4, 0, 0]);
    }
    b.add(U.box, STONE3, [s * 5.42, 0.4, 0], [0.12, 0.8, 4.0]);
  }
  b.add(U.box, STONE, [0, 10.6, 0], [11.4, 2.4, 3.0]);
  b.add(U.box, STONE3, [0, 12.1, 0.2], [12, 0.6, 3.6]);
  b.add(U.box, PAINT.red, [0, 10.6, 1.52], [1.4, 1.4, 0.06]);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) b.add(U.box, [BLUE, PAINT.green, PAINT.red, GOLD][k], [s * (1.6 + k * 0.4), 10.9 - k * 0.22, 1.52], [2.6 - k * 0.3, 0.2, 0.05], [0, 0, s * (0.12 + k * 0.03)]);
  }
}
// porte fortifiée du souk (bab) : tours crénelées, arc outrepassé au-dessus des voies
function bab(b) {
  const MUD = '#c49a6e', TRIM = '#e8d8b8';
  for (const s of [-1, 1]) {
    b.add(U.box, MUD, [s * 7.6, 6.5, 0], [4.6, 13, 4.6]);
    for (let k = 0; k < 4; k++) b.add(U.box, MUD, [s * (5.8 + k * 1.2), 13.4, 2.0], [0.7, 0.8, 0.6]);
    b.add(U.box, '#2a1c14', [s * 7.6, 9.5, 2.32], [0.8, 1.4, 0.04]);
  }
  b.add(U.box, MUD, [0, 12, 0], [10.6, 2.6, 3.6]);
  // arc outrepassé fait de voussoirs, bandeau de faïence bleue
  const R = 5.1, cy = 4.9;
  for (let i = 0; i <= 18; i++) {
    const a = -0.25 + (i / 18) * (Math.PI + 0.5);
    const x = Math.cos(a) * R, y = cy + Math.sin(a) * R;
    if (y < 4.6 && Math.abs(x) < 4.6) continue;
    b.add(U.box, i % 2 ? TRIM : '#d8c49a', [x, y, 1.6], [0.9, 0.7, 0.5], [0, 0, a + Math.PI / 2]);
    b.add(U.box, '#2a7ab0', [Math.cos(a) * (R + 0.6), cy + Math.sin(a) * (R + 0.6), 1.62], [0.75, 0.25, 0.4], [0, 0, a + Math.PI / 2]);
  }
  for (let k = -3; k <= 3; k++) b.add(U.box, MUD, [k * 1.4, 13.7, 1.4], [0.7, 0.8, 0.6]);
}
// guirlande de fanions et de petites lanternes tendue au-dessus du souk
function bunting(b) {
  for (const x of [-5.3, 5.3]) b.add(U.cyl6, WOOD2, [x, 4, 0], [0.08, 8, 0.08]);
  const cols = [PAINT.red, PAINT.gold, BLUE, PAINT.green, '#f4ecd8', '#d860a0'];
  for (let i = 0; i <= 22; i++) {
    const x = -5.3 + i * (10.6 / 22), y = 7.8 - Math.sin((i / 22) * Math.PI) * 0.8;
    b.add(U.box, '#3a2a1a', [x, y, 0], [0.5, 0.02, 0.02], [0, 0, (i < 11 ? -1 : 1) * 0.15]);
    b.add(U.cone4, cols[i % cols.length], [x, y - 0.25, 0], [0.18, 0.42, 0.04], [Math.PI, 0, 0]);
  }
}

// ---------- Catalogue et thèmes ----------
const shadeHex = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
export const DECOR = {
  sphinx: { len: 1.9, w: 3.9, face: true, build: sphinx },
  obelisk: { len: 1.9, w: 1.9, face: true, build: obelisk },
  palm: { len: 2.6, w: 3.6, build: palm },
  brazier: { len: 0.9, w: 0.9, face: true, build: brazier },
  pylon: { len: BLEN, w: BW, face: true, build: pylon },
  colonnade: { len: BLEN, w: BW, face: true, build: colonnade },
  colossus: { len: BLEN, w: BW, face: true, build: colossus },
  templeWall: { len: BLEN, w: 4, face: true, build: templeWall },
  papyrus: { len: 1.4, w: 1.4, build: papyrus },
  shaduf: { len: 1.2, w: 4.8, face: true, build: shaduf },
  jars: { len: 2.0, w: 1.2, face: true, build: jars },
  ibis: { len: 0.6, w: 1.0, face: true, build: ibis },
  river: { len: BLEN, w: 14, face: true, build: river },
  farPalms: { len: 14, w: 6, face: true, build: farPalms },
  spiceStall: { len: 3.6, w: 1.8, face: true, build: spiceStall },
  potteryStall: { len: 2.8, w: 1.4, face: true, build: potteryStall },
  lanternStall: { len: 2.4, w: 1.0, face: true, build: lanternStall },
  carpetRack: { len: 3.2, w: 1.0, face: true, build: carpetRack },
  camel: { len: 1.4, w: 3.2, face: true, build: camel },
  houses: { len: BLEN, w: 7.6, face: true, build: houses },
  templeGround: { len: STRIP, w: 3.4, face: true, build: templeGround },
  bank: { len: STRIP, w: 3.4, face: true, build: bank },
  souqGround: { len: STRIP, w: 3.4, face: true, build: souqGround },
};

export const THEMES = {
  temples: {
    ground: 'templeGround', gate: 'pylonGate', gateEvery: [220, 360], garland: 0,
    x: { edge: 0, near: 5.2, mid: 9.6, far: 30 }, spread: { near: 0.1, mid: 0 }, mult: { near: 1.7, mid: 0.04 },
    edge: [],
    near: [['sphinx', 5], ['obelisk', 0.35], ['brazier', 0.8], ['palm', 0.4]],
    mid: [['pylon', 1.4], ['colonnade', 1.8], ['colossus', 0.8], ['templeWall', 1]],
    far: [],
  },
  nil: {
    ground: 'bank', gate: 'none', garland: 0,
    x: { edge: 0, near: 5.2, mid: 8.6, far: 24 }, spread: { near: 0.8, mid: 0, far: 6 }, mult: { near: 1.0, mid: 0.0, far: 1 },
    edge: [],
    near: [['papyrus', 3], ['palm', 2], ['shaduf', 0.6], ['jars', 0.9], ['ibis', 0.8]],
    mid: [['river', 1]],
    far: [['farPalms', 1]],
  },
  souk: {
    ground: 'souqGround', gate: 'bab', gateEvery: [200, 320], garland: 0.55, garlandType: 'bunting',
    x: { edge: 0, near: 5.1, mid: 8.9, far: 30 }, spread: { near: 0.3, mid: 0 }, mult: { near: 0.9, mid: 0.04 },
    edge: [],
    near: [['spiceStall', 1.5], ['potteryStall', 1], ['lanternStall', 0.8], ['carpetRack', 0.9], ['camel', 0.7], ['palm', 0.4]],
    mid: [['houses', 1]],
    far: [],
  },
};
export const THEME_ORDER = ['temples', 'nil', 'souk'];
export const THEME_LEN = 400;

export function weighted(list) {
  let total = 0;
  for (const [, w] of list) total += w;
  if (!total) return null;
  let r = Math.random() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

export function prebuild() {
  for (const d of Object.values(DECOR)) {
    d.geos = [];
    d.texs = [];
    for (let i = 0; i < 5; i++) {
      const b = new Builder(), t = new TexBuilder();
      d.build(b, t);
      d.geos.push(b.build());
      const tx = t.build();
      d.texs.push(tx.length ? tx : null);
    }
  }
  const one = (fn) => { const b = new Builder(); fn(b); return b.build(); };
  return { pylonGate: one(pylonGate), bab: one(bab), bunting: one(bunting) };
}
