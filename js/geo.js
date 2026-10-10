import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Géométries unitaires partagées
const roofShape = new THREE.Shape();
roofShape.moveTo(-0.5, 0);
roofShape.lineTo(0.5, 0);
roofShape.lineTo(0, 1);
roofShape.closePath();
const roof = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false });
roof.translate(0, 0, -0.5);

export const U = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cone8: new THREE.ConeGeometry(1, 1, 8),
  sph: new THREE.IcosahedronGeometry(1, 1),
  sph0: new THREE.IcosahedronGeometry(1, 0),
  roof,
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

// Assemble plusieurs primitives colorées en une seule géométrie (1 draw call)
export class Builder {
  constructor() { this.parts = []; }

  add(geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    }
    g.clearGroups();
    _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2]));
    g.applyMatrix4(_m);
    _c.set(color);
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.parts.push(g);
    return this;
  }

  build() {
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    g.computeBoundingSphere();
    return g;
  }
}

export const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const rand = (a, b) => a + Math.random() * (b - a);
