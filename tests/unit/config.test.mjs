import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speedAt, BASE_SPEED, MAX_SPEED, LANES } from '../../js/config.js';

test('la vitesse part de BASE_SPEED, augmente sans cesse et ne dépasse jamais MAX_SPEED', () => {
  assert.equal(speedAt(0), BASE_SPEED);
  let prev = speedAt(0);
  for (let d = 100; d <= 50000; d += 100) {
    const s = speedAt(d);
    assert.ok(s > prev || s === MAX_SPEED, `vitesse non croissante à ${d} m`);
    assert.ok(s <= MAX_SPEED, `vitesse ${s} > ${MAX_SPEED} à ${d} m`);
    prev = s;
  }
  assert.ok(speedAt(20000) > MAX_SPEED - 0.1);
});

test('trois voies symétriques', () => {
  assert.equal(LANES.length, 3);
  assert.equal(LANES[1], 0);
  assert.equal(LANES[0], -LANES[2]);
});
