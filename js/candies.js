import * as THREE from 'three';
import { Builder, U } from './geo.js';
import { LANES } from './config.js';

export const CANDY_POINTS = 10;
const COLORS = ['#ff6fa5', '#5fd3a5', '#5ab4ff', '#ffd23f', '#b07cff', '#ff9a4a'];
const SPACING = 2.2;

function candyGeo(color) {
  const b = new Builder();
  b.add(U.sph, color, [0, 0, 0], [0.27, 0.21, 0.21]);
  b.add(U.cyl, '#ffffff', [0, 0, 0], [0.215, 0.05, 0.215], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) {
    b.add(U.cone8, color, [sx * 0.33, 0, 0], [0.15, 0.2, 0.15], [0, 0, sx * Math.PI / 2]);
    b.add(U.sph, '#ffffff', [sx * 0.22, 0, 0], [0.04, 0.09, 0.09]);
  }
  return b.build();
}

// Bonbons à ramasser : alignés sur les voies, sur les toits, en arc au-dessus des barrières
export class Candies {
  constructor(scene) {
    this.scene = scene;
    this.geos = COLORS.map(candyGeo);
    const grad = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter;
    grad.needsUpdate = true;
    this.mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, emissive: '#2a1a24' });
    this.list = [];
  }

  reset() {
    for (const c of this.list) this.scene.remove(c.mesh);
    this.list = [];
  }

  // Place une ligne de bonbons dans une voie entre zFrom (proche) et zTo (loin)
  placeTrail(lane, zFrom, zTo, obstacles) {
    const x = LANES[lane];
    const geo = this.geos[(Math.random() * this.geos.length) | 0];
    const n = Math.min(9, Math.floor((zFrom - zTo) / SPACING));
    for (let i = 0; i < n; i++) {
      const z = zFrom - i * SPACING;
      let y = 0.9;
      const g = obstacles.groundAt(x, z);
      if (g > 0) y = g + 0.9;
      else {
        const b = obstacles.barrierNear(lane, z);
        if (b && b.kind === 'low' && b.d < 2.6) y = 0.9 + 2.0 * Math.cos((b.d / 2.6) * Math.PI / 2);
        else if (b && b.kind === 'high' && b.d < 1.2) y = 0.45;
      }
      const mesh = new THREE.Mesh(geo, this.mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = i * 0.5;
      this.scene.add(mesh);
      this.list.push({ mesh, x, y, z, lane, phase: i * 0.6 });
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
      c.mesh.rotation.y += dt * 3;
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
