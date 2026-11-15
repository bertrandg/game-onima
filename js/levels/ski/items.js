import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';
import { bendMaterial } from './bend.js';

const BALL = new THREE.SphereGeometry(1, 18, 12);

// Tasse de chocolat chaud : chantilly, guimauves, anse
function cocoaGeo() {
  const b = new Builder();
  b.add(U.cyl, '#e8302a', [0, 0, 0], [0.2, 0.32, 0.2]);
  b.add(U.cyl, '#ffffff', [0, 0.04, 0], [0.205, 0.07, 0.205]);
  b.add(U.cyl, '#5a3020', [0, 0.155, 0], [0.18, 0.02, 0.18]);
  b.add(new THREE.TorusGeometry(0.09, 0.03, 8, 16), '#e8302a', [0.22, 0.0, 0], [1, 1, 1], [0, 0, 0]);
  b.add(BALL, '#fffaf0', [0, 0.2, 0], [0.17, 0.09, 0.17]);
  b.add(BALL, '#fffaf0', [0, 0.27, 0], [0.11, 0.07, 0.11]);
  b.add(U.cone8, '#fffaf0', [0, 0.36, 0], [0.05, 0.1, 0.05]);
  b.add(U.box, '#ffb8d8', [0.1, 0.2, 0.05], [0.07, 0.06, 0.07], [0.3, 0.5, 0]);
  b.add(U.box, '#ffffff', [-0.08, 0.21, -0.07], [0.07, 0.06, 0.07], [0.2, 0.2, 0.4]);
  for (const [x, z] of [[0.04, 0.08], [-0.06, 0.06], [0.02, -0.1]]) b.add(U.sph, '#4a2818', [x, 0.3, z], [0.015, 0.008, 0.015]);
  return b.build();
}

// Crêpe pliée en triangle, nappée de chocolat, sucre glace
function crepeGeo() {
  const b = new Builder();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, 0.38, 0, Math.PI / 2, false);
  shape.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 10 });
  g.translate(-0.13, -0.13, -0.025);
  b.add(g, '#e8b86a', [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 4 + Math.PI]);
  b.add(g, '#5a3020', [0, 0.01, 0.04], [0.85, 0.85, 0.3], [0, 0, Math.PI / 4 + Math.PI]);
  for (const [x, y] of [[-0.08, -0.05], [0.06, -0.08], [0, -0.16], [-0.02, 0.02]]) b.add(U.sph, '#ffffff', [x, y, 0.06], [0.02, 0.02, 0.01]);
  b.add(U.sph, '#c8302a', [0, -0.12, 0.07], [0.04, 0.04, 0.03]);
  return b.build();
}

// Gaufre à alvéoles, sucre glace
function waffleGeo() {
  const b = new Builder();
  b.add(U.box, '#e0a84a', [0, 0, 0], [0.42, 0.42, 0.07]);
  for (let i = -1.5; i <= 1.5; i++) {
    b.add(U.box, '#f0c070', [i * 0.1, 0, 0.04], [0.025, 0.42, 0.03]);
    b.add(U.box, '#f0c070', [0, i * 0.1, 0.04], [0.42, 0.025, 0.03]);
    b.add(U.box, '#f0c070', [i * 0.1, 0, -0.04], [0.025, 0.42, 0.03]);
    b.add(U.box, '#f0c070', [0, i * 0.1, -0.04], [0.42, 0.025, 0.03]);
  }
  for (let k = 0; k < 7; k++) b.add(U.sph, '#ffffff', [(Math.random() - 0.5) * 0.34, (Math.random() - 0.5) * 0.34, 0.065], [0.03, 0.03, 0.01]);
  return b.build();
}

// Malus : bâtons de dynamite de déclenchement d'avalanche, mèche qui grésille
function dynamiteGeo() {
  const b = new Builder();
  for (const [x, z] of [[-0.1, 0], [0.1, 0], [0, 0.11]]) {
    b.add(U.cyl, '#d8202a', [x, 0, z], [0.085, 0.6, 0.085]);
    b.add(U.cyl, '#f4e8d0', [x, 0.3, z], [0.07, 0.02, 0.07]);
    b.add(U.cyl, '#f4e8d0', [x, -0.3, z], [0.07, 0.02, 0.07]);
  }
  for (const y of [-0.15, 0.15]) b.add(U.cyl, '#1a1a1e', [0, y, 0.035], [0.2, 0.06, 0.2]);
  b.add(U.box, '#ffffff', [0, 0, -0.09], [0.2, 0.14, 0.01]);
  b.add(U.box, '#1a1a1e', [0, 0.02, -0.096], [0.05, 0.08, 0.005]);
  b.add(U.sph, '#1a1a1e', [0, -0.03, -0.096], [0.012, 0.012, 0.005]);
  b.add(U.cyl, '#5a4030', [0.05, 0.42, 0.03], [0.012, 0.25, 0.012], [0, 0, -0.5]);
  return b.build();
}
function sparkGeo() {
  const b = new Builder();
  b.add(U.sph, '#fff4a0', [0.115, 0.54, 0.03], [0.05, 0.05, 0.05]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(U.cone4, '#ffb020', [0.115 + Math.cos(a) * 0.07, 0.54 + Math.sin(a) * 0.07, 0.03], [0.02, 0.09, 0.02], [0, 0, a - Math.PI / 2]);
  }
  return b.build();
}

export function skiItems() {
  const mat = bendMaterial(itemMaterial());
  return {
    kinds: [
      { geo: cocoaGeo(), mat, spin: true },
      { geo: crepeGeo(), mat, spin: false },
      { geo: waffleGeo(), mat, spin: false },
    ],
    hazard: {
      parts: [
        { geo: dynamiteGeo(), mat },
        { geo: sparkGeo(), mat: bendMaterial(new THREE.MeshBasicMaterial({ vertexColors: true })) },
      ],
    },
  };
}
