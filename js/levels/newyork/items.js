import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';
import { MATERIALS, VERTS, TRIS } from './revolvermodel.js';

// Gourmandises de New York : part de pizza, bretzel, bagel, donut rose ; malus : revolver
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

// Malus : revolver low-poly (modèle de Quaternius, CC0), de profil face au joueur
const GUN_COLORS = { Metal: '#5e646e', LightMetal: '#a8b0bc', Wood: '#a8643a' };
function revolver() {
  const pos = new Float32Array(TRIS.length / 4 * 9), col = new Float32Array(pos.length);
  const c = new THREE.Color();
  for (let t = 0, o = 0; t < TRIS.length; t += 4) {
    c.set(GUN_COLORS[MATERIALS[TRIS[t + 3]]] || '#888888');
    for (let k = 0; k < 3; k++, o += 3) {
      const v = TRIS[t + k] * 3;
      pos[o] = VERTS[v]; pos[o + 1] = VERTS[v + 1]; pos[o + 2] = VERTS[v + 2];
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.scale(0.5, 0.5, 0.5);   // environ 1 m de long : bien visible de loin
  g.computeVertexNormals();
  return g;
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
    hazard: { geo: revolver(), mat: itemMaterial('#0a0a0e') },
  };
}
