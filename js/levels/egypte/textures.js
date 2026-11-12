import * as THREE from 'three';

// Textures peintes de l'Égypte : sable, dallage de l'allée processionnelle, atlas du décor (reliefs de temple,
// hiéroglyphes, colonnes, souk, Nil) et peintures du tombeau. Tout est dessiné au chargement (aucun fichier).

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function speckle(g, x, y, w, h, n, cols, s = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    g.fillRect(x + Math.random() * w, y + Math.random() * h, s, s);
  }
}

// couleurs des peintures égyptiennes
export const PAINT = {
  red: '#c0442c', blue: '#2a5aa8', lapis: '#1f3f8a', turq: '#3aa8a0', green: '#4a9a5a',
  gold: '#e8b838', ochre: '#d89a48', black: '#2a2420', white: '#f4ecd8', stone: '#e2c99a', skin: '#b8603a',
};

// ---------- Hiéroglyphes simplifiés (dessinés avec des formes de base) ----------
const GLYPHS = ['ankh', 'eye', 'bird', 'reed', 'water', 'snake', 'sun', 'bread', 'hand', 'scarab', 'feather', 'lotus', 'owl', 'djed'];
export function glyph(g, kind, x, y, s, col) {
  g.save();
  g.translate(x, y);
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = s * 0.12; g.lineCap = 'round';
  const P = (pts) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a * s, b * s) : g.moveTo(a * s, b * s))); g.closePath(); g.fill(); };
  switch (kind) {
    case 'ankh':
      g.beginPath(); g.ellipse(0, -s * 0.28, s * 0.16, s * 0.2, 0, 0, Math.PI * 2); g.stroke();
      g.fillRect(-s * 0.32, -s * 0.1, s * 0.64, s * 0.12); g.fillRect(-s * 0.06, -s * 0.05, s * 0.12, s * 0.5); break;
    case 'eye':
      g.beginPath(); g.ellipse(0, 0, s * 0.34, s * 0.14, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0, 0, s * 0.09, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-s * 0.1, s * 0.14); g.lineTo(-s * 0.16, s * 0.4); g.stroke();
      g.beginPath(); g.moveTo(s * 0.05, s * 0.14); g.quadraticCurveTo(s * 0.2, s * 0.42, s * 0.34, s * 0.3); g.stroke(); break;
    case 'bird':
      P([[-0.3, 0.1], [-0.05, -0.15], [0.12, -0.3], [0.25, -0.28], [0.18, -0.12], [0.3, 0.05], [0.05, 0.12], [-0.1, 0.35], [-0.18, 0.12]]); break;
    case 'reed':
      P([[-0.04, 0.42], [-0.08, -0.1], [0, -0.42], [0.1, -0.1], [0.05, 0.42]]); g.fillRect(-s * 0.12, -s * 0.05, s * 0.06, s * 0.1); break;
    case 'water':
      g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(-s * 0.4 + i * s * 0.1, i % 2 ? -s * 0.08 : s * 0.08); g.stroke(); break;
    case 'snake':
      g.beginPath(); g.moveTo(-s * 0.4, s * 0.25); g.bezierCurveTo(-s * 0.1, s * 0.05, s * 0.1, s * 0.4, s * 0.25, s * 0.1); g.lineTo(s * 0.22, -s * 0.3); g.stroke();
      g.beginPath(); g.arc(s * 0.22, -s * 0.32, s * 0.07, 0, Math.PI * 2); g.fill(); break;
    case 'sun':
      g.beginPath(); g.arc(0, 0, s * 0.26, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.06, 0, Math.PI * 2); g.fill(); break;
    case 'bread':
      g.beginPath(); g.arc(0, s * 0.12, s * 0.28, Math.PI, 0); g.fill(); break;
    case 'hand':
      P([[-0.4, -0.05], [0.25, -0.12], [0.4, -0.02], [0.25, 0.08], [-0.4, 0.08]]); break;
    case 'scarab':
      g.beginPath(); g.ellipse(0, s * 0.05, s * 0.18, s * 0.26, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(0, -s * 0.28, s * 0.1, 0, Math.PI * 2); g.fill();
      for (const sx of [-1, 1]) for (const dy of [-0.1, 0.05, 0.2]) { g.beginPath(); g.moveTo(sx * s * 0.15, dy * s); g.lineTo(sx * s * 0.34, dy * s + s * 0.06); g.stroke(); }
      break;
    case 'feather':
      P([[0, -0.42], [0.12, -0.2], [0.1, 0.3], [0, 0.42], [-0.06, 0.3], [-0.06, -0.2]]); break;
    case 'lotus':
      P([[0, -0.36], [0.1, -0.05], [0.3, -0.25], [0.2, 0.1], [0, 0.18], [-0.2, 0.1], [-0.3, -0.25], [-0.1, -0.05]]); g.fillRect(-s * 0.03, s * 0.12, s * 0.06, s * 0.3); break;
    case 'owl':
      P([[-0.18, 0.38], [-0.22, -0.05], [-0.1, -0.32], [0.12, -0.32], [0.2, -0.05], [0.24, 0.38]]);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-s * 0.04, -s * 0.18, s * 0.05, 0, Math.PI * 2); g.fill(); break;
    case 'djed':
      g.fillRect(-s * 0.08, -s * 0.2, s * 0.16, s * 0.6);
      for (let i = 0; i < 4; i++) g.fillRect(-s * 0.26, -s * 0.38 + i * s * 0.09, s * 0.52, s * 0.05); break;
  }
  g.restore();
}
const anyGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

// colonne de hiéroglyphes encadrée de deux filets
function glyphColumn(g, x, y, w, h, col, line = col) {
  g.fillStyle = line;
  g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h);
  const s = w * 0.78;
  for (let yy = y + s * 0.6; yy < y + h - s * 0.4; yy += s * 0.95) glyph(g, anyGlyph(), x + w / 2, yy, s, col);
}

// personnage de profil à la manière égyptienne (épaules de face, pagne blanc, coiffe)
function figure(g, x, y, h, { skin = PAINT.skin, head = 'nemes', offer = false, god = null } = {}) {
  const s = h / 10;
  g.save(); g.translate(x, y);
  g.fillStyle = skin;
  g.fillRect(-s * 0.6, -s * 10, s * 1.2, s * 1.6);                       // cou et visage
  g.beginPath(); g.ellipse(s * 0.2, -s * 9.1, s * 0.9, s * 1.05, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(s * 0.9, -s * 9.2); g.lineTo(s * 1.5, -s * 8.8); g.lineTo(s * 0.9, -s * 8.6); g.fill();   // nez
  g.fillStyle = PAINT.black; g.beginPath(); g.ellipse(s * 0.55, -s * 9.3, s * 0.22, s * 0.12, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(s * 0.55, -s * 9.32, s * 0.7, s * 0.06);                     // trait de khôl
  if (god === 'falcon') {
    g.fillStyle = '#4a6a8a'; g.beginPath(); g.ellipse(s * 0.1, -s * 9.3, s * 1.1, s * 1.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = PAINT.gold; g.beginPath(); g.moveTo(s * 1.0, -s * 9.2); g.lineTo(s * 1.7, -s * 9.0); g.lineTo(s * 1.0, -s * 8.6); g.fill();
    g.fillStyle = PAINT.red; g.beginPath(); g.arc(0, -s * 11.2, s * 0.7, 0, Math.PI * 2); g.fill();   // disque solaire
  } else if (god === 'jackal') {
    g.fillStyle = PAINT.black; g.beginPath(); g.ellipse(s * 0.3, -s * 9.2, s * 1.0, s * 0.8, 0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-s * 0.2, -s * 9.6); g.lineTo(0, -s * 11.2); g.lineTo(s * 0.5, -s * 9.8); g.fill();
    g.beginPath(); g.moveTo(s * 0.9, -s * 9.3); g.lineTo(s * 2.0, -s * 8.9); g.lineTo(s * 0.9, -s * 8.7); g.fill();
    g.fillStyle = PAINT.gold; g.fillRect(s * 0.6, -s * 9.3, s * 0.25, s * 0.12);
  } else if (head === 'nemes') {
    g.fillStyle = PAINT.gold; g.beginPath(); g.moveTo(-s * 1.1, -s * 7.8); g.lineTo(-s * 0.9, -s * 10.2); g.lineTo(s * 0.8, -s * 10.2); g.lineTo(s * 0.4, -s * 9.5); g.lineTo(-s * 0.1, -s * 7.8); g.fill();
    g.fillStyle = PAINT.blue; for (let i = 0; i < 4; i++) g.fillRect(-s * 1.0 + i * s * 0.05, -s * 9.8 + i * s * 0.55, s * 1.2, s * 0.18);
    g.fillStyle = PAINT.gold; g.beginPath(); g.arc(s * 0.75, -s * 10.1, s * 0.18, 0, Math.PI * 2); g.fill();   // uræus
  } else {
    g.fillStyle = PAINT.black; g.beginPath(); g.moveTo(-s * 1.0, -s * 8.2); g.lineTo(-s * 0.8, -s * 10.1); g.lineTo(s * 0.7, -s * 10.1); g.lineTo(s * 0.3, -s * 9.6); g.lineTo(-s * 0.1, -s * 8.2); g.fill();
  }
  // collier large, torse, bras, pagne, jambes
  g.fillStyle = PAINT.turq; g.beginPath(); g.ellipse(0, -s * 7.7, s * 1.5, s * 0.6, 0, 0, Math.PI); g.fill();
  g.fillStyle = PAINT.gold; g.fillRect(-s * 1.5, -s * 7.8, s * 3, s * 0.18);
  g.fillStyle = skin;
  g.beginPath(); g.moveTo(-s * 1.4, -s * 7.6); g.lineTo(s * 1.4, -s * 7.6); g.lineTo(s * 0.8, -s * 4.6); g.lineTo(-s * 0.8, -s * 4.6); g.fill();
  if (offer) { g.fillRect(s * 1.0, -s * 7.4, s * 2.2, s * 0.45); g.fillStyle = PAINT.gold; g.beginPath(); g.arc(s * 3.4, -s * 7.4, s * 0.55, 0, Math.PI); g.fill(); g.fillStyle = skin; }
  else g.fillRect(s * 1.0, -s * 7.4, s * 0.45, s * 3.0);
  g.fillRect(-s * 1.45, -s * 7.4, s * 0.45, s * 3.0);
  g.fillStyle = PAINT.white; g.beginPath(); g.moveTo(-s * 1.0, -s * 4.8); g.lineTo(s * 1.1, -s * 4.8); g.lineTo(s * 1.6, -s * 2.6); g.lineTo(-s * 0.9, -s * 2.8); g.fill();
  g.fillStyle = PAINT.gold; g.fillRect(-s * 1.0, -s * 4.9, s * 2.1, s * 0.25);
  g.fillStyle = skin; g.fillRect(-s * 0.7, -s * 2.8, s * 0.5, s * 2.6); g.fillRect(s * 0.5, -s * 2.8, s * 0.5, s * 2.6);
  g.fillRect(-s * 0.7, -s * 0.3, s * 0.9, s * 0.3); g.fillRect(s * 0.5, -s * 0.3, s * 0.9, s * 0.3);
  // sceptre
  g.fillStyle = PAINT.lapis; g.fillRect(-s * 2.0, -s * 8.4, s * 0.18, s * 8.4); g.beginPath(); g.arc(-s * 1.9, -s * 8.5, s * 0.35, 0, Math.PI * 2); g.fill();
  g.restore();
}

// frise « khekerou » (bouquets de roseaux noués) en haut des murs
function khekeru(g, x, y, w, h) {
  const n = Math.round(w / (h * 0.45));
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x + i * cw + cw / 2;
    g.fillStyle = [PAINT.red, PAINT.blue, PAINT.green][i % 3];
    g.beginPath(); g.moveTo(cx - cw * 0.3, y + h); g.lineTo(cx - cw * 0.22, y + h * 0.3); g.quadraticCurveTo(cx, y - h * 0.05, cx + cw * 0.22, y + h * 0.3); g.lineTo(cx + cw * 0.3, y + h); g.fill();
    g.fillStyle = PAINT.gold; g.fillRect(cx - cw * 0.3, y + h * 0.62, cw * 0.6, h * 0.1);
  }
}

// bandes de couleur (soubassements, chapiteaux)
function bands(g, x, y, w, cols, bh) { cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(x, y + i * bh, w, bh); }); }

// fond de grès gravé : grain, joints de blocs, ombres de taille
function sandstone(g, x, y, w, h, base = '#e0c494', blocks = 0) {
  g.fillStyle = base; g.fillRect(x, y, w, h);
  speckle(g, x, y, w, h, (w * h) / 30, ['#d2b484', '#ead0a2', '#c8a878', '#f0dab0'], 2);
  if (blocks) {
    g.strokeStyle = 'rgba(120,90,50,0.35)'; g.lineWidth = 2;
    for (let yy = y; yy < y + h; yy += blocks) {
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
      const off = ((yy - y) / blocks) % 2 ? blocks : 0;
      for (let xx = x + off; xx < x + w; xx += blocks * 2) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + blocks); g.stroke(); }
    }
  }
}

// ---------- Atlas du décor (1024 × 1024) ----------
// régions en pixels [x, y, largeur, hauteur] ; uv(r) les convertit pour three.js (v vers le haut)
const A = 1024;
export const REG = {
  wall: [0, 0, 512, 512], glyphCol: [512, 0, 128, 512], colBands: [640, 0, 256, 512],
  door: [896, 0, 128, 256], plain: [896, 256, 64, 128], nemes: [960, 256, 64, 128], mashra: [896, 384, 128, 128],
  mud: [0, 512, 256, 256], carpet: [256, 512, 256, 256], awning: [512, 512, 256, 128], sail: [512, 640, 256, 128],
  sign: [768, 512, 256, 256], pylon: [0, 768, 512, 256], wing: [512, 768, 256, 128], gorge: [512, 896, 256, 128],
  water: [768, 768, 256, 256],
  carpet0: [256, 512, 128, 128], carpet1: [384, 512, 128, 128], carpet2: [256, 640, 128, 128], carpet3: [384, 640, 128, 128],
};
const INSET = 3;
export const uv = (name) => {
  const [x, y, w, h] = REG[name];
  return [(x + INSET) / A, 1 - (y + h - INSET) / A, (x + w - INSET) / A, 1 - (y + INSET) / A];
};
export const PLAIN_UV = (() => { const [x, y, w, h] = REG.plain; return [(x + w / 2) / A, 1 - (y + h / 2) / A]; })();

export const decorAtlas = () => canvasTex(A, A, (g) => {
  // mur de temple : frise, deux registres de personnages et de hiéroglyphes, soubassement
  let [x, y, w, h] = REG.wall;
  sandstone(g, x, y, w, h, '#e6cc9c', 64);
  khekeru(g, x, y, w, 40);
  bands(g, x, y + 40, w, [PAINT.blue, PAINT.gold, PAINT.red], 5);
  for (const [ry, fig] of [[y + 60, true], [y + 270, false]]) {
    g.fillStyle = PAINT.blue; g.fillRect(x, ry + 196, w, 6);
    figure(g, x + 110, ry + 194, 170, { offer: true });
    figure(g, x + 330, ry + 194, 170, fig ? { god: 'falcon' } : { god: 'jackal' });
    for (let i = 0; i < 3; i++) glyphColumn(g, x + 180 + i * 34, ry + 10, 30, 180, i % 2 ? PAINT.blue : PAINT.red);
    glyphColumn(g, x + 420, ry + 10, 34, 180, PAINT.green);
    glyphColumn(g, x + 10, ry + 10, 34, 180, PAINT.blue);
  }
  bands(g, x, y + 478, w, [PAINT.red, PAINT.black, PAINT.gold, PAINT.black], 8.5);

  // colonne de hiéroglyphes gravés (obélisques)
  [x, y, w, h] = REG.glyphCol;
  sandstone(g, x, y, w, h, '#d8b888');
  g.fillStyle = 'rgba(110,70,30,0.25)'; g.fillRect(x + 18, y + 8, w - 36, h - 16);
  for (let yy = y + 50; yy < y + h - 20; yy += 58) {
    glyph(g, anyGlyph(), x + w / 2 + 2, yy + 2, 50, 'rgba(255,240,210,0.6)');   // arête éclairée
    glyph(g, anyGlyph(), x + w / 2, yy, 50, '#7a5228');
  }
  // cartouche royal
  g.strokeStyle = '#7a5228'; g.lineWidth = 4; g.beginPath(); g.roundRect(x + 24, y + 12, w - 48, 30, 14); g.stroke();

  // décor de colonne : lotus en haut, cartouches et hiéroglyphes, bandes en bas
  [x, y, w, h] = REG.colBands;
  sandstone(g, x, y, w, h, '#e2c896');
  bands(g, x, y, w, [PAINT.blue, PAINT.gold, PAINT.red, PAINT.green, PAINT.gold], 9);
  for (let i = 0; i < 8; i++) glyph(g, 'lotus', x + 16 + i * 32, y + 75, 44, i % 2 ? PAINT.blue : PAINT.green);
  bands(g, x, y + 108, w, [PAINT.red, PAINT.gold], 6);
  for (let i = 0; i < 4; i++) {
    const cx = x + 32 + i * 64;
    g.strokeStyle = PAINT.red; g.lineWidth = 3; g.beginPath(); g.roundRect(cx - 22, y + 140, 44, 200, 20); g.stroke();
    for (let k = 0; k < 4; k++) glyph(g, anyGlyph(), cx, y + 168 + k * 44, 34, k % 2 ? PAINT.blue : PAINT.red);
  }
  bands(g, x, y + 370, w, [PAINT.gold, PAINT.blue, PAINT.gold, PAINT.red, PAINT.gold], 7);
  for (let i = 0; i < 8; i++) glyph(g, 'reed', x + 16 + i * 32, y + 440, 48, '#8a6a3a');

  // porte bleue cloutée du souk, encadrement de chaux
  [x, y, w, h] = REG.door;
  g.fillStyle = '#f2ead8'; g.fillRect(x, y, w, h);
  g.fillStyle = '#2a7ab0'; g.beginPath(); g.roundRect(x + 16, y + 30, w - 32, h - 30, [44, 44, 0, 0]); g.fill();
  g.fillStyle = '#20608c'; g.fillRect(x + w / 2 - 2, y + 40, 4, h - 40);
  g.fillStyle = '#e8c860'; for (let yy = y + 60; yy < y + h; yy += 22) for (const xx of [x + 30, x + 50, x + 78, x + 98]) { g.beginPath(); g.arc(xx, yy, 3, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(x + w / 2 + 10, y + 150, 7, 0, Math.PI * 2); g.fill();   // heurtoir
  g.fillStyle = '#d8402a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + 24 + i * 20, y + 16, 5, 0, Math.PI * 2); g.fill(); }

  // blanc uni (parties peintes sans texture : la couleur vient des sommets)
  [x, y, w, h] = REG.plain;
  g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);

  // némès : rayures horizontales or et lapis
  [x, y, w, h] = REG.nemes;
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#2a5aa8' : '#f0c040'; g.fillRect(x, y + i * 8, w, 8); }

  // moucharabieh : treillis de bois tourné
  [x, y, w, h] = REG.mashra;
  g.fillStyle = '#3a2214'; g.fillRect(x, y, w, h);
  for (let yy = y + 8; yy < y + h; yy += 16) for (let xx = x + 8; xx < x + w; xx += 16) {
    g.fillStyle = '#e8c890'; g.beginPath(); g.arc(xx, yy, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a4a28'; g.beginPath(); g.arc(xx, yy, 2.5, 0, Math.PI * 2); g.fill();
  }

  // crépi de terre crue
  [x, y, w, h] = REG.mud;
  g.fillStyle = '#d8b48a'; g.fillRect(x, y, w, h);
  speckle(g, x, y, w, h, 2400, ['#cca47a', '#e2c49c', '#c09870', '#e8cca8'], 3);
  g.fillStyle = 'rgba(255,240,220,0.25)'; for (let i = 0; i < 14; i++) g.fillRect(x + rnd(0, w - 60), y + rnd(0, h), rnd(30, 70), rnd(3, 8));
  g.strokeStyle = 'rgba(120,80,50,0.25)'; g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { let px = x + rnd(0, w), py = y + rnd(0, h); g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 5; k++) { px += rnd(-10, 10); py += rnd(4, 12); g.lineTo(px, py); } g.stroke(); }

  // tapis : quatre motifs
  [x, y, w, h] = REG.carpet;
  const carpets = [['#a82a2a', '#e8b838', '#1f3f8a'], ['#1f3f8a', '#f4ecd8', '#c0442c'], ['#4a9a5a', '#e8b838', '#a82a2a'], ['#6a2a6a', '#f2c46a', '#2a7ab0']];
  carpets.forEach(([bg, fg, mid], i) => {
    const cx = x + (i % 2) * 128, cy = y + ((i / 2) | 0) * 128;
    g.fillStyle = bg; g.fillRect(cx, cy, 128, 128);
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(cx + 8, cy + 8, 112, 112);
    g.fillStyle = mid; g.beginPath(); g.moveTo(cx + 64, cy + 22); g.lineTo(cx + 104, cy + 64); g.lineTo(cx + 64, cy + 106); g.lineTo(cx + 24, cy + 64); g.fill();
    g.fillStyle = fg; g.beginPath(); g.moveTo(cx + 64, cy + 42); g.lineTo(cx + 84, cy + 64); g.lineTo(cx + 64, cy + 86); g.lineTo(cx + 44, cy + 64); g.fill();
    for (let k = 0; k < 8; k++) { g.fillRect(cx + 14 + k * 14, cy + 2, 3, 6); g.fillRect(cx + 14 + k * 14, cy + 120, 3, 6); }
  });

  // toile de store à rayures
  [x, y, w, h] = REG.awning;
  for (let i = 0; i < 16; i++) { g.fillStyle = ['#f4ecd8', '#c0442c', '#f4ecd8', '#2a5aa8'][i % 4]; g.fillRect(x + i * 16, y, 16, h); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y + h - 20, w, 20);

  // voile de felouque : toile écrue rapiécée
  [x, y, w, h] = REG.sail;
  g.fillStyle = '#f2ead6'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(150,120,80,0.35)'; g.lineWidth = 2;
  for (let xx = x + 20; xx < x + w; xx += 26) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
  g.fillStyle = '#e2d2b0'; g.fillRect(x + 140, y + 30, 40, 36); g.fillStyle = '#d8c49c'; g.fillRect(x + 50, y + 70, 30, 24);

  // enseigne de boutique : cartouche doré et pictogramme d'épices
  [x, y, w, h] = REG.sign;
  g.fillStyle = '#1f3f8a'; g.fillRect(x, y, w, h);
  g.strokeStyle = PAINT.gold; g.lineWidth = 8; g.strokeRect(x + 10, y + 10, w - 20, h - 20);
  for (const [c, px] of [['#d8402a', 70], ['#e8a838', 128], ['#6a9a3a', 186]]) { g.fillStyle = c; g.beginPath(); g.moveTo(x + px - 36, y + 170); g.lineTo(x + px, y + 90); g.lineTo(x + px + 36, y + 170); g.fill(); }
  g.fillStyle = PAINT.gold; for (let i = 0; i < 5; i++) glyph(g, anyGlyph(), x + 40 + i * 44, y + 214, 34, PAINT.gold);

  // grand relief de pylône : pharaon géant et colonnes de texte
  [x, y, w, h] = REG.pylon;
  sandstone(g, x, y, w, h, '#e2c494', 0);
  figure(g, x + 150, y + 248, 236, { offer: true });
  figure(g, x + 380, y + 248, 236, { god: 'falcon' });
  for (let i = 0; i < 3; i++) glyphColumn(g, x + 220 + i * 40, y + 20, 36, 220, [PAINT.blue, PAINT.red, PAINT.green][i]);
  for (const gx of [x + 6, x + 470]) glyphColumn(g, gx, y + 20, 36, 220, PAINT.blue);

  // disque solaire ailé (corniches)
  [x, y, w, h] = REG.wing;
  sandstone(g, x, y, w, h, '#e6cc9c');
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      g.fillStyle = [PAINT.blue, PAINT.green, PAINT.red, PAINT.gold][k];
      g.beginPath(); g.moveTo(x + w / 2 + s * 24, y + 52 + k * 9);
      g.quadraticCurveTo(x + w / 2 + s * 80, y + 30 + k * 10, x + w / 2 + s * 120, y + 46 + k * 12);
      g.lineTo(x + w / 2 + s * 118, y + 54 + k * 12); g.quadraticCurveTo(x + w / 2 + s * 80, y + 42 + k * 10, x + w / 2 + s * 24, y + 62 + k * 9); g.fill();
    }
  }
  g.fillStyle = PAINT.red; g.beginPath(); g.arc(x + w / 2, y + 58, 22, 0, Math.PI * 2); g.fill();
  g.strokeStyle = PAINT.gold; g.lineWidth = 4; g.stroke();
  for (const s of [-1, 1]) { g.fillStyle = PAINT.gold; g.beginPath(); g.arc(x + w / 2 + s * 20, y + 84, 7, 0, Math.PI * 2); g.fill(); }   // uræus

  // gorge égyptienne : feuilles de palmier peintes verticalement
  [x, y, w, h] = REG.gorge;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = [PAINT.blue, PAINT.gold, PAINT.green, PAINT.gold, PAINT.red, PAINT.gold][i % 6];
    g.fillRect(x + i * 16, y, 16, h);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + i * 16 + 2, y, 3, h);
  }
  bands(g, x, y + h - 18, w, [PAINT.gold, PAINT.black], 9);

  // eau du Nil
  [x, y, w, h] = REG.water;
  const wg = g.createLinearGradient(0, y, 0, y + h);
  wg.addColorStop(0, '#3a8aa8'); wg.addColorStop(1, '#2a6a8a');
  g.fillStyle = wg; g.fillRect(x, y, w, h);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(220,245,255,${rnd(0.15, 0.45)})`; g.lineWidth = rnd(1, 2.5);
    const px = x + rnd(0, w - 40), py = y + rnd(0, h);
    g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 12, py - 4, px + rnd(20, 40), py); g.stroke();
  }
}, false);

// ---------- Sol ----------
export const sand = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#e8c88e'; g.fillRect(0, 0, w, h);
  speckle(g, 0, 0, w, h, 3000, ['#dcb87e', '#f2d6a0', '#d4ae74', '#f6deb0'], 2);
  // rides du vent
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = `rgba(190,150,96,${rnd(0.2, 0.4)})`; g.lineWidth = rnd(1.5, 3);
    const y0 = rnd(0, h);
    g.beginPath(); g.moveTo(0, y0);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x / 30 + i) * 6);
    g.stroke();
  }
});

// dallage de l'allée processionnelle : grandes dalles de grès, joints de sable
export const paving = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b8955e'; g.fillRect(0, 0, w, h);
  const rows = [0, 70, 130, 200, 256];
  for (let r = 0; r < rows.length - 1; r++) {
    let x = r % 2 ? -40 : 0;
    while (x < w) {
      const sw = rnd(60, 110), v = rnd(-14, 14);
      g.fillStyle = `rgb(${226 + v},${196 + v},${146 + v})`;
      g.fillRect(x + 3, rows[r] + 3, sw - 6, rows[r + 1] - rows[r] - 6);
      speckle(g, x + 3, rows[r] + 3, sw - 6, rows[r + 1] - rows[r] - 6, 90, ['#d4b07e', '#f2dcb0', '#c8a26e'], 2);
      g.fillStyle = 'rgba(255,245,220,0.35)'; g.fillRect(x + 3, rows[r] + 3, sw - 6, 3);
      if (Math.random() < 0.3) { g.strokeStyle = 'rgba(120,90,50,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + rnd(10, sw - 10), rows[r] + 4); g.lineTo(x + rnd(10, sw - 10), rows[r + 1] - 4); g.stroke(); }
      x += sw;
    }
  }
});

// traces des traîneaux et du passage dans chaque voie (fond transparent)
export const laneWear = () => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (const cx of [0.26 * w, 0.74 * w]) {
    const grd = g.createLinearGradient(cx - 10, 0, cx + 10, 0);
    grd.addColorStop(0, 'rgba(120,86,46,0)'); grd.addColorStop(0.5, 'rgba(120,86,46,0.3)'); grd.addColorStop(1, 'rgba(120,86,46,0)');
    g.fillStyle = grd; g.fillRect(cx - 10, 0, 20, h);
  }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(250,226,180,${rnd(0.2, 0.5)})`; g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(4, 12), rnd(2, 5), 0, 0, Math.PI * 2); g.fill(); }
});

// ---------- Tombeau ----------
// mur peint (1024 × 512, répété le long du couloir) : frise, cortège de dieux et d'offrandes, soubassement
export const tombWall = () => canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#ecd6a8'; g.fillRect(0, 0, w, h);
  speckle(g, 0, 0, w, h, 6000, ['#e2c898', '#f2e0b8', '#d8bc8a'], 2);
  khekeru(g, 0, 0, w, 46);
  bands(g, 0, 46, w, [PAINT.blue, PAINT.gold, PAINT.red, PAINT.gold], 5);
  const gods = [{ offer: true }, { god: 'jackal' }, { head: 'wig', offer: true }, { god: 'falcon' }];
  gods.forEach((o, i) => figure(g, 90 + i * 250, 400, 290, { ...o, skin: i % 2 ? '#c06a3a' : '#e8a878' }));
  for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) glyphColumn(g, 150 + i * 250 + k * 36, 90, 32, 220, k ? PAINT.blue : PAINT.red);
  // table d'offrandes entre les personnages
  for (let i = 0; i < 4; i++) {
    const cx = 200 + i * 250;
    g.fillStyle = PAINT.ochre; g.fillRect(cx - 22, 360, 44, 40);
    for (const [c, dx, dy] of [['#d8402a', -12, 352], ['#6a9a3a', 6, 348], ['#e8b838', -2, 340]]) { g.fillStyle = c; g.beginPath(); g.arc(cx + dx, dy, 10, 0, Math.PI * 2); g.fill(); }
  }
  bands(g, 0, 404, w, [PAINT.blue, PAINT.gold], 6);
  for (let x = 0; x < w; x += 32) { g.fillStyle = x % 64 ? PAINT.red : PAINT.black; g.fillRect(x, 416, 32, 60); }
  bands(g, 0, 476, w, [PAINT.gold, PAINT.black, PAINT.ochre], 12);
});

// plafond bleu nuit semé d'étoiles jaunes à cinq branches
export const starCeiling = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#1a2a5a'; g.fillRect(0, 0, w, h);
  speckle(g, 0, 0, w, h, 400, ['#22346a', '#14224a'], 3);
  const star = (x, y, r) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  };
  g.fillStyle = '#f2c84a';
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) star(col * 43 + (row % 2 ? 21 : 0) + 10, row * 43 + 20, 9);
});

// dalles du tombeau : pierre sombre usée, chemin plus clair au centre de chaque voie
export const tombFloor = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5a4630'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const v = rnd(-12, 12);
    g.fillStyle = `rgb(${132 + v},${106 + v},${74 + v})`;
    g.fillRect(c * 64 + 2, r * 64 + 2, 60, 60);
    speckle(g, c * 64 + 2, r * 64 + 2, 60, 60, 60, ['#7a6244', '#9a8058', '#6a5438'], 2);
  }
  g.fillStyle = 'rgba(240,200,120,0.12)'; g.fillRect(0, 0, w, h);
});
