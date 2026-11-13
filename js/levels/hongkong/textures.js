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

// ---------- Atlas du décor (1024 × 1024) ----------
const A = 1024;
export const REG = {
  facadeA: [0, 0, 256, 512], facadeB: [256, 0, 256, 512], facadeC: [512, 0, 256, 512],
  neonV0: [768, 0, 64, 256], neonV1: [832, 0, 64, 256], neonV2: [896, 0, 64, 256], neonV3: [960, 0, 64, 256],
  neonH0: [768, 256, 256, 96], neonH1: [768, 352, 256, 96], plain: [768, 448, 64, 64], menu: [832, 448, 64, 64],
  tarp: [896, 448, 128, 64],
  shops: [0, 512, 512, 128], shutters: [0, 640, 512, 128],
  neonH2: [512, 512, 256, 96], neonH3: [512, 608, 256, 96], neonH4: [768, 512, 256, 96], neonH5: [768, 608, 256, 96],
  water: [512, 704, 256, 256], windows: [768, 704, 256, 256], skyline: [0, 768, 512, 256],
};
const INSET = 2;
export const uv = (name) => {
  const [x, y, w, h] = REG[name];
  return [(x + INSET) / A, 1 - (y + h - INSET) / A, (x + w - INSET) / A, 1 - (y + INSET) / A];
};
export const PLAIN_UV = (() => { const [x, y, w, h] = REG.plain; return [(x + w / 2) / A, 1 - (y + h / 2) / A]; })();

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

export const decorAtlas = () => canvasTex(A, A, (g) => {
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
});

// ---------- Sol ----------
// chaussée mouillée : bitume sombre, flaques qui reflètent les néons
export const wetAsphalt = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#2a2a36'; g.fillRect(0, 0, w, h);
  speckle(g, 0, 0, w, h, 2600, ['#24242e', '#32323e', '#2e2e3a', '#3a3a48'], 2);
  for (let i = 0; i < 9; i++) {
    const col = pickOf(['255,80,170', '60,230,255', '255,220,90', '170,110,255']);
    const px = rnd(0, w), py = rnd(0, h), pw = rnd(14, 40), ph = rnd(30, 70);
    const grd = g.createLinearGradient(px, py, px, py + ph);
    grd.addColorStop(0, `rgba(${col},0)`); grd.addColorStop(0.5, `rgba(${col},0.35)`); grd.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grd; g.fillRect(px, py, pw, ph);
  }
});
// trottoir de dalles carrées sous la lumière des vitrines
export const sidewalkTiles = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a3846'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const v = rnd(-8, 8);
    g.fillStyle = `rgb(${92 + v},${88 + v},${104 + v})`;
    g.fillRect(c * 32 + 1, r * 32 + 1, 30, 30);
  }
});
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
