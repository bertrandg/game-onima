// Scintillement (« z-fighting ») : deux faces horizontales posées exactement à la même hauteur l'une sur
// l'autre se disputent les pixels et clignotent quand la caméra bouge. On le vérifie sur les dessus des
// véhicules et des obstacles de chaque niveau, là où le joueur court et regarde de près.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../helpers/env.mjs';
import * as THREE from 'three';
import { levelById } from '../../js/levels/index.js';

const EPS = 0.004;   // écart de hauteur en dessous duquel deux faces se battent pour les mêmes pixels
const MIN_AREA = 0.01;   // on ignore les détails minuscules (lettrages, rayons) : ça ne se voit pas

// triangles tournés vers le haut, en coordonnées du monde
function upFaces(obj) {
  const out = [];
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    if (!m.isMesh || m.isInstancedMesh || !m.visible) return;
    // maillage à squelette (chevaux) : sommets placés par les os, comme à l'écran
    const skin = m.isSkinnedMesh;
    const g = m.geometry.index && !skin ? m.geometry.toNonIndexed() : m.geometry;
    const idx = skin && g.index ? (i) => g.index.getX(i) : (i) => i;
    const count = skin && g.index ? g.index.count : g.attributes.position.count;
    const p = g.attributes.position, col = g.attributes.color, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const n = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const vert = (v, i) => (skin ? m.getVertexPosition(idx(i), v) : v.fromBufferAttribute(p, i)).applyMatrix4(m.matrixWorld);
    for (let i = 0; i + 2 < count; i += 3) {
      vert(a, i); vert(b, i + 1); vert(c, i + 2);
      n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      const area = n.length() / 2;
      if (area < 1e-4 || n.y / (2 * area) < 0.999) continue;
      if (area < MIN_AREA) continue;
      // couleur de la face : deux faces de même couleur et même matière au même niveau ne se voient pas
      const tint = col ? [col.getX(idx(i)), col.getY(idx(i)), col.getZ(idx(i))].map((v) => v.toFixed(2)).join() : '';
      const look = `${m.material.uuid}:${tint}`;
      out.push({ y: (a.y + b.y + c.y) / 3, t: [[a.x, a.z], [b.x, b.z], [c.x, c.z]], look });
    }
  });
  return out;
}
const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
function strictlyInside(pt, t) {
  const d1 = cross(t[0], t[1], pt), d2 = cross(t[1], t[2], pt), d3 = cross(t[2], t[0], pt);
  const m = 1e-4;
  return (d1 > m && d2 > m && d3 > m) || (d1 < -m && d2 < -m && d3 < -m);
}
const centroid = (t) => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3];

// paires de faces qui se recouvrent au même niveau
function fights(obj) {
  const f = upFaces(obj).sort((u, v) => u.y - v.y), bad = [];
  for (let i = 0; i < f.length; i++) {
    for (let j = i + 1; j < f.length && f[j].y - f[i].y < EPS; j++) {
      if (f[i].look === f[j].look) continue;
      if (strictlyInside(centroid(f[i].t), f[j].t) || strictlyInside(centroid(f[j].t), f[i].t)) bad.push(f[i].y.toFixed(3));
    }
  }
  return [...new Set(bad)];
}

for (const id of ['japon', 'paris', 'newyork', 'egypte', 'hongkong', 'mall']) {
  test(`${id} : aucun dessus de véhicule ou d'obstacle ne scintille`, async () => {
    seed(3);
    const def = (await levelById(id).load()).default, kit = def.obstacleKit();
    const parts = [];
    for (const moving of [false, true]) for (let k = 0; k < 6; k++) parts.push([moving ? 'véhicule en marche' : 'convoi', kit.buildVehicle(1, moving)]);
    if (kit.rampGeo) parts.push(['rampe', new THREE.Mesh(kit.rampGeo)]);
    (kit.low || []).forEach((l, i) => parts.push([`obstacle bas ${i}`, new THREE.Mesh(l.geo)]));
    const problems = [];
    for (const [name, obj] of parts) {
      const ys = fights(obj);
      if (ys.length) problems.push(`${name} : faces superposées à y = ${ys.join(', ')}`);
    }
    assert.deepEqual([...new Set(problems)], []);
  });
}
