// Piste de ski : six voies, sauts seulement depuis une bosse ou un tremplin (plus amples au dernier moment),
// barre de slide atteinte par un saut parfait, filets franchissables depuis les bosses, et toujours un
// passage praticable d'une rangée à l'autre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { GRAVITY, JUMP_V, PLAYER_H, PLAYER_SLIDE_H, speedAt } from '../../js/config.js';
import { levelById } from '../../js/levels/index.js';
import { Candies } from '../../js/candies.js';

const def = (await levelById('ski').load()).default;
const { SKI_LANES } = await import('../../js/levels/ski/engine.js');
const { RAIL_TOP, BUMP_L, FENCE_H, KICK_H, kickLen } = await import('../../js/levels/ski/kit.js');
const { bendAt, updateBend } = await import('../../js/levels/ski/bend.js');
const { terrainH, PISTE_HALF } = await import('../../js/levels/ski/terrain.js');

const SEEDS = 10, LENGTH = 4000, STEP = 4;

function make(s) {
  seed(s);
  const root = new THREE.Group();
  const candies = new Candies(root, def.items());
  const ob = def.obstacles(root, { candies, kit: def.obstacleKit() });
  return { ob, candies };
}
function play(s, check = () => {}) {
  const { ob, candies } = make(s);
  const seen = new Set();
  for (let pz = 0; pz > -LENGTH; pz -= STEP) {
    const speed = speedAt(-pz);
    ob.move(STEP / speed);
    ob.update(pz, speed, -pz);
    for (const o of ob.list) seen.add(o);
    check({ ob, pz, candies });
  }
  return { ob, all: [...seen], candies };
}
const player = (lane, z, y = 0) => ({ lane, x: SKI_LANES[lane], y, z, vy: 0, h: PLAYER_H, grounded: true });

test('six voies, sans marquage : la piste fait 13 m de large entre les jalons', () => {
  assert.equal(def.lanes.length, 6);
  assert.deepEqual(def.lanes, SKI_LANES);
  for (let i = 1; i < 6; i++) assert.ok(Math.abs(SKI_LANES[i] - SKI_LANES[i - 1] - 1.8) < 1e-9);
  assert.ok(Math.abs(SKI_LANES[0]) + 0.9 <= PISTE_HALF && SKI_LANES[5] + 0.9 <= PISTE_HALF);
  assert.equal(terrainH(0, -100), 0);
  assert.ok(terrainH(20, -100) > 1, 'la neige remonte vers la forêt');
});

test('la piste descend et tourne à l\'affichage, sans rien changer sous les skis', () => {
  updateBend(-500);
  const here = bendAt(0), ahead = bendAt(-150), behind = bendAt(8);
  assert.ok(Math.abs(here.x) < 1e-9 && Math.abs(here.y) < 1e-9);
  assert.ok(ahead.y < -30, `la piste descend devant (${ahead.y.toFixed(1)} m à 150 m)`);
  assert.ok(behind.y > 0, 'et remonte derrière');
  let maxX = 0;
  for (let pz = 0; pz > -3000; pz -= 50) { updateBend(pz); maxX = Math.max(maxX, Math.abs(bendAt(-120).x)); }
  assert.ok(maxX > 6, `des virages à gauche et à droite (${maxX.toFixed(1)} m d'écart à 120 m)`);
});

test('on ne saute que depuis une bosse ou un tremplin, et plus haut au dernier moment', () => {
  const { ob } = make(1);
  for (const o of ob.list) ob.dropObj(o);
  ob.list = [];
  const p = player(2, -100);
  ob.resolve(p);
  assert.equal(ob.canJump(p), false, 'pas de saut sur la neige plate');
  const k = ob.addKicker(2, -105, 20);
  const early = player(2, k.zNear - 0.6);
  early.y = ob.resolve(early).ground;
  assert.equal(ob.canJump(early), true);
  const vEarly = ob.jumpBoost(early);
  const late = player(2, k.zFar + 0.2);
  late.y = ob.resolve(late).ground;
  assert.equal(ob.canJump(late), true);
  const vLate = ob.jumpBoost(late);
  assert.ok(vLate > vEarly * 1.5, `saut tardif ${vLate.toFixed(1)} contre ${vEarly.toFixed(1)} m/s`);
  assert.ok(vLate > JUMP_V, 'le saut parfait dépasse un saut ordinaire');
  // juste après le bord : encore possible (dernier moment), mais pas loin derrière
  const after = player(2, k.zFar - 1.5, KICK_H - 0.1);
  ob.spot = { kind: 'kicker', t: 1, o: k, h: KICK_H };
  assert.equal(ob.canJump(after), true);
  const far = player(2, k.zFar - 6, 0);
  ob.resolve(far);
  assert.equal(ob.canJump(far), false);
});

// trajectoire d'un saut depuis le tremplin : se pose-t-on sur la barre ?
function landsOnRail(speed, vy, y0, lip, start, len) {
  let y = y0, v = vy, z = lip;
  for (let t = 0; t < 3; t += 1 / 240) {
    v -= GRAVITY / 240;
    y += v / 240;
    z -= speed / 240;
    if (v < 0 && z <= start && z >= start - len && y <= RAIL_TOP && y >= RAIL_TOP - 0.4) return true;
    if (y <= 0) return false;
  }
  return false;
}
test('un saut parfait au tremplin atteint la barre de slide, un saut trop tôt passe dessous', () => {
  for (const speed of [14, 20, 28, 36, 40]) {
    const L = Math.round(kickLen(speed));
    const lip = -L, start = lip - Math.max(5, speed * 0.25), len = Math.max(26, speed * 1.4);
    assert.ok(landsOnRail(speed, JUMP_V * 1.15, KICK_H, lip, start, len), `saut parfait à ${speed} m/s`);
    assert.ok(!landsOnRail(speed, JUMP_V * (0.6 + 0.55 * 0.3 * 0.3), KICK_H * 0.13, lip + L * 0.7, start, len), `saut trop tôt à ${speed} m/s`);
  }
});

test('le filet après les bosses se franchit en sautant au sommet de la bosse', () => {
  for (const speed of [14, 20, 28, 36, 40]) {
    const crest = -BUMP_L / 2, fz = crest - Math.max(3, speed * 0.12);
    let y = 0.65, v = JUMP_V * 0.95, z = crest, ok = false;
    for (let t = 0; t < 2; t += 1 / 240) {
      v -= GRAVITY / 240; y += v / 240; z -= speed / 240;
      if (z <= fz + 0.35 && z >= fz - 0.65) { ok = y >= FENCE_H; if (!ok) break; }
      if (z < fz - 0.65) break;
    }
    assert.ok(ok, `filet franchi à ${speed} m/s`);
  }
});

// voies infranchissables à un endroit : skieurs, pylônes, panneaux, dameuse, et filets sans bosse avant
function blockedAt(list, z) {
  const b = new Set();
  for (const o of list) {
    if (z > o.zNear + 0.4 || z < o.zFar - 0.4) continue;
    const lanes = o.lanes || [o.lane];
    if (o.kind === 'wall') lanes.forEach((l) => b.add(l));
    if (o.kind === 'low') {
      const bump = list.some((u) => u.kind === 'bump' && u.lane === o.lane && u.zFar > o.zNear && u.zFar - o.zNear < 14);
      if (!bump) lanes.forEach((l) => b.add(l));
    }
  }
  return b;
}

test('il reste toujours un passage : on peut atteindre une voie libre en virant à temps', () => {
  for (let s = 1; s <= SEEDS; s++) {
    let R = null, zDone = -60;
    play(s, ({ ob, pz }) => {
      const statics = ob.list.filter((o) => !o.moving);
      // on avance mètre par mètre sur la partie déjà générée et stable (au-delà de 60 m devant le joueur)
      for (let z = zDone; z > pz - 120; z--) {
        const speed = speedAt(-z);
        const blocked = blockedAt(statics, z);
        if (!R) R = [0, 1, 2, 3, 4, 5].map((l) => !blocked.has(l));
        // un virage d'une voie prend environ 0,3 s
        const spread = (z % Math.max(1, Math.round(speed * 0.3))) === 0;
        const next = R.map((r, l) => !blocked.has(l) && (r || (spread && (R[l - 1] || R[l + 1]))));
        assert.ok(next.some(Boolean), `plus aucun passage (partie ${s}, à ${Math.round(-z)} m)`);
        R = next;
      }
      zDone = Math.min(zDone, pz - 120);
    });
  }
});

test('obstacles fixes : jamais deux dans la même voie au même endroit', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const { all } = play(s);
    const solid = all.filter((o) => !o.moving && (o.kind === 'wall' || o.kind === 'low' || o.kind === 'kicker'));
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i], b = solid[j];
        if (a.lane !== b.lane) continue;
        assert.ok(a.zFar >= b.zNear || b.zFar >= a.zNear, `chevauchement ${a.what || a.kind} / ${b.what || b.kind} (partie ${s}, voie ${a.lane}, ${Math.round(-a.zNear)} m)`);
      }
    }
  }
});

test('rien sous une barre de slide, et le tremplin est dans la même voie juste avant', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const { all } = play(s);
    for (const r of all.filter((o) => o.kind === 'rail')) {
      const under = all.filter((o) => o.lane === r.lane && !o.moving && o.kind !== 'rail' && o.kind !== 'kicker' && o.zNear > r.zFar && o.zFar < r.zNear);
      assert.deepEqual(under.map((o) => o.what || o.kind), [], `partie ${s}`);
      assert.ok(all.some((k) => k.kind === 'kicker' && k.lane === r.lane && k.zFar > r.zNear && k.zFar - r.zNear < 12), `tremplin avant la barre (partie ${s})`);
    }
  }
});

test('friandises et dynamite : jamais dans un obstacle, la dynamite jamais dans le couloir de friandises', () => {
  for (let s = 1; s <= SEEDS; s++) {
    const { all, candies } = play(s);
    const walls = all.filter((o) => o.kind === 'wall' && !o.moving);
    for (const c of candies.list) {
      const hit = walls.find((o) => (o.lanes || [o.lane]).includes(c.lane) && c.z <= o.zNear + 0.3 && c.z >= o.zFar - 0.3 && c.y < o.top);
      assert.ok(!hit, `friandise dans ${hit && hit.what} (partie ${s}, ${Math.round(-c.z)} m)`);
    }
    for (const f of candies.fugus) {
      const near = all.find((o) => !o.moving && o.kind !== 'rail' && (o.lanes || [o.lane]).includes(f.lane) && f.z <= o.zNear + 4 && f.z >= o.zFar - 4);
      assert.ok(!near, `dynamite collée à ${near && (near.what || near.kind)} (partie ${s})`);
    }
  }
});

test('arche : on passe en position de recherche, pas debout', () => {
  const { ob } = make(2);
  for (const o of ob.list) ob.dropObj(o);
  ob.list = [];
  ob.addArch(-50);
  const stand = player(3, -50.1);
  assert.ok(ob.resolve(stand).crash, 'debout : on heurte la banderole');
  const tuck = { ...player(3, -50.1), h: PLAYER_SLIDE_H };
  assert.equal(ob.resolve(tuck).crash, null);
});

test('la dameuse remonte dans deux voies du bord, avec un passage gardé à côté', () => {
  let cats = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const { all } = play(s);
    for (const c of all.filter((o) => o.what === 'cat')) {
      cats++;
      assert.ok([[0, 1], [4, 5]].some((p) => p[0] === c.lanes[0] && p[1] === c.lanes[1]));
      assert.ok(c.v > 0, 'elle monte vers le joueur');
    }
  }
  assert.ok(cats > 0, 'au moins une dameuse sur les parties générées');
});

test('en l\'air après une bosse, les directions font des figures (et plus de changement de voie)', () => {
  const { ob } = make(3);
  for (const o of ob.list) ob.dropObj(o);
  ob.list = [];
  const p = player(2, -100);
  // pas de figure sans saut depuis une bosse
  p.grounded = false; p.y = 1; p.vy = 5;
  assert.equal(ob.airInput(p, 'left'), false);
  ob.addBumps(1, 3, -95);
  const q = player(2, -98);
  q.y = ob.resolve(q).ground;
  q.vy = ob.jumpBoost(q);
  q.grounded = false;
  q.y += 0.2;
  assert.equal(ob.laneTarget(q, 1), 2, 'pas de changement de voie en l\'air');
  assert.equal(ob.airInput(q, 'left'), true);
  assert.equal(ob.airInput(q, 'up'), true);   // mise en attente : enchaînée après la vrille
  for (let i = 0; i < 120 && (ob.trick || ob.queue.length); i++) ob.updateTrick(1 / 60, q);
  assert.deepEqual(ob.done, ['left', 'up']);
  ob.landTricks();
  assert.equal(ob.trickAir, false);
  assert.equal(ob.laneTarget({ ...q, grounded: true }, 1), 3);
});

test('des bosses régulièrement sur la piste', () => {
  const { all } = play(4);
  const rows = new Set(all.filter((o) => o.kind === 'bump').map((o) => Math.round(o.zNear)));
  assert.ok(rows.size > 4000 / 100, `${rows.size} rangées de bosses sur 4 km`);
});
