import * as THREE from 'three';
import { Builder, TexBuilder, U } from '../../geo.js';
import { FLOORS, floorLabel } from './themes.js';
import { CladBuilder, buildFacade, letterColors } from './facades.js';
import { potPlant, dressForm, bench } from './models.js';

// Boutiques du centre commercial. Chaque boutique est un module de SHOP_W mètres le long de la galerie,
// construit une fois au chargement (pour le côté gauche, vitrine tournée vers +x) puis répété par
// instances : la façade (voir facades.js), l'intérieur (sol, murs, plafond, spots) et l'étalage propre au
// type de boutique. Quatre géométries par boutique : facettes (couleurs), parties lumineuses (écrans,
// spots, néons), parements texturés et enseignes (atlas de textes).

export const SHOP_W = 7.8;          // largeur d'une boutique le long de la galerie
export const FRONT_X = 5.6;         // la vitrine, de part et d'autre de la galerie
const BACK_X = 11;                  // fond des boutiques
export const CLEAR_H = 6.0;         // sous le plafond de la galerie
const IN_H = 4.6;                   // plafond des boutiques (le bandeau de l'enseigne est au-dessus)
const HW = SHOP_W / 2 - 0.2;        // demi-largeur intérieure

// ---------- Atlas des textes ----------
// enseignes des 36 boutiques (caisson et lettres seules), panneaux des escalators, publicités des totems,
// plaques d'étage ; en bas, les pastilles des enseignes-drapeaux (9 × 4 cases carrées)
const COLS = 3, ROWS = 32, SH = 64, AW = 1024, AH = ROWS * SH + 512, SW = AW / COLS;
const BLADE = 112, BLADE_Y = ROWS * SH;
export const SLOT = {
  shop: (f, i) => f * 6 + i,
  up: (to) => 36 + (to - 1),         // « ▲ Étage n », to = 1..5
  down: (to) => 41 + to,             // « ▼ Étage n », to = 0..4
  ad: (i) => 46 + i,                 // 6 publicités
  plaque: (f) => 52 + f,
  letters: (f, i) => 58 + f * 6 + i, // lettres seules (fond transparent), posées sur le parement
};
export function slotUV(i) {
  const c = i % COLS, r = Math.floor(i / COLS);
  const pad = 2;
  return [(c * SW + pad) / AW, 1 - ((r + 1) * SH - pad) / AH, ((c + 1) * SW - pad) / AW, 1 - (r * SH + pad) / AH];
}
export function bladeUV(f, i) {
  const n = f * 6 + i, x = (n % 9) * BLADE, y = BLADE_Y + Math.floor(n / 9) * BLADE;
  return [(x + 2) / AW, 1 - (y + BLADE - 2) / AH, (x + BLADE - 2) / AW, 1 - (y + 2) / AH];
}
const ADS = [
  { t: 'SOLDES -50%', bg: '#e8202a', fg: '#ffffff' },
  { t: '✨ Nouveautés ✨', bg: '#7a4ab0', fg: '#ffe84a' },
  { t: 'Bonne journée ✿', bg: '#ff8ac0', fg: '#ffffff' },
  { t: '🎁 Carte cadeau', bg: '#1a1a2e', fg: '#ffd23f' },
  { t: 'Ouvert le dimanche', bg: '#2a8a6a', fg: '#ffffff' },
  { t: '🍭 Étage 6 : bonbons !', bg: '#ffe84a', fg: '#e8307a' },
];

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function drawSlot(g, i, text, bg, fg, { border = null, size = 34, edge = null } = {}) {
  const c = i % COLS, r = Math.floor(i / COLS), x = c * SW, y = r * SH;
  if (bg) { g.fillStyle = bg; g.fillRect(x, y, SW, SH); }
  if (border) { g.strokeStyle = border; g.lineWidth = 4; roundRect(g, x + 5, y + 5, SW - 10, SH - 10, 10); g.stroke(); }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let s = size;
  g.font = `800 ${s}px "Nunito", "Trebuchet MS", system-ui, sans-serif`;
  while (s > 16 && g.measureText(text).width > SW - 26) { s -= 2; g.font = `800 ${s}px "Nunito", "Trebuchet MS", system-ui, sans-serif`; }
  if (edge) { g.strokeStyle = edge; g.lineWidth = 5; g.lineJoin = 'round'; g.strokeText(text, x + SW / 2, y + SH / 2 + 2); }
  g.fillStyle = fg;
  g.fillText(text, x + SW / 2, y + SH / 2 + 2);
}

// pastille d'une enseigne-drapeau : pictogramme de la boutique sur un disque à sa couleur
function drawBlade(g, f, i, s) {
  const n = f * 6 + i, x = (n % 9) * BLADE, y = BLADE_Y + Math.floor(n / 9) * BLADE, c = BLADE / 2;
  g.fillStyle = s.bg;
  g.beginPath(); g.arc(x + c, y + c, c - 1, 0, Math.PI * 2); g.fill();
  g.strokeStyle = s.fg; g.lineWidth = 5;
  g.beginPath(); g.arc(x + c, y + c, c - 7, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `62px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  g.fillStyle = s.fg;
  g.fillText(s.icon, x + c, y + c + 4);
}

export function atlasTexture() {
  const cv = document.createElement('canvas');
  cv.width = AW; cv.height = AH;
  const g = cv.getContext('2d');
  FLOORS.forEach((F, f) => F.shops.forEach((s, i) => drawSlot(g, SLOT.shop(f, i), s.name, s.bg, s.fg, { border: s.fg })));
  for (let t = 1; t <= 5; t++) drawSlot(g, SLOT.up(t), `▲ ${floorLabel(t)} · ${FLOORS[t].name}`, '#1a7a3a', '#ffffff', { border: '#8af0a0', size: 30 });
  for (let t = 0; t <= 4; t++) drawSlot(g, SLOT.down(t), `▼ ${floorLabel(t)} · ${FLOORS[t].name}`, '#c8501a', '#ffffff', { border: '#ffd0a0', size: 30 });
  ADS.forEach((a, i) => drawSlot(g, SLOT.ad(i), a.t, a.bg, a.fg, { border: '#ffffff' }));
  FLOORS.forEach((F, f) => drawSlot(g, SLOT.plaque(f), `${F.icon} ${floorLabel(f)}`, '#ffffff', F.accent, { border: F.accent, size: 36 }));
  FLOORS.forEach((F, f) => F.shops.forEach((s, i) => {
    const { fill, edge } = letterColors(s);
    drawSlot(g, SLOT.letters(f, i), s.name, null, fill, { edge, size: 40 });
    drawBlade(g, f, i, s);
  }));
  g.fillStyle = '#ffffff'; g.fillRect(0, AH - 8, 8, 8);   // coin blanc : affiches teintées par la couleur des sommets
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- Petits objets des étalages ----------
// toutes les positions sont dans le repère de la boutique de gauche : x de -FRONT_X (vitrine) à -BACK_X
// (fond), z de -HW à HW, y depuis le sol
const P = ['#ff5a8a', '#ffd23f', '#5ac8fa', '#7ae07a', '#b07aff', '#ff8a3a', '#ffffff', '#3a6ad8'];
const pc = (i) => P[((i % P.length) + P.length) % P.length];
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function shelfWall(F, x, z0, z1, rows, color = '#f4f0ea') {   // étagères murales sur le fond
  const len = z1 - z0, zc = (z0 + z1) / 2;
  F.add(U.box, color, [x, 1.6, zc], [0.4, 3.2, len]);
  for (let r = 0; r < rows; r++) F.add(U.box, '#d8d0c4', [x + 0.25, 0.45 + r * (2.6 / rows), zc], [0.12, 0.04, len]);
}
function table(F, x, z, w, d, top = '#f4ece0', leg = '#8a7a6a') {
  F.add(U.box, top, [x, 0.82, z], [d, 0.08, w]);
  F.add(U.box, leg, [x, 0.4, z], [d * 0.6, 0.78, w * 0.6]);
}
function mannequin(F, x, z, body, legs = '#e8dcd0', skirt = true) {
  F.add(U.box, '#d8d0c8', [x, 0.05, z], [0.5, 0.1, 0.5]);
  F.add(U.cyl6, '#c8c0b8', [x, 0.5, z], [0.03, 0.9, 0.03]);
  F.add(U.sph0, '#f4ece4', [x, 1.95, z], [0.13, 0.15, 0.13]);
  F.add(U.box, body, [x, 1.55, z], [0.26, 0.55, 0.4]);
  if (skirt) F.add(U.cone8, body, [x, 1.1, z], [0.36, 0.6, 0.36]);
  else for (const dz of [-0.09, 0.09]) F.add(U.box, legs, [x, 0.85, z + dz], [0.16, 0.9, 0.16]);
  for (const dz of [-0.26, 0.26]) F.add(U.box, body, [x, 1.5, z + dz], [0.1, 0.5, 0.1], [dz * 0.6, 0, 0]);
}
function rack(F, x, z0, z1, cols, seed) {   // portant de vêtements suspendus
  const zc = (z0 + z1) / 2, len = z1 - z0;
  F.add(U.cyl6, '#9aa0a8', [x, 1.6, zc], [0.025, len, 0.025], [Math.PI / 2, 0, 0]);
  for (const z of [z0, z1]) F.add(U.cyl6, '#9aa0a8', [x, 0.8, z], [0.025, 1.6, 0.025]);
  const n = Math.floor(len / 0.22);
  for (let i = 0; i < n; i++) F.add(U.box, cols[(seed + i) % cols.length], [x, 1.15, z0 + 0.15 + i * 0.22], [0.45, 0.85, 0.08]);
}
function stacks(F, x, z, n, cols, w = 0.32, d = 0.28, h = 0.07) {   // piles de vêtements pliés sur une table
  for (let i = 0; i < n; i++) {
    const zz = z + (i - (n - 1) / 2) * (w + 0.06);
    for (let k = 0; k < 4; k++) F.add(U.box, cols[(i + k) % cols.length], [x, 0.9 + k * h, zz], [d, h * 0.9, w]);
  }
}
function boxesOnShelves(F, x, z0, z1, rows, seed, s = 0.28) {   // boîtes colorées sur les étagères du fond
  const n = Math.floor((z1 - z0) / (s + 0.06));
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    if (hash(seed + r * 31 + i) < 0.15) continue;
    const h = s * (0.8 + hash(seed + i * 7 + r) * 0.6);
    F.add(U.box, pc(seed + r * 3 + i), [x + 0.38, 0.47 + r * (2.6 / rows) + h / 2, z0 + 0.2 + i * (s + 0.06)], [s * 0.9, h, s]);
  }
}
function podium(F, x, z, r = 0.45, h = 0.4, c = '#ffffff') { F.add(U.cyl, c, [x, h / 2, z], [r, h, r]); return h; }
function ball(F, x, y, z, r, c) { F.add(U.sph, c, [x, y, z], [r, r, r]); }
function screen(F, G, x, y, z, w, h, c) {   // écran plat tourné vers la galerie
  F.add(U.box, '#141418', [x, y, z], [0.08, h + 0.08, w + 0.08]);
  G.add(U.box, c, [x + 0.045, y, z], [0.01, h, w]);
}

// ---------- Étalages par type de boutique ----------
const DISPLAYS = {
  dress(F, G, s, n) {
    dressForm(F, [-6.5, 0, -2.4], pc(n));
    dressForm(F, [-6.5, 0, 2.4], pc(n + 3));
    for (const z of [-2.4, 2.4]) F.add(U.cone8, pc(n + (z > 0 ? 3 : 0)), [-6.5, 0.98, z], [0.36, 0.62, 0.36]);   // jupe
    rack(F, -10.3, -3.2, 3.2, [pc(n), pc(n + 1), '#ffffff', pc(n + 4)], n);
    table(F, -8.2, 0, 1.6, 1.0);
    stacks(F, -8.2, 0, 3, [pc(n + 2), '#ffffff', pc(n + 5)]);
  },
  jeans(F, G, s, n) {
    mannequin(F, -6.4, -2.4, '#f4f0e8', '#3a5a9a', false);
    mannequin(F, -6.4, 2.4, '#e8302a', '#2a3a6a', false);
    shelfWall(F, -10.8, -3.4, 3.4, 4, '#c8a878');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 14; i++) F.add(U.box, ['#3a5a9a', '#2a3a6a', '#5a7ab8', '#1a2a4a'][(i + r) % 4], [-10.45, 0.55 + r * 0.65, -3.1 + i * 0.45], [0.3, 0.16, 0.36]);
    table(F, -8.2, 0, 1.8, 1.0, '#a87a4a');
    stacks(F, -8.2, 0, 4, ['#3a5a9a', '#2a3a6a', '#5a7ab8']);
  },
  shoes(F, G, s, n) {
    shelfWall(F, -10.8, -3.4, 3.4, 5);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 10; i++) {
      const c = pc(n + r * 2 + i);
      for (const d of [-0.07, 0.07]) F.add(U.box, c, [-10.45, 0.55 + r * 0.52, -3 + i * 0.66 + d], [0.3, 0.12, 0.1]);
    }
    for (const z of [-2.4, 2.4]) {
      const h = podium(F, -6.4, z, 0.5, 0.6, '#f2c8d8');
      for (const d of [-0.12, 0.12]) { F.add(U.box, '#e8202a', [-6.4, h + 0.1, z + d], [0.32, 0.08, 0.1]); F.add(U.box, '#e8202a', [-6.52, h + 0.2, z + d], [0.08, 0.22, 0.08]); }
    }
    F.add(U.box, '#b07a5a', [-8.2, 0.25, 0], [0.6, 0.5, 2.4]);   // banc pour essayer
  },
  knit(F, G, s, n) {
    for (const z of [-2.3, 0, 2.3]) { table(F, -7.8, z, 1.4, 1.0, '#e8d4b0'); stacks(F, -7.8, z, 3, [pc(n + Math.round(z)), pc(n + 1 + Math.round(z)), '#f4f0e8', pc(n + 5)]); }
    rack(F, -10.3, -3.2, 3.2, [pc(n + 1), pc(n + 2), pc(n + 3), '#f4f0e8'], n);
  },
  perfume(F, G, s, n) {
    for (const z of [-2.2, 2.2]) {
      F.add(U.box, '#ffffff', [-7.4, 0.5, z], [1.0, 1.0, 1.6]);
      G.add(U.box, '#f4e8ff', [-7.4, 1.01, z], [0.9, 0.02, 1.5]);
      for (let i = 0; i < 6; i++) {
        const c = pc(n + i);
        F.add(U.cyl6, c, [-7.6 + (i % 2) * 0.35, 1.13, z - 0.55 + Math.floor(i / 2) * 0.55], [0.07, 0.22, 0.07]);
        F.add(U.box, '#d8b04a', [-7.6 + (i % 2) * 0.35, 1.28, z - 0.55 + Math.floor(i / 2) * 0.55], [0.06, 0.08, 0.06]);
      }
    }
    shelfWall(F, -10.8, -3.4, 3.4, 4, '#f6f0fb');
    for (let r = 0; r < 4; r++) G.add(U.box, '#fff4fc', [-10.53, 0.5 + r * 0.65, 0], [0.02, 0.03, 6.6]);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 16; i++) F.add(U.cyl6, pc(n + i + r), [-10.45, 0.62 + r * 0.65, -3.1 + i * 0.41], [0.06, 0.18, 0.06]);
  },
  hats(F, G, s, n) {
    for (let i = 0; i < 5; i++) {
      const x = -7 - (i % 2) * 2, z = -3 + i * 1.5;
      F.add(U.cyl6, '#c8c0b8', [x, 0.75, z], [0.03, 1.5, 0.03]);
      F.add(U.cyl, pc(n + i), [x, 1.55, z], [0.32, 0.03, 0.32]);
      F.add(U.cyl, pc(n + i), [x, 1.68, z], [0.17, 0.24, 0.17]);
      F.add(U.cyl, '#1a1a1e', [x, 1.6, z], [0.18, 0.05, 0.18]);
    }
    shelfWall(F, -10.8, -3.4, 3.4, 3);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) F.add(U.cyl, pc(n + i + r * 2), [-10.4, 0.56 + r * 0.87, -3 + i * 0.85], [0.22, 0.12, 0.22]);
  },
  plush(F, G, s, n) {
    const bear = (x, y, z, k, c) => {   // petits oursons des étagères : sphères moins fines
      const b = (bx, by, bz, r, col) => F.add(k < 0.5 ? U.sph0 : U.sph, col, [bx, by, bz], [r, r, r]);
      b(x, y + 0.45 * k, z, 0.45 * k, c);
      b(x, y + 1.05 * k, z, 0.32 * k, c);
      for (const d of [-1, 1]) { b(x, y + 1.33 * k, z + d * 0.22 * k, 0.11 * k, c); b(x + 0.2 * k, y + 0.6 * k, z + d * 0.38 * k, 0.15 * k, c); }
      b(x + 0.27 * k, y + 1.0 * k, z, 0.12 * k, '#f4e4d0');
      for (const d of [-1, 1]) F.add(U.sph0, '#1a1010', [x + 0.27 * k, y + 1.12 * k, z + d * 0.12 * k], [0.04 * k, 0.04 * k, 0.04 * k]);
    };
    bear(-6.6, 0, -2.4, 1.0, '#c88a5a');
    bear(-6.6, 0, 2.4, 0.8, '#ffb0c8');
    shelfWall(F, -10.8, -3.4, 3.4, 3);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) bear(-10.4, 0.5 + r * 0.87, -2.9 + i * 0.95, 0.28, ['#c88a5a', '#ffb0c8', '#f4f0e8', '#a8d0ff', '#ffe08a'][(i + r) % 5]);
    F.add(U.cyl, '#ffe0ec', [-8.3, 0.3, 0], [0.9, 0.6, 0.9]);
    for (let i = 0; i < 6; i++) ball(F, -8.3 + Math.cos(i) * 0.5, 0.75, Math.sin(i) * 0.5, 0.22, pc(n + i));
  },
  toys(F, G, s, n) {
    shelfWall(F, -10.8, -3.4, 3.4, 4);
    boxesOnShelves(F, -10.8, -3.4, 3.4, 4, n * 13, 0.34);
    for (const z of [-2.4, 2.4]) {   // fusée et robot en vitrine
      const h = podium(F, -6.5, z, 0.5, 0.35, pc(n + 2));
      F.add(U.cyl, '#f4f0e8', [-6.5, h + 0.6, z], [0.2, 1.2, 0.2]);
      F.add(U.cone8, '#e8302a', [-6.5, h + 1.45, z], [0.2, 0.5, 0.2]);
      for (let k = 0; k < 3; k++) F.add(U.box, '#e8302a', [-6.5 + Math.cos(k * 2.1) * 0.2, h + 0.2, z + Math.sin(k * 2.1) * 0.2], [0.05, 0.4, 0.2], [0, -k * 2.1, 0]);
      F.add(U.sph0, '#5ac8fa', [-6.32, h + 0.85, z], [0.08, 0.08, 0.08]);
    }
    table(F, -8.2, 0, 1.6, 1.2, '#ffd23f');
    for (let i = 0; i < 4; i++) F.add(U.box, pc(n + i), [-8.2, 1.0 + (i % 2) * 0.12, -0.5 + i * 0.33], [0.5, 0.26, 0.28]);
  },
  cars(F, G, s, n) {
    const car = (x, y, z, c, k = 1) => {
      F.add(U.box, c, [x, y + 0.12 * k, z], [0.3 * k, 0.12 * k, 0.6 * k]);
      F.add(U.box, c, [x, y + 0.22 * k, z - 0.04 * k], [0.26 * k, 0.1 * k, 0.32 * k]);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) F.add(U.cyl6, '#1a1a1e', [x + dx * 0.15 * k, y + 0.06 * k, z + dz * 0.2 * k], [0.06 * k, 0.04 * k, 0.06 * k], [0, 0, Math.PI / 2]);
    };
    // circuit en vitrine
    for (const z of [-2.3, 2.3]) {
      F.add(U.box, '#2a2a34', [-6.6, 0.3, z], [1.1, 0.6, 1.6]);
      F.add(U.box, '#3a8a3a', [-6.6, 0.61, z], [1.0, 0.02, 1.5]);
      F.add(U.box, '#5a5a64', [-6.6, 0.63, z], [0.7, 0.02, 1.2]);
      car(-6.6, 0.64, z - 0.3, '#e8302a', 0.6);
      car(-6.75, 0.64, z + 0.35, '#3a6ad8', 0.6);
    }
    shelfWall(F, -10.8, -3.4, 3.4, 4);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) car(-10.45, 0.47 + r * 0.65, -3 + i * 0.75, pc(n + i + r), 0.6);
    car(-8.4, 0, 0, '#ffd23f', 2.6);   // grosse voiture à pédales
  },
  games(F, G, s, n) {
    shelfWall(F, -10.8, -3.4, 3.4, 4);
    boxesOnShelves(F, -10.8, -3.4, 3.4, 4, n * 7, 0.42);
    for (const z of [-2.2, 2.2]) {
      table(F, -7.0, z, 1.4, 1.2, '#2a8a5a');
      for (let i = 0; i < 3; i++) F.add(U.box, pc(n + i * 2), [-7, 0.92 + i * 0.09, z], [0.6, 0.08, 0.6], [0, i * 0.3, 0]);
      F.add(U.box, '#ffffff', [-6.6, 0.98, z + 0.5], [0.16, 0.16, 0.16], [0.3, 0.4, 0]);
      F.add(U.box, '#e8302a', [-6.7, 0.98, z - 0.5], [0.16, 0.16, 0.16], [0.6, 0.2, 0]);
    }
  },
  balloons(F, G, s, n) {
    for (let i = 0; i < 14; i++) {
      const x = -6.4 - hash(n + i) * 4, z = -3 + hash(n * 3 + i) * 6, y = 2.6 + hash(i * 5 + n) * 1.4;
      F.add(U.sph, pc(n + i), [x, y, z], [0.28, 0.34, 0.28]);
      F.add(U.box, '#e8e4dc', [x, y / 2 - 0.1, z], [0.01, y - 0.4, 0.01]);
    }
    F.add(U.box, '#ffffff', [-8.4, 0.5, 0], [0.8, 1.0, 2.2]);
    F.add(U.cyl6, '#9aa0a8', [-8.4, 1.3, 0.8], [0.15, 0.6, 0.15]);   // bouteille d'hélium
  },
  consoles(F, G, s, n) {
    for (let i = 0; i < 3; i++) screen(F, G, -10.85, 2.3, -2.4 + i * 2.4, 2.0, 1.15, ['#3a6aff', '#ff4fa8', '#7aff8a'][i]);
    for (const z of [-2.2, 2.2]) {
      F.add(U.box, '#2a2a48', [-7, 0.5, z], [0.9, 1.0, 1.4]);
      screen(F, G, -6.6, 1.5, z, 1.0, 0.6, z < 0 ? '#ffd23f' : '#3ff0ff');
      F.add(U.box, '#e8e8f0', [-7.0, 1.03, z], [0.36, 0.06, 0.5]);
      F.add(U.box, '#1a1a1e', [-6.8, 1.05, z + 0.35], [0.14, 0.05, 0.24]);
    }
    G.add(U.box, '#3ff0ff', [-10.82, 4.3, 0], [0.02, 0.06, 7.0]);
    F.add(U.box, '#e8302a', [-8.6, 0.45, 0], [0.7, 0.9, 0.7]);   // fauteuil de jeu
    F.add(U.box, '#1a1a1e', [-8.9, 1.1, 0], [0.15, 1.0, 0.7]);
  },
  tv(F, G, s, n) {
    const scr = ['#5ac8fa', '#ff8ac0', '#7ae07a', '#ffd23f', '#b07aff', '#ff8a3a'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) screen(F, G, -10.85, 1.1 + r * 1.15, -2.7 + i * 1.8, 1.55, 0.92, scr[(n + r * 4 + i) % scr.length]);
    for (const z of [-2.3, 2.3]) {
      F.add(U.box, '#e8eaf0', [-6.8, 0.4, z], [0.6, 0.8, 1.6]);
      screen(F, G, -6.8, 1.45, z, 1.7, 1.0, scr[(n + (z > 0 ? 2 : 4)) % scr.length]);
    }
  },
  phones(F, G, s, n) {
    for (const z of [-2.2, 2.2]) {
      F.add(U.box, '#ffffff', [-7.6, 0.45, z], [1.2, 0.9, 2.0]);
      for (let i = 0; i < 4; i++) {
        F.add(U.box, '#1a1a1e', [-7.6 + (i % 2) * 0.5 - 0.25, 0.93, z - 0.45 + Math.floor(i / 2) * 0.9], [0.18, 0.02, 0.34]);
        G.add(U.box, pc(n + i), [-7.6 + (i % 2) * 0.5 - 0.25, 0.945, z - 0.45 + Math.floor(i / 2) * 0.9], [0.15, 0.005, 0.3]);
      }
    }
    // grande affiche lumineuse d'un téléphone au fond
    F.add(U.box, '#e8eaf0', [-10.9, 2.3, 0], [0.1, 3.4, 4.0]);
    F.add(U.box, '#1a1a1e', [-10.83, 2.3, 0], [0.04, 2.8, 1.4]);
    G.add(U.box, '#5ac8fa', [-10.8, 2.3, 0], [0.02, 2.5, 1.2]);
    G.add(U.box, '#ff8ac0', [-10.79, 2.7, 0], [0.01, 0.6, 0.6]);
  },
  robots(F, G, s, n) {
    const robot = (x, z, k, c, y0 = 0) => {
      F.add(U.box, c, [x, y0 + 0.55 * k, z], [0.5 * k, 0.6 * k, 0.6 * k]);
      F.add(U.box, '#d8dce4', [x, y0 + 1.05 * k, z], [0.4 * k, 0.36 * k, 0.46 * k]);
      for (const d of [-1, 1]) {
        G.add(U.sph0, '#3ff0ff', [x + 0.2 * k, y0 + 1.08 * k, z + d * 0.11 * k], [0.05 * k, 0.05 * k, 0.05 * k]);
        F.add(U.box, '#9aa0a8', [x, y0 + 0.12 * k, z + d * 0.18 * k], [0.4 * k, 0.24 * k, 0.16 * k]);
        F.add(U.box, c, [x, y0 + 0.6 * k, z + d * 0.4 * k], [0.12 * k, 0.5 * k, 0.12 * k]);
      }
      F.add(U.cyl6, '#9aa0a8', [x, y0 + 1.35 * k, z], [0.015 * k, 0.26 * k, 0.015 * k]);
      G.add(U.sph0, '#ff4fa8', [x, y0 + 1.5 * k, z], [0.05 * k, 0.05 * k, 0.05 * k]);
    };
    robot(-6.6, -2.4, 1.4, '#ff8a2a');
    robot(-6.6, 2.4, 1.1, '#5ac8fa');
    shelfWall(F, -10.8, -3.4, 3.4, 3);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) robot(-10.45, -3 + i * 1.2, 0.35, pc(n + i + r), 0.47 + r * 0.87);
  },
  audio(F, G, s, n) {
    for (const z of [-2.5, 2.5]) {   // enceintes géantes
      F.add(U.box, '#1a1a1e', [-6.8, 1.0, z], [0.8, 2.0, 0.9]);
      for (const y of [0.6, 1.5]) { F.add(U.cyl, '#3a3a44', [-6.38, y, z], [0.3, 0.05, 0.3], [0, 0, Math.PI / 2]); G.add(U.cyl, '#b07aff', [-6.35, y, z], [0.08, 0.02, 0.08], [0, 0, Math.PI / 2]); }
    }
    for (let i = 0; i < 5; i++) {   // casques sur leurs supports
      const z = -2 + i;
      F.add(U.cyl6, '#e8e8f0', [-9, 0.6, z], [0.04, 1.2, 0.04]);
      F.add(U.box, pc(n + i), [-9, 1.32, z], [0.06, 0.06, 0.34]);
      for (const d of [-1, 1]) F.add(U.cyl, pc(n + i), [-9, 1.16, z + d * 0.17], [0.1, 0.06, 0.1], [Math.PI / 2, 0, 0]);
    }
    G.add(U.box, '#6a2ad8', [-10.85, 3.6, 0], [0.02, 0.08, 7.0]);
  },
  balls(F, G, s, n) {
    const c = ['#ffffff', '#ff8a3a', '#ffd23f', '#e8302a', '#3a6ad8'];
    for (const z of [-2.3, 2.3]) {   // pyramides de ballons
      let k = 0;
      for (let l = 0; l < 3; l++) for (let i = 0; i <= 2 - l; i++) for (let j = 0; j <= 2 - l; j++) {
        ball(F, -6.9 + (i - (2 - l) / 2) * 0.42, 0.22 + l * 0.34, z + (j - (2 - l) / 2) * 0.42, 0.2, c[(n + k++) % c.length]);
      }
    }
    // maillots au mur
    for (let i = 0; i < 6; i++) {
      const z = -3 + i * 1.2, col = pc(n + i);
      F.add(U.box, col, [-10.85, 2.4, z], [0.06, 0.8, 0.6]);
      for (const d of [-1, 1]) F.add(U.box, col, [-10.85, 2.65, z + d * 0.4], [0.06, 0.3, 0.25]);
      F.add(U.box, '#ffffff', [-10.81, 2.45, z], [0.01, 0.3, 0.2]);
    }
    F.add(U.box, '#3a8a3a', [-8.4, 0.02, 0], [2.0, 0.04, 3.2]);   // gazon
  },
  bikes(F, G, s, n) {
    const bike = (x, z, c) => {
      for (const dz of [-0.5, 0.5]) {
        F.add(U.cyl, '#1a1a1e', [x, 0.35, z + dz], [0.35, 0.05, 0.35], [0, 0, Math.PI / 2]);
        F.add(U.cyl6, '#c8ccd4', [x, 0.35, z + dz], [0.04, 0.07, 0.04], [0, 0, Math.PI / 2]);
      }
      F.add(U.box, c, [x, 0.55, z], [0.05, 0.05, 1.0], [0.0, 0, 0]);
      F.add(U.box, c, [x, 0.5, z - 0.25], [0.05, 0.45, 0.05], [0.5, 0, 0]);
      F.add(U.box, c, [x, 0.55, z + 0.35], [0.05, 0.5, 0.05], [-0.3, 0, 0]);
      F.add(U.box, '#1a1a1e', [x, 0.85, z - 0.32], [0.12, 0.04, 0.22]);
      F.add(U.box, '#c8ccd4', [x, 0.9, z + 0.45], [0.5, 0.04, 0.04]);
    };
    bike(-6.6, -2.2, '#ff6a1a');
    bike(-6.6, 2.2, '#3a9ae8');
    for (let i = 0; i < 4; i++) bike(-9.8, -2.4 + i * 1.6, pc(n + i));
    F.add(U.box, '#2a2a34', [-10.9, 2.6, 0], [0.06, 1.0, 6.0]);
    G.add(U.box, '#ff8a2a', [-10.86, 2.6, 0], [0.01, 0.1, 5.6]);
  },
  sneakers(F, G, s, n) {
    shelfWall(F, -10.8, -3.4, 3.4, 5, '#2a2a30');
    for (let r = 0; r < 5; r++) {
      G.add(U.box, '#c8ff3a', [-10.53, 0.46 + r * 0.52, 0], [0.02, 0.015, 6.6]);
      for (let i = 0; i < 9; i++) {
        const c = pc(n + r + i * 3);
        F.add(U.box, c, [-10.45, 0.56 + r * 0.52, -3 + i * 0.75], [0.36, 0.14, 0.16]);
        F.add(U.box, '#ffffff', [-10.45, 0.5 + r * 0.52, -3 + i * 0.75], [0.37, 0.04, 0.17]);
      }
    }
    for (const z of [-2.3, 2.3]) {
      const h = podium(F, -6.5, z, 0.45, 0.9, '#1a1a1e');
      F.add(U.box, '#c8ff3a', [-6.5, h + 0.09, z], [0.5, 0.18, 0.22]);
      F.add(U.box, '#ffffff', [-6.5, h + 0.02, z], [0.52, 0.04, 0.23]);
    }
  },
  ski(F, G, s, n) {
    for (let i = 0; i < 10; i++) F.add(U.box, pc(n + i), [-10.8, 1.0, -3 + i * 0.66], [0.04, 1.9, 0.13], [0, 0, 0.05]);
    for (const z of [-2.3, 2.3]) {
      F.add(U.box, '#ffffff', [-6.7, 0.25, z], [1.2, 0.5, 1.4]);   // neige
      F.add(U.sph, '#ffffff', [-6.7, 0.5, z], [0.6, 0.25, 0.7]);
      mannequin(F, -6.7, z, pc(n + (z > 0 ? 2 : 5)), '#2a2a34', false);
      F.add(U.box, '#ffd23f', [-6.55, 1.95, z], [0.04, 0.08, 0.3]);   // masque de ski
    }
    F.add(U.box, '#3a9ae8', [-8.4, 0.3, 0], [0.12, 0.05, 1.5], [0, 0, 0]);
  },
  swim(F, G, s, n) {
    F.add(U.box, '#5ad8e8', [-8.3, 0.03, 0], [4.6, 0.04, 6.8]);
    for (const z of [-2.3, 2.3]) {
      F.add(new THREE.TorusGeometry(0.45, 0.16, 6, 12), pc(n + (z > 0 ? 0 : 3)), [-6.6, 0.95, z], [1, 1, 1], [0, Math.PI / 2, 0]);
      F.add(U.cyl6, '#e8e8f0', [-6.6, 0.35, z], [0.03, 0.7, 0.03]);
    }
    for (let i = 0; i < 5; i++) F.add(U.box, pc(n + i), [-10.85, 2.2, -2.6 + i * 1.3], [0.06, 0.9, 0.8]);   // serviettes
    F.add(U.sph, '#ff5a8a', [-8.6, 0.35, 1], [0.35, 0.35, 0.35]);
  },
  books(F, G, s, n) {
    for (const z0 of [-3.4]) {
      shelfWall(F, -10.8, z0, 3.4, 5, '#8a5a3a');
      for (let r = 0; r < 5; r++) {
        let z = z0 + 0.1;
        let i = 0;
        while (z < 3.3) {
          const w = 0.05 + hash(n + r * 50 + i) * 0.06, h = 0.3 + hash(n * 2 + r + i * 3) * 0.12;
          F.add(U.box, ['#c8302a', '#2a5a8a', '#3a7a3a', '#e8c84a', '#6a3a8a', '#f4f0e8', '#1a1a1e', '#e87a3a'][(n + r + i * 3) % 8], [-10.45, 0.48 + r * 0.52 + h / 2, z + w / 2], [0.24, h, w]);
          z += w + 0.005; i++;
          if (hash(r * 13 + i + n) < 0.05) z += 0.3;
        }
      }
    }
    for (const z of [-2.2, 2.2]) {   // tables de nouveautés
      table(F, -7.2, z, 1.6, 1.1, '#c8a070', '#6a4a2a');
      for (let i = 0; i < 6; i++) F.add(U.box, pc(n + i), [-7.4 + (i % 2) * 0.45, 0.89 + Math.floor(i / 2) * 0.03, z - 0.55 + (i % 3) * 0.55], [0.32, 0.04, 0.24], [0, 0.2 * i, 0]);
    }
  },
  sofa(F, G, s, n) {
    const sofa = (x, z, c) => {
      F.add(U.box, c, [x, 0.3, z], [0.9, 0.4, 2.0]);
      F.add(U.box, c, [x - 0.35, 0.7, z], [0.2, 0.6, 2.0]);
      for (const d of [-1, 1]) F.add(U.box, c, [x, 0.55, z + d * 0.95], [0.9, 0.3, 0.15]);
      for (const d of [-0.5, 0.5]) F.add(U.box, pc(n + (d > 0 ? 1 : 4)), [x - 0.1, 0.65, z + d], [0.2, 0.36, 0.4], [0, 0, 0.2]);
    };
    sofa(-6.9, 0, '#c87a5a');
    sofa(-10.2, 0, '#6a8aa8');
    F.add(U.cyl, '#e8d8c0', [-8.5, 0.015, 0], [1.3, 0.03, 1.3]);   // tapis
    F.add(U.cyl, '#a87a4a', [-8.5, 0.25, 0], [0.45, 0.06, 0.45]);   // table basse
    F.add(U.cyl6, '#5a4030', [-8.5, 0.12, 0], [0.06, 0.22, 0.06]);
    for (const z of [-3, 3]) {   // lampadaires
      F.add(U.cyl6, '#2a2a30', [-9.4, 0.85, z], [0.03, 1.7, 0.03]);
      G.add(U.cone8, '#fff0c8', [-9.4, 1.8, z], [0.25, 0.3, 0.25]);
    }
  },
  lamps(F, G, s, n) {
    for (let i = 0; i < 12; i++) {   // suspensions lumineuses
      const x = -6.6 - (i % 3) * 1.5, z = -3 + Math.floor(i / 3) * 2, y = 3.0 + hash(n + i) * 0.8;
      F.add(U.box, '#1a1a1e', [x, (y + IN_H) / 2, z], [0.01, IN_H - y, 0.01]);
      G.add(i % 2 ? U.sph : U.cone8, ['#fff0c8', '#ffd890', '#ffe8f0', '#e0f0ff'][i % 4], [x, y, z], [0.22, 0.22, 0.22]);
    }
    for (const z of [-2.4, 2.4]) {
      F.add(U.box, '#5a4030', [-7, 0.45, z], [0.8, 0.9, 0.8]);
      F.add(U.cyl6, '#d8b04a', [-7, 1.1, z], [0.05, 0.4, 0.05]);
      G.add(U.cone8, '#fff4d8', [-7, 1.45, z], [0.3, 0.35, 0.3]);
    }
  },
  records(F, G, s, n) {
    for (const z of [-2.2, 2.2]) {
      F.add(U.box, '#5a3a2a', [-7.4, 0.45, z], [1.2, 0.9, 1.6]);
      for (let i = 0; i < 10; i++) F.add(U.box, pc(n + i), [-7.4, 1.05, z - 0.7 + i * 0.15], [1.0, 0.32, 0.02], [0, 0, 0.15]);
    }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {   // disques au mur
      const y = 1.6 + r * 1.3, z = -3 + i * 1.2;
      F.add(U.cyl, '#141414', [-10.9, y, z], [0.5, 0.02, 0.5], [0, 0, Math.PI / 2]);
      F.add(U.cyl, pc(n + i + r), [-10.88, y, z], [0.17, 0.02, 0.17], [0, 0, Math.PI / 2]);
    }
    G.add(U.box, '#ff3a6a', [-10.85, 4.1, 0], [0.02, 0.08, 6.5]);
  },
  plants(F, G, s, n) {
    const keys = ['m_monstera', 'm_fern', 'm_strelitzia'], pots = ['#c86a3a', '#f4f0e8', '#3a3a40'];
    for (let i = 0; i < 6; i++) {
      const x = -6.8 - (i % 2) * 2.6, z = -2.6 + Math.floor(i / 2) * 2.6, k = 0.8 + hash(n + i) * 0.5;
      if (i % 2) F.add(U.box, '#e8dcc8', [x, 0.25, z], [0.9, 0.5, 0.9]);   // gradin
      potPlant(F, keys[i % 3], [x, i % 2 ? 0.5 : 0, z], k, { pot: pots[(i + n) % 3], ry: i * 1.3, green: i });
    }
    for (let i = 0; i < 4; i++) {   // plantes suspendues
      const z = -2.6 + i * 1.75;
      F.add(U.box, '#e8e4dc', [-9, 4.1, z], [0.01, 1.0, 0.01]);
      F.add(U.cyl6, '#f4f0e8', [-9, 3.5, z], [0.2, 0.25, 0.2]);
      F.add(U.sph0, '#4a9a3a', [-9, 3.3, z], [0.35, 0.45, 0.35]);
    }
  },
  candy(F, G, s, n) {
    shelfWall(F, -10.8, -3.4, 3.4, 4, '#ffe8f4');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) {   // bocaux de bonbons
      const y = 0.5 + r * 0.65, z = -3 + i * 0.75;
      F.add(U.cyl6, '#f4f8ff', [-10.45, y + 0.2, z], [0.16, 0.4, 0.16]);
      F.add(U.cyl6, pc(n + i + r), [-10.45, y + 0.15, z], [0.17, 0.28, 0.17]);
      F.add(U.cyl6, '#ff5aa8', [-10.45, y + 0.43, z], [0.12, 0.06, 0.12]);
    }
    for (const z of [-2.3, 2.3]) {   // sucettes géantes en vitrine
      F.add(U.cyl6, '#f4f0e8', [-6.6, 1.0, z], [0.04, 2.0, 0.04]);
      F.add(U.cyl, pc(n + (z > 0 ? 0 : 2)), [-6.6, 2.1, z], [0.55, 0.12, 0.55], [0, 0, Math.PI / 2]);
      F.add(U.cyl, '#ffffff', [-6.53, 2.1, z], [0.38, 0.12, 0.38], [0, 0, Math.PI / 2]);
      F.add(U.cyl, pc(n + (z > 0 ? 3 : 5)), [-6.47, 2.1, z], [0.2, 0.12, 0.2], [0, 0, Math.PI / 2]);
    }
    F.add(U.box, '#ffffff', [-8.3, 0.5, 0], [1.0, 1.0, 1.8]);
    for (let i = 0; i < 8; i++) F.add(U.sph0, pc(n + i), [-8.3 + (i % 2) * 0.3 - 0.15, 1.08, -0.7 + Math.floor(i / 2) * 0.45], [0.12, 0.1, 0.12]);
  },
  icecream(F, G, s, n) {
    F.add(U.box, '#ffffff', [-7.6, 0.55, 0], [1.0, 1.1, 5.4]);   // comptoir réfrigéré
    G.add(U.box, '#e8fbff', [-7.6, 1.12, 0], [0.9, 0.02, 5.2]);
    for (let i = 0; i < 10; i++) F.add(U.box, ['#ffb0c8', '#fff0c8', '#7a4a2a', '#a8f0b0', '#ffd23f', '#d8b8ff', '#ffffff', '#ff8a3a'][(n + i) % 8], [-7.6 + (i % 2) * 0.4 - 0.2, 1.1, -2.2 + Math.floor(i / 2) * 1.1], [0.36, 0.1, 0.9]);
    // cornet géant
    F.add(U.cone8, '#e8b06a', [-10.2, 1.5, 0], [0.5, 1.6, 0.5], [Math.PI, 0, 0]);
    ball(F, -10.2, 2.55, 0, 0.55, '#ffb0c8');
    ball(F, -10.2, 3.2, 0, 0.45, '#fff0c8');
    ball(F, -10.2, 3.65, 0, 0.12, '#e8302a');
    for (const z of [-2.8, 2.8]) { F.add(U.cyl6, '#f4f0e8', [-10.2, 0.4, z], [0.3, 0.8, 0.3]); ball(F, -10.2, 0.9, z, 0.3, pc(n + (z > 0 ? 1 : 4))); }
  },
  cakes(F, G, s, n) {
    for (const z of [-2.3, 2.3]) {   // gâteaux à étages en vitrine
      const h = podium(F, -6.6, z, 0.5, 0.8, '#ffffff');
      for (let k = 0; k < 3; k++) {
        F.add(U.cyl, ['#fff0f4', '#ffb0c8', '#fff0c8'][(k + n) % 3], [-6.6, h + 0.15 + k * 0.28, z], [0.42 - k * 0.11, 0.28, 0.42 - k * 0.11]);
        F.add(U.cyl, '#ffffff', [-6.6, h + 0.29 + k * 0.28, z], [0.44 - k * 0.11, 0.03, 0.44 - k * 0.11]);
      }
      ball(F, -6.6, h + 1.0, z, 0.08, '#e8302a');
    }
    F.add(U.box, '#ffffff', [-9.0, 0.55, 0], [1.0, 1.1, 5.0]);
    G.add(U.box, '#fffaf0', [-9.0, 1.12, 0], [0.9, 0.02, 4.8]);
    for (let i = 0; i < 8; i++) {   // petits gâteaux
      const z = -2 + i * 0.57;
      F.add(U.cyl6, pc(n + i), [-9.0, 1.2, z], [0.1, 0.12, 0.1]);
      F.add(U.sph0, i % 2 ? '#fff0f4' : '#7a4a2a', [-9.0, 1.3, z], [0.11, 0.08, 0.11]);
    }
  },
  chocolate(F, G, s, n) {
    for (const z of [-2.3, 2.3]) {   // fontaines de chocolat
      F.add(U.cyl, '#d8b04a', [-6.6, 0.3, z], [0.5, 0.6, 0.5]);
      for (let k = 0; k < 3; k++) F.add(U.cyl, '#5a3020', [-6.6, 0.65 + k * 0.35, z], [0.4 - k * 0.11, 0.06, 0.4 - k * 0.11]);
      F.add(U.cyl6, '#7a4a2a', [-6.6, 1.0, z], [0.06, 0.8, 0.06]);
    }
    shelfWall(F, -10.8, -3.4, 3.4, 4, '#f4e4d8');
    for (let r = 0; r < 4; r++) for (let i = 0; i < 10; i++) {
      F.add(U.box, ['#5a3020', '#7a4a2a', '#f4e4c8', '#3a2010'][(i + r) % 4], [-10.45, 0.55 + r * 0.65, -3.1 + i * 0.68], [0.3, 0.14, 0.5]);
      F.add(U.box, ['#d8b04a', '#e8302a', '#3a6ad8'][(i + r + n) % 3], [-10.44, 0.55 + r * 0.65, -3.1 + i * 0.68], [0.31, 0.15, 0.12]);
    }
  },
};

// petit mobilier de la galerie devant certaines boutiques (x entre -5.4 et -4.2, hors des voies)
const PROPS = [
  (F, G, f) => {   // banc et plante
    bench(F, [-5.05, 0, -1.0], 1.8);
    F.add(U.box, '#e8e4dc', [-4.95, 0.3, 1.5], [0.8, 0.6, 0.8]);
    F.add(U.box, '#5a3e2a', [-4.95, 0.61, 1.5], [0.7, 0.02, 0.7]);
    potPlant(F, 'm_tuft', [-4.95, 0.6, 1.5], 1.1, { green: f });
  },
  (F, G, f) => {   // poubelle de tri et plan du centre
    F.add(U.cyl, '#9aa0a8', [-5.0, 0.45, -1.5], [0.25, 0.9, 0.25]);
    F.add(U.cyl, FLOORS[f].accent, [-5.0, 0.92, -1.5], [0.27, 0.06, 0.27]);
    F.add(U.box, '#2a2a34', [-5.1, 1.0, 1.5], [0.12, 2.0, 0.9]);
    G.add(U.box, '#f4f8ff', [-5.03, 1.25, 1.5], [0.02, 1.2, 0.75]);
    G.add(U.box, FLOORS[f].accent, [-5.02, 1.65, 1.5], [0.01, 0.2, 0.75]);
  },
  () => {},
  (F, G, f) => {   // grande plante dans un bac carré
    F.add(U.box, '#f4f0e8', [-4.9, 0.4, 0], [0.9, 0.8, 0.9]);
    F.add(U.box, FLOORS[f].accent, [-4.9, 0.78, 0], [0.92, 0.05, 0.92]);
    potPlant(F, 'm_strelitzia', [-4.9, 0.55, 0], 1.6, { pot: '#f4f0e8', green: f + 1 });
  },
];

// Une boutique complète (côté gauche) : { flat, glow, sign, clad } ; sign = [{ key, geo }] du TexBuilder
export function shopGeos(f, i) {
  const F = new Builder(), G = new Builder(), T = new TexBuilder(), C = new CladBuilder();
  const s = FLOORS[f].shops[i], n = f * 6 + i;
  // pilastre commun entre deux boutiques (côté +z) avec, un sur trois, la plaque de l'étage
  F.add(U.box, '#ece6dc', [-5.5, CLEAR_H / 2, SHOP_W / 2], [0.44, CLEAR_H, 0.5]);
  F.add(U.box, '#d8d0c4', [-5.45, 0.15, SHOP_W / 2], [0.52, 0.3, 0.6]);
  buildFacade(C, F, G, T, s, { shop: slotUV(SLOT.shop(f, i)), letters: slotUV(SLOT.letters(f, i)), blade: bladeUV(f, i) });
  // intérieur : sol, murs, plafond et spots
  F.add(U.box, s.wall, [-8.4, 0.005, 0], [5.0, 0.01, SHOP_W - 0.4]);
  F.add(U.box, s.wall, [-BACK_X, IN_H / 2, 0], [0.12, IN_H, SHOP_W - 0.4]);
  for (const sz of [-1, 1]) F.add(U.box, s.wall, [-8.4, IN_H / 2, sz * HW], [5.2, IN_H, 0.1]);
  F.add(U.box, '#f8f6f2', [-8.3, IN_H + 0.05, 0], [5.4, 0.1, SHOP_W - 0.4]);
  for (const [x, z] of [[-7, -2.2], [-7, 2.2], [-9.6, -2.2], [-9.6, 2.2]]) G.add(U.cyl6, '#fffbe8', [x, IN_H - 0.01, z], [0.18, 0.02, 0.18]);
  (DISPLAYS[s.kind] || DISPLAYS.toys)(F, G, s, n);
  PROPS[n % PROPS.length](F, G, f);
  return { flat: F.build(), glow: G.parts.length ? G.build() : null, sign: T.build(), clad: C.build() };
}

// Plaque de l'étage sur un pilastre sur quatre (côté galerie)
export function plaqueGeo(f) {
  const T = new TexBuilder();
  T.quad('sign', [-5.275, 3.0, SHOP_W / 2], [1.4, 0.32], slotUV(SLOT.plaque(f)));
  return T.build()[0].geo;
}
