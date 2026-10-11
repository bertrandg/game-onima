import * as THREE from 'three';
import { Builder, U, vcMat } from './geo.js';
import { TRAIN_HALF_W, CAR_LEN, CAR_GAP } from './config.js';

// Tramways rétro façon Randen (Kyoto) : caisse vernie, filets crème à volutes, toit arrondi,
// phare sur le toit, face à trois vitres avec girouette, emblème rond et plaque de numéro dorée.
// Pour rester fluide : toutes les faces peintes de la caisse sont dans UNE texture (atlas)
// et tous les détails 3D sont fusionnés : 2 appels de dessin par voiture.

const W = TRAIN_HALF_W * 2;          // largeur de caisse
const BODY_Y0 = 0.35, BODY_Y1 = 2.4; // bas et haut de la caisse (le toit arrondi monte à 2.6)
const BODY_H = BODY_Y1 - BODY_Y0;

export const LIVERIES = [
  { name: 'randen', body: '#4a1d1a', body2: '#6b2b25', line: '#ecdcb8', stripe: '#ee8a2c', number: '27', dest: '嵐山' },
  { name: 'midori', body: '#24503a', body2: '#336b4e', line: '#ecdcb8', stripe: '#ee8a2c', number: '12', dest: '北野' },
  { name: 'ai', body: '#1f3157', body2: '#2c4677', line: '#ecdcb8', stripe: '#e7b440', number: '8', dest: '嵯峨' },
];
// les trains qui roulent vers le joueur : crème et rouge, phares allumés
export const EXPRESS = { name: 'express', body: '#efe2c4', body2: '#fff4dc', line: '#8a2420', stripe: '#c4302a', number: '1', dest: '特急', lit: true };

// ---------- Atlas : côté (moitié haute), face avant, face arrière, aplat ----------
const AW = 1024, AH = 512;
const REG = {
  side: [0, 0.5, 1, 1],
  front: [0, 0, 0.25, 0.5],
  end: [0.25, 0, 0.5, 0.5],
  plain: [0.6, 0.2, 0.62, 0.22],
};

function roundRectTop(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h);
  g.closePath();
}

function glass(g, x, y, w, h, r = 8) {
  const grd = g.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, '#2c3a44');
  grd.addColorStop(1, '#141b21');
  g.fillStyle = grd;
  roundRectTop(g, x, y, w, h, r);
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.beginPath();
  g.moveTo(x + w * 0.1, y + h); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.3, y + h);
  g.fill();
  g.restore();
}

// volute de coin (filet décoratif)
function flourish(g, x, y, sx, sy) {
  g.beginPath();
  g.moveTo(x, y + sy * 14);
  g.quadraticCurveTo(x, y, x + sx * 14, y);
  g.moveTo(x + sx * 4, y + sy * 4);
  g.arc(x + sx * 9, y + sy * 9, 5, 0, Math.PI * 2);
  g.stroke();
}

function panel(g, x, y, w, h) {
  g.strokeRect(x, y, w, h);
  flourish(g, x + 5, y + 5, 1, 1);
  flourish(g, x + w - 5, y + 5, -1, 1);
  flourish(g, x + 5, y + h - 5, 1, -1);
  flourish(g, x + w - 5, y + h - 5, -1, -1);
}

function bodyFill(g, l, x, y, w, h) {
  const grd = g.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, l.body);
  grd.addColorStop(0.35, l.body2);
  grd.addColorStop(0.5, l.body);
  grd.addColorStop(1, l.body);
  g.fillStyle = grd;
  g.fillRect(x, y, w, h);
}

function emblem(g, cx, cy, r, l) {
  g.fillStyle = '#fbf6ea';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a5aa0'; g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, r - 3, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e8b830';
  g.beginPath(); g.arc(cx, cy - r * 0.15, r * 0.45, Math.PI, 0); g.fill();
  g.fillStyle = '#2a5aa0';
  g.fillRect(cx - r * 0.6, cy + r * 0.1, r * 1.2, r * 0.22);
}

function drawAtlas(l) {
  const c = document.createElement('canvas');
  c.width = AW; c.height = AH;
  const g = c.getContext('2d');
  g.lineCap = 'round';

  // ===== côté : 1024 x 256 =====
  const SW = 1024, SH = 256;
  bodyFill(g, l, 0, 0, SW, SH);
  g.fillStyle = l.stripe;
  g.fillRect(0, SH - 30, SW, 12);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, SH - 18, SW, 18);
  g.strokeStyle = l.line;
  g.lineWidth = 3;
  // filets haut et bas de la bande de fenêtres
  g.beginPath(); g.moveTo(0, 40); g.lineTo(SW, 40); g.moveTo(0, 150); g.lineTo(SW, 150); g.stroke();
  // portes près des extrémités
  for (const dx of [64, SW - 64 - 92]) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(dx - 3, 34, 98, SH - 60);
    bodyFill(g, l, dx, 37, 92, SH - 66);
    glass(g, dx + 10, 50, 32, 82, 6);
    glass(g, dx + 50, 50, 32, 82, 6);
    g.strokeStyle = l.line; g.lineWidth = 2;
    g.strokeRect(dx + 4, 41, 84, SH - 74);
    g.fillStyle = '#c9c2b0';
    g.fillRect(dx - 12, 60, 4, 110);           // main courante
    g.fillRect(dx + 100, 60, 4, 110);
  }
  // fenêtres à coins supérieurs arrondis
  const wx0 = 190, wx1 = SW - 190, n = 7, gap = 14;
  const ww = (wx1 - wx0 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = wx0 + i * (ww + gap);
    g.fillStyle = l.line;
    roundRectTop(g, x - 4, 50, ww + 8, 92, 12);
    g.fill();
    glass(g, x, 54, ww, 84, 10);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(x, 78, ww, 3);                    // traverse de la vitre
  }
  // panneaux inférieurs à volutes
  g.strokeStyle = l.line; g.lineWidth = 2.5;
  panel(g, 190, 162, (SW - 380) / 2 - 10, SH - 202);
  panel(g, SW / 2 + 10, 162, (SW - 380) / 2 - 10, SH - 202);
  emblem(g, SW / 2, 196, 22, l);
  g.fillStyle = l.line;
  g.font = 'bold 18px serif';
  g.textAlign = 'center';
  g.fillText(l.number, SW / 2 - 300, 200);

  // ===== face avant : 256 x 256 (en bas à gauche) =====
  const FX = 0, FY = 256, F = 256;
  bodyFill(g, l, FX, FY, F, F);
  g.fillStyle = l.line;
  g.fillRect(FX + 6, FY + 36, F - 12, 3);
  // trois vitres, la centrale plus grande
  for (const [x, w] of [[12, 56], [78, 100], [188, 56]]) {
    g.fillStyle = l.line;
    roundRectTop(g, FX + x - 3, FY + 46, w + 6, 92, 12);
    g.fill();
    glass(g, FX + x, FY + 49, w, 86, 10);
  }
  // essuie-glaces
  g.strokeStyle = '#111'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(FX + 96, FY + 132); g.lineTo(FX + 128, FY + 92); g.moveTo(FX + 22, FY + 132); g.lineTo(FX + 44, FY + 100); g.stroke();
  // girouette
  g.fillStyle = '#f4efe2';
  g.fillRect(FX + 96, FY + 10, 64, 22);
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 2;
  g.strokeRect(FX + 96, FY + 10, 64, 22);
  g.fillStyle = '#1b1b1b';
  g.font = 'bold 17px serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(l.dest, FX + 128, FY + 22);
  // panneau à volutes, emblème, plaque de numéro dorée
  g.strokeStyle = l.line; g.lineWidth = 2.5;
  panel(g, FX + 10, FY + 148, F - 20, 66);
  emblem(g, FX + 62, FY + 181, 24, l);
  const pg = g.createLinearGradient(0, FY + 168, 0, FY + 196);
  pg.addColorStop(0, '#f6dc8a'); pg.addColorStop(1, '#b88a2a');
  g.fillStyle = pg;
  g.beginPath(); g.ellipse(FX + 150, FY + 181, 28, 15, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7a5a1a'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#3a2a10';
  g.font = 'bold 18px serif';
  g.fillText(l.number, FX + 150, FY + 182);
  // feux de position
  for (const x of [26, 230]) {
    g.fillStyle = '#d9d4c8';
    g.beginPath(); g.arc(FX + x, FY + 206, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = l.lit ? '#fff6c8' : '#c8862a';
    g.beginPath(); g.arc(FX + x, FY + 206, 7, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = l.stripe;
  g.fillRect(FX, FY + F - 30, F, 12);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(FX, FY + F - 18, F, 18);

  // ===== face arrière / intercirculation : 256 x 256 =====
  const EX = 256;
  bodyFill(g, l, EX, FY, F, F);
  g.fillStyle = l.line;
  roundRectTop(g, EX + 85, FY + 46, 86, 92, 12);
  g.fill();
  glass(g, EX + 88, FY + 49, 80, 86, 10);
  g.strokeStyle = l.line; g.lineWidth = 2.5;
  panel(g, EX + 10, FY + 148, F - 20, 66);
  for (const x of [30, 226]) {
    g.fillStyle = '#b8241e';
    g.beginPath(); g.arc(EX + x, FY + 206, 8, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = l.stripe;
  g.fillRect(EX, FY + F - 30, F, 12);

  // ===== aplat couleur caisse =====
  g.fillStyle = l.body;
  g.fillRect(0.55 * AW, 0.7 * AH, 0.1 * AW, 0.1 * AH);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Boîte dont chaque face pointe vers une région de l'atlas (ordre : +x, -x, +y, -y, +z, -z)
function atlasBox(w, h, d, regions) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const [u0, v0, u1, v1] = regions[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
  }
  g.clearGroups();
  g.translate(0, BODY_Y0 + BODY_H / 2, -CAR_LEN / 2);   // avant de la voiture en z = 0
  return g;
}

// Détails 3D fusionnés d'une voiture (toit, phare, pare-chocs, bogies, gouttières…)
function detailGeo(lead, l) {
  const b = new Builder();
  const zc = -CAR_LEN / 2;
  const roofC = '#4d423e';
  // toit arrondi (demi-ellipse) et gouttières
  b.add(U.cyl, roofC, [0, 2.34, zc], [W / 2 + 0.02, CAR_LEN - 0.1, 0.26], [Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) b.add(U.box, '#2a2220', [sx * (W / 2 + 0.02), BODY_Y1 - 0.02, zc], [0.05, 0.06, CAR_LEN - 0.05]);
  // ventilateurs de toit (bas, on peut courir dessus)
  for (const dz of [-2.8, 0, 2.8]) b.add(U.box, '#6d625c', [0, 2.6, zc + dz], [0.7, 0.07, 1.1]);
  // filet clair à la base du toit
  for (const sx of [-1, 1]) b.add(U.box, l.line, [sx * (W / 2 + 0.006), BODY_Y1 - 0.12, zc], [0.012, 0.03, CAR_LEN - 0.3]);
  // marchepieds sous les portes
  for (const dz of [CAR_LEN / 2 - 1.05, -CAR_LEN / 2 + 1.05]) {
    for (const sx of [-1, 1]) b.add(U.box, '#2a2a2c', [sx * (W / 2 - 0.05), 0.32, zc + dz], [0.16, 0.08, 0.95]);
  }
  // châssis et bogies
  b.add(U.box, '#26282b', [0, 0.27, zc], [1.8, 0.4, CAR_LEN - 1.4]);
  for (const bz of [CAR_LEN / 2 - 1.75, -CAR_LEN / 2 + 1.75]) {
    b.add(U.box, '#1b1c1f', [0, 0.36, zc + bz], [1.75, 0.18, 1.8]);
    for (const dz of [-0.55, 0.55]) {
      for (const sx of [-1, 1]) {
        b.add(U.cyl, '#1d1e21', [sx * 0.76, 0.3, zc + bz + dz], [0.3, 0.12, 0.3], [0, 0, Math.PI / 2]);
        b.add(U.cyl, '#8b8f94', [sx * 0.83, 0.3, zc + bz + dz], [0.1, 0.03, 0.1], [0, 0, Math.PI / 2]);
      }
    }
    for (const sx of [-1, 1]) b.add(U.box, '#e8e0cc', [sx * 0.86, 0.42, zc + bz], [0.04, 0.12, 1.5]);
  }
  if (lead) {
    // phare sur le toit
    b.add(U.cyl, '#2a2522', [0, 2.62, -0.32], [0.15, 0.26, 0.15], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, '#c9c2b0', [0, 2.62, -0.18], [0.16, 0.03, 0.16], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, l.lit ? '#fff7d0' : '#d6cfae', [0, 2.62, -0.165], [0.12, 0.01, 0.12], [Math.PI / 2, 0, 0]);
    b.add(U.box, '#2a2522', [0, 2.52, -0.32], [0.08, 0.1, 0.12]);
    // pare-chocs chromé, jupe et attelage
    b.add(U.box, '#2a2a2c', [0, 0.38, 0.05], [W - 0.1, 0.24, 0.1]);
    b.add(U.box, '#b9bec4', [0, 0.56, 0.1], [W - 0.25, 0.08, 0.08]);
    for (const sx of [-1, 1]) b.add(U.box, '#b9bec4', [sx * 0.62, 0.5, 0.06], [0.06, 0.16, 0.08]);
    b.add(U.box, '#3a3a3c', [0, 0.42, 0.18], [0.22, 0.14, 0.2]);
    b.add(U.box, '#e8b030', [0, 0.27, 0.11], [0.5, 0.06, 0.04]);
    // rétroviseurs
    for (const sx of [-1, 1]) {
      b.add(U.box, '#2a2522', [sx * (W / 2 + 0.06), 1.75, -0.15], [0.04, 0.04, 0.25]);
      b.add(U.box, '#1a1a1a', [sx * (W / 2 + 0.08), 1.6, -0.02], [0.03, 0.22, 0.14]);
    }
  }
  return b.build();
}

export function buildTrainKit() {
  const kit = {};
  const make = (l) => {
    const mat = new THREE.MeshLambertMaterial({ map: drawAtlas(l) });
    const R = REG;
    return {
      mat,
      leadBody: atlasBox(W, BODY_H, CAR_LEN, [R.side, R.side, R.plain, R.plain, R.front, R.end]),
      midBody: atlasBox(W, BODY_H, CAR_LEN, [R.side, R.side, R.plain, R.plain, R.end, R.end]),
      leadDetail: detailGeo(true, l),
      midDetail: detailGeo(false, l),
    };
  };
  kit.liveries = LIVERIES.map(make);
  kit.express = make(EXPRESS);
  // soufflet entre deux voitures
  const b = new Builder();
  b.add(U.box, '#2a2626', [0, 1.35, 0], [1.3, 1.9, CAR_GAP + 0.12]);
  for (let i = 0; i < 6; i++) b.add(U.box, '#3d3735', [0, 0.55 + i * 0.32, 0], [1.34, 0.06, CAR_GAP + 0.14]);
  kit.connGeo = b.build();
  // lueur des phares (trains en mouvement)
  kit.glowMat = new THREE.MeshBasicMaterial({ color: '#fff8d8' });
  kit.glowGeo = new THREE.CircleGeometry(0.11, 16);
  return kit;
}

export function buildTrainMesh(kit, livery, cars, moving) {
  const g = new THREE.Group();
  for (let i = 0; i < cars; i++) {
    const z0 = -i * (CAR_LEN + CAR_GAP);
    const body = new THREE.Mesh(i === 0 ? livery.leadBody : livery.midBody, livery.mat);
    const detail = new THREE.Mesh(i === 0 ? livery.leadDetail : livery.midDetail, vcMat);
    body.position.z = detail.position.z = z0;
    g.add(body, detail);
    if (i > 0) {
      const c = new THREE.Mesh(kit.connGeo, vcMat);
      c.position.z = z0 + CAR_GAP / 2;
      g.add(c);
    }
  }
  if (moving) {
    // phare de toit et feux avant allumés
    for (const [x, y, z, s] of [[0, 2.62, -0.155, 1.1], [-0.88, 0.75, 0.006, 0.7], [0.88, 0.75, 0.006, 0.7]]) {
      const m = new THREE.Mesh(kit.glowGeo, kit.glowMat);
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      g.add(m);
    }
  }
  return g;
}
