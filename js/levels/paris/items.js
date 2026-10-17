import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';

// Gourmandises de Paris : croissant, macarons, grappe de raisin ; malus : l'absinthe et sa fée verte
const BALL = new THREE.SphereGeometry(1, 12, 9);

function croissant() {   // croissant en croissant de lune : bouts pointus relevés, couches dorées
  const b = new Builder();
  const n = 9, R = 0.3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = -1.45 + t * 2.9;
    const r = 0.06 + 0.12 * Math.sin(t * Math.PI);
    const x = Math.sin(a) * R, y = R - Math.cos(a) * R * 0.85;
    b.add(BALL, i % 2 ? '#e4a548' : '#c98330', [x, y, 0], [r * 1.25, r, r], [0, 0, a]);
    b.add(BALL, '#f4cf80', [x, y + r * 0.6, -r * 0.2], [r * 0.7, r * 0.22, r * 0.55], [0, 0, a]);   // reflet doré
  }
  return b.build();
}

function macaron(c1, c2) {
  const b = new Builder();
  b.add(BALL, c1, [0, 0.11, 0], [0.24, 0.1, 0.24]);
  b.add(BALL, c1, [0, -0.11, 0], [0.24, 0.1, 0.24]);
  b.add(U.cyl, c2, [0, 0, 0], [0.215, 0.07, 0.215]);       // ganache
  b.add(U.cyl, c1, [0, 0.045, 0], [0.245, 0.03, 0.245]);   // collerette
  b.add(U.cyl, c1, [0, -0.045, 0], [0.245, 0.03, 0.245]);
  b.add(BALL, '#ffffff', [-0.08, 0.17, -0.08], [0.06, 0.02, 0.05]);
  return b.build();
}

function grapes() {
  const b = new Builder();
  const rows = [4, 4, 3, 3, 2, 1];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r * 0.6;
      const rr = n > 1 ? 0.11 + n * 0.012 : 0;
      b.add(BALL, ['#6a2a7a', '#7e3a8e', '#5a2268'][(i + r) % 3], [Math.cos(a) * rr, 0.25 - r * 0.11, Math.sin(a) * rr], [0.075, 0.08, 0.075]);
    }
  });
  b.add(U.cyl6, '#5a3a20', [0, 0.38, 0], [0.015, 0.16, 0.015]);
  for (const s of [-1, 1]) b.add(BALL, '#5a9a3a', [s * 0.12, 0.38, 0], [0.13, 0.02, 0.09], [0, 0, s * 0.4]);   // feuille de vigne
  return b.build();
}

// Absinthe : bouteille verte, verre et petite fée verte lumineuse
function absinthe() {
  const b = new Builder();
  b.add(U.cyl, '#2f8a3a', [0, 0.05, 0], [0.16, 0.5, 0.16]);
  b.add(U.cone8, '#2f8a3a', [0, 0.36, 0], [0.16, 0.14, 0.16]);
  b.add(U.cyl, '#2f8a3a', [0, 0.5, 0], [0.05, 0.18, 0.05]);
  b.add(U.cyl, '#6a4a2a', [0, 0.61, 0], [0.055, 0.05, 0.055]);
  b.add(U.cyl, '#f4ecd8', [0, 0.05, 0], [0.165, 0.22, 0.165]);   // étiquette
  b.add(U.cyl, '#c8302a', [0, 0.05, 0], [0.167, 0.05, 0.167]);
  // verre à absinthe avec cuillère
  b.add(U.cyl, '#bfe8c0', [0.3, -0.12, 0.05], [0.07, 0.14, 0.07]);
  b.add(U.cone8, '#9ad8a0', [0.3, 0.03, 0.05], [0.09, 0.16, 0.09], [Math.PI, 0, 0]);
  b.add(U.box, '#c8ccd0', [0.3, 0.12, 0.05], [0.22, 0.01, 0.04]);
  // fée verte : petit corps, tête, deux paires d'ailes translucides
  const fx = -0.2, fy = 0.55;
  b.add(BALL, '#7cff8a', [fx, fy, 0], [0.05, 0.08, 0.05]);
  b.add(BALL, '#c8ffd0', [fx, fy + 0.11, 0], [0.04, 0.04, 0.04]);
  for (const s of [-1, 1]) {
    b.add(BALL, '#b8ffcc', [fx + s * 0.09, fy + 0.04, -0.02], [0.08, 0.04, 0.01], [0, 0, s * 0.6]);
    b.add(BALL, '#9af0b0', [fx + s * 0.07, fy - 0.04, -0.02], [0.05, 0.03, 0.01], [0, 0, -s * 0.5]);
  }
  for (let i = 0; i < 5; i++) b.add(BALL, '#d8ffb0', [fx + Math.cos(i * 1.3) * 0.15, fy + Math.sin(i * 2.1) * 0.15, 0.02], [0.015, 0.015, 0.015]);
  return b.build();
}

export function parisItems() {
  const mat = itemMaterial('#2a1e14');
  return {
    kinds: [
      { geo: croissant(), mat, spin: true },
      { geo: croissant(), mat, spin: true },
      { geo: croissant(), mat, spin: true },
      { geo: macaron('#f7a8c4', '#fff0f4'), mat, spin: true },   // framboise
      { geo: macaron('#b8dc8a', '#f4f8e0'), mat, spin: true },   // pistache
      { geo: macaron('#c9b0f0', '#f6f0ff'), mat, spin: true },   // lavande
      { geo: macaron('#f8e070', '#fffbe0'), mat, spin: true },   // citron
      { geo: macaron('#8a5a3a', '#f0dcc4'), mat, spin: true },   // chocolat
      { geo: grapes(), mat, spin: false },
      { geo: grapes(), mat, spin: false },
      { geo: grapes(), mat, spin: false },
    ],
    // la fée verte brille : matériau émissif vert
    hazard: { geo: absinthe(), mat: itemMaterial('#1f6a26') },
  };
}
