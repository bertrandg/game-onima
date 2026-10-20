import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';

// Gourmandises de New York : part de pizza, bretzel, bagel, donut rose ; malus : la Big Apple pourrie
const BALL = new THREE.SphereGeometry(1, 9, 7);   // peu de facettes : beaucoup de petites boules par objet

function pizza() {   // part triangulaire : croûte dorée, fromage, rondelles de pepperoni
  const b = new Builder();
  const tri = new THREE.Shape();
  tri.moveTo(-0.26, 0.24); tri.lineTo(0.26, 0.24); tri.lineTo(0, -0.34); tri.closePath();
  const slab = new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: false });
  slab.translate(0, 0, -0.025);
  b.add(slab, '#ffd25a');
  b.add(slab, '#f0a840', [0, 0, -0.012], [1.04, 1.04, 0.6]);   // dessous doré
  b.add(U.cyl, '#d88a3a', [0, 0.26, 0], [0.05, 0.56, 0.05], [0, 0, Math.PI / 2]);   // bord de croûte
  for (const [x, y] of [[-0.1, 0.12], [0.1, 0.1], [0, -0.06], [-0.02, 0.16]]) {
    b.add(U.cyl, '#c8302a', [x, y, 0.03], [0.055, 0.015, 0.055], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, '#c8302a', [x, y, -0.03], [0.055, 0.015, 0.055], [Math.PI / 2, 0, 0]);
  }
  b.add(BALL, '#ffe890', [0.05, -0.2, 0.02], [0.03, 0.06, 0.02]);   // fromage qui file
  b.add(BALL, '#ffffff', [-0.12, 0.18, 0.03], [0.04, 0.015, 0.005]);
  return b.build();
}

function pretzel() {   // bretzel noué, gros sel
  const b = new Builder();
  const C = '#b8682a', C2 = '#d88a40';
  const ring = (cx, cy, r, a0, a1, n) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (a1 - a0);
      b.add(BALL, i % 2 ? C : C2, [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0], [0.065, 0.065, 0.065]);
    }
  };
  ring(-0.11, 0.04, 0.13, -0.5, Math.PI * 1.55, 12);
  ring(0.11, 0.04, 0.13, Math.PI * -0.55, Math.PI * 1.5, 12);
  ring(0, -0.12, 0.14, Math.PI * 0.95, Math.PI * 2.05, 8);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7;
    b.add(U.box, '#ffffff', [Math.cos(a) * 0.17, 0.02 + Math.sin(a) * 0.12, 0.06], [0.02, 0.02, 0.02], [a, a, 0]);
  }
  return b.build();
}

function bagel() {   // bagel doré aux graines de sésame
  const b = new Builder();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.add(BALL, i % 2 ? '#d8a050' : '#e8b868', [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0], [0.1, 0.1, 0.085]);
  }
  for (let i = 0; i < 16; i++) {
    const a = i * 0.39 + 0.2, r = 0.14 + (i % 3) * 0.03;
    b.add(BALL, '#fff4d8', [Math.cos(a) * r, Math.sin(a) * r, 0.085], [0.014, 0.022, 0.01], [0, 0, a]);
  }
  return b.build();
}

function donut() {   // donut au glaçage rose et vermicelles
  const b = new Builder();
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.add(BALL, '#e8b06a', [Math.cos(a) * 0.17, Math.sin(a) * 0.17, -0.02], [0.1, 0.1, 0.085]);
    b.add(BALL, '#ff8ac0', [Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.025], [0.098, 0.098, 0.06]);
  }
  const cols = ['#ffffff', '#ffd23f', '#7ae0a0', '#8a6aff', '#6ad0ff'];
  for (let i = 0; i < 18; i++) {
    const a = i * 0.35, r = 0.12 + (i % 3) * 0.05;
    b.add(U.box, cols[i % cols.length], [Math.cos(a) * r, Math.sin(a) * r, 0.085], [0.045, 0.012, 0.012], [0, 0, a * 2.3]);
  }
  return b.build();
}

// Big Apple pourrie : pomme brun-vert tachée, ver qui sort, mouches, tête de mort et fumée verte
function rottenApple() {
  const b = new Builder();
  b.add(BALL, '#6a6a2a', [0, 0, 0], [0.3, 0.27, 0.3]);
  b.add(BALL, '#5a4a20', [-0.12, 0.08, 0.18], [0.12, 0.1, 0.1]);   // taches de pourriture
  b.add(BALL, '#4a3a18', [0.15, -0.08, 0.16], [0.1, 0.12, 0.1]);
  b.add(BALL, '#7a8a2a', [0.1, 0.12, -0.2], [0.12, 0.08, 0.1]);
  b.add(U.cyl6, '#3a2a18', [0.02, 0.32, 0], [0.025, 0.14, 0.025], [0, 0, -0.3]);   // queue flétrie
  b.add(BALL, '#4a3a20', [0.1, 0.36, 0], [0.09, 0.02, 0.05], [0, 0, 0.5]);         // feuille morte
  // ver rose qui sort d'un trou
  b.add(BALL, '#1a140c', [0.2, 0.05, 0.16], [0.05, 0.05, 0.03]);
  for (let i = 0; i < 4; i++) b.add(BALL, '#e88a9a', [0.22 + i * 0.05, 0.07 + Math.sin(i) * 0.05, 0.2 + i * 0.02], [0.04, 0.04, 0.04]);
  b.add(BALL, '#141010', [0.38, 0.12, 0.27], [0.012, 0.012, 0.01]);
  // tête de mort qui flotte au-dessus
  const sy = 0.62;
  b.add(BALL, '#ece4d4', [0, sy, 0], [0.11, 0.105, 0.095]);
  b.add(U.box, '#e2d8c6', [0, sy - 0.09, 0.02], [0.11, 0.06, 0.08]);
  for (const sx of [-1, 1]) b.add(BALL, '#0c080a', [sx * 0.04, sy + 0.005, 0.08], [0.03, 0.034, 0.02]);
  b.add(U.cone4, '#0c080a', [0, sy - 0.04, 0.09], [0.014, 0.03, 0.01], [Math.PI, 0, 0]);
  for (let i = 0; i < 4; i++) b.add(U.box, '#0c080a', [-0.03 + i * 0.02, sy - 0.1, 0.062], [0.005, 0.028, 0.005]);
  return b.build();
}
function stinkParts() {
  // fumée verdâtre translucide et mouches qui tournent autour
  const sm = new Builder();
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.9 + k * 2.1, r = 0.08 + i * 0.015, sz = 0.03 + i * 0.007;
      sm.add(U.sph0, ['#6a8a2a', '#4a6a1a', '#8aa040'][(i + k) % 3], [Math.cos(a) * r, 0.2 + i * 0.06, Math.sin(a) * r - 0.05], [sz, sz * 2, sz * 0.8], [0, a, 0.4]);
    }
  }
  const flies = new Builder();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const x = Math.cos(a) * 0.42, y = 0.1 + (i % 2) * 0.25, z = Math.sin(a) * 0.42;
    flies.add(BALL, '#141414', [x, y, z], [0.035, 0.03, 0.045]);
    for (const s of [-1, 1]) flies.add(BALL, '#c8d8e8', [x + s * 0.035, y + 0.03, z], [0.03, 0.008, 0.02], [0, 0, s * 0.5]);
  }
  return [
    { geo: rottenApple(), mat: itemMaterial('#0e0a06') },
    { geo: flies.build(), mat: itemMaterial('#000000') },
    { geo: sm.build(), mat: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }) },
  ];
}

export function nyItems() {
  const mat = itemMaterial('#2a1a10');
  return {
    kinds: [
      { geo: pizza(), mat, spin: true },
      { geo: pizza(), mat, spin: true },
      { geo: pizza(), mat, spin: true },
      { geo: pretzel(), mat, spin: true },
      { geo: pretzel(), mat, spin: true },
      { geo: bagel(), mat, spin: true },
      { geo: bagel(), mat, spin: true },
      { geo: donut(), mat, spin: true },
      { geo: donut(), mat, spin: true },
    ],
    hazard: { parts: stinkParts() },
  };
}
