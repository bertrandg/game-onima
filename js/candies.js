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

// Fugu (poisson-globe) : boule tachetée hérissée d'épines, gros yeux, lèvres roses, nageoires
const FUGU_R = 0.42;
const _up = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function fuguGeo() {
  const b = new Builder();
  // corps : dessus fauve, ventre crème
  const body = new THREE.SphereGeometry(FUGU_R, 26, 18).toNonIndexed();
  body.deleteAttribute('uv');
  const pos = body.attributes.position, col = new Float32Array(pos.count * 3);
  const top = new THREE.Color('#c99a62'), belly = new THREE.Color('#f4ecdc'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / FUGU_R;
    c.copy(belly).lerp(top, Math.min(1, Math.max(0, (y - 0.05) / 0.5)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3));
  b.parts.push(body);

  // taches brunes et épines réparties régulièrement (spirale de Fibonacci)
  const N = 90;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    _n.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const face = _n.z > 0.55 && _n.y > -0.45 && _n.y < 0.55;   // laisser le visage dégagé
    if (face) continue;
    _q.setFromUnitVectors(_up, _n);
    _e.setFromQuaternion(_q);
    const rot = [_e.x, _e.y, _e.z];
    if (_n.y < 0.75) b.add(U.sph, '#7a4a2a', [_n.x * FUGU_R * 0.99, _n.y * FUGU_R * 0.99, _n.z * FUGU_R * 0.99], [0.035, 0.012, 0.035], rot);
    b.add(U.cone8, '#fbf6ea', [_n.x * (FUGU_R + 0.035), _n.y * (FUGU_R + 0.035), _n.z * (FUGU_R + 0.035)], [0.018, 0.08, 0.018], rot);
  }
  // yeux
  for (const sx of [-1, 1]) {
    b.add(BALL, '#f2e6c8', [sx * 0.17, 0.12, 0.34], [0.1, 0.1, 0.09]);
    b.add(BALL, '#c99a3a', [sx * 0.17, 0.12, 0.405], [0.07, 0.07, 0.04]);
    b.add(BALL, '#141010', [sx * 0.165, 0.115, 0.43], [0.048, 0.05, 0.03]);
    b.add(BALL, '#ffffff', [sx * 0.15, 0.14, 0.455], [0.015, 0.015, 0.01]);
    // nageoires pectorales translucides
    b.add(U.cone8, '#f2deb0', [sx * 0.44, 0.08, 0.05], [0.13, 0.2, 0.03], [0, 0, -sx * 1.25]);
  }
  // lèvres roses
  b.add(BALL, '#d98c86', [0, -0.08, 0.4], [0.11, 0.055, 0.05]);
  b.add(BALL, '#5a2a2a', [0, -0.08, 0.432], [0.075, 0.025, 0.03]);
  // queue
  b.add(U.cone8, '#e8cf9a', [0, 0.02, -0.47], [0.12, 0.14, 0.03], [Math.PI / 2, 0, 0]);
  return b.build();
}

// Matériaux "toon" à couleurs de sommets partagés par les objets à ramasser de tous les niveaux
const _grad = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat);
_grad.minFilter = _grad.magFilter = THREE.NearestFilter;
_grad.needsUpdate = true;
export function itemMaterial(emissive = '#2a1a24') {
  return new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: _grad, emissive });
}

// Objets du Japon : dango, feuille de shiso, lanterne ; malus : fugu
export function japanItems() {
  const mat = itemMaterial();
  return {
    kinds: [
      { geo: dangoGeo(), mat, spin: true },
      { geo: shisoGeo(), mat, spin: false },   // la feuille se balance face au joueur
      { geo: lanternGeo(), mat: itemMaterial('#6a4a22'), spin: true },   // la lanterne brille doucement
    ],
    hazard: { geo: fuguGeo(), mat },
  };
}

// Objets à ramasser et malus (moteur commun) : sur les voies, les toits, en arc au-dessus des barrières
export class Candies {
  constructor(scene, { kinds, hazard }) {
    this.scene = scene;
    this.kinds = kinds;
    this.list = [];
    this.fugu = hazard;
    this.fugus = [];
  }

  warmupGroup() {
    const g = new THREE.Group();
    this.kinds.forEach((k, i) => { const m = new THREE.Mesh(k.geo, k.mat); m.position.x = i; g.add(m); });
    g.add(this.makeHazard());
    return g;
  }

  // malus : un seul maillage, ou plusieurs pièces aux matériaux différents (verre, liquide lumineux…)
  makeHazard() {
    const H = this.fugu;
    if (!H.parts) return new THREE.Mesh(H.geo, H.mat);
    const g = new THREE.Group();
    for (const p of H.parts) g.add(new THREE.Mesh(p.geo, p.mat));
    return g;
  }

  reset() {
    for (const c of this.list) this.scene.remove(c.mesh);
    for (const f of this.fugus) this.scene.remove(f.mesh);
    this.list = [];
    this.fugus = [];
  }

  // Fugu flottant : jamais sur une rampe ni à côté d'une barrière (toujours évitable en sautant)
  placeFugu(lane, z, obstacles) {
    const x = LANES[lane];
    const g = obstacles.groundAt(x, z);
    if (g > 0 && g < obstacles.trainTop - 0.01) return false;
    const b = obstacles.barrierNear(lane, z);
    if (b && b.d < 4) return false;
    const y = g + 0.95;
    const mesh = this.makeHazard();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.fugus.push({ mesh, x, y, z, lane, phase: Math.random() * 6 });
    return true;
  }

  // Le joueur touche-t-il un fugu ?
  hitFugu(p) {
    for (const f of this.fugus) {
      if (!f.mesh.visible) continue;
      if (Math.abs(f.x - p.x) > FUGU_R + 0.28 || Math.abs(f.z - p.z) > FUGU_R + 0.3) continue;
      const fy = f.mesh.position.y;
      if (fy - FUGU_R * 0.85 < p.y + p.h && fy + FUGU_R * 0.85 > p.y) return f;
    }
    return null;
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

  // Une friandise isolée à une position précise (ex. en arc au-dessus d'un canal)
  placeAt(x, y, z, lane = -1, phase = 0) {
    const kind = this.kinds[(Math.random() * this.kinds.length) | 0];
    const mesh = new THREE.Mesh(kind.geo, kind.mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.list.push({ mesh, x, y, z, lane, phase, spin: kind.spin });
  }

  // Un train qui arrive "avale" les bonbons de sa voie
  eatBy(train) {
    for (const c of this.list) {
      if (c.mesh.visible && c.lane === train.lane && c.z <= train.zNear && c.z >= train.zFar && c.y < train.top && c.y >= 0) {
        c.mesh.visible = false;
      }
    }
    for (const f of this.fugus) {
      if (f.mesh.visible && f.lane === train.lane && f.z <= train.zNear && f.z >= train.zFar && f.y < train.top) f.mesh.visible = false;
    }
  }

  update(dt, pz, player) {
    const t = performance.now() / 1000;
    let j = 0;
    for (const c of this.list) {
      if (c.z > pz + 15) { this.scene.remove(c.mesh); continue; }
      // ramassée : petit "pop", puis elle vole vers l'héroïne en rétrécissant et en tournoyant
      if (c.grab !== undefined) {
        c.grab += dt;
        const k = c.grab / 0.38;
        if (k >= 1) { c.mesh.visible = false; c.grab = undefined; this.list[j++] = c; continue; }
        const pop = k < 0.25 ? 1 + Math.sin((k / 0.25) * Math.PI / 2) * 0.7 : 1.7 * (1 - (k - 0.25) / 0.75);
        c.mesh.scale.setScalar(Math.max(0.01, pop));
        const e = k * k;
        c.mesh.position.set(
          c.x + (player.x - c.x) * e,
          c.y + 0.4 * Math.sin(k * Math.PI) + (player.y + 1.0 - c.y) * e,
          c.z + (player.z - c.z) * e,
        );
        c.mesh.rotation.y += dt * 14;
        this.list[j++] = c;
        continue;
      }
      if (c.spin) c.mesh.rotation.y += dt * 3;
      else c.mesh.rotation.set(-0.15, Math.sin(t * 2.5 + c.phase) * 0.55, Math.sin(t * 2 + c.phase) * 0.15);
      c.mesh.position.y = c.y + Math.sin(t * 4 + c.phase) * 0.08;
      this.list[j++] = c;
    }
    this.list.length = j;

    // fugus : flottent, se gonflent doucement et se dandinent face au joueur
    j = 0;
    for (const f of this.fugus) {
      if (f.z > pz + 15) { this.scene.remove(f.mesh); continue; }
      f.mesh.position.y = f.y + Math.sin(t * 2.2 + f.phase) * 0.12;
      f.mesh.scale.setScalar(1 + Math.sin(t * 3 + f.phase) * 0.06);
      f.mesh.rotation.set(Math.sin(t * 1.7 + f.phase) * 0.12, Math.sin(t * 1.3 + f.phase) * 0.35, Math.sin(t * 2.1 + f.phase) * 0.1);
      this.fugus[j++] = f;
    }
    this.fugus.length = j;
  }

  // Renvoie le nombre de bonbons ramassés par le joueur
  collect(p) {
    let got = 0;
    for (const c of this.list) {
      if (!c.mesh.visible || c.grab !== undefined) continue;
      if (Math.abs(c.x - p.x) > 0.75 || Math.abs(c.z - p.z) > 0.8) continue;
      if (c.y < p.y - 0.4 || c.y > p.y + p.h + 0.5) continue;
      c.grab = 0;   // l'animation de ramassage démarre
      got++;
    }
    return got;
  }
}
