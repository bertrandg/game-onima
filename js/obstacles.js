import * as THREE from 'three';
import { Builder, U, vcMat, pick, rand } from './geo.js';
import { buildTrainKit, buildTrainMesh } from './trains.js';
import {
  LANES, TRAIN_TOP, TRAIN_HALF_W, CAR_LEN, CAR_GAP, RAMP_LEN, MOVING_TRAIN_SPEED,
  SPAWN_AHEAD, DESPAWN_BEHIND,
} from './config.js';

const STEP = 0.5;            // tolérance pour monter sur un toit
const P_HALF_X = 0.32;
const P_HALF_Z = 0.35;

// Kit d'obstacles du Japon : tramways rétro, rampe en bois, tonneaux/tawara/bambou, petit torii
export function japanObstacleKit() {
  const s = {};
  s.trains = buildTrainKit();
  let b;

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
  b = new Builder();   // tonneaux de saké (komodaru) enveloppés de paille
  for (const x of [-0.55, 0.55]) {
    b.add(U.cyl, '#d7bd86', [x, 0.47, 0], [0.42, 0.94, 0.42]);
    for (let i = 0; i < 14; i++) {               // brins de paille verticaux
      const a = (i / 14) * Math.PI * 2;
      b.add(U.box, i % 2 ? '#c8a96c' : '#e2cb94', [x + Math.cos(a) * 0.415, 0.47, Math.sin(a) * 0.415], [0.035, 0.9, 0.02], [0, -a, 0]);
    }
    for (const y of [0.12, 0.32, 0.62, 0.84]) {  // cordes tressées
      b.add(U.cyl, '#6b4a2c', [x, y, 0], [0.44, 0.045, 0.44]);
      b.add(U.cyl, '#8a6440', [x, y + 0.02, 0], [0.442, 0.012, 0.442]);
    }
    b.add(U.cyl, '#8b6a42', [x, 0.95, 0], [0.4, 0.03, 0.4]);
    b.add(U.cyl, '#b48c58', [x, 0.965, 0], [0.33, 0.01, 0.33]);
    // étiquette rouge et blanche avec calligraphie
    b.add(U.box, '#f6f0e2', [x, 0.48, 0.405], [0.4, 0.38, 0.03]);
    b.add(U.box, '#c8302a', [x, 0.48, 0.42], [0.3, 0.3, 0.01]);
    for (const [dx, dy, w, h] of [[0, 0.07, 0.03, 0.16], [-0.06, 0.02, 0.1, 0.025], [0, -0.06, 0.12, 0.025], [0.05, -0.02, 0.025, 0.09]]) {
      b.add(U.box, '#1a1010', [x + dx, 0.48 + dy, 0.428], [w, h, 0.006]);
    }
  }
  s.low.push({ geo: b.build(), depth: 0.84 });

  b = new Builder();   // pile de tawara (sacs de riz en paille tressée), 2 en bas + 1 en haut
  {
    const CAPS = new THREE.CapsuleGeometry(1, 1, 6, 16);
    const tawara = (x, y) => {
      const r = 0.27, len = 0.98;
      b.add(CAPS, '#dcc27e', [x, y, 0], [r, len / 3, r], [0, 0, Math.PI / 2]);   // capsule : hauteur totale 3 avant échelle
      // brins de paille dans la longueur
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        b.add(U.box, i % 2 ? '#c7a85f' : '#ecd79c', [x, y + Math.sin(a) * r * 0.99, Math.cos(a) * r * 0.99], [len * 0.82, 0.018, 0.03], [a, 0, 0]);
      }
      // trois liens de corde
      for (const dx of [-0.3, 0, 0.3]) {
        b.add(U.cyl, '#7a5a32', [x + dx, y, 0], [r + 0.02, 0.05, r + 0.02], [0, 0, Math.PI / 2]);
        b.add(U.cyl, '#9a7444', [x + dx + 0.02, y, 0], [r + 0.025, 0.012, r + 0.025], [0, 0, Math.PI / 2]);
      }
      // couvercles tressés (sandawara) aux deux bouts
      for (const sx of [-1, 1]) {
        const ex = x + sx * (len / 2 - 0.02);
        b.add(U.cyl, '#b48f4a', [ex, y, 0], [r * 0.92, 0.04, r * 0.92], [0, 0, Math.PI / 2]);
        b.add(U.cyl, '#d6b66c', [ex + sx * 0.022, y, 0], [r * 0.7, 0.012, r * 0.7], [0, 0, Math.PI / 2]);
        b.add(U.cyl, '#a07c3c', [ex + sx * 0.03, y, 0], [r * 0.35, 0.012, r * 0.35], [0, 0, Math.PI / 2]);
        b.add(U.cone8, '#c7a85f', [ex + sx * 0.08, y, 0], [0.06, 0.12, 0.06], [0, 0, -sx * Math.PI / 2]);
      }
    };
    tawara(-0.52, 0.27);
    tawara(0.52, 0.27);
    tawara(0, 0.72);
  }
  s.low.push({ geo: b.build(), depth: 0.56 });

  b = new Builder();   // barrière de bambou avec corde sacrée (shimenawa) et papiers (shide)
  for (const x of [-0.95, 0.95]) {
    for (const r of [0.45, -0.45]) b.add(U.cyl6, '#9a7642', [x, 0.55, 0], [0.05, 1.3, 0.05], [0, 0, r]);
    b.add(U.cyl6, '#5a4026', [x, 0.82, 0.0], [0.07, 0.08, 0.07], [Math.PI / 2, 0, 0]);
  }
  for (const y of [0.35, 0.62]) {
    b.add(U.cyl6, '#a7c05e', [0, y, 0.06], [0.07, 2.4, 0.07], [0, 0, Math.PI / 2]);
    for (const nx of [-0.8, -0.2, 0.4, 1.0]) b.add(U.cyl6, '#7f9a3e', [nx, y, 0.06], [0.075, 0.03, 0.075], [0, 0, Math.PI / 2]);
  }
  for (let i = 0; i < 12; i++) {                 // corde torsadée
    const x = -1.1 + i * 0.2;
    b.add(U.sph, i % 2 ? '#d9c690' : '#efe0b4', [x, 0.98 - Math.sin((i / 11) * Math.PI) * 0.06, 0.08], [0.12, 0.075, 0.075], [0, 0, 0.5]);
  }
  for (const x of [-0.6, 0, 0.6]) {             // shide en zigzag
    for (let k = 0; k < 4; k++) b.add(U.box, '#ffffff', [x + (k % 2 ? 0.04 : -0.04), 0.86 - k * 0.075, 0.12], [0.1, 0.07, 0.01]);
  }
  s.low.push({ geo: b.build(), depth: 0.5 });

  // Barrière haute (à glisser dessous) : petit torii vermillon, nuki basse, plaque dorée
  b = new Builder();
  const VER = '#e8502a', VER2 = '#c93d1e', BLACK = '#1f1f22', GOLD = '#d9a93a';
  for (const sx of [-1, 1]) {
    const x = sx * 1.15;
    b.add(U.cyl, VER, [x, 1.3, 0], [0.12, 2.6, 0.12], [0, 0, sx * 0.03]);
    b.add(U.cyl, BLACK, [x, 0.2, 0], [0.15, 0.4, 0.15]);
    b.add(U.cyl, BLACK, [x, 0.42, 0], [0.135, 0.05, 0.135]);
    // cales des extrémités de la nuki
    b.add(U.box, VER2, [x, 1.44, 0.12], [0.1, 0.1, 0.06]);
  }
  // nuki (traverse basse, dépasse des poteaux)
  b.add(U.box, VER, [0, 1.44, 0], [3.0, 0.2, 0.14]);
  // plaque (gakuzuka) dorée au centre
  b.add(U.box, VER, [0, 1.75, 0], [0.12, 0.45, 0.1]);
  b.add(U.box, GOLD, [0, 1.98, 0.02], [0.46, 0.62, 0.07]);
  b.add(U.box, '#2a2016', [0, 1.98, 0.06], [0.34, 0.5, 0.02]);
  for (let k = 0; k < 4; k++) b.add(U.box, '#e6c26a', [0, 2.15 - k * 0.11, 0.075], [0.05 + (k % 2) * 0.08, 0.035, 0.01]);
  for (const [dx, dy] of [[-0.23, 0.31], [0.23, 0.31], [-0.23, -0.31], [0.23, -0.31]]) b.add(U.sph, GOLD, [dx, 1.98 + dy, 0.04], [0.05, 0.05, 0.03]);
  // shimaki (poutre rouge sous le linteau)
  b.add(U.box, VER, [0, 2.44, 0], [3.0, 0.2, 0.22]);
  // kasagi noir aux extrémités relevées
  b.add(U.box, BLACK, [0, 2.6, 0], [2.3, 0.14, 0.3]);
  for (const sx of [-1, 1]) {
    b.add(U.box, BLACK, [sx * 1.45, 2.65, 0], [0.75, 0.14, 0.3], [0, 0, sx * 0.14]);
    b.add(U.box, VER2, [sx * 1.4, 2.53, 0], [0.7, 0.06, 0.24], [0, 0, sx * 0.14]);
  }
  s.highGeo = b.build();

  const T = s.trains;
  return {
    rampGeo: s.rampGeo,
    low: s.low.map((l) => ({ ...l, h: 1.0 })),
    highGeo: s.highGeo,
    hitch: null,   // pas d'attelage devant les trains
    buildVehicle: (cars, moving) => buildTrainMesh(T, moving ? T.express : pick(T.liveries), cars, moving),
    warmup() {
      const g = new THREE.Group();
      [...T.liveries, T.express].forEach((l, i) => {
        const m = buildTrainMesh(T, l, 2, l === T.express);
        m.position.x = i * 3;
        g.add(m);
      });
      return g;
    },
  };
}

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Moteur d'obstacles commun à tous les niveaux ; le contenu visuel vient du kit du niveau
export class Obstacles {
  constructor(scene, { onHorn, candies, kit } = {}) {
    this.scene = scene;
    this.onHorn = onHorn || (() => {});
    this.candies = candies;
    this.trainTop = TRAIN_TOP;
    this.S = kit;
    this.list = [];
    this.reset(0);
  }

  reset(startZ) {
    for (const o of this.list) if (o.mesh) this.scene.remove(o.mesh);
    this.list = [];
    this.cursor = startZ - 70;
    this.busy = [startZ, startZ, startZ];   // z le plus lointain occupé par voie
    this.reserve = null;
    this.lastRowZ = null;
  }

  buildTrain(cars, moving, ramp) {
    const g = this.S.buildVehicle(cars, moving, ramp);
    if (ramp) g.add(new THREE.Mesh(this.S.rampGeo, vcMat));
    return g;
  }

  // Un exemplaire de chaque objet, pour précompiler les shaders et charger les textures au démarrage
  warmupGroup() {
    const S = this.S, g = S.warmup();
    g.add(new THREE.Mesh(S.rampGeo, vcMat));
    for (const l of S.low) g.add(new THREE.Mesh(l.geo, vcMat));
    g.add(new THREE.Mesh(S.highGeo, vcMat));
    return g;
  }

  addTrain(lane, z, cars, ramp, moving) {
    const mesh = this.buildTrain(cars, moving, ramp);
    // un kit peut fournir des véhicules d'autres tailles (ex. taxis plus bas et plus courts)
    const len = mesh.userData.len || cars * CAR_LEN + (cars - 1) * CAR_GAP;
    const top = mesh.userData.top || TRAIN_TOP;
    const rampLen = ramp ? RAMP_LEN : 0;
    const front = z - rampLen;
    mesh.position.set(LANES[lane], 0, front);
    this.scene.add(mesh);
    const o = {
      kind: 'train', lane, x: LANES[lane], halfW: TRAIN_HALF_W, top,
      trainFront: front, zNear: z, zFar: front - len, rampLen, moving,
      v: moving ? MOVING_TRAIN_SPEED : 0, horned: false, mesh,
    };
    this.list.push(o);
    this.busy[lane] = o.zFar;
    // attelage (chevaux) devant un véhicule qui roule vers le joueur : obstacle bas qui avance avec lui
    const H = this.S.hitch;
    if (moving && H) {
      this.list.push({
        kind: 'low', hitch: true, h: H.h, lane, x: LANES[lane], halfW: H.halfW || 0.9,
        zNear: front + H.len, zFar: front, moving: true, v: o.v, mesh: null,
      });
    }
    return o;
  }

  addBarrier(lane, z, kind) {
    let geo, depth, h = 1.0;
    if (kind === 'low') ({ geo, depth, h = 1.0 } = pick(this.S.low));
    else { geo = this.S.highGeo; depth = 0.32; }
    const mesh = new THREE.Mesh(geo, vcMat);
    mesh.position.set(LANES[lane], 0, z - depth / 2);
    this.scene.add(mesh);
    this.list.push({ kind, h, lane, x: LANES[lane], halfW: 1.1, zNear: z, zFar: z - depth, mesh });
    this.busy[lane] = z - depth;
  }

  // Génère une rangée puis une ligne de bonbons entre la rangée précédente et celle-ci
  spawnRow(z, speed, dist) {
    const gap = this.spawnObstacles(z, speed, dist);
    if (this.candies && this.lastRowZ !== null) {
      const zFrom = this.lastRowZ - 1, zTo = z - 3;
      const lanes = [0, 1, 2].filter((l) => !(this.reserve && this.reserve.lane === l)
        && !this.list.some((o) => o.moving && o.lane === l));
      let trailLane = -1;
      if (lanes.length && Math.random() < 0.65) {
        trailLane = lanes[(Math.random() * lanes.length) | 0];
        this.candies.placeTrail(trailLane, zFrom, zTo, this);
      }
      // fugu, bien plus rare que les friandises, jamais dans la voie des friandises
      const fuguLanes = lanes.filter((l) => l !== trailLane);
      if (dist > 150 && fuguLanes.length && Math.random() < 0.07 + 0.07 * Math.min(1, dist / 3000) && zFrom - zTo > 6) {
        const fz = zFrom - 3 - Math.random() * (zFrom - zTo - 6);
        this.candies.placeFugu(fuguLanes[(Math.random() * fuguLanes.length) | 0], fz, this);
      }
    }
    this.lastRowZ = z;
    return gap;
  }

  // Barrière la plus proche d'un point dans une voie
  barrierNear(lane, z) {
    let best = null;
    for (const o of this.list) {
      if (o.lane !== lane || o.hitch || (o.kind !== 'low' && o.kind !== 'high')) continue;
      const d = Math.abs(z - (o.zNear + o.zFar) / 2);
      if (!best || d < best.d) best = { kind: o.kind, d };
    }
    return best;
  }

  // Génère une "rangée" d'obstacles en z, renvoie l'espacement jusqu'à la suivante
  spawnObstacles(z, speed, dist) {
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
      o.zNear += d; o.zFar += d;
      if (o.kind !== 'train') continue;   // attelage : suit son véhicule, sans maillage propre
      o.trainFront += d;
      o.mesh.position.z = o.trainFront;
      if (this.candies) this.candies.eatBy(o);
    }
  }

  update(pz, speed, dist) {
    while (this.cursor > pz - SPAWN_AHEAD) this.cursor -= this.spawnRow(this.cursor, speed, dist);

    for (const o of this.list) {
      if (o.moving && o.kind === 'train' && !o.horned && o.trainFront > pz - 110) { o.horned = true; this.onHorn(); }
    }
    const limit = pz + DESPAWN_BEHIND;
    let j = 0;
    for (const o of this.list) {
      if (o.zFar > limit) { if (o.mesh) this.scene.remove(o.mesh); }
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
        if (p.y < (o.h || 1.0)) crash = o;
      } else if (o.kind === 'high') {
        if (p.y + p.h > 1.32 && p.y < 2.75) crash = o;   // nuki basse : passer en roulade
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
