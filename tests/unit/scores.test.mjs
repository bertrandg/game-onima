import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../helpers/env.mjs';
import * as Scores from '../../js/scores.js';

beforeEach(() => storage.clear());

test('les scores sont triés du meilleur au moins bon, avec le rang du nouveau score', () => {
  Scores.addScore('paris', 'Aiko', 500);
  Scores.addScore('paris', 'Ben', 1200);
  const { rank } = Scores.addScore('paris', 'Chloé', 800);
  assert.equal(rank, 2);
  assert.deepEqual(Scores.loadScores('paris').map((e) => e.score), [1200, 800, 500]);
});

test('chaque niveau a son propre tableau', () => {
  Scores.addScore('japon', 'Aiko', 100);
  Scores.addScore('newyork', 'Aiko', 300);
  assert.equal(Scores.loadScores('japon').length, 1);
  assert.equal(Scores.loadScores('paris').length, 0);
  assert.equal(Scores.bestOnLevel('newyork'), 300);
});

test('le Japon garde la clé d\'origine (les anciens scores ne sont pas perdus)', () => {
  storage.setItem('onima.scores.v1', JSON.stringify([{ id: 'x', name: 'Ancien', score: 999, date: 1 }]));
  assert.equal(Scores.bestOnLevel('japon'), 999);
  assert.equal(Scores.loadScores('japon')[0].name, 'Ancien');
});

test('on garde au plus 50 scores, les meilleurs', () => {
  for (let i = 1; i <= 60; i++) Scores.addScore('japon', 'J', i * 10);
  const list = Scores.loadScores('japon');
  assert.equal(list.length, 50);
  assert.equal(list[0].score, 600);
  assert.equal(list[49].score, 110);
});

test('meilleur score d\'un joueur et meilleur score de l\'appareil', () => {
  Scores.addScore('paris', 'Aiko', 700);
  Scores.addScore('paris', 'Aiko', 400);
  Scores.addScore('paris', 'Ben', 900);
  assert.equal(Scores.bestFor('paris', 'Aiko'), 700);
  assert.equal(Scores.bestFor('paris', 'Inconnu'), 0);
  assert.equal(Scores.bestOnLevel('paris'), 900);
});

test('nom, niveau choisi et code secret sont mémorisés', () => {
  assert.equal(Scores.getName(), '');
  assert.equal(Scores.getLevel(), 'japon');
  assert.equal(Scores.allUnlocked(), false);
  Scores.setName('Sakura');
  Scores.setLevel('newyork');
  Scores.setAllUnlocked();
  assert.equal(Scores.getName(), 'Sakura');
  assert.equal(Scores.getLevel(), 'newyork');
  assert.equal(Scores.allUnlocked(), true);
});

test('données abîmées ou stockage refusé : le jeu continue sans planter', () => {
  storage.setItem('onima.scores.paris.v1', '{pas du json');
  assert.deepEqual(Scores.loadScores('paris'), []);
  storage.setItem('onima.scores.paris.v1', '{"a":1}');
  assert.deepEqual(Scores.loadScores('paris'), []);
  storage.broken = true;
  assert.deepEqual(Scores.loadScores('paris'), []);
  assert.equal(Scores.addScore('paris', 'Aiko', 100).rank, 1);
  assert.equal(Scores.getName(), '');
  assert.equal(Scores.getLevel(), 'japon');
  assert.equal(Scores.allUnlocked(), false);
  assert.doesNotThrow(() => { Scores.setName('x'); Scores.setLevel('paris'); Scores.setAllUnlocked(); });
});
