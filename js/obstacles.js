import * as THREE from 'three';
import { Builder, U, vcMat, pick, rand } from './geo.js';
import * as TX from './textures.js';
import {
  LANES, TRAIN_TOP, TRAIN_HALF_W, CAR_LEN, CAR_GAP, RAMP_LEN, MOVING_TRAIN_SPEED,
  SPAWN_AHEAD, DESPAWN_BEHIND,
} from './config.js';

const LIVERIES = [
  { body: '#f1e9d2', stripe: '#c8323c', stripe2: '#c8323c' },   // crème et rouge
  { body: '#3f8f5c', stripe: '#f08a2a', stripe2: '#f6c27a' },   // vert et orange
  { body: '#e6e8ea', stripe: '#2f8c8a', stripe2: '#7cc6c0' },   // gris et turquoise
];
const EXPRESS = { body: '#f7f8fa', stripe: '#1e5bbf', stripe2: '#5aa0e6' }; // trains en mouvement

const STEP = 0.5;            // tolérance pour monter sur un toit
const P_HALF_X = 0.32;
const P_HALF_Z = 0.35;

function liveryMats(l, moving) {
  const side = new THREE.MeshLambertMaterial({ map: TX.trainSideTexture(l) });
  const front = new THREE.MeshLambertMaterial({ map: TX.trainFrontTexture(l, moving) });
  const end = new THREE.MeshLambertMaterial({ color: l.body });
  return {
    lead: [side, side, end, end, front, end],
    mid: [side, side, end, end, end, end],
  };
}

function buildShared() {
  const s = {};
  s.liveries = LIVERIES.map((l) => liveryMats(l, false));
  s.express = liveryMats(EXPRESS, true);
  s.carGeo = new THREE.BoxGeometry(TRAIN_HALF_W * 2, 2.15, CAR_LEN);
  s.roofMat = new THREE.MeshLambertMaterial({ color: '#9da3a8' });
  s.roofGeo = new THREE.BoxGeometry(2.0, 0.1, CAR_LEN - 0.4);
  s.lightGeo = new THREE.BoxGeometry(0.34, 0.2, 0.06);
  s.lightMat = new THREE.MeshBasicMaterial({ color: '#fffbe0' });

  let b = new Builder();
  b.add(U.box, '#2d2f33', [0, 0.27, 0], [1.8, 0.4, CAR_LEN - 1.4]);
  for (const zz of [CAR_LEN / 2 - 1.3, CAR_LEN / 2 - 2.2, -CAR_LEN / 2 + 1.3, -CAR_LEN / 2 + 2.2]) {
    for (const x of [-0.75, 0.75]) b.add(U.cyl, '#1d1e21', [x, 0.3, zz], [0.3, 0.14, 0.3], [0, 0, Math.PI / 2]);
  }
  s.underGeo = b.build();

  b = new Builder();
  b.add(U.box, '#3a3a3e', [0, 1.3, 0], [1.4, 1.8, CAR_GAP + 0.1]);
  s.connGeo = b.build();

  // Rampe en bois : du sol (z = RAMP_LEN) au toit (z = 0)
  b = new Builder();
  const L = Math.hypot(RAMP_LEN, TRAIN_TOP);
  const a = Math.atan2(TRAIN_TOP, RAMP_LEN);
  b.add(U.box, '#b07a43', [0, TRAIN_TOP / 2, RAMP_LEN / 2], [2.0, 0.14, L], [a, 0, 0]);
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    b.add(U.box, '#7d5530', [0, TRAIN_TOP * (1 - t) + 0.08, RAMP_LEN * t], [2.02, 0.05, 0.1], [a, 0, 0]);
  }
  for (const x of [-1.02, 1.02]) b.add(U.box, '#8c5f33', [x, TRAIN_TOP / 2 + 0.12, RAMP_LEN / 2], [0.1, 0.22, L], [a, 0, 0]);
  for (const t of [0.25, 0.5]) {
    const h = TRAIN_TOP * (1 - t);
    for (const x of [-0.85, 0.85]) b.add(U.box, '#6b4a2a', [x, h / 2, RAMP_LEN * t], [0.14, h, 0.14]);
  }
  s.rampGeo = b.build();

  // Barrières basses (à sauter)
  s.low = [];
  b = new Builder();   // tonneaux de saké
  for (const x of [-0.55, 0.55]) {
    b.add(U.cyl, '#c39a62', [x, 0.475, 0], [0.42, 0.95, 0.42]);
    for (const y of [0.15, 0.8]) b.add(U.cyl, '#5a4430', [x, y, 0], [0.435, 0.07, 0.435]);
    b.add(U.cyl, '#d9b47c', [x, 0.96, 0], [0.38, 0.02, 0.38]);
    b.add(U.box, '#f4efe6', [x, 0.5, 0.38], [0.42, 0.36, 0.08]);
    b.add(U.cyl, '#d23b3b', [x, 0.5, 0.43], [0.1, 0.02, 0.1], [Math.PI / 2, 0, 0]);
  }
  s.low.push({ geo: b.build(), depth: 0.84 });
  b = new Builder();   // bottes de paille
  for (const x of [-0.55, 0.55]) {
    b.add(U.cyl, '#e3c66f', [x, 0.45, 0], [0.45, 1.05, 0.45], [0, 0, Math.PI / 2]);
    for (const dx of [-0.25, 0.25]) b.add(U.cyl, '#a48c4a', [x + dx, 0.45, 0], [0.46, 0.05, 0.46], [0, 0, Math.PI / 2]);
  }
  s.low.push({ geo: b.build(), depth: 0.9 });
  b = new Builder();   // barrière de bambou avec corde sacrée
  for (const x of [-0.95, 0.95]) {
    b.add(U.box, '#8c6a3c', [x, 0.55, 0], [0.08, 1.25, 0.08], [0, 0, 0.45]);
    b.add(U.box, '#8c6a3c', [x, 0.55, 0], [0.08, 1.25, 0.08], [0, 0, -0.45]);
  }
  for (const y of [0.4, 0.7]) b.add(U.cyl6, '#a7c05e', [0, y, 0.05], [0.07, 2.4, 0.07], [0, 0, Math.PI / 2]);
  b.add(U.cyl6, '#e8dcb5', [0, 0.98, 0.05], [0.07, 2.4, 0.07], [0, 0, Math.PI / 2]);
  for (const x of [-0.6, 0, 0.6]) b.add(U.box, '#ffffff', [x, 0.8, 0.1], [0.12, 0.28, 0.02]);
  s.low.push({ geo: b.build(), depth: 0.5 });

  // Barrière haute (à glisser dessous) : portique avec noren
  b = new Builder();
  for (const x of [-1.22, 1.22]) b.add(U.cyl, '#d6452f', [x, 1.5, 0], [0.1, 3, 0.1]);
  b.add(U.box, '#2a2a2a', [0, 3.02, 0], [2.95, 0.2, 0.32]);
  b.add(U.box, '#d6452f', [0, 2.82, 0], [2.6, 0.15, 0.22]);
  b.add(U.box, '#3a2a20', [0, 2.46, 0], [2.4, 0.06, 0.06]);
  for (const x of [-0.74, 0, 0.74]) b.add(U.box, '#2c3c78', [x, 1.86, 0], [0.7, 1.15, 0.05]);
  b.add(U.cyl6, '#f4f1ea', [0, 2.05, 0.03], [0.17, 0.02, 0.17], [Math.PI / 2, 0, 0]);
  s.highGeo = b.build();
  return s;
}

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export class Obstacles {
  constructor(scene, { onHorn } = {}) {
    this.scene = scene;
    this.onHorn = onHorn || (() => {});
    this.S = buildShared();
    this.list = [];
    this.reset(0);
  }

  reset(startZ) {
    for (const o of this.list) this.scene.remove(o.mesh);
    this.list = [];
    this.cursor = startZ - 70;
    this.busy = [startZ, startZ, startZ];   // z le plus lointain occupé par voie
    this.reserve = null;
  }

  buildTrain(cars, moving, ramp) {
    const S = this.S;
    const mats = moving ? S.express : pick(S.liveries);
    const g = new THREE.Group();
    for (let i = 0; i < cars; i++) {
      const z0 = -i * (CAR_LEN + CAR_GAP);
      const zc = z0 - CAR_LEN / 2;
      const body = new THREE.Mesh(S.carGeo, i === 0 ? mats.lead : mats.mid);
      body.position.set(0, 0.35 + 1.075, zc);
      const roof = new THREE.Mesh(S.roofGeo, S.roofMat);
      roof.position.set(0, 2.55, zc);
      const under = new THREE.Mesh(S.underGeo, vcMat);
      under.position.z = zc;
      g.add(body, roof, under);
      if (i > 0) {
        const c = new THREE.Mesh(S.connGeo, vcMat);
        c.position.z = z0 + CAR_GAP / 2;
        g.add(c);
      }
    }
    if (moving) {
      for (const x of [-0.7, 0.7]) {
        const l = new THREE.Mesh(S.lightGeo, S.lightMat);
        l.position.set(x, 1.5, 0.03);
        g.add(l);
      }
    }
    if (ramp) g.add(new THREE.Mesh(S.rampGeo, vcMat));
    return g;
  }

  addTrain(lane, z, cars, ramp, moving) {
    const len = cars * CAR_LEN + (cars - 1) * CAR_GAP;
    const rampLen = ramp ? RAMP_LEN : 0;
    const front = z - rampLen;
    const mesh = this.buildTrain(cars, moving, ramp);
    mesh.position.set(LANES[lane], 0, front);
    this.scene.add(mesh);
    const o = {
      kind: 'train', lane, x: LANES[lane], halfW: TRAIN_HALF_W, top: TRAIN_TOP,
      trainFront: front, zNear: z, zFar: front - len, rampLen, moving,
      v: moving ? MOVING_TRAIN_SPEED : 0, horned: false, mesh,
    };
    this.list.push(o);
    this.busy[lane] = o.zFar;
    return o;
  }

  addBarrier(lane, z, kind) {
    let geo, depth;
    if (kind === 'low') ({ geo, depth } = pick(this.S.low));
    else { geo = this.S.highGeo; depth = 0.32; }
    const mesh = new THREE.Mesh(geo, vcMat);
    mesh.position.set(LANES[lane], 0, z - depth / 2);
    this.scene.add(mesh);
    this.list.push({ kind, lane, x: LANES[lane], halfW: 1.1, zNear: z, zFar: z - depth, mesh });
    this.busy[lane] = z - depth;
  }

  // Génère une "rangée" d'obstacles en z, renvoie l'espacement jusqu'à la suivante
  spawnRow(z, speed, dist) {
    const diff = Math.min(1, dist / 2500);
    const rowGap = Math.max(15, speed * 1.1) + rand(0, 8) * (1 - diff * 0.5);
    const minGap = Math.max(7, speed * 0.55);

    // Train en approche : on lui a réservé une voie vide en amont
    if (this.reserve && z <= this.reserve.until) {
      this.addTrain(this.reserve.lane, z, randInt(1, 3), false, true);
      this.reserve = null;
      return rowGap;
    }
    if (!this.reserve && dist > 120 && Math.random() < 0.05 + 0.07 * diff) {
      const lane = randInt(0, 2);
      const safe = lane === 1 ? pick([0, 2]) : 1;
      this.reserve = { lane, safe, until: z - 170 };
    }
    const res = this.reserve;

    if (Math.random() < 0.12) return rowGap * 0.6;   // respiration

    const free = [];
    let covered = 0;
    for (let l = 0; l < 3; l++) {
      if (this.busy[l] < z) covered++;
      else if (this.busy[l] - z >= minGap) free.push(l);
    }
    for (let i = free.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [free[i], free[j]] = [free[j], free[i]];
    }

    const r = Math.random();
    const count = r < 0.45 ? 1 : r < 0.88 ? 2 : 3;
    let placed = 0;
    for (const l of free) {
      if (placed >= count) break;
      if (res && l === res.lane) continue;
      const onlyBarrier = res && l === res.safe;
      const pTrain = onlyBarrier ? 0 : 0.42 + 0.1 * diff;
      if (Math.random() < pTrain) {
        const cars = 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.3 * diff ? 1 : 0);
        // jamais 3 voies bloquées par des trains sans rampe d'accès
        const ramp = covered + 1 >= 3 || Math.random() < 0.35;
        this.addTrain(l, z, cars, ramp, false);
        covered++;
      } else {
        this.addBarrier(l, z, dist > 100 && Math.random() < 0.45 ? 'high' : 'low');
      }
      placed++;
    }
    return rowGap;
  }

  move(dt) {
    for (const o of this.list) {
      if (!o.moving) continue;
      const d = o.v * dt;
      o.zNear += d; o.zFar += d; o.trainFront += d;
      o.mesh.position.z = o.trainFront;
    }
  }

  update(pz, speed, dist) {
    while (this.cursor > pz - SPAWN_AHEAD) this.cursor -= this.spawnRow(this.cursor, speed, dist);

    for (const o of this.list) {
      if (o.moving && !o.horned && o.trainFront > pz - 110) { o.horned = true; this.onHorn(); }
    }
    const limit = pz + DESPAWN_BEHIND;
    let j = 0;
    for (const o of this.list) {
      if (o.zFar > limit) this.scene.remove(o.mesh);
      else this.list[j++] = o;
    }
    this.list.length = j;
  }

  // Collision : renvoie la hauteur du sol sous le joueur et l'obstacle percuté éventuel
  resolve(p) {
    let ground = 0, crash = null;
    const zMin = p.z - P_HALF_Z, zMax = p.z + P_HALF_Z;
    for (const o of this.list) {
      if (Math.abs(p.x - o.x) > o.halfW + P_HALF_X) continue;
      if (zMin > o.zNear || zMax < o.zFar) continue;
      if (o.kind === 'train') {
        if (zMin <= o.trainFront) {
          if (p.y >= o.top - STEP) ground = Math.max(ground, o.top);
          else crash = o;
        } else {
          const h = o.top * Math.min(1, Math.max(0, (o.zNear - p.z) / o.rampLen));
          if (p.y >= h - 1.0) ground = Math.max(ground, h);
          else crash = o;
        }
      } else if (o.kind === 'low') {
        if (p.y < 1.0) crash = o;
      } else if (o.kind === 'high') {
        if (p.y + p.h > 1.28 && p.y < 3.1) crash = o;
      }
    }
    return { ground, crash };
  }

  // Hauteur du sol sous un point (pour l'ombre)
  groundAt(x, z, margin = 0) {
    let g = 0;
    for (const o of this.list) {
      if (o.kind !== 'train' || Math.abs(x - o.x) > o.halfW + margin) continue;
      if (z <= o.trainFront + margin && z >= o.zFar - margin) g = Math.max(g, o.top);
      else if (z > o.trainFront && z <= o.zNear) g = Math.max(g, o.top * (o.zNear - z) / o.rampLen);
    }
    return g;
  }
}
