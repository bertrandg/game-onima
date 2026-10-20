// Règles des égouts de New York : chute par les bouches ouvertes, boue mortelle, rats et obstacles,
// sortie par les échelles (y compris en sautant un peu trop tôt).
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { LANES, PLAYER_H, PLAYER_SLIDE_H } from '../../js/config.js';
import { NYObstacles, SEWER_Y } from '../../js/levels/newyork/sewer.js';
import { nyVehicleKit } from '../../js/levels/newyork/vehicles.js';

const KIT = nyVehicleKit();
let ob;
beforeEach(() => {
  seed(1);
  mock.restoreAll();
  ob = new NYObstacles(new THREE.Group(), { kit: KIT });   // rue et égouts vides tant qu'on n'appelle pas update
});

const player = ({ lane = 1, z = 0, y = 0, vy = 0, under = false, h = PLAYER_H, grounded = y === 0 || y === SEWER_Y } = {}) =>
  ({ lane, x: LANES[lane], y, z, vy, h, under, grounded });
const below = (o) => player({ under: true, y: SEWER_Y, ...o });

// ---------- Rue ----------
test('marcher sur une bouche ouverte fait tomber dans les égouts, sans mourir', () => {
  ob.addHole(0, -20, true);
  const p = player({ lane: 0, z: -21 });
  const r = ob.resolve(p);
  assert.equal(r.crash, null);
  assert.equal(r.ground, SEWER_Y);
  assert.equal(p.under, true);
});

test('on ne tombe pas en sautant au-dessus, depuis une autre voie, ou sur une bouche refermée', () => {
  ob.addHole(0, -20, true);
  ob.addHole(2, -20, false);
  for (const p of [player({ lane: 0, z: -21, y: 1 }), player({ lane: 1, z: -21 }), player({ lane: 2, z: -21 })]) {
    ob.resolve(p);
    assert.equal(p.under, false, `voie ${p.lane}, y = ${p.y}`);
  }
});

test('en tombant, la zone d\'atterrissage est dégagée (pas de rat dessous, pas de grille devant)', () => {
  ob.addSewerObstacle(0, -24, 'rats');
  ob.addSewerObstacle(0, -100, 'grille');
  ob.addSewerObstacle(2, -24, 'rats');
  ob.addHole(0, -20, true);
  ob.resolve(player({ lane: 0, z: -21 }));
  // description courte : comparer les objets eux-mêmes (pleins de géométries) rendrait l'erreur illisible
  const left = ob.sList.filter((o) => o.kind !== 'deco').map((o) => `${o.rats ? 'rat' : o.kind} voie ${o.lane}`);
  assert.deepEqual(left, ['rat voie 2']);
});

// ---------- Égouts ----------
test('sur les quais on est au sec, au-dessus du canal on peut sauter, dans la boue on meurt', () => {
  for (const lane of [0, 2]) {
    const r = ob.resolve(below({ lane, z: -50 }));
    assert.equal(r.crash, null);
    assert.equal(r.ground, SEWER_Y);
  }
  const jumping = ob.resolve({ ...below({ z: -50, y: SEWER_Y + 1.5 }), x: 0 });
  assert.equal(jumping.crash, null);
  assert.ok(jumping.ground < SEWER_Y, 'pas de sol sous le canal');
  const sunk = ob.resolve({ ...below({ z: -50, y: SEWER_Y - 0.31 }), x: 0 });
  assert.equal(sunk.crash && sunk.crash.kind, 'sludge');
});

test('un rat tue si on le percute, pas si on saute par-dessus', () => {
  ob.addSewerObstacle(2, -30, 'rats');
  assert.ok(ob.resolve(below({ lane: 2, z: -30.5 })).crash);
  assert.equal(ob.resolve(below({ lane: 2, z: -30.5, y: SEWER_Y + 1.1 })).crash, null);
  assert.equal(ob.resolve(below({ lane: 0, z: -30.5 })).crash, null);
});

test('le tuyau se passe en roulade, la grille ne se passe pas', () => {
  ob.addSewerObstacle(0, -30, 'pipe');
  assert.ok(ob.resolve(below({ lane: 0, z: -30.3 })).crash);
  assert.equal(ob.resolve(below({ lane: 0, z: -30.3, h: PLAYER_SLIDE_H })).crash, null);
  ob.addSewerObstacle(2, -30, 'grille');
  assert.ok(ob.resolve(below({ lane: 2, z: -30.2, y: SEWER_Y + 3 })).crash);
});

test('les rats sont immobiles et regardent le joueur, sur les deux quais', () => {
  for (const lane of [0, 2]) {
    const rat = ob.addSewerObstacle(lane, -30, 'rats');
    assert.equal(rat.moving, false);
    assert.equal(rat.mesh.rotation.y, 0);
  }
});

test('en l\'air au-dessus des égouts, un changement de voie traverse tout le canal', () => {
  assert.equal(ob.laneTarget(below({ lane: 0, y: SEWER_Y + 1, grounded: false }), 1), 2);
  assert.equal(ob.laneTarget(below({ lane: 2, y: SEWER_Y + 1, grounded: false }), -1), 0);
  assert.equal(ob.laneTarget(below({ lane: 0 }), 1), 1, 'au sol : une voie à la fois (et la boue)');
  assert.equal(ob.laneTarget(player({ lane: 0, y: 1, grounded: false }), 1), 1, 'dans la rue : normal');
});

// ---------- Échelles ----------
test('sauter au pied d\'une échelle fait remonter, et la rue au-dessus est dégagée', () => {
  ob.addLadder(0, -40);
  ob.addBarrier(0, -60, 'low');
  const before = ob.list.length;
  assert.ok(ob.jumpBoost(below({ lane: 0, z: -38 })) > 25);
  assert.equal(ob.list.filter((o) => o.kind === 'low').length, 0, 'barrière de la voie de sortie enlevée');
  assert.ok(ob.list.some((o) => o.kind === 'deco' && o.lane === 0), 'bouche de sortie (refermée) posée');
  assert.ok(ob.list.length <= before);
});

test('sans échelle, sauter ne fait pas remonter', () => {
  ob.addLadder(2, -40);
  assert.equal(ob.jumpBoost(below({ lane: 0, z: -38 })), 0);
  assert.equal(ob.jumpBoost(below({ lane: 2, z: -60 })), 0);
});

test('un saut lancé un peu trop tôt (moins de 0,45 s) devient quand même un bond de sortie', () => {
  let now = 1000;
  mock.method(performance, 'now', () => now);
  ob.addLadder(0, -40);   // l'échelle compte de z = -34 à z = -43
  assert.equal(ob.jumpBoost(below({ lane: 0, z: -32 })), 0);
  now += 300;
  const p = below({ lane: 0, z: -35, y: SEWER_Y + 1, vy: 10, grounded: false });
  ob.resolve(p);
  assert.ok(p.vy > 25, `vitesse de sortie ${p.vy}`);
});

test('un saut lancé trop tôt (plus de 0,45 s) ne fait pas remonter', () => {
  let now = 1000;
  mock.method(performance, 'now', () => now);
  ob.addLadder(0, -40);
  ob.jumpBoost(below({ lane: 0, z: -25 }));
  now += 500;
  const p = below({ lane: 0, z: -35, y: SEWER_Y + 1, vy: 10, grounded: false });
  ob.resolve(p);
  assert.equal(p.vy, 10);
});

test('arrivé au niveau de la rue en montant, on est de retour à la surface', () => {
  const p = below({ lane: 0, z: -40, y: 0.1, vy: 8, grounded: false });
  const r = ob.resolve(p);
  assert.equal(p.under, false);
  assert.equal(r.ground, 0);
});

// ---------- Génération ----------
test('génération sur 4 km (10 parties) : bouches et obstacles toujours sur les côtés, échelles régulières', () => {
  for (let s = 1; s <= 10; s++) {
    seed(s);
    const o = new NYObstacles(new THREE.Group(), { kit: KIT });
    const seen = new Set(), holes = new Set();
    for (let z = 0; z > -4000; z -= 10) {
      o.update(z, 14 + (-z / 4000) * 20, -z);
      for (const x of o.sList) seen.add(x);
      for (const x of o.list) if (x.kind === 'hole') holes.add(x);
    }
    const all = [...seen];
    assert.ok(holes.size > 5, `partie ${s} : ${holes.size} bouches ouvertes`);
    assert.ok([...holes].every((h) => h.lane !== 1), `partie ${s} : bouche au milieu de la chaussée`);
    assert.ok(all.filter((x) => x.kind !== 'deco').every((x) => x.lane !== 1), `partie ${s} : obstacle dans la boue`);
    assert.ok(all.filter((x) => x.rats).every((x) => !x.moving && x.mesh.rotation.y === 0), `partie ${s} : rat qui bouge ou de dos`);
    const ladders = all.filter((x) => x.kind === 'ladder').map((x) => x.zFar).sort((a, b) => b - a);
    assert.ok(ladders.length > 20, `partie ${s} : ${ladders.length} échelles`);
    const gaps = ladders.slice(1).map((z, i) => ladders[i] - z);
    assert.ok(Math.max(...gaps) < 250, `partie ${s} : ${Math.max(...gaps).toFixed(0)} m sans échelle`);
  }
});
