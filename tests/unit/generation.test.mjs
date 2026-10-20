// Tests de génération : pour chaque niveau, plusieurs parties rejouables de 4 km sont générées, et on
// vérifie les règles qui rendent le parcours jouable et cohérent (ce que la vue seule ne garantit pas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { LANES, TRAIN_TOP, PLAYER_H, speedAt } from '../../js/config.js';
import { levelById } from '../../js/levels/index.js';
import { Obstacles } from '../../js/obstacles.js';
import { Candies } from '../../js/candies.js';
import { World } from '../../js/world.js';

const SEEDS = 12, LENGTH = 4000, STEP = 4;
const defs = {};
for (const id of ['japon', 'paris', 'newyork']) defs[id] = (await levelById(id).load()).default;

// Partie simulée sans joueur : le monde avance de STEP mètres à la fois, à la vitesse du jeu.
// check(state) est appelé après chaque pas ; renvoie aussi tout ce qui a été généré.
function play(id, s, check = () => {}) {
  seed(s);
  const def = defs[id], root = new THREE.Group();
  const candies = new Candies(root, def.items());
  const opts = { candies, kit: def.obstacleKit() };
  const ob = def.obstacles ? def.obstacles(root, opts) : new Obstacles(root, opts);
  const seen = new Set(), seenCandies = new Set(), seenHazards = new Set();
  for (let pz = 0; pz > -LENGTH; pz -= STEP) {
    const speed = speedAt(-pz);
    ob.move(STEP / speed);
    ob.update(pz, speed, -pz);
    const fresh = ob.list.filter((o) => !seen.has(o));
    fresh.forEach((o) => seen.add(o));
    const freshC = candies.list.filter((c) => !seenCandies.has(c));
    freshC.forEach((c) => seenCandies.add(c));
    const freshH = candies.fugus.filter((f) => !seenHazards.has(f));
    freshH.forEach((f) => seenHazards.add(f));
    check({ ob, pz, fresh, freshC, freshH });
  }
  return { ob, all: [...seen], candies: [...seenCandies], hazards: [...seenHazards] };
}
const where = (id, s, z) => `${id}, partie ${s}, à ${Math.round(-z)} m`;
const isStatic = (o) => !o.moving && o.kind !== 'deco';
const covers = (o, z) => z <= o.zNear && z >= o.zFar;

for (const id of ['japon', 'paris', 'newyork']) {
  test(`${id} : jamais les trois voies fermées par des véhicules sans rampe pour monter dessus`, () => {
    for (let s = 1; s <= SEEDS; s++) {
      play(id, s, ({ ob, pz, fresh }) => {
        if (!fresh.length) return;
        for (let z = pz - 60; z > pz - 230; z -= 1) {
          const trains = [0, 1, 2].map((l) => ob.list.find((o) => o.kind === 'train' && o.lane === l && z <= o.trainFront && z >= o.zFar));
          if (trains.every(Boolean)) assert.ok(trains.some((t) => t.rampLen > 0), `mur de véhicules (${where(id, s, z)})`);
        }
      });
    }
  });

  test(`${id} : deux obstacles immobiles ne se chevauchent jamais dans une même voie`, () => {
    for (let s = 1; s <= SEEDS; s++) {
      const { all } = play(id, s);
      const fixed = all.filter(isStatic);
      for (const a of fixed) {
        for (const b of fixed) {
          if (a === b || a.lane !== b.lane || a.hitch || b.hitch) continue;
          assert.ok(a.zFar >= b.zNear || b.zFar >= a.zNear, `${a.kind} et ${b.kind} superposés voie ${a.lane} (${where(id, s, a.zNear)})`);
        }
      }
    }
  });

  test(`${id} : entre deux obstacles d'une même voie, au moins 7 m et une demi-seconde de course pour se reposer`, () => {
    for (let s = 1; s <= SEEDS; s++) {
      const fixed = play(id, s).all.filter((o) => isStatic(o) && !o.hitch);
      for (const l of [0, 1, 2]) {
        const lane = fixed.filter((o) => o.lane === l).sort((a, b) => b.zNear - a.zNear);
        for (let i = 1; i < lane.length; i++) {
          const a = lane[i - 1], b = lane[i], gap = a.zFar - b.zNear;
          // une bouche juste derrière un véhicule : y tomber en redescendant du toit ne tue pas
          if (b.kind === 'hole') { assert.ok(gap >= 6, `bouche à ${gap.toFixed(1)} m (${where(id, s, b.zNear)})`); continue; }
          assert.ok(gap >= 7 && gap / speedAt(-b.zNear) >= 0.45,
            `${a.kind} puis ${b.kind} à ${gap.toFixed(1)} m, voie ${l} (${where(id, s, b.zNear)})`);
        }
      }
    }
  });

  test(`${id} : un véhicule qui roule ne traverse jamais un obstacle de sa voie`, () => {
    for (let s = 1; s <= SEEDS; s++) {
      play(id, s, ({ ob, pz }) => {
        for (const m of ob.list) {
          if (!m.moving || m.kind !== 'train' || m.zFar > pz) continue;
          const hit = ob.list.find((o) => o !== m && o.lane === m.lane && !o.moving && o.kind !== 'deco' && o.zFar < m.zNear && o.zNear > m.zFar);
          assert.ok(!hit, `véhicule qui roule dans ${hit && hit.kind}, voie ${m.lane} (${where(id, s, m.zNear)})`);
        }
      });
    }
  });

  test(`${id} : les friandises ne sont jamais enfouies dans un véhicule ou une barrière`, () => {
    for (let s = 1; s <= SEEDS; s++) {
      play(id, s, ({ ob, freshC }) => {
        for (const c of freshC) {
          if (c.y < 0) continue;   // égouts
          const g = ob.groundAt(c.x, c.z);
          assert.ok(c.y >= g + 0.4, `friandise dans un véhicule à y = ${c.y.toFixed(2)} (${where(id, s, c.z)})`);
          const low = ob.list.find((o) => o.kind === 'low' && Math.abs(o.x - c.x) < 0.5 && c.z <= o.zNear + 0.2 && c.z >= o.zFar - 0.2);
          assert.ok(!low || c.y > (low.h || 1), `friandise dans une barrière (${where(id, s, c.z)})`);
        }
      });
    }
  });

  test(`${id} : le malus n'est jamais sur une rampe ni collé à une barrière (on peut toujours l'éviter)`, () => {
    let total = 0;
    for (let s = 1; s <= SEEDS; s++) {
      play(id, s, ({ ob, freshH }) => {
        for (const f of freshH) {
          total++;
          const g = ob.groundAt(f.x, f.z);
          assert.ok(g === 0 || g >= TRAIN_TOP - 0.01 || g >= ob.trainTop - 0.01, `malus sur une rampe (${where(id, s, f.z)})`);
          const b = ob.barrierNear(f.lane, f.z);
          assert.ok(!b || b.d >= 4, `malus à ${b && b.d.toFixed(1)} m d'une barrière (${where(id, s, f.z)})`);
        }
      });
    }
    assert.ok(total > SEEDS, `${total} malus générés`);
  });
}

// ---------- New York ----------
test('newyork : un seul taxi par véhicule qui roule, jusqu\'à trois à l\'arrêt', () => {
  let moving = 0, parkedTaxis = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const { all } = play('newyork', s);
    for (const o of all.filter((o) => o.kind === 'train')) {
      if (o.moving) {
        moving++;
        assert.equal(o.mesh.userData.len, 4.6, `véhicule qui roule de ${o.mesh.userData.len} m (partie ${s})`);
      } else if (o.mesh.userData.len !== undefined) {
        parkedTaxis++;
        assert.ok(o.mesh.userData.len <= 3 * 4.6 + 2 * 0.9 + 0.01, `file de taxis de ${o.mesh.userData.len} m (partie ${s})`);
      }
    }
  }
  assert.ok(moving > 5 && parkedTaxis > 5, `${moving} taxis qui roulent, ${parkedTaxis} files à l'arrêt`);
});

test('newyork : les bouches ouvertes sont sur les voies de côté, jamais sous un véhicule qui roule', () => {
  for (let s = 1; s <= SEEDS; s++) {
    play('newyork', s, ({ ob, pz }) => {
      for (const h of ob.list) {
        if (h.kind !== 'hole') continue;
        assert.notEqual(h.lane, 1, `bouche au milieu (${where('newyork', s, h.zNear)})`);
        const car = ob.list.find((o) => o.moving && o.lane === h.lane && o.zFar < h.zNear && o.zNear > h.zFar && h.zNear < pz);
        assert.ok(!car, `taxi qui roule sur une bouche ouverte (${where('newyork', s, h.zNear)})`);
      }
    });
  }
});

// ---------- Décor ----------
// Le couloir des trois voies (véhicules compris) doit rester libre : aucun décor plus haut que le sol
// (0,35 m) n'y entre en dessous de la hauteur d'une personne debout sur le toit d'un véhicule.
const CORRIDOR = LANES[2] + 1.15, CLEAR = TRAIN_TOP + PLAYER_H + 0.3, FLAT = 0.35;
for (const id of ['japon', 'paris', 'newyork']) {
  test(`${id} : le décor n'empiète jamais sur les trois voies`, () => {
    const v = new THREE.Vector3();
    for (let s = 1; s <= 3; s++) {
      seed(s);
      const w = new World(new THREE.Group(), defs[id].world);
      w.reset(0);
      const done = new Set();
      for (let pz = 0; pz > -3000; pz -= 16) {
        w.update(0.016, pz, 20, true);
        for (const it of w.items) {
          if (done.has(it)) continue;
          done.add(it);
          it.mesh.updateMatrixWorld(true);
          it.mesh.traverse((m) => {
            if (!m.isMesh) return;
            const p = m.geometry.attributes.position;
            for (let i = 0; i < p.count; i++) {
              v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
              if (Math.abs(v.x) < CORRIDOR && v.y > FLAT && v.y < CLEAR) {
                assert.fail(`décor dans la chaussée en x = ${v.x.toFixed(2)}, y = ${v.y.toFixed(2)} (${where(id, s, v.z)})`);
              }
            }
          });
        }
      }
      assert.ok(done.size > 50, `${done.size} éléments de décor`);
    }
  });
}
