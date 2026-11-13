import * as THREE from 'three';
import { Builder, U } from '../../geo.js';
import { itemMaterial } from '../../candies.js';

// Dim sum de Hong Kong : siu mai, har gow, brioche au porc laqué, tartelette aux œufs ;
// malus : durian hérissé de pointes (et son odeur terrible)
const BALL = new THREE.SphereGeometry(1, 12, 9);

function siuMai() {   // bouchée jaune ouverte, farce rosée et œufs de poisson orange
  const b = new Builder();
  b.add(U.cyl, '#f2d850', [0, 0, 0], [0.2, 0.26, 0.2]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(BALL, '#f8e070', [Math.cos(a) * 0.19, 0.12, Math.sin(a) * 0.19], [0.06, 0.04, 0.06]);   // bord plissé
  }
  b.add(BALL, '#e8a0a0', [0, 0.13, 0], [0.16, 0.06, 0.16]);
  b.add(BALL, '#ff7a2a', [0, 0.19, 0], [0.06, 0.04, 0.06]);
  return b.build();
}

function harGow() {   // raviolis translucide aux crevettes, plis sur le dessus
  const b = new Builder();
  b.add(BALL, '#f4eee6', [0, 0, 0], [0.24, 0.17, 0.2]);
  b.add(BALL, '#ffb0a0', [0, 0.02, 0], [0.18, 0.12, 0.15]);   // crevette en transparence
  for (let i = 0; i < 6; i++) b.add(U.box, '#fffaf2', [-0.15 + i * 0.06, 0.16, 0], [0.03, 0.06, 0.22], [0, 0, (i - 2.5) * 0.15]);
  return b.build();
}

function charSiuBao() {   // brioche vapeur blanche fendue, porc laqué rouge qui dépasse
  const b = new Builder();
  b.add(BALL, '#fffaf0', [0, 0, 0], [0.24, 0.19, 0.24]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.add(U.box, '#c83a2a', [Math.cos(a) * 0.06, 0.17, Math.sin(a) * 0.06], [0.12, 0.04, 0.05], [0, -a, 0]);
  }
  b.add(BALL, '#f0e8d8', [0, -0.12, 0], [0.22, 0.04, 0.22]);
  return b.build();
}

function eggTart() {   // tartelette dorée feuilletée, crème aux œufs brillante
  const b = new Builder();
  b.add(U.cyl, '#d8963a', [0, 0, 0], [0.22, 0.12, 0.22]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add(BALL, '#e8a84a', [Math.cos(a) * 0.21, 0.05, Math.sin(a) * 0.21], [0.04, 0.03, 0.04]);
  }
  b.add(U.cyl, '#ffd84a', [0, 0.05, 0], [0.18, 0.04, 0.18]);
  b.add(BALL, '#fff0a0', [-0.05, 0.075, 0.04], [0.05, 0.01, 0.03]);
  // posée de profil face au joueur : on la voit mieux
  const g = b.build();
  g.rotateX(Math.PI / 2.6);
  return g;
}

// Malus : durian vert-brun hérissé de pointes, avec une moue boudeuse
function durian() {
  const b = new Builder();
  b.add(BALL, '#8aa040', [0, 0, 0], [0.32, 0.36, 0.3]);
  for (let i = 0; i < 40; i++) {
    const u = (i + 0.5) / 40, a = i * 2.4;
    const y = 1 - 2 * u, r = Math.sqrt(1 - y * y);
    const nx = Math.cos(a) * r, nz = Math.sin(a) * r;
    const dir = new THREE.Vector3(nx, y, nz);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    b.add(U.cone4, i % 2 ? '#6a7a2a' : '#7a8a34', [nx * 0.33, y * 0.37, nz * 0.31], [0.05, 0.12, 0.05], [e.x, e.y, e.z]);
  }
  b.add(U.cyl, '#5a4a2a', [0, 0.42, 0], [0.03, 0.12, 0.03]);
  for (const s of [-1, 1]) {
    b.add(BALL, '#1a1a10', [s * 0.1, 0.05, 0.28], [0.04, 0.05, 0.02]);
    b.add(U.box, '#1a1a10', [s * 0.1, 0.14, 0.29], [0.1, 0.02, 0.01], [0, 0, s * 0.3]);
  }
  b.add(U.box, '#4a2a1a', [0, -0.08, 0.3], [0.1, 0.02, 0.01], [0, 0, 0.1]);
  // petites vapeurs vertes de l'odeur
  for (let i = 0; i < 3; i++) b.add(BALL, '#a8e060', [-0.25 + i * 0.25, 0.55 + (i % 2) * 0.08, 0], [0.04, 0.06, 0.04]);
  const g = b.build();
  g.scale(1.5, 1.5, 1.5);
  return g;
}

export function hongKongItems() {
  const mat = itemMaterial('#3a2a2a');
  return {
    kinds: [
      { geo: siuMai(), mat, spin: true },
      { geo: siuMai(), mat, spin: true },
      { geo: harGow(), mat, spin: true },
      { geo: harGow(), mat, spin: true },
      { geo: charSiuBao(), mat, spin: true },
      { geo: charSiuBao(), mat, spin: true },
      { geo: eggTart(), mat: itemMaterial('#5a3a10'), spin: true },
    ],
    hazard: { geo: durian(), mat: itemMaterial('#1a1a0a') },
  };
}
