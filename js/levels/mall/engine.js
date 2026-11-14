import * as THREE from 'three';
import { Obstacles } from '../../obstacles.js';
import { LANES, SPAWN_AHEAD, DESPAWN_BEHIND } from '../../config.js';
import { rand, pick } from '../../geo.js';
import { FLOORS, floorLabel } from './themes.js';
import { FLOOR_H, SLAB, CEIL, MOD, ESC_LEN, LANE_HX, ROOF_Y, TOP, escY } from './dims.js';
import { MallShell } from './shell.js';
import { escalatorKit, buildEscalator, stepsMat } from './escalators.js';

// Le centre commercial : six étages superposés, chacun avec ses boutiques et ses obstacles. Chaque étage a
// son propre moteur d'obstacles (le moteur commun, dans le repère de l'étage) ; des escalators relient
// deux étages voisins. Un escalator occupe une voie : rester dans cette voie, c'est le prendre (on monte
// ou on descend sans s'arrêter, sans pouvoir changer de voie en route) ; l'arriver par le côté, c'est
// heurter la balustrade. À l'étage où il arrive, sa voie est fermée (totem devant la trémie, cloison sous
// la descente). Plus on monte, plus il y a de friandises : le dernier étage, celui des gourmandises, en
// regorge. Seuls l'étage du joueur et ses voisins sont affichés.

const H = FLOOR_H;
const P_HALF_X = 0.32, P_HALF_Z = 0.35;
const BEFORE = 14, AFTER = 18;              // voie dégagée avant le pied et après l'arrivée d'un escalator
// friandises en plus à chaque rangée, selon l'étage (partie entière : traînées sûres, reste : probabilité)
export const BONUS = [0, 0.2, 0.4, 0.6, 0.85, 2.3];

// ---------- Moteur d'un étage ----------
// zones : voies réservées par les escalators de cet étage (rien n'y est posé, aucun véhicule n'y roule)
class FloorObstacles extends Obstacles {
  constructor(group, opts, f) {
    super(group, opts);
    this.f = f;
  }

  reset(startZ) {
    super.reset(startZ);
    this.zones = [];
  }

  zoneHit(lane, zNear, zFar) {
    return this.zones.some((z) => z.lane === lane && zFar < z.zNear + BEFORE && zNear > z.zFar - AFTER);
  }

  // les voies des escalators à venir sont fermées (comme occupées) pour la génération de cette rangée
  spawnObstacles(z, speed, dist) {
    for (const Z of this.zones) {
      if (z <= Z.zNear + BEFORE + 2 && z > Z.zFar - AFTER) this.busy[Z.lane] = Math.min(this.busy[Z.lane], Z.zFar - AFTER);
    }
    // plus on monte, plus c'est dense
    return super.spawnObstacles(z, speed, dist + this.f * 220);
  }

  addTrain(lane, z, cars, ramp, moving) {
    // un véhicule qui roule vers le joueur traverserait l'escalator : il n'y en a pas dans sa voie
    if (moving && this.zones.some((Z) => Z.lane === lane && Z.zFar < z + 260 && Z.zNear > z - 40)) return null;
    // véhicule à l'arrêt : raccourci, ou pas du tout, s'il empiète sur un escalator
    let n = cars;
    const len = (c) => this.S.carLen(c) + (ramp ? this.S.rampLen : 0);
    while (n > 0 && this.zoneHit(lane, z, z - len(n))) n--;
    if (!n) return null;
    return super.addTrain(lane, z, n, ramp, moving);
  }

  addBarrier(lane, z, kind) {
    if (this.zoneHit(lane, z, z - 1.2)) return;
    super.addBarrier(lane, z, kind);
  }

  // davantage de friandises en montant ; au dernier étage, plusieurs traînées par rangée
  spawnRow(z, speed, dist) {
    const prev = this.lastRowZ;
    const gap = super.spawnRow(z, speed, dist);
    const C = this.candies;
    let extra = BONUS[this.f];
    if (C && prev !== null && prev - z > 8) {
      const lanes = [0, 1, 2].filter((l) => !this.list.some((o) => o.moving && o.lane === l));
      for (let i = lanes.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [lanes[i], lanes[j]] = [lanes[j], lanes[i]]; }
      for (const l of lanes) {
        if (extra <= 0 || (extra < 1 && Math.random() > extra)) break;
        C.placeTrail(l, prev - 1, z - 3, this);
        extra -= 1;
      }
    }
    return gap;
  }
}

// Les friandises de chaque étage sont posées par le moteur de l'étage (repère de l'étage), puis montées à
// leur hauteur réelle ; celles des étages cachés passent sur le calque 1 (invisibles)
function floorCandies(C, mall, f) {
  if (!C) return null;
  const lift = (arr, from) => {
    for (let i = from; i < arr.length; i++) {
      const c = arr[i];
      c.floor = f;
      c.y += f * H;
      c.mesh.position.y += f * H;
      mall.fixCandy(c, f);
      if (!mall.shownFloors.has(f)) c.mesh.traverse((m) => m.layers.set(1));
    }
  };
  return {
    placeTrail(lane, zFrom, zTo, ob) { const n = C.list.length; C.placeTrail(lane, zFrom, zTo, ob); lift(C.list, n); },
    placeFugu(lane, z, ob) {
      if (mall.zoneAt(f, lane, z, 4)) return false;
      const n = C.fugus.length; const ok = C.placeFugu(lane, z, ob); lift(C.fugus, n); return ok;
    },
    placeAt(x, y, z, lane, phase) { const n = C.list.length; C.placeAt(x, y, z, lane, phase); lift(C.list, n); },
    // un véhicule qui roule « avale » les friandises de sa voie, à son étage seulement
    eatBy(o) {
      const y0 = f * H;
      for (const c of C.list) {
        if (c.floor === f && c.mesh.visible && c.lane === o.lane && c.z <= o.zNear && c.z >= o.zFar && c.y - y0 < o.top) c.mesh.visible = false;
      }
      for (const c of C.fugus) {
        if (c.floor === f && c.mesh.visible && c.lane === o.lane && c.z <= o.zNear && c.z >= o.zFar && c.y - y0 < o.top) c.mesh.visible = false;
      }
    },
  };
}

// ---------- Le centre commercial ----------
export class MallObstacles {
  constructor(root, opts) {
    this.root = root;
    this.sound = opts.sound;
    this.world = opts.world;
    this.fog = opts.fog;
    this.C = opts.candies;
    this.shownFloors = new Set([0, 1]);
    this.shell = new MallShell(root);
    this.K = escalatorKit(this.shell.signMat);
    this.escGroup = new THREE.Group();
    root.add(this.escGroup);
    // fond couleur de brume tout autour (bout de la galerie, au-delà des trémies) : jamais de noir
    this.backdrop = new THREE.Mesh(new THREE.BoxGeometry(380, 380, 380), new THREE.MeshBasicMaterial({ color: opts.fogColor || '#f6eee8', side: THREE.BackSide, fog: false }));
    root.add(this.backdrop);
    this.groups = [];
    this.floors = FLOORS.map((F, f) => {
      const g = new THREE.Group();
      g.position.y = f * H;
      root.add(g);
      this.groups.push(g);
      const onHorn = () => { if (this.floor === f && opts.onHorn) opts.onHorn(); };
      return new FloorObstacles(g, { ...opts, onHorn, candies: floorCandies(opts.candies, this, f) }, f);
    });
    this.trainTop = this.floors[0].trainTop;
    this.toastEl = typeof document !== 'undefined' && document.getElementById ? document.getElementById('toast') : null;
    this.reset(0);
  }

  get list() { return this.floors[this.floor].list; }
  get cur() { return this.floors[this.floor]; }

  reset(startZ) {
    for (const F of this.floors) F.reset(startZ);
    for (const c of this.conns || []) this.escGroup.remove(c.mesh);
    this.conns = [];
    this.floor = 0;
    this.esc = null;
    this.camY = 1.5;
    this.version = 0;
    this.escCursor = startZ - rand(150, 190);
    // dernier escalator qui part de chaque étage, vers le haut et vers le bas
    this.lastUp = FLOORS.map(() => startZ);
    this.lastDown = FLOORS.map(() => startZ);
    this.hud = `${floorLabel(0)} · ${FLOORS[0].name}`;
    this.schedule(startZ);
    this.applyVisibility(startZ, true);
  }

  // un exemplaire de tout (obstacles, dix escalators, étages et boutiques en instances) : shaders compilés
  // et géométries envoyées à la carte graphique au chargement, plutôt qu'au premier passage d'étage
  warmupGroup() {
    const g = this.floors[0].warmupGroup();
    let i = 0;
    for (let to = 1; to <= TOP; to++) g.add(buildEscalator(this.K, { a: to - 1, lane: 1, dir: 1, zNear: 0, from: to - 1, to, ad: (to * 2) % 6 }, (i++) * 3));
    for (let to = 0; to < TOP; to++) g.add(buildEscalator(this.K, { a: to, lane: 1, dir: -1, zNear: 0, from: to + 1, to, ad: (to * 2 + 1) % 6 }, (i++) * 3));
    const m = new THREE.Matrix4().makeScale(0.01, 0.01, 0.01);
    this.root.traverse((o) => {
      if (!o.isInstancedMesh) return;
      const w = new THREE.InstancedMesh(o.geometry, o.material, 1);
      w.setMatrixAt(0, m);
      w.frustumCulled = false;
      g.add(w);
    });
    return g;
  }

  // ---------- Escalators ----------
  zoneAt(f, lane, z, margin = 0) {
    return this.conns.some((c) => (c.from === f || c.to === f) && c.lane === lane && z <= c.zNear + margin && z >= c.zFar - margin);
  }

  // un escalator entre l'étage a et a + 1, au pied en z0 (aligné sur les modules de dalle)
  tryConn(a, dir, z0, lane = -1) {
    const from = dir > 0 ? a : a + 1, to = dir > 0 ? a + 1 : a;
    const zNear = z0, zFar = z0 - ESC_LEN;
    const span0 = zNear + BEFORE + 6, span1 = zFar - AFTER - 6;
    // sur un même étage : jamais deux voies fermées (arrivées) ni plus de deux escalators à la fois, jamais
    // deux dans la même voie, et rien de déjà posé dans la voie
    const around = (f) => this.conns.filter((c) => (c.from === f || c.to === f) && c.zFar < span0 && c.zNear > span1);
    if (around(from).length >= 2 || around(to).length >= 2 || around(to).some((c) => c.to === to)) return null;
    const taken = new Set([...around(from), ...around(to)].map((c) => c.lane));
    const lanes = [0, 1, 2].filter((l) => !taken.has(l) && [a, a + 1].every((f) => !this.floors[f].list.some((o) => o.lane === l && o.zFar < span0 && o.zNear > span1)));
    if (!lanes.length) return null;
    if (lane >= 0 && !lanes.includes(lane)) return null;
    const c = { a, dir, from, to, lane: lane >= 0 ? lane : pick(lanes), zNear, zFar, ad: (to * 2 + (dir > 0 ? 0 : 1)) % 6 };
    c.x = LANES[c.lane];
    c.mesh = buildEscalator(this.K, c, c.x);
    this.escGroup.add(c.mesh);
    this.conns.push(c);
    for (const f of [from, to]) this.floors[f].zones.push(c);
    if (dir > 0) this.lastUp[from] = z0; else this.lastDown[from] = z0;
    this.version++;
    return c;
  }

  // escalators prévus loin devant (avant que les étages n'y posent leurs obstacles)
  schedule(pz) {
    while (this.escCursor > pz - SPAWN_AHEAD - 110) {
      const z0 = Math.round(this.escCursor / MOD) * MOD;
      // chaque étage doit pouvoir monter et descendre régulièrement
      const wants = [];
      for (let a = 0; a < TOP; a++) {
        if (this.lastUp[a] - z0 > 190) wants.push([a, 1]);
        if (this.lastDown[a + 1] - z0 > 230) wants.push([a, -1]);
      }
      // ordre tiré au hasard (mélange de Fisher-Yates : même partie quelle que soit la version de Node)
      for (let i = wants.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [wants[i], wants[j]] = [wants[j], wants[i]]; }
      let missed = false;
      for (const [a, dir] of wants) if (!this.tryConn(a, dir, z0)) missed = true;
      // un escalator attendu n'a pas trouvé de place : on réessaie un peu plus loin, sans en ajouter d'autres
      if (missed) { this.escCursor -= 2 * MOD; continue; }
      for (let a = 0; a < TOP; a++) if (Math.random() < 0.16) this.tryConn(a, Math.random() < 0.55 ? 1 : -1, z0);
      this.escCursor -= rand(26, 44);
    }
  }

  // friandise posée sur un escalator : à hauteur des marches ; dans une voie fermée : retirée
  fixCandy(c, f) {
    for (const k of this.conns) {
      if (k.lane !== c.lane || c.z > k.zNear + 0.5 || c.z < k.zFar - 0.5) continue;
      if (k.from === f) {
        const y = escY(k, c.z) + 0.9 + (c.y - f * H - 0.9);
        c.mesh.position.y += y - c.y;
        c.y = y;
      } else if (k.to === f) {
        c.mesh.visible = false;
        c.y = -1000;
      }
    }
  }

  // ---------- Collisions ----------
  baseY(p) { return this.esc ? escY(this.esc, p.z) : this.floor * H; }

  laneTarget(p, d) { return this.esc ? p.lane : p.lane + d; }

  resolve(p) {
    if (this.esc) {
      const c = this.esc;
      if (p.z > c.zFar - 0.45) {
        const g = escY(c, p.z);
        // en descendant, elle reste sur les marches (sinon elle flotterait un peu à chaque pas)
        if (c.dir < 0 && p.vy <= 0 && p.y > g && p.y - g < 0.8) p.y = g;
        return { ground: g, crash: null };
      }
      // arrivé : on est à l'étage d'arrivée
      this.esc = null;
      this.setFloor(c.to);
    }
    const f = this.floor, base = f * H;
    // pied d'un escalator de cet étage, ou balustrade heurtée par le côté
    for (const c of this.conns) {
      if (c.from !== f || Math.abs(p.x - c.x) > LANE_HX || p.z > c.zNear || p.z < c.zFar - 0.4) continue;
      if (p.lane !== c.lane) continue;   // on quitte la voie : on passe à côté
      const h = escY(c, p.z);
      const foot = c.zNear - p.z < 2.4;
      if (foot || (c.dir > 0 ? p.y >= h - 0.7 : p.y >= base + 1.15)) {
        this.esc = c;
        return { ground: h, crash: null };
      }
      return { ground: base, crash: { kind: 'wall', lane: c.lane, esc: c } };
    }
    // voie fermée par un escalator qui arrive (totem, cloison)
    const zMin = p.z - P_HALF_Z, zMax = p.z + P_HALF_Z;
    for (const c of this.conns) {
      if (c.to !== f || Math.abs(p.x - c.x) > 1.1 + P_HALF_X || zMin > c.zNear || zMax < c.zFar) continue;
      if (p.y - base < 5) return { ground: base, crash: { kind: 'wall', lane: c.lane, esc: c } };
    }
    // obstacles de l'étage, dans son repère
    const q = { x: p.x, y: p.y - base, z: p.z, h: p.h, vy: p.vy, lane: p.lane, under: false };
    const r = this.cur.resolve(q);
    // le plafond arrête les sauts (depuis le toit d'un kiosque)
    const ceil = base + (f === TOP ? ROOF_Y : CEIL) - 0.05;
    if (p.y + p.h > ceil) { p.y = ceil - p.h; if (p.vy > 0) p.vy = 0; }
    return { ground: r.ground + base, crash: r.crash };
  }

  groundAt(x, z, margin = 0) {
    const c = this.esc;
    if (c && Math.abs(x - c.x) <= LANE_HX + margin && z <= c.zNear + margin && z >= c.zFar - 0.45 - margin) return escY(c, z);
    return this.floor * H + this.cur.groundAt(x, z, margin);
  }

  barrierNear(lane, z) { return this.cur.barrierNear(lane, z); }

  setFloor(f) {
    if (f === this.floor) return;
    this.floor = f;
    const F = FLOORS[f];
    this.hud = `${floorLabel(f)} · ${F.name}`;
    this.toast(f === TOP ? `${F.icon} ${floorLabel(f)} : pluie de bonus !` : `${F.icon} ${floorLabel(f)} · ${F.name}`);
    if (this.sound && this.sound.milestone && f === TOP) this.sound.milestone();
  }

  toast(text) {
    const t = this.toastEl;
    if (!t) return;
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
  }

  move(dt) { for (const F of this.floors) F.move(dt); }

  update(pz, speed, dist) {
    this.schedule(pz);
    for (const F of this.floors) F.update(pz, speed, dist);
    const limit = pz + DESPAWN_BEHIND;
    const keep = [];
    for (const c of this.conns) {
      if (c.zFar - 20 > limit && c !== this.esc) {
        this.escGroup.remove(c.mesh);
        for (const f of [c.from, c.to]) this.floors[f].zones = this.floors[f].zones.filter((z) => z !== c);
        this.version++;
      } else keep.push(c);
    }
    this.conns = keep;
  }

  // ---------- Affichage ----------
  // trémie de la dalle de l'étage s (escalators entre s - 1 et s) sous le point (x, z) ?
  holeAt(s, x, z, m = 0) {
    return this.conns.some((c) => c.a + 1 === s && Math.abs(x - c.x) <= LANE_HX + m && z <= c.zNear + m && z >= c.zFar - m);
  }

  // étages affichés : celui du joueur et ses voisins (dalles), boutiques des voisins quand un escalator
  // vers eux est proche ; les obstacles des étages cachés ne sont pas dessinés
  applyVisibility(pz, force = false) {
    const f = this.floor, camF = Math.max(0, Math.min(TOP, Math.floor((this.camY + SLAB / 2) / H)));
    const near = new Set([f, camF]);
    for (const c of this.conns) {
      if (c.zFar - 6 > pz || c.zNear < pz - 70) continue;
      if (c.from === f || c.to === f) { near.add(c.from); near.add(c.to); }
    }
    // chaque étage affiché a besoin de son sol et de son plafond (la dalle de l'étage du dessus)
    const slabs = new Set();
    for (const n of near) { slabs.add(n); slabs.add(n + 1); }
    const key = [...near].sort().join() + '|' + [...slabs].sort().join();
    if (key !== this.visKey || force) {
      this.visKey = key;
      this.shell.show(slabs, near);
      this.groups.forEach((g, i) => { g.visible = near.has(i); });
      if (this.C) {
        for (const c of this.C.list) if (c.floor !== undefined) c.mesh.layers.set(near.has(c.floor) ? 0 : 1);
        for (const c of this.C.fugus) if (c.floor !== undefined) c.mesh.traverse((m) => m.layers.set(near.has(c.floor) ? 0 : 1));
      }
      this.shownFloors = near;
    }
    // escalators : ceux de l'étage du joueur jusqu'au bout de la vue, ceux des voisins de près seulement
    for (const c of this.conns) c.mesh.visible = c.zNear > pz - (c.from === f || c.to === f ? 175 : 80) && (near.has(c.from) || near.has(c.to));
    // obstacles et friandises des étages voisins : de près seulement ; au loin, rien (dans la brume)
    for (const n of near) {
      const lim = n === f ? 175 : 80;
      for (const o of this.floors[n].list) if (o.mesh) o.mesh.visible = o.zNear > pz - lim;
    }
    if (this.C) {
      for (const c of this.C.list) {
        if (c.floor === undefined || !near.has(c.floor)) continue;
        c.mesh.layers.set(c.z > pz - (c.floor === f ? 135 : 80) ? 0 : 1);
      }
    }
    for (const s of slabs) {
      if (s < 0 || s > TOP) continue;
      // l'étage du joueur (sol et plafond) jusqu'au bout de la vue ; les voisins de près
      const ahead = s === f || s === f + 1 || s === camF || s === camF + 1 ? 170 : 85;
      const shopAhead = s === f || s === camF ? 170 : 85;
      this.shell.place(s, pz, (l, zc) => this.conns.some((c) => c.a + 1 === s && c.lane === l && zc < c.zNear && zc > c.zFar), this.version, ahead, shopAhead);
    }
  }

  // la caméra ne traverse jamais une dalle, sauf au-dessus d'une trémie (pendant un escalator)
  clampCam(out, look, p) {
    const cf = Math.max(0, Math.min(TOP, Math.floor((this.camY + SLAB / 2) / H)));
    const ceil = cf * H + (cf === TOP ? ROOF_Y : CEIL) - 0.3;
    if (out.y > ceil && (cf === TOP || !this.holeAt(cf + 1, out.x, out.z, 0.3))) out.y = ceil;
    const floor = cf * H + 0.35;
    if (cf > 0 && out.y < floor && !this.holeAt(cf, out.x, out.z, 0.3)) out.y = floor;
    look.y = Math.min(look.y, ceil);
  }

  frame(dt, p, camera, { running } = {}) {
    this.camY = camera.position.y;
    this.backdrop.position.copy(camera.position);
    this.applyVisibility(p.z);
    // les marches défilent, les flèches dansent
    stepsMat.map.offset.y -= dt * 1.6;
    const t = performance.now() / 1000;
    for (const c of this.conns) {
      const a = c.mesh.userData.arrow;
      if (a) a.position.y = c.mesh.userData.arrowY + Math.sin(t * 5 + c.zNear) * 0.18;
    }
    // brouillard d'intérieur : la galerie se perd au loin dans une brume claire
    if (this.fog) { this.fog.near = 30; this.fog.far = 165; }
    if (this.world) {
      this.world.petals.position.y = this.floor * H;
    }
  }

  get hudText() { return this.hud; }
}
