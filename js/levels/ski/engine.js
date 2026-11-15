import * as THREE from 'three';
import { JUMP_V, SPAWN_AHEAD, DESPAWN_BEHIND } from '../../config.js';
import { rand, pick } from '../../geo.js';
import { updateBend, bendAt, view, newTrack, bendObject, bendMaterial, trackY } from './bend.js';
import {
  flatMat, kickerMesh, kickLen, kickProfile, KICK_H, bumpGeo, bumpProfile, BUMP_L, railMesh, RAIL_TOP,
  buildSkiers, pylonGeo, chairGeo, PYLON_H, archMesh, ARCH_LOW, fenceGeo, FENCE_H, signMesh, snowcatGeo, smoothMat,
} from './kit.js';
import { SkiTerrain } from './terrain.js';
import { trailTex, puffTex } from './textures.js';

// La piste de ski : six voies sans marquage, entre les jalons. On glisse (pas de course), on change de voie
// par un virage, et on ne saute que depuis une bosse ou un tremplin : plus on saute tard (au bord du
// tremplin, au sommet de la bosse), plus le saut est ample. Un saut parfait au tremplin atteint la barre
// de slide posée en hauteur derrière lui. Obstacles : skieurs arrêtés, pylônes de télésiège (protégés par
// des matelas), panneaux, filets à sauter depuis les bosses, arches à passer en position de recherche,
// dameuse qui remonte la piste. Un couloir praticable est toujours gardé d'une rangée à l'autre.

export const LANE_W = 1.8;
export const SKI_LANES = [-4.5, -2.7, -0.9, 0.9, 2.7, 4.5];
export const START_LANE = 2;
const NL = SKI_LANES.length;
const P_HALF_X = 0.32, P_HALF_Z = 0.35;
const CAT_V = 7;              // vitesse de la dameuse qui remonte (m/s)
const JUMP_WINDOW = 2.5;      // on peut encore sauter un peu après le bord du tremplin (mètres)
export const LIFT_EVERY = 48; // écart entre deux pylônes d'un même télésiège

// ---------- Projections de neige (particules) ----------
class Spray {
  constructor(root, n = 600) {
    this.n = n;
    this.pos = new Float32Array(n * 3).fill(-9999);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n);
    this.col = new Float32Array(n * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    this.geo = g;
    this.points = new THREE.Points(g, bendMaterial(new THREE.PointsMaterial({
      size: 0.26, map: puffTex(), vertexColors: true, transparent: true, depthWrite: false,
    })));
    this.points.frustumCulled = false;
    root.add(this.points);
    this.i = 0;
  }

  reset() { this.life.fill(0); this.pos.fill(-9999); this.geo.attributes.position.needsUpdate = true; }

  emit(x, y, z, vx, vy, vz, spread, life) {
    const i = this.i;
    this.i = (i + 1) % this.n;
    this.pos[i * 3] = x + (Math.random() - 0.5) * spread;
    this.pos[i * 3 + 1] = y + Math.random() * spread * 0.3;
    this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
    this.vel[i * 3] = vx * (0.6 + Math.random() * 0.8);
    this.vel[i * 3 + 1] = vy * (0.5 + Math.random() * 0.9);
    this.vel[i * 3 + 2] = vz + (Math.random() - 0.5) * 2;
    this.life[i] = this.max[i] = life * (0.6 + Math.random() * 0.6);
  }

  update(dt) {
    const p = this.pos, v = this.vel, c = this.col;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { c[i * 4 + 3] = 0; continue; }
      this.life[i] -= dt;
      const j = i * 3;
      v[j + 1] -= 9 * dt;
      const drag = 1 - dt * 2.2;
      v[j] *= drag; v[j + 2] *= drag;
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      const k = this.life[i] / this.max[i];
      c[i * 4] = c[i * 4 + 1] = 1; c[i * 4 + 2] = 1;
      c[i * 4 + 3] = Math.max(0, Math.min(1, k * 1.6)) * 0.7;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

// ---------- Traces de skis laissées dans la neige (deux sillons qui suivent la trajectoire) ----------
class Trail {
  constructor(root, n = 280) {
    this.n = n;
    this.pts = [];
    const v = n * 4;   // deux sillons × deux bords
    this.P = new Float32Array(v * 3);
    this.C = new Float32Array(v * 4);
    const uv = new Float32Array(v * 2), idx = [];
    for (let i = 0; i < n; i++) {
      for (let s = 0; s < 2; s++) {
        const o = i * 4 + s * 2;
        uv.set([0, i * 0.5, 1, i * 0.5], o * 2);
        if (i < n - 1) idx.push(o, o + 1, o + 4, o + 1, o + 5, o + 4);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.P, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.C, 4));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geo = g;
    // sans éclairage (le ruban n'a pas de normales) : teinte proche de la neige éclairée
    this.mesh = new THREE.Mesh(g, bendMaterial(new THREE.MeshBasicMaterial({
      map: trailTex(), color: '#dfe7f3', vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    })));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    root.add(this.mesh);
  }

  reset() { this.pts = []; this.C.fill(0); this.geo.attributes.color.needsUpdate = true; }

  // un point tous les 0,35 m : position des skis, largeur (plus large en virage), visible ou non (en l'air)
  add(x, y, z, on, carve) {
    const last = this.pts[0];
    if (last && Math.abs(last.z - z) < 0.35 && Math.abs(last.x - x) < 0.35) {
      last.on = last.on && on;
      return;
    }
    this.pts.unshift({ x, y, z, on, w: 0.075 + carve * 0.05 });
    if (this.pts.length > this.n) this.pts.length = this.n;
  }

  update() {
    const P = this.P, C = this.C, pts = this.pts, n = this.n;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      for (let s = 0; s < 2; s++) {
        const o = (i * 4 + s * 2);
        if (!p) { C[o * 4 + 3] = C[o * 4 + 7] = 0; continue; }
        // direction de la trace : vers le point suivant (ou précédent)
        const q = pts[i + 1] || pts[i - 1] || p;
        let dx = p.x - q.x, dz = p.z - q.z;
        const L = Math.hypot(dx, dz) || 1;
        dx /= L; dz /= L;
        const nx = -dz, nz = dx;   // perpendiculaire au sol
        const off = (s ? 1 : -1) * 0.13;
        const cx = p.x + nx * off, cz = p.z + nz * off;
        P.set([cx - nx * p.w, p.y + 0.012, cz - nz * p.w, cx + nx * p.w, p.y + 0.012, cz + nz * p.w], o * 3);
        const a = p.on ? Math.min(1, (n - i) / 50) * 0.85 : 0;
        C.set([1, 1, 1, a, 1, 1, 1, a], o * 4);
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

// ---------- Ligne de télésiège : câbles et sièges qui défilent au-dessus d'une voie ----------
class LiftLine {
  constructor(parent, K, x, zStart, zEnd) {
    this.parent = parent;
    this.x = x;
    this.zStart = zStart;
    this.zEnd = zEnd;
    const len = zStart - zEnd;
    this.group = new THREE.Group();
    const seg = Math.max(4, Math.ceil(len / 5));
    const cable = new THREE.BoxGeometry(0.05, 0.05, len, 1, 1, seg);
    this.cable = cable;
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(cable, K.cableMat);
      m.position.set(x + sx * 2.05, PYLON_H - 0.45, zStart - len / 2);
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.count = Math.ceil(len / 13) * 2;
    this.chairs = new THREE.InstancedMesh(K.chair, flatMat, this.count);
    this.chairs.frustumCulled = false;
    this.group.add(this.chairs);
    parent.add(this.group);
    this.t = Math.random() * 13;
    this.update(0);
  }

  update(dt) {
    this.t += dt * 4.5;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const half = this.count / 2, len = this.zStart - this.zEnd;
    for (let k = 0; k < this.count; k++) {
      const up = k < half, i = up ? k : k - half;
      // un côté monte (vers +z), l'autre redescend
      const along = ((i * 13 + (up ? this.t : -this.t)) % len + len) % len;
      p.set(this.x + (up ? 2.05 : -2.05), PYLON_H - 0.45, this.zEnd + along);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, up ? 0 : Math.PI);
      m.compose(p, q, s);
      this.chairs.setMatrixAt(k, m);
    }
    this.chairs.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.parent.remove(this.group);
    this.cable.dispose();
    this.chairs.dispose();
  }
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class SkiObstacles {
  constructor(root, opts = {}) {
    this.root = root;
    this.scene = new THREE.Group();
    root.add(this.scene);
    this.candies = opts.candies;
    this.sound = opts.sound;
    this.world = opts.world;
    this.girl = opts.girl;
    this.fog = opts.fog;
    this.onHorn = opts.onHorn || (() => {});
    this.trainTop = 99;
    this.K = {
      skiers: buildSkiers(), pylon: pylonGeo(), chair: chairGeo(), fence: fenceGeo(), cat: snowcatGeo(),
      cableMat: bendMaterial(new THREE.MeshLambertMaterial({ color: '#2a2a30' })), kickers: {},
    };
    this.terrain = new SkiTerrain(root);
    this.trail = new Trail(root);
    this.spray = new Spray(root);
    // ombre du joueur et neige qui tombe : déformées comme le reste
    if (this.world) {
      if (this.world.shadow) bendObject(this.world.shadow);
      if (this.world.petals) bendObject(this.world.petals);
    }
    this.toastEl = typeof document !== 'undefined' && document.getElementById ? document.getElementById('toast') : null;
    this.list = [];
    this.lifts = [];
    this.reset(0);
  }

  reset(startZ) {
    for (const o of this.list) this.dropObj(o);
    for (const l of this.lifts || []) l.dispose();
    this.list = [];
    this.lifts = [];
    this.cursor = startZ - 70;
    this.busy = new Array(NL).fill(startZ);
    this.reserve = null;
    this.catRes = null;
    this.lift = null;
    this.safe = START_LANE;
    this.lastRowZ = null;
    this.lastFeature = startZ;
    this.speed = 0;
    this.spot = null;
    this.lastSpot = null;
    this.grind = null;
    this.air = 0;
    this.wasGrounded = true;
    this.prevX = null;
    this.yaw = 0;
    this.turn = 0;
    this.spin = 0;
    this.flip = 0;
    this.trickAir = false;
    this.trick = null;
    this.queue = [];
    this.done = [];
    this.u0 = -startZ;
    newTrack();
    updateBend(startZ);
    this.altStart = trackY(-startZ);
    this.hud = this.altText(startZ);
    this.terrain.reset(startZ);
    this.trail.reset();
    this.spray.reset();
  }

  dropObj(o) {
    if (!o.mesh) return;
    this.scene.remove(o.mesh);
    if (o.own) o.mesh.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
  }

  altText(pz) {
    const alt = Math.max(1035, Math.round((3300 + (trackY(-pz) - this.altStart)) / 5) * 5);
    return `⛰ Altitude ${alt.toLocaleString('fr-FR')} m`;
  }

  // ---------- Pose des objets ----------
  addObj(o) {
    if (o.mesh) {
      o.mesh.traverse((m) => { m.frustumCulled = false; });
      this.scene.add(o.mesh);
    }
    this.list.push(o);
    return o;
  }

  addSkier(lane, z, kind = null) {
    const S = this.K.skiers;
    const k = kind || (Math.random() < 0.62 ? 'stand' : Math.random() < 0.6 ? 'sit' : 'kid');
    const v = pick(S[k]);
    let rot = k === 'sit' ? pick([0, Math.PI]) : pick([0, Math.PI, Math.PI / 2, -Math.PI / 2]);
    const across = Math.abs(Math.sin(rot)) > 0.5;
    const w = across ? v.d : v.w, d = across ? v.w : v.d;
    const mesh = new THREE.Mesh(v.geo, flatMat);
    mesh.position.set(SKI_LANES[lane], 0, z - d / 2);
    mesh.rotation.y = rot;
    this.busy[lane] = Math.min(this.busy[lane] ?? z, z - d);
    return this.addObj({ kind: 'wall', what: 'skier', lane, x: SKI_LANES[lane], halfW: Math.min(0.85, w / 2), zNear: z, zFar: z - d, top: v.h, mesh });
  }

  addSign(lane, z) {
    const mesh = signMesh();
    mesh.position.set(SKI_LANES[lane], 0, z - 0.25);
    this.busy[lane] = z - 0.5;
    return this.addObj({ kind: 'wall', what: 'sign', lane, x: SKI_LANES[lane], halfW: 0.55, zNear: z, zFar: z - 0.5, top: 1.45, mesh, own: false });
  }

  addFence(lane, z) {
    const mesh = new THREE.Mesh(this.K.fence, flatMat);
    mesh.position.set(SKI_LANES[lane], 0, z - 0.15);
    this.busy[lane] = z - 0.3;
    return this.addObj({ kind: 'low', what: 'fence', h: FENCE_H, lane, x: SKI_LANES[lane], halfW: 0.9, zNear: z, zFar: z - 0.3, mesh });
  }

  addPylon(lane, z) {
    const mesh = new THREE.Mesh(this.K.pylon, flatMat);
    mesh.position.set(SKI_LANES[lane], 0, z - 0.62);
    this.busy[lane] = z - 1.25;
    return this.addObj({ kind: 'wall', what: 'pylon', lane, x: SKI_LANES[lane], halfW: 0.62, zNear: z, zFar: z - 1.25, top: 99, mesh });
  }

  // arche gonflable sur toute la largeur : à passer en position de recherche (↓)
  addArch(z) {
    const mesh = archMesh();
    mesh.position.set(0, 0, z - 0.2);
    for (let l = 0; l < NL; l++) {
      this.addObj({ kind: 'high', what: 'arch', lane: l, x: SKI_LANES[l], halfW: 0.9, zNear: z, zFar: z - 0.4, mesh: l ? null : mesh, own: !l });
      this.busy[l] = z - 0.4;
    }
  }

  addKicker(lane, z, speed) {
    const L = Math.round(kickLen(speed));
    const proto = (this.K.kickers[L] ||= kickerMesh(L));
    const mesh = proto.clone();
    mesh.position.set(SKI_LANES[lane], 0, z);
    this.busy[lane] = z - L;
    return this.addObj({ kind: 'kicker', lane, x: SKI_LANES[lane], halfW: 0.85, zNear: z, zFar: z - L, L, mesh });
  }

  // bosses sur les voies a…b (contiguës)
  addBumps(a, b, z) {
    const n = b - a + 1;
    const mesh = new THREE.Mesh(bumpGeo(n), smoothMat);
    mesh.position.set((SKI_LANES[a] + SKI_LANES[b]) / 2, 0, z);
    for (let l = a; l <= b; l++) {
      this.addObj({ kind: 'bump', lane: l, x: SKI_LANES[l], halfW: 0.9, zNear: z, zFar: z - BUMP_L, mesh: l === a ? mesh : null });
      this.busy[l] = z - BUMP_L;
    }
  }

  addRail(lane, z, L) {
    const mesh = railMesh(L);
    mesh.position.set(SKI_LANES[lane], 0, z);
    return this.addObj({ kind: 'rail', lane, x: SKI_LANES[lane], halfW: 0.45, zNear: z, zFar: z - L, top: RAIL_TOP, mesh, own: true });
  }

  // dameuse qui remonte la piste sur deux voies voisines
  addCat(lanes, z) {
    const x = (SKI_LANES[lanes[0]] + SKI_LANES[lanes[1]]) / 2;
    const mesh = new THREE.Mesh(this.K.cat, flatMat);
    mesh.position.set(x, 0, z - 3.2);
    for (const l of lanes) this.busy[l] = Math.min(this.busy[l] ?? z, z - 6.4);
    return this.addObj({ kind: 'wall', what: 'cat', lane: lanes[0], lanes, x, halfW: 1.75, zNear: z, zFar: z - 6.4, top: 3.0, mesh, moving: true, v: CAT_V, horned: false });
  }

  placeCandy(lane, y, z) {
    const C = this.candies;
    if (!C) return;
    C.placeAt(SKI_LANES[lane], y, z, lane);
    const c = C.list[C.list.length - 1];
    if (c) c.mesh.frustumCulled = false;
  }

  placeHazard(lane, z) {
    const C = this.candies;
    if (!C) return;
    const x = SKI_LANES[lane], y = this.groundAt(x, z) + 0.95;
    const mesh = C.makeHazard();
    mesh.traverse((m) => { m.frustumCulled = false; });
    mesh.position.set(x, y, z);
    C.scene.add(mesh);
    C.fugus.push({ mesh, x, y, z, lane, phase: Math.random() * 6 });
  }

  // une voie est-elle libre d'objets fixes entre z1 (proche) et z2 (loin) ?
  laneClear(l, z1, z2) {
    return !this.list.some((o) => (o.lane === l || (o.lanes && o.lanes.includes(l))) && o.kind !== 'rail' && o.zFar <= z1 && o.zNear >= z2);
  }

  // ---------- Génération ----------
  blocked(l) {
    return (this.lift && this.lift.lane === l) || (this.catRes && this.catRes.lanes.includes(l));
  }

  spawnRow(z, speed, dist) {
    const diff = Math.min(1, dist / 3000);
    let gap = Math.max(17, speed * 1.15) + rand(0, 9) * (1 - diff * 0.4);
    const minGap = Math.max(8, speed * 0.6);
    const free = (l) => !this.blocked(l) && (this.busy[l] === undefined || this.busy[l] - z >= minGap);

    // fin d'un télésiège, arrivée de la dameuse réservée
    if (this.lift && z < this.lift.end) this.lift = null;
    if (this.catRes && z <= this.catRes.until) {
      this.addCat(this.catRes.lanes, z);
      this.catRes = null;
    }

    // le couloir praticable se déplace d'une ou deux voies au plus d'une rangée à l'autre
    const reach = gap / speed > 0.85 ? 2 : 1;
    const cands = [];
    for (let l = Math.max(0, this.safe - reach); l <= Math.min(NL - 1, this.safe + reach); l++) if (!this.blocked(l)) cands.push(l);
    if (cands.length) {
      // il revient volontiers vers le milieu de la piste
      const w = cands.map((l) => (l === this.safe ? 1.6 : 1) * (l >= 1 && l <= 4 ? 1.3 : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      this.safe = cands[cands.length - 1];
      for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) { this.safe = cands[i]; break; } }
    }
    const safe = this.safe;

    // nouveau télésiège (pylônes dans une voie, tous les 48 m) ; nouvelle dameuse (dans deux voies du bord)
    if (!this.lift && dist > 350 && Math.random() < 0.07) {
      const ls = [1, 2, 3, 4].filter((l) => Math.abs(l - safe) >= 1 && !this.blocked(l));
      if (ls.length) {
        const lane = pick(ls), end = z - rand(170, 270);
        this.lift = { lane, next: z, end };
        this.lifts.push(new LiftLine(this.scene, this.K, SKI_LANES[lane], z + 30, end - 30));
      }
    }
    if (!this.catRes && dist > 600 && !this.list.some((o) => o.what === 'cat') && Math.random() < 0.05) {
      const pairs = [[0, 1], [4, 5]].filter((p) => !p.includes(safe) && !p.some((l) => this.lift && this.lift.lane === l));
      if (pairs.length) this.catRes = { lanes: pick(pairs), until: z - 170 };
    }
    if (this.lift && z <= this.lift.next) {
      if (this.busy[this.lift.lane] === undefined || this.busy[this.lift.lane] - z >= 4) this.addPylon(this.lift.lane, z);
      this.lift.next = z - LIFT_EVERY;
    }

    let extra = 0;
    const sinceFeature = this.lastFeature - z;
    const r = Math.random();
    if (dist > 150 && sinceFeature > 60 && r < 0.22 && free(safe)) {
      extra = this.kickerFeature(z, speed, dist, safe, free);
    } else if (dist > 120 && sinceFeature > 45 && r < 0.4 && !this.lift && !this.catRes) {
      extra = this.mogulFeature(z, speed, safe, free);
    } else if (dist > 220 && sinceFeature > 60 && r < 0.41 && !this.lift && !this.catRes && [...Array(NL).keys()].every((l) => this.busy[l] === undefined || this.busy[l] - z >= 4)) {
      this.addArch(z);
      this.lastFeature = z;
      this.placeCandy(safe, 0.5, z + 0.1);
    } else if (Math.random() < 0.1) {
      this.scatterBumps(z, safe, free);   // respiration : juste des bosses
    } else {
      this.obstacleRow(z, diff, safe, free, 1 + (Math.random() < 0.55) + (Math.random() < 0.25 + 0.35 * diff) + (diff > 0.5 && Math.random() < 0.3));
      if (Math.random() < 0.8) this.scatterBumps(z, safe, free);
    }

    this.rowCandies(z, dist, diff, safe);
    this.lastRowZ = z;
    return gap + extra;
  }

  obstacleRow(z, diff, safe, free, count) {
    const lanes = [];
    for (let l = 0; l < NL; l++) if (l !== safe && free(l)) lanes.push(l);
    for (let i = lanes.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [lanes[i], lanes[j]] = [lanes[j], lanes[i]]; }
    let placed = 0;
    for (const l of lanes) {
      if (placed >= count) break;
      if (this.busy[l] !== undefined && this.busy[l] < z + 0.5) continue;   // déjà pris dans cette rangée
      const r = Math.random();
      if (r < 0.16 && l + 1 < NL && l + 1 !== safe && lanes.includes(l + 1) && !(this.busy[l + 1] < z + 0.5)) {
        // deux amis arrêtés côte à côte pour discuter
        this.addSkier(l, z, 'stand');
        this.addSkier(l + 1, z - rand(0, 0.6), Math.random() < 0.5 ? 'stand' : 'kid');
        placed += 2;
      } else if (r < 0.72) { this.addSkier(l, z); placed++; }
      else if (r < 0.86) { this.addSign(l, z); placed++; }
      else { this.addFence(l, z); placed++; }
    }
  }

  // bosses isolées sur une à trois voies libres (souvent dans le couloir), friandises au-dessus
  scatterBumps(z, safe, free) {
    const bz = z - rand(6, 10);
    const ok = (l) => l >= 0 && l < NL && free(l) && (this.busy[l] === undefined || this.busy[l] > z + 0.5) && this.laneClear(l, bz + 1, bz - BUMP_L - 1);
    const a = Math.random() < 0.6 && ok(safe) ? safe : pick([0, 1, 2, 3, 4, 5].filter(ok).concat([-1]));
    if (a < 0) return;
    let b = a;
    const n = (Math.random() * 3) | 0;
    for (let i = 0; i < n && ok(b + 1); i++) b++;
    this.addBumps(a, b, bz);
    if (Math.random() < 0.5) {
      const l = a + ((Math.random() * (b - a + 1)) | 0);
      for (let i = 0; i < 3; i++) this.placeCandy(l, 2.2 + (i === 1 ? 0.5 : 0), bz - BUMP_L / 2 - 3 - i * 2.4);
    }
  }

  // tremplin dans le couloir (ou à côté), barre de slide derrière, friandises en l'air
  kickerFeature(z, speed, dist, safe, free) {
    const others = [safe - 1, safe + 1].filter((l) => l >= 0 && l < NL && free(l));
    const lane = Math.random() < 0.7 || !others.length ? safe : pick(others);
    const k = this.addKicker(lane, z, speed);
    const lip = k.zFar;
    let end = lip - Math.max(18, speed * 0.9);
    if (dist > 250 && Math.random() < 0.65) {
      const start = lip - Math.max(5, speed * 0.25), len = Math.max(26, speed * 1.4);
      this.addRail(lane, start, len);
      for (let zz = start - 2; zz > start - len + 1; zz -= 2.4) this.placeCandy(lane, RAIL_TOP + 0.9, zz);
      end = start - len - 4;
    } else {
      // arc de friandises au-dessus de la réception : seul un beau saut les attrape
      for (let i = 1; i <= 6; i++) {
        const t = (i * 2.4) / speed;
        this.placeCandy(lane, Math.max(1.0, KICK_H + 17 * t - 26 * t * t + 0.5), lip - i * 2.4);
      }
    }
    this.busy[lane] = end;
    // un second tremplin à côté, parfois
    const o2 = [lane - 1, lane + 1].filter((l) => l >= 0 && l < NL && free(l) && l !== safe);
    if (o2.length && Math.random() < 0.3) { const l2 = pick(o2); this.addKicker(l2, z - rand(0, 3), speed); this.busy[l2] = lip - Math.max(18, speed * 0.9); }
    // et des obstacles ailleurs
    this.obstacleRow(z, 0, safe, (l) => free(l) && l !== lane && Math.abs(l - lane) > 1, 1 + (Math.random() < 0.5));
    this.lastFeature = z;
    return 6;
  }

  // bosses sur toute la largeur, puis un filet à sauter (le couloir reste ouvert)
  mogulFeature(z, speed, safe, free) {
    const ok = [];
    for (let l = 0; l < NL; l++) if (free(l)) ok.push(l);
    if (ok.length < 3) return 0;
    // bosses par groupes de voies contiguës
    let a = ok[0];
    for (let i = 1; i <= ok.length; i++) {
      if (i === ok.length || ok[i] !== ok[i - 1] + 1) { this.addBumps(a, ok[i - 1], z); a = ok[i]; }
    }
    const fz = z - BUMP_L / 2 - Math.max(3, speed * 0.12);
    const fenced = ok.filter((l) => l !== safe);
    for (const l of fenced) this.addFence(l, fz);
    // friandises en arc au-dessus d'un filet
    if (fenced.length) {
      const l = pick(fenced);
      for (let i = -2; i <= 2; i++) this.placeCandy(l, 2.3 - Math.abs(i) * 0.35, fz - i * 2.2);
    }
    this.lastFeature = z;
    return 10;
  }

  rowCandies(z, dist, diff, safe) {
    if (!this.candies || this.lastRowZ === null) return;
    const zFrom = this.lastRowZ - 2.5, zTo = z + 2.5;
    if (zFrom - zTo < 6) return;
    let trail = -1;
    if (Math.random() < 0.7) {
      const ls = [...Array(NL).keys()].filter((l) => !this.blocked(l) && this.laneClear(l, zFrom + 1, zTo - 1));
      if (ls.length) {
        trail = ls.includes(safe) && Math.random() < 0.45 ? safe : pick(ls);
        const n = Math.min(5, Math.floor((zFrom - zTo) / 2.2));
        const start = zFrom - Math.random() * Math.max(0, zFrom - zTo - n * 2.2);
        for (let i = 0; i < n; i++) {
          const zz = start - i * 2.2;
          this.placeCandy(trail, this.groundAt(SKI_LANES[trail], zz) + 0.9, zz);
        }
      }
    }
    if (dist > 150 && Math.random() < 0.08 + 0.07 * diff && zFrom - zTo > 12) {
      const hz = (zFrom + zTo) / 2;
      const ls = [...Array(NL).keys()].filter((l) => l !== safe && l !== trail && !this.blocked(l) && this.laneClear(l, hz + 5, hz - 5));
      if (ls.length) this.placeHazard(pick(ls), hz);
    }
  }

  // ---------- Déroulement ----------
  move(dt) {
    for (const o of this.list) {
      if (!o.moving) continue;
      const d = o.v * dt;
      o.zNear += d; o.zFar += d;
      if (o.mesh) o.mesh.position.z += d;
    }
  }

  update(pz, speed, dist) {
    this.speed = speed;
    while (this.cursor > pz - SPAWN_AHEAD) this.cursor -= this.spawnRow(this.cursor, speed, dist);
    for (const o of this.list) {
      if (o.moving && !o.horned && o.zNear > pz - 110) { o.horned = true; this.onHorn(); }
    }
    const limit = pz + DESPAWN_BEHIND;
    let j = 0;
    for (const o of this.list) {
      if (o.zFar > limit) this.dropObj(o);
      else this.list[j++] = o;
    }
    this.list.length = j;
    this.lifts = this.lifts.filter((l) => {
      if (l.zEnd > pz + 40) { l.dispose(); return false; }
      return true;
    });
    this.terrain.update(pz);
    this.hud = this.altText(pz);
  }

  // ---------- Collisions ----------
  resolve(p) {
    let ground = 0, crash = null, spot = null, grind = null;
    const zMin = p.z - P_HALF_Z, zMax = p.z + P_HALF_Z;
    for (const o of this.list) {
      const dx = Math.abs(p.x - o.x);
      if (dx > o.halfW + P_HALF_X || zMin > o.zNear || zMax < o.zFar) continue;
      if (o.kind === 'kicker' || o.kind === 'bump') {
        if (dx > o.halfW) continue;
        const L = o.kind === 'kicker' ? o.L : BUMP_L;
        const t = clamp01((o.zNear - p.z) / L);
        const h = o.kind === 'kicker' ? kickProfile(t) : bumpProfile(t);
        if (h > ground) ground = h;
        if (p.y <= h + 0.12 && (!spot || h > spot.h)) spot = { kind: o.kind, t, o, h };
      } else if (o.kind === 'rail') {
        if (dx < 0.45 && p.y >= o.top - 0.35 && p.vy <= 0.5) { ground = Math.max(ground, o.top); grind = o; }
      } else if (o.kind === 'low') {
        if (p.y < o.h) crash = o;
      } else if (o.kind === 'high') {
        if (p.y + p.h > ARCH_LOW && p.y < ARCH_LOW + 1.0) crash = o;
      } else if (p.y < o.top - 0.15) crash = o;
    }
    // bord du tremplin passé sans sauter : petit envol naturel
    const ls = this.lastSpot;
    if (!spot && ls && ls.kind === 'kicker' && ls.t > 0.9 && p.z < ls.o.zFar + 0.3 && p.vy <= 0 && p.y > 0.6) {
      p.vy = Math.max(p.vy, this.speed * 0.2);
    }
    if (spot) this.spot = spot;
    else if (this.spot && p.z < this.spot.o.zFar - JUMP_WINDOW) this.spot = null;
    this.lastSpot = spot;
    this.grind = grind && Math.abs(p.y - grind.top) < 0.06 ? grind : null;
    return { ground, crash };
  }

  // on ne saute que sur une bosse ou un tremplin (ou juste après son bord)
  canJump(p) {
    const s = this.spot;
    return !!s && p.z > s.o.zFar - JUMP_WINDOW && p.y <= s.h + 0.5 + Math.max(0, s.o.zFar - p.z);
  }

  // amplitude du saut : plus on saute tard (bord du tremplin, sommet de la bosse), plus on monte
  jumpBoost(p) {
    const s = this.spot;
    if (!s) return JUMP_V;
    let k, perfect;
    if (s.kind === 'kicker') {
      const t = p.z < s.o.zFar ? 1 : s.t;
      k = 0.6 + 0.55 * t * t;
      perfect = t > 0.86;
    } else {
      const t = Math.min(1, s.t / 0.5);
      k = 0.62 + 0.38 * t;
      perfect = t > 0.8;
    }
    this.lastJump = { kind: s.kind, k, perfect };
    if (perfect) this.toast(s.kind === 'kicker' ? '✨ Saut parfait !' : '👍 Bien sauté !');
    // en l'air, les directions font des figures (et plus des changements de voie)
    this.trickAir = true;
    this.trick = null;
    this.queue = [];
    this.done = [];
    this.spot = null;
    return JUMP_V * k;
  }

  groundAt(x, z, margin = 0) {
    let g = 0;
    for (const o of this.list) {
      if (Math.abs(x - o.x) > o.halfW + margin || z > o.zNear + margin || z < o.zFar - margin) continue;
      if (o.kind === 'kicker') g = Math.max(g, kickProfile(clamp01((o.zNear - z) / o.L)));
      else if (o.kind === 'bump') g = Math.max(g, bumpProfile(clamp01((o.zNear - z) / BUMP_L)));
      else if (o.kind === 'rail' && this.grind === o) g = Math.max(g, o.top);
    }
    return g;
  }

  barrierNear() { return null; }

  // ---------- Figures : ← → vrille (360), ↑ salto arrière, ↓ salto avant ; elles s'enchaînent ----------
  airTime(p) {
    const g = 26;   // GRAVITY / 2
    return (p.vy + Math.sqrt(Math.max(0, p.vy * p.vy + 4 * g * Math.max(0, p.y)))) / (2 * g);
  }

  airInput(p, dir) {
    if (!this.trickAir || p.grounded) return false;
    const left = this.airTime(p);
    if (this.trick) {
      if (this.queue.length < 2) this.queue.push(dir);
    } else if (left > 0.3) this.startTrick(dir, left);
    return true;   // la touche est prise par la figure, même trop tard pour en faire une
  }

  startTrick(dir, left) {
    this.trick = { dir, t: 0, dur: Math.min(0.7, Math.max(0.3, left * 0.85)) };
  }

  laneTarget(p, d) { return this.trickAir && !p.grounded ? p.lane : p.lane + d; }

  // avance la figure en cours ; renvoie la vrille et le salto à appliquer à l'héroïne
  updateTrick(dt, p) {
    const T = this.trick;
    this.spin = 0;
    this.flip = 0;
    if (!T) return;
    T.t += dt;
    const k = Math.min(1, T.t / T.dur), a = (1 - Math.cos(k * Math.PI)) * Math.PI;   // départ et fin en douceur
    if (T.dir === 'left') this.spin = a;
    else if (T.dir === 'right') this.spin = -a;
    else if (T.dir === 'up') this.flip = a;
    else this.flip = -a;
    if (k >= 1) {
      this.done.push(T.dir);
      this.trick = null;
      const next = this.queue.shift();
      const left = this.airTime(p);
      if (next && left > 0.3) this.startTrick(next, left);
      else this.queue = [];
    }
  }

  // à la réception : nom des figures réussies (une figure inachevée ne compte pas)
  landTricks() {
    const names = { left: '360 gauche', right: '360 droite', up: 'Backflip', down: 'Frontflip' };
    const list = this.done.map((d) => names[d]);
    if (list.length) this.toast(`${list.length > 1 ? '🔥' : '🌀'} ${list.join(' + ')} !`);
    this.trickAir = false;
    this.trick = null;
    this.queue = [];
    this.done = [];
  }

  speedFactor() { return 1 + (view.slope - 0.24) * 0.6; }

  toast(text) {
    const t = this.toastEl;
    if (!t) return;
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
  }

  // ---------- Caméra : un peu plus haute et plus loin (piste large), puis déformée comme le décor ----------
  clampCam(out, look, p) {
    updateBend(p.z);
    out.y += 0.7;
    out.z += 1.0;
    out.x *= 0.92;
    const o = bendAt(out.z - p.z);
    out.x += o.x; out.y += o.y;
    bendAt(look.z - p.z, o);
    look.x += o.x; look.y += o.y - 0.3;
  }

  // ---------- Chaque image : pose de l'héroïne, traces, neige soulevée, télésièges, son de glisse ----------
  frame(dt, p, camera, { running, speed = 0 } = {}) {
    updateBend(p.z);
    const G = this.girl;
    if (dt <= 0) return;
    if (this.prevX === null) this.prevX = p.x;
    const vx = (p.x - this.prevX) / dt;
    this.prevX = p.x;
    const sp = Math.max(6, speed);
    const turnT = running ? Math.max(-1, Math.min(1, vx / 9)) : 0;
    this.turn += (turnT - this.turn) * (1 - Math.exp(-dt * 10));
    const grounded = p.grounded;
    const grinding = !!this.grind && grounded;

    if (G) {
      // cap des skis dans le virage, inclinaison vers l'intérieur, buste penché sur la pente
      const yawT = grinding ? 1.35 : running ? -Math.atan2(vx, sp) * 1.7 : 0;
      this.yaw += (yawT - this.yaw) * (1 - Math.exp(-dt * (grinding ? 14 : 9)));
      if (running && !grounded) this.updateTrick(dt, p);
      else { this.spin = 0; this.flip = 0; }
      G.root.rotation.x = -Math.atan(view.slope);
      if (running) {
        G.root.rotation.y = this.yaw + this.spin;
        G.root.rotation.z = -this.turn * 0.42;
      } else G.root.rotation.z *= Math.exp(-dt * 5);
      G.body.rotation.y += ((grinding ? -1.1 : 0) - G.body.rotation.y) * (1 - Math.exp(-dt * 12));
      if (this.flip) G.pivot.rotation.x = this.flip;
      G.ski.turn = this.turn;
      G.ski.grind = grinding ? 1 : 0;
      G.ski.trick = this.trick ? 1 : 0;
      G.ski.land = Math.max(0, (G.ski.land || 0) - dt * 3);
    }

    // réception : gerbe de neige, flexion
    if (running && grounded && this.trickAir) this.landTricks();
    if (running && grounded && !this.wasGrounded && this.air > 0.25) {
      if (G) G.ski.land = Math.min(1, this.air * 1.2);
      if (!grinding) for (let i = 0; i < 40; i++) this.spray.emit(p.x, p.y + 0.05, p.z, (Math.random() - 0.5) * 9, 4.5, -sp * 0.5, 0.9, 0.7);
      if (grinding) this.toast('🛷 Slide !');
    }
    this.air = grounded ? 0 : this.air + dt;
    this.wasGrounded = grounded;

    // traces et projections
    const onSnow = running && grounded && !grinding;
    this.trail.add(p.x, this.groundAt(p.x, p.z), p.z + 0.15, onSnow, Math.abs(this.turn));
    this.trail.update();
    if (onSnow) {
      const tuck = p.slideT > 0;
      const n = Math.min(16, sp * dt * (1.6 + Math.abs(this.turn) * 12));
      for (let i = 0; i < n; i++) {
        // la neige part vers l'extérieur du virage, derrière les talons
        const side = -Math.sign(this.turn || 0.0001);
        const k = Math.abs(this.turn);
        this.spray.emit(p.x + side * 0.25 * k, p.y + 0.05, p.z + 0.55,
          side * (1.5 + k * 9), 1.2 + k * 4 + (tuck ? 0 : 0.5), -sp * 0.55, 0.4, 0.45 + k * 0.4);
      }
    }
    if (grinding && Math.random() < 0.6) this.spray.emit(p.x, p.y, p.z + 0.2, (Math.random() - 0.5) * 3, 2, -sp * 0.6, 0.15, 0.25);
    this.spray.update(dt);

    for (const l of this.lifts) l.update(dt);

    // brume d'altitude : légère et lointaine
    if (this.fog) { this.fog.near = 70; this.fog.far = 310; }
    this.glide(running && grounded, sp, grinding);
  }

  // souffle continu de la glisse (bruit filtré), plus fort en virage et sur la barre ; il s'éteint de
  // lui-même si les images s'arrêtent (pause)
  glide(on, sp, grinding) {
    const S = this.sound;
    if (!S || !S.ctx || !S.noiseBuf) return;
    const ctx = S.ctx;
    if (!this.noise) {
      const src = ctx.createBufferSource();
      src.buffer = S.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(S.master);
      src.start();
      this.noise = { f, g };
    }
    const now = ctx.currentTime, { f, g } = this.noise;
    const vol = on ? 0.035 + sp * 0.0012 + Math.abs(this.turn) * 0.09 : 0;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(vol, now, 0.06);
    g.gain.setTargetAtTime(0, now + 0.2, 0.08);
    f.frequency.setTargetAtTime(grinding ? 2600 : 700 + sp * 18 + Math.abs(this.turn) * 900, now, 0.08);
  }

  warmupGroup() {
    const g = new THREE.Group();
    const S = this.K.skiers;
    let x = 0;
    for (const v of [...S.stand, ...S.sit, ...S.kid]) { const m = new THREE.Mesh(v.geo, flatMat); m.position.x = x++; g.add(m); }
    for (const geo of [this.K.pylon, this.K.fence, this.K.cat]) g.add(new THREE.Mesh(geo, flatMat));
    g.add(signMesh(), archMesh(), kickerMesh(8), new THREE.Mesh(bumpGeo(1), smoothMat));
    const rail = railMesh(4);
    g.add(rail);
    const ch = new THREE.InstancedMesh(this.K.chair, flatMat, 1);
    ch.setMatrixAt(0, new THREE.Matrix4());
    g.add(ch);
    g.traverse((m) => { m.frustumCulled = false; });
    return g;
  }

  get hudText() { return this.hud; }
}
