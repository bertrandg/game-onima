import * as THREE from 'three';

// Textures peintes de Hong Kong la nuit : chaussée mouillée qui reflète les néons, trottoirs, atlas du
// décor (façades aux fenêtres allumées, vitrines, enseignes au néon, bâches du marché, eau du port).
// Les façades et les néons sont peints « éclairés » : ils sont affichés sans calcul de lumière.

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
const pickOf = (a) => a[(Math.random() * a.length) | 0];
function speckle(g, x, y, w, h, n, cols, s = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    g.fillRect(x + Math.random() * w, y + Math.random() * h, s, s);
  }
}

export const NEON = { pink: '#ff4fa8', cyan: '#3ff0ff', yellow: '#ffe84a', green: '#4aff8a', red: '#ff4040', violet: '#b06aff', orange: '#ff9a3a', white: '#fff4f8' };
const CJK = '"PingFang TC", "Hiragino Sans", "Noto Sans CJK TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
const LATIN = '"Arial Rounded MT Bold", "M PLUS Rounded 1c", sans-serif';

// tube de néon : trait coloré, halo, cœur presque blanc
function neonText(g, text, x, y, size, col, { font = CJK, vertical = false } = {}) {
  g.save();
  g.font = `900 ${size}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = vertical ? [...text] : [text];
  chars.forEach((ch, i) => {
    const cy = vertical ? y + (i - (chars.length - 1) / 2) * size * 1.08 : y;
    g.shadowColor = col; g.shadowBlur = size * 0.35;
    g.strokeStyle = col; g.lineWidth = size * 0.09;
    g.strokeText(ch, x, cy);
    g.shadowBlur = size * 0.15;
    g.fillStyle = col; g.fillText(ch, x, cy);
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = size * 0.025;
    g.strokeText(ch, x, cy);
  });
  g.restore();
}
function neonRect(g, x, y, w, h, col, r = 8) {
  g.save();
  g.shadowColor = col; g.shadowBlur = 10;
  g.strokeStyle = col; g.lineWidth = 4;
  g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.stroke();
  g.restore();
}

// ---------- Atlas du décor (1024 × 2048) ----------
const A = 1024, AH = 2048;
export const REG = {
  facadeA: [0, 0, 256, 512], facadeB: [256, 0, 256, 512], facadeC: [512, 0, 256, 512],
  neonV0: [768, 0, 64, 256], neonV1: [832, 0, 64, 256], neonV2: [896, 0, 64, 256], neonV3: [960, 0, 64, 256],
  neonH0: [768, 256, 256, 96], neonH1: [768, 352, 256, 96], plain: [768, 448, 64, 64], menu: [832, 448, 64, 64],
  tarp: [896, 448, 128, 64],
  shops: [0, 512, 512, 128], shutters: [0, 640, 512, 128],
  neonH2: [512, 512, 256, 96], neonH3: [512, 608, 256, 96], neonH4: [768, 512, 256, 96], neonH5: [768, 608, 256, 96],
  water: [512, 704, 256, 256], windows: [768, 704, 256, 256], skyline: [0, 768, 512, 256],
  // deuxième moitié : façades carrelées de vieux immeubles, intérieurs de boutiques, caissons lumineux, reflet
  facadeD: [0, 1024, 256, 512], facadeE: [256, 1024, 256, 512],
  streak: [512, 1024, 64, 256],
  shut0: [0, 640, 128, 128], shut1: [128, 640, 128, 128], shut2: [256, 640, 128, 128], shut3: [384, 640, 128, 128],
};
// intérieurs de boutiques du rez-de-chaussée (in0…in7) et caissons d'enseigne (sign0…sign7)
for (let i = 0; i < 8; i++) {
  REG['in' + i] = [i * 128, 1536, 128, 128];
  REG['sign' + i] = [(i % 4) * 256, 1664 + Math.floor(i / 4) * 64, 256, 64];
}
export const INTERIORS = 8, SIGNS = 8;
const INSET = 2;
export const uv = (name) => {
  const [x, y, w, h] = REG[name];
  return [(x + INSET) / A, 1 - (y + h - INSET) / AH, (x + w - INSET) / A, 1 - (y + INSET) / AH];
};
export const PLAIN_UV = (() => { const [x, y, w, h] = REG.plain; return [(x + w / 2) / A, 1 - (y + h / 2) / AH]; })();

// grille de fenêtres de nuit : allumées (chaudes, froides, télévision bleue), éteintes, rideaux, climatiseurs
function windowGrid(g, x, y, w, h, { cols, rows, wall, frame, lit = 0.6, ac = 0.35, balcony = false }) {
  g.fillStyle = wall; g.fillRect(x, y, w, h);
  speckle(g, x, y, w, h, (w * h) / 40, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.05)'], 2);
  const cw = w / cols, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * cw + cw * 0.14, wy = y + r * rh + rh * 0.18, ww = cw * 0.72, wh = rh * 0.56;
      g.fillStyle = frame; g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      if (Math.random() < lit) {
        const warm = Math.random();
        const grd = g.createLinearGradient(wx, wy, wx, wy + wh);
        const top = warm < 0.55 ? '#ffd890' : warm < 0.85 ? '#e8f0ff' : '#7ab8ff';
        grd.addColorStop(0, top); grd.addColorStop(1, warm < 0.55 ? '#e89a50' : warm < 0.85 ? '#a8b8d8' : '#3a6ad8');
        g.fillStyle = grd;
      } else g.fillStyle = pickOf(['#1a1a2a', '#22223a', '#2a2030']);
      g.fillRect(wx, wy, ww, wh);
      if (Math.random() < 0.4) { g.fillStyle = pickOf(['rgba(255,120,150,0.45)', 'rgba(120,200,160,0.4)', 'rgba(255,220,140,0.4)']); g.fillRect(wx, wy, ww * 0.35, wh); }   // rideau
      g.fillStyle = frame; g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      if (Math.random() < ac) {   // climatiseur sous la fenêtre
        g.fillStyle = '#c8ccd0'; g.fillRect(wx + ww * 0.2, wy + wh + 3, ww * 0.6, rh * 0.18);
        g.fillStyle = '#7a7e88'; for (let k = 0; k < 4; k++) g.fillRect(wx + ww * 0.24 + k * ww * 0.13, wy + wh + 5, ww * 0.08, rh * 0.12);
      }
      if (balcony) {
        g.fillStyle = 'rgba(30,30,40,0.85)'; g.fillRect(x + c * cw + 2, wy + wh + rh * 0.08, cw - 4, rh * 0.16);
        for (let k = 0; k < 6; k++) g.fillRect(x + c * cw + 4 + k * (cw - 8) / 5, wy + wh - rh * 0.05, 2, rh * 0.28);
        if (Math.random() < 0.5) for (let k = 0; k < 3; k++) { g.fillStyle = pickOf(['#ff8ab0', '#8ad0ff', '#fff0a0', '#a8f0b0', '#ffffff']); g.fillRect(x + c * cw + 8 + k * cw * 0.25, wy + wh * 0.4, cw * 0.14, rh * 0.32); }   // linge
      }
    }
  }
  // coulures de pluie et d'humidité
  for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + rnd(0, w), y + rnd(0, h * 0.5), rnd(2, 5), rnd(40, 160)); }
}

export const decorAtlas = () => canvasTex(A, AH, (g) => {
  // façade A : immeuble de bureaux et d'habitations, carrelage gris-bleu
  let [x, y, w, h] = REG.facadeA;
  windowGrid(g, x, y, w, h, { cols: 4, rows: 6, wall: '#4a5068', frame: '#2a2e40', lit: 0.62, ac: 0.4 });
  // façade B : vieil immeuble (tong lau) carrelé de rose, balcons et linge
  [x, y, w, h] = REG.facadeB;
  windowGrid(g, x, y, w, h, { cols: 3, rows: 6, wall: '#8a5a6a', frame: '#4a2a3a', lit: 0.55, ac: 0.3, balcony: true });
  for (let r = 0; r < 6; r++) { g.fillStyle = 'rgba(255,200,210,0.12)'; g.fillRect(x, y + r * (h / 6), w, 3); }
  // façade C : tour de verre, reflets bleutés et bandes lumineuses
  [x, y, w, h] = REG.facadeC;
  const gg = g.createLinearGradient(x, y, x + w, y + h);
  gg.addColorStop(0, '#24345e'); gg.addColorStop(0.5, '#3a4a8a'); gg.addColorStop(1, '#1e2a50');
  g.fillStyle = gg; g.fillRect(x, y, w, h);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) {
    if (Math.random() < 0.5) { g.fillStyle = pickOf(['rgba(200,230,255,0.55)', 'rgba(255,240,200,0.5)', 'rgba(120,170,255,0.4)']); g.fillRect(x + c * 32 + 2, y + r * 32 + 4, 28, 24); }
  }
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + k * 60, y); g.lineTo(x + k * 60 + 30, y); g.lineTo(x + k * 60 - 70, y + h); g.lineTo(x + k * 60 - 100, y + h); g.fill(); }
  for (let r = 0; r < 4; r++) { g.fillStyle = r % 2 ? NEON.cyan : NEON.violet; g.globalAlpha = 0.5; g.fillRect(x, y + r * 128 + 120, w, 4); g.globalAlpha = 1; }

  // enseignes verticales en lames
  const vTexts = [['茶餐廳', NEON.red], ['大押', NEON.yellow], ['藥房', NEON.green], ['麻雀', NEON.pink]];
  vTexts.forEach(([t, col], i) => {
    [x, y, w, h] = REG['neonV' + i];
    g.fillStyle = '#0c0a14'; g.fillRect(x, y, w, h);
    neonRect(g, x + 5, y + 5, w - 10, h - 10, i % 2 ? NEON.cyan : NEON.orange, 6);
    neonText(g, t, x + w / 2, y + h / 2, 44, col, { vertical: true });
  });
  // enseignes horizontales
  const hTexts = [['酒家', NEON.red, '海鮮', NEON.yellow], ['NOODLES', NEON.cyan, '麵', NEON.pink], ['金行', NEON.yellow, 'GOLD', NEON.orange],
    ['KARAOKE', NEON.violet, '♪', NEON.pink], ['HOTEL', NEON.green, '賓館', NEON.white], ['BAR', NEON.pink, '酒吧', NEON.cyan]];
  hTexts.forEach(([t1, c1, t2, c2], i) => {
    [x, y, w, h] = REG['neonH' + i];
    g.fillStyle = '#0c0a14'; g.fillRect(x, y, w, h);
    neonRect(g, x + 5, y + 5, w - 10, h - 10, c2, 10);
    const latin = /[A-Z]/.test(t1);
    neonText(g, t1, x + w * 0.4, y + h / 2, latin ? 36 : 54, c1, { font: latin ? LATIN : CJK });
    neonText(g, t2, x + w * 0.84, y + h / 2, 40, c2);
  });

  // blanc uni (la couleur vient des sommets)
  [x, y, w, h] = REG.plain;
  g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h);
  // ardoise de menu de restaurant de rue
  [x, y, w, h] = REG.menu;
  g.fillStyle = '#c8202a'; g.fillRect(x, y, w, h);
  g.fillStyle = '#ffe8a0';
  g.font = `900 13px ${CJK}`; g.textAlign = 'center';
  ['魚蛋', '燒賣', '腸粉', '奶茶'].forEach((s, i) => g.fillText(s, x + w / 2, y + 14 + i * 14));
  // bâche rayée du marché de nuit
  [x, y, w, h] = REG.tarp;
  for (let i = 0; i < 8; i++) { g.fillStyle = ['#e8202a', '#f4f0f0', '#2a5ad8', '#f4f0f0'][i % 4]; g.fillRect(x + i * 16, y, 16, h); }

  // vitrines du rez-de-chaussée, éclairées : pharmacie, restaurant, bijouterie, nouilles
  [x, y, w, h] = REG.shops;
  const shops = [['#3ac87a', '藥', '#e8fff0'], ['#e8302a', '粥麵', '#fff0d8'], ['#e8b830', '金', '#fff8e0'], ['#2a7ad8', '餅', '#e8f4ff']];
  shops.forEach(([col, t, light], i) => {
    const sx = x + i * 128;
    g.fillStyle = '#1a1620'; g.fillRect(sx, y, 128, h);
    const grd = g.createLinearGradient(0, y + 34, 0, y + h);
    grd.addColorStop(0, light); grd.addColorStop(1, '#a89878');
    g.fillStyle = grd; g.fillRect(sx + 6, y + 36, 116, h - 40);
    g.fillStyle = col; g.fillRect(sx + 2, y + 4, 124, 28);   // bandeau d'enseigne
    g.fillStyle = '#ffffff'; g.font = `900 22px ${CJK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t, sx + 64, y + 19);
    for (let k = 0; k < 7; k++) { g.fillStyle = pickOf(['#e8302a', '#3ac87a', '#ffd040', '#2a7ad8', '#ff8ab0', '#8a5a3a']); g.fillRect(sx + 12 + k * 15, y + 54 + (k % 3) * 18, 10, 14); }   // marchandises
    g.fillStyle = '#5a4a3a'; g.fillRect(sx + 6, y + 100, 116, 6);
    g.fillStyle = 'rgba(40,30,30,0.7)'; g.fillRect(sx + 50, y + 70, 26, 54);   // silhouette de client
    g.beginPath(); g.arc(sx + 63, y + 64, 10, 0, Math.PI * 2); g.fill();
  });
  // rideaux de fer à moitié levés (boutiques fermées), graffitis
  [x, y, w, h] = REG.shutters;
  for (let i = 0; i < 4; i++) {
    const sx = x + i * 128;
    g.fillStyle = '#1a1620'; g.fillRect(sx, y, 128, h);
    g.fillStyle = '#ffd890'; g.fillRect(sx + 6, y + h - 26, 116, 22);
    for (let k = 0; k < 18; k++) { g.fillStyle = k % 2 ? '#8a8e98' : '#a0a4ae'; g.fillRect(sx + 6, y + 6 + k * 5.4, 116, 5); }
    g.fillStyle = pickOf([NEON.pink, NEON.cyan, '#ffd040']); g.globalAlpha = 0.6; g.font = `900 20px ${LATIN}`; g.textAlign = 'center';
    g.fillText(pickOf(['HK', '♥', '★', 'LOVE']), sx + 64, y + 54); g.globalAlpha = 1;
  }
  // eau du port la nuit : reflets étirés des lumières de la ville
  [x, y, w, h] = REG.water;
  const wg = g.createLinearGradient(0, y, 0, y + h);
  wg.addColorStop(0, '#141a3a'); wg.addColorStop(1, '#0c1028');
  g.fillStyle = wg; g.fillRect(x, y, w, h);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = pickOf(['rgba(255,220,140,0.55)', 'rgba(255,90,180,0.45)', 'rgba(80,230,255,0.45)', 'rgba(255,255,255,0.4)']);
    g.fillRect(x + rnd(0, w - 10), y + rnd(0, h), rnd(3, 10), rnd(1.5, 3));
  }
  // fenêtres lointaines (gratte-ciel de la rive d'en face)
  [x, y, w, h] = REG.windows;
  g.fillStyle = '#1a1e3a'; g.fillRect(x, y, w, h);
  for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) if (Math.random() < 0.45) { g.fillStyle = pickOf(['#ffe0a0', '#e8f0ff', '#a8d0ff', '#ffb0d0']); g.fillRect(x + c * 8 + 2, y + r * 8 + 2, 4, 4); }
  // bande de skyline lointaine
  [x, y, w, h] = REG.skyline;
  g.fillStyle = '#1a1e3a'; g.fillRect(x, y, w, h);

  // façade D : vieil immeuble à mosaïque vert d'eau, cages de fenêtres, linge
  [x, y, w, h] = REG.facadeD;
  windowGrid(g, x, y, w, h, { cols: 4, rows: 6, wall: '#4a7a72', frame: '#24403c', lit: 0.58, ac: 0.45, balcony: true });
  mosaic(g, x, y, w, h, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.08)']);
  // façade E : carrelage jaune moutarde, grilles de fenêtres en fer forgé
  [x, y, w, h] = REG.facadeE;
  windowGrid(g, x, y, w, h, { cols: 3, rows: 6, wall: '#8a7440', frame: '#3a2e1a', lit: 0.6, ac: 0.35 });
  mosaic(g, x, y, w, h, ['rgba(255,240,200,0.07)', 'rgba(0,0,0,0.08)']);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {   // grilles
    const cw = w / 3, rh = h / 6, gx = x + c * cw + cw * 0.12, gy = y + r * rh + rh * 0.14;
    g.strokeStyle = 'rgba(20,20,26,0.8)'; g.lineWidth = 2;
    for (let k = 0; k <= 6; k++) { g.beginPath(); g.moveTo(gx + k * cw * 0.76 / 6, gy); g.lineTo(gx + k * cw * 0.76 / 6, gy + rh * 0.64); g.stroke(); }
    g.beginPath(); g.moveTo(gx, gy + rh * 0.32); g.lineTo(gx + cw * 0.76, gy + rh * 0.32); g.stroke();
  }
  // traînée de reflet sur la chaussée mouillée (fond noir : matière additive)
  [x, y, w, h] = REG.streak;
  g.fillStyle = '#000000'; g.fillRect(x, y, w, h);
  for (let k = 0; k < 40; k++) {
    const yy = y + (k / 40) * h, a = Math.sin((k / 40) * Math.PI) * rnd(0.55, 1);
    const grd = g.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(2)})`); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(x + rnd(-4, 4), yy, w, h / 40 * rnd(0.4, 1));
  }
  // intérieurs de boutiques
  INTERIOR_PAINTERS.forEach((fn, i) => { [x, y, w, h] = REG['in' + i]; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(g, x, y, w, h); g.restore(); });
  // caissons lumineux des enseignes
  const signs = [['藥房', 'PHARMACY', '#2a9a5a', '#ffffff'], ['茶餐廳', 'CAFÉ', '#e8302a', '#fff4c0'], ['海味', 'DRIED SEAFOOD', '#8a4a1a', '#ffe0a0'], ['電器', 'ELECTRONICS', '#1a4ab8', '#e8f4ff'],
    ['金行', 'GOLD', '#c8202a', '#ffd84a'], ['餅家', 'BAKERY', '#f2c230', '#6a2a10'], ['酒樓', 'DIM SUM', '#a81a2a', '#ffe8a0'], ['便利店', '24H', '#ff7a1a', '#ffffff']];
  signs.forEach(([cjk, lat, bg, fg], i) => {
    [x, y, w, h] = REG['sign' + i];
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, bg); grd.addColorStop(1, shadeCss(bg, 0.75));
    g.fillStyle = grd; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 34px ${CJK}`; g.fillText(cjk, x + w * 0.36, y + h / 2 + 1);
    g.font = `900 14px ${LATIN}`; g.fillText(lat, x + w * 0.8, y + h / 2 + 1);
  });
});

// petits carreaux de mosaïque sur un mur
function mosaic(g, x, y, w, h, cols) {
  for (let j = 0; j < h; j += 6) for (let i = 0; i < w; i += 6) if (Math.random() < 0.35) { g.fillStyle = pickOf(cols); g.fillRect(x + i, y + j, 5, 5); }
}
function shadeCss(hex, k) {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return '#' + c.getHexString();
}
// lumière de fond d'un intérieur (dégradé du plafond vers le sol)
function room(g, x, y, w, h, top, bottom) {
  const grd = g.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, top); grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 3; k++) g.fillRect(x + 12 + k * 40, y + 4, 26, 4);   // néons du plafond
}
function shelves(g, x, y, w, h, rows, cols, colors, top = 22) {
  for (let r = 0; r < rows; r++) {
    const yy = y + top + r * ((h - top - 30) / rows);
    g.fillStyle = 'rgba(80,60,50,0.8)'; g.fillRect(x + 4, yy + 14, w - 8, 3);
    for (let c = 0; c < cols; c++) { g.fillStyle = pickOf(colors); g.fillRect(x + 8 + c * ((w - 16) / cols), yy + rnd(0, 4), (w - 16) / cols - 3, 12 - rnd(0, 4)); }
  }
}
function person(g, x, y, col) {
  g.fillStyle = col; g.fillRect(x - 9, y, 18, 40);
  g.beginPath(); g.arc(x, y - 7, 8, 0, Math.PI * 2); g.fill();
}
const INTERIOR_PAINTERS = [
  (g, x, y, w, h) => { room(g, x, y, w, h, '#f4fff8', '#b8d8c4'); shelves(g, x, y, w, h, 4, 8, ['#3ac87a', '#ffffff', '#e8302a', '#2a7ad8', '#ffd040']); g.fillStyle = '#2a9a5a'; g.fillRect(x + w / 2 - 6, y + 20, 12, 30); g.fillRect(x + w / 2 - 15, y + 29, 30, 12); },   // pharmacie
  (g, x, y, w, h) => { room(g, x, y, w, h, '#fff0d0', '#c89a6a'); for (let k = 0; k < 3; k++) { g.fillStyle = '#e8302a'; g.fillRect(x + 8 + k * 40, y + 18, 34, 26); g.fillStyle = '#fff4c0'; for (let l = 0; l < 4; l++) g.fillRect(x + 12 + k * 40, y + 22 + l * 6, 26, 2); } for (let k = 0; k < 3; k++) { g.fillStyle = '#5a3a2a'; g.fillRect(x + 6 + k * 42, y + 92, 34, 6); g.fillRect(x + 20 + k * 42, y + 98, 6, 26); } person(g, x + 40, y + 70, 'rgba(60,40,40,0.8)'); person(g, x + 90, y + 74, 'rgba(40,40,60,0.8)'); },   // café
  (g, x, y, w, h) => { room(g, x, y, w, h, '#ffe8c0', '#a87a4a'); for (let k = 0; k < 9; k++) { g.fillStyle = pickOf(['#8a4a1a', '#c8783a', '#6a3a1a', '#e8b060']); g.fillRect(x + 6 + k * 13, y + 14, 9, rnd(20, 40)); } for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 6 + k * 20, y + 80, 16, 26); g.fillStyle = pickOf(['#c8783a', '#e8c070', '#8a4a1a']); g.fillRect(x + 8 + k * 20, y + 88, 12, 16); } },   // produits séchés
  (g, x, y, w, h) => { room(g, x, y, w, h, '#e8f0ff', '#8a98b8'); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.fillStyle = '#141420'; g.fillRect(x + 6 + c * 30, y + 16 + r * 26, 26, 20); g.fillStyle = pickOf(['#3a8aff', '#ff4fa8', '#3ff0ff', '#7aff8a', '#ffd040']); g.fillRect(x + 8 + c * 30, y + 18 + r * 26, 22, 16); } g.fillStyle = '#c8ccd4'; g.fillRect(x + 6, y + 100, w - 12, 8); },   // électronique
  (g, x, y, w, h) => { room(g, x, y, w, h, '#fff4d0', '#8a1a1a'); g.fillStyle = '#6a0a14'; g.fillRect(x, y + 50, w, h - 50); for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 8 + k * 40, y + 56, 34, 30); for (let l = 0; l < 6; l++) { g.fillStyle = pickOf(['#ffd84a', '#ffe890', '#f2c230']); g.fillRect(x + 12 + k * 40 + (l % 3) * 10, y + 62 + Math.floor(l / 3) * 12, 7, 7); } } },   // bijouterie
  (g, x, y, w, h) => { room(g, x, y, w, h, '#fff8e0', '#d8a86a'); for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) { g.fillStyle = '#e8b040'; g.beginPath(); g.arc(x + 14 + c * 16, y + 32 + r * 22, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd860'; g.beginPath(); g.arc(x + 14 + c * 16, y + 32 + r * 22, 3.5, 0, Math.PI * 2); g.fill(); } g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x + 6, y + 96, w - 12, 20); },   // boulangerie (tartelettes)
  (g, x, y, w, h) => { room(g, x, y, w, h, '#ffe0c8', '#a8302a'); for (let k = 0; k < 3; k++) { g.fillStyle = '#ff3a3a'; g.beginPath(); g.ellipse(x + 22 + k * 42, y + 20, 9, 11, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd040'; g.fillRect(x + 20 + k * 42, y + 30, 4, 6); } for (let k = 0; k < 2; k++) { g.fillStyle = '#f4f0e8'; g.beginPath(); g.ellipse(x + 36 + k * 56, y + 96, 24, 8, 0, 0, Math.PI * 2); g.fill(); } person(g, x + 30, y + 64, 'rgba(60,30,30,0.8)'); person(g, x + 100, y + 66, 'rgba(30,30,60,0.8)'); },   // restaurant de dim sum
  (g, x, y, w, h) => { room(g, x, y, w, h, '#ffffff', '#d8e0e8'); for (let k = 0; k < 3; k++) { g.fillStyle = '#e8f4ff'; g.fillRect(x + 6 + k * 40, y + 14, 36, 70); g.strokeStyle = '#8a98a8'; g.strokeRect(x + 6 + k * 40, y + 14, 36, 70); for (let l = 0; l < 4; l++) for (let m = 0; m < 4; m++) { g.fillStyle = pickOf(['#e8302a', '#3ac87a', '#2a7ad8', '#ffd040', '#ff8ab0']); g.fillRect(x + 9 + k * 40 + m * 8, y + 18 + l * 16, 6, 10); } } shelves(g, x, y + 70, w, 58, 2, 10, ['#e8302a', '#ffd040', '#3ac87a', '#ff8a3a'], 4); },   // supérette 24 h
];

// ---------- Sol ----------
// Chaussée et trottoirs : photos de Poly Haven (models/hongkong/LICENSE.txt) préparées pour la nuit. Asphalte
// fissuré (road.jpg, 3 m par répétition), petits carreaux du trottoir (sidewalk.jpg, 2,4 m).
function photoTex(name) {
  const t = new THREE.TextureLoader().load(new URL('../../../models/hongkong/' + name, import.meta.url).href);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
export const wetAsphalt = () => photoTex('road.jpg');
export const sidewalkTiles = () => photoTex('sidewalk.jpg');
// marquage au sol : bandes jaunes et blanches à la hongkongaise (fond transparent)
export const laneWear = () => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (const cx of [0.26 * w, 0.74 * w]) {
    const grd = g.createLinearGradient(cx - 10, 0, cx + 10, 0);
    grd.addColorStop(0, 'rgba(10,10,20,0)'); grd.addColorStop(0.5, 'rgba(10,10,20,0.35)'); grd.addColorStop(1, 'rgba(10,10,20,0)');
    g.fillStyle = grd; g.fillRect(cx - 10, 0, 20, h);
  }
});
export const roadLines = () => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  // lignes de séparation des voies (en tirets blancs) et bordures jaunes continues
  for (const x of [w * (1.3 / 9 + 0.5) - 1, w * (0.5 - 1.3 / 9) - 1]) { g.fillStyle = 'rgba(240,240,250,0.85)'; g.fillRect(x, 0, 3, h * 0.55); }
  for (const x of [3, w - 6]) { g.fillStyle = 'rgba(255,210,40,0.9)'; g.fillRect(x, 0, 3, h); }
}, true);
