import * as THREE from 'three';
import { Builder, U, vcMat, pick } from '../../geo.js';
import { TRAIN_HALF_W, TRAIN_TOP, CAR_LEN, CAR_GAP, RAMP_LEN } from '../../config.js';

// Véhicules de New York : bus touristiques à impériale couverte (garés dans les bouchons, on court sur
// leur toit) et taxis jaunes qui foncent vers le joueur (on peut sauter sur leur toit).
// Comme les trains : une texture unique par livrée (atlas) + détails fusionnés.

const FONT = '"M PLUS Rounded 1c", "Arial Rounded MT Bold", sans-serif';
const W = TRAIN_HALF_W * 2;
const Y0 = 0.4, Y1 = 2.05;            // caisse peinte (pont inférieur + bas du pont supérieur)
const H = Y1 - Y0;
const BLEN = CAR_LEN - 0.4;
const BALL = new THREE.SphereGeometry(1, 10, 8);

const LIVERIES = [
  { body: '#d8202a', body2: '#a8141c', band: '#f2c230', text: '#ffffff', name: 'NEW YORK CITY TOUR', canopy: '#f4f0e8' },
  { body: '#1f4aa0', body2: '#14306a', band: '#ff8ac0', text: '#ffffff', name: 'BIG APPLE TOUR', canopy: '#ff8ac0' },
  { body: '#6a3aa8', body2: '#48207a', band: '#7ae0c8', text: '#ffffff', name: 'SKYLINE TOUR', canopy: '#f2c230' },
];

// ---------- Atlas du bus : côté (moitié haute), avant, arrière, aplat ----------
const REG = { side: [0, 0.5, 1, 1], front: [0, 0, 0.25, 0.5], end: [0.25, 0, 0.5, 0.5], plain: [0.6, 0.2, 0.62, 0.22] };

function windowGlass(g, x, y, w, h) {
  const grd = g.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, '#5a7a92'); grd.addColorStop(1, '#1c2a36');
  g.fillStyle = grd;
  g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.moveTo(x + w * 0.5, y + 3); g.lineTo(x + w * 0.66, y + 3); g.lineTo(x + w * 0.36, y + h - 3); g.lineTo(x + w * 0.2, y + h - 3); g.fill();
}
function passenger(g, x, y, s, seed) {
  g.fillStyle = ['#f2d2b8', '#c89a70', '#8a5a3a', '#f8e0c8'][seed % 4];
  g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  g.fillStyle = ['#3a2a1a', '#f2d23a', '#141414', '#c8602a'][(seed * 3) % 4];
  g.beginPath(); g.arc(x, y - s * 0.35, s * 1.02, Math.PI, 0); g.fill();
  g.fillStyle = ['#3a6ac8', '#e8202a', '#5aba7a', '#f2a0c0'][(seed * 7) % 4];
  g.fillRect(x - s * 1.3, y + s * 1.1, s * 2.6, s * 2);
}

function drawAtlas(l) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  // côté : pont inférieur vitré, bandeau avec le nom, silhouette de la ville peinte
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, l.body); bg.addColorStop(0.7, l.body); bg.addColorStop(1, l.body2);
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, 6, 1024, 5);
  // haut : skyline peinte et nom de la compagnie
  g.fillStyle = l.body2;
  for (let x = 0, i = 0; x < 1024; i++) { const w = 30 + ((i * 37) % 40), h = 20 + ((i * 53) % 46); g.fillRect(x, 74 - h, w - 4, h); x += w; }
  g.fillStyle = l.band; g.fillRect(0, 74, 1024, 10);
  g.font = `800 50px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = l.text;
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 6;
  g.fillText(l.name, 512, 40);
  g.shadowBlur = 0;
  // vitres du pont inférieur avec touristes
  for (let i = 0; i < 8; i++) {
    const x = 26 + i * 124;
    windowGlass(g, x, 96, 104, 92);
    if (i % 3 !== 1) passenger(g, x + 52, 140, 15, i);
  }
  g.fillStyle = l.band; g.fillRect(0, 200, 1024, 14);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 228, 1024, 28);
  // avant : grand pare-brise, girouette, phares, calandre
  const F = 256;
  g.fillStyle = l.body; g.fillRect(0, F, 256, 256);
  g.fillStyle = '#141414'; g.fillRect(30, F + 12, 196, 38);
  g.fillStyle = '#ffb030'; g.font = `800 26px ${FONT}`;
  g.fillText('CITY TOUR', 128, F + 32);
  windowGlass(g, 22, F + 60, 212, 110);
  g.fillStyle = l.band; g.fillRect(0, F + 180, 256, 10);
  g.fillStyle = '#2a2a2e'; g.fillRect(70, F + 200, 116, 30);
  for (let i = 0; i < 5; i++) { g.fillStyle = '#5a5a5e'; g.fillRect(76, F + 204 + i * 5, 104, 2); }
  g.fillStyle = '#fff4c0';
  g.beginPath(); g.arc(36, F + 214, 14, 0, 7); g.arc(220, F + 214, 14, 0, 7); g.fill();
  // arrière : vitre, « HOP ON HOP OFF », feux rouges
  g.fillStyle = l.body; g.fillRect(256, F, 256, 256);
  windowGlass(g, 296, F + 40, 176, 90);
  g.fillStyle = l.text; g.font = `800 28px ${FONT}`;
  g.fillText('HOP ON', 384, F + 160);
  g.fillText('HOP OFF', 384, F + 192);
  g.fillStyle = '#e8202a';
  g.fillRect(270, F + 200, 26, 40); g.fillRect(472, F + 200, 26, 40);
  // aplat
  g.fillStyle = l.body; g.fillRect(560, 340, 100, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function atlasBox() {
  const R = REG, regions = [R.side, R.side, R.plain, R.plain, R.front, R.end];
  const g = new THREE.BoxGeometry(W, H, BLEN);
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

// pont supérieur ouvert : touristes assis, poteaux, toit-auvent plat (le joueur court dessus), roues
function busDetail(l) {
  const b = new Builder();
  const zc = -CAR_LEN / 2;
  for (const sx of [-1, 1]) {
    b.add(U.box, l.band, [sx * (W / 2 + 0.005), Y1 - 0.08, zc], [0.02, 0.1, BLEN]);
    for (let i = 0; i <= 6; i++) b.add(U.box, '#d8dcdf', [sx * (W / 2 - 0.05), 2.32, zc - BLEN / 2 + 0.2 + (i * (BLEN - 0.4)) / 6], [0.06, 0.55, 0.06]);
    b.add(U.box, '#d8dcdf', [sx * (W / 2 - 0.05), 2.3, zc], [0.05, 0.05, BLEN]);
  }
  // toit-auvent rayé
  for (let i = 0; i < 8; i++) b.add(U.box, i % 2 ? l.canopy : l.body, [0, TRAIN_TOP - 0.04, zc - BLEN / 2 + (i + 0.5) * (BLEN / 8)], [W + 0.08, 0.08, BLEN / 8]);
  b.add(U.box, l.band, [0, TRAIN_TOP - 0.1, zc], [W + 0.12, 0.04, BLEN + 0.06]);
  // touristes en rang deux par deux avec appareils photo et casquettes
  for (let i = 0; i < 7; i++) {
    for (const sx of [-1, 1]) {
      if ((i * 3 + sx) % 4 === 0) continue;
      const z = zc + BLEN / 2 - 0.9 - i * 1.25, x = sx * 0.5;
      b.add(U.box, pick(['#3a6ac8', '#f2c230', '#e86a9a', '#5aba7a', '#f4f0e8', '#e8602a']), [x, 2.18, z], [0.42, 0.26, 0.34]);
      b.add(BALL, pick(['#f2d2b8', '#c89a70', '#8a5a3a', '#f8e0c8']), [x, 2.39, z], [0.13, 0.13, 0.13]);
      if (i % 2) b.add(BALL, pick(['#3a2a1a', '#f2d23a', '#141414']), [x, 2.45, z - 0.03], [0.13, 0.07, 0.13]);   // cheveux
    }
  }
  // roues, passages de roue et pare-chocs
  for (const sx of [-1, 1]) {
    for (const z of [zc + BLEN / 2 - 1.6, zc - BLEN / 2 + 1.7, zc - BLEN / 2 + 2.9]) {
      b.add(U.cyl, '#1a1a1c', [sx * (W / 2 - 0.12), 0.45, z], [0.45, 0.32, 0.45], [0, 0, Math.PI / 2]);
      b.add(U.cyl, '#b8bcc0', [sx * (W / 2 + 0.03), 0.45, z], [0.22, 0.04, 0.22], [0, 0, Math.PI / 2]);
    }
  }
  b.add(U.box, '#2a2a2e', [0, 0.36, zc + BLEN / 2 + 0.06], [W, 0.22, 0.14]);
  b.add(U.box, '#2a2a2e', [0, 0.36, zc - BLEN / 2 - 0.06], [W, 0.22, 0.14]);
  // rétroviseurs
  for (const sx of [-1, 1]) {
    b.add(U.box, '#1a1a1c', [sx * (W / 2 + 0.25), 1.6, -0.25], [0.4, 0.04, 0.04]);
    b.add(U.box, '#1a1a1c', [sx * (W / 2 + 0.45), 1.45, -0.25], [0.08, 0.32, 0.18]);
  }
  return b.build();
}

// ---------- Taxi jaune (4,6 m), avant vers +z ----------
const TAXI_LEN = 4.6, TAXI_TOP = 1.55, TAXI_GAP = 0.9;
function taxiGeo() {
  const b = new Builder();
  const Y = '#f6c21a', YD = '#d8a410', DARK = '#26303a', CHROME = '#d8dcdf';
  const zc = -TAXI_LEN / 2;
  b.add(U.box, Y, [0, 0.68, zc], [1.84, 0.62, TAXI_LEN - 0.2]);                       // caisse
  b.add(U.box, Y, [0, 1.22, zc - 0.25], [1.66, 0.55, 2.3]);                          // habitacle
  b.add(U.box, YD, [0, TAXI_TOP - 0.03, zc - 0.25], [1.6, 0.06, 2.2]);               // toit
  b.add(U.box, DARK, [0, 1.2, zc + 0.92], [1.5, 0.46, 0.06], [-0.45, 0, 0]);          // pare-brise
  b.add(U.box, DARK, [0, 1.2, zc - 1.42], [1.5, 0.42, 0.06], [0.45, 0, 0]);           // lunette arrière
  for (const sx of [-1, 1]) {
    for (const dz of [-0.75, 0.3]) b.add(U.box, DARK, [sx * 0.835, 1.22, zc + dz], [0.02, 0.4, 0.9]);
    // bande à damier noir et blanc
    for (let i = 0; i < 18; i++) {
      for (let r = 0; r < 2; r++) b.add(U.box, (i + r) % 2 ? '#141414' : '#f4f0e8', [sx * 0.925, 0.78 - r * 0.1, zc - TAXI_LEN / 2 + 0.4 + i * 0.22], [0.02, 0.1, 0.22]);
    }
    b.add(U.box, '#141414', [sx * 0.93, 0.6, zc + 0.3], [0.02, 0.12, 0.5]);         // numéro
    for (const z of [zc + 1.35, zc - 1.35]) {
      b.add(U.cyl, '#1a1a1c', [sx * 0.86, 0.36, z], [0.36, 0.26, 0.36], [0, 0, Math.PI / 2]);
      b.add(U.cyl, CHROME, [sx * 0.99, 0.36, z], [0.16, 0.02, 0.16], [0, 0, Math.PI / 2]);
    }
  }
  // pare-chocs, calandre, phares, plaque
  b.add(U.box, CHROME, [0, 0.42, 0.04], [1.9, 0.18, 0.14]);
  b.add(U.box, CHROME, [0, 0.42, -TAXI_LEN + 0.16], [1.9, 0.18, 0.14]);
  b.add(U.box, '#2a2a2e', [0, 0.72, 0.0], [0.9, 0.24, 0.04]);
  for (let i = 0; i < 4; i++) b.add(U.box, CHROME, [0, 0.64 + i * 0.055, 0.02], [0.86, 0.02, 0.02]);
  b.add(U.box, '#f4f0e8', [0, 0.46, 0.12], [0.5, 0.14, 0.02]);
  for (const sx of [-1, 1]) b.add(U.box, '#e8202a', [sx * 0.75, 0.75, -TAXI_LEN + 0.08], [0.24, 0.14, 0.04]);
  // enseigne « TAXI » sur le toit : lettres en blocs
  b.add(U.box, '#fff4b0', [0, TAXI_TOP + 0.12, zc - 0.1], [0.9, 0.22, 0.3]);
  const L = (dx, dy, w, h) => { for (const s of [-1, 1]) b.add(U.box, '#141414', [dx, TAXI_TOP + 0.12 + dy, zc - 0.1 + s * 0.152], [w, h, 0.01]); };
  L(-0.3, 0.06, 0.16, 0.03); L(-0.3, -0.01, 0.03, 0.13);                                 // T
  L(-0.11, 0, 0.03, 0.15); L(-0.03, 0, 0.03, 0.15); L(-0.07, 0.06, 0.1, 0.03); L(-0.07, 0, 0.1, 0.03);   // A
  for (const s of [-1, 1]) for (const r of [-0.6, 0.6]) b.add(U.box, '#141414', [0.1, TAXI_TOP + 0.12, zc - 0.1 + s * 0.152], [0.03, 0.17, 0.01], [0, 0, r]);   // X
  L(0.28, 0, 0.03, 0.15);                                                                 // I
  return b.build();
}

export function nyVehicleKit() {
  const buses = LIVERIES.map((l) => ({ mat: new THREE.MeshLambertMaterial({ map: drawAtlas(l) }), detail: busDetail(l) }));
  const body = atlasBox();
  const taxi = taxiGeo();
  const glowMat = new THREE.MeshBasicMaterial({ color: '#fff6d0' });
  const glowGeo = new THREE.BoxGeometry(0.32, 0.16, 0.04);

  function buildBuses(cars) {
    const g = new THREE.Group();
    const l = pick(buses);
    for (let i = 0; i < cars; i++) {
      const z0 = -i * (CAR_LEN + CAR_GAP);
      const m = new THREE.Mesh(body, l.mat), d = new THREE.Mesh(l.detail, vcMat);
      m.position.z = d.position.z = z0;
      g.add(m, d);
    }
    return g;
  }
  // file de taxis pare-chocs contre pare-chocs ; phares allumés quand ils roulent
  function buildTaxis(n, lit) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const z0 = -i * (TAXI_LEN + TAXI_GAP);
      const m = new THREE.Mesh(taxi, vcMat);
      m.position.z = z0;
      g.add(m);
      if (lit) {
        for (const sx of [-1, 1]) {
          const h = new THREE.Mesh(glowGeo, glowMat);
          h.position.set(sx * 0.66, 0.72, z0 + 0.03);
          g.add(h);
        }
      }
    }
    g.userData.len = n * TAXI_LEN + (n - 1) * TAXI_GAP;
    g.userData.top = TAXI_TOP;
    return g;
  }

  return {
    rampGeo: rampGeo(),
    low: lowBarriers(),
    highGeo: scaffoldGate(),
    hitch: null,
    // rampe : toujours un bus (assez haut pour la rampe) ; sinon parfois une file de taxis à l'arrêt
    buildVehicle: (cars, moving, ramp) => {
      if (moving) return buildTaxis(Math.min(cars, 2), true);
      if (!ramp && Math.random() < 0.3) return buildTaxis(cars + 1, false);
      return buildBuses(cars);
    },
    warmup() {
      const g = new THREE.Group();
      buses.forEach((l, i) => { const m = new THREE.Mesh(body, l.mat); m.position.x = i * 3; g.add(m, new THREE.Mesh(l.detail, vcMat)); });
      g.add(buildTaxis(1, true));
      return g;
    },
  };
}

// ---------- Rampe : contreplaqué de chantier sur tréteaux, cônes orange ----------
function rampGeo() {
  const b = new Builder();
  const L = Math.hypot(RAMP_LEN, TRAIN_TOP), a = Math.atan2(TRAIN_TOP, RAMP_LEN);
  b.add(U.box, '#c8a46a', [0, TRAIN_TOP / 2, RAMP_LEN / 2], [2.0, 0.1, L], [a, 0, 0]);
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    b.add(U.box, '#9a7a4a', [0, TRAIN_TOP * (1 - t) + 0.06, RAMP_LEN * t], [2.02, 0.03, 0.06], [a, 0, 0]);
  }
  // bordures rayées orange et blanc
  for (const x of [-1.02, 1.02]) {
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      b.add(U.box, i % 2 ? '#f4f0e8' : '#ff6a1a', [x, TRAIN_TOP * (1 - t) + 0.16, RAMP_LEN * t], [0.08, 0.2, L / 8], [a, 0, 0]);
    }
  }
  for (const t of [0.3, 0.6]) {   // tréteaux
    const h = TRAIN_TOP * (1 - t);
    for (const x of [-0.8, 0.8]) for (const dz of [-0.25, 0.25]) b.add(U.box, '#5a5a5e', [x, h / 2, RAMP_LEN * t + dz], [0.08, h, 0.08], [dz * 0.6, 0, 0]);
  }
  for (const x of [-1.25, 1.25]) {   // cônes au pied
    b.add(U.cone8, '#ff6a1a', [x, 0.35, RAMP_LEN + 0.2], [0.18, 0.7, 0.18]);
    b.add(U.cyl, '#f4f0e8', [x, 0.42, RAMP_LEN + 0.2], [0.12, 0.08, 0.12]);
    b.add(U.box, '#2a2a2e', [x, 0.03, RAMP_LEN + 0.2], [0.4, 0.06, 0.4]);
  }
  return b.build();
}

// ---------- Obstacles bas (à sauter) ----------
function lowBarriers() {
  const out = [];
  let b = new Builder();   // stand de hot-dogs : chariot inox, enseigne, parasol replié
  b.add(U.box, '#d8dcdf', [0, 0.6, 0], [2.0, 0.7, 0.8]);
  b.add(U.box, '#b8bcc0', [0, 0.98, 0], [2.04, 0.06, 0.84]);
  b.add(U.box, '#c8202a', [0, 0.62, 0.41], [1.9, 0.5, 0.02]);
  // hot-dog dessiné sur l'enseigne : pain, saucisse, moutarde
  b.add(BALL, '#e8b06a', [0, 0.62, 0.43], [0.42, 0.11, 0.02]);
  b.add(BALL, '#c8502a', [0, 0.66, 0.45], [0.48, 0.06, 0.02]);
  for (let i = 0; i < 5; i++) b.add(U.box, '#f2d23a', [-0.3 + i * 0.15, 0.7 + (i % 2) * 0.02, 0.47], [0.1, 0.025, 0.01], [0, 0, (i % 2 ? 0.5 : -0.5)]);
  for (const x of [-0.75, 0.75]) b.add(U.cyl, '#1a1a1c', [x, 0.2, 0.4], [0.2, 0.06, 0.2], [Math.PI / 2, 0, 0]);
  b.add(U.box, '#8a8e92', [0, 0.22, 0], [1.9, 0.08, 0.7]);
  for (const [c, x] of [['#e8202a', -0.5], ['#f2d23a', -0.35], ['#f4f0e8', 0.6]]) b.add(U.cyl6, c, [x, 1.13, -0.1], [0.05, 0.24, 0.05]);
  for (let i = 0; i < 3; i++) b.add(BALL, '#f8f8f8', [0.3 + i * 0.08, 1.15 + i * 0.18, 0], [0.12 + i * 0.04, 0.08 + i * 0.03, 0.12]);   // vapeur
  b.add(U.cyl6, '#e8e4dc', [1.05, 1.1, -0.3], [0.03, 2.2, 0.03]);
  b.add(U.cone8, '#f2c230', [1.05, 1.8, -0.3], [0.12, 1.1, 0.12], [Math.PI, 0, 0]);
  out.push({ geo: b.build(), depth: 0.8, h: 1.0 });

  b = new Builder();   // barrière de police bleue « POLICE LINE »
  for (const x of [-1.05, 1.05]) {
    for (const dz of [-0.28, 0.28]) b.add(U.box, '#1f3a8a', [x, 0.45, dz * 0.6], [0.08, 0.95, 0.08], [dz, 0, 0]);
  }
  b.add(U.box, '#1f3a8a', [0, 0.9, 0], [2.4, 0.26, 0.08]);
  for (let i = 0; i < 10; i++) b.add(U.box, '#f4f0e8', [-0.95 + i * 0.21, 0.9, 0.045], [i % 3 === 2 ? 0.04 : 0.12, 0.13, 0.01]);
  b.add(U.box, '#1f3a8a', [0, 0.45, 0], [2.2, 0.08, 0.06]);
  out.push({ geo: b.build(), depth: 0.4, h: 1.0 });

  b = new Builder();   // fûts de chantier orange et blancs avec lampe clignotante
  for (const x of [-0.75, 0, 0.75]) {
    b.add(U.cyl, '#2a2a2e', [x, 0.04, 0], [0.38, 0.08, 0.38]);
    for (let i = 0; i < 4; i++) b.add(U.cyl, i % 2 ? '#f4f0e8' : '#ff6a1a', [x, 0.16 + i * 0.2 + 0.1, 0], [0.3 - i * 0.012, 0.2, 0.3 - i * 0.012]);
    b.add(U.cyl, '#ff6a1a', [x, 0.97, 0], [0.24, 0.06, 0.24]);
    b.add(U.box, '#2a2a2e', [x, 1.06, 0], [0.06, 0.12, 0.06]);
    b.add(BALL, '#ffd23f', [x, 1.16, 0], [0.09, 0.08, 0.09]);
  }
  out.push({ geo: b.build(), depth: 0.6, h: 1.0 });

  b = new Builder();   // tas de sacs-poubelle noirs
  for (let i = 0; i < 9; i++) {
    const x = -0.9 + (i % 5) * 0.45, y = i < 5 ? 0.3 : 0.7, s = 0.32 + (i % 3) * 0.04;
    b.add(BALL, i % 4 === 3 ? '#3a4a5a' : '#1e2024', [x + (i < 5 ? 0 : 0.22), y, (i % 2) * 0.1], [s, s * 0.9, s]);
    b.add(U.cone8, '#1e2024', [x + (i < 5 ? 0 : 0.22), y + s * 0.95, (i % 2) * 0.1], [0.06, 0.16, 0.06]);
  }
  b.add(U.box, '#c8a46a', [0.7, 0.85, 0.15], [0.4, 0.3, 0.3], [0, 0.4, 0.2]);   // carton
  out.push({ geo: b.build(), depth: 0.7, h: 1.0 });
  return out;
}

// ---------- Obstacle haut (à passer en roulade) : passerelle d'échafaudage verte ----------
function scaffoldGate() {
  const b = new Builder();
  for (const x of [-1.2, 1.2]) {
    b.add(U.box, '#2c5a3a', [x, 1.4, 0], [0.16, 2.8, 0.16]);
    b.add(U.box, '#5a5a5e', [x, 0.04, 0], [0.4, 0.08, 0.4]);
  }
  b.add(U.box, '#2c5a3a', [0, 2.05, 0], [2.6, 1.3, 0.12]);   // panneau de contreplaqué
  b.add(U.box, '#24503a', [0, 2.75, 0], [2.7, 0.14, 0.3]);
  // « POST NO BILLS » en blocs blancs et affiches collées malgré tout
  for (let i = 0; i < 11; i++) if (i !== 4 && i !== 7) b.add(U.box, '#f4f0e8', [-1.0 + i * 0.2, 2.35, 0.07], [0.13, 0.16, 0.01]);
  b.add(U.box, '#ff8ac0', [-0.6, 1.8, 0.07], [0.6, 0.5, 0.01], [0, 0, 0.06]);
  b.add(U.box, '#7ad8f0', [0.45, 1.75, 0.07], [0.5, 0.6, 0.01], [0, 0, -0.08]);
  b.add(U.box, '#ffd23f', [0.95, 1.85, 0.072], [0.3, 0.4, 0.01]);
  // lampes de chantier
  for (const x of [-0.8, 0.8]) b.add(BALL, '#fff2c0', [x, 1.32, 0.05], [0.1, 0.08, 0.1]);
  b.add(U.box, '#f2c230', [0, 1.4, 0.07], [2.6, 0.06, 0.02]);
  return b.build();
}
