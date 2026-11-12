// Règles du tombeau d'Égypte : chute par les dalles effondrées, obstacles (sarcophage, trésor, momie,
// poutre, porte scellée), sortie en courant sur l'escalier jusqu'à l'avenue.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { LANES, PLAYER_H, PLAYER_SLIDE_H } from '../../js/config.js';
import { TombObstacles, TOMB_Y, CEIL_Y, STAIR_LEN } from '../../js/levels/egypte/tomb.js';
import { egyptVehicleKit } from '../../js/levels/egypte/vehicles.js';

const KIT = egyptVehicleKit();
let ob;
beforeEach(() => {
  seed(1);
  ob = new TombObstacles(new THREE.Group(), { kit: KIT });   // avenue et tombeau vides tant qu'on n'appelle pas update
});

const player = ({ lane = 1, z = 0, y = 0, vy = 0, under = false, h = PLAYER_H, grounded = true } = {}) =>
  ({ lane, x: LANES[lane], y, z, vy, h, under, grounded });
const below = (o) => player({ under: true, y: TOMB_Y, ...o });
const label = (o) => `${o.type || o.kind} voie ${o.lane}`;

// ---------- Avenue ----------
test('une dalle effondrée fait tomber dans le tombeau, sans mourir, sur les trois voies', () => {
  for (const lane of [0, 1, 2]) {
    ob.reset(0);
    ob.addHole(lane, -20, true);
    const p = player({ lane, z: -21 });
    const r = ob.resolve(p);
    assert.equal(r.crash, null);
    assert.equal(r.ground, TOMB_Y);
    assert.equal(p.under, true, `voie ${lane}`);
  }
});

test('on ne tombe pas en sautant au-dessus, depuis une autre voie, ou sur le débouché d\'un escalier', () => {
  ob.addHole(0, -20, true);
  ob.addHole(2, -20, false);
  for (const p of [player({ lane: 0, z: -21, y: 1, grounded: false }), player({ lane: 1, z: -21 }), player({ lane: 2, z: -21 })]) {
    ob.resolve(p);
    assert.equal(p.under, false, `voie ${p.lane}, y = ${p.y}`);
  }
});

test('en tombant, la zone d\'atterrissage est dégagée (et pas de porte scellée devant)', () => {
  ob.addTombObstacle(1, -24, 'sarcophagus');
  ob.addTombObstacle(1, -100, 'door');
  ob.addTombObstacle(0, -24, 'treasure');
  ob.addHole(1, -20, true);
  ob.resolve(player({ lane: 1, z: -21 }));
  assert.deepEqual(ob.sList.filter((o) => o.kind !== 'deco').map(label), ['treasure voie 0']);
});

// ---------- Obstacles du tombeau ----------
test('sarcophage et trésor : on meurt en les percutant, pas en sautant par-dessus', () => {
  ob.addTombObstacle(0, -30, 'sarcophagus');
  ob.addTombObstacle(2, -30, 'treasure');
  for (const lane of [0, 2]) {
    assert.ok(ob.resolve(below({ lane, z: -30.4 })).crash, `voie ${lane}`);
    assert.equal(ob.resolve(below({ lane, z: -30.4, y: TOMB_Y + 1.1, grounded: false })).crash, null);
  }
  assert.equal(ob.resolve(below({ lane: 1, z: -30.4 })).crash, null);
});

test('la momie est haute : il faut sauter au bon moment, près du sommet du saut', () => {
  ob.addTombObstacle(1, -30, 'mummy');
  assert.ok(ob.resolve(below({ z: -30.3, y: TOMB_Y + 1.5, grounded: false })).crash);
  assert.equal(ob.resolve(below({ z: -30.3, y: TOMB_Y + 2.2, grounded: false })).crash, null);
});

test('la poutre tombée se passe en roulade ; la porte scellée ne se passe pas, même en sautant', () => {
  ob.addTombObstacle(0, -30, 'beam');
  assert.ok(ob.resolve(below({ lane: 0, z: -30.3 })).crash);
  assert.equal(ob.resolve(below({ lane: 0, z: -30.3, h: PLAYER_SLIDE_H })).crash, null);
  ob.addTombObstacle(2, -30, 'door');
  assert.ok(ob.resolve(below({ lane: 2, z: -30.3, y: TOMB_Y + 3.2, grounded: false })).crash);
});

// ---------- Escalier de sortie ----------
test('l\'escalier monte du sol du tombeau jusqu\'à l\'avenue, régulièrement', () => {
  const st = ob.addStair(1, -40);
  let prev = -Infinity;
  for (let d = 0.5; d <= STAIR_LEN; d += 1) {
    const g = ob.groundAt(0, -40 - d, 0, true);
    assert.ok(g > prev && g <= 0, `hauteur ${g} à ${d} m du pied`);
    prev = g;
  }
  assert.equal(ob.groundAt(0, st.zTop - 1, 0, true), 0, 'palier au niveau de l\'avenue');
  assert.equal(ob.groundAt(LANES[0], -50, 0, true), TOMB_Y, 'les autres voies restent au sol du tombeau');
});

test('en montant l\'escalier, l\'avenue au débouché est dégagée et la trémie apparaît', () => {
  const st = ob.addStair(2, -40);
  ob.addBarrier(2, st.zTop - 20, 'low');
  ob.addBarrier(1, st.zTop - 20, 'low');
  const p = below({ lane: 2, z: -45, y: TOMB_Y + 1.5 });
  const r = ob.resolve(p);
  assert.ok(r.ground > TOMB_Y + 1, 'sur les marches');
  assert.deepEqual(ob.list.filter((o) => o.kind === 'low').map((o) => o.lane), [1], 'barrière de la voie de sortie enlevée');
  assert.ok(ob.list.some((o) => o.kind === 'deco' && o.lane === 2), 'trémie de l\'escalier sur l\'avenue');
});

test('arrivé en haut des marches, on est de retour sur l\'avenue sans s\'arrêter', () => {
  const st = ob.addStair(1, -40);
  const p = below({ z: st.zTop + 0.5, y: ob.groundAt(0, st.zTop + 0.5, 0, true) });
  ob.resolve(p);
  assert.equal(p.under, true, 'encore dans l\'escalier');
  p.z = st.zTop - 1;
  p.y = 0;
  const r = ob.resolve(p);
  assert.equal(p.under, false);
  assert.equal(r.ground, 0);
  assert.equal(r.crash, null);
});

test('arriver de côté contre le flanc de l\'escalier est un choc', () => {
  ob.addStair(1, -40);
  assert.ok(ob.resolve(below({ lane: 1, z: -55 })).crash);
});

test('la caméra reste sous le plafond du tombeau, sauf pendant la montée de l\'escalier', () => {
  const out = new THREE.Vector3(0, 2, 0), look = new THREE.Vector3(0, 1, 0);
  const p = below({ z: -10 });
  ob.resolve(p);
  ob.clampCam(out, look, p);
  assert.ok(out.y <= CEIL_Y - 0.4);
  ob.addStair(1, -40);
  const q = below({ z: -55, y: -3 });
  ob.resolve(q);
  const out2 = new THREE.Vector3(0, 1, 0);
  ob.clampCam(out2, look, q);
  assert.equal(out2.y, 1);
});
