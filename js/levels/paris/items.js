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

// Absinthe néfaste : verre à pied rempli d'un vert luisant, sucre sur la cuillère percée,
// pied noirci aux ronces flétries, fumée noire et petite tête de mort qui flotte au-dessus.
function absintheParts() {
  // verre (transparent)
  const glassPts = [[0, -0.44], [0.17, -0.44], [0.17, -0.425], [0.04, -0.41], [0.024, -0.32], [0.022, -0.02],
    [0.06, 0.02], [0.15, 0.08], [0.205, 0.2], [0.215, 0.32], [0.2, 0.43]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.LatheGeometry(glassPts, 28);
  const glassMat = new THREE.MeshLambertMaterial({ color: '#e8fff0', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  // liquide vert qui luit
  const liqPts = [[0, 0.03], [0.055, 0.035], [0.14, 0.085], [0.19, 0.2], [0.2, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
  const liquid = new THREE.LatheGeometry(liqPts, 28);
  const liqMat = new THREE.MeshLambertMaterial({ color: '#46ff5c', emissive: '#18b030' });
  // pièces opaques
  const b = new Builder();
  b.add(U.box, '#f4fff4', [0.02, 0.37, 0.0], [0.13, 0.11, 0.13], [0.2, 0.5, 0.15]);   // morceau de sucre
  b.add(U.box, '#c8ccd0', [0.08, 0.435, 0], [0.62, 0.012, 0.12], [0, 0.35, 0.18]);    // cuillère percée
  for (let i = 0; i < 4; i++) b.add(U.box, '#2a2e32', [-0.06 + i * 0.05, 0.442, 0.0], [0.02, 0.006, 0.07], [0, 0.35, 0.18]);
  b.add(U.box, '#b8bcc0', [0.42, 0.5, 0.12], [0.3, 0.012, 0.03], [0, 0.35, 0.3]);       // manche
  // pied noirci et ronces flétries qui s'enroulent autour de la jambe
  b.add(U.cyl, '#141016', [0, -0.435, 0], [0.18, 0.02, 0.18]);
  for (let i = 0; i < 9; i++) {
    const a = i * 1.3, y = -0.4 + i * 0.045;
    b.add(U.cyl6, '#1a1218', [Math.cos(a) * 0.035, y, Math.sin(a) * 0.035], [0.012, 0.09, 0.012], [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1]);
    b.add(U.cone4, '#2a1a22', [Math.cos(a) * 0.07, y + 0.02, Math.sin(a) * 0.07], [0.012, 0.05, 0.012], [Math.sin(a) * 1.6, 0, -Math.cos(a) * 1.6]);
  }
  for (let i = 0; i < 5; i++) {   // feuilles mortes recroquevillées sur le pied
    const a = i * 1.25;
    b.add(BALL, '#2a2018', [Math.cos(a) * 0.14, -0.42, Math.sin(a) * 0.14], [0.045, 0.012, 0.025], [0, -a, 0.3]);
  }
  // tête de mort qui fait face au joueur (côté +z)
  const sy = 0.92;
  b.add(BALL, '#ece4d4', [0, sy, 0], [0.12, 0.115, 0.105]);
  b.add(U.box, '#e2d8c6', [0, sy - 0.1, 0.02], [0.12, 0.07, 0.09]);   // mâchoire
  for (const sx of [-1, 1]) b.add(BALL, '#0c080a', [sx * 0.045, sy + 0.005, 0.088], [0.034, 0.038, 0.02]);
  b.add(U.cone4, '#0c080a', [0, sy - 0.045, 0.1], [0.016, 0.032, 0.01], [Math.PI, 0, 0]);
  for (let i = 0; i < 5; i++) b.add(U.box, '#0c080a', [-0.04 + i * 0.02, sy - 0.11, 0.066], [0.005, 0.03, 0.005]);
  b.add(U.box, '#0c080a', [0, sy - 0.098, 0.066], [0.11, 0.005, 0.005]);
  // fumée : volutes grises et noires translucides, étirées et irrégulières
  const sm = new Builder();
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 9; i++) {
      const a = i * 0.8 + k * 2.1, r = 0.03 + i * 0.012, sz = 0.03 + i * 0.006;
      sm.add(U.sph0, ['#141012', '#2a2628', '#3c3638'][(i + k) % 3], [Math.cos(a) * r, 0.44 + i * 0.07, Math.sin(a) * r - 0.04],
        [sz, sz * 2.2, sz * 0.8], [0, a, 0.5 * Math.sin(a)]);
    }
  }
  const smokeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
  return [
    { geo: liquid, mat: liqMat },
    { geo: b.build(), mat: itemMaterial('#0e0a0c') },
    { geo: sm.build(), mat: smokeMat },
    { geo: glass, mat: glassMat },
  ];
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
    // absinthe néfaste : verre, liquide luisant et éléments noirs en pièces séparées
    hazard: { parts: absintheParts() },
  };
}
