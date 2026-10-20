import * as THREE from 'three';

// Textures peintes de New York : chaussée, façades qui se répètent, panneaux de Times Square, égouts
const FONT = '"M PLUS Rounded 1c", "Arial Rounded MT Bold", sans-serif';

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
function speckle(g, w, h, n, cols, s = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

// ---------- Chaussée ----------
export const asphalt = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5a5c62';
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 2600, ['#4e5056', '#66686e', '#54565c', '#707278'], 2);
  // rapiéçages et fissures
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(40,42,46,0.25)';
    g.fillRect(rnd(0, w), rnd(0, h), rnd(30, 80), rnd(20, 60));
  }
  g.strokeStyle = 'rgba(30,30,34,0.55)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    let x = rnd(0, w), y = rnd(0, h);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rnd(-14, 14); y += rnd(6, 18); g.lineTo(x, y); }
    g.stroke();
  }
});

export const asphaltBed = () => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#56585e';
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1400, ['#4a4c52', '#62646a', '#505258', '#6c6e74'], 2);
});

// traces de pneus et taches d'huile au milieu de chaque voie (fond transparent)
export const laneWear = () => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (const cx of [0.24 * w, 0.76 * w]) {
    const grd = g.createLinearGradient(cx - 12, 0, cx + 12, 0);
    grd.addColorStop(0, 'rgba(30,30,34,0)');
    grd.addColorStop(0.5, 'rgba(30,30,34,0.35)');
    grd.addColorStop(1, 'rgba(30,30,34,0)');
    g.fillStyle = grd;
    g.fillRect(cx - 12, 0, 24, h);
  }
  const oil = g.createRadialGradient(w / 2, h * 0.4, 2, w / 2, h * 0.4, 22);
  oil.addColorStop(0, 'rgba(20,20,26,0.5)');
  oil.addColorStop(1, 'rgba(20,20,26,0)');
  g.fillStyle = oil;
  g.fillRect(0, 0, w, h);
});

// marquage : tirets blancs entre les voies (bande de 9 m de large, motif de 6 m)
export const roadLines = () => canvasTex(512, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const px = (x) => ((x + 4.5) / 9) * w;
  g.fillStyle = 'rgba(246,244,236,0.95)';
  for (const x of [-1.3, 1.3]) g.fillRect(px(x) - 4, h * 0.25, 8, h * 0.5);
  // bords de chaussée jaunes
  g.fillStyle = 'rgba(240,200,60,0.9)';
  for (const x of [-4.15, 4.15]) g.fillRect(px(x) - 3, 0, 6, h);
  // usure de la peinture
  g.globalCompositeOperation = 'destination-out';
  speckle(g, w, h, 500, ['rgba(0,0,0,0.6)'], 3);
  g.globalCompositeOperation = 'source-over';
});

// ---------- Façades qui se répètent (motif de TILE[k] mètres) ----------
export const TILE = {
  deco: [12, 14],    // pierre Art déco : 4 étages de 3,5 m, 4 travées
  glass: [12, 14],   // mur-rideau de verre
  brick: [9, 12],    // brique avec fenêtres à encadrement blanc
};

export const decoFacade = () => canvasTex(512, 512, (g, w, h) => {
  // pierre claire neutre (le bâtiment la teinte)
  g.fillStyle = '#e8e2d6';
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 1500, ['#ddd6c8', '#f0ebe0', '#d6cfc0'], 2);
  const bays = 4, floors = 4, bw = w / bays, fh = h / floors;
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const x = b * bw, y = f * fh;
      // piliers verticaux en saillie
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x, y, 10, fh);
      g.fillStyle = 'rgba(120,110,95,0.25)';
      g.fillRect(x + 10, y, 4, fh);
      // fenêtres jumelées
      for (const k of [0, 1]) {
        const wx = x + 26 + k * 46, wy = y + 22, ww = 38, wh = 76;
        const lit = Math.random() < 0.18;
        const grd = g.createLinearGradient(wx, wy, wx + ww, wy + wh);
        grd.addColorStop(0, lit ? '#ffe9a8' : '#4a6a8a');
        grd.addColorStop(1, lit ? '#f4c870' : '#22344a');
        g.fillStyle = grd;
        g.fillRect(wx, wy, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.beginPath(); g.moveTo(wx + 4, wy + wh); g.lineTo(wx + ww * 0.6, wy); g.lineTo(wx + ww * 0.8, wy); g.lineTo(wx + 12, wy + wh); g.fill();
        g.fillStyle = '#5a5248';
        g.fillRect(wx, wy + wh * 0.5, ww, 3);
        g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      }
      // allège sculptée (chevrons Art déco)
      g.strokeStyle = 'rgba(150,130,100,0.6)';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < 4; i++) { g.moveTo(x + 30 + i * 20, y + 112); g.lineTo(x + 40 + i * 20, y + 104); g.lineTo(x + 50 + i * 20, y + 112); }
      g.stroke();
    }
    g.fillStyle = 'rgba(140,125,100,0.35)';
    g.fillRect(0, f * fh, w, 3);
  }
});

export const glassFacade = () => canvasTex(512, 512, (g, w, h) => {
  const grd = g.createLinearGradient(0, h, w, 0);
  grd.addColorStop(0, '#7aa4c8');
  grd.addColorStop(0.45, '#bcd8ec');
  grd.addColorStop(0.55, '#e4f2fa');
  grd.addColorStop(1, '#88b0d0');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // reflets de nuages et vitres plus sombres au hasard
  for (let i = 0; i < 40; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(40,70,110,0.18)' : 'rgba(255,255,255,0.2)';
    g.fillRect(((Math.random() * 8) | 0) * 64, ((Math.random() * 8) | 0) * 64 + 8, 64, 56);
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = 'rgba(255,236,170,0.55)';   // quelques bureaux allumés
    g.fillRect(((Math.random() * 8) | 0) * 64 + 2, ((Math.random() * 4) | 0) * 128 + 10, 60, 50);
  }
  g.fillStyle = '#3c4a58';
  for (let x = 0; x <= w; x += 64) g.fillRect(x - 2, 0, 4, h);   // meneaux
  for (let y = 0; y <= h; y += 128) g.fillRect(0, y - 5, w, 10);   // planchers
  for (let y = 64; y < h; y += 128) g.fillRect(0, y - 1, w, 2);
});

export const brickFacade = () => canvasTex(512, 512, (g, w, h) => {
  // brique neutre claire (teintée en rouge, crème ou vert par le bâtiment)
  g.fillStyle = '#d8cfc8';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 10) {
    for (let x = (y / 10) % 2 ? -12 : 0; x < w; x += 24) {
      const v = 200 + Math.random() * 40;
      g.fillStyle = `rgb(${v},${v * 0.92},${v * 0.88})`;
      g.fillRect(x + 1, y + 1, 22, 8);
    }
  }
  // 3 travées × 4 étages de fenêtres à guillotine, encadrement blanc et linteau
  const bw = w / 3, fh = h / 4;
  for (let f = 0; f < 4; f++) {
    for (let b = 0; b < 3; b++) {
      const wx = b * bw + 44, wy = f * fh + 26, ww = 82, wh = 92;
      g.fillStyle = '#f4f0e8';
      g.fillRect(wx - 6, wy - 12, ww + 12, wh + 18);
      const lit = Math.random() < 0.2;
      g.fillStyle = lit ? '#ffe6a0' : '#34404c';
      g.fillRect(wx, wy, ww, wh);
      // stores à moitié baissés, plantes, rideaux
      g.fillStyle = ['#f2e6c8', '#e8d0b0', '#c8dce8', '#f4ecd8'][(Math.random() * 4) | 0];
      g.fillRect(wx, wy, ww, wh * rnd(0.15, 0.45));
      if (Math.random() < 0.3) { g.fillStyle = '#5a9a4a'; g.beginPath(); g.arc(wx + rnd(15, ww - 15), wy + wh - 8, 12, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f4f0e8';
      g.fillRect(wx, wy + wh / 2 - 3, ww, 6);
      g.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(wx + 6, wy + 6, 10, wh / 2 - 12);
      g.fillStyle = '#c8bcb0';
      g.fillRect(wx - 10, wy + wh + 6, ww + 20, 8);   // appui
    }
  }
});

// ---------- Panneaux lumineux de Times Square (atlas de 8 affiches) ----------
// rangée du haut : 4 affiches en hauteur ; rangée du bas : 4 affiches en largeur
export const ADS = {
  tall: [[0, 0.5, 0.25, 1], [0.25, 0.5, 0.5, 1], [0.5, 0.5, 0.75, 1], [0.75, 0.5, 1, 1]],
  wide: [[0, 0.25, 0.5, 0.5], [0.5, 0.25, 1, 0.5], [0, 0, 0.5, 0.25], [0.5, 0, 1, 0.25]],
};
function glowText(g, txt, x, y, size, col, glow, weight = 800) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = glow;
  g.shadowBlur = size * 0.35;
  g.fillStyle = col;
  g.fillText(txt, x, y);
  g.shadowBlur = 0;
}
function star(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
}
function heart(g, x, y, s, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.3, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  g.fill();
}
function frame(g, x, y, w, h, col) {
  g.strokeStyle = col;
  g.lineWidth = 8;
  g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  // ampoules du cadre
  g.fillStyle = '#fff6c8';
  for (let k = 12; k < w - 8; k += 22) { g.beginPath(); g.arc(x + k, y + 8, 3.5, 0, 7); g.arc(x + k, y + h - 8, 3.5, 0, 7); g.fill(); }
}

export const adsAtlas = () => canvasTex(1024, 1024, (g) => {
  const tall = (i, draw) => { g.save(); g.translate(i * 256, 0); draw(256, 512); g.restore(); };
  const wide = (i, draw) => { g.save(); g.translate((i % 2) * 512, 512 + Math.floor(i / 2) * 256); draw(512, 256); g.restore(); };
  const bg = (w, h, c1, c2) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  };
  // 1. comédie musicale « ONIMA »
  tall(0, (w, h) => {
    bg(w, h, '#2a0c3a', '#ff5aa0');
    for (let i = 0; i < 18; i++) star(g, rnd(10, w - 10), rnd(10, h * 0.6), rnd(3, 7), '#fff2a8');
    // silhouette de fille-chat
    g.fillStyle = '#1a0820';
    g.beginPath(); g.arc(w / 2, h * 0.5, 50, 0, 7); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 46, h * 0.47); g.lineTo(w / 2 - 40, h * 0.36); g.lineTo(w / 2 - 18, h * 0.43); g.fill();
    g.beginPath(); g.moveTo(w / 2 + 46, h * 0.47); g.lineTo(w / 2 + 40, h * 0.36); g.lineTo(w / 2 + 18, h * 0.43); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 60, h * 0.78); g.quadraticCurveTo(w / 2, h * 0.48, w / 2 + 60, h * 0.78); g.fill();
    glowText(g, 'ONIMA', w / 2, h * 0.16, 56, '#fff4d0', '#ff8ac0');
    glowText(g, 'THE MUSICAL', w / 2, h * 0.86, 26, '#ffffff', '#ff2a80');
    frame(g, 0, 0, w, h, '#ffd23f');
  });
  // 2. soda « MOCHI COLA »
  tall(1, (w, h) => {
    bg(w, h, '#e8202a', '#a8101a');
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(rnd(20, w - 20), rnd(h * 0.3, h * 0.9), rnd(6, 16), 0, 7); g.fill(); }
    // bouteille
    g.fillStyle = '#5a1810';
    g.beginPath(); g.roundRect(w / 2 - 34, h * 0.36, 68, 200, 24); g.fill();
    g.fillRect(w / 2 - 14, h * 0.27, 28, 50);
    g.fillStyle = '#ffffff';
    g.fillRect(w / 2 - 34, h * 0.5, 68, 40);
    glowText(g, 'MOCHI', w / 2, h * 0.1, 52, '#ffffff', '#ffb0b0');
    glowText(g, 'COLA', w / 2, h * 0.19, 40, '#ffffff', '#ffb0b0');
    glowText(g, 'pop!', w / 2, h * 0.54, 24, '#e8202a', 'rgba(0,0,0,0)');
  });
  // 3. « NEKO RAMEN »
  tall(2, (w, h) => {
    bg(w, h, '#ffd23f', '#ff9a2a');
    g.fillStyle = '#c8302a';
    g.beginPath(); g.arc(w / 2, h * 0.5, 80, 0, Math.PI); g.fill();
    g.fillStyle = '#fff4d8';
    g.fillRect(w / 2 - 80, h * 0.5 - 6, 160, 10);
    g.strokeStyle = '#f8e0a0'; g.lineWidth = 5;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w / 2 - 50 + i * 22, h * 0.5); g.bezierCurveTo(w / 2 - 60 + i * 22, h * 0.4, w / 2 - 30 + i * 22, h * 0.36, w / 2 - 40 + i * 22, h * 0.28); g.stroke(); }
    g.strokeStyle = '#6a3a1a'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(w / 2 + 30, h * 0.46); g.lineTo(w / 2 + 90, h * 0.3); g.moveTo(w / 2 + 46, h * 0.47); g.lineTo(w / 2 + 104, h * 0.32); g.stroke();
    glowText(g, 'NEKO', w / 2, h * 0.11, 56, '#c8302a', '#fff0a0');
    glowText(g, 'RAMEN', w / 2, h * 0.75, 50, '#ffffff', '#c8302a');
    glowText(g, '24 / 7', w / 2, h * 0.88, 30, '#6a3a1a', 'rgba(0,0,0,0)');
  });
  // 4. « I ♥ NY »
  tall(3, (w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    glowText(g, 'I', w / 2, h * 0.2, 120, '#141414', 'rgba(0,0,0,0)');
    heart(g, w / 2, h * 0.47, 62, '#e8202a');
    glowText(g, 'NY', w / 2, h * 0.78, 120, '#141414', 'rgba(0,0,0,0)');
  });
  // 5. « SUPER DONUT » (large)
  wide(0, (w, h) => {
    bg(w, h, '#7ad8f0', '#3aa8d8');
    g.fillStyle = '#e8b06a'; g.beginPath(); g.arc(120, h / 2, 82, 0, 7); g.fill();
    g.fillStyle = '#ff8ac0'; g.beginPath(); g.arc(120, h / 2 - 4, 72, 0, 7); g.fill();
    g.fillStyle = '#3aa8d8'; g.beginPath(); g.arc(120, h / 2, 26, 0, 7); g.fill();
    for (let i = 0; i < 22; i++) {
      const a = rnd(0, 7), r = rnd(34, 64);
      g.fillStyle = ['#ffffff', '#ffd23f', '#7ae0a0', '#a080ff'][i % 4];
      g.save(); g.translate(120 + Math.cos(a) * r, h / 2 - 4 + Math.sin(a) * r); g.rotate(rnd(0, 3)); g.fillRect(-7, -2, 14, 4); g.restore();
    }
    glowText(g, 'SUPER', 350, h * 0.33, 64, '#ffffff', '#ff4aa0');
    glowText(g, 'DONUT', 350, h * 0.67, 64, '#ffffff', '#ff4aa0');
  });
  // 6. théâtre « BROADWAY » (marquise à ampoules)
  wide(1, (w, h) => {
    bg(w, h, '#1a1030', '#3a1050');
    frame(g, 0, 0, w, h, '#ffd23f');
    glowText(g, 'BROADWAY', w / 2, h * 0.42, 78, '#ffe680', '#ffaa20');
    glowText(g, '★ TONIGHT ★', w / 2, h * 0.75, 34, '#ff8ac0', '#ff2a80');
  });
  // 7. « PANDA BANK »
  wide(2, (w, h) => {
    bg(w, h, '#1f3a70', '#0f2048');
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(90, h / 2, 64, 0, 7); g.fill();
    g.fillStyle = '#141414';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(90 + s * 46, h / 2 - 50, 22, 0, 7); g.fill(); g.beginPath(); g.ellipse(90 + s * 22, h / 2 - 4, 13, 17, s * 0.4, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(90 + s * 20, h / 2 - 8, 4, 0, 7); g.fill(); }
    g.fillStyle = '#141414'; g.beginPath(); g.ellipse(90, h / 2 + 18, 8, 5, 0, 0, 7); g.fill();
    glowText(g, 'PANDA', 320, h * 0.35, 66, '#ffffff', '#6ab0ff');
    glowText(g, 'BANK  $$$', 320, h * 0.7, 44, '#7ae0a0', '#20a060');
  });
  // 8. « STAR TV »
  wide(3, (w, h) => {
    bg(w, h, '#ff6a2a', '#ffb02a');
    for (let i = 0; i < 9; i++) star(g, rnd(20, w - 20), rnd(20, h - 20), rnd(8, 20), 'rgba(255,255,255,0.5)');
    glowText(g, 'STAR TV', w / 2, h * 0.45, 92, '#ffffff', '#c8302a');
    glowText(g, 'ch. 7', w / 2, h * 0.8, 30, '#5a1a0a', 'rgba(0,0,0,0)');
  });
}, false);

// bandeau d'actualités lumineux qui défile (motif répété en largeur)
export const tickerTexture = () => {
  const t = canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = '#100808';
    g.fillRect(0, 0, w, h);
    g.font = `800 40px ${FONT}`;
    g.textBaseline = 'middle';
    g.shadowColor = '#ff8a20';
    g.shadowBlur = 10;
    g.fillStyle = '#ffb040';
    g.fillText('★ BIG APPLE NEWS : ONIMA RUNS IN NEW YORK  ★  DOW +100  ', 10, h / 2 + 2);
  });
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};

// ---------- Égouts ----------
export const sewerBrick = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a2e28';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
      const v = 70 + Math.random() * 40;
      g.fillStyle = `rgb(${v * 1.15 | 0},${v * 0.82 | 0},${v * 0.65 | 0})`;
      g.fillRect(x + 1.5, y + 1.5, 29, 13);
    }
  }
  // humidité verdâtre et coulures
  for (let i = 0; i < 10; i++) {
    const x = rnd(0, w), grd = g.createLinearGradient(0, rnd(0, h * 0.5), 0, h);
    grd.addColorStop(0, 'rgba(60,90,40,0)');
    grd.addColorStop(1, 'rgba(60,90,40,0.45)');
    g.fillStyle = grd;
    g.fillRect(x, 0, rnd(4, 12), h);
  }
  speckle(g, w, h, 400, ['rgba(20,16,14,0.5)', 'rgba(110,140,70,0.35)'], 2);
});

export const sewerSlabs = () => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#4c4a44';
  g.fillRect(0, 0, w, h);
  speckle(g, w, h, 900, ['#44423c', '#56544e', '#3e3c36', '#5c5a52'], 2);
  g.strokeStyle = '#2c2a26';
  g.lineWidth = 3;
  g.strokeRect(1, 1, w - 2, h - 2);
  g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  g.fillStyle = 'rgba(90,120,60,0.3)';
  g.fillRect(0, h - 10, w, 10);
});

// boue verdâtre et brune qui coule vers le joueur, avec bulles et écume
export const sludgeTexture = () => canvasTex(256, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#4a5a1e');
  grd.addColorStop(0.5, '#6a6a22');
  grd.addColorStop(1, '#4a5a1e');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = ['rgba(90,60,20,0.5)', 'rgba(120,150,40,0.45)', 'rgba(60,40,16,0.5)'][i % 3];
    g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(6, 22), rnd(3, 8), rnd(-0.3, 0.3), 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(190,210,120,0.55)';
  g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(2, 6), 0, 7); g.stroke(); }
});
