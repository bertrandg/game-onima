import * as THREE from 'three';
import { Builder, TexBuilder, U, pick, rand } from '../../geo.js';
import * as NX from './textures.js';

// Décor latéral de New York : trottoirs, mobilier urbain, et façades de gratte-ciel si hautes
// qu'on n'en voit jamais le sommet. Chaque élément est construit "face à +x" (vers la voie quand il est
// à gauche), origine au sol, centré en z. Les façades sont des panneaux texturés (TexBuilder).

const BALL = new THREE.SphereGeometry(1, 8, 6);
const POLE = '#3a4a42';         // vert-gris des lampadaires new-yorkais
const STEEL = '#a8acb0';
const GOLD = '#d8b04a';
const ri = (a, b) => Math.floor(rand(a, b + 1));
const T = NX.TILE;

// Matériaux des panneaux texturés (créés au chargement du niveau)
export function makeTexMats() {
  const lit = (map) => new THREE.MeshLambertMaterial({ map, vertexColors: true });
  return {
    deco: lit(NX.decoFacade()),
    glass: lit(NX.glassFacade()),
    brick: lit(NX.brickFacade()),
    ads: new THREE.MeshBasicMaterial({ map: NX.adsAtlas(), vertexColors: true }),
    ticker: new THREE.MeshBasicMaterial({ map: NX.tickerTexture() }),
  };
}

// ---------- Gratte-ciel ----------
const BW = 10;                  // profondeur des immeubles
const BLEN = 14;                // longueur le long de la rue
const fx = BW / 2;              // façade côté voie

// corps du bâtiment, façade texturée au-dessus du rez-de-chaussée, corniche du socle
function tower(b, t, { key, tint, base = 5.5, H = rand(135, 170), baseCol = '#6a6258' }) {
  b.add(U.box, tint, [0, H / 2, 0], [BW, H, BLEN]);
  t.facade(key, [fx + 0.03, base + (H - base) / 2, 0], [BLEN, H - base], T[key][0], T[key][1], tint, rand(0, 1));
  // socle de pierre sombre et bandeau
  b.add(U.box, baseCol, [fx + 0.1, base / 2, 0], [0.2, base, BLEN]);
  b.add(U.box, '#d8d0c0', [fx + 0.3, base, 0], [0.6, 0.35, BLEN + 0.02]);
  return H;
}

// vitrines de rez-de-chaussée (2 ou 3 boutiques) avec auvents
function shopfronts(b, n, cols, awning = true) {
  const sw = BLEN / n;
  for (let k = 0; k < n; k++) {
    const zc = -BLEN / 2 + sw * (k + 0.5);
    b.add(U.box, pick(cols), [fx + 0.22, 2.4, zc], [0.08, 3.6, sw - 0.6]);
    b.add(U.box, '#28323c', [fx + 0.27, 1.8, zc], [0.04, 2.6, sw - 1.2]);
    b.add(U.box, '#f0f4f6', [fx + 0.29, 1.8, zc + sw * 0.15], [0.02, 2.4, 0.08]);
    b.add(U.box, '#ffe8a8', [fx + 0.28, 3.6, zc], [0.03, 0.5, sw - 1.4]);   // enseigne lumineuse
    if (awning) {
      const ac = pick(['#c8302a', '#2c5a3a', '#1f3a70', '#e8a020', '#5a2a6a']);
      b.add(U.box, ac, [fx + 1.0, 3.25, zc], [1.6, 0.06, sw - 0.8], [0, 0, -0.3]);
      b.add(U.box, ac, [fx + 1.78, 3.0, zc], [0.04, 0.3, sw - 0.8]);
    }
  }
}

function decoTower(b, t) {   // tour Art déco en pierre (Wall Street)
  const tint = pick(['#f4ecdc', '#e6e2da', '#f2dccc', '#e8e0c8', '#dcd8d0']);
  tower(b, t, { key: 'deco', tint, baseCol: pick(['#4a4440', '#3a3a3e', '#5a4a3a']) });
  // entrée monumentale : portique doré et portes à tambour
  b.add(U.box, '#2a2622', [fx + 0.25, 2.2, 0], [0.1, 4.4, 4.4]);
  b.add(U.box, GOLD, [fx + 0.3, 4.55, 0], [0.12, 0.3, 4.8]);
  for (const dz of [-1.4, -0.45, 0.45, 1.4]) b.add(U.box, '#c89a40', [fx + 0.32, 1.4, dz], [0.04, 2.6, 0.8]);
  for (const dz of [-1.4, -0.45, 0.45, 1.4]) b.add(U.box, '#32404c', [fx + 0.34, 1.4, dz], [0.02, 2.3, 0.6]);
  for (let i = 0; i < 5; i++) b.add(U.box, GOLD, [fx + 0.33, 3.4 + 0.18 * Math.sin(i), -1.6 + i * 0.8], [0.04, 0.5, 0.06], [0.6 * (i - 2) * 0.3, 0, 0]);
  for (const zc of [-4.8, 4.8]) {   // vitrines de part et d'autre
    b.add(U.box, '#3a2e26', [fx + 0.22, 2.3, zc], [0.08, 3.4, 3.4]);
    b.add(U.box, '#2a3a46', [fx + 0.27, 2.0, zc], [0.04, 2.6, 2.8]);
  }
}

function glassTower(b, t) {   // tour de verre moderne sur socle noir
  tower(b, t, { key: 'glass', tint: pick(['#ffffff', '#e8f4ff', '#f0f0ff', '#e0f0f0']), baseCol: '#202428' });
  b.add(U.box, '#1a1e22', [fx + 0.22, 2.6, 0], [0.08, 5.2, BLEN - 0.4]);
  b.add(U.box, '#9ab8cc', [fx + 0.28, 2.4, 0], [0.04, 4.4, BLEN - 1.4]);   // hall vitré
  for (let i = 0; i < 6; i++) b.add(U.box, '#1a1e22', [fx + 0.3, 2.4, -BLEN / 2 + 1.2 + i * 2.3], [0.06, 4.4, 0.12]);
  b.add(U.box, '#e8eef2', [fx + 0.6, 5.0, 0], [1.2, 0.18, 6]);   // marquise
  for (let i = 0; i < 4; i++) b.add(U.cyl6, '#ffeec0', [fx + 0.4, 1.1, -1.5 + i], [0.18, 0.9, 0.18]);   // bornes
}

// Temple de la bourse : colonnes corinthiennes, fronton, portes de bronze
function exchange(b, t) {
  const tint = '#efe8da';
  b.add(U.box, tint, [0, 80, 0], [BW, 160, BLEN]);
  t.facade('deco', [fx - 2.4, 50, 0], [BLEN, 60], T.deco[0], T.deco[1], '#e8e2d6');
  t.facade('deco', [fx - 2.4 + 0.02, 115, 0], [BLEN, 70], T.deco[0], T.deco[1], '#f0eadc');
  b.add(U.box, '#d8d0c0', [fx - 1, 0.5, 0], [3.8, 1.0, BLEN]);   // emmarchement
  for (let i = 0; i < 3; i++) b.add(U.box, '#e2dccc', [fx + 0.4 - i * 0.4, 0.18 + i * 0.32, 0], [0.4, 0.36, BLEN - 1]);
  for (let i = 0; i < 6; i++) {
    const z = -BLEN / 2 + 1.3 + i * ((BLEN - 2.6) / 5);
    b.add(U.cyl, '#f6f0e4', [fx - 0.6, 7.4, z], [0.55, 12.8, 0.55]);
    b.add(U.box, '#ece6d8', [fx - 0.6, 1.2, z], [1.3, 0.4, 1.3]);
    b.add(U.box, '#ece6d8', [fx - 0.6, 13.9, z], [1.3, 0.5, 1.3]);   // chapiteau
    for (let k = 0; k < 6; k++) b.add(U.box, '#e2dccc', [fx - 0.6 + Math.cos(k) * 0.5, 7.4, z + Math.sin(k) * 0.5], [0.06, 12.4, 0.06]);   // cannelures
  }
  b.add(U.box, '#f2ecde', [fx - 0.6, 14.8, 0], [1.6, 1.3, BLEN]);   // entablement
  b.add(U.roof, '#ece6d6', [fx - 0.6, 15.45, 0], [BLEN + 0.3, 3.6, 1.6], [0, Math.PI / 2, 0]);   // fronton
  b.add(U.box, '#d8d0c0', [fx - 0.5, 16.5, 0], [0.3, 1.2, 5]);   // frise sculptée
  b.add(U.box, '#3a3632', [fx - 2.2, 7, 0], [0.1, 12, BLEN - 1]);   // fond sombre du portique
  // grandes portes de bronze au fond du portique
  for (const z of [-3, 0, 3]) {
    b.add(U.box, '#8a6a3a', [fx - 2.1, 3.0, z], [0.1, 5.2, 2.0]);
    b.add(U.box, '#2a3440', [fx - 2.05, 9.5, z], [0.06, 5.5, 1.8]);
  }
}

// Façade de Times Square couverte d'écrans et de panneaux, bandeau d'actualités qui défile
function timesTower(b, t) {
  const key = pick(['glass', 'deco']);
  tower(b, t, { key, tint: key === 'glass' ? '#ffffff' : pick(['#e6e2da', '#f2dccc']), baseCol: '#1a1820' });
  // rez-de-chaussée : marquise de théâtre à ampoules
  b.add(U.box, '#1a1820', [fx + 0.22, 2.4, 0], [0.08, 4.8, BLEN - 0.4]);
  b.add(U.box, '#2a3442', [fx + 0.27, 1.8, 0], [0.04, 2.8, BLEN - 2]);
  b.add(U.box, '#c8302a', [fx + 1.1, 4.4, 0], [2.0, 0.9, 8]);
  b.add(U.box, '#fff2c0', [fx + 2.12, 4.4, 0], [0.04, 0.6, 7.6]);
  for (let i = 0; i < 26; i++) b.add(U.box, '#fff8d8', [fx + 2.15, 4.85, -3.9 + i * 0.31], [0.06, 0.08, 0.08]);
  t.quad('ads', [fx + 2.16, 4.4, 0], [7.0, 0.55], pick(NX.ADS.wide));
  // bandeau qui défile tout le long de la façade
  b.add(U.box, '#141414', [fx + 0.35, 6.6, 0], [0.5, 1.5, BLEN]);
  t.quad('ticker', [fx + 0.62, 6.6, 0], [BLEN, 1.1], [0, 0, BLEN / 6, 1]);
  // grands panneaux : un ou deux par étage d'affichage, cadres sombres en saillie
  let y = 8.6;
  while (y < 46) {
    const tall = Math.random() < 0.45;
    const h = tall ? rand(9, 13) : rand(5, 7);
    const w = tall ? h / 2 : h * 2;
    if (w > BLEN - 1) { y += 2; continue; }
    const z = rand(-BLEN / 2 + w / 2 + 0.3, BLEN / 2 - w / 2 - 0.3);
    b.add(U.box, '#18161c', [fx + 0.45, y + h / 2, z], [0.7, h + 0.5, w + 0.5]);
    t.quad('ads', [fx + 0.82, y + h / 2, z], [w, h], pick(tall ? NX.ADS.tall : NX.ADS.wide));
    // néons de couleur autour de certains panneaux
    if (Math.random() < 0.5) {
      const nc = pick(['#ff5ab0', '#5ae0ff', '#ffe25a', '#7aff8a']);
      b.add(U.box, nc, [fx + 0.85, y - 0.1, z], [0.06, 0.12, w + 0.5]);
      b.add(U.box, nc, [fx + 0.85, y + h + 0.1, z], [0.06, 0.12, w + 0.5]);
    }
    y += h + rand(1.2, 3);
  }
}

// Immeuble de brique de Chinatown : escaliers de secours, boutiques à auvents, enseignes verticales
function fireEscape(b, z, floors) {
  const F = 3, w = 3.2;
  for (let f = 0; f < floors; f++) {
    const y = 5.6 + f * F;
    b.add(U.box, '#1e1e22', [fx + 0.6, y, z], [1.1, 0.06, w]);             // palier
    b.add(U.box, '#1e1e22', [fx + 1.14, y + 0.5, z], [0.04, 0.04, w]);     // rambarde
    for (let k = 0; k <= 8; k++) b.add(U.box, '#1e1e22', [fx + 1.14, y + 0.25, z - w / 2 + (k * w) / 8], [0.03, 0.5, 0.03]);
    for (const dz of [-w / 2, w / 2]) b.add(U.box, '#1e1e22', [fx + 0.6, y + 0.25, z + dz], [1.1, 0.04, 0.03]);
    if (f < floors - 1) {   // escalier en biais vers l'étage du dessus
      const L = Math.hypot(F, w * 0.8), a = Math.atan2(F, w * 0.8) * (f % 2 ? 1 : -1);
      b.add(U.box, '#26262a', [fx + 0.75, y + F / 2, z], [0.55, 0.05, L], [a, 0, 0]);
    }
  }
}
function tenement(b, t) {
  const tint = pick(['#c87058', '#b85a48', '#d8a888', '#a8c0a0', '#e8dcc8', '#c88a70']);
  tower(b, t, { key: 'brick', tint, base: 5.2, baseCol: '#3a2a24' });
  // boutiques : auvents colorés et enseignes dorées
  for (let k = 0; k < 2; k++) {
    const zc = (k - 0.5) * 7;
    const col = pick(['#c8202a', '#2c7a4a', '#e8a020', '#1f5a8a']);
    b.add(U.box, col, [fx + 0.22, 2.4, zc], [0.08, 4.4, 6.4]);
    b.add(U.box, '#2a343c', [fx + 0.27, 1.6, zc], [0.04, 2.4, 5.2]);
    b.add(U.box, '#c8202a', [fx + 0.3, 3.85, zc], [0.06, 0.9, 6.2]);   // bandeau d'enseigne rouge
    for (let i = 0; i < 4; i++) b.add(U.box, GOLD, [fx + 0.34, 3.85, zc - 1.8 + i * 1.2], [0.02, 0.55, 0.7]);
    b.add(U.box, col, [fx + 1.1, 3.1, zc], [1.8, 0.06, 6], [0, 0, -0.25]);
    // fruits sur l'étal devant la boutique
    if (Math.random() < 0.5) {
      b.add(U.box, '#8a6a42', [fx + 0.9, 0.8, zc], [0.9, 0.1, 4]);
      for (let i = 0; i < 8; i++) b.add(BALL, pick(['#f2a020', '#e8401c', '#7ab83a', '#f2d23a', '#c8302a']), [fx + 0.9 + rand(-0.3, 0.3), 0.95, zc + rand(-1.8, 1.8)], [0.12, 0.1, 0.12]);
    }
  }
  // enseigne verticale lumineuse à idéogrammes stylisés
  const sz = rand(-2, 2);
  b.add(U.box, '#c8202a', [fx + 0.9, 9, sz], [0.25, 6, 1.2]);
  b.add(U.box, GOLD, [fx + 0.9, 9, sz], [0.3, 6.1, 0.08]);
  for (let i = 0; i < 4; i++) {
    b.add(U.box, '#ffe8a0', [fx + 1.04, 11 - i * 1.35, sz], [0.03, 0.7, 0.7]);
    b.add(U.box, '#c8202a', [fx + 1.06, 11 - i * 1.35, sz], [0.02, 0.5, 0.1]);
    b.add(U.box, '#c8202a', [fx + 1.06, 11 - i * 1.35 + 0.1, sz], [0.02, 0.1, 0.5]);
  }
  fireEscape(b, rand(-4, 4), ri(5, 8));
  // lanternes rouges suspendues aux auvents
  for (const z of [-5, -1.5, 2, 5.5]) {
    b.add(BALL, '#e8202a', [fx + 1.6, 2.6, z], [0.28, 0.34, 0.28]);
    b.add(U.cyl, GOLD, [fx + 1.6, 2.98, z], [0.12, 0.08, 0.12]);
    b.add(U.cyl, GOLD, [fx + 1.6, 2.22, z], [0.12, 0.06, 0.12]);
  }
}

// ---------- Mobilier urbain ----------
function lamp(b) {   // lampadaire « crosse d'évêque »
  b.add(U.cyl6, POLE, [0, 0.3, 0], [0.24, 0.6, 0.24]);
  b.add(U.cyl6, POLE, [0, 0.7, 0], [0.16, 0.3, 0.16]);
  b.add(U.cyl6, POLE, [0, 3.2, 0], [0.08, 5.2, 0.08]);
  for (let i = 0; i <= 6; i++) {   // crosse courbée vers la rue
    const a = (i / 6) * Math.PI;
    b.add(U.box, POLE, [0.5 - Math.cos(a) * 0.5, 5.8 + Math.sin(a) * 0.5, 0], [0.1, 0.1, 0.1]);
  }
  b.add(U.box, POLE, [1.0, 5.6, 0], [0.06, 0.35, 0.06]);
  b.add(U.cone8, POLE, [1.0, 5.35, 0], [0.32, 0.3, 0.32], [Math.PI, 0, 0]);
  b.add(BALL, '#fff2c0', [1.0, 5.12, 0], [0.18, 0.14, 0.18]);
}

function hydrant(b) {   // bouche d'incendie rouge et chromée
  b.add(U.cyl, '#c8202a', [0, 0.35, 0], [0.18, 0.6, 0.18]);
  b.add(U.cyl, '#c8202a', [0, 0.05, 0], [0.25, 0.1, 0.25]);
  b.add(BALL, '#e8e4dc', [0, 0.7, 0], [0.19, 0.16, 0.19]);
  b.add(U.cyl6, '#e8e4dc', [0, 0.86, 0], [0.05, 0.08, 0.05]);
  for (const s of [-1, 1]) b.add(U.cyl6, '#e8e4dc', [0, 0.45, s * 0.2], [0.07, 0.14, 0.07], [Math.PI / 2, 0, 0]);
  b.add(U.cyl6, '#e8e4dc', [0.2, 0.45, 0], [0.09, 0.14, 0.09], [0, 0, Math.PI / 2]);
}

function litter(b) {   // corbeille grillagée verte
  b.add(U.cyl, '#2c5a3a', [0, 0.5, 0], [0.3, 0.06, 0.3]);
  b.add(U.cyl, '#2c5a3a', [0, 0.95, 0], [0.32, 0.06, 0.32]);
  b.add(U.cyl, '#2c5a3a', [0, 0.06, 0], [0.24, 0.06, 0.24]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(U.box, '#2c5a3a', [Math.cos(a) * 0.28, 0.5, Math.sin(a) * 0.28], [0.025, 0.95, 0.025], [Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]);
  }
  b.add(BALL, '#e8e0d0', [0, 0.9, 0], [0.22, 0.12, 0.22]);   // papiers qui débordent
}

function newsboxes(b) {   // distributeurs de journaux colorés
  const cols = ['#c8202a', '#1f5aa0', '#f2c230', '#2c7a4a', '#f4f0e8', '#e86a20'];
  const n = ri(2, 4);
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * 0.62, c = pick(cols);
    b.add(U.box, c, [0, 0.6, z], [0.5, 0.75, 0.56]);
    b.add(U.box, '#2a343c', [0.26, 0.7, z], [0.02, 0.3, 0.4]);
    b.add(U.box, '#f4f0e8', [0.26, 0.42, z], [0.02, 0.12, 0.36]);
    for (const dz of [-0.22, 0.22]) b.add(U.box, '#4a4a4e', [0, 0.12, z + dz], [0.4, 0.24, 0.04]);
  }
}

function mailbox(b) {   // boîte aux lettres bleue
  b.add(U.box, '#1f4a9a', [0, 0.65, 0], [0.55, 0.85, 0.6]);
  b.add(U.cyl, '#1f4a9a', [0, 1.08, 0], [0.3, 0.6, 0.275], [Math.PI / 2, 0, 0]);
  b.add(U.box, '#e8e4dc', [0.28, 0.85, 0], [0.02, 0.06, 0.36]);
  b.add(U.box, '#f4f0e8', [0.28, 0.55, 0], [0.02, 0.2, 0.3]);
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.add(U.box, '#14306a', [s * 0.22, 0.12, t * 0.24], [0.06, 0.24, 0.06]);
}

function subway(b) {   // bouche de métro : rambardes, escalier, globes verts, pastilles des lignes
  const L = 4.2, RAIL = '#2a3a30';
  for (const x of [-0.85, 0.85]) {
    b.add(U.box, RAIL, [x, 1.0, 0], [0.06, 0.06, L]);
    for (let i = 0; i <= 8; i++) b.add(U.box, RAIL, [x, 0.5, -L / 2 + (i * L) / 8], [0.04, 1.0, 0.04]);
  }
  b.add(U.box, RAIL, [0, 1.0, -L / 2], [1.76, 0.06, 0.06]);
  b.add(U.box, '#1a1a1c', [0, 0.02, 0], [1.7, 0.04, L - 0.2]);   // trémie sombre
  for (let i = 0; i < 6; i++) b.add(U.box, '#4a4a4e', [0, 0.04, L / 2 - 0.5 - i * 0.6], [1.6, 0.02, 0.1]);
  for (const x of [-0.85, 0.85]) {
    b.add(U.cyl6, RAIL, [x, 1.25, L / 2], [0.05, 2.5, 0.05]);
    b.add(BALL, '#5ad87a', [x, 2.6, L / 2], [0.2, 0.2, 0.2]);
  }
  // panneau noir avec pastilles colorées des lignes, tourné vers la rue
  b.add(U.box, '#141414', [0.9, 1.9, L / 2 - 1.0], [0.1, 0.4, 1.6]);
  ['#e8202a', '#2c9a4a', '#f2c230', '#1f5aa0'].forEach((c, i) => b.add(U.cyl, c, [0.96, 1.9, L / 2 - 1.55 + i * 0.36], [0.13, 0.03, 0.13], [0, 0, Math.PI / 2]));
}

function hotdogCart(b) {   // chariot de hot-dogs avec parasol et vendeur
  b.add(U.box, '#d8dcdf', [0, 0.85, 0], [0.9, 0.7, 1.8]);
  b.add(U.box, '#c8202a', [0.46, 0.85, 0], [0.02, 0.3, 1.6]);
  b.add(U.box, '#f2c230', [0.47, 0.85, 0], [0.02, 0.12, 1.2]);
  b.add(U.box, '#b8bcc0', [0, 1.23, 0], [0.9, 0.06, 1.8]);
  for (const z of [-0.6, 0.6]) b.add(U.cyl, '#2a2a2e', [0.5, 0.25, z], [0.25, 0.08, 0.25], [0, 0, Math.PI / 2]);
  b.add(U.cyl6, '#e8e4dc', [0, 2.1, 0], [0.03, 1.8, 0.03]);
  for (let i = 0; i < 8; i++) {   // parasol à quartiers jaunes et bleus
    const a = (i / 8) * Math.PI * 2;
    b.add(U.cone8, i % 2 ? '#f2c230' : '#1f5aa0', [Math.cos(a) * 0.45, 2.85, Math.sin(a) * 0.45], [0.55, 0.35, 0.55], [Math.sin(a) * 0.4, -a, -Math.cos(a) * 0.4]);
  }
  for (const [c, z] of [['#e8202a', -0.4], ['#f2d23a', -0.2]]) b.add(U.cyl6, c, [0.2, 1.38, z], [0.05, 0.24, 0.05]);
  // vendeur à casquette
  b.add(U.box, '#2a5a8a', [-0.75, 1.0, 0.3], [0.4, 0.8, 0.45]);
  b.add(U.box, '#2a2a3a', [-0.75, 0.3, 0.3], [0.32, 0.6, 0.36]);
  b.add(BALL, '#e8c4a0', [-0.75, 1.6, 0.3], [0.2, 0.22, 0.2]);
  b.add(U.cyl, '#c8202a', [-0.75, 1.78, 0.3], [0.2, 0.08, 0.2]);
  b.add(U.box, '#c8202a', [-0.55, 1.75, 0.3], [0.2, 0.03, 0.2]);
}

function tree(b) {   // arbre d'alignement dans sa fosse grillagée
  b.add(U.box, '#4a3a2a', [0, 0.02, 0], [1.2, 0.04, 1.2]);
  for (const [dx, dz, w, l] of [[0.6, 0, 0.04, 1.2], [-0.6, 0, 0.04, 1.2], [0, 0.6, 1.2, 0.04], [0, -0.6, 1.2, 0.04]]) b.add(U.box, '#2a2a2e', [dx, 0.25, dz], [w, 0.05, l]);
  const h = rand(3.2, 4.2);
  b.add(U.cyl6, '#5a4632', [0, h / 2, 0], [0.12, h, 0.12]);
  for (let i = 0; i < 9; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.2, 1.3);
    b.add(U.sph, pick(['#7aa84a', '#8ab858', '#6a9a40', '#9ac060']), [Math.cos(a) * r, h + rand(0.2, 1.6), Math.sin(a) * r], [rand(0.7, 1.0), rand(0.6, 0.8), rand(0.7, 1.0)]);
  }
}

function signal(b) {   // feu tricolore et feu piéton « main / bonhomme »
  b.add(U.cyl6, '#3a3a3e', [0, 2.2, 0], [0.09, 4.4, 0.09]);
  b.add(U.box, '#f2c230', [0.2, 3.7, 0], [0.3, 1.1, 0.36]);
  ['#e8202a', '#f2a020', '#3ae07a'].forEach((c, i) => b.add(BALL, c, [0.36, 4.05 - i * 0.34, 0], [0.04, 0.12, 0.12]));
  b.add(U.box, '#2a2a2e', [0.12, 2.6, 0], [0.3, 0.4, 0.4]);
  b.add(U.box, '#ff7a3a', [0.28, 2.6, 0], [0.02, 0.24, 0.24]);
}

function scaffold(b) {   // échafaudage de trottoir (« sidewalk shed ») vert avec affiches interdites
  const L = 10, W = 3.0, H = 3.2;
  for (let i = 0; i <= 5; i++) {
    const z = -L / 2 + (i * L) / 5;
    for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) b.add(U.box, '#2c5a3a', [x, H / 2, z], [0.14, H, 0.14]);
    b.add(U.box, '#fff2c0', [0, H - 0.25, z], [0.4, 0.06, 0.12]);   // rampe d'éclairage
  }
  b.add(U.box, '#2c5a3a', [0, H + 0.2, 0], [W, 0.4, L + 0.2]);
  b.add(U.box, '#2c5a3a', [W / 2 - 0.1, H + 0.8, 0], [0.08, 0.8, L + 0.2]);   // garde-corps plein
  for (let i = 0; i < 4; i++) b.add(U.box, '#f4f0e8', [W / 2 - 0.05, H + 0.8, -L / 2 + 1.4 + i * 2.4], [0.02, 0.35, 1.6]);
  b.add(U.box, '#f2c230', [W / 2 + 0.01, H + 0.2, 0], [0.02, 0.12, L]);
}

function tkts(b) {   // escalier rouge lumineux de Times Square
  const L = 5.6, n = 9;
  for (let i = 0; i < n; i++) {
    const h = 0.3 + i * 0.32;
    b.add(U.box, '#e8202a', [-1.3 + (i * 2.6) / n, h / 2, 0], [2.6 / n + 0.02, h, L]);
    b.add(U.box, '#ff6a6a', [-1.3 + (i * 2.6) / n + 0.12, h + 0.01, 0], [0.06, 0.02, L]);
  }
  for (let i = 0; i < 6; i++) {   // touristes assis
    const k = ri(1, n - 1), x = -1.3 + (k * 2.6) / n, z = rand(-L / 2 + 0.4, L / 2 - 0.4), y = 0.3 + k * 0.32;
    b.add(U.box, pick(['#3a6ac8', '#f2c230', '#2a2a3a', '#e86a9a', '#5aba7a']), [x, y + 0.3, z], [0.3, 0.5, 0.36]);
    b.add(BALL, pick(['#f2d2b8', '#c89a70', '#8a5a3a']), [x, y + 0.7, z], [0.15, 0.17, 0.15]);
  }
  for (const z of [-L / 2, L / 2]) b.add(U.box, '#dcdcdc', [0, 1.6, z], [2.8, 0.06, 0.06]);
}

function plaza(b) {   // tables et chaises rouges de la zone piétonne
  for (const z of [-0.9, 0.9]) {
    b.add(U.cyl, '#c8202a', [0, 0.72, z], [0.32, 0.04, 0.32]);
    b.add(U.cyl6, '#2a2a2e', [0, 0.36, z], [0.03, 0.72, 0.03]);
    for (const dz of [-0.5, 0.5]) {
      b.add(U.box, '#c8202a', [0.1, 0.44, z + dz], [0.38, 0.04, 0.38]);
      b.add(U.box, '#c8202a', [-0.08, 0.7, z + dz], [0.03, 0.5, 0.38]);
      for (const dx of [-0.15, 0.15]) b.add(U.box, '#c8202a', [0.1 + dx, 0.22, z + dz], [0.03, 0.44, 0.03]);
    }
  }
  b.add(U.cyl, '#6a5a4a', [0.3, 0.3, 1.9], [0.45, 0.6, 0.45]);   // jardinière
  for (let i = 0; i < 5; i++) b.add(U.sph, pick(['#ff7ab0', '#ffd23f', '#7ab84a']), [0.3 + rand(-0.25, 0.25), 0.75, 1.9 + rand(-0.25, 0.25)], [0.18, 0.16, 0.18]);
}

function phoneBooth(b) {   // cabine téléphonique à toit de pagode
  b.add(U.box, '#c8202a', [0, 1.1, 0], [0.8, 2.2, 0.8]);
  b.add(U.box, '#3a4450', [0.41, 1.25, 0], [0.02, 1.4, 0.6]);
  b.add(U.box, '#f2c230', [0.41, 2.05, 0], [0.02, 0.2, 0.64]);
  b.add(U.cone4, '#2c7a4a', [0, 2.5, 0], [0.85, 0.5, 0.85], [0, Math.PI / 4, 0]);
  b.add(U.cone4, '#2c7a4a', [0, 2.9, 0], [0.55, 0.45, 0.55], [0, Math.PI / 4, 0]);
  for (const [dx, dz] of [[0.62, 0.62], [-0.62, 0.62], [0.62, -0.62], [-0.62, -0.62]]) b.add(U.cone4, GOLD, [dx, 2.38, dz], [0.06, 0.2, 0.06], [dz > 0 ? 0.6 : -0.6, 0, dx > 0 ? -0.6 : 0.6]);
  b.add(BALL, GOLD, [0, 3.2, 0], [0.1, 0.14, 0.1]);
}

function fruitStand(b) {   // étal de fruits sous bâche
  b.add(U.box, '#8a6a42', [0, 0.75, 0], [1.2, 0.1, 3]);
  for (const z of [-1.3, 1.3]) b.add(U.box, '#6a4a2a', [0, 0.38, z], [1.1, 0.75, 0.06]);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 4; i++) {
      const x = -0.25 + r * 0.5, z = -1.05 + i * 0.7, c = pick(['#f2a020', '#e8401c', '#7ab83a', '#f2d23a', '#c8302a', '#a03a8a']);
      b.add(U.box, '#c8a46a', [x, 0.9, z], [0.45, 0.18, 0.62]);
      for (let k = 0; k < 4; k++) b.add(U.sph0, c, [x + rand(-0.12, 0.12), 1.04, z + rand(-0.2, 0.2)], [0.09, 0.09, 0.09]);
    }
  }
  for (const [x, z] of [[0.6, -1.4], [0.6, 1.4], [-0.6, -1.4], [-0.6, 1.4]]) b.add(U.cyl6, '#5a5a5e', [x, 1.2, z], [0.03, 2.4, 0.03]);
  b.add(U.box, pick(['#2c7a4a', '#c8202a', '#1f5aa0']), [0, 2.4, 0], [1.5, 0.05, 3.2], [0, 0, -0.12]);
}

// ---------- Sols (bandes de 32 m, côté +x vers la voie) ----------
const STRIP = 32;
function sidewalkStrip(b) {   // dalles de béton, joints, bordure de granit
  b.add(U.box, '#b9b6ae', [0, 0.06, 0], [3.4, 0.12, STRIP]);
  for (let i = 0; i <= 20; i++) b.add(U.box, '#a09d95', [0, 0.122, -STRIP / 2 + i * 1.6], [3.4, 0.004, 0.05]);
  b.add(U.box, '#a09d95', [-0.05, 0.122, 0], [0.05, 0.004, STRIP]);
  for (let i = 0; i < 14; i++) b.add(U.box, pick(['#c4c1b9', '#aeaba3']), [rand(-1.5, 1.4), 0.123, rand(-15, 15)], [rand(0.6, 1.5), 0.003, 1.5]);
  b.add(U.box, '#a8a49a', [1.68, 0.09, 0], [0.16, 0.2, STRIP]);   // bordure de granit
  for (let i = 0; i < 6; i++) b.add(U.box, '#46464a', [rand(-1.2, 1.2), 0.13, rand(-15, 15)], [0.5, 0.01, 0.9]);   // trappes de cave
}

// ---------- Portails au-dessus des voies ----------
// potence de feux tricolores avec plaques de rue et passage piéton
function gantry(b) {
  b.add(U.cyl6, '#4a4a4e', [5.4, 4, 0], [0.18, 8, 0.18]);
  b.add(U.cyl6, '#4a4a4e', [5.4, 0.3, 0], [0.3, 0.6, 0.3]);
  b.add(U.box, '#4a4a4e', [0.2, 7.4, 0], [10.6, 0.16, 0.16]);
  b.add(U.box, '#4a4a4e', [3.6, 6.8, 0], [3.6, 0.1, 0.1], [0, 0, 0.35]);
  for (const x of [-2.6, 0, 2.6]) {   // feux au-dessus de chaque voie, face au joueur
    b.add(U.box, '#f2c230', [x, 6.6, 0], [0.42, 1.25, 0.32]);
    ['#e8202a', '#f2a020', '#3ae07a'].forEach((c, i) => {
      b.add(BALL, c, [x, 7.0 - i * 0.38, 0.17], [0.13, 0.13, 0.04]);
      b.add(U.box, '#2a2a2e', [x, 7.12 - i * 0.38, 0.24], [0.32, 0.03, 0.14]);
    });
  }
  // plaques vertes (nom de rue) et panneau « ONE WAY »
  b.add(U.box, '#1f6a3a', [-1.3, 7.85, 0], [2.6, 0.5, 0.05]);
  b.add(U.box, '#f4f4f0', [-1.3, 7.85, 0.03], [2.2, 0.08, 0.02]);
  b.add(U.box, '#141414', [1.3, 7.85, 0], [1.6, 0.42, 0.05]);
  b.add(U.box, '#f4f4f0', [1.15, 7.85, 0.03], [1.0, 0.1, 0.02]);
  b.add(U.cone4, '#f4f4f0', [1.8, 7.85, 0.03], [0.14, 0.24, 0.02], [0, 0, -Math.PI / 2]);
  // passage piéton zébré
  for (let i = 0; i < 12; i++) b.add(U.box, '#f2f0e8', [-4 + i * 0.72, 0.032, 2.2], [0.42, 0.012, 3.2]);
}

// porte chinoise (paifang) : piliers rouges, toits verts à bords relevés, plaque dorée, lanternes
function paifang(b) {
  for (const x of [-5.6, 5.6, -3.0, 3.0]) {
    const big = Math.abs(x) > 5;
    b.add(U.box, '#d8d0c0', [x, 0.35, 0], [0.9, 0.7, 0.9]);
    b.add(U.cyl, '#c8202a', [x, big ? 4.2 : 3.4, 0], [0.26, big ? 7.6 : 6.0, 0.26]);
  }
  const roof = (y, w, d) => {
    b.add(U.box, '#c8202a', [0, y - 0.45, 0], [w - 0.6, 0.5, 0.5]);
    b.add(U.box, GOLD, [0, y - 0.45, 0.26], [w - 1.2, 0.18, 0.02]);
    b.add(U.roof, '#2c7a4a', [0, y, 0], [d, 1.0, w], [0, Math.PI / 2, 0]);
    for (const s of [-1, 1]) b.add(U.cone4, '#2c7a4a', [s * (w / 2 + 0.2), y + 0.25, 0], [0.4, 0.9, 0.5], [0, 0, s * -0.9]);   // bords relevés
    b.add(U.box, '#24603a', [0, y + 1.02, 0], [w * 0.92, 0.18, 0.2]);
  };
  roof(8.4, 13, 2.2);
  roof(6.6, 6.8, 1.8);
  b.add(U.box, GOLD, [0, 5.4, 0.1], [2.6, 1.0, 0.12]);
  b.add(U.box, '#c8202a', [0, 5.4, 0.18], [2.3, 0.8, 0.04]);
  for (let i = 0; i < 3; i++) b.add(U.box, GOLD, [-0.7 + i * 0.7, 5.4, 0.21], [0.4, 0.5, 0.02]);
  for (const x of [-4.3, 4.3]) {
    b.add(U.cyl6, '#2a2a2e', [x, 7.2, 0], [0.02, 0.8, 0.02]);
    b.add(BALL, '#e8202a', [x, 6.5, 0], [0.4, 0.5, 0.4]);
    b.add(U.cyl, GOLD, [x, 7.0, 0], [0.18, 0.08, 0.18]);
    b.add(U.cyl, GOLD, [x, 5.98, 0], [0.18, 0.06, 0.18]);
    b.add(U.cyl6, '#f2c230', [x, 5.7, 0], [0.03, 0.5, 0.03]);
  }
}

// guirlande de lanternes rouges tendue au-dessus de la rue
function lanterns(b) {
  for (const x of [-5.2, 5.2]) b.add(U.cyl6, '#3a3a3e', [x, 4.6, 0], [0.08, 9.2, 0.08]);
  for (let i = 0; i <= 20; i++) {
    const x = -5.2 + i * 0.52, y = 8.6 - Math.sin((i / 20) * Math.PI) * 0.9;
    b.add(U.box, '#2a2522', [x, y, 0], [0.54, 0.02, 0.02], [0, 0, (i < 10 ? -1 : 1) * 0.17]);
    if (i % 3 === 1) {
      b.add(BALL, '#e8202a', [x, y - 0.5, 0], [0.26, 0.32, 0.26]);
      b.add(U.cyl, GOLD, [x, y - 0.17, 0], [0.1, 0.06, 0.1]);
      b.add(U.cyl, GOLD, [x, y - 0.83, 0], [0.1, 0.05, 0.1]);
      b.add(U.cyl6, '#f2c230', [x, y - 1.05, 0], [0.02, 0.35, 0.02]);
    }
  }
}

// ---------- Catalogue et thèmes ----------
export const DECOR = {
  decoTower: { len: BLEN, w: BW, face: true, build: decoTower },
  glassTower: { len: BLEN, w: BW, face: true, build: glassTower },
  exchange: { len: BLEN, w: BW, face: true, build: exchange },
  timesTower: { len: BLEN, w: BW, face: true, build: timesTower },
  tenement: { len: BLEN, w: BW, face: true, build: tenement },
  lamp: { len: 1, w: 0.6, face: true, build: lamp },
  hydrant: { len: 0.6, w: 0.5, build: hydrant },
  litter: { len: 0.7, w: 0.7, build: litter },
  newsboxes: { len: 2.2, w: 0.6, face: true, build: newsboxes },
  mailbox: { len: 0.7, w: 0.6, face: true, build: mailbox },
  subway: { len: 4.4, w: 2.0, face: true, build: subway },
  hotdogCart: { len: 2.2, w: 1.6, face: true, build: hotdogCart },
  tree: { len: 2.6, w: 2.4, build: tree },
  signal: { len: 0.6, w: 0.5, face: true, build: signal },
  scaffold: { len: 10.4, w: 3.0, face: true, build: scaffold },
  tkts: { len: 5.8, w: 2.6, face: true, build: tkts },
  plaza: { len: 3, w: 1.2, face: true, build: plaza },
  phoneBooth: { len: 1, w: 1, face: true, build: phoneBooth },
  fruitStand: { len: 3.2, w: 1.4, face: true, build: fruitStand },
  sidewalk: { len: STRIP, w: 3.4, face: true, build: sidewalkStrip },
};

const STREET = [['lamp', 2.4], ['hydrant', 1], ['litter', 1], ['newsboxes', 0.7], ['mailbox', 0.5], ['signal', 0.8], ['tree', 1]];
export const THEMES = {
  wallstreet: {
    ground: 'sidewalk', gate: 'gate', gateEvery: [180, 300], garland: 0,
    x: { edge: 0, near: 5.3, mid: 8.4, far: 30 }, spread: { near: 0.3, mid: 0 }, mult: { near: 1.3, mid: 0.04 },
    edge: [],
    near: [...STREET, ['subway', 0.6], ['hotdogCart', 0.6], ['scaffold', 0.5]],
    mid: [['decoTower', 3], ['glassTower', 1.6], ['exchange', 0.5]],
    far: [],
  },
  timessquare: {
    ground: 'sidewalk', gate: 'gate', gateEvery: [200, 320], garland: 0,
    x: { edge: 0, near: 5.3, mid: 8.4, far: 30 }, spread: { near: 0.3, mid: 0 }, mult: { near: 1.0, mid: 0.04 },
    edge: [],
    near: [['lamp', 1.8], ['hydrant', 0.6], ['litter', 0.8], ['newsboxes', 0.6], ['signal', 0.6], ['tkts', 0.5], ['plaza', 1.4], ['hotdogCart', 0.9], ['subway', 0.4]],
    mid: [['timesTower', 1]],
    far: [],
  },
  chinatown: {
    ground: 'sidewalk', gate: 'paifang', gateEvery: [240, 380], garland: 0.5, garlandType: 'lanterns',
    x: { edge: 0, near: 5.3, mid: 8.4, far: 30 }, spread: { near: 0.3, mid: 0 }, mult: { near: 1.0, mid: 0.04 },
    edge: [],
    near: [['lamp', 1.6], ['hydrant', 0.8], ['litter', 0.6], ['fruitStand', 1.6], ['phoneBooth', 0.8], ['newsboxes', 0.4], ['hotdogCart', 0.3]],
    mid: [['tenement', 1]],
    far: [],
  },
};
export const THEME_ORDER = ['wallstreet', 'timessquare', 'chinatown'];
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
    for (let i = 0; i < 6; i++) {
      const b = new Builder(), t = new TexBuilder();
      d.build(b, t);
      d.geos.push(b.build());
      const tx = t.build();
      d.texs.push(tx.length ? tx : null);
    }
  }
  const one = (fn) => { const b = new Builder(); fn(b); return b.build(); };
  return { gate: one(gantry), paifang: one(paifang), lanterns: one(lanterns) };
}
