import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';

// Gourmandises et trésors de l'Égypte : ankh doré, grappe de dattes, gâteau au miel, fleur de lotus ;
// malus : scorpion noir à la queue dressée
const BALL = new THREE.SphereGeometry(1, 12, 9);

function ankh() {   // croix de vie en or, incrustée de lapis
  const b = new Builder();
  const G = '#f0c040', G2 = '#d8a020';
  const n = 16;
  for (let i = 0; i < n; i++) {   // boucle
    const a = (i / n) * Math.PI * 2;
    b.add(BALL, i % 2 ? G : G2, [Math.sin(a) * 0.12, 0.2 + Math.cos(a) * 0.15, 0], [0.05, 0.05, 0.05]);
  }
  b.add(U.box, G, [0, -0.02, 0], [0.42, 0.08, 0.08]);
  b.add(U.box, G, [0, -0.2, 0], [0.09, 0.34, 0.08]);
  b.add(BALL, '#2a5aa8', [0, -0.02, 0.045], [0.05, 0.035, 0.01]);
  for (const s of [-1, 1]) b.add(BALL, '#c0442c', [s * 0.18, -0.02, 0.045], [0.025, 0.025, 0.01]);
  return b.build();
}

function dates() {   // grappe de dattes brillantes sur leur tige
  const b = new Builder();
  b.add(U.cyl, '#c8a050', [0, 0.18, 0], [0.02, 0.36, 0.02]);
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, y = 0.12 - i * 0.035, r = 0.06 + (i % 3) * 0.04;
    b.add(BALL, i % 2 ? '#8a3a1a' : '#a8501e', [Math.cos(a) * r, y, Math.sin(a) * r], [0.055, 0.085, 0.055]);
    b.add(BALL, '#e8a070', [Math.cos(a) * r + 0.02, y + 0.03, Math.sin(a) * r + 0.02], [0.012, 0.02, 0.012]);
  }
  for (const s of [-1, 1]) b.add(U.box, '#5a9a3a', [s * 0.1, 0.34, 0], [0.2, 0.02, 0.06], [0, 0, s * 0.4]);
  return b.build();
}

function honeyCake() {   // galette au miel, sésame et goutte dorée
  const b = new Builder();
  b.add(U.cyl, '#d8a050', [0, 0, 0], [0.24, 0.12, 0.24], [Math.PI / 2, 0, 0]);
  b.add(U.cyl, '#f0c060', [0, 0, 0.065], [0.21, 0.02, 0.21], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9, r = 0.05 + (i % 4) * 0.04;
    b.add(BALL, '#fff4d8', [Math.cos(a) * r, Math.sin(a) * r, 0.08], [0.012, 0.022, 0.006], [0, 0, a]);
  }
  b.add(BALL, '#ffb830', [0.05, -0.2, 0.06], [0.04, 0.06, 0.03]);
  return b.build();
}

function lotus() {   // fleur de lotus rose à cœur doré
  const b = new Builder();
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + k * 0.4, tilt = k ? 0.5 : 0.9;
      b.add(BALL, k ? '#ffb8d8' : '#ff8ac0', [Math.cos(a) * 0.1, 0.05 + k * 0.04, Math.sin(a) * 0.1], [0.05, 0.16 - k * 0.03, 0.025], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]);
    }
  }
  b.add(BALL, '#ffd040', [0, 0.12, 0], [0.06, 0.04, 0.06]);
  b.add(U.cyl, '#5a9a3a', [0, -0.08, 0], [0.24, 0.02, 0.24]);   // feuille sous la fleur
  return b.build();
}

// Malus : scorpion noir aux pinces levées et au dard rouge
function scorpion() {
  const b = new Builder();
  const C = '#2a2228', C2 = '#3a3038', R = '#d8202a';
  b.add(BALL, C, [0, 0, 0], [0.22, 0.12, 0.3]);
  b.add(BALL, C2, [0, 0.02, 0.28], [0.15, 0.09, 0.12]);
  for (const s of [-1, 1]) {
    b.add(BALL, '#ff3a2a', [s * 0.06, 0.08, 0.38], [0.03, 0.03, 0.02]);   // yeux rouges
    for (let k = 0; k < 4; k++) b.add(U.box, C, [s * 0.28, -0.06, 0.12 - k * 0.12], [0.3, 0.03, 0.03], [0, 0, s * 0.5]);
    // bras et pinces
    b.add(U.box, C2, [s * 0.22, 0.05, 0.42], [0.06, 0.06, 0.24], [0, s * 0.6, 0]);
    b.add(BALL, C, [s * 0.32, 0.08, 0.58], [0.09, 0.07, 0.12]);
    b.add(U.cone4, C2, [s * 0.36, 0.08, 0.72], [0.04, 0.16, 0.04], [Math.PI / 2, 0, 0]);
    b.add(U.cone4, C2, [s * 0.28, 0.08, 0.72], [0.03, 0.12, 0.03], [Math.PI / 2, 0, 0]);
  }
  // queue segmentée qui part de l'arrière, monte et se recourbe au-dessus du dos
  const cy = 0.3, cz = -0.3, r = 0.28;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 1.3, k = 0.075 - i * 0.005;
    b.add(BALL, i % 2 ? C : C2, [0, cy + Math.sin(a) * r, cz - Math.cos(a) * r], [k, k, k]);
  }
  const end = -Math.PI / 2 + Math.PI * 1.38;
  b.add(U.cone4, R, [0, cy + Math.sin(end) * r - 0.04, cz - Math.cos(end) * r + 0.02], [0.045, 0.16, 0.045], [Math.PI * 0.75, 0, 0]);
  const g = b.build();
  g.scale(1.6, 1.6, 1.6);
  return g;
}

export function egyptItems() {
  const mat = itemMaterial('#3a2a10');
  return {
    kinds: [
      { geo: ankh(), mat: itemMaterial('#6a4a12'), spin: true },
      { geo: ankh(), mat: itemMaterial('#6a4a12'), spin: true },
      { geo: dates(), mat, spin: true },
      { geo: dates(), mat, spin: true },
      { geo: honeyCake(), mat, spin: true },
      { geo: honeyCake(), mat, spin: true },
      { geo: lotus(), mat: itemMaterial('#4a2a3a'), spin: true },
    ],
    hazard: { geo: scorpion(), mat: itemMaterial('#1a0a0a') },
  };
}
