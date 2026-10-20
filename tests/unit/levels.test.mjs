import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../helpers/env.mjs';
import * as Scores from '../../js/scores.js';
import { LEVELS, levelById, isUnlocked } from '../../js/levels/index.js';

beforeEach(() => storage.clear());
const L = (id) => levelById(id);

test('registre des niveaux : identifiants uniques, chargement et présentation', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), ['japon', 'paris', 'newyork']);
  for (const l of LEVELS) {
    assert.equal(typeof l.load, 'function', l.id);
    assert.ok(l.name && l.icon && l.item, l.id);
  }
  assert.equal(levelById('inconnu').id, 'japon');
});

test('chaque niveau se débloque grâce à un niveau qui le précède', () => {
  LEVELS.forEach((l, i) => {
    if (!l.unlock) return;
    const prev = LEVELS.findIndex((p) => p.id === l.unlock.level);
    assert.ok(prev >= 0 && prev < i, l.id);
    assert.ok(l.unlock.score > 0, l.id);
  });
});

test('Japon jouable d\'emblée, Paris à 1500 points au Japon', () => {
  assert.equal(isUnlocked(L('japon'), Scores), true);
  assert.equal(isUnlocked(L('paris'), Scores), false);
  Scores.addScore('japon', 'Aiko', 1499);
  assert.equal(isUnlocked(L('paris'), Scores), false);
  Scores.addScore('japon', 'Ben', 1500);
  assert.equal(isUnlocked(L('paris'), Scores), true);
});

test('New York à 2300 points à Paris (un score à un autre niveau ne compte pas)', () => {
  Scores.addScore('japon', 'Aiko', 9999);
  Scores.addScore('paris', 'Aiko', 2299);
  assert.equal(isUnlocked(L('newyork'), Scores), false);
  Scores.addScore('paris', 'Aiko', 2300);
  assert.equal(isUnlocked(L('newyork'), Scores), true);
});

test('le code secret débloque tout', () => {
  Scores.setAllUnlocked();
  for (const l of LEVELS) assert.equal(isUnlocked(l, Scores), true, l.id);
});
