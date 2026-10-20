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

// Panneaux plats texturés (façades, affiches…), regroupés par matériau. Un panneau est construit face à +x
// (texte lisible depuis la voie quand l'élément est à gauche), centré en p, de taille [largeur en z, hauteur].
// uv = [u0, v0, u1, v1] dans la texture ; color teinte le panneau (le matériau doit avoir vertexColors).
const _pg = new THREE.PlaneGeometry(1, 1);
export class TexBuilder {
  constructor() { this.parts = {}; }

  quad(key, p, size, uv = [0, 0, 1, 1], color = '#ffffff', rotY = Math.PI / 2) {
    const g = _pg.clone();
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(0, rotY, 0)), _s.set(size[0], size[1], 1));
    g.applyMatrix4(_m);
    _c.set(color);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    (this.parts[key] ||= []).push(g);
    return this;
  }

  // façade qui se répète : la texture couvre tileW × tileH mètres
  facade(key, p, size, tileW, tileH, color, u0 = 0) {
    return this.quad(key, p, size, [u0, 0, u0 + size[0] / tileW, size[1] / tileH], color);
  }

  build() {
    const out = [];
    for (const k of Object.keys(this.parts)) {
      out.push({ key: k, geo: mergeGeometries(this.parts[k], false) });
      this.parts[k].forEach((g) => g.dispose());
    }
    this.parts = {};
    return out;
  }
}
