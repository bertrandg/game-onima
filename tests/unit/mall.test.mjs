// Règles du centre commercial : six étages reliés par des escalators. Génération (parties rejouables de
// 4 km) et collisions : prendre un escalator en restant dans sa voie, le heurter par le côté, voie fermée
// à l'étage d'arrivée, plafond, et davantage de friandises en montant.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { LANES, PLAYER_H, speedAt } from '../../js/config.js';
import { Candies } from '../../js/candies.js';
import { MallObstacles, BONUS } from '../../js/levels/mall/engine.js';
import { mallObstacleKit } from '../../js/levels/mall/kit.js';
import { mallItems } from '../../js/levels/mall/items.js';
import { FLOOR_H, CEIL, ESC_LEN, TOP, escY } from '../../js/levels/mall/dims.js';

const KIT = mallObstacleKit(), ITEMS = mallItems();
const SEEDS = 10, LENGTH = 4000, STEP = 4;
const make = () => {
  const root = new THREE.Group(), candies = new Candies(root, ITEMS);
  return { ob: new MallObstacles(root, { candies, kit: KIT }), candies };
};

// partie simulée : tout ce qui a été généré, étage par étage
function play(s) {
  seed(s);
  const { ob, candies } = make();
  const seen = ob.floors.map(() => new Set()), conns = new Set(), sweets = new Set();
  for (let pz = 0; pz > -LENGTH; pz -= STEP) {
    const speed = speedAt(-pz);
    ob.move(STEP / speed);
    ob.update(pz, speed, -pz);
    ob.floors.forEach((F, f) => F.list.forEach((o) => seen[f].add(o)));
    ob.conns.forEach((c) => conns.add(c));
    candies.list.forEach((c) => sweets.add(c));
    // ce qui roule ne traverse jamais un escalator
    ob.floors.forEach((F, f) => {
      for (const m of F.list) {
        if (!m.moving || m.kind !== 'train' || m.zFar > pz) continue;
        const hit = ob.conns.find((c) => (c.from === f || c.to === f) && c.lane === m.lane && c.zFar < m.zNear && c.zNear > m.zFar);
        assert.ok(!hit, `petit train dans un escalator, étage ${f} (partie ${s}, ${Math.round(-m.zNear)} m)`);
      }
    });
  }
  return { ob, all: seen.map((x) => [...x]), conns: [...conns], sweets: [...sweets] };
}
const where = (s, z) => `partie ${s}, à ${Math.round(-z)} m`;
const runs = [];
for (let s = 1; s <= SEEDS; s++) runs.push(play(s));

// ---------- Génération ----------
test('chaque étage a régulièrement un escalator pour monter et un pour descendre', () => {
  runs.forEach(({ conns }, i) => {
    for (let f = 0; f <= TOP; f++) {
      for (const dir of [1, -1]) {
        if ((dir > 0 && f === TOP) || (dir < 0 && f === 0)) continue;
        const zs = conns.filter((c) => c.from === f && c.dir === dir).map((c) => c.zNear).sort((a, b) => b - a);
        assert.ok(zs.length > 8, `étage ${f}, ${dir > 0 ? 'montée' : 'descente'} : ${zs.length} escalators (partie ${i + 1})`);
        const gaps = zs.slice(1).map((z, k) => zs[k] - z);
        assert.ok(Math.max(zs[0] - 0, ...gaps) < 400, `étage ${f} : ${Math.round(Math.max(...gaps))} m sans escalator ${dir > 0 ? 'qui monte' : 'qui descend'} (partie ${i + 1})`);
      }
    }
  });
});

test('un escalator relie deux étages voisins ; jamais deux dans la même voie, ni deux voies fermées à la fois', () => {
  runs.forEach(({ conns }, i) => {
    for (const c of conns) {
      assert.equal(Math.abs(c.from - c.to), 1);
      assert.ok(Math.abs(c.zNear - c.zFar - ESC_LEN) < 1e-6);
      for (const f of [c.from, c.to]) {
        const near = conns.filter((d) => d !== c && (d.from === f || d.to === f) && d.zFar < c.zNear + 14 && d.zNear > c.zFar - 18);
        for (const z of [c.zNear, c.zFar]) {
          const n = conns.filter((d) => (d.from === f || d.to === f) && z <= d.zNear && z >= d.zFar).length;
          assert.ok(n <= 2, `${n} escalators au même endroit, étage ${f} (${where(i + 1, z)})`);
        }
        assert.ok(!near.some((d) => d.lane === c.lane), `deux escalators dans la même voie, étage ${f} (${where(i + 1, c.zNear)})`);
        if (c.to === f) assert.ok(!near.some((d) => d.to === f), `deux voies fermées à la fois, étage ${f} (${where(i + 1, c.zNear)})`);
      }
    }
  });
});

test('rien dans la voie d\'un escalator, ni avant son pied ni après son arrivée', () => {
  runs.forEach(({ all, conns }, i) => {
    for (const c of conns) {
      for (const f of [c.from, c.to]) {
        const bad = all[f].find((o) => !o.moving && o.lane === c.lane && o.zFar < c.zNear + 12 && o.zNear > c.zFar - 16);
        assert.ok(!bad, `${bad && bad.kind} dans la voie d'un escalator, étage ${f} (${where(i + 1, c.zNear)})`);
      }
    }
  });
});

test('à chaque étage, deux obstacles immobiles ne se chevauchent jamais dans une même voie', () => {
  runs.forEach(({ all }, i) => {
    all.forEach((list, f) => {
      const fixed = list.filter((o) => !o.moving);
      for (const a of fixed) for (const b of fixed) {
        if (a === b || a.lane !== b.lane) continue;
        assert.ok(a.zFar >= b.zNear || b.zFar >= a.zNear, `${a.kind} et ${b.kind} superposés, étage ${f} (${where(i + 1, a.zNear)})`);
      }
    });
  });
});

test('plus on monte, plus il y a de friandises ; le dernier étage en regorge', () => {
  const per = new Array(TOP + 1).fill(0);
  for (const { sweets } of runs) for (const c of sweets) if (c.y > -100) per[c.floor]++;
  for (let f = 1; f <= TOP; f++) assert.ok(per[f] > per[f - 1], `étage ${f} : ${per[f]} friandises, étage ${f - 1} : ${per[f - 1]}`);
  assert.ok(per[TOP] > 3 * per[0], `dernier étage : ${per[TOP]}, rez-de-chaussée : ${per[0]}`);
  assert.equal(BONUS.indexOf(Math.max(...BONUS)), TOP);
});

test('les friandises d\'un escalator sont à hauteur des marches ; aucune dans une voie fermée', () => {
  let onSteps = 0;
  runs.forEach(({ sweets, conns }, i) => {
    for (const c of sweets) {
      if (c.y < -100) continue;   // retirée (voie fermée)
      for (const k of conns) {
        if (k.lane !== c.lane || c.z > k.zNear || c.z < k.zFar) continue;
        assert.notEqual(k.to, c.floor, `friandise dans une voie fermée (${where(i + 1, c.z)})`);
        if (k.from === c.floor) { onSteps++; assert.ok(c.y >= escY(k, c.z) + 0.4, `friandise enfouie dans les marches (${where(i + 1, c.z)})`); }
      }
    }
  });
  assert.ok(onSteps > 20, `${onSteps} friandises sur les escalators`);
});

// ---------- Collisions ----------
let ob;
beforeEach(() => {
  seed(1);
  ({ ob } = make());
  for (const c of ob.conns) ob.escGroup.remove(c.mesh);
  ob.conns = [];
  ob.floors.forEach((F) => { F.zones = []; F.list = []; });
});
const player = ({ lane = 1, z = 0, y = 0, vy = 0, h = PLAYER_H } = {}) => ({ lane, x: LANES[lane], y, z, vy, h, grounded: true });
const at = (c, d) => c.zNear - d;   // d mètres après le pied

test('rester dans la voie d\'un escalator qui monte, c\'est monter d\'un étage', () => {
  const c = ob.tryConn(0, 1, -100);
  const p = player({ lane: c.lane, z: -99 });
  assert.equal(ob.resolve(p).crash, null);
  p.z = -100.5;
  let prev = -1;
  for (let d = 0.5; d < ESC_LEN; d += 1) {
    p.z = at(c, d);
    const r = ob.resolve(p);
    assert.equal(r.crash, null);
    assert.ok(r.ground > prev, `les marches montent (${d} m)`);
    prev = r.ground;
    p.y = r.ground;
  }
  assert.equal(ob.laneTarget(p, 1), c.lane, 'pas de changement de voie sur l\'escalator');
  p.z = c.zFar - 1; p.y = FLOOR_H;
  const r = ob.resolve(p);
  assert.equal(ob.floor, 1);
  assert.equal(r.ground, FLOOR_H);
  assert.match(ob.hudText, /Étage 2/);
  assert.equal(ob.laneTarget(p, 1), c.lane + 1);
});

test('un escalator qui descend ramène à l\'étage du dessous', () => {
  ob.setFloor(2);
  const c = ob.tryConn(1, -1, -100);
  const p = player({ lane: c.lane, z: at(c, 0.5), y: 2 * FLOOR_H });
  assert.ok(ob.resolve(p).ground <= 2 * FLOOR_H);
  p.z = at(c, ESC_LEN / 2); p.y = 1.5 * FLOOR_H;
  assert.ok(Math.abs(ob.resolve(p).ground - 1.5 * FLOOR_H) < 0.01);
  p.z = c.zFar - 1; p.y = FLOOR_H;
  ob.resolve(p);
  assert.equal(ob.floor, 1);
});

test('arriver par le côté contre la balustrade est un choc ; à côté de l\'escalator, on passe', () => {
  const c = ob.tryConn(0, 1, -100);
  const side = c.lane === 1 ? 0 : 1;
  assert.equal(ob.resolve(player({ lane: side, z: at(c, 8) })).crash, null, 'voie d\'à côté');
  const p = player({ lane: c.lane, z: at(c, 8) });
  p.x = LANES[c.lane] + (side < c.lane ? -1 : 1) * 0.9;   // en train d'y entrer
  const r = ob.resolve(p);
  assert.ok(r.crash && r.crash.kind === 'wall');
  assert.equal(ob.esc, null);
});

test('à l\'étage d\'arrivée, la voie de l\'escalator est fermée (totem, cloison)', () => {
  const up = ob.tryConn(0, 1, -100);
  ob.setFloor(1);
  const r = ob.resolve(player({ lane: up.lane, z: up.zNear - 0.2, y: FLOOR_H }));
  assert.ok(r.crash && r.crash.kind === 'wall');
  assert.ok(ob.resolve(player({ lane: up.lane, z: up.zNear - 0.2, y: FLOOR_H + 3.3 })).crash, 'trop haut pour sauter par-dessus');
  ob.setFloor(0);
  const down = ob.tryConn(0, -1, -300);
  assert.ok(ob.resolve(player({ lane: down.lane, z: down.zNear - 0.2 })).crash);
});

test('le plafond arrête un saut', () => {
  const p = player({ y: CEIL - 1, vy: 8 });
  ob.resolve(p);
  assert.ok(p.y + p.h <= CEIL);
  assert.equal(p.vy, 0);
});

test('la caméra reste sous le plafond, sauf au-dessus d\'une trémie', () => {
  const c = ob.tryConn(0, 1, -100);
  const out = new THREE.Vector3(c.x, 9, -50), look = new THREE.Vector3(0, 9, -60);
  ob.camY = 4;
  ob.clampCam(out, look, player());
  assert.ok(out.y < CEIL);
  out.set(c.x, 9, at(c, 10));
  ob.clampCam(out, look, player());
  assert.equal(out.y, 9);
});
