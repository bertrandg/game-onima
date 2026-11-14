import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';

// Objets à ramasser du centre commercial : sac de shopping, paquet cadeau, sucette, cornet de glace ;
// malus : un gros chewing-gum collant, rose et grognon
const BALL = new THREE.SphereGeometry(1, 14, 10);

function bag() {   // sac rose à anses, étiquette en cœur
  const b = new Builder();
  b.add(U.box, '#ff6aa8', [0, 0, 0], [0.38, 0.42, 0.16]);
  b.add(U.box, '#ffffff', [0, 0.19, 0], [0.39, 0.05, 0.17]);
  for (const x of [-0.09, 0.09]) b.add(U.box, '#ffffff', [x, 0.3, 0], [0.025, 0.2, 0.02]);
  b.add(U.box, '#ffffff', [0, 0.4, 0], [0.2, 0.025, 0.02]);
  for (const d of [-1, 1]) b.add(BALL, '#ffd23f', [d * 0.035, -0.02, 0.085], [0.05, 0.05, 0.015]);
  b.add(U.cone4, '#ffd23f', [0, -0.07, 0.085], [0.07, 0.08, 0.015], [Math.PI, Math.PI / 4, 0]);
  return b.build();
}

function gift() {   // paquet bleu, ruban et nœud jaunes
  const b = new Builder();
  b.add(U.box, '#5ac8fa', [0, 0, 0], [0.34, 0.3, 0.34]);
  b.add(U.box, '#ffd23f', [0, 0, 0], [0.36, 0.31, 0.07]);
  b.add(U.box, '#ffd23f', [0, 0, 0], [0.07, 0.31, 0.36]);
  for (const d of [-1, 1]) b.add(BALL, '#ffd23f', [d * 0.07, 0.2, 0], [0.08, 0.05, 0.04], [0, 0, d * 0.5]);
  b.add(BALL, '#ffb000', [0, 0.19, 0], [0.04, 0.04, 0.04]);
  return b.build();
}

function lollipop() {   // sucette spirale arc-en-ciel sur son bâton
  const b = new Builder();
  b.add(U.cyl6, '#f4f0e8', [0, -0.25, 0], [0.018, 0.45, 0.018]);
  const cols = ['#ff5a8a', '#ffffff', '#ffd23f', '#ffffff', '#5ac8fa', '#ffffff', '#7ae07a'];
  for (let i = 0; i < cols.length; i++) {
    const r = 0.22 - i * 0.028;
    b.add(U.cyl, cols[i], [0, 0.08, i * 0.004], [r, 0.05, r], [Math.PI / 2, 0, 0]);
  }
  return b.build();
}

function iceCream() {   // cornet gaufré, deux boules (fraise, vanille) et une cerise
  const b = new Builder();
  b.add(U.cone8, '#e8b06a', [0, -0.15, 0], [0.14, 0.38, 0.14], [Math.PI, 0, 0]);
  for (let k = 0; k < 3; k++) b.add(U.box, '#c8904a', [0, -0.12 - k * 0.08, 0.1 - k * 0.025], [0.2 - k * 0.05, 0.015, 0.01]);
  b.add(BALL, '#ffb0c8', [0, 0.1, 0], [0.16, 0.14, 0.16]);
  b.add(BALL, '#fff4d0', [0, 0.27, 0], [0.13, 0.12, 0.13]);
  b.add(BALL, '#e8302a', [0, 0.41, 0], [0.04, 0.04, 0.04]);
  return b.build();
}

// Malus : chewing-gum rose qui dégouline, sourcils froncés et grosse bulle
function chewingGum() {
  const b = new Builder();
  b.add(BALL, '#ff7ab8', [0, 0, 0], [0.36, 0.3, 0.32]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(BALL, '#ff8ac4', [Math.cos(a) * 0.28, -0.22, Math.sin(a) * 0.24], [0.1, 0.14, 0.1]);   // coulures
    b.add(U.cone8, '#ff7ab8', [Math.cos(a) * 0.28, -0.4, Math.sin(a) * 0.24], [0.05, 0.16, 0.05], [Math.PI, 0, 0]);
  }
  b.add(BALL, '#ffc0e0', [0.22, 0.1, 0.24], [0.16, 0.16, 0.12]);   // bulle
  b.add(BALL, '#ffffff', [0.18, 0.16, 0.34], [0.04, 0.04, 0.02]);
  for (const x of [-0.12, 0.08]) {
    b.add(BALL, '#ffffff', [x, 0.08, 0.27], [0.07, 0.08, 0.04]);
    b.add(BALL, '#1a1010', [x, 0.07, 0.3], [0.035, 0.045, 0.02]);
    b.add(U.box, '#7a1a4a', [x, 0.19, 0.28], [0.12, 0.025, 0.02], [0, 0, x < 0 ? -0.4 : 0.4]);   // sourcils froncés
  }
  b.add(U.box, '#7a1a4a', [-0.03, -0.06, 0.3], [0.12, 0.025, 0.02], [0, 0, 0.15]);
  return b.build();
}

export function mallItems() {
  const mat = itemMaterial();
  return {
    kinds: [
      { geo: bag(), mat, spin: true },
      { geo: gift(), mat, spin: true },
      { geo: lollipop(), mat, spin: false },   // la sucette se balance face au joueur
      { geo: iceCream(), mat: itemMaterial('#5a3a3a'), spin: true },
    ],
    hazard: { geo: chewingGum(), mat },
  };
}
