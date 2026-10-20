import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';

// Gourmandises de New York : part de pizza, bretzel, bagel, donut rose ; malus : revolver au ruban de police
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

// Malus : revolver (de profil face au joueur) entouré d'un ruban de police jaune et noir
function revolver() {
  const b = new Builder();
  const STEEL = '#8a929e', DARK = '#3a3e46', SHINE = '#d8dee6', WOOD = '#a8602a';
  b.add(U.cyl, STEEL, [0.2, 0.1, 0], [0.055, 0.42, 0.055], [0, 0, Math.PI / 2]);     // canon
  b.add(U.box, STEEL, [0.2, 0.15, 0], [0.42, 0.04, 0.05]);                            // nervure
  b.add(U.box, DARK, [0.4, 0.19, 0], [0.03, 0.04, 0.03]);                             // guidon
  b.add(U.cyl, SHINE, [0.2, 0.135, 0.03], [0.012, 0.4, 0.012], [0, 0, Math.PI / 2]); // reflet
  b.add(U.box, STEEL, [-0.06, 0.08, 0], [0.16, 0.18, 0.08]);                          // carcasse
  b.add(U.cyl, DARK, [-0.04, 0.08, 0], [0.09, 0.14, 0.09], [0, 0, Math.PI / 2]);     // barillet
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(U.cyl, SHINE, [-0.04, 0.08 + Math.cos(a) * 0.05, Math.sin(a) * 0.05], [0.018, 0.145, 0.018], [0, 0, Math.PI / 2]);
  }
  b.add(U.box, DARK, [-0.17, 0.2, 0], [0.05, 0.08, 0.04], [0, 0, 0.5]);              // chien
  b.add(U.box, WOOD, [-0.2, -0.08, 0], [0.11, 0.26, 0.075], [0, 0, -0.35]);           // crosse
  for (let i = 0; i < 3; i++) b.add(U.box, '#7a4018', [-0.215 + i * 0.01, -0.05 - i * 0.06, 0.04], [0.06, 0.012, 0.005], [0, 0, -0.35]);
  b.add(U.cyl, DARK, [-0.05, -0.04, 0], [0.06, 0.02, 0.06], [Math.PI / 2, 0, 0]);    // pontet
  b.add(U.box, DARK, [-0.05, -0.02, 0], [0.015, 0.06, 0.015], [0, 0, 0.3]);           // détente
  // un fin ruban « POLICE » noué autour du canon, avec un pan qui pend
  const rz = 0.45;
  b.add(U.box, '#ffd21a', [0.16, 0.1, 0], [0.05, 0.2, 0.13], [0, 0, rz]);
  for (const k of [-1, 0, 1]) b.add(U.box, '#141414', [0.16 - Math.sin(rz) * k * 0.06, 0.1 + Math.cos(rz) * k * 0.06, 0], [0.052, 0.018, 0.132], [0, 0, rz]);
  b.add(U.box, '#ffd21a', [0.2, -0.03, 0.05], [0.05, 0.2, 0.01], [0, 0, -0.25]);
  for (const k of [-1, 0, 1]) b.add(U.box, '#141414', [0.2 + Math.sin(0.25) * k * 0.06, -0.03 + k * 0.06, 0.056], [0.052, 0.018, 0.004], [0, 0, -0.25]);
  const g = b.build();
  g.scale(1.6, 1.6, 1.6);   // bien visible de loin
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
