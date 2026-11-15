import * as THREE from 'three';
import { Builder, TexBuilder, U, pick, rand } from '../../geo.js';
import { Painter, S, LANTERN, POT, STEAMER, BOWL } from './shapes.js';
import { NEON, decorAtlas, INTERIORS, SIGNS } from './textures.js';
import { loadPlants, addPlant, surface, plant } from '../../plants.js';

await loadPlants('hongkong');   // modèles (banians, cagettes, fruits, tabourets, bancs, feux, climatiseurs) avant la construction du décor

// Décor latéral de Hong Kong la nuit, en trois zones qui se suivent : la rue des néons de Mong Kok, le
// marché de nuit de Temple Street, puis le front de mer du port Victoria. Chaque élément est construit
// face à +x (vers la voie quand il est à gauche), origine au sol, centré en z. Les façades, vitrines et
// enseignes sont peintes déjà éclairées (matière « glow ») : la nuit n'a pas besoin de lumières en plus.
// Rien ne descend au-dessus des voies sous 10,5 m : les passerelles d'échafaudage passent à 5,4 m.

const BAMBOO = '#c8b070', BAMBOO2 = '#a89050', STEEL = '#3a3c48', DARK = '#1c1c28';
const P = (b, t) => new Painter(b, t);
const ri = (a, b) => Math.floor(rand(a, b + 1));
// couleur d'un triangle de modèle : teinte légèrement variée, plus claire sur les faces tournées vers le ciel
const _tc = new THREE.Color();
const tone = (c, up = 0, j = 0.06) => _tc.set(c).multiplyScalar(1 + rand(-j, j) + (up > 0.4 ? 0.08 : -0.03));
export const CLEARANCE = 10.5;   // hauteur libre au-dessus des voies (saut depuis une passerelle)

export function makeTexMats() {
  const atlas = decorAtlas();
  return {
    eg: new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true }),
    glow: new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true }),
    // reflets des néons et des vitrines sur le sol mouillé : ajoutés à la lumière, sans masquer le sol
    add: new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}

// triangle peint dans le plan yz, face à +x (voiles de jonque)
const TRI = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1, 0, 1, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  g.setIndex([0, 1, 2]);
  return g;
})();

// couleur du reflet de chaque enseigne sur le sol mouillé (atténuée : la matière est additive)
const REFL = { neonV0: '#ff6a3a', neonV1: '#ffe04a', neonV2: '#3aff8a', neonV3: '#ff4aa8',
  neonH0: '#ff4a4a', neonH1: '#3af0ff', neonH2: '#ffd040', neonH3: '#b06aff', neonH4: '#3aff8a', neonH5: '#ff4aa8' };
// traînée de reflet sur le trottoir sous une enseigne (vers la voie et vers le joueur, qui arrive par +z)
const SIDEWALK_Y = 0.03;
function streak(p, F, z, w, len, color, x0 = 0.3) { p.refl('streak', [F + x0 + w / 2, SIDEWALK_Y, z + len * 0.3], [w, len], color); }

// ---------- Enseignes au néon ----------
// lame verticale perpendiculaire à la façade (lisible depuis la voie : faces ±z), accrochée en x = F
function bladeSign(p, F, y, z, region, h = 5.5) {
  const x0 = F + 0.3, x1 = F + 1.8, xc = (x0 + x1) / 2, w = x1 - x0;
  p.flat(U.box, '#0c0a12', [xc, y, z], [w + 0.12, h + 0.12, 0.22]);
  p.lit(region, [xc, y, z + 0.116], [w, h], '#ffffff', 0);
  p.lit(region, [xc, y, z - 0.116], [w, h], '#ffffff', Math.PI);
  for (const dy of [h / 2 - 0.4, -h / 2 + 0.4]) p.flat(U.box, STEEL, [F + 0.15, y + dy, z], [0.3, 0.08, 0.08]);
  if (REFL[region]) streak(p, F, z, 1.4, rand(3.5, 5), REFL[region], 0.4);
}
// grand panneau en porte-à-faux au-dessus du trottoir, de x = F jusqu'à F + len
function boardSign(p, F, y, z, region, len) {
  const h = len * 0.375, xc = F + 0.3 + len / 2;
  p.flat(U.box, '#0c0a12', [xc, y, z], [len + 0.14, h + 0.14, 0.26]);
  p.lit(region, [xc, y, z + 0.136], [len, h], '#ffffff', 0);
  p.lit(region, [xc, y, z - 0.136], [len, h], '#ffffff', Math.PI);
  // potence d'acier qui le tient à la façade
  p.flat(U.box, STEEL, [F + len * 0.45, y + h / 2 + 0.5, z], [len * 0.9, 0.1, 0.1], [0, 0, -0.18]);
  p.flat(U.box, STEEL, [F + 0.25, y + h / 2 + 0.2, z], [0.12, 0.8, 0.12]);
  if (REFL[region]) streak(p, F, z, Math.min(len, 3.2), rand(4, 6), REFL[region], 0.5);
}
const V = ['neonV0', 'neonV1', 'neonV2', 'neonV3'], H = ['neonH0', 'neonH1', 'neonH2', 'neonH3', 'neonH4', 'neonH5'];

// ---------- Immeubles (16 m le long de la rue, 10 m de profondeur, façade en x = +5) ----------
const BW = 10, BLEN = 16, F = BW / 2;
// Rez-de-chaussée : quatre boutiques de 4 m en retrait sous l'auvent, séparées par des piliers. Ouvertes
// (intérieur peint et éclairé : pharmacie, café, produits séchés, électronique, bijouterie, boulangerie,
// restaurant, supérette), avec comptoir, caisson lumineux et lumière qui déborde sur le trottoir mouillé ;
// ou fermées par un rideau de fer.
function shopfronts(p, closed) {
  for (let z = -8; z <= 8; z += 4) {   // piliers carrelés
    p.flat(U.box, '#34323e', [F - 0.35, GF / 2, z], [0.7, GF, 0.36]);
    p.flat(U.box, '#4a4858', [F - 0.02, 0.3, z], [0.08, 0.6, 0.4]);
  }
  for (let k = 0; k < 4; k++) {
    const zc = -6 + k * 4, i = ri(0, INTERIORS - 1), sign = 'sign' + (i % SIGNS);   // l'enseigne annonce la boutique
    p.flat(U.box, '#141018', [F + 0.1, 3.5, zc], [0.2, 0.8, 3.64]);   // caisson d'enseigne
    if (Math.random() < closed) {
      p.lit('shut' + ri(0, 3), [F - 0.12, 1.55, zc], [3.64, 3.1], '#c8c4d0');
      p.lit('sign' + ri(0, SIGNS - 1), [F + 0.205, 3.5, zc], [3.5, 0.7], '#6a6670');
      continue;
    }
    p.lit(sign, [F + 0.205, 3.5, zc], [3.5, 0.7]);
    p.lit('in' + i, [F - DEPTH + 0.01, 1.55, zc], [3.64, 3.1]);
    p.flat(U.box, '#6a6470', [F - DEPTH / 2, 0.015, zc], [DEPTH, 0.03, 3.64]);   // sol de la boutique
    p.glow(S.box, '#fff4e0', [F - DEPTH / 2, 3.08, zc], [0.5, 0.04, 3.2]);    // plafonnier
    // comptoir ou étal devant l'entrée, selon la boutique
    const side = pick([-1, 1]), cz = zc + side * 1.0;
    if (i === 2) for (let j = 0; j < 3; j++) {   // paniers de produits séchés
      p.flat(U.box, '#8a6a42', [F - 0.3, 0.45, zc - 1.1 + j * 1.1], [0.5, 0.6, 0.8]);
      p.smooth(S.sphLo, pick(['#c8783a', '#8a4a1a', '#e8c070']), [F - 0.3, 0.78, zc - 1.1 + j * 1.1], [0.22, 0.08, 0.34]);
    } else if (i === 7 || i === 0) {   // présentoir à l'entrée
      p.flat(U.box, '#e8e8f0', [F - 0.35, 0.65, cz], [0.5, 1.3, 1.2]);
      for (let j = 0; j < 3; j++) p.glow(S.box, pick(['#ff6a6a', '#6ad08a', '#6aa8ff', '#ffd860']), [F - 0.09, 0.4 + j * 0.35, cz], [0.02, 0.22, 1.0]);
    } else {
      p.flat(U.box, i === 4 ? '#5a0a14' : '#3a3036', [F - 0.45, 0.5, cz], [0.5, 1.0, 1.4]);
      p.glow(S.box, i === 4 ? '#ffe8a0' : '#f4f0e8', [F - 0.45, 1.01, cz], [0.46, 0.02, 1.36]);
    }
    streak(p, F, zc, 2.6, 3.6, '#c8a878', 0.1);   // la boutique éclaire le trottoir
  }
}

const GF = 4.0, DEPTH = 1.2;   // rez-de-chaussée : hauteur et profondeur des boutiques en retrait
function building(p, { facade, H: height, tint = '#ffffff', shops = 'shops' }) {
  p.flat(U.box, '#22243a', [0, (height + GF) / 2, 0], [BW, height - GF, BLEN]);
  p.flat(U.box, '#1c1c28', [-DEPTH / 2, GF / 2, 0], [BW - DEPTH, GF, BLEN]);
  shopfronts(p, shops === 'shutters' ? 0.6 : 0.2);
  p.flat(U.box, '#16161e', [F + 0.7, 4.3, 0], [1.4, 0.22, BLEN]);
  for (let k = 0; k < 4; k++) p.glow(S.box, pick(['#fff0d0', '#d8f0ff']), [F + 1.35, 4.18, -6 + k * 4], [0.06, 0.05, 2.8]);
  // étages : façade de nuit peinte, deux panneaux de 8 m par étage de 16 m
  for (let y = 4.5; y < height - 0.1; y += 16) {
    const h = Math.min(16, height - y);
    for (const z of [-4, 4]) p.lit(facade, [F + 0.01, y + h / 2, z], [8, h], tint);
  }
  p.flat(U.box, '#2e3046', [F - 0.15, height + 0.3, 0], [0.5, 0.6, BLEN + 0.1]);
  // toit : réservoirs d'eau, cage d'escalier, antennes
  p.flat(U.box, '#2a2c40', [-1.5, height + 1.4, rand(-4, 4)], [3, 2.8, 3]);
  for (const z of [-5.5, -2.5]) {
    p.smooth(S.cyl, '#5a6a8a', [2.5, height + 1.2, z], [0.9, 2.2, 0.9]);
    p.smooth(S.cylLo, '#3a4a6a', [2.5, height + 2.35, z], [0.92, 0.1, 0.92]);
  }
  for (let k = 0; k < 3; k++) p.flat(U.box, '#4a4a58', [rand(-3, 3), height + 3, rand(2, 7)], [0.06, rand(3, 6), 0.06]);
  p.glow(S.sphLo, '#ff3030', [0, height + 0.8, 7.5], [0.15, 0.15, 0.15]);   // feu de balisage
}

// climatiseurs en saillie (modèle « h_ac ») accrochés sous les fenêtres, quelques gouttes de condensation
function acUnits(p, height, n) {
  for (let k = 0; k < n; k++) {
    const y = 5.6 + ((Math.random() * Math.min(height - 9, 14)) / 2.67 | 0) * 2.67, z = rand(-7, 7);
    p.flat(U.box, '#4a4e58', [F + 0.2, y - 0.05, z], [0.4, 0.04, 0.9]);   // console
    if (k % 2) {   // un sur deux en simple boîte (les étages élevés sont vus de loin)
      p.flat(U.box, '#c8ccd2', [F + 0.25, y + 0.25, z], [0.5, 0.45, 0.8]);
      p.flat(U.box, '#5a5e68', [F + 0.51, y + 0.25, z], [0.02, 0.32, 0.6]);
      continue;
    }
    addPlant(p.b, 'h_ac', [F + 0.05, y, z], 0.55, (role, part, i, up, c) => (c[0] > 110 && c[2] < 80 ? '#b8784a' : c[0] < 50 ? '#2a2c34' : tone('#c8ccd2', up)), { s: [1.05, 0.95], ry: Math.PI / 2 });
  }
}
// cages de fenêtres en fer (vieux immeubles) : barreaux devant quelques fenêtres des premiers étages
function cages(p, height) {
  for (let k = 0; k < 5; k++) {
    const y = 6.3 + ri(0, Math.min(4, ((height - 9) / 2.67) | 0)) * 2.67, z = rand(-6.5, 6.5), w = 1.6, h = 1.6;
    p.flat(U.box, '#2a2c34', [F + 0.25, y - h / 2, z], [0.5, 0.06, w]);
    p.flat(U.box, '#2a2c34', [F + 0.25, y + h / 2, z], [0.5, 0.06, w]);
    for (let j = 0; j <= 5; j++) p.flat(U.box, '#3a3c48', [F + 0.5, y, z - w / 2 + j * (w / 5)], [0.03, h, 0.03]);
    if (Math.random() < 0.6) p.smooth(S.sphLo, pick(['#3a7a3a', '#4a8a44']), [F + 0.3, y - h / 2 + 0.25, z + rand(-0.4, 0.4)], [0.22, 0.2, 0.22]);   // plante sur le rebord
  }
}

// tour de la rue des néons : façade carrelée ou vitrée, lames et panneaux lumineux, enseigne sur le toit
function towerNeon(b, t) {
  const p = P(b, t);
  const height = 4.5 + 16 * pick([2, 2, 3]);
  building(p, { facade: pick(['facadeA', 'facadeA', 'facadeB', 'facadeD', 'facadeE']), H: height, tint: pick(['#ffffff', '#f0e8ff', '#fff0e8']) });
  const blades = 2 + ((Math.random() * 2) | 0);
  for (let i = 0; i < blades; i++) bladeSign(p, F, rand(8, 18), -6 + i * (12 / Math.max(1, blades - 1)) + rand(-0.5, 0.5), pick(V), rand(4.5, 6.5));
  if (Math.random() < 0.85) boardSign(p, F, rand(7.5, 11), rand(-3, 3), pick(H), rand(3.4, 4.4));
  if (Math.random() < 0.5) boardSign(p, F, rand(13, 16), rand(-4, 4), pick(H), rand(2.6, 3.4));
  acUnits(p, height, 8);
  // enseigne géante sur le toit, face à la rue (vue de loin)
  if (Math.random() < 0.5) {
    const y = height + 3.5, r = pick(H);
    p.flat(U.box, STEEL, [F - 1, height + 1.2, 0], [0.2, 2.4, 6]);
    p.lit(r, [F - 1, y, 0], [9, 3.4], '#ffffff', Math.PI / 2);
  }
}

// tour de verre (bureaux), bandeaux lumineux, quelques panneaux
function glassTower(b, t) {
  const p = P(b, t);
  const height = 4.5 + 16 * 3;
  building(p, { facade: 'facadeC', H: height, shops: 'shops' });
  bladeSign(p, F, rand(8, 12), rand(-5, 5), pick(V), 5.5);
  for (let y = 20; y < height; y += 16) p.glow(S.box, pick([NEON.cyan, NEON.violet]), [F + 0.03, y, 0], [0.04, 0.12, BLEN]);
}

// vieil immeuble de Temple Street : balcons, perches à linge, échafaudage de bambou sur la façade
function tenement(b, t) {
  const p = P(b, t);
  const height = 4.5 + 16 * pick([1, 2, 2]);
  building(p, { facade: pick(['facadeB', 'facadeD', 'facadeE']), H: height, tint: pick(['#ffffff', '#ffe8f0', '#e8fff0']), shops: pick(['shops', 'shops', 'shutters']) });
  acUnits(p, height, 5);
  cages(p, height);
  bladeSign(p, F, rand(7.5, 10), rand(-6, 6), pick(V), 4.5);
  // perches à linge qui sortent des fenêtres
  for (let k = 0; k < 6; k++) {
    const y = 6.5 + ((Math.random() * (height - 9)) / 2.67 | 0) * 2.67, z = rand(-6, 6);
    p.smooth(S.cylLo, BAMBOO, [F + 0.9, y, z], [0.03, 1.8, 0.03], [0, 0, Math.PI / 2 - 0.15]);
    for (let c = 0; c < 3; c++) p.flat(U.box, pick(['#ff8ab0', '#8ad0ff', '#fff0a0', '#a8f0b0', '#ffffff', '#c86a4a']), [F + 0.4 + c * 0.5, y - 0.35 - c * 0.04, z], [0.38, 0.6, 0.04]);
  }
  // échafaudage de bambou attaché sur une partie de la façade, filets verts
  if (Math.random() < 0.55) {
    const top = Math.min(height, 22), x = F + 1.0;
    for (let z = -7; z <= 7; z += 2) p.smooth(S.cylLo, BAMBOO, [x, (4.6 + top) / 2, z], [0.05, top - 4.6, 0.05]);
    for (let y = 5; y <= top; y += 2) {
      p.smooth(S.cylLo, BAMBOO2, [x + 0.08, y, 0], [0.045, BLEN - 1.6, 0.045], [Math.PI / 2, 0, 0]);
      for (let z = -7; z <= 7; z += 2) p.flat(U.box, '#1a1a1a', [x + 0.04, y, z], [0.1, 0.1, 0.1]);   // ligatures
    }
    for (let k = 0; k < 4; k++) p.flat(U.box, '#2a6a4a', [x + 0.15, rand(7, top - 2), rand(-6, 6)], [0.02, 3.6, 3.6]);
  }
}

// ---------- Port Victoria ----------
// le port la nuit : eau qui reflète la ville, quai de la promenade, Star Ferry ou jonque aux voiles rouges
function harbour(b, t) {
  const p = P(b, t);
  const W = 20;
  p.litGeo(S.plane, 'water', [0, 0.03, 0], [W, BLEN, 1], [-Math.PI / 2, 0, 0]);
  p.flat(U.box, '#4a4a58', [W / 2 - 0.3, 0.2, 0], [0.6, 0.4, BLEN]);   // bord du quai
  for (let z = -7; z <= 7; z += 2) p.flat(U.box, '#8a8e9a', [W / 2 - 0.25, 0.9, z], [0.08, 1.0, 0.08]);
  p.flat(U.box, '#a8acb8', [W / 2 - 0.25, 1.38, 0], [0.12, 0.06, BLEN]);
  for (const z of [-6, 2]) {   // bornes d'amarrage au bord du quai, avec leur amarre
    p.smooth(S.cylLo, '#2a2a34', [W / 2 - 0.6, 0.6, z], [0.16, 0.4, 0.16]);
    p.smooth(S.cylLo, '#2a2a34', [W / 2 - 0.6, 0.84, z], [0.22, 0.08, 0.22]);
  }
  for (let k = 0; k < 5; k++) p.glow(S.box, pick(['#ffe0a0', '#ff8ac0', '#7af0ff']), [rand(-6, 6), 0.05, rand(-7, 7)], [rand(0.2, 0.5), 0.01, rand(1.5, 4)]);   // reflets
  const r = Math.random();
  if (r < 0.45) ferry(p, rand(-4, 2), rand(-2, 2)); else if (r < 0.8) {   // jonque aux voiles rouges en ailes de chauve-souris, guirlandes d'ampoules
    const x = rand(-4, 2), z = rand(-2, 2);
    p.smooth(S.sph, '#5a3a24', [x, 0.3, z], [1.6, 0.8, 5.2]);
    p.flat(U.box, '#7a5232', [x, 0.95, z], [2.8, 0.12, 8]);
    p.flat(U.box, '#7a5232', [x, 1.4, z - 3.6], [2.6, 1.0, 1.2]);
    for (const [mz, mh] of [[1.8, 9], [-1.2, 7]]) {
      p.smooth(S.cylLo, '#3a2a1a', [x, 1 + mh / 2, z + mz], [0.08, mh, 0.08]);
      p.paint(TRI, 'plain', [x + 0.05, 1.6, z + mz + 0.2], [1, mh - 1.2, 3.6], [0, 0, 0], '#c8302a');
      for (let k = 1; k < 6; k++) p.flat(U.box, '#4a1a14', [x + 0.08, 1.6 + k * (mh - 1.2) / 6, z + mz - 0.2 - k * 0.5], [0.02, 0.04, 3.4 - k * 0.55]);
      for (let k = 0; k < 8; k++) p.glow(S.sphLo, '#ffe090', [x, 1.2 + k * (mh / 8), z + mz + 2.6 - k * 0.32], [0.06, 0.06, 0.06]);
    }
  }
}

// Bac à deux ponts du port (double proue, il ne fait jamais demi-tour) : coque verte arrondie aux deux bouts,
// pont inférieur ouvert sur des rangées de fenêtres allumées, pont supérieur à bastingage, toit à auvent,
// cheminée, bouées orange, feux de navigation rouge et vert, sillage
function ferry(p, x, z) {
  const L = 11, W = 4, HULL = '#2a6a4a', WHITE = '#f4f0e8';
  p.flat(U.box, HULL, [x, 0.5, z], [W, 1.0, L - 2]);
  for (const s of [-1, 1]) p.smooth(S.cyl, HULL, [x, 0.5, z + s * (L / 2 - 1)], [W / 2, 1.0, 1.0]);   // bouts arrondis
  p.flat(U.box, '#e8b830', [x, 0.98, z], [W + 0.02, 0.08, L - 1.98]);   // liston doré
  for (const s of [-1, 1]) p.smooth(S.cyl, '#e8b830', [x, 0.98, z + s * (L / 2 - 1)], [W / 2 + 0.01, 0.08, 1.01]);
  // pont inférieur : cabine blanche, rangée de fenêtres éclairées séparées par des montants
  p.flat(U.box, WHITE, [x, 1.55, z], [W - 0.4, 1.1, L - 1.6]);
  for (const sx of [-1, 1]) {
    p.glow(S.box, '#ffe8a8', [x + sx * (W / 2 - 0.19), 1.6, z], [0.02, 0.5, L - 2.2]);
    for (let k = 0; k < 12; k++) p.flat(U.box, WHITE, [x + sx * (W / 2 - 0.18), 1.6, z - (L - 2.2) / 2 + k * ((L - 2.2) / 11)], [0.04, 0.55, 0.08]);
  }
  // pont supérieur : bastingage, fenêtres, toit débordant
  p.flat(U.box, '#e8e4dc', [x, 2.12, z], [W - 0.2, 0.06, L - 1.2]);
  p.flat(U.box, WHITE, [x, 2.55, z], [W - 0.9, 0.8, L - 3.4]);
  for (const sx of [-1, 1]) {
    p.glow(S.box, '#fff0c0', [x + sx * (W / 2 - 0.44), 2.6, z], [0.02, 0.4, L - 3.8]);
    p.flat(U.box, '#c8ccd4', [x + sx * (W / 2 - 0.12), 2.45, z], [0.03, 0.04, L - 1.4]);   // main courante
    for (let k = 0; k < 10; k++) p.flat(U.box, '#c8ccd4', [x + sx * (W / 2 - 0.12), 2.3, z - (L - 1.6) / 2 + k * ((L - 1.6) / 9)], [0.03, 0.3, 0.03]);
  }
  p.flat(U.box, HULL, [x, 3.0, z], [W - 0.5, 0.1, L - 2.6]);
  // cheminée et mât, feux de navigation, bouées
  p.smooth(S.cyl, WHITE, [x, 3.45, z], [0.3, 0.8, 0.3]);
  p.smooth(S.cyl, HULL, [x, 3.82, z], [0.31, 0.1, 0.31]);
  p.smooth(S.cylLo, '#c8ccd4', [x, 3.9, z + 2.2], [0.03, 1.8, 0.03]);
  p.glow(S.sphLo, '#ffffff', [x, 4.8, z + 2.2], [0.08, 0.08, 0.08]);
  p.glow(S.sphLo, '#ff3030', [x - W / 2 + 0.3, 2.3, z + L / 2 - 1.6], [0.08, 0.08, 0.08]);
  p.glow(S.sphLo, '#30ff70', [x + W / 2 - 0.3, 2.3, z + L / 2 - 1.6], [0.08, 0.08, 0.08]);
  for (const dz of [-2.5, 0, 2.5]) p.smooth(S.torus, '#ff7a20', [x + W / 2 - 0.16, 2.3, z + dz], [0.22, 0.22, 0.22], [0, Math.PI / 2, 0]);
  // sillage d'écume
  for (const s of [-1, 1]) p.glow(S.box, '#a8c8e0', [x + s * (W / 2 + 0.3), 0.06, z - L / 2 + 0.5], [0.15, 0.01, 2.6], [0, s * 0.3, 0]);
}

// ---------- Mobilier de rue ----------
function lamp(b, t) {   // réverbère à crosse, lumière orangée au sodium
  const p = P(b, t);
  p.flat(U.box, '#2e3a36', [0, 0.25, 0], [0.4, 0.5, 0.4]);
  p.smooth(S.cylLo, '#3a4a44', [0, 3.4, 0], [0.09, 6.8, 0.09]);
  p.flat(U.box, '#3a4a44', [0.5, 6.8, 0], [1.1, 0.1, 0.1], [0, 0, -0.12]);
  p.flat(U.box, '#2e3a36', [1.05, 6.66, 0], [0.6, 0.16, 0.32]);
  p.glow(S.box, '#ffb060', [1.05, 6.56, 0], [0.5, 0.04, 0.26]);
  p.glow(S.sphLo, '#ffd8a0', [1.05, 6.5, 0], [0.12, 0.05, 0.1]);
}

// feu de signalisation (modèle « h_traffic ») : mât sombre, feux allumés, bouton d'appel jaune
const LIGHTS = (() => {   // positions (relatives) des feux rouges et verts du modèle
  let m = null;
  return () => {
    if (m) return m;
    const md = plant('h_traffic'), acc = { red: [0, 0, 0, 0], green: [0, 0, 0, 0] };
    for (let i = 0; i < md.n; i++) {
      const c = md.col.subarray(i * 3, i * 3 + 3), k = c[0] > 150 && c[1] < 80 ? 'red' : c[1] > 80 && c[0] < 40 ? 'green' : null;
      if (!k) continue;
      for (let j = 0; j < 3; j++) { acc[k][0] += md.pos[i * 9 + j * 3]; acc[k][1] += md.pos[i * 9 + j * 3 + 1]; acc[k][2] += md.pos[i * 9 + j * 3 + 2]; }
      acc[k][3] += 3;
    }
    return (m = Object.fromEntries(Object.entries(acc).filter(([, a]) => a[3]).map(([k, a]) => [k, [a[0] / a[3], a[1] / a[3], a[2] / a[3]]])));
  };
})();
function trafficLight(b, t) {
  const p = P(b, t), H = 3.6, on = pick(['red', 'green']);
  const paint = (role, part, i, up, c) => {
    if (c[0] > 150 && c[1] < 80) return on === 'red' ? '#ff3030' : '#4a1a1a';
    if (c[1] > 80 && c[0] < 40) return on === 'green' ? '#30ff80' : '#1a3a2a';
    if (c[0] > 150 && c[1] > 100) return '#1e2026';   // boîtiers
    return tone('#3a4844', up);
  };
  const m = addPlant(b, 'h_traffic', [0, 0, 0], H, paint, { ry: Math.PI / 2 });
  const L = LIGHTS()[on];
  if (L) {
    const q = new THREE.Vector3(...L).applyMatrix4(m);
    p.glow(S.sphLo, on === 'red' ? '#ff4040' : '#40ff90', [q.x, q.y, q.z], [0.09, 0.09, 0.09]);
    streak(p, -0.3, q.z, 0.8, 2.6, on === 'red' ? '#ff3030' : '#30ff80', 0);
  }
}

function railing(b) {   // barrière de trottoir verte, typique de Hong Kong
  for (let z = -2.4; z <= 2.4; z += 1.2) b.add(U.box, '#2a5a4a', [0, 0.55, z], [0.08, 1.1, 0.08]);
  for (const y of [0.25, 1.05]) b.add(U.box, '#2a5a4a', [0, y, 0], [0.06, 0.06, 4.9]);
  for (let z = -2.3; z <= 2.3; z += 0.2) b.add(U.box, '#3a6a5a', [0, 0.65, z], [0.03, 0.8, 0.03]);
  for (const z of [-2.45, 2.45]) b.add(U.box, '#e8c020', [0, 0.6, z], [0.1, 1.2, 0.1]);
}

function newsstand(b, t) {   // kiosque à journaux, magazines colorés, ampoule nue
  const p = P(b, t);
  p.flat(U.box, '#2a6a4a', [-0.2, 1.1, 0], [1.2, 2.2, 2.0]);
  p.flat(U.box, '#1f4a3a', [0.2, 2.35, 0], [1.6, 0.12, 2.3]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    p.glow(S.box, pick(['#ff6a9a', '#ffe060', '#6ad0ff', '#ffffff', '#ff9a40', '#a8f080']), [0.41, 0.6 + r * 0.38, -0.8 + c * 0.32], [0.02, 0.3, 0.26]);
  }
  p.glow(S.sphLo, '#fff2c0', [0.6, 2.15, 0], [0.08, 0.1, 0.08]);
}

function bin(b, t) {   // poubelle orange avec cendrier sur le dessus
  const p = P(b, t);
  p.flat(U.box, '#c86a2a', [0, 0.5, 0], [0.5, 1.0, 0.5]);
  p.flat(U.box, '#8a8e98', [0, 1.03, 0], [0.54, 0.06, 0.54]);
  p.flat(U.box, '#1a1a1a', [0.26, 0.75, 0], [0.02, 0.18, 0.3]);
}

function minibusStop(b, t) {   // arrêt de minibus : panneau vert et rouge rétroéclairé
  const p = P(b, t);
  p.flat(U.box, '#8a8e98', [0, 1.3, 0], [0.08, 2.6, 0.08]);
  p.flat(U.box, DARK, [0, 2.6, 0], [0.12, 0.7, 0.9]);
  p.glow(S.box, '#3ac87a', [0.07, 2.75, 0], [0.02, 0.3, 0.84]);
  p.glow(S.box, '#ff4040', [0.07, 2.42, 0], [0.02, 0.24, 0.84]);
}

function banyan(b, t) {   // figuier des banyans (modèle « h_tree ») : feuillage sombre, racines aériennes pendantes
  const p = P(b, t);
  p.flat(U.box, '#3a3846', [0, 0.15, 0], [1.6, 0.3, 1.6]);   // bac
  p.flat(U.box, '#2e2c38', [0, 0.31, 0], [1.4, 0.02, 1.4]);
  const leaf = {}, h = rand(5.4, 6.4);
  const m = addPlant(b, 'h_tree', [0, 0.3, 0], h, (role, part, i, up) => role === 1
    ? tone('#5a4a3a', up)
    : tone(leaf[part] ||= pick(['#2a5a3a', '#346a44', '#2e6040', '#244e34']), up), { s: [1.0, 1.0], ry: rand(0, Math.PI * 2) });
  // racines aériennes : fines lianes qui tombent du dessous du feuillage vers le sol
  let n = 0;
  for (const { p: q, n: nor } of surface('h_tree', m, 0, 40)) {
    if (nor.y > -0.3 || n >= 6) continue;
    const len = Math.max(0.6, q.y - rand(0.6, 2.2));
    p.smooth(S.cylLo, '#6a5a48', [q.x, q.y - len / 2, q.z], [0.025, len, 0.025]);
    n++;
  }
}

// étal du marché de nuit : bâche rayée éclairée par en dessous, ampoules, marchandises
function marketStall(b, t) {
  const p = P(b, t);
  p.flat(U.box, '#4a3a2a', [0, 0.45, 0], [1.6, 0.9, 3.0]);
  for (const [x, z] of [[0.95, -1.5], [0.95, 1.5], [-0.95, -1.5], [-0.95, 1.5]]) p.flat(U.box, STEEL, [x, 1.25, z], [0.06, 2.5, 0.06]);
  p.lit('tarp', [0, 2.6, 0], [3.4, 2.4], '#ffd8c0', Math.PI / 2, 1.25);
  for (let k = 0; k < 5; k++) p.glow(S.sphLo, '#fff0b0', [0.4, 2.25, -1.2 + k * 0.6], [0.07, 0.09, 0.07]);
  const goods = pick(['clothes', 'toys', 'lanterns', 'fruit', 'fruit']);
  if (goods === 'fruit') {   // cagettes de fruits (modèles « h_crate », « h_orange », « h_pineapple »)
    const wood = (role, part, i, up) => tone(role ? '#c8a46a' : '#8a6a42', up);
    for (let k = 0; k < 3; k++) {
      const z = -0.95 + k * 0.95, x = rand(0.05, 0.3);
      addPlant(b, 'h_crate', [x, 0.9, z], 0.26, wood, { s: [1.7, 1.9], ry: rand(-0.05, 0.05) });
      if (Math.random() < 0.35) {   // ananas couchés
        for (let j = 0; j < 2; j++) addPlant(b, 'h_pineapple', [x + rand(-0.1, 0.1), 1.13, z - 0.12 + j * 0.24], 0.26, (role, part, i, up) => (role ? tone('#3a8a3a', up) : tone('#e8b830', up, 0.04)), { ry: rand(0, 6) });
      } else {   // pyramide d'oranges ou de mandarines (formes simples : 20 triangles chacune)
        const c = pick([['#ff8a1a', '#ffa02a'], ['#ff6a1a', '#ff8a2a'], ['#e8d040', '#f0e050']]);
        for (let j = 0; j < 8; j++) b.add(U.sph0, pick(c), [x + rand(-0.15, 0.15), 1.18 + (j > 5 ? 0.07 : 0), z + rand(-0.17, 0.17)], [0.06, 0.055, 0.06]);
      }
    }
    for (let k = 0; k < 2; k++) p.smooth(S.sphLo, '#2a7a3a', [rand(-0.5, -0.2), 1.08, -0.6 + k * 1.2], [0.18, 0.15, 0.22]);   // pastèques
    p.flat(U.box, '#f4f0e8', [0.78, 1.25, 0.6], [0.02, 0.26, 0.4]);   // pancarte des prix
    p.flat(U.box, '#c8202a', [0.79, 1.25, 0.6], [0.01, 0.06, 0.3]);
  } else for (let k = 0; k < 8; k++) {
    const z = -1.3 + k * 0.37;
    if (goods === 'clothes') {   // t-shirts pendus à une tringle sous la bâche, piles pliées sur le comptoir
      p.flat(U.box, pick(['#ff8ab0', '#8ad0ff', '#fff0a0', '#a8f0b0', '#c86a4a', '#6a4ab0']), [0.3, 0.97, z], [0.9, 0.12, 0.32]);
      const c = pick(['#ff5a8a', '#5ab0ff', '#ffe060', '#7af08a', '#ffffff', '#2a2a3a']);
      p.flat(U.box, c, [0.85, 1.75, z], [0.02, 0.5, 0.3]);
      p.flat(U.box, c, [0.85, 1.95, z], [0.02, 0.12, 0.42]);   // manches
    } else if (goods === 'toys') p.smooth(S.sphLo, pick(['#ff5a8a', '#ffd040', '#5ad0ff', '#7af08a']), [rand(-0.3, 0.5), 1.05, z], [0.13, 0.13, 0.13]);
    else p.glow(LANTERN(), pick(['#ff3a3a', '#ff9a3a', '#ffd040']), [0.5, 1.6, z], [0.3, 0.42, 0.3]);
  }
  if (goods === 'clothes') p.flat(U.box, STEEL, [0.85, 2.05, 0], [0.03, 0.03, 3.0]);   // tringle
  p.glow(S.box, '#fff4d0', [0.75, 0.95, 0], [0.02, 0.05, 2.9]);
}

// restaurant de rue (dai pai dong) : comptoir inox, woks, paniers vapeur, tabourets rouges, ardoise
function daiPaiDong(b, t) {
  const p = P(b, t);
  p.flat(U.box, '#8a9098', [-0.3, 0.5, 0], [1.2, 1.0, 2.4]);
  p.flat(U.box, '#b8bec8', [-0.3, 1.02, 0], [1.24, 0.04, 2.44]);
  for (const z of [-0.6, 0.4]) p.smooth(BOWL(), '#2a2a30', [-0.3, 1.04, z], [0.7, 0.4, 0.7]);
  for (let k = 0; k < 3; k++) p.smooth(STEAMER(), '#d8b878', [-0.5, 1.04 + k * 0.2, 0.95], [0.32, 0.4, 0.32]);
  p.flat(U.box, '#c8202a', [-0.9, 2.0, 0], [0.1, 2.0, 2.4]);
  p.lit('menu', [-0.84, 2.1, 0], [1.6, 1.6]);
  p.glow(S.sphLo, '#fff0b0', [0.1, 2.4, 0], [0.1, 0.12, 0.1]);
  // table pliante et tabourets
  p.flat(U.box, '#e8e4dc', [0.6, 0.72, 1.4], [0.8, 0.04, 0.8]);
  p.flat(U.box, STEEL, [0.6, 0.36, 1.4], [0.06, 0.72, 0.06]);
  // tabourets en plastique rouges ou bleus (modèle « h_stool ») autour de la table
  for (const [dx, dz] of [[0.6, 0.8], [0.6, 2.0], [0.05, 1.4], [1.1, 1.4]]) {
    if (Math.random() < 0.2) continue;
    const c = pick(['#e8302a', '#e8302a', '#2a6ad8']);
    addPlant(b, 'h_stool', [dx, 0, dz], 0.45, (role, part, i, up) => tone(c, up, 0.03), { s: [1.25, 1.25], ry: rand(0, 6) });
  }
}

function promLamp(b, t) {   // lampadaire de la promenade : trois globes blancs
  const p = P(b, t);
  p.flat(U.box, '#4a4a58', [0, 0.2, 0], [0.4, 0.4, 0.4]);
  p.smooth(S.cylLo, '#6a6a78', [0, 2.2, 0], [0.07, 4.4, 0.07]);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1;
    p.flat(U.box, '#6a6a78', [Math.cos(a) * 0.25, 4.3, Math.sin(a) * 0.25], [0.5, 0.05, 0.05], [0, -a, 0]);
    p.glow(S.sph, '#f4f0ff', [Math.cos(a) * 0.5, 4.45, Math.sin(a) * 0.5], [0.2, 0.2, 0.2]);
  }
}

function bench(b) {   // banc en lattes (modèle « h_bench ») face au port, parfois avec un sac oublié
  addPlant(b, 'h_bench', [0, 0, 0], 0.85, (role, part, i, up) => tone('#8a6a48', up), { s: [0.95, 1], ry: -Math.PI / 2 });
  if (Math.random() < 0.25) b.add(U.box, pick(['#c8302a', '#2a6ad8', '#f2d040']), [-0.05, 0.55, rand(-0.6, 0.6)], [0.25, 0.22, 0.3]);
}

function flowers(b, t) {   // pots de fleurs et petits arbres en pot devant les boutiques
  const p = P(b, t);
  p.flat(U.box, '#3a3846', [0, 0.04, 0], [0.9, 0.08, 1.8]);
  for (let k = 0; k < 3; k++) {
    const z = -0.6 + k * 0.6;
    p.smooth(POT(), pick(['#c86a3a', '#2a7ad8', '#e8e4dc']), [0, 0.08, z], [0.5, 0.5, 0.5]);
    p.smooth(S.sph, pick(['#2a6a3a', '#3a7a44']), [0, 0.9, z], [0.32, 0.38, 0.32]);
    for (let f = 0; f < 3; f++) p.smooth(S.sphLo, pick(['#ff5a8a', '#ffd040', '#ffffff']), [rand(-0.2, 0.2), 1.0 + rand(0, 0.2), z + rand(-0.2, 0.2)], [0.06, 0.06, 0.06]);
  }
}

// ---------- Sols ----------
const STRIP = 32;
function hkSidewalk(b) {   // trottoir carrelé (texture du sol, visible) : bordure peinte en jaune, plaques d'égout
  b.add(U.box, '#e8c020', [1.62, 0.012, 0], [0.12, 0.024, STRIP]);
  for (let i = 0; i < 4; i++) {
    const x = rand(-1.2, 1.2), z = rand(-15, 15);
    b.add(U.box, '#2a2a34', [x, 0.006, z], [0.62, 0.012, 0.62]);
    b.add(U.box, '#3a3a46', [x, 0.013, z], [0.5, 0.004, 0.5]);
  }
}
function promenade(b) {   // promenade en planches
  b.add(U.box, '#5a4a40', [0, 0.06, 0], [3.4, 0.12, STRIP]);
  for (let i = 0; i < 11; i++) b.add(U.box, i % 2 ? '#6a5848' : '#64523f', [-1.55 + i * 0.31, 0.125, 0], [0.28, 0.01, STRIP]);
}

// ---------- Portes et guirlandes au-dessus de l'avenue (bas à 10,5 m au moins) ----------
function special(fn) { const b = new Builder(), t = new TexBuilder(); fn(P(b, t), b); return { geo: b.build(), tex: t.build() }; }
// portique géant à enseigne lumineuse, face au joueur (+z)
function neonGantry(p) {
  for (const s of [-1, 1]) {
    p.flat(U.box, '#2a2c3a', [s * 5.8, 7.2, 0], [0.5, 14.4, 0.5]);
    p.flat(U.box, '#2a2c3a', [s * 5.8, 0.3, 0], [0.9, 0.6, 0.9]);
    for (let k = 0; k < 3; k++) p.glow(S.box, [NEON.pink, NEON.cyan, NEON.yellow][k], [s * 5.8, 3 + k * 3.2, 0.26], [0.3, 0.06, 0.02]);
  }
  p.flat(U.box, '#2a2c3a', [0, 13.6, 0], [12.2, 0.4, 0.4]);
  p.flat(U.box, '#0c0a12', [0, 12.0, 0], [10.4, 2.2, 0.3]);
  const r = pick(['neonH0', 'neonH1', 'neonH2', 'neonH3', 'neonH4', 'neonH5']);
  p.lit(r, [0, 12.0, 0.16], [10, 2.0], '#ffffff', 0);
  p.lit(r, [0, 12.0, -0.16], [10, 2.0], '#ffffff', Math.PI);
}
// guirlande d'ampoules et de lanternes rouges tendue au-dessus du marché
function stringLights(p) {
  for (const x of [-5.7, 5.7]) p.flat(U.cyl6, '#3a3a44', [x, 6.6, 0], [0.08, 13.2, 0.08]);
  for (let i = 0; i <= 24; i++) {
    const x = -5.7 + i * (11.4 / 24), y = 12.8 - Math.sin((i / 24) * Math.PI) * 0.7;   // lanternes au-dessus de 11 m
    p.flat(U.box, '#2a2a30', [x, y, 0], [0.5, 0.02, 0.02], [0, 0, (i < 12 ? -1 : 1) * 0.14]);
    if (i % 3 === 1) p.glow(LANTERN(), i % 2 ? '#ff3a3a' : '#ff8a3a', [x, y - 0.75, 0], [0.42, 0.6, 0.42]);
    else p.glow(S.sphLo, pick(['#fff0b0', '#ffd0e0', '#d0f0ff']), [x, y - 0.12, 0], [0.07, 0.09, 0.07]);
  }
}

// ---------- Catalogue et thèmes ----------
export const DECOR = {
  towerNeon: { len: BLEN, w: BW, face: true, build: towerNeon },
  glassTower: { len: BLEN, w: BW, face: true, build: glassTower },
  tenement: { len: BLEN, w: BW, face: true, build: tenement },
  harbour: { len: BLEN, w: 20, face: true, build: harbour },
  lamp: { len: 0.6, w: 0.6, face: true, build: lamp },
  railing: { len: 5, w: 0.3, face: true, build: railing },
  trafficLight: { len: 0.9, w: 0.9, face: true, build: trafficLight },
  newsstand: { len: 2.3, w: 1.6, face: true, build: newsstand },
  bin: { len: 0.6, w: 0.6, face: true, build: bin },
  minibusStop: { len: 0.9, w: 0.4, face: true, build: minibusStop },
  banyan: { len: 2.6, w: 2.6, build: banyan },
  marketStall: { len: 3.4, w: 2.2, face: true, build: marketStall },
  daiPaiDong: { len: 3.0, w: 2.2, face: true, build: daiPaiDong },
  promLamp: { len: 1.0, w: 1.0, face: true, build: promLamp },
  bench: { len: 2.0, w: 0.6, face: true, build: bench },
  flowers: { len: 1.8, w: 0.9, face: true, build: flowers },
  hkSidewalk: { len: STRIP, w: 3.4, face: true, build: hkSidewalk },
  promenade: { len: STRIP, w: 3.4, face: true, build: promenade },
};

export const THEMES = {
  mongkok: {
    ground: 'hkSidewalk', gate: 'neonGantry', gateEvery: [170, 280], garland: 0,
    x: { edge: 0, near: 5.4, mid: 9.6, far: 30 }, spread: { near: 0.3, mid: 0 }, mult: { near: 1.2, mid: 0.0 },
    edge: [],
    near: [['lamp', 2], ['railing', 1.4], ['newsstand', 0.5], ['bin', 0.6], ['minibusStop', 0.5], ['banyan', 0.4], ['flowers', 0.5], ['trafficLight', 0.6]],
    mid: [['towerNeon', 3], ['glassTower', 1]],
    far: [],
  },
  templestreet: {
    ground: 'hkSidewalk', gate: 'none', garland: 0.6, garlandType: 'stringLights',
    x: { edge: 0, near: 5.3, mid: 9.6, far: 30 }, spread: { near: 0.2, mid: 0 }, mult: { near: 0.6, mid: 0.0 },
    edge: [],
    near: [['marketStall', 3], ['daiPaiDong', 1.3], ['lamp', 0.6], ['flowers', 0.4]],
    mid: [['tenement', 1]],
    far: [],
  },
  harbour: {
    ground: 'promenade', gate: 'none', garland: 0,
    x: { edge: 0, near: 5.3, mid: 8.6, far: 30 }, spread: { near: 0.6, mid: 0 }, mult: { near: 1.2, mid: 0.0 },
    edge: [],
    near: [['promLamp', 1.6], ['bench', 1], ['railing', 0.6], ['banyan', 0.4]],
    mid: [['harbour', 1]],
    far: [],
  },
};
export const THEME_ORDER = ['mongkok', 'templestreet', 'harbour'];
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
  return { neonGantry: special(neonGantry), stringLights: special(stringLights) };
}
