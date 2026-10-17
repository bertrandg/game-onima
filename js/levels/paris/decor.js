import * as THREE from 'three';
import { Builder, U, pick, rand } from '../../geo.js';

// Décor latéral de Paris 1900. Chaque élément est construit "face à +x" (vers la voie quand il est
// à gauche), origine au sol, centré en z. Le moteur (world.js) les assemble par tranches fusionnées.

const BALL = new THREE.SphereGeometry(1, 6, 4);   // petites sphères (fruits, fleurs, boules) : très peu de triangles
const IRON = '#2f4a3a';          // vert fonte des mobiliers parisiens
const IRON_DARK = '#22352a';
const GOLD = '#d8b04a';
const STONE = ['#e8dcc4', '#efe4cc', '#e2d4b8', '#eadfca'];
const ZINC = '#7f8a9a';
const ri = (a, b) => Math.floor(rand(a, b + 1));

// ---------- Immeuble haussmannien ----------
function haussmann(b) {
  const W = 8, L = rand(10, 13), floors = ri(4, 5);
  const G = 4.2, F = 3.1, Hb = G + floors * F;
  const stone = pick(STONE);
  const fx = W / 2;   // façade côté voie
  b.add(U.box, stone, [0, Hb / 2, 0], [W, Hb, L]);
  // bandeaux de pierre à chaque étage et corniche
  for (let f = 0; f <= floors; f++) b.add(U.box, '#d8cab0', [fx + 0.08, G + f * F - 0.05, 0], [0.18, 0.14, L + 0.02]);
  b.add(U.box, '#d2c3a6', [fx + 0.2, Hb - 0.1, 0], [0.4, 0.3, L + 0.1]);
  // rez-de-chaussée : deux boutiques avec vitrines, enseignes et stores rayés
  const shops = [pick(['#2c5a3a', '#6e1c2c', '#1f3157', '#3a2a20', '#5a3a6a']), pick(['#2c5a3a', '#6e1c2c', '#1f3157', '#3a2a20', '#7a5a20'])];
  for (let k = 0; k < 2; k++) {
    const zc = (k - 0.5) * (L / 2);
    const sw = L / 2 - 0.6;
    b.add(U.box, shops[k], [fx + 0.06, G / 2 - 0.2, zc], [0.12, G - 0.6, sw]);
    b.add(U.box, '#24303a', [fx + 0.1, 1.55, zc], [0.04, 2.2, sw - 0.6]);
    b.add(U.box, '#f2e6c8', [fx + 0.1, 1.55, zc], [0.03, 2.25, 0.06]);
    b.add(U.box, GOLD, [fx + 0.14, 3.15, zc], [0.03, 0.12, sw * 0.7]);   // lettres de l'enseigne
    // store banne rayé
    const sc = pick([['#c8302a', '#f4ecd8'], ['#2c5a3a', '#f4ecd8'], ['#1f3157', '#f4ecd8'], ['#d8a830', '#f4ecd8']]);
    const n = Math.floor(sw / 0.4);
    for (let i = 0; i < n; i++) {
      b.add(U.box, sc[i % 2], [fx + 0.75, 3.45, zc - sw / 2 + 0.2 + i * 0.4], [1.5, 0.05, 0.4], [0, 0, -0.35]);
    }
    for (let i = 0; i < n; i++) b.add(U.box, sc[i % 2], [fx + 1.45, 3.1, zc - sw / 2 + 0.2 + i * 0.4], [0.03, 0.22, 0.38]);
  }
  // porte cochère au centre
  b.add(U.box, '#3a2a20', [fx + 0.06, 1.7, 0], [0.12, 3.4, 1.2]);
  b.add(U.box, GOLD, [fx + 0.13, 1.7, 0], [0.02, 0.06, 1.1]);
  // fenêtres des étages, balcons filants aux 2e et 5e
  const nw = Math.floor(L / 1.7);
  for (let f = 0; f < floors; f++) {
    const y = G + f * F + 1.25;
    for (let i = 0; i < nw; i++) {
      const z = -L / 2 + (i + 0.5) * (L / nw);
      b.add(U.box, '#efe6d2', [fx + 0.04, y + 0.05, z], [0.06, 1.9, 0.95]);
      b.add(U.box, '#2a3440', [fx + 0.07, y, z], [0.03, 1.7, 0.75]);
      b.add(U.box, '#efe6d2', [fx + 0.09, y + 0.2, z], [0.02, 0.05, 0.75]);
      b.add(U.box, '#d8cab0', [fx + 0.12, y + 1.05, z], [0.14, 0.1, 1.0]);   // fronton
      if (f !== 0 && f !== 3) {   // garde-corps individuel
        b.add(U.box, '#1a1a1c', [fx + 0.25, y - 0.55, z], [0.04, 0.04, 0.9]);
        for (let k = 0; k < 3; k++) b.add(U.box, '#1a1a1c', [fx + 0.25, y - 0.72, z - 0.3 + k * 0.3], [0.02, 0.36, 0.02]);
      }
    }
    if (f === 0 || f === 3) {   // balcon filant
      b.add(U.box, '#d8cab0', [fx + 0.4, y - 0.92, 0], [0.8, 0.12, L]);
      b.add(U.box, '#1a1a1c', [fx + 0.78, y - 0.05, 0], [0.04, 0.04, L]);
      for (let k = 0; k < L / 0.55; k++) b.add(U.box, '#1a1a1c', [fx + 0.78, y - 0.45, -L / 2 + k * 0.55], [0.025, 0.8, 0.025]);
    }
  }
  // toit mansardé en zinc, lucarnes, cheminées
  b.add(U.roof, ZINC, [0, Hb, 0], [W + 0.3, 3.6, L]);
  b.add(U.box, '#6a7484', [0, Hb + 3.55, 0], [0.3, 0.12, L]);
  for (let i = 0; i < nw; i += 1) {
    const z = -L / 2 + (i + 0.5) * (L / nw);
    b.add(U.box, '#e8e0cc', [fx - 1.2, Hb + 1.3, z], [0.9, 1.3, 0.75]);
    b.add(U.box, '#2a3440', [fx - 0.74, Hb + 1.25, z], [0.03, 0.9, 0.5]);
    b.add(U.roof, ZINC, [fx - 1.2, Hb + 1.95, z], [0.9, 0.45, 0.85], [0, Math.PI / 2, 0]);
  }
  for (const z of [-L / 2 + 1, L / 2 - 1, rand(-2, 2)]) {   // souches de cheminée et leurs pots
    const x = rand(-1.5, 0.5);
    b.add(U.box, '#b8644a', [x, Hb + 3.6, z], [0.7, 1.4, 0.5]);
    for (const dz of [-0.12, 0.12]) b.add(U.cyl6, '#c87a5a', [x, Hb + 4.42, z + dz], [0.07, 0.25, 0.07]);
  }
}

// Immeuble de l'autre rive : fenêtres, balcons filants, boutiques et mansardes, avec platanes du quai d'en face
function haussmannFar(b) {
  const W = 8, L = rand(10, 13), floors = ri(4, 6), G = 4.2, F = 3.1, Hb = G + floors * F;
  const fx = W / 2, stone = pick(STONE);
  b.add(U.box, stone, [0, Hb / 2, 0], [W, Hb, L]);
  for (let f = 0; f <= floors; f++) b.add(U.box, '#d2c3a6', [fx + 0.08, G + f * F - 0.05, 0], [0.16, 0.16, L]);
  b.add(U.box, '#cbbb9c', [fx + 0.2, Hb - 0.1, 0], [0.4, 0.32, L + 0.1]);   // corniche
  // rez-de-chaussée : boutiques colorées sous stores
  for (let k = 0; k < 2; k++) {
    const zc = (k - 0.5) * (L / 2), sw = L / 2 - 0.6;
    b.add(U.box, pick(['#2c5a3a', '#6e1c2c', '#1f3157', '#3a2a20', '#7a5a20']), [fx + 0.05, 1.8, zc], [0.1, 3.2, sw]);
    b.add(U.box, '#2a3440', [fx + 0.08, 1.5, zc], [0.04, 2.0, sw - 0.6]);
    b.add(U.box, pick(['#c8302a', '#2c5a3a', '#d8a830', '#1f3157']), [fx + 0.7, 3.45, zc], [1.4, 0.06, sw], [0, 0, -0.35]);
  }
  // fenêtres hautes, balcons filants au 2e et au dernier étage
  const nw = Math.floor(L / 1.8);
  for (let f = 0; f < floors; f++) {
    const y = G + f * F + 1.25;
    for (let i = 0; i < nw; i++) {
      const z = -L / 2 + (i + 0.5) * (L / nw);
      b.add(U.box, '#efe6d2', [fx + 0.04, y + 0.05, z], [0.06, 1.85, 0.9]);
      b.add(U.box, Math.random() < 0.15 ? '#f2d890' : '#2f3a46', [fx + 0.07, y, z], [0.03, 1.65, 0.7]);
      b.add(U.box, '#d8cab0', [fx + 0.1, y + 1.0, z], [0.12, 0.1, 0.95]);
    }
    if (f === 0 || f === floors - 1) {
      b.add(U.box, '#d8cab0', [fx + 0.35, y - 0.9, 0], [0.7, 0.12, L]);
      b.add(U.box, '#1a1a1c', [fx + 0.68, y - 0.45, 0], [0.04, 0.8, L]);
    }
  }
  // toit mansardé, lucarnes, cheminées
  b.add(U.roof, ZINC, [0, Hb, 0], [W + 0.3, 3.6, L]);
  for (let i = 0; i < nw; i++) {
    const z = -L / 2 + (i + 0.5) * (L / nw);
    b.add(U.box, '#e8e0cc', [fx - 1.2, Hb + 1.3, z], [0.9, 1.2, 0.7]);
    b.add(U.box, '#2a3440', [fx - 0.74, Hb + 1.25, z], [0.03, 0.8, 0.45]);
  }
  for (const z of [-L / 2 + 1, L / 2 - 1]) b.add(U.box, '#b8644a', [rand(-1.5, 0.5), Hb + 3.5, z], [0.7, 1.3, 0.5]);
  // quai d'en face : platanes devant les façades
  if (Math.random() < 0.7) {
    const z = rand(-L / 3, L / 3), tx = fx + rand(3, 5);
    b.add(U.cyl6, '#8a8268', [tx, 2, z], [0.22, 4, 0.22]);
    for (let i = 0; i < 4; i++) b.add(BALL, pick(['#7aa04a', '#8ab458', '#6a9040']), [tx + rand(-1, 1), 4.6 + rand(0, 1.4), z + rand(-1.2, 1.2)], [rand(1.4, 2), rand(1.1, 1.5), rand(1.4, 2)]);
  }
}

// ---------- Mobilier urbain ----------
function lamppost(b) {   // réverbère à lanterne
  b.add(U.cyl6, IRON_DARK, [0, 0.2, 0], [0.22, 0.4, 0.22]);
  b.add(U.cyl6, IRON, [0, 0.55, 0], [0.14, 0.4, 0.14]);
  b.add(U.cyl6, IRON, [0, 2.2, 0], [0.06, 3.4, 0.06]);
  b.add(U.cyl6, GOLD, [0, 1.1, 0], [0.09, 0.06, 0.09]);
  b.add(U.box, IRON, [0, 3.85, 0], [0.12, 0.1, 0.12]);
  b.add(U.cone4, IRON, [0, 3.95, 0], [0.18, 0.12, 0.18], [Math.PI, Math.PI / 4, 0]);
  b.add(U.box, '#fff0b8', [0, 4.2, 0], [0.32, 0.4, 0.32]);
  for (const [dx, dz] of [[0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]]) b.add(U.box, IRON, [dx, 4.2, dz], [0.03, 0.42, 0.03]);
  b.add(U.cone4, IRON, [0, 4.55, 0], [0.3, 0.28, 0.3], [0, Math.PI / 4, 0]);
  b.add(BALL, IRON, [0, 4.75, 0], [0.05, 0.08, 0.05]);
}

function morris(b) {   // colonne Morris couverte d'affiches
  b.add(U.cyl, IRON, [0, 0.3, 0], [0.62, 0.6, 0.62]);
  const posters = ['#f2d24a', '#c8302a', '#f4ecd8', '#2c4a8a', '#e8803a', '#7a3a8a'];
  for (let i = 0; i < 6; i++) b.add(U.cyl, pick(posters), [0, 0.85 + i * 0.36, 0], [0.55, 0.34, 0.55], [0, rand(0, 6), 0]);
  b.add(U.cyl, IRON, [0, 3.0, 0], [0.62, 0.18, 0.62]);
  b.add(U.cyl, IRON, [0, 3.2, 0], [0.7, 0.18, 0.7]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add(U.box, IRON_DARK, [Math.cos(a) * 0.7, 3.05, Math.sin(a) * 0.7], [0.08, 0.16, 0.08]);
  }
  b.add(BALL, IRON, [0, 3.45, 0], [0.55, 0.32, 0.55]);
  b.add(BALL, GOLD, [0, 3.85, 0], [0.08, 0.14, 0.08]);
}

function kiosque(b) {   // kiosque à journaux
  b.add(U.cyl6, IRON, [0, 1.2, 0], [0.9, 2.4, 0.9]);
  b.add(U.cyl6, '#f4ecd8', [0, 1.4, 0], [0.92, 0.9, 0.92]);
  const papers = ['#f4ecd8', '#c8302a', '#2c4a8a', '#f2d24a'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    b.add(U.box, pick(papers), [Math.cos(a) * 0.86, 1.4, Math.sin(a) * 0.86], [0.04, 0.7, 0.55], [0, -a, 0]);
  }
  b.add(U.cone8, IRON, [0, 2.75, 0], [1.25, 0.7, 1.25]);
  b.add(BALL, IRON, [0, 3.2, 0], [0.32, 0.3, 0.32]);
  b.add(U.cone8, GOLD, [0, 3.55, 0], [0.06, 0.3, 0.06]);
  b.add(U.box, '#f2d24a', [0.92, 2.25, 0], [0.03, 0.22, 0.9]);
}

function wallace(b) {   // fontaine Wallace
  b.add(U.cyl6, IRON, [0, 0.3, 0], [0.5, 0.6, 0.5]);
  b.add(U.cyl6, IRON_DARK, [0, 0.66, 0], [0.42, 0.12, 0.42]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.add(U.cyl6, IRON, [Math.cos(a) * 0.22, 1.25, Math.sin(a) * 0.22], [0.07, 1.1, 0.07]);
    b.add(BALL, IRON, [Math.cos(a) * 0.22, 1.85, Math.sin(a) * 0.22], [0.07, 0.08, 0.07]);
  }
  b.add(U.cyl6, '#a8d0e0', [0, 1.1, 0], [0.03, 0.9, 0.03]);
  b.add(U.cyl6, IRON, [0, 2.0, 0], [0.42, 0.14, 0.42]);
  b.add(BALL, IRON, [0, 2.15, 0], [0.38, 0.28, 0.38]);
  b.add(U.cone8, IRON, [0, 2.5, 0], [0.08, 0.22, 0.08]);
}

function bench(b) {   // banc public
  for (const z of [-0.8, 0.8]) {
    b.add(U.box, IRON_DARK, [0, 0.22, z], [0.5, 0.44, 0.06]);
    b.add(U.box, IRON_DARK, [-0.2, 0.62, z], [0.06, 0.5, 0.06]);
  }
  for (let i = 0; i < 4; i++) b.add(U.box, IRON, [0.18 - i * 0.12, 0.44, 0], [0.1, 0.04, 1.8]);
  for (let i = 0; i < 3; i++) b.add(U.box, IRON, [-0.24, 0.6 + i * 0.12, 0], [0.04, 0.09, 1.8], [0, 0, 0.2]);
}

function platane(b) {   // platane dans sa grille
  const h = rand(3.2, 4.2);
  b.add(U.box, '#22352a', [0, 0.02, 0], [1.4, 0.04, 1.4]);
  b.add(U.cyl6, '#c8bba0', [0, h / 2, 0], [0.2, h, 0.2]);
  for (let i = 0; i < 5; i++) b.add(U.cyl6, pick(['#8a8270', '#e2d8c0']), [rand(-0.1, 0.1), rand(0.5, h), rand(-0.1, 0.1)], [0.21, 0.4, 0.21]);   // écorce tachetée
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    b.add(U.cyl6, '#b0a48a', [Math.cos(a) * 0.45, h * 0.92, Math.sin(a) * 0.45], [0.07, 1.4, 0.07], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8]);
  }
  for (let i = 0; i < 8; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.3, 1.6);
    b.add(U.sph, pick(['#6f9a3e', '#7aa84a', '#86b456', '#5f8a36']), [Math.cos(a) * r, h + rand(0.4, 1.8), Math.sin(a) * r], [rand(0.9, 1.3), rand(0.7, 0.95), rand(0.9, 1.3)]);
  }
}

function cafe(b) {   // terrasse de café
  b.add(U.box, '#c8302a', [0.2, 2.6, 0], [2.0, 0.06, 4.2], [0, 0, -0.18]);
  for (let i = 0; i < 10; i++) b.add(U.box, i % 2 ? '#c8302a' : '#f4ecd8', [1.2, 2.45, -2 + i * 0.42 + 0.21], [0.03, 0.25, 0.4]);
  for (const z of [-2, 2]) b.add(U.cyl6, '#2a2522', [1.15, 1.3, z], [0.03, 2.6, 0.03]);
  for (const z of [-1.3, 0, 1.3]) {
    b.add(U.cyl, '#d8d4cc', [0.3, 0.74, z], [0.3, 0.03, 0.3]);
    b.add(U.cyl6, '#2a2522', [0.3, 0.37, z], [0.03, 0.74, 0.03]);
    b.add(U.cyl, '#f4ecd8', [0.3, 0.79, z + 0.08], [0.05, 0.08, 0.05]);
    for (const dz of [-0.42, 0.42]) {
      b.add(U.box, '#c8a46a', [0.3, 0.45, z + dz], [0.36, 0.04, 0.36]);
      b.add(U.box, '#c8a46a', [0.3, 0.75, z + dz + Math.sign(dz) * 0.17], [0.36, 0.55, 0.03]);
      for (const ex of [-0.15, 0.15]) b.add(U.box, '#2a2522', [0.3 + ex, 0.22, z + dz], [0.02, 0.45, 0.02]);
    }
  }
  b.add(U.box, '#1e2426', [1.0, 0.6, 2.4], [0.05, 0.9, 0.6], [0, 0, 0.15]);   // ardoise du menu
  b.add(U.box, '#f4ecd8', [1.05, 0.7, 2.4], [0.01, 0.4, 0.4], [0, 0, 0.15]);
}

function guimard(b) {   // entrée de métro Guimard
  for (const z of [-1.6, 1.6]) {
    b.add(U.box, IRON, [0, 0.45, z], [2.2, 0.9, 0.06]);
    for (let i = 0; i < 9; i++) b.add(U.box, IRON_DARK, [-1 + i * 0.25, 0.5, z], [0.04, 0.8, 0.08]);
  }
  b.add(U.box, IRON, [-1.1, 0.45, 0], [0.06, 0.9, 3.2]);
  b.add(U.box, '#3a3a3a', [0.2, 0.02, 0], [1.9, 0.04, 3.1]);   // escalier
  for (let i = 0; i < 5; i++) b.add(U.box, '#5a5a5a', [0.6 - i * 0.3, 0.03, 0], [0.04, 0.02, 3.0]);
  for (const z of [-1.6, 1.6]) {
    b.add(U.cyl6, IRON, [1.0, 1.6, z], [0.07, 3.2, 0.07]);
    b.add(U.cyl6, IRON, [1.0, 3.2, z * 0.86], [0.06, 0.7, 0.06], [z > 0 ? -0.6 : 0.6, 0, 0]);
    b.add(BALL, '#f08a3a', [1.0, 3.45, z * 0.72], [0.14, 0.2, 0.12]);   // lampe orange
  }
  b.add(U.box, '#d8d8a0', [1.0, 2.65, 0], [0.06, 0.38, 2.6]);   // panneau METROPOLITAIN
  for (let i = 0; i < 14; i++) b.add(U.box, IRON_DARK, [1.04, 2.65, -1.1 + i * 0.17], [0.01, 0.18, 0.08]);
  b.add(U.box, IRON, [1.0, 2.88, 0], [0.08, 0.06, 2.8]);
}

// ---------- Marché ----------
function marketStall(b) {   // étal sous auvent rayé
  const kind = ri(0, 4);
  const sc = pick([['#c8302a', '#f4ecd8'], ['#2c5a3a', '#f4ecd8'], ['#1f5aa0', '#f4ecd8'], ['#e8a020', '#f4ecd8']]);
  for (const [x, z] of [[1.0, -1.3], [1.0, 1.3], [-0.9, -1.3], [-0.9, 1.3]]) b.add(U.cyl6, '#5a3a20', [x, 1.25, z], [0.04, 2.5, 0.04]);
  for (let i = 0; i < 7; i++) b.add(U.box, sc[i % 2], [0, 2.55, -1.4 + i * 0.4 + 0.2], [2.4, 0.05, 0.4], [0, 0, -0.18]);
  for (let i = 0; i < 7; i++) b.add(U.box, sc[i % 2], [1.2, 2.25, -1.4 + i * 0.4 + 0.2], [0.03, 0.3, 0.38]);
  b.add(U.box, '#8a6a42', [0.4, 0.8, 0], [1.2, 0.08, 2.6]);   // plateau
  for (const z of [-1.2, 1.2]) b.add(U.box, '#6a4a2a', [0.4, 0.4, z], [1.1, 0.8, 0.06]);
  const produce = [
    ['#e8501c', '#f2c230', '#c8302a', '#7ab83a'],       // fruits
    ['#3a8a3a', '#e8803a', '#c8b040', '#7a3a8a'],       // légumes
    ['#ff8fb6', '#f4ecd8', '#ffd23f', '#c8302a'],       // fleurs
    ['#d8a050', '#c88a3a', '#e8b868', '#b8783a'],       // pains
    ['#f2d880', '#f6e6a8', '#e8c860', '#f4ecd8'],       // fromages
  ][kind];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 4; i++) {
      const z = -0.95 + i * 0.63, x = 0.05 + r * 0.38;
      b.add(U.box, '#c8a46a', [x, 0.9, z], [0.34, 0.12, 0.55]);
      const col = produce[(i + r) % produce.length];
      if (kind === 3) {
        for (let k = 0; k < 3; k++) b.add(BALL, col, [x, 1.0, z - 0.15 + k * 0.15], [0.05, 0.05, 0.22], [0.2, 0, 0]);   // baguettes
      } else if (kind === 4) {
        b.add(U.cyl, col, [x, 1.02, z], [0.16, 0.12, 0.16]);   // meules
      } else {
        for (let k = 0; k < 4; k++) b.add(U.sph0, col, [x + rand(-0.1, 0.1), 1.02 + rand(0, 0.06), z + rand(-0.18, 0.18)], [0.08, 0.08, 0.08]);
      }
    }
  }
  b.add(U.box, '#1e2426', [1.25, 1.3, -1.0], [0.03, 0.3, 0.4]);   // ardoise des prix
}

function crates(b) {   // cagettes et tonneaux
  for (let i = 0; i < ri(2, 4); i++) {
    const z = rand(-0.9, 0.9), n = ri(1, 3);
    for (let k = 0; k < n; k++) {
      b.add(U.box, '#c8a46a', [rand(-0.1, 0.1), 0.2 + k * 0.4, z], [0.55, 0.38, 0.45], [0, rand(-0.2, 0.2), 0]);
      b.add(U.box, pick(['#e8501c', '#f2c230', '#7ab83a', '#c8302a']), [0, 0.34 + k * 0.4, z], [0.45, 0.1, 0.36]);
    }
  }
  if (Math.random() < 0.5) {
    b.add(U.cyl, '#8a5a32', [0, 0.45, 1.1], [0.32, 0.9, 0.32]);
    for (const y of [0.15, 0.75]) b.add(U.cyl, '#2a2522', [0, y, 1.1], [0.335, 0.04, 0.335]);
  }
}

function flowerCart(b) {   // charrette de fleuriste
  b.add(U.box, '#6a8a4a', [0, 0.7, 0], [1.0, 0.12, 2.0]);
  for (const z of [-0.95, 0.95]) b.add(U.box, '#5a7a3a', [0, 0.9, z], [1.0, 0.35, 0.06]);
  for (const z of [-0.6, 0.6]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.add(U.box, '#2a2522', [-0.55, 0.45 + Math.sin(a) * 0.4, z + Math.cos(a) * 0.4], [0.05, 0.06, 0.22], [-a, 0, 0]);
    }
  }
  const fl = ['#ff8fb6', '#ffd23f', '#c8302a', '#f4ecd8', '#b48ae0', '#ff9a4a'];
  for (let i = 0; i < 6; i++) {
    const z = -0.75 + i * 0.3;
    b.add(U.cyl, '#9aa0a6', [0.1, 0.92, z], [0.12, 0.3, 0.12]);
    b.add(U.sph, '#5a8a3a', [0.1, 1.15, z], [0.16, 0.12, 0.16]);
    for (let k = 0; k < 4; k++) b.add(U.sph0, pick(fl), [0.1 + rand(-0.1, 0.1), 1.25 + rand(0, 0.1), z + rand(-0.1, 0.1)], [0.07, 0.07, 0.07]);
  }
  b.add(U.box, '#5a3a20', [0.8, 0.75, 0], [0.8, 0.05, 0.05]);
}

function halles(b) {   // pavillon de marché en fonte et verre (style Baltard)
  const L = 11, W = 7, Hh = 6;
  for (const z of [-L / 2, -L / 6, L / 6, L / 2]) {
    for (const x of [-W / 2, W / 2]) b.add(U.box, IRON, [x, Hh / 2, z], [0.2, Hh, 0.2]);
  }
  b.add(U.box, '#bcd6e0', [W / 2, Hh * 0.6, 0], [0.04, Hh * 0.6, L]);
  for (let i = 0; i < 12; i++) b.add(U.box, IRON_DARK, [W / 2 + 0.03, Hh * 0.6, -L / 2 + i * (L / 11)], [0.04, Hh * 0.6, 0.06]);
  b.add(U.box, IRON_DARK, [W / 2 + 0.03, Hh * 0.42, 0], [0.05, 0.08, L]);
  b.add(U.box, '#e8dcc4', [W / 2, 1.1, 0], [0.1, 2.2, L]);
  b.add(U.roof, '#8aa8b8', [0, Hh, 0], [W + 1, 2.2, L + 0.6]);
  b.add(U.roof, '#5a7080', [0, Hh + 2.2, 0], [2.4, 1.0, L * 0.8]);
  b.add(U.box, IRON, [0, Hh + 3.2, 0], [0.2, 0.15, L * 0.8]);
}

// ---------- Quais de Seine ----------
function parapet(b) {
  b.add(U.box, '#d8ccb0', [0, 0.5, 0], [0.6, 1.0, 4]);
  b.add(U.box, '#e8dcc4', [0, 1.04, 0], [0.75, 0.1, 4.02]);
  for (let i = 0; i < 4; i++) b.add(U.box, '#c8bca0', [0.31, 0.5, -1.5 + i], [0.01, 0.9, 0.02]);
}

function bouquiniste(b) {   // boîte verte de bouquiniste ouverte sur le parapet
  parapet(b);
  for (const z of [-1.0, 1.0]) {
    b.add(U.box, '#2f5a3a', [0, 1.35, z], [0.7, 0.5, 1.7]);
    b.add(U.box, '#2f5a3a', [-0.35, 1.95, z], [0.05, 0.9, 1.7], [0, 0, 0.25]);   // couvercle relevé
    const books = ['#c8302a', '#2c4a8a', '#f2d24a', '#5a3a20', '#f4ecd8', '#2c5a3a'];
    for (let i = 0; i < 10; i++) b.add(U.box, pick(books), [0.05, 1.68, z - 0.75 + i * 0.16], [0.4, 0.22, 0.12]);
  }
  if (Math.random() < 0.5) {   // gravures et parapluie
    b.add(U.box, '#f4ecd8', [-0.3, 2.2, -1.0], [0.02, 0.4, 0.3], [0, 0, 0.25]);
    b.add(U.cyl6, '#2a2522', [0.2, 2.0, 1.6], [0.02, 1.4, 0.02]);
    b.add(U.cone8, pick(['#c8302a', '#2c4a8a']), [0.2, 2.75, 1.6], [0.6, 0.3, 0.6]);
  }
}

// péniche : coque noire à proue pointue, bâches de cale, timonerie, linge qui sèche, fleurs et drapeau
function peniche(b, x, z) {
  const Lb = rand(10, 13), Wb = 2.4, half = Lb / 2;
  const hull = pick(['#2a2a32', '#1f2c3a', '#3a2a24']);
  b.add(U.box, hull, [x, 0.35, z], [Wb, 0.7, Lb - 1.6]);
  b.add(U.box, hull, [x, 0.35, z + half - 0.8], [Wb * 0.72, 0.7, 1.0], [0, Math.PI / 4, 0]);   // proue
  b.add(U.box, hull, [x, 0.35, z - half + 0.8], [Wb, 0.7, 1.6]);
  b.add(U.box, '#f4ecd8', [x, 0.12, z], [Wb + 0.02, 0.08, Lb - 1.6]);   // ligne de flottaison
  b.add(U.box, '#c8302a', [x, 0.72, z], [Wb + 0.04, 0.08, Lb - 1.6]);   // plat-bord
  b.add(U.box, '#c8302a', [x, 0.72, z + half - 0.8], [Wb * 0.74, 0.08, 1.02], [0, Math.PI / 4, 0]);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) b.add(U.cyl6, '#8a6a3a', [x + sx * (Wb / 2 + 0.05), 0.45, z - 3 + i * 2.2], [0.12, 0.3, 0.12], [0, 0, Math.PI / 2]);   // défenses
  // nom peint à la proue
  for (const sx of [-1, 1]) b.add(U.box, '#f4ecd8', [x + sx * (Wb / 2 + 0.01), 0.45, z + half - 2.4], [0.02, 0.14, 1.2]);
  if (Math.random() < 0.55) {   // péniche de charge : cale bâchée
    for (let i = 0; i < 4; i++) {
      const cz = z + half - 3.2 - i * 1.5;
      b.add(U.box, '#4a5a3a', [x, 0.95, cz], [Wb - 0.4, 0.4, 1.4]);
      b.add(U.roof, '#5a6a44', [x, 1.15, cz], [Wb - 0.4, 0.25, 1.4], [0, Math.PI / 2, 0]);
    }
  } else {   // péniche habitée : jardinières et chaises longues
    for (let i = 0; i < 10; i++) {
      const cz = z + half - 2.5 - i * 0.6;
      for (const sx of [-1, 1]) {
        b.add(U.box, '#8a5a32', [x + sx * 0.95, 0.85, cz], [0.3, 0.25, 0.5]);
        b.add(BALL, pick(['#ff8fb6', '#ffd23f', '#e8501c', '#ffffff', '#7ab83a']), [x + sx * 0.95, 1.05, cz], [0.18, 0.13, 0.22]);
      }
    }
    b.add(U.box, '#f4ecd8', [x, 0.95, z + 0.5], [0.6, 0.06, 1.2], [0.3, 0, 0]);
  }
  // timonerie à l'arrière
  const wz = z - half + 2;
  b.add(U.box, '#f4ecd8', [x, 1.25, wz], [1.9, 1.1, 2.2]);
  b.add(U.box, '#2c5a3a', [x, 0.8, wz], [1.92, 0.15, 2.22]);
  for (const sx of [-1, 1]) for (const dz of [-0.55, 0.55]) b.add(U.box, '#2a3440', [x + sx * 0.96, 1.35, wz + dz], [0.02, 0.45, 0.6]);
  b.add(U.box, '#2a3440', [x, 1.35, wz + 1.11], [1.3, 0.45, 0.02]);
  b.add(U.box, '#2c5a3a', [x, 1.85, wz], [2.1, 0.1, 2.4]);   // toit
  b.add(U.cyl6, '#1a1a1c', [x + 0.5, 2.3, wz - 0.6], [0.12, 0.8, 0.12]);   // cheminée
  b.add(U.cyl6, '#c8302a', [x + 0.5, 2.6, wz - 0.6], [0.13, 0.1, 0.13]);
  b.add(BALL, '#c8c4c0', [x + 0.5, 3.0, wz - 0.8], [0.2, 0.16, 0.2]);   // petit panache de fumée
  // gouvernail et pavillon tricolore
  b.add(U.box, '#3a2a20', [x, 0.5, z - half - 0.05], [0.08, 0.7, 0.5]);
  b.add(U.cyl6, '#3a2a20', [x - 0.7, 1.6, z - half + 0.3], [0.03, 1.8, 0.03]);
  [['#1f3a8a', 0], ['#f4ecd8', 1], ['#c8302a', 2]].forEach(([col, k]) => b.add(U.box, col, [x - 0.7, 2.3, z - half + 0.45 + k * 0.18], [0.01, 0.38, 0.18]));
  // corde à linge entre la timonerie et un mât
  if (Math.random() < 0.6) {
    const mz = wz + 4;
    b.add(U.cyl6, '#3a2a20', [x, 1.5, mz], [0.03, 1.4, 0.03]);
    b.add(U.box, '#e8e0d0', [x, 2.1, (wz + 1.1 + mz) / 2], [0.01, 0.01, mz - wz - 1.1]);
    for (let i = 0; i < 4; i++) b.add(U.box, pick(['#f4ecd8', '#5a7ac8', '#e8a0b0', '#f2d24a']), [x, 1.88, wz + 1.5 + i * 0.6], [0.02, 0.4, 0.4]);
  }
  // sillage
  for (const sx of [-1, 1]) b.add(U.box, '#d8ecf0', [x + sx * 1.35, 0.075, z + half - 1.2], [0.12, 0.01, 2.2], [0, sx * 0.3, 0]);
}

function seine(b) {   // la Seine : murs de quai à anneaux, escalier, reflets, péniches
  const Lr = 32, Wr = 26;
  for (const sx of [1, -1]) {
    const x = sx * (Wr / 2 - 0.5);
    b.add(U.box, '#c8bca0', [x, 0.3, 0], [1.0, 0.6, Lr]);
    b.add(U.box, '#b4a888', [x, 0.62, 0], [1.1, 0.06, Lr]);   // margelle
    for (let i = 0; i < 4; i++) {   // anneaux d'amarrage et bittes
      const z = -12 + i * 8;
      b.add(U.box, '#2a2522', [x - sx * 0.52, 0.32, z], [0.04, 0.2, 0.2]);
      b.add(U.cyl6, '#2a2522', [x - sx * 0.25, 0.75, z + 2], [0.1, 0.25, 0.1]);
    }
    b.add(U.box, '#7a8a6a', [x - sx * 0.51, 0.12, 0], [0.02, 0.14, Lr]);   // mousse au ras de l'eau
  }
  b.add(U.box, '#5f8fa0', [0, 0.04, 0], [Wr - 1.8, 0.05, Lr]);
  for (let i = 0; i < 30; i++) b.add(U.box, pick(['#a8d0dc', '#c8e4ec', '#7aa8b8']), [rand(-Wr / 2 + 1.5, Wr / 2 - 2), 0.07, rand(-15, 15)], [rand(0.2, 0.6), 0.01, rand(1, 3)]);
  const r = Math.random();
  if (r < 0.65) peniche(b, rand(-5, -1), rand(-6, 6));
  if (r < 0.25) peniche(b, rand(2, 5), rand(-6, 6));
}

// ---------- Sols (bandes de 32 m le long de la voie, côté +x vers la voie) ----------
const STRIP = 32;
function trottoir(b) {   // trottoir en dalles, bordure de granit et caniveau
  b.add(U.box, '#c9c3b8', [0, 0.06, 0], [3.4, 0.12, STRIP]);
  for (let i = 0; i < 46; i++) b.add(U.box, '#b8b2a6', [0, 0.122, -STRIP / 2 + i * 0.7], [3.4, 0.004, 0.04]);
  for (let i = 0; i < 16; i++) b.add(U.box, pick(['#d2ccc0', '#bcb6aa']), [rand(-1.4, 1.4), 0.123, rand(-15, 15)], [rand(0.4, 0.8), 0.003, rand(0.4, 0.7)]);
  b.add(U.box, '#9a968c', [1.68, 0.08, 0], [0.16, 0.18, STRIP]);
  b.add(U.box, '#7a8a96', [1.85, 0.02, 0], [0.22, 0.03, STRIP]);
}
function paves(b) {   // pavés de la place du marché
  b.add(U.box, '#a8a090', [0, 0.03, 0], [3.4, 0.06, STRIP]);
  for (let i = 0; i < 70; i++) b.add(U.box, pick(['#9a9284', '#b4ac9c', '#8f887a']), [rand(-1.5, 1.5), 0.063, rand(-15.5, 15.5)], [rand(0.2, 0.35), 0.004, rand(0.2, 0.35)]);
  b.add(U.box, '#9a968c', [1.68, 0.08, 0], [0.16, 0.18, STRIP]);
}
function quai(b) {   // quai pavé
  b.add(U.box, '#b8b0a0', [0, 0.04, 0], [3.4, 0.08, STRIP]);
  for (let i = 0; i < 40; i++) b.add(U.box, pick(['#a8a090', '#c4bcac']), [rand(-1.5, 1.5), 0.083, rand(-15.5, 15.5)], [rand(0.3, 0.5), 0.004, rand(0.3, 0.6)]);
  b.add(U.box, '#9a968c', [1.68, 0.08, 0], [0.16, 0.18, STRIP]);
}

// ---------- Grand portail Art nouveau au-dessus des voies (horloge, lanternes) ----------
function gate(b) {
  for (const sx of [-1, 1]) {
    const x = sx * 5.5;
    b.add(U.box, '#c8bca0', [x, 0.5, 0], [1.2, 1.0, 1.2]);
    b.add(U.box, IRON, [x, 5.2, 0], [0.5, 8.4, 0.5]);
    for (let k = 0; k < 6; k++) b.add(U.box, GOLD, [x, 1.8 + k * 1.2, 0.26], [0.2, 0.2, 0.02]);
    for (let k = 0; k < 4; k++) b.add(U.box, IRON_DARK, [x + sx * 0.3, 2 + k * 1.7, 0], [0.12, 0.9, 0.12], [0, 0, sx * 0.4]);
    // lanternes
    b.add(U.box, IRON, [x - sx * 0.6, 8.6, 0], [0.9, 0.08, 0.08]);
    b.add(U.box, '#fff0b8', [x - sx * 1.0, 8.25, 0], [0.32, 0.45, 0.32]);
    b.add(U.cone4, IRON, [x - sx * 1.0, 8.6, 0], [0.28, 0.25, 0.28], [0, Math.PI / 4, 0]);
  }
  // arc en fonte ajouré
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI, a2 = ((i + 1) / (n - 1)) * Math.PI;
    if (i === n - 1) break;
    const x1 = -Math.cos(a) * 5.5, y1 = 9.4 + Math.sin(a) * 1.8, x2 = -Math.cos(a2) * 5.5, y2 = 9.4 + Math.sin(a2) * 1.8;
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    b.add(U.box, IRON, [(x1 + x2) / 2, (y1 + y2) / 2, 0], [len + 0.05, 0.3, 0.3], [0, 0, ang]);
    if (i % 3 === 0) b.add(U.box, IRON_DARK, [x1, (y1 + 9.0) / 2, 0], [0.06, y1 - 9.0, 0.06]);
  }
  b.add(U.box, IRON, [0, 9.0, 0], [11.4, 0.3, 0.35]);
  b.add(U.box, GOLD, [0, 8.82, 0.18], [10.6, 0.06, 0.02]);
  // horloge centrale
  b.add(U.cyl, GOLD, [0, 10.2, 0.05], [0.95, 0.2, 0.95], [Math.PI / 2, 0, 0]);
  b.add(U.cyl, '#f8f2e2', [0, 10.2, 0.16], [0.8, 0.04, 0.8], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(U.box, '#2a2522', [Math.cos(a) * 0.66, 10.2 + Math.sin(a) * 0.66, 0.19], [0.05, 0.12, 0.01], [0, 0, a + Math.PI / 2]);
  }
  b.add(U.box, '#2a2522', [0.12, 10.35, 0.2], [0.04, 0.4, 0.01], [0, 0, -0.6]);
  b.add(U.box, '#2a2522', [0, 10.05, 0.2], [0.04, 0.35, 0.01]);
  b.add(BALL, GOLD, [0, 11.3, 0], [0.18, 0.25, 0.18]);
}

// Guirlande de guinguette (ampoules) tendue au-dessus des voies
function garland(b) {
  for (const x of [-5.2, 5.2]) b.add(U.cyl6, IRON, [x, 4.8, 0], [0.08, 9.6, 0.08]);
  for (let i = 0; i <= 20; i++) {
    const x = -5.2 + i * 0.52, y = 9.2 - Math.sin((i / 20) * Math.PI) * 0.6;
    b.add(U.box, '#2a2522', [x, y, 0], [0.54, 0.02, 0.02], [0, 0, (i < 10 ? -1 : 1) * 0.1]);
    if (i % 2 === 0 && i > 0 && i < 20) b.add(BALL, pick(['#fff4b8', '#ffd27a', '#ffb0c0', '#b8e0ff']), [x, y - 0.18, 0], [0.12, 0.15, 0.12]);
  }
}

// ---------- Catalogue et thèmes ----------
export const DECOR = {
  haussmann: { len: 12, w: 8.4, face: true, build: haussmann },
  haussmannFar: { len: 12, w: 8.4, face: true, build: haussmannFar },
  lamppost: { len: 1.2, w: 0.6, build: lamppost },
  morris: { len: 1.6, w: 1.6, build: morris },
  kiosque: { len: 2.6, w: 2.6, build: kiosque },
  wallace: { len: 1.2, w: 1.2, build: wallace },
  bench: { len: 2, w: 0.6, face: true, build: bench },
  platane: { len: 4, w: 3.6, build: platane },
  cafe: { len: 4.6, w: 2.4, face: true, build: cafe },
  guimard: { len: 3.6, w: 2.4, face: true, build: guimard },
  marketStall: { len: 3.2, w: 2.6, face: true, build: marketStall },
  crates: { len: 2.6, w: 1, face: true, build: crates },
  flowerCart: { len: 2.2, w: 1.4, face: true, build: flowerCart },
  halles: { len: 11.6, w: 8, face: true, build: halles },
  parapet: { len: 4, w: 0.8, face: true, build: parapet },
  bouquiniste: { len: 4, w: 0.8, face: true, build: bouquiniste },
  seine: { len: 32, w: 26, face: true, build: seine },
  trottoir: { len: STRIP, w: 3.4, face: true, build: trottoir },
  paves: { len: STRIP, w: 3.4, face: true, build: paves },
  quai: { len: STRIP, w: 3.4, face: true, build: quai },
};

// x : distance à la voie de chaque bande ; spread : dispersion ; mult : multiplicateur d'écart
export const THEMES = {
  boulevard: {
    ground: 'trottoir', gateEvery: [260, 420], garland: 0.12,
    x: { edge: 0, near: 5.4, mid: 8.3, far: 30 }, spread: { near: 0.5, mid: 0.2 }, mult: { near: 1.4, mid: 0.08 },
    edge: [],
    near: [['lamppost', 3], ['platane', 2.2], ['morris', 1], ['kiosque', 0.8], ['wallace', 0.6], ['bench', 1], ['cafe', 1.2], ['guimard', 0.5]],
    mid: [['haussmann', 1]],
    far: [],   // entièrement caché derrière les façades continues
  },
  marche: {
    ground: 'paves', gateEvery: [300, 480], garland: 0.45,
    x: { edge: 0, near: 5.3, mid: 8.6, far: 30 }, spread: { near: 0.3, mid: 0.3 }, mult: { near: 0.5, mid: 0.1 },
    edge: [],
    near: [['marketStall', 5], ['crates', 1.5], ['flowerCart', 1.2], ['lamppost', 1], ['platane', 0.6]],
    mid: [['haussmann', 4], ['halles', 0.7]],
    far: [],
  },
  quais: {
    ground: 'quai', gateEvery: [380, 600], garland: 0,
    x: { edge: 0, near: 6.6, mid: 8.2, far: 34 }, spread: { near: 0.1, mid: 0 }, mult: { near: 0.1, mid: 0 },
    edge: [],
    near: [['bouquiniste', 3], ['parapet', 2], ['lamppost', 1]],
    mid: [['seine', 1]],
    far: [['haussmannFar', 1]],
  },
};
export const THEME_ORDER = ['boulevard', 'marche', 'boulevard', 'quais'];
export const THEME_LEN = 400;

export function weighted(list) {
  let total = 0;
  for (const [, w] of list) total += w;
  if (!total) return null;
  let r = Math.random() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

export function prebuild() {
  for (const d of Object.values(DECOR)) {
    d.geos = [0, 1, 2, 3, 4, 5].map(() => { const b = new Builder(); d.build(b); return b.build(); });
  }
  let b = new Builder();
  gate(b);
  const g = b.build();
  b = new Builder();
  garland(b);
  return { gate: g, garland: b.build() };
}
