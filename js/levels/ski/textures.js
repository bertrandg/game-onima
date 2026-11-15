import * as THREE from 'three';

// Textures de la piste dessinées au chargement (aucun fichier à télécharger)
function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// petites taches de neige plus claires ou plus bleutées
function speckle(g, w, h, n, cols, r0, r1) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, r0 + Math.random() * (r1 - r0), 0, Math.PI * 2);
    g.fill();
  }
}

// Velours de dameuse : fines rainures dans le sens de la pente (la texture fait 2 m de large et 4 m de long),
// avec les bandes de passage de la dameuse et quelques traces de skis qui serpentent
export function corduroy() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#eef3fa';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 500, ['rgba(220,230,246,0.5)', 'rgba(255,255,255,0.7)', 'rgba(205,218,240,0.35)'], 0.8, 3);
    // rainures régulières
    for (let x = 0; x < w; x += 4) {
      g.fillStyle = 'rgba(176,192,222,0.32)';
      g.fillRect(x, 0, 1.4, h);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(x + 2, 0, 1, h);
    }
    // joint entre deux passages de dameuse
    g.fillStyle = 'rgba(160,178,212,0.35)';
    g.fillRect(0, 0, 2, h);
    // traces de skis (courbes douces, raccord vertical)
    for (let k = 0; k < 3; k++) {
      const x0 = 30 + Math.random() * 190, a = 10 + Math.random() * 30, ph = Math.random() * 6.28;
      for (const dx of [0, 7]) {
        g.strokeStyle = 'rgba(170,186,216,0.28)';
        g.lineWidth = 2;
        g.beginPath();
        for (let y = 0; y <= h; y += 8) {
          const x = x0 + dx + Math.sin((y / h) * Math.PI * 2 + ph) * a;
          if (y) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
    }
  });
}

// Poudreuse hors-piste : neige vierge douce, ombres bleutées, cristaux qui scintillent
export function powder() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f7fc';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 30;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const c = Math.random() < 0.5 ? '210,222,244' : '255,255,255';
      grd.addColorStop(0, `rgba(${c},0.45)`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
    }
    speckle(g, w, h, 140, ['#ffffff', '#dfe8f8', '#e8f2ff'], 0.5, 1.4);
  });
}

// Trace laissée par les skis : sillon bleuté, bords plus clairs (neige repoussée)
export function trailTex() {
  return canvasTex(32, 8, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.15, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.3, 'rgba(150,170,210,0.9)');
    grd.addColorStop(0.7, 'rgba(160,180,220,0.9)');
    grd.addColorStop(0.85, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

// Bouffée de neige soulevée (projections des skis)
export function puffTex() {
  return canvasTex(64, 64, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.45, 'rgba(250,252,255,0.75)');
    grd.addColorStop(1, 'rgba(240,246,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, w);
  }, { repeat: false });
}

// Flocon (neige qui tombe)
export function flakeTex() {
  return canvasTex(32, 32, (g) => {
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 15);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 32);
  }, { repeat: false });
}

// Panneau de texte (banderoles, panneaux de piste)
export function labelTex(lines, { w = 512, h = 128, bg = '#ffffff', fg = '#1a2a4a', font = 'bold 64px sans-serif', border = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const L = [].concat(lines);
    L.forEach((t, i) => g.fillText(t, w / 2, (h * (i + 0.5)) / L.length));
  }, { repeat: false });
}
