import * as THREE from 'three';
import { Builder, U } from './geo.js';
import { LANES } from './config.js';

export const CANDY_POINTS = 10;
const SPACING = 2.2;
const TRAIL_LEN = 3;   // friandises à la suite
const BALL = new THREE.SphereGeometry(1, 20, 14);   // sphère lisse pour dango et lanterne

// Dango : trois boules (rose, blanche, verte) sur une brochette en bois
function dangoGeo() {
  const b = new Builder();
  b.add(U.cyl, '#e8d2a6', [0, -0.08, 0], [0.018, 0.95, 0.018]);
  b.add(BALL, '#f48fb1', [0, 0.27, 0], [0.145, 0.14, 0.145]);
  b.add(BALL, '#fbf8f2', [0, 0.0, 0], [0.145, 0.14, 0.145]);
  b.add(BALL, '#a8cf6a', [0, -0.27, 0], [0.145, 0.14, 0.145]);
  // petits reflets brillants
  for (const y of [0.32, 0.05, -0.22]) b.add(U.sph, '#ffffff', [-0.06, y, -0.115], [0.035, 0.025, 0.012]);
  return b.build();
}

// Feuille de shiso : contour dentelé, nervure centrale et tige
function shisoGeo() {
  const shape = new THREE.Shape();
  const L = 0.7, N = 15;
  const width = (t) => 0.34 * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.2 * t);
  shape.moveTo(0, 0);
  for (let side of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const tooth = i % 2 ? 1.25 : 0.82;   // dents de scie
      pts.push([side * width(t) * (i === N ? 0 : tooth), t * L]);
    }
    if (side < 0) pts.reverse();
    for (const [x, y] of pts) shape.lineTo(x, y);
    if (side > 0) shape.lineTo(0, L + 0.06);   // pointe
  }
  shape.lineTo(0, 0);
  const leaf = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  leaf.translate(0, -L / 2, -0.01);
  const b = new Builder();
  b.add(leaf, '#5cb84a');
  // nervures sur les deux faces
  for (const z of [-0.016, 0.016]) {
    b.add(U.box, '#8fd673', [0, 0, z], [0.02, L * 0.95, 0.01]);
    for (const [y, sx] of [[-0.14, 1], [-0.14, -1], [0.0, 1], [0.0, -1], [0.14, 1], [0.14, -1]]) {
      b.add(U.box, '#8fd673', [sx * 0.08, y + 0.05, z], [0.012, 0.2, 0.008], [0, 0, -sx * 0.9]);
    }
  }
  b.add(U.cyl, '#4a8a3a', [0, -L / 2 - 0.12, 0], [0.015, 0.26, 0.015]);
  return b.build();
}

// Lanterne en papier (chōchin) : corps blanc à côtes, cerclages noirs, soleil rouge peint
function lanternGeo() {
  const b = new Builder();
  b.add(BALL, '#fff6e6', [0, 0, 0], [0.2, 0.32, 0.2]);
  for (const y of [-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24]) {
    const r = 0.2 * Math.sqrt(1 - (y / 0.32) ** 2) + 0.004;
    b.add(U.cyl, '#eadcc2', [0, y, 0], [r, 0.012, r]);
  }
  b.add(U.cyl, '#2a2522', [0, 0.31, 0], [0.11, 0.06, 0.11]);
  b.add(U.cyl, '#2a2522', [0, -0.31, 0], [0.11, 0.06, 0.11]);
  b.add(U.cyl, '#2a2522', [0, 0.4, 0], [0.012, 0.14, 0.012]);
  for (const z of [-1, 1]) {
    b.add(U.sph, '#e0302a', [0.02, -0.03, z * 0.19], [0.075, 0.075, 0.02]);
    b.add(U.cone8, '#2c5d74', [-0.05, -0.12, z * 0.185], [0.08, 0.1, 0.02]);
  }
  return b.build();
}

// Friandises à ramasser (dango, shiso, lanternes) : sur les voies, les toits, en arc au-dessus des barrières
export class Candies {
  constructor(scene) {
    this.scene = scene;
    const grad = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter;
    grad.needsUpdate = true;
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, emissive: '#2a1a24' });
    // la lanterne brille doucement
    const glowMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, emissive: '#6a4a22' });
    this.kinds = [
      { geo: dangoGeo(), mat, spin: true },
      { geo: shisoGeo(), mat, spin: false },   // la feuille se balance face au joueur
      { geo: lanternGeo(), mat: glowMat, spin: true },
    ];
    this.list = [];
  }

  warmupGroup() {
    const g = new THREE.Group();
    this.kinds.forEach((k, i) => { const m = new THREE.Mesh(k.geo, k.mat); m.position.x = i; g.add(m); });
    return g;
  }

  reset() {
    for (const c of this.list) this.scene.remove(c.mesh);
    this.list = [];
  }

  // Place un petit groupe de bonbons (3 au plus) à un endroit au hasard entre zFrom (proche) et zTo (loin)
  placeTrail(lane, zFrom, zTo, obstacles) {
    const x = LANES[lane];
    const kind = this.kinds[(Math.random() * this.kinds.length) | 0];
    const n = Math.min(TRAIL_LEN, Math.floor((zFrom - zTo) / SPACING));
    const start = zFrom - Math.random() * Math.max(0, zFrom - zTo - n * SPACING);
    for (let i = 0; i < n; i++) {
      const z = start - i * SPACING;
      let y = 0.9;
      const g = obstacles.groundAt(x, z);
      if (g > 0) y = g + 0.9;
      else {
        const b = obstacles.barrierNear(lane, z);
        if (b && b.kind === 'low' && b.d < 2.6) y = 0.9 + 2.0 * Math.cos((b.d / 2.6) * Math.PI / 2);
        else if (b && b.kind === 'high' && b.d < 1.2) y = 0.45;
      }
      const mesh = new THREE.Mesh(kind.geo, kind.mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = i * 0.5;
      this.scene.add(mesh);
      if (!kind.spin) mesh.rotation.y = 0;
      this.list.push({ mesh, x, y, z, lane, phase: i * 0.6, spin: kind.spin });
    }
  }

  // Un train qui arrive "avale" les bonbons de sa voie
  eatBy(train) {
    for (const c of this.list) {
      if (c.mesh.visible && c.lane === train.lane && c.z <= train.zNear && c.z >= train.zFar && c.y < train.top) {
        c.mesh.visible = false;
      }
    }
  }

  update(dt, pz) {
    const t = performance.now() / 1000;
    let j = 0;
    for (const c of this.list) {
      if (c.z > pz + 15) { this.scene.remove(c.mesh); continue; }
      if (c.spin) c.mesh.rotation.y += dt * 3;
      else c.mesh.rotation.set(-0.15, Math.sin(t * 2.5 + c.phase) * 0.55, Math.sin(t * 2 + c.phase) * 0.15);
      c.mesh.position.y = c.y + Math.sin(t * 4 + c.phase) * 0.08;
      this.list[j++] = c;
    }
    this.list.length = j;
  }

  // Renvoie le nombre de bonbons ramassés par le joueur
  collect(p) {
    let got = 0;
    for (const c of this.list) {
      if (!c.mesh.visible) continue;
      if (Math.abs(c.x - p.x) > 0.75 || Math.abs(c.z - p.z) > 0.8) continue;
      if (c.y < p.y - 0.4 || c.y > p.y + p.h + 0.5) continue;
      c.mesh.visible = false;
      got++;
    }
    return got;
  }
}
