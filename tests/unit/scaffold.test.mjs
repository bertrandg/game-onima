// Règles des passerelles d'échafaudage de Hong Kong : montée par la rampe ou depuis un toit, plancher qu'on
// traverse par en dessous, obstacles d'en haut, planches manquantes et bout de passerelle (on retombe dans
// la rue sans perdre).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { LANES, PLAYER_H, PLAYER_SLIDE_H, TRAIN_TOP } from '../../js/config.js';
import { ScaffoldObstacles, UP_Y, MOD, RAMP_UP_LEN } from '../../js/levels/hongkong/scaffold.js';
import { hongKongVehicleKit } from '../../js/levels/hongkong/vehicles.js';

const KIT = hongKongVehicleKit();
let ob, sec;
beforeEach(() => {
  seed(1);
  ob = new ScaffoldObstacles(new THREE.Group(), { kit: KIT });
  // une rampe dans la voie du milieu (pied en z = -20), passerelle de 160 m à partir de son sommet
  ob.addRamp(1, -20);
  sec = ob.addSection(-20 - RAMP_UP_LEN, 160);
});

const player = ({ lane = 1, z = 0, y = 0, vy = 0, under = false, h = PLAYER_H, grounded = true } = {}) =>
  ({ lane, x: LANES[lane], y, z, vy, h, under, grounded });
const up = (o) => player({ under: true, y: UP_Y, ...o });

// ---------- Monter ----------
test('la rampe monte régulièrement de la rue jusqu\'au plancher', () => {
  let prev = -1;
  for (let d = 0.5; d < RAMP_UP_LEN; d += 1) {
    const g = ob.groundAt(0, -20 - d);
    assert.ok(g > prev && g < UP_Y, `hauteur ${g} à ${d} m du pied`);
    prev = g;
  }
  assert.equal(ob.groundAt(LANES[0], -30), 0, 'les autres voies restent au niveau de la rue');
});

test('en haut de la rampe, on passe sur la passerelle sans s\'arrêter', () => {
  const p = player({ z: sec.zStart - 0.2, y: UP_Y - 0.05 });
  const r = ob.resolve(p);
  assert.equal(p.under, true);
  assert.equal(r.ground, UP_Y);
  assert.equal(r.crash, null);
});

test('arriver de côté contre la rampe est un choc', () => {
  assert.ok(ob.resolve(player({ lane: 1, z: -32 })).crash);
});

test('en retombant d\'un saut depuis le toit d\'un minibus, on atterrit sur la passerelle', () => {
  const p = player({ lane: 0, z: sec.zStart - 30, y: UP_Y - 0.1, vy: -6, grounded: false });
  ob.resolve(p);
  assert.equal(p.under, true);
  assert.ok(TRAIN_TOP + 3.2 > UP_Y, 'un saut depuis un toit dépasse bien le plancher');
});

test('le plancher se traverse par en dessous : un saut depuis la rue ne s\'y accroche pas', () => {
  const p = player({ lane: 2, z: sec.zStart - 30, y: UP_Y - 0.2, vy: 6, grounded: false });
  ob.resolve(p);
  assert.equal(p.under, false);
});

// ---------- Là-haut ----------
test('climatiseurs et plantes : on meurt en les percutant, pas en sautant par-dessus', () => {
  const z = sec.zStart - 40;
  ob.addUpObstacle(0, z, 'ac');
  ob.addUpObstacle(2, z, 'plants');
  for (const lane of [0, 2]) {
    assert.ok(ob.resolve(up({ lane, z: z - 0.3 })).crash, `voie ${lane}`);
    assert.equal(ob.resolve(up({ lane, z: z - 0.3, y: UP_Y + 1.1, grounded: false })).crash, null);
  }
  assert.equal(ob.resolve(up({ lane: 1, z: z - 0.3 })).crash, null);
});

test('la corde à linge se passe en roulade ; le réservoir d\'eau ne se passe pas', () => {
  const z = sec.zStart - 40;
  ob.addUpObstacle(0, z, 'laundry');
  assert.ok(ob.resolve(up({ lane: 0, z: z - 0.15 })).crash);
  assert.equal(ob.resolve(up({ lane: 0, z: z - 0.15, h: PLAYER_SLIDE_H })).crash, null);
  ob.addUpObstacle(2, z, 'tank');
  assert.ok(ob.resolve(up({ lane: 2, z: z - 0.5, y: UP_Y + 3, grounded: false })).crash);
});

test('les obstacles de la rue ne gênent pas là-haut, et inversement', () => {
  const z = sec.zStart - 40;
  ob.addBarrier(1, z, 'low');
  assert.equal(ob.resolve(up({ z: z - 0.2 })).crash, null, 'barrière de la rue sous la passerelle');
  ob.addUpObstacle(0, z - 20, 'ac');
  assert.equal(ob.resolve(player({ lane: 0, z: z - 20.3 })).crash, null, 'climatiseur au-dessus de la rue');
});

// ---------- Redescendre ----------
test('une planche manquante fait retomber dans la rue, sans perdre', () => {
  const k = 8;
  ob.addGap(sec, 1, k);
  const z = sec.zStart - k * MOD - 1;
  const p = up({ z });
  const r = ob.resolve(p);
  assert.equal(r.crash, null);
  assert.ok(r.ground < UP_Y, 'plus de plancher sous les pieds');
  p.y = UP_Y - 0.5;
  const r2 = ob.resolve(p);
  assert.equal(p.under, false, 'de retour dans la rue');
  assert.equal(r2.ground, 0);
});

test('on peut sauter par-dessus une planche manquante et rester là-haut', () => {
  ob.addGap(sec, 1, 8);
  const p = up({ z: sec.zStart - 8 * MOD - 1, y: UP_Y + 1.5, vy: 3, grounded: false });
  ob.resolve(p);
  assert.equal(p.under, true);
  p.z = sec.zStart - 9 * MOD - 1;
  p.y = UP_Y - 0.01;
  assert.equal(ob.resolve(p).ground, UP_Y);
});

test('au bout de la passerelle, on retombe dans la rue', () => {
  const p = up({ z: sec.zEnd - 0.5 });
  assert.ok(ob.resolve(p).ground < UP_Y);
  p.y = UP_Y - 0.6;
  ob.resolve(p);
  assert.equal(p.under, false);
});

test('le malus ne se pose jamais sur une rampe', () => {
  assert.equal(ob.barrierNear(1, -25).kind, 'ramp');
  assert.equal(ob.barrierNear(0, -25), null);
});

test('dans la rue sous une passerelle, la caméra reste sous le plancher', () => {
  const out = new THREE.Vector3(0, 7, sec.zStart - 20), look = new THREE.Vector3(0, 5, sec.zStart - 30);
  ob.clampCam(out, look, player({ z: sec.zStart - 26 }));
  assert.ok(out.y < UP_Y - 0.5);
  const out2 = new THREE.Vector3(0, 9, sec.zStart - 20);
  ob.clampCam(out2, look, up({ z: sec.zStart - 26 }));
  assert.equal(out2.y, 9, 'sur la passerelle, la caméra est libre');
});
