import * as THREE from 'three';
import { Builder, U, vcMat, pick } from '../../geo.js';
import { TRAIN_HALF_W, TRAIN_TOP, CAR_LEN, CAR_GAP, RAMP_LEN } from '../../config.js';

// Véhicules de Paris 1900 : omnibus à impériale et calèches garés (on peut courir sur le toit),
// fiacres attelés qui arrivent vers le joueur. Même principe que les trains : une texture unique par
// livrée (atlas) + détails fusionnés, pour 2 appels de dessin par véhicule.

const W = TRAIN_HALF_W * 2;
const Y0 = 0.55, Y1 = 2.45;          // caisse (le plancher de l'impériale est à TRAIN_TOP)
const H = Y1 - Y0;
const BALL = new THREE.SphereGeometry(1, 10, 8);

const LIVERIES = [
  { body: '#2c5a3a', panel: '#e8dcb8', line: '#d8b04a', ad: ['#c8302a', '#f2d24a'], name: 'MADELEINE · BASTILLE' },
  { body: '#7a2232', panel: '#efe2c4', line: '#d8b04a', ad: ['#2c4a8a', '#f4ecd8'], name: 'ÉTOILE · PALAIS-ROYAL' },
  { body: '#d8a830', panel: '#f4ecd8', line: '#5a3a1a', ad: ['#2c5a3a', '#c8302a'], name: 'MONTMARTRE · ODÉON' },
];
const FIACRE = { body: '#1c1a1e', panel: '#2a2730', line: '#d8b04a', ad: ['#d8b04a', '#1c1a1e'], name: 'FIACRE', lit: true };

// ---------- Atlas : côté (moitié haute), avant, arrière ----------
const REG = { side: [0, 0.5, 1, 1], front: [0, 0, 0.25, 0.5], end: [0.25, 0, 0.5, 0.5], plain: [0.6, 0.2, 0.62, 0.22] };

function roundTop(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x, y + h); g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y); g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h);
  g.closePath();
}
// fenêtre : cadre en bois verni, vitre sombre, rideaux noués, parfois un voyageur, reflet
function glass(g, x, y, w, h, l, seed = 0) {
  g.fillStyle = '#3a2618';
  roundTop(g, x - 6, y - 6, w + 12, h + 12, 14);
  g.fill();
  g.strokeStyle = l.line; g.lineWidth = 2;
  roundTop(g, x - 3, y - 3, w + 6, h + 6, 12);
  g.stroke();
  const grd = g.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, '#4a5a66'); grd.addColorStop(1, '#1c242c');
  g.fillStyle = grd;
  roundTop(g, x, y, w, h, 10);
  g.fill();
  // voyageur en silhouette (chapeau haut-de-forme ou capeline à fleurs)
  if (seed % 3 !== 2) {
    const px = x + w * (0.4 + 0.2 * ((seed * 7) % 3) / 2), py = y + h;
    g.fillStyle = seed % 2 ? '#2a2026' : '#3a2a3a';
    g.beginPath(); g.ellipse(px, py, w * 0.26, h * 0.34, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#e8c4a8';
    g.beginPath(); g.arc(px, py - h * 0.44, w * 0.12, 0, Math.PI * 2); g.fill();
    if (seed % 2) { g.fillStyle = '#141014'; g.fillRect(px - w * 0.1, py - h * 0.8, w * 0.2, h * 0.24); g.fillRect(px - w * 0.17, py - h * 0.57, w * 0.34, 4); }
    else {
      g.fillStyle = ['#c84a6a', '#6a4ab8', '#e8a040'][seed % 3];
      g.beginPath(); g.ellipse(px, py - h * 0.54, w * 0.26, h * 0.06, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f4e0ec'; g.beginPath(); g.arc(px + w * 0.12, py - h * 0.58, 4, 0, Math.PI * 2); g.fill();
    }
  }
  // rideaux crème noués de chaque côté
  for (const sx of [0, 1]) {
    const cx = x + (sx ? w : 0), d = sx ? -1 : 1;
    g.fillStyle = '#f2e6c8';
    g.beginPath();
    g.moveTo(cx, y + 4);
    g.lineTo(cx + d * w * 0.3, y + 4);
    g.quadraticCurveTo(cx + d * w * 0.08, y + h * 0.5, cx + d * w * 0.16, y + h);
    g.lineTo(cx, y + h);
    g.closePath(); g.fill();
    g.fillStyle = '#c8302a'; g.fillRect(cx + d * w * 0.04 - (sx ? 8 : 0), y + h * 0.48, 8, 5);
  }
  g.fillStyle = 'rgba(255,240,210,0.2)';
  g.beginPath(); g.moveTo(x + w * 0.55, y + 4); g.lineTo(x + w * 0.72, y + 4); g.lineTo(x + w * 0.4, y + h); g.lineTo(x + w * 0.24, y + h); g.fill();
}
// volute dorée (ornement d'angle)
function scroll(g, x, y, s, flip, col) {
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
  g.strokeStyle = col; g.lineWidth = 2.4 / s;
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(14, -2, 22, 8, 16, 14); g.bezierCurveTo(10, 18, 6, 10, 12, 8); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-2, 14, 8, 22, 14, 16); g.stroke();
  g.restore();
}
// blason de la Ville de Paris (nef sur fond rouge, chef d'azur fleurdelisé)
function crest(g, x, y, r) {
  g.fillStyle = '#d8b04a';
  g.beginPath(); g.moveTo(x - r - 3, y - r - 3); g.lineTo(x + r + 3, y - r - 3); g.lineTo(x + r + 3, y + 2); g.quadraticCurveTo(x + r, y + r + 6, x, y + r * 1.4 + 3); g.quadraticCurveTo(x - r, y + r + 6, x - r - 3, y + 2); g.fill();
  g.fillStyle = '#c8302a';
  g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y - r); g.lineTo(x + r, y); g.quadraticCurveTo(x + r, y + r + 2, x, y + r * 1.4); g.quadraticCurveTo(x - r, y + r + 2, x - r, y); g.fill();
  g.fillStyle = '#2c4a8a'; g.fillRect(x - r, y - r, r * 2, r * 0.6);
  g.fillStyle = '#f2d24a';
  for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.arc(x + k * r, y - r * 0.7, 2.5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#f4ecd8';
  g.beginPath(); g.moveTo(x - r * 0.6, y + r * 0.1); g.lineTo(x + r * 0.6, y + r * 0.1); g.lineTo(x + r * 0.4, y + r * 0.45); g.lineTo(x - r * 0.4, y + r * 0.45); g.fill();
  g.fillRect(x - 1.5, y - r * 0.3, 3, r * 0.42);
  g.beginPath(); g.moveTo(x + 2, y - r * 0.28); g.lineTo(x + r * 0.45, y + r * 0.05); g.lineTo(x + 2, y + r * 0.05); g.fill();
}

function drawAtlas(l) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  // côté : caisse vernie, rangée de fenêtres, bandeau de destination, panneau bas armorié
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, l.body); bg.addColorStop(0.55, l.body); bg.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = l.body; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 4, 1024, 6);   // reflet du vernis
  if (l.lit) {
    // fiacre : deux portières à fenêtre, lanterne peinte, monogramme doré
    for (const [x0, w] of [[90, 330], [604, 330]]) {
      g.strokeStyle = l.line; g.lineWidth = 3;
      roundTop(g, x0, 18, w, 222, 22); g.stroke();
      glass(g, x0 + 40, 34, w - 80, 104, l, x0 > 300 ? 1 : 4);
      g.strokeStyle = l.line; g.lineWidth = 2;
      g.strokeRect(x0 + 24, 156, w - 48, 70);
      scroll(g, x0 + 30, 162, 1.2, false, l.line); scroll(g, x0 + w - 30, 162, 1.2, true, l.line);
      g.fillStyle = l.line; g.font = 'italic bold 40px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('F', x0 + w / 2, 192);
      g.fillRect(x0 + w - 40, 150, 22, 6);   // poignée
    }
    g.fillStyle = '#2a2730'; g.fillRect(470, 20, 84, 220);
    g.fillStyle = '#fff2b0'; g.fillRect(492, 60, 40, 60);
    g.strokeStyle = l.line; g.strokeRect(492, 60, 40, 60);
  } else {
    for (let i = 0; i < 8; i++) glass(g, 40 + i * 122, 30, 96, 100, l, i);
    g.strokeStyle = l.line; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 16); g.lineTo(1024, 16); g.moveTo(0, 144); g.lineTo(1024, 144); g.stroke();
    // bandeau crème avec la ligne
    g.fillStyle = l.panel; g.fillRect(0, 150, 1024, 46);
    g.strokeStyle = l.line; g.lineWidth = 3; g.strokeRect(10, 154, 1004, 38);
    g.fillStyle = l.body; g.font = 'bold 30px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(l.name, 512, 174);
    // panneaux bas moulurés avec volutes et blason au centre
    for (let i = 0; i < 4; i++) {
      const x0 = 14 + i * 252;
      g.strokeStyle = l.line; g.lineWidth = 2;
      g.strokeRect(x0, 202, 240, 44);
      scroll(g, x0 + 6, 206, 1, false, l.line); scroll(g, x0 + 234, 206, 1, true, l.line);
    }
    crest(g, 512, 222, 14);
    g.fillStyle = l.line; g.font = 'bold 15px serif';
    g.fillText('COMPAGNIE GÉNÉRALE DES OMNIBUS', 256, 226);
    g.fillText('N° ' + (100 + l.name.length * 7), 790, 226);
  }
  // rivets dorés le long des arêtes
  g.fillStyle = l.line;
  for (let x = 8; x < 1024; x += 24) { g.fillRect(x, 1, 4, 4); g.fillRect(x, 250, 4, 4); }

  // avant : grande vitre encadrée, plaque de destination, lanternes peintes
  const F = 256;
  g.fillStyle = l.body; g.fillRect(0, F, F, F);
  glass(g, 46, F + 28, 164, 104, l, 1);
  g.fillStyle = l.panel; g.fillRect(20, F + 156, 216, 64);
  g.strokeStyle = l.line; g.lineWidth = 3; g.strokeRect(24, F + 160, 208, 56);
  scroll(g, 30, F + 166, 1, false, l.line); scroll(g, 226, F + 166, 1, true, l.line);
  if (l.lit) { g.fillStyle = l.line; g.font = 'bold 34px serif'; g.textAlign = 'center'; g.fillText('★', 128, F + 189); }
  else crest(g, 128, F + 186, 13);
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, F + 232, F, 24);
  // arrière : petite vitre, plaque, feux rouges
  g.fillStyle = l.body; g.fillRect(256, F, F, F);
  glass(g, 330, F + 30, 108, 96, l, 5);
  g.fillStyle = l.panel; g.fillRect(276, F + 156, 216, 64);
  g.strokeStyle = l.line; g.strokeRect(280, F + 160, 208, 56);
  g.fillStyle = l.body; g.font = 'bold 26px serif'; g.textAlign = 'center';
  g.fillText(l.lit ? 'PARIS' : 'COMPLET', 384, F + 189);
  g.fillStyle = '#e83a2a';
  g.beginPath(); g.arc(296, F + 232, 9, 0, Math.PI * 2); g.arc(472, F + 232, 9, 0, Math.PI * 2); g.fill();
  // aplat
  g.fillStyle = l.body; g.fillRect(560, 340, 100, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function atlasBox(regions) {
  const g = new THREE.BoxGeometry(W, H, CAR_LEN - 0.4);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const [u0, v0, u1, v1] = regions[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
  }
  g.clearGroups();
  g.translate(0, Y0 + H / 2, -CAR_LEN / 2);
  return g;
}

// roue à rayons
function wheel(b, x, z, r, col) {
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.add(U.box, '#1a1a1c', [x, r + Math.sin(a) * r, z + Math.cos(a) * r], [0.08, 0.07, (Math.PI * 2 * r) / n + 0.02], [Math.PI / 2 - a, 0, 0]);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    b.add(U.box, col, [x, r, z], [0.04, r * 1.9, 0.035], [a, 0, 0]);
  }
  for (let i = 0; i < n; i++) {   // jante intérieure dorée
    const a = (i / n) * Math.PI * 2, rr = r * 0.86;
    b.add(U.box, col, [x, r + Math.sin(a) * rr, z + Math.cos(a) * rr], [0.06, 0.03, (Math.PI * 2 * rr) / n + 0.01], [Math.PI / 2 - a, 0, 0]);
  }
  b.add(U.cyl, col, [x, r, z], [0.13, 0.12, 0.13], [0, 0, Math.PI / 2]);
  b.add(U.cyl, '#1a1a1c', [x + Math.sign(x) * 0.08, r, z], [0.07, 0.08, 0.07], [0, 0, Math.PI / 2]);
}

// ressort à lames (demi-ellipse) au-dessus d'un essieu
function spring(b, x, y, z) {
  for (let k = 0; k < 4; k++) {
    const w = 0.9 - k * 0.18;
    b.add(U.box, '#1a1a1c', [x, y - k * 0.035, z], [0.08, 0.03, w]);
  }
  b.add(U.box, '#2a2522', [x, y - 0.18, z], [0.07, 0.24, 0.07]);
}

// détails fusionnés d'une voiture : impériale à garde-corps et réclames, roues, marchepied, cocher
function detailGeo(lead, l) {
  const b = new Builder();
  const zc = -CAR_LEN / 2, L = CAR_LEN - 0.4;
  // plancher de l'impériale et garde-corps en fer forgé
  b.add(U.box, '#4a3a2c', [0, TRAIN_TOP - 0.07, zc], [W + 0.06, 0.14, L]);
  for (const sx of [-1, 1]) {
    b.add(U.box, '#1a1a1c', [sx * (W / 2 - 0.02), TRAIN_TOP + 0.38, zc], [0.04, 0.04, L]);
    for (let i = 0; i <= 16; i++) b.add(U.box, '#1a1a1c', [sx * (W / 2 - 0.02), TRAIN_TOP + 0.19, zc - L / 2 + (i * L) / 16], [0.03, 0.38, 0.03]);
    // panneaux publicitaires sur le garde-corps
    for (let k = 0; k < 3; k++) {
      b.add(U.box, l.ad[k % 2], [sx * (W / 2 + 0.005), TRAIN_TOP + 0.2, zc - L / 3 + (k * L) / 3], [0.02, 0.3, L / 3 - 0.3]);
      b.add(U.box, l.ad[(k + 1) % 2], [sx * (W / 2 + 0.012), TRAIN_TOP + 0.2, zc - L / 3 + (k * L) / 3], [0.01, 0.08, L / 3 - 0.8]);
    }
  }
  // corniche dorée et filets
  for (const sx of [-1, 1]) b.add(U.box, l.line, [sx * (W / 2 + 0.01), Y1 - 0.06, zc], [0.03, 0.05, L]);
  // roues : petites devant, grandes derrière
  for (const sx of [-1, 1]) {
    wheel(b, sx * (W / 2 + 0.06), zc + L / 2 - 1.3, 0.55, l.line);
    wheel(b, sx * (W / 2 + 0.06), zc - L / 2 + 1.4, 0.7, l.line);
  }
  b.add(U.box, '#2a2522', [0, 0.45, zc], [W - 0.5, 0.18, L - 1]);   // châssis
  // marchepied et escalier arrière vers l'impériale
  b.add(U.box, '#2a2522', [0, 0.35, zc - L / 2 - 0.2], [1.0, 0.06, 0.4]);
  for (let i = 0; i < 5; i++) b.add(U.box, '#3a2e26', [0.6, 0.7 + i * 0.4, zc - L / 2 - 0.12], [0.6, 0.05, 0.22]);
  // ressorts, essieux, garde-boue en arc au-dessus des roues
  for (const [zz, r] of [[zc + L / 2 - 1.3, 0.55], [zc - L / 2 + 1.4, 0.7]]) {
    b.add(U.cyl6, '#1a1a1c', [0, r, zz], [0.06, W + 0.1, 0.06], [0, 0, Math.PI / 2]);
    for (const sx of [-1, 1]) {
      spring(b, sx * (W / 2 - 0.25), r + 0.2, zz);
      for (let i = 0; i <= 6; i++) {
        const a = -1.2 + (i / 6) * 2.4, rr = r + 0.12;
        b.add(U.box, '#1c1a1e', [sx * (W / 2 + 0.06), r + Math.cos(a) * rr, zz + Math.sin(a) * rr], [0.2, 0.025, 0.24], [a, 0, 0]);
      }
    }
  }
  // baguettes moulurées et lampes d'angle sous la corniche
  for (const sx of [-1, 1]) {
    b.add(U.box, l.line, [sx * (W / 2 + 0.01), Y0 + 0.04, zc], [0.03, 0.04, L]);
    for (const zz of [zc + L / 2 - 0.05, zc - L / 2 + 0.05]) b.add(U.box, l.line, [sx * (W / 2 + 0.01), (Y0 + Y1) / 2, zz], [0.04, H, 0.05]);
  }
  // plateforme arrière à rampe et receveur en képi
  b.add(U.box, '#1a1a1c', [-0.7, 1.15, zc - L / 2 - 0.35], [0.04, 1.1, 0.04]);
  b.add(U.box, '#1a1a1c', [-0.7, 1.7, zc - L / 2 - 0.2], [0.04, 0.04, 0.32]);
  if (!l.lit) {
    const cz = zc - L / 2 - 0.25;
    b.add(U.box, '#2c3a5a', [-0.25, 0.85, cz], [0.32, 0.6, 0.22]);
    b.add(BALL, '#f2d2b8', [-0.25, 1.32, cz], [0.13, 0.14, 0.13]);
    b.add(U.cyl, '#2c3a5a', [-0.25, 1.46, cz], [0.13, 0.1, 0.13]);
    b.add(U.box, '#1a1a1c', [-0.25, 1.42, cz - 0.1], [0.24, 0.02, 0.08]);
    b.add(U.box, '#d8b04a', [-0.25, 0.95, cz - 0.12], [0.14, 0.12, 0.02]);   // sacoche à billets
  }
  if (lead) {
    if (!l.lit) {
      // tableau de destination sur le garde-corps avant de l'impériale
      b.add(U.box, '#1a1a1c', [0, TRAIN_TOP + 0.45, -0.05], [1.6, 0.42, 0.06]);
      b.add(U.box, l.panel, [0, TRAIN_TOP + 0.45, -0.01], [1.48, 0.3, 0.04]);
      b.add(U.box, l.body, [0, TRAIN_TOP + 0.45, 0.015], [1.1, 0.08, 0.02]);
      for (const sx of [-1, 1]) b.add(BALL, l.line, [sx * 0.8, TRAIN_TOP + 0.7, -0.05], [0.06, 0.06, 0.06]);
    }
    // siège du cocher et lanternes
    b.add(U.box, '#2a2522', [0, Y1 + 0.05, 0.15], [1.4, 0.12, 0.6]);
    b.add(U.box, '#2a2522', [0, Y1 - 0.4, 0.42], [1.2, 0.8, 0.08]);
    for (const sx of [-1, 1]) {
      b.add(U.box, '#1a1a1c', [sx * 1.0, 1.9, 0.1], [0.04, 0.4, 0.04]);
      b.add(U.box, l.lit ? '#fff2b0' : '#e8d8a0', [sx * 1.0, 2.15, 0.1], [0.16, 0.22, 0.16]);
      b.add(U.cone4, '#1a1a1c', [sx * 1.0, 2.33, 0.1], [0.14, 0.14, 0.14], [0, Math.PI / 4, 0]);
    }
  }
  return b.build();
}

// cocher en haut-de-forme (fiacre)
function coachman(b) {
  b.add(U.box, '#2a2a3a', [0, Y1 + 0.45, 0.15], [0.42, 0.55, 0.3]);
  b.add(BALL, '#f2d2b8', [0, Y1 + 0.9, 0.15], [0.16, 0.17, 0.16]);
  b.add(U.cyl, '#1a1a1c', [0, Y1 + 1.12, 0.15], [0.13, 0.26, 0.13]);
  b.add(U.cyl, '#1a1a1c', [0, Y1 + 0.99, 0.15], [0.22, 0.03, 0.22]);
  b.add(U.cyl6, '#5a3a20', [0.25, Y1 + 0.7, 0.6], [0.015, 1.1, 0.015], [-0.9, 0, 0]);   // fouet
}

// deux chevaux harnachés devant le fiacre (de z = 0 à z = +3.6)
function horses(b) {
  const coats = [['#f2ece2', '#d8cfc0'], ['#7a4a2a', '#4a2a18']];
  for (const sx of [-1, 1]) {
    const [c1, c2] = coats[sx < 0 ? 0 : 1];
    const x = sx * 0.45, z = 2.2;
    b.add(BALL, c1, [x, 1.25, z], [0.32, 0.38, 0.85]);                     // corps
    b.add(U.cyl, c1, [x, 1.6, z + 0.85], [0.13, 0.75, 0.16], [-0.7, 0, 0]);   // encolure
    b.add(BALL, c1, [x, 1.95, z + 1.2], [0.13, 0.15, 0.3], [0.5, 0, 0]);     // tête
    b.add(U.cone4, c1, [x + 0.06, 2.12, z + 1.05], [0.04, 0.12, 0.04]);
    b.add(U.cone4, c1, [x - 0.06, 2.12, z + 1.05], [0.04, 0.12, 0.04]);
    b.add(U.box, c2, [x, 1.75, z + 0.75], [0.06, 0.55, 0.12], [-0.7, 0, 0]);   // crinière
    b.add(U.cyl, c2, [x, 1.2, z - 0.9], [0.06, 0.5, 0.06], [0.5, 0, 0]);      // queue
    for (const [dx, dz] of [[-0.15, 0.5], [0.15, 0.5], [-0.15, -0.5], [0.15, -0.5]]) {
      b.add(U.cyl6, c1, [x + dx, 0.5, z + dz], [0.06, 1.0, 0.06]);
      b.add(U.cyl6, '#2a2522', [x + dx, 0.04, z + dz], [0.075, 0.08, 0.075]);
    }
    b.add(U.box, '#2a1a10', [x, 1.45, z + 0.1], [0.68, 0.08, 0.5]);   // harnais
    b.add(U.box, '#c8302a', [x, 1.62, z + 0.1], [0.5, 0.06, 0.3]);
    b.add(U.box, '#d8b04a', [x, 1.98, z + 1.22], [0.28, 0.04, 0.04]);
    // œillères, museau, panache, collier et rênes
    for (const s2 of [-1, 1]) b.add(U.box, '#1a1a1c', [x + s2 * 0.14, 2.0, z + 1.2], [0.02, 0.1, 0.12]);
    b.add(BALL, c2, [x, 1.86, z + 1.45], [0.1, 0.1, 0.12]);
    b.add(U.cone4, '#c8302a', [x, 2.25, z + 1.12], [0.06, 0.2, 0.06]);
    b.add(BALL, '#2a1a10', [x, 1.58, z + 0.62], [0.2, 0.24, 0.12], [-0.6, 0, 0]);
    b.add(U.box, '#2a1a10', [x, 1.55, z + 0.1 - 0.9], [0.02, 0.02, 2.2], [0.25, 0, 0]);
    for (const [dx, dz] of [[-0.15, 0.5], [0.15, 0.5], [-0.15, -0.5], [0.15, -0.5]]) {
      b.add(BALL, c1, [x + dx, 0.82, z + dz], [0.09, 0.2, 0.1]);   // cuisse
      b.add(BALL, '#f4f0ea', [x + dx, 0.14, z + dz], [0.08, 0.06, 0.08]);   // balzane
    }
  }
  for (const sx of [-1, 1]) b.add(U.box, '#3a2a1c', [sx * 0.9, 1.1, 1.2], [0.05, 0.05, 2.4]);   // brancards
}

export function parisVehicleKit() {
  const make = (l, moving) => {
    const mat = new THREE.MeshLambertMaterial({ map: drawAtlas(l) });
    const R = REG;
    return {
      mat,
      leadBody: atlasBox([R.side, R.side, R.plain, R.plain, R.front, R.end]),
      midBody: atlasBox([R.side, R.side, R.plain, R.plain, R.end, R.end]),
      leadDetail: detailGeo(true, l),
      midDetail: detailGeo(false, l),
      team: moving ? (() => { const b = new Builder(); horses(b); coachman(b); return b.build(); })() : null,
    };
  };
  const liveries = LIVERIES.map((l) => make(l, false));
  const fiacre = make(FIACRE, true);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff4c8' });
  const glowGeo = new THREE.BoxGeometry(0.12, 0.16, 0.12);
  const bc = new Builder();
  bc.add(U.box, '#2a2522', [0, 0.9, 0], [0.3, 0.12, CAR_GAP + 0.6]);   // timon d'attelage entre deux voitures
  const connGeo = bc.build();

  function build(l, cars, moving) {
    const g = new THREE.Group();
    for (let i = 0; i < cars; i++) {
      const z0 = -i * (CAR_LEN + CAR_GAP);
      const body = new THREE.Mesh(i === 0 ? l.leadBody : l.midBody, l.mat);
      const det = new THREE.Mesh(i === 0 ? l.leadDetail : l.midDetail, vcMat);
      body.position.z = det.position.z = z0;
      g.add(body, det);
      if (i > 0) { const c = new THREE.Mesh(connGeo, vcMat); c.position.z = z0 + CAR_GAP / 2; g.add(c); }
    }
    if (moving && l.team) {
      g.add(new THREE.Mesh(l.team, vcMat));
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(glowGeo, glowMat);
        m.position.set(sx * 1.0, 2.15, 0.1);
        g.add(m);
      }
    }
    return g;
  }

  return {
    rampGeo: rampGeo(),
    low: lowBarriers(),
    highGeo: signGate(),
    // attelage de chevaux devant les fiacres qui arrivent : obstacle bas à sauter
    hitch: { len: 3.6, h: 1.75, halfW: 0.95 },
    buildVehicle: (cars, moving) => (moving ? build(fiacre, 1, true) : build(pick(liveries), cars, false)),
    warmup() {
      const g = new THREE.Group();
      [...liveries, fiacre].forEach((l, i) => { const m = build(l, 2, l === fiacre); m.position.x = i * 3; g.add(m); });
      return g;
    },
  };
}

// ---------- Rampe : planches posées sur des cageots ----------
function rampGeo() {
  const b = new Builder();
  const L = Math.hypot(RAMP_LEN, TRAIN_TOP), a = Math.atan2(TRAIN_TOP, RAMP_LEN);
  b.add(U.box, '#9a7a52', [0, TRAIN_TOP / 2, RAMP_LEN / 2], [2.0, 0.12, L], [a, 0, 0]);
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    b.add(U.box, '#7a5a38', [0, TRAIN_TOP * (1 - t) + 0.07, RAMP_LEN * t], [2.02, 0.04, 0.08], [a, 0, 0]);
  }
  // pile de cageots de fruits sous la rampe
  for (const t of [0.2, 0.45, 0.7]) {
    const h = TRAIN_TOP * (1 - t) - 0.1;
    const n = Math.max(1, Math.floor(h / 0.45));
    for (let k = 0; k < n; k++) {
      for (const x of [-0.6, 0.6]) {
        b.add(U.box, '#c8a46a', [x, 0.22 + k * 0.45, RAMP_LEN * t], [0.7, 0.42, 0.55]);
        b.add(U.box, pick(['#e8501c', '#f2c230', '#7ab83a', '#c8302a']), [x, 0.38 + k * 0.45, RAMP_LEN * t], [0.6, 0.12, 0.45]);
      }
    }
  }
  return b.build();
}

// ---------- Obstacles bas (à sauter) ----------
function lowBarriers() {
  const out = [];
  let b = new Builder();   // tonneaux de vin couchés
  for (const x of [-0.55, 0.55]) {
    b.add(U.cyl, '#8a5a32', [x, 0.42, 0], [0.4, 0.9, 0.4], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, '#a06a3a', [x, 0.42, 0], [0.44, 0.5, 0.44], [Math.PI / 2, 0, 0]);
    for (const z of [-0.36, -0.12, 0.12, 0.36]) b.add(U.cyl, '#2a2522', [x, 0.42, z], [0.45, 0.04, 0.45], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, '#6a4220', [x, 0.42, 0.46], [0.3, 0.02, 0.3], [Math.PI / 2, 0, 0]);
  }
  out.push({ geo: b.build(), depth: 0.95, h: 1.0 });

  b = new Builder();   // cageots de fruits empilés
  for (const x of [-0.6, 0, 0.6]) {
    const n = x === 0 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      b.add(U.box, '#c8a46a', [x, 0.22 + k * 0.45, 0], [0.56, 0.42, 0.6]);
      for (const y of [0.1, 0.3]) b.add(U.box, '#a8844a', [x, y + k * 0.45, 0.31], [0.56, 0.05, 0.02]);
      const fruit = pick(['#e8501c', '#f2c230', '#7ab83a', '#c8302a', '#7a3a8a']);
      for (let i = 0; i < 6; i++) b.add(BALL, fruit, [x + ((i % 3) - 1) * 0.16, 0.46 + k * 0.45, (Math.floor(i / 3) - 0.5) * 0.2], [0.08, 0.08, 0.08]);
    }
  }
  out.push({ geo: b.build(), depth: 0.6, h: 1.0 });

  b = new Builder();   // bidons de lait et caisse
  for (const x of [-0.7, -0.25]) {
    b.add(U.cyl, '#b8bec4', [x, 0.32, 0], [0.18, 0.64, 0.18]);
    b.add(U.cone8, '#b8bec4', [x, 0.72, 0], [0.18, 0.16, 0.18]);
    b.add(U.cyl, '#9aa0a6', [x, 0.86, 0], [0.08, 0.14, 0.08]);
    b.add(U.cyl, '#8a9096', [x, 0.4, 0], [0.19, 0.04, 0.19]);
  }
  b.add(U.box, '#8a6a42', [0.5, 0.35, 0], [0.9, 0.7, 0.7]);
  b.add(U.box, '#f4ecd8', [0.5, 0.42, 0.36], [0.5, 0.25, 0.02]);
  out.push({ geo: b.build(), depth: 0.7, h: 1.0 });
  return out;
}

// ---------- Obstacle haut (à passer en roulade) : enseigne suspendue entre deux réverbères ----------
function signGate() {
  const b = new Builder();
  for (const sx of [-1, 1]) {
    const x = sx * 1.2;
    b.add(U.cyl, '#2a3a30', [x, 0.12, 0], [0.16, 0.24, 0.16]);
    b.add(U.cyl, '#2f4a3a', [x, 1.5, 0], [0.07, 3.0, 0.07]);
    b.add(U.cyl, '#d8b04a', [x, 0.6, 0], [0.09, 0.06, 0.09]);
    b.add(U.box, '#fff0b8', [x, 3.12, 0], [0.22, 0.28, 0.22]);   // lanterne
    b.add(U.cone4, '#2f4a3a', [x, 3.34, 0], [0.2, 0.18, 0.2], [0, Math.PI / 4, 0]);
  }
  b.add(U.box, '#2f4a3a', [0, 2.82, 0], [2.5, 0.08, 0.08]);
  for (const sx of [-1, 1]) b.add(U.box, '#2a2522', [sx * 0.8, 2.6, 0], [0.02, 0.4, 0.02]);
  // grande enseigne : panneau bordeaux, cadre doré, lettres claires
  b.add(U.box, '#d8b04a', [0, 1.85, 0], [2.3, 1.0, 0.08]);
  b.add(U.box, '#6e1c2c', [0, 1.85, 0.01], [2.15, 0.85, 0.09]);
  for (let i = 0; i < 9; i++) b.add(U.box, '#f4e6c4', [-0.8 + i * 0.2, 1.9, 0.06], [0.1, 0.28, 0.01]);
  b.add(U.box, '#d8b04a', [0, 1.62, 0.06], [1.6, 0.03, 0.01]);
  // petit croissant doré en enseigne
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    b.add(BALL, '#e0a040', [Math.sin(a) * 0.22, 2.48 - Math.cos(a) * 0.08, 0.05], [0.09 - Math.abs(i - 2) * 0.015, 0.07, 0.05]);
  }
  return b.build();
}
