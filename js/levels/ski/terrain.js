import * as THREE from 'three';
import { Builder, U, rand, pick } from '../../geo.js';
import { loadPlants, addPlant } from '../../plants.js';
import { bendMaterial } from './bend.js';
import { flatMat, jalonGeo, SNOW, SNOW_SHADE } from './kit.js';
import { corduroy, powder } from './textures.js';

await loadPlants('ski');   // sapins, rochers, pylône et siège de télésiège (models/ski) avant la construction du décor

export const PISTE_HALF = 6.5;   // la piste (six voies de 1,8 m) et ses bords damés
const CHUNK = 32;

// Relief hors-piste (repère plat du jeu) : petit bourrelet laissé par la dameuse au bord de la piste, puis la
// pente qui remonte vers la forêt, avec des vagues de neige
export function terrainH(x, z) {
  const ax = Math.abs(x);
  if (ax <= PISTE_HALF) return 0;
  const e = ax - PISTE_HALF;
  const berm = 0.32 * Math.sin(Math.min(1, e / 1.6) * Math.PI) * (e < 1.6 ? 1 : 0);
  const rise = 0.16 * Math.pow(Math.max(0, e - 1.2), 1.32);
  const k = Math.min(1, Math.max(0, (e - 2) / 10));
  const wave = (Math.sin(x * 0.21 + z * 0.043) + Math.sin(z * 0.093 - x * 0.13) * 0.7 + Math.sin(x * 0.05 + z * 0.021) * 1.6) * 0.9 * k;
  return berm + rise + wave;
}

// ---------- Matières ----------
const pisteTex = corduroy(), powderTex = powder();
const pisteMat = bendMaterial(new THREE.MeshLambertMaterial({ map: pisteTex, vertexColors: true }));
const powderMat = bendMaterial(new THREE.MeshLambertMaterial({ map: powderTex, vertexColors: true }));
export const terrainMats = [pisteMat, powderMat];

// ---------- Éléments de décor préparés au chargement (hauteur 1, recolorés) ----------
const GREENS = ['#1f4a32', '#24553a', '#2a5a3a', '#1a4030', '#2f6040'];
function pine(snow, green) {
  const b = new Builder();
  addPlant(b, 's_pine', [0, 0, 0], 1, (role, part, i, up) => {
    if (role === 0) return '#5a3a28';
    return up > snow ? (up > snow + 0.25 ? '#f6f9ff' : '#dde8f6') : green;
  });
  return b.build();
}
function snowyPine() {
  const b = new Builder();
  addPlant(b, 's_pinesnow', [0, 0, 0], 1, (role, part, i, up) => (role === 2 ? (up > 0.5 ? '#eef4fc' : '#24553a') : role === 1 ? '#f4f8fd' : '#5a3a28'));
  return b.build();
}
function pineCluster() {
  const b = new Builder();
  addPlant(b, 's_pines', [0, 0, 0], 1, (role, part, i, up) => (role === 0 ? '#4a3020' : up > 0.4 ? '#eef4fc' : pick(GREENS)));
  return b.build();
}
// sapin lointain très simple : trois cônes de feuillage enneigés
function farPine() {
  const b = new Builder();
  b.add(U.cyl6, '#4a3020', [0, 0.08, 0], [0.04, 0.16, 0.04]);
  [[0.15, 0.32, 0.42], [0.42, 0.26, 0.34], [0.66, 0.2, 0.26]].forEach(([y, r, h], k) => {
    b.add(U.cone8, k % 2 ? '#1f4a32' : '#24553a', [0, y + h / 2, 0], [r, h, r]);
    b.add(U.cone8, '#eef4fc', [0, y + h * 0.78, 0], [r * 0.55, h * 0.45, r * 0.55]);
  });
  return b.build();
}
const rockPaint = (base) => (role, part, i, up) => (up > 0.6 ? (up > 0.82 ? SNOW : '#e2eaf6') : base[part % base.length]);
function rock(key, base) {
  const b = new Builder();
  addPlant(b, key, [0, 0, 0], 1, rockPaint(base));
  return b.build();
}
// canon à neige : perche inclinée vers la piste, lance au bout, socle
function snowGun() {
  const b = new Builder();
  b.add(U.box, '#3a3f4a', [0, 0.15, 0], [0.6, 0.3, 0.6]);
  b.add(U.cyl, '#d8dce4', [0.9, 3.0, 0], [0.07, 6.3, 0.07], [0, 0, 0.3]);
  b.add(U.cyl, '#ffd23f', [1.9, 6.1, 0], [0.12, 0.9, 0.12], [0, 0, 1.0]);
  b.add(U.cyl, '#1a1a1e', [2.25, 5.9, 0], [0.14, 0.12, 0.14], [0, 0, 1.0]);
  b.add(U.cyl, '#e8302a', [0.1, 0.9, 0], [0.05, 1.2, 0.05]);
  b.add(U.box, '#3a8aff', [0.1, 1.2, 0.08], [0.2, 0.3, 0.06]);
  return b.build();
}
// chalet d'altitude : bois sombre, toit enneigé, balcon, terrasse et parasols
function chalet() {
  const b = new Builder();
  const W = 9, D = 7, WOOD = '#6a4028', DARK = '#3a2418';
  b.add(U.box, '#8a8a8a', [0, 0.6, 0], [W + 0.4, 1.2, D + 0.4]);
  b.add(U.box, WOOD, [0, 2.8, 0], [W, 3.4, D]);
  for (let y = 1.4; y < 4.4; y += 0.35) b.add(U.box, DARK, [0, y, D / 2 + 0.01], [W, 0.04, 0.02]);
  for (const x of [-2.8, 0, 2.8]) {
    b.add(U.box, '#ffe9b0', [x, 2.6, D / 2 + 0.03], [1.2, 1.1, 0.04]);
    b.add(U.box, '#2a6a3a', [x - 0.8, 2.6, D / 2 + 0.05], [0.35, 1.2, 0.04]);
    b.add(U.box, '#2a6a3a', [x + 0.8, 2.6, D / 2 + 0.05], [0.35, 1.2, 0.04]);
  }
  b.add(U.box, DARK, [0, 3.9, D / 2 + 0.6], [W, 0.1, 1.2]);
  for (let x = -W / 2 + 0.2; x <= W / 2; x += 0.45) b.add(U.box, WOOD, [x, 4.25, D / 2 + 1.15], [0.08, 0.6, 0.05]);
  b.add(U.roof, '#7a4a30', [0, 4.5, 0], [W + 2, 2.6, D + 1.6]);
  b.add(U.roof, SNOW, [0, 4.72, 0], [W + 2.1, 2.5, D + 1.7]);
  b.add(U.box, '#6a6a6a', [2.5, 6.2, -1], [0.7, 1.6, 0.7]);
  b.add(U.box, SNOW, [2.5, 7.05, -1], [0.8, 0.12, 0.8]);
  // terrasse
  b.add(U.box, '#8a5a38', [0, 0.65, D / 2 + 3.2], [W, 0.15, 4.4]);
  for (const x of [-3, 0, 3]) {
    b.add(U.cyl, '#d8d8d8', [x, 1.8, D / 2 + 3.3], [0.04, 2.2, 0.04]);
    b.add(U.cone8, x ? '#e8302a' : '#ffffff', [x, 2.95, D / 2 + 3.3], [1.4, 0.5, 1.4]);
    b.add(U.box, '#6a4028', [x, 1.1, D / 2 + 3.3], [1.0, 0.06, 0.8]);
  }
  return b.build();
}
// poste de secours des pisteurs : petite cabane, croix blanche sur fond rouge
function patrolHut() {
  const b = new Builder();
  b.add(U.box, '#c8302a', [0, 1.3, 0], [3, 2.6, 2.6]);
  b.add(U.box, '#ffffff', [0, 1.7, 1.31], [0.9, 0.25, 0.02]);
  b.add(U.box, '#ffffff', [0, 1.7, 1.31], [0.25, 0.9, 0.02]);
  b.add(U.roof, '#5a3a28', [0, 2.6, 0], [3.6, 1.2, 3.2]);
  b.add(U.roof, SNOW, [0, 2.72, 0], [3.7, 1.1, 3.3]);
  b.add(U.box, '#4a3020', [1.0, 0.9, 1.31], [0.7, 1.7, 0.03]);
  return b.build();
}
// filet de protection orange le long du bord (8 m)
function sideNet() {
  const b = new Builder();
  for (let z = 0; z <= 8; z += 2) b.add(U.cyl, '#2a2a30', [0, 1.0, -z], [0.04, 2.0, 0.04]);
  for (let y = 0.3; y <= 1.9; y += 0.4) b.add(U.box, '#ff6a00', [0, y, -4], [0.02, 0.03, 8]);
  for (let z = 0.25; z < 8; z += 0.5) b.add(U.box, '#ff8a2a', [0, 1.1, -z], [0.015, 1.6, 0.02]);
  return b.build();
}

const E = {};
function prebuild() {
  E.pines = [pine(0.3, GREENS[0]), pine(0.42, GREENS[1]), pine(0.55, GREENS[2]), pine(0.36, GREENS[3])];
  E.snowPine = snowyPine();
  E.cluster = pineCluster();
  E.far = farPine();
  E.rocks = [
    rock('s_rock1', ['#7a8090', '#8a90a0', '#6a7080']),
    rock('s_rock2', ['#6a7282', '#7c8494', '#5c6474']),
    rock('s_rock3', ['#8a8e98', '#767c88', '#9aa0aa']),
  ];
  E.jalonL = jalonGeo(false);
  E.jalonR = jalonGeo(true);
  E.gun = snowGun();
  E.chalet = chalet();
  E.hut = patrolHut();
  E.net = sideNet();
}
prebuild();
export const decorElements = E;

// ---------- Fusion incrémentale (quelques éléments par image, jamais d'à-coup) ----------
function startJob(parts) {
  let n = 0;
  for (const p of parts) n += p.geo.attributes.position.count;
  return { parts, i: 0, o: 0, P: new Float32Array(n * 3), N: new Float32Array(n * 3), C: new Float32Array(n * 3) };
}
function mergeNext(job) {
  const { geo, x0, y0, z0, rot, sc, tint } = job.parts[job.i++];
  const pa = geo.attributes.position.array, na = geo.attributes.normal.array, ca = geo.attributes.color.array;
  const c = Math.cos(rot), s = Math.sin(rot), P = job.P, N = job.N, C = job.C, o = job.o;
  for (let i = 0; i < pa.length; i += 3) {
    const x = pa[i], z = pa[i + 2], nx = na[i], nz = na[i + 2];
    P[o + i] = (c * x + s * z) * sc + x0;
    P[o + i + 1] = pa[i + 1] * sc + y0;
    P[o + i + 2] = (c * z - s * x) * sc + z0;
    N[o + i] = c * nx + s * nz;
    N[o + i + 1] = na[i + 1];
    N[o + i + 2] = c * nz - s * nx;
    C[o + i] = ca[i] * tint; C[o + i + 1] = ca[i + 1] * tint; C[o + i + 2] = ca[i + 2] * Math.min(1, tint * 1.02);
  }
  job.o += pa.length;
  return job.i >= job.parts.length;
}

// ---------- Sol d'une tranche ----------
const XS = [6.5, 6.9, 7.4, 8.0, 9.0, 10.5, 12.5, 15, 18, 22, 27, 33, 40, 48, 58, 70, 85, 100];
const _c = new THREE.Color(), _w = new THREE.Color(SNOW), _b = new THREE.Color('#b8c8e4');
function sideGeo(side, z0) {
  const nz = 16, pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) {
    const z = z0 - (j / nz) * CHUNK;
    for (const ax of XS) {
      const x = side * ax;
      pos.push(x, terrainH(x, z), z);
      uv.push(x / 7, z / 7);
    }
  }
  const w = XS.length;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i, b = a + 1, d = a + w, e = d + 1;
      if (side > 0) idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // pentes raides plus bleutées (ombre propre de la neige)
  const nrm = g.attributes.normal, col = new Float32Array(nrm.count * 3);
  for (let i = 0; i < nrm.count; i++) {
    _c.copy(_w).lerp(_b, Math.min(1, (1 - nrm.getY(i)) * 1.8));
    col.set([_c.r, _c.g, _c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function pisteGeo(z0) {
  const g = new THREE.PlaneGeometry(PISTE_HALF * 2, CHUNK, 8, 16);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, z0 - CHUNK / 2);
  const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    uv.setXY(i, x / 2, z / 4);
    // bords un peu plus tassés et bleutés, longues zones plus ou moins skiées
    const e = Math.max(0, (Math.abs(x) - 5.2) / 1.3);
    const k = 0.04 + 0.04 * Math.sin(z * 0.05) + e * 0.3;
    _c.copy(_w).lerp(_b, k);
    col.set([_c.r, _c.g, _c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------- Décor d'une tranche ----------
function decorParts(z0) {
  const parts = [];
  const zEnd = z0 - CHUNK;
  const put = (geo, x, z, sc, rot = rand(0, 6.28), sink = 0, tint = rand(0.94, 1.04)) => {
    parts.push({ geo, x0: x, y0: terrainH(x, z) - sink, z0: z, rot, sc, tint });
  };
  for (const s of [-1, 1]) {
    // jalons tous les 12 m (alignés sur le monde, d'une tranche à l'autre)
    for (let z = Math.ceil(zEnd / 12) * 12; z <= z0; z += 12) put(s > 0 ? E.jalonR : E.jalonL, s * 6.8, z, 1, 0, 0.05, 1);
    // une construction ou un équipement de temps en temps, avant la forêt (on ne plante pas d'arbre dessus)
    const keepOut = [];
    const r = Math.random();
    if (r < 0.05) {
      const x = s * rand(17, 21), z = z0 - rand(8, 24);
      put(E.chalet, x, z, 1, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.6, 1);
      keepOut.push([x, z, 12]);
    } else if (r < 0.1) {
      const x = s * rand(9.5, 11), z = z0 - rand(4, 28);
      put(E.hut, x, z, 1, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.3, 1);
      keepOut.push([x, z, 4]);
    } else if (r < 0.3) {
      const z = z0 - rand(2, 30);
      put(E.gun, s * 7.4, z, 1, s > 0 ? Math.PI : 0, 0, 1);
      keepOut.push([s * 8.5, z, 3]);
    } else if (r < 0.42) {
      const z = z0 - rand(0, 24);
      put(E.net, s * 7.05, z, 1, 0, 0.1, 1);
    }
    const free = (x, z, rad = 0) => keepOut.every(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) > kr + rad);
    // rochers au bord, à moitié enfouis
    for (let z = z0 - rand(0, 10); z > zEnd; z -= rand(7, 16)) {
      if (Math.random() < 0.55) continue;
      const x = s * rand(7.8, 13), sc = rand(0.7, 2.2);
      if (free(x, z, sc)) put(pick(E.rocks), x, z, sc, undefined, sc * 0.25);
    }
    // forêt proche : grands sapins enneigés, avec des clairières
    const clear = Math.sin(z0 * 0.013 + s * 2) > 0.55;
    for (let z = z0 - rand(0, 3); z > zEnd; z -= rand(2.2, clear ? 9 : 4.5)) {
      const x = s * rand(8.8, 22), h = rand(5.5, 11.5);
      if (!free(x, z, 1.5)) continue;
      put(Math.random() < 0.12 ? E.snowPine : pick(E.pines), x, z, h, undefined, 0.2);
    }
    // forêt plus loin, sur la pente qui remonte
    for (let z = z0 - rand(0, 3); z > zEnd; z -= rand(1.8, 3.6)) {
      const x = s * rand(22, 46);
      if (!free(x, z, 1.5)) continue;
      // au-delà de 32 m, des sapins simplifiés suffisent (on les voit de loin, dans la brume)
      if (Math.abs(x) > 32) put(E.far, x, z, rand(10, 16), undefined, 0.3);
      else if (Math.random() < 0.2) put(E.cluster, x, z, rand(4, 7), undefined, 0.2);
      else put(pick(E.pines), x, z, rand(8, 15), undefined, 0.3);
    }
    // lointain : silhouettes simples
    for (let z = z0 - rand(0, 2); z > zEnd; z -= rand(1.4, 3)) put(E.far, s * rand(46, 92), z, rand(9, 16), undefined, 0.3);
  }
  return parts;
}

// ---------- Gestion des tranches ----------
export class SkiTerrain {
  constructor(root) {
    this.root = root;
    this.chunks = [];
    this.jobs = [];
  }

  reset(startZ) {
    for (const c of this.chunks) this.drop(c);
    this.chunks = [];
    this.jobs = [];
    this.cursor = Math.ceil((startZ + 64) / CHUNK) * CHUNK;
    this.update(startZ, true);
  }

  drop(c) {
    this.root.remove(c.group);
    c.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  build(z0) {
    const group = new THREE.Group();
    for (const [g, m] of [[pisteGeo(z0), pisteMat], [sideGeo(-1, z0), powderMat], [sideGeo(1, z0), powderMat]]) {
      const mesh = new THREE.Mesh(g, m);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    this.root.add(group);
    const c = { group, z0, zEnd: z0 - CHUNK };
    this.chunks.push(c);
    this.jobs.push({ c, job: startJob(decorParts(z0)) });
  }

  processJobs(budget) {
    const t0 = performance.now();
    while (this.jobs.length) {
      const { c, job } = this.jobs[0];
      if (!job.parts.length || mergeNext(job)) {
        this.jobs.shift();
        if (job.parts.length) {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(job.P, 3));
          g.setAttribute('normal', new THREE.BufferAttribute(job.N, 3));
          g.setAttribute('color', new THREE.BufferAttribute(job.C, 3));
          const m = new THREE.Mesh(g, flatMat);
          m.frustumCulled = false;
          c.group.add(m);
        }
      }
      if (performance.now() - t0 > budget) break;
    }
  }

  update(pz, instant = false) {
    while (this.cursor > pz - 330) {
      this.build(this.cursor);
      this.cursor -= CHUNK;
    }
    this.processJobs(instant ? Infinity : 2.5);
    let j = 0;
    for (const c of this.chunks) {
      if (c.zEnd > pz + 45) {
        this.drop(c);
        const k = this.jobs.findIndex((x) => x.c === c);
        if (k >= 0) this.jobs.splice(k, 1);
      } else this.chunks[j++] = c;
    }
    this.chunks.length = j;
  }
}
