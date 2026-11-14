import * as THREE from 'three';
import { Builder, U, pick, rand } from './geo.js';
import { loadPlants, addPlant, surface, shelf } from './plants.js';

await loadPlants();   // modèles de végétation chargés avant la construction du décor

// Décor latéral. Chaque élément est construit "face à +x" (vers la voie quand il est à gauche),
// origine au sol, centré en z. Plusieurs variantes aléatoires sont pré-construites au chargement ;
// le monde les assemble ensuite par tranches fusionnées (un seul appel de dessin par tranche).

const WOOD = '#6b4a33';
const DARK_WOOD = '#4a3426';
const RED = '#d6452f';
const PINKS = ['#f9c4d6', '#f4a8c4', '#fcd7e5', '#f1b5cd', '#ffe1ec'];
const GREENS = ['#86b765', '#7aa65a', '#93c070', '#6f9c55'];
const LEAF = ['#4f8a3e', '#5c9a46', '#467d38', '#64a24c'];
const STONE = ['#a8a59c', '#9a978e', '#b3afa4', '#8f8c84'];
const ROOF_TILE = '#454c5a';
const BALL = new THREE.SphereGeometry(1, 8, 6);   // petites sphères : peu de triangles, invisibles à cette taille
const BLADE = new THREE.OctahedronGeometry(1, 0);   // feuille effilée (aplatie à l'emploi) : 8 triangles
const ri = (a, b) => Math.floor(rand(a, b + 1));

// ---------- Arbres et végétation ----------
// Couleurs des modèles de végétation : une teinte par touffe de feuillage (morceau), légèrement
// variée d'une facette à l'autre pour garder l'aspect facetté
const _tc = new THREE.Color();
function painter(trunk, leaves, { moss = null, jitter = 0.07 } = {}) {
  const perPart = {};
  return (role, part, i, up) => {
    if (role === 0 && trunk) return _tc.set(trunk).multiplyScalar(1 + rand(-jitter, jitter));
    if (moss && up > 0.4 && Math.random() < 0.8) return _tc.set(pick(moss));
    const base = perPart[role * 1000 + part] ||= pick(leaves);
    return _tc.set(base).multiplyScalar(1 + rand(-jitter, jitter) + (up > 0.4 ? 0.06 : -0.04));
  };
}

// feuillu aux touffes de feuillage en nuages (modèle « tree »), h = hauteur, wide = étalement
function leafyTree(b, h, wide, trunk, leaves, x = 0, z = 0) {
  return addPlant(b, 'tree', [x, 0, z], h, painter(trunk, leaves), { s: [wide, wide], ry: rand(0, Math.PI * 2) });
}

function sakura(b, s = 1) {
  const m = leafyTree(b, rand(3.6, 4.4) * s, rand(1.35, 1.6), '#5e3f33', PINKS);
  // quelques fleurs plus claires piquées sur le feuillage
  for (const { p } of surface('tree', m, 1, 10)) b.add(U.sph0, pick(['#ffe8f0', '#ffffff', '#f7b3cc']), p.toArray(), [0.14 * s, 0.1 * s, 0.14 * s]);
  // tapis de pétales au sol
  b.add(U.cyl, '#f6c6d6', [0, 0.02, 0], [1.9 * s, 0.03, 1.9 * s]);
  for (let i = 0; i < 6; i++) b.add(U.cyl, '#fbe0ea', [rand(-2, 2) * s, 0.03, rand(-2, 2) * s], [rand(0.2, 0.4), 0.02, rand(0.2, 0.4)]);
  if (Math.random() < 0.35) {   // petit banc en bois
    b.add(U.box, '#8a6240', [1.7, 0.42, 0], [0.45, 0.07, 1.4]);
    for (const z of [-0.55, 0.55]) b.add(U.box, DARK_WOOD, [1.7, 0.2, z], [0.4, 0.4, 0.08]);
  }
}

function pine(b) {
  const c = '#5a4334';
  let x = 0, y = 0;
  for (let i = 0; i < 4; i++) {   // tronc noueux en segments
    const nx = x + rand(-0.25, 0.25), ny = y + 0.9;
    b.add(U.cyl6, c, [(x + nx) / 2, (y + ny) / 2, 0], [0.15 - i * 0.02, 0.95, 0.15 - i * 0.02], [0, 0, (x - nx) * 0.9]);
    x = nx; y = ny;
  }
  const g = ['#3e6b3d', '#4a7a45', '#46733f', '#355f37'];
  for (let i = 0; i < 5; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.3, 1.2), yy = 2.2 + i * 0.5;
    b.add(U.cyl6, c, [Math.cos(a) * r * 0.5 + x * 0.5, yy - 0.1, Math.sin(a) * r * 0.5], [0.05, r + 0.3, 0.05], [Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3]);
    b.add(U.sph, pick(g), [Math.cos(a) * r + x * 0.5, yy, Math.sin(a) * r], [rand(0.9, 1.3), 0.32, rand(0.8, 1.1)]);
  }
}

function cedar(b, x = 0, z = 0, s = 1, y = 0) {
  b.add(U.cyl6, '#5b4030', [x, y + 1 * s, z], [0.18 * s, 2 * s, 0.18 * s]);
  const g = pick(['#335c3a', '#2f5536', '#3a6640']);
  b.add(U.cone8, g, [x, y + 3.6 * s, z], [1.35 * s, 3.4 * s, 1.35 * s]);
  b.add(U.cone8, g, [x, y + 5.2 * s, z], [1.05 * s, 3.0 * s, 1.05 * s]);
  b.add(U.cone8, '#3f6d45', [x, y + 6.6 * s, z], [0.7 * s, 2.2 * s, 0.7 * s]);
}

// cèdre du Japon (sugi) : conifère à étages de branches (modèle « conifer »), élancé
const SUGI = ['#2f5536', '#335c3a', '#3a6640', '#2b4f33', '#3f6d45'];
function sugi(b, x = 0, z = 0, s = 1) {
  addPlant(b, 'conifer', [x, 0, z], rand(6.2, 7.6) * s, painter('#4f3628', SUGI), { s: [0.62, 0.62], ry: rand(0, Math.PI * 2) });
}

function cedarGroup(b) {
  // un ou deux grands sugis devant, quelques cèdres simples derrière (plus loin, moins détaillés)
  const n = ri(1, 2);
  for (let i = 0; i < n; i++) sugi(b, rand(0.5, 2.8), (n === 1 ? 0 : i ? 2.2 : -2.2) + rand(-0.6, 0.6), rand(0.8, 1.2));
  for (let i = 0; i < ri(1, 3); i++) cedar(b, rand(-2.8, -1), rand(-3.2, 3.2), rand(0.75, 1.2));
  for (let i = 0; i < 4; i++) b.add(U.sph, pick(LEAF), [rand(-3, 3), 0.3, rand(-3, 3)], [rand(0.5, 0.9), 0.4, rand(0.5, 0.9)]);
}

function kaki(b) {   // plaqueminier chargé de kakis orange
  const m = leafyTree(b, rand(3.0, 3.6), rand(1.25, 1.45), '#5e4130', ['#3f6e33', '#4b7d3a', '#36622c', '#46773a']);
  for (const { p, n } of surface('tree', m, 1, 18)) {
    p.addScaledVector(n, 0.06);
    b.add(U.sph0, pick(['#f08a24', '#f59a2e', '#e8781c']), p.toArray(), [0.11, 0.1, 0.11]);
  }
}

function momiji(b, s = 1) {   // érable du Japon aux feuilles rouges et orangées
  leafyTree(b, rand(3.0, 3.8) * s, rand(1.4, 1.7), '#4e3528', ['#d8432f', '#e86a2a', '#c22a2a', '#f08a2a', '#b8261f']);
  b.add(U.cyl, '#d8604a', [0, 0.02, 0], [1.6 * s, 0.03, 1.6 * s]);
  for (let i = 0; i < 6; i++) b.add(U.cyl, pick(['#e86a2a', '#c22a2a']), [rand(-2, 2) * s, 0.03, rand(-2, 2) * s], [rand(0.2, 0.4), 0.02, rand(0.2, 0.4)]);
}

function bamboo(b) {
  const n = ri(7, 11);
  for (let i = 0; i < n; i++) {
    const x = rand(-1.3, 1.3), z = rand(-1.3, 1.3), h = rand(5, 8.5);
    const lean = rand(-0.08, 0.08);
    const col = pick(['#8bb84a', '#9cc457', '#7fae45', '#a6c862']);
    b.add(U.cyl6, col, [x, h / 2, z], [0.075, h, 0.075], [lean, 0, lean]);
    for (let y = 1.0; y < h - 0.5; y += rand(1.3, 1.7)) {   // noeuds
      b.add(U.cyl6, '#6f9a3a', [x + lean * y, y, z - lean * y], [0.085, 0.04, 0.085], [lean, 0, lean]);
    }
    for (let k = 0; k < 5; k++) {   // bouquets de feuilles effilées et retombantes le long du haut de la tige
      const yy = h - rand(0, 2.8);
      const cx = x + lean * yy + rand(-0.15, 0.15), cz = z - lean * yy + rand(-0.15, 0.15);
      const a0 = rand(0, Math.PI * 2);
      for (let j = 0; j < 4; j++) {
        const a = a0 + j * 1.57 + rand(-0.3, 0.3), len = rand(0.32, 0.48);
        b.add(BLADE, pick(['#6fa34a', '#5f9440', '#7db556', '#88c060', '#4f8a3e']),
          [cx + Math.cos(a) * len * 0.9, yy - len * 0.35, cz - Math.sin(a) * len * 0.9], [len, 0.012, len * 0.2], [0, a, -rand(0.3, 0.6)]);
      }
    }
  }
  for (let i = 0; i < 5; i++) b.add(U.cone8, pick(LEAF), [rand(-1.4, 1.4), 0.15, rand(-1.4, 1.4)], [0.12, 0.3, 0.12]);
}

function ajisai(b) {   // hortensias
  const cols = pick([['#7fa6e8', '#9ab8f0', '#6a8ed8'], ['#b48ae0', '#c9a6ee', '#9a70d0'], ['#f0a0c8', '#f6bcd8', '#e48ab8']]);
  const n = ri(3, 5);
  for (let i = 0; i < n; i++) {
    const x = rand(-0.6, 0.6), z = rand(-0.9, 0.9);
    b.add(U.sph, pick(['#3f7a3a', '#4a8a42']), [x, 0.3, z], [0.45, 0.32, 0.45]);
    for (let k = 0; k < 3; k++) b.add(U.sph0, pick(cols), [x + rand(-0.25, 0.25), 0.55 + rand(0, 0.15), z + rand(-0.25, 0.25)], [0.2, 0.17, 0.2]);
  }
}

function tufts(b) {   // touffes d'herbe et petites fleurs
  const n = ri(5, 9);
  for (let i = 0; i < n; i++) {
    const x = rand(-0.4, 0.4), z = rand(-1.3, 1.3);
    for (let k = 0; k < 3; k++) b.add(U.cone4, pick(GREENS), [x + rand(-0.1, 0.1), 0.18, z + rand(-0.1, 0.1)], [0.06, rand(0.25, 0.45), 0.06], [rand(-0.3, 0.3), 0, rand(-0.3, 0.3)]);
    if (Math.random() < 0.5) b.add(BALL, pick(['#ffffff', '#ffd84a', '#f7a8c8', '#c9a6ff']), [x, 0.35, z], [0.05, 0.05, 0.05]);
  }
}

function ferns(b) {   // fougères
  const n = ri(2, 4);
  for (let i = 0; i < n; i++) {
    const x = rand(-0.4, 0.4), z = rand(-1, 1);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      b.add(U.box, pick(['#4f8a3e', '#5c9a46', '#6aa852']), [x + Math.cos(a) * 0.25, 0.22, z + Math.sin(a) * 0.25], [0.5, 0.02, 0.12], [0, -a, 0.45]);
    }
  }
}

// ---------- Rochers, murets, clôtures ----------
// rocher (modèles « rock1 » à « rock3 »), moussu sur les faces tournées vers le ciel
const MOSS = ['#6f9a4f', '#7caa58', '#628c45'];
function rock(b, key, x, z, h, mossy = Math.random() < 0.6) {
  const stone = pick(STONE);
  addPlant(b, key, [x, -0.04, z], h, painter(null, [stone], { moss: mossy ? MOSS : null, jitter: 0.08 }), { s: [rand(0.9, 1.05), rand(0.9, 1.05)], ry: rand(0, Math.PI * 2) });
}

// l'élément est tourné au hasard : tout doit tenir dans un rayon de 0,8 m (moitié de sa largeur)
function rocks(b) {
  if (Math.random() < 0.35) { rock(b, 'rock3', 0, 0, rand(0.38, 0.46)); return; }   // amas de pierres
  rock(b, pick(['rock1', 'rock2']), 0, 0, rand(0.35, 0.52));
  for (let i = 0; i < ri(0, 2); i++) {
    const a = rand(0, Math.PI * 2);
    rock(b, pick(['rock1', 'rock2']), Math.cos(a) * 0.42, Math.sin(a) * 0.42, rand(0.2, 0.32));
  }
}

function stoneWall(b) {   // muret de pierres empilées, mousse sur le dessus
  for (let row = 0; row < 3; row++) {
    let z = -2;
    while (z < 2) {
      const w = rand(0.4, 0.8);
      b.add(U.box, pick(STONE), [rand(-0.03, 0.03), 0.18 + row * 0.33, z + w / 2], [0.5, 0.32, w - 0.04], [0, rand(-0.05, 0.05), 0]);
      z += w;
    }
  }
  b.add(U.box, '#6f9a4f', [0, 1.05, 0], [0.5, 0.08, 4]);
}

function bambooFence(b) {
  for (const z of [-1.9, 0, 1.9]) {
    b.add(U.cyl6, '#9a7a44', [0, 0.65, z], [0.07, 1.3, 0.07]);
    b.add(U.cyl6, '#7a5a30', [0, 1.31, z], [0.08, 0.04, 0.08]);
  }
  for (const y of [0.3, 0.75, 1.15]) b.add(U.cyl6, '#9cb75a', [0, y, 0], [0.045, 4, 0.045], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 9; i++) {   // treillis croisé
    const z = -1.8 + i * 0.45;
    b.add(U.cyl6, '#b6c878', [0.03, 0.72, z], [0.025, 1.0, 0.025], [0.45, 0, 0]);
    b.add(U.cyl6, '#b6c878', [-0.03, 0.72, z], [0.025, 1.0, 0.025], [-0.45, 0, 0]);
  }
}

function woodFence(b) {
  for (const z of [-1.95, 0, 1.95]) {
    b.add(U.box, DARK_WOOD, [0, 0.65, z], [0.14, 1.3, 0.14]);
    b.add(U.cone4, DARK_WOOD, [0, 1.38, z], [0.12, 0.14, 0.12], [0, Math.PI / 4, 0]);
  }
  for (let i = 0; i < 13; i++) b.add(U.box, i % 2 ? '#7b583c' : '#87634a', [0.06, 0.6, -1.85 + i * 0.31], [0.05, 1.05, 0.29]);
  b.add(U.box, DARK_WOOD, [0.08, 1.16, 0], [0.09, 0.08, 4]);
  b.add(U.box, DARK_WOOD, [0.08, 0.2, 0], [0.09, 0.06, 4]);
}

// ---------- Petits éléments ----------
function lantern(b) {   // tōrō en pierre (deux modèles)
  const g = pick(STONE), g2 = '#8f8c84';
  if (Math.random() < 0.5) {
    b.add(U.cyl6, g2, [0, 0.1, 0], [0.38, 0.2, 0.38]);
    b.add(U.cyl6, g, [0, 0.6, 0], [0.14, 0.8, 0.14]);
    b.add(U.cyl6, g2, [0, 1.05, 0], [0.32, 0.12, 0.32]);
    b.add(U.box, '#fff1c4', [0, 1.28, 0], [0.36, 0.34, 0.36]);
    for (const [dx, dz] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) b.add(U.box, g, [dx, 1.28, dz], [0.06, 0.36, 0.06]);
    b.add(U.cone4, g, [0, 1.6, 0], [0.6, 0.34, 0.6], [0, Math.PI / 4, 0]);
    b.add(U.sph0, g, [0, 1.84, 0], [0.1, 0.13, 0.1]);
  } else {   // yukimi-dōrō : lanterne trapue à large toit
    for (const a of [0, 2.1, 4.2]) b.add(U.cyl6, g2, [Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3], [0.07, 0.6, 0.07], [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]);
    b.add(U.cyl6, g, [0, 0.65, 0], [0.4, 0.1, 0.4]);
    b.add(U.box, '#fff1c4', [0, 0.86, 0], [0.38, 0.32, 0.38]);
    b.add(U.cyl6, g, [0, 1.1, 0], [0.75, 0.18, 0.75]);
    b.add(U.cone8, g, [0, 1.3, 0], [0.45, 0.25, 0.45]);
    b.add(U.sph0, g, [0, 1.48, 0], [0.1, 0.12, 0.1]);
  }
  if (Math.random() < 0.5) b.add(U.sph0, '#7caa58', [0.25, 0.08, 0.2], [0.3, 0.1, 0.3]);
}

function jizo(b) {   // statuettes jizō aux bavoirs rouges sous un petit toit
  b.add(U.box, '#9a978e', [0, 0.08, 0], [0.8, 0.16, 1.6]);
  const n = ri(2, 4);
  for (let i = 0; i < n; i++) {
    const z = -0.55 + i * (1.1 / Math.max(1, n - 1));
    b.add(U.cyl6, '#a9a69c', [0, 0.38, z], [0.14, 0.44, 0.14]);
    b.add(BALL, '#b3afa4', [0, 0.7, z], [0.13, 0.14, 0.13]);
    b.add(U.cone8, '#d23a2e', [0.06, 0.5, z], [0.17, 0.2, 0.17], [0, 0, Math.PI]);
    b.add(U.cyl, '#d23a2e', [0, 0.82, z], [0.1, 0.06, 0.1]);
  }
  for (const z of [-0.85, 0.85]) b.add(U.box, WOOD, [-0.3, 0.75, z], [0.08, 1.5, 0.08]);
  b.add(U.roof, '#5b4a3e', [-0.05, 1.45, 0], [1.1, 0.35, 2.0]);
  b.add(U.box, '#e8e2d6', [0.35, 0.2, 0.0], [0.12, 0.1, 0.12]);   // offrande
}

function hokora(b) {   // petit sanctuaire de bord de chemin
  b.add(U.box, '#9a978e', [0, 0.15, 0], [1.3, 0.3, 1.3]);
  b.add(U.box, '#a8a59c', [0, 0.38, 0], [1.0, 0.16, 1.0]);
  b.add(U.box, '#8a5a32', [0, 0.8, 0], [0.7, 0.7, 0.7]);
  b.add(U.box, '#f4ecd8', [0.36, 0.8, 0], [0.02, 0.4, 0.3]);
  b.add(U.roof, '#3f4656', [0, 1.15, 0], [1.05, 0.4, 1.0], [0, Math.PI / 2, 0]);
  // mini torii et renards blancs
  for (const z of [-0.35, 0.35]) b.add(U.cyl6, RED, [0.95, 0.45, z], [0.04, 0.9, 0.04]);
  b.add(U.box, '#2b2b2b', [0.95, 0.92, 0], [0.08, 0.06, 0.95]);
  b.add(U.box, RED, [0.95, 0.75, 0], [0.06, 0.05, 0.8]);
  for (const z of [-0.45, 0.45]) {
    b.add(U.box, '#9a978e', [0.55, 0.42, z], [0.2, 0.08, 0.2]);
    b.add(BALL, '#f6f2ea', [0.55, 0.56, z], [0.07, 0.1, 0.06]);
    b.add(U.cone4, '#f6f2ea', [0.6, 0.68, z], [0.04, 0.08, 0.04]);
    b.add(U.box, RED, [0.6, 0.52, z], [0.06, 0.04, 0.1]);
  }
}

function nobori(b) {   // bannières verticales colorées
  const cols = [['#c8302a', '#ffffff'], ['#2c3c78', '#f4f1ea'], ['#e8b030', '#c8302a'], ['#3f8a5e', '#ffffff']];
  for (let i = 0; i < 3; i++) {
    const z = -1 + i;
    const [c1, c2] = pick(cols);
    b.add(U.cyl6, '#2a2522', [0, 1.6, z], [0.03, 3.2, 0.03]);
    b.add(U.box, '#2a2522', [0, 3.05, z + 0.18], [0.02, 0.02, 0.4]);
    b.add(U.box, c1, [0.03, 2.1, z + 0.2], [0.02, 1.9, 0.38]);
    b.add(U.box, c2, [0.045, 2.6, z + 0.2], [0.01, 0.5, 0.3]);
    b.add(U.box, c2, [0.045, 1.6, z + 0.2], [0.01, 0.08, 0.38]);
  }
}

function chaya(b) {   // banc de maison de thé : feutre rouge et grande ombrelle
  b.add(U.box, '#c8302a', [0, 0.5, 0], [0.75, 0.08, 1.8]);
  b.add(U.box, '#8a6240', [0, 0.44, 0], [0.8, 0.06, 1.85]);
  for (const z of [-0.8, 0.8]) for (const x of [-0.3, 0.3]) b.add(U.box, DARK_WOOD, [x, 0.22, z], [0.07, 0.44, 0.07]);
  b.add(U.cyl6, '#5a4030', [-0.5, 1.3, 0], [0.04, 2.6, 0.04]);
  b.add(U.cone8, '#d8392f', [-0.5, 2.45, 0], [1.3, 0.55, 1.3]);
  b.add(U.cone8, '#f4e6c4', [-0.5, 2.73, 0], [0.18, 0.12, 0.18]);
  // service à thé
  b.add(U.box, '#2a2522', [0.1, 0.56, -0.3], [0.3, 0.04, 0.3]);
  b.add(U.cyl, '#5c7a4a', [0.1, 0.62, -0.38], [0.05, 0.08, 0.05]);
  b.add(U.cyl, '#f2ece0', [0.1, 0.61, -0.22], [0.045, 0.06, 0.045]);
  b.add(BALL, '#f48fb1', [0.1, 0.6, 0.3], [0.05, 0.05, 0.05]);
  b.add(BALL, '#a8cf6a', [0.1, 0.6, 0.4], [0.05, 0.05, 0.05]);
}

// Marchandises d'une échoppe posées sur un plateau (rectangle r d'un modèle, voir shelf()) : paniers de
// fruits ou de légumes, boîtes de gâteaux, bouteilles
const GOODS = [['#f08a24', '#f59a2e'], ['#c8302a', '#e04a3a'], ['#a8cf6a', '#8fbf55'], ['#f48fb1', '#ffffff'], ['#ffd23f', '#f2c230']];
function wares(b, x0, x1, z0, z1, y) {
  const n = Math.max(2, Math.round((z1 - z0) / 0.45));
  for (let i = 0; i < n; i++) {
    const z = z0 + ((i + 0.5) * (z1 - z0)) / n, x = (x0 + x1) / 2 + rand(-0.08, 0.08);
    const k = Math.random();
    if (k < 0.55) {   // panier plat chargé
      b.add(U.cyl, '#b08850', [x, y + 0.04, z], [0.19, 0.08, 0.19]);
      const c = pick(GOODS);
      for (let j = 0; j < 5; j++) b.add(U.sph0, pick(c), [x + rand(-0.1, 0.1), y + 0.12 + (j > 3 ? 0.07 : 0), z + rand(-0.1, 0.1)], [0.07, 0.065, 0.07]);
    } else if (k < 0.8) {   // pile de boîtes de gâteaux
      for (let j = 0; j < ri(1, 3); j++) b.add(U.box, pick(['#f4ecdc', '#e8b8c8', '#c8d8a8']), [x, y + 0.05 + j * 0.1, z], [0.26, 0.09, 0.3], [0, rand(-0.2, 0.2), 0]);
    } else {   // bouteilles de saké
      for (let j = 0; j < 3; j++) {
        b.add(U.cyl6, pick(['#f2ece0', '#6a4a8a', '#3a6a5a']), [x + rand(-0.08, 0.08), y + 0.13, z - 0.1 + j * 0.1], [0.045, 0.26, 0.045]);
      }
    }
  }
}

// Échoppe de rue : étal en bois à auvent rayé (modèle « stall ») ou charrette yatai (modèle « cart »),
// recolorés aux couleurs du marché, avec lanternes, noren et marchandises
const AWNINGS = [['#c8302a', '#f4ecdc'], ['#2c3c78', '#f4ecdc'], ['#3f6a4a', '#efe2c4'], ['#a8452f', '#f2d9a0']];
function yatai(b) {
  const [c1, c2] = pick(AWNINGS);
  const wood = pick(['#8a6240', '#7a5638', '#94704a']);
  const rot = Math.PI;   // côté ouvert vers la voie
  const flip = (r) => ({ x0: -r.x1, x1: -r.x0, z0: -r.z1, z1: -r.z0, y: r.y });
  if (Math.random() < 0.55) {
    const H = 2.65;
    addPlant(b, 'stall', [0, 0, 0], H, (role) => {
      if (role === 0) return _tc.set(c1);
      if (role === 1) return _tc.set(c2);
      return _tc.set(role === 2 ? wood : DARK_WOOD).multiplyScalar(1 + rand(-0.06, 0.06));
    }, { ry: rot });
    const r = flip(shelf('stall', [2], 0.4, 0.6));
    wares(b, r.x0 * H, r.x1 * H, r.z0 * H + 0.1, r.z1 * H - 0.1, r.y * H);
    for (const z of [-1.1, 1.1]) {   // lanternes accrochées à l'auvent
      b.add(BALL, z < 0 ? '#d8392f' : '#f4e6c4', [0.95, 1.75, z], [0.16, 0.23, 0.16]);
      b.add(U.cyl, '#1e1a18', [0.95, 2.0, z], [0.07, 0.04, 0.07]);
      b.add(U.cyl, '#1e1a18', [0.95, 1.5, z], [0.07, 0.04, 0.07]);
    }
  } else {
    const H = 2.3;
    addPlant(b, 'cart', [0, 0, 0], H, (role) => {
      if (role === 1) return _tc.set(c1);
      if (role === 2) return _tc.set(c2);
      if (role === 4) return _tc.set('#3a3330');
      return _tc.set(role === 3 ? DARK_WOOD : wood).multiplyScalar(1 + rand(-0.06, 0.06));
    }, { ry: rot + Math.PI / 2 });   // charrette en long, le long de la voie
    // noren pendu sous l'auvent, côté voie, et une lanterne rouge
    b.add(U.box, c1, [0.58, 1.55, 0.3], [0.03, 0.4, 1.0]);
    b.add(U.box, '#f4f1ea', [0.6, 1.55, 0.3], [0.01, 0.14, 0.14]);
    b.add(BALL, '#d8392f', [0.7, 1.45, -0.6], [0.15, 0.21, 0.15]);
    b.add(U.cyl, '#1e1a18', [0.7, 1.67, -0.6], [0.065, 0.04, 0.065]);
    // tabourets devant le comptoir
    for (const z of [-0.5, 0.4]) b.add(U.cyl6, '#6b4a33', [1.0, 0.25, z], [0.14, 0.5, 0.14]);
  }
}

function well(b) {   // puits avec petit toit et seau
  b.add(U.cyl, pick(STONE), [0, 0.35, 0], [0.55, 0.7, 0.55]);
  b.add(U.cyl, '#2a3a44', [0, 0.69, 0], [0.45, 0.02, 0.45]);
  b.add(U.cyl, '#8f8c84', [0, 0.72, 0], [0.58, 0.06, 0.58]);
  for (const z of [-0.6, 0.6]) b.add(U.box, WOOD, [0, 1.15, z], [0.1, 1.6, 0.1]);
  b.add(U.box, WOOD, [0, 1.75, 0], [0.08, 0.08, 1.3]);
  b.add(U.cyl, '#3a2a20', [0, 1.75, 0], [0.12, 0.08, 0.12], [Math.PI / 2, 0, 0]);
  b.add(U.roof, '#4a3a2e', [0, 1.95, 0], [1.2, 0.45, 1.5]);
  b.add(U.cyl, '#8a6240', [0.65, 0.85, 0.3], [0.12, 0.2, 0.12]);
}

function pots(b) {   // pots de bonsaïs et tonneaux d'eau devant les maisons
  for (let i = 0; i < ri(2, 4); i++) {
    const z = rand(-1.2, 1.2);
    if (Math.random() < 0.6) {
      b.add(U.cyl, pick(['#8a5a3a', '#4a5a6a', '#a06a4a']), [0, 0.18, z], [0.2, 0.36, 0.2]);
      b.add(U.sph, pick(LEAF), [0, 0.5, z], [0.28, 0.2, 0.28]);
      b.add(U.cyl6, '#5a4030', [0, 0.42, z], [0.03, 0.2, 0.03]);
    } else {
      b.add(U.cyl, '#7a5a3a', [0, 0.3, z], [0.25, 0.6, 0.25]);
      for (const y of [0.12, 0.48]) b.add(U.cyl, '#3a2a20', [0, y, z], [0.26, 0.04, 0.26]);
      b.add(U.cyl, '#4a7a9a', [0, 0.6, z], [0.22, 0.01, 0.22]);
    }
  }
}

// ---------- Bâtiments ----------
function tiledRoof(b, y, w, h, l, col = ROOF_TILE) {
  b.add(U.roof, col, [0, y, 0], [w, h, l]);
  const n = Math.floor(l / 0.35);
  const ang = Math.atan2(h, w / 2);
  for (let i = 0; i <= n; i++) {   // rangées de tuiles
    const z = -l / 2 + (i * l) / n;
    for (const sx of [-1, 1]) b.add(U.box, '#3a404c', [sx * w * 0.26, y + h * 0.48, z], [w * 0.56, 0.05, 0.06], [0, 0, sx * -ang]);
  }
  b.add(U.box, '#2f3440', [0, y + h + 0.02, 0], [0.24, 0.16, l + 0.1]);
  for (const sz of [-1, 1]) b.add(U.box, '#2f3440', [0, y + h + 0.12, sz * (l / 2 + 0.05)], [0.18, 0.24, 0.12], [sz * 0.4, 0, 0]);
  // bord de l'avant-toit côté voie : planche de rive claire et bouts de tuiles ronds alignés
  b.add(U.box, '#e9e2d2', [w / 2 - 0.04, y - 0.06, 0], [0.06, 0.1, l]);
  for (let i = 0; i <= n; i++) b.add(U.box, '#2a2f3a', [w / 2 + 0.01, y + 0.04, -l / 2 + (i * l) / n], [0.08, 0.11, 0.13]);
}

// petites plantes en pot devant une façade (x = pied du mur côté voie)
function frontPots(b, x, zs) {
  for (const z of zs) {
    b.add(U.cyl6, pick(['#8a5a3a', '#4a5a6a', '#6a4a3a']), [x, 0.15, z], [0.14, 0.3, 0.14]);
    b.add(U.sph0, pick(LEAF), [x, 0.4, z], [0.2, 0.16, 0.2], [0, rand(0, 3), 0]);
    if (Math.random() < 0.5) b.add(U.sph0, pick(['#f4a8c4', '#ffffff', '#c9a6ff']), [x + 0.05, 0.5, z], [0.06, 0.05, 0.06]);
  }
}

function minka(b) {
  const L = 7, W = 4.6;
  b.add(U.box, '#4a3a2e', [0, 0.18, 0], [W + 0.3, 0.36, L + 0.3]);   // soubassement
  b.add(U.box, '#efe4c8', [0, 1.3, 0], [W, 2.0, L]);
  for (const x of [-W / 2, W / 2]) for (const z of [-L / 2, -1.2, 1.2, L / 2]) b.add(U.box, DARK_WOOD, [x, 1.3, z], [0.2, 2.0, 0.2]);
  b.add(U.box, DARK_WOOD, [W / 2 + 0.02, 1.75, 0], [0.12, 0.16, L + 0.05]);
  b.add(U.box, '#9b7653', [W / 2 + 0.45, 0.45, 0], [0.9, 0.12, L - 0.4]);   // engawa
  for (const z of [-3, -1.5, 0, 1.5, 3]) b.add(U.box, DARK_WOOD, [W / 2 + 0.85, 0.22, z], [0.1, 0.36, 0.1]);
  // shōji
  for (const zc of [-1.2, 1.2]) {
    b.add(U.box, '#f8f3e3', [W / 2 + 0.03, 1.15, zc], [0.04, 1.3, 1.9]);
    for (let i = 1; i < 5; i++) b.add(U.box, DARK_WOOD, [W / 2 + 0.06, 1.15, zc - 0.95 + i * 0.38], [0.02, 1.3, 0.025]);
    for (let j = 1; j < 4; j++) b.add(U.box, DARK_WOOD, [W / 2 + 0.06, 0.5 + j * 0.33, zc], [0.02, 0.025, 1.9]);
  }
  b.add(U.box, '#5a4030', [W / 2 + 0.03, 0.42, 0], [0.04, 0.12, L]);   // plinthe en bois sous les shōji
  // toit de chaume épais : versant, bord taillé plus clair, mèches de paille plus sombres le long du versant
  const RW = W + 1.8, RH = 3.4, RL = L + 1.4, ang = Math.atan2(RH, RW / 2), slope = Math.hypot(RH, RW / 2);
  const thatch = pick(['#c4a265', '#bc9a5c', '#c8a86c']);
  b.add(U.roof, thatch, [0, 2.3, 0], [RW, RH, RL]);
  b.add(U.roof, '#b08c50', [0, 2.25, 0], [RW + 0.1, 0.5, RL + 0.1]);
  b.add(U.box, '#d9bd84', [RW / 2 - 0.12, 2.32, 0], [0.3, 0.16, RL + 0.12], [0, 0, -ang]);   // tranche du chaume
  for (let i = 0; i < 16; i++) {
    const z = -RL / 2 + 0.3 + (i * (RL - 0.6)) / 15, t = rand(0.35, 0.75);
    b.add(U.box, pick(['#a8864c', '#b8945a', '#9c7c46']), [RW / 4 + 0.03, 2.3 + RH / 2 + 0.02, z + rand(-0.1, 0.1)], [slope * t, 0.03, 0.08], [0, 0, -ang]);
  }
  b.add(U.box, '#5b4a36', [0, 5.62, 0], [0.7, 0.4, L + 1.6]);
  for (let i = 0; i < 5; i++) b.add(U.box, '#3f3226', [0, 5.86, -L / 2 + 0.3 + i * (L / 4)], [0.9, 0.12, 0.12]);
  // bois de chauffe empilé contre le pignon
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r >> 1); i++) {
    b.add(U.box, pick(['#8a6a48', '#7a5a3a', '#9a7a52']), [W / 2 - 0.5 - i * 0.28 - r * 0.14, 0.14 + r * 0.24, L / 2 + 0.45], [0.24, 0.22, 0.7]);
  }
  // kakis séchés (hoshigaki) pendus sous l'avant-toit
  if (Math.random() < 0.6) {
    for (const z of [-2.6, -2.1, 2.1]) {
      b.add(U.box, '#c8b088', [W / 2 + 0.55, 2.0, z], [0.02, 0.7, 0.02]);
      for (let k = 0; k < 5; k++) b.add(U.sph0, pick(['#d8601c', '#c4501a', '#e07028']), [W / 2 + 0.55, 1.75 + k * 0.12, z], [0.06, 0.055, 0.06]);
    }
  }
  // jardin : pierre et pas japonais vers l'engawa
  if (Math.random() < 0.6) b.add(U.sph0, pick(STONE), [W / 2 + 1.5, 0.25, rand(-2, 2)], [0.5, 0.35, 0.4]);
  for (let i = 0; i < 3; i++) b.add(U.cyl6, pick(STONE), [W / 2 + 1.15 + i * 0.5, 0.03, rand(-0.3, 0.3)], [0.22, 0.06, 0.18]);
}

function machiya(b) {
  const L = 6.2, W = 4.5, two = Math.random() < 0.7;
  const wall = pick(['#ebe1cb', '#efe7d6', '#e4d7bd', '#e8dcc4']);
  const H = two ? 3.8 : 2.6;
  b.add(U.box, wall, [0, H / 2, 0], [W, H, L]);
  b.add(U.box, '#5d3f2a', [W / 2 + 0.02, 0.95, 0], [0.08, 1.9, L]);
  for (let i = 0; i < 22; i++) b.add(U.box, '#7a5638', [W / 2 + 0.08, 0.95, -2.9 + i * 0.275], [0.05, 1.8, 0.07]);   // kōshi
  // noren et lanterne
  b.add(U.box, pick(['#2f3f7a', '#7a2f3f', '#2f6a4a', '#5a3a6a']), [W / 2 + 0.15, 1.45, -1.5], [0.04, 0.75, 1.6]);
  b.add(U.box, '#f4f1ea', [W / 2 + 0.17, 1.55, -1.5], [0.01, 0.2, 0.2]);
  b.add(BALL, pick(['#d8392f', '#f4e6c4']), [W / 2 + 0.4, 1.55, 1.0], [0.22, 0.32, 0.22]);
  b.add(U.cyl, '#1e1a18', [W / 2 + 0.4, 1.86, 1.0], [0.1, 0.05, 0.1]);
  b.add(U.cyl, '#1e1a18', [W / 2 + 0.4, 1.24, 1.0], [0.1, 0.05, 0.1]);
  // auvent
  b.add(U.box, ROOF_TILE, [W / 2 + 0.45, 2.05, 0], [1.2, 0.12, L + 0.4], [0, 0, -0.35]);
  if (two) {
    // étage : fenêtre mushiko et balcon
    b.add(U.box, '#3a2a20', [W / 2 + 0.02, 3.0, 0], [0.06, 0.6, 3]);
    for (let i = 0; i < 10; i++) b.add(U.box, wall, [W / 2 + 0.06, 3.0, -1.35 + i * 0.3], [0.04, 0.6, 0.08]);
    if (Math.random() < 0.5) {
      b.add(U.box, '#6b4a33', [W / 2 + 0.4, 2.55, 0], [0.8, 0.06, 4]);
      for (let i = 0; i < 12; i++) b.add(U.box, '#6b4a33', [W / 2 + 0.78, 2.8, -1.9 + i * 0.35], [0.04, 0.45, 0.04]);
      b.add(U.box, '#6b4a33', [W / 2 + 0.78, 3.04, 0], [0.06, 0.05, 4]);
    }
  }
  // enseigne en bois
  b.add(U.box, '#3a2a1c', [W / 2 + 0.06, 2.35, 1.6], [0.05, 0.35, 1.2]);
  b.add(U.box, '#e8c46a', [W / 2 + 0.09, 2.35, 1.6], [0.01, 0.06, 0.8]);
  // poteaux d'angle et poutre entre les étages : la façade se lit maison par maison
  for (const z of [-L / 2, L / 2]) b.add(U.box, '#4a3426', [W / 2 + 0.06, H / 2, z], [0.16, H, 0.18]);
  if (two) b.add(U.box, '#4a3426', [W / 2 + 0.06, 2.6, 0], [0.1, 0.12, L]);
  // inuyarai : clôture basse de bambou courbée au pied du mur, à côté de la porte
  for (let i = 0; i < 9; i++) b.add(U.box, '#6a5034', [W / 2 + 0.3, 0.3, 0.2 + i * 0.32], [0.03, 0.7, 0.04], [0, 0, 0.55]);
  b.add(U.box, '#5a4030', [W / 2 + 0.12, 0.62, 1.48], [0.04, 0.04, 2.7]);
  b.add(U.box, '#5a4030', [W / 2 + 0.48, 0.04, 1.48], [0.05, 0.05, 2.7]);
  if (two && Math.random() < 0.6) {   // store de bambou (sudare) déroulé à l'étage
    b.add(U.box, '#c8a868', [W / 2 + 0.1, 3.0, 2.2], [0.03, 0.75, 1.1]);
    for (let j = 0; j < 4; j++) b.add(U.box, '#9a7a48', [W / 2 + 0.12, 2.7 + j * 0.2, 2.2], [0.01, 0.02, 1.1]);
  }
  frontPots(b, W / 2 + 0.35, Math.random() < 0.5 ? [-2.6] : [-2.6, -0.45]);
  tiledRoof(b, H, W + 1.1, 1.5, L + 0.8);
}

function kura(b) {   // entrepôt à murs blancs et soubassement en namako
  const L = 5, W = 4, H = 3.6;
  b.add(U.box, '#3a3d44', [0, 0.6, 0], [W + 0.06, 1.2, L + 0.06]);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) {   // treillis blanc en losange
    b.add(U.box, '#e8e6e0', [W / 2 + 0.04, 0.2 + j * 0.4, -L / 2 + 0.2 + i * 0.4], [0.02, 0.05, 0.3], [Math.PI / 4, 0, 0]);
  }
  b.add(U.box, '#f6f4ee', [0, 1.2 + (H - 1.2) / 2, 0], [W, H - 1.2, L]);
  b.add(U.box, '#2a2522', [W / 2 + 0.03, 2.5, 0], [0.06, 0.7, 0.7]);    // fenêtre et volet
  b.add(U.box, '#f6f4ee', [W / 2 + 0.08, 2.5, 0.55], [0.04, 0.75, 0.4]);
  b.add(U.box, '#3a2a20', [W / 2 + 0.03, 1.0, -1.2], [0.06, 1.8, 1.2]);   // porte
  b.add(U.cyl, '#d0a43a', [W / 2 + 0.08, 1.9, -1.2], [0.12, 0.02, 0.12], [0, 0, Math.PI / 2]);
  // marches de pierre devant la porte, armoiries de la famille sur les pignons
  b.add(U.box, '#9a978e', [W / 2 + 0.3, 0.1, -1.2], [0.6, 0.2, 1.4]);
  b.add(U.box, '#a8a59c', [W / 2 + 0.7, 0.05, -1.2], [0.4, 0.1, 1.2]);
  // pignons en enduit blanc, dépassant à peine du toit de tuiles, avec les armoiries
  const GZ = (L + 0.7) / 2 + 0.02;
  b.add(U.roof, '#f6f4ee', [0, H, 0], [W, 1.2, GZ * 2]);
  const crest = pick(['#1e1a18', '#2a3a5a', '#7a2a2a']);
  for (const sz of [-1, 1]) {
    b.add(U.cyl, crest, [0, H + 0.42, sz * (GZ + 0.015)], [0.32, 0.02, 0.32], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, '#f6f4ee', [0, H + 0.42, sz * (GZ + 0.04)], [0.18, 0.02, 0.18], [Math.PI / 2, 0, 0]);
    b.add(U.box, crest, [0, H + 0.42, sz * (GZ + 0.06)], [0.05, 0.28, 0.01]);
  }
  tiledRoof(b, H, W + 0.9, 1.3, L + 0.7);
}

function pagoda(b) {
  b.add(U.box, '#b9b2a3', [0, 0.3, 0], [4.4, 0.6, 4.4]);
  for (let i = 0; i < 5; i++) {
    const w = 3.2 - i * 0.42;
    const y = 0.6 + i * 1.5;
    b.add(U.box, '#a33b2c', [0, y + 0.6, 0], [w * 0.68, 1.2, w * 0.68]);
    b.add(U.box, '#f0e6d2', [0, y + 0.25, 0], [w * 0.7, 0.12, w * 0.7]);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.add(U.box, '#f0e6d2', [dx * w * 0.345, y + 0.75, dz * w * 0.345], [dx ? 0.02 : 0.3, 0.45, dz ? 0.02 : 0.3]);
    b.add(U.cone4, '#3a3f4b', [0, y + 1.5, 0], [w * 1.08, 0.7, w * 1.08], [0, Math.PI / 4, 0]);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add(BALL, '#c9a43a', [dx * w * 0.55, y + 1.2, dz * w * 0.55], [0.06, 0.1, 0.06]);
  }
  b.add(U.cyl6, '#c9a43a', [0, 9.6, 0], [0.08, 2.6, 0.08]);
  for (let i = 0; i < 6; i++) b.add(U.cyl6, '#c9a43a', [0, 8.9 + i * 0.3, 0], [0.22 - i * 0.015, 0.05, 0.22 - i * 0.015]);
}

function shrineTorii(b) {
  for (const z of [-1.6, 1.6]) {
    b.add(U.cyl, RED, [0, 1.8, z], [0.18, 3.6, 0.18]);
    b.add(U.cyl, '#2b2b2b', [0, 0.15, z], [0.22, 0.3, 0.22]);
  }
  b.add(U.box, '#2b2b2b', [0, 3.78, 0], [0.45, 0.28, 4.8]);
  b.add(U.box, RED, [0, 3.52, 0], [0.38, 0.22, 4.3]);
  b.add(U.box, RED, [0, 2.9, 0], [0.26, 0.22, 3.9]);
  b.add(U.box, '#2b2b2b', [0, 3.2, 0], [0.18, 0.5, 0.35]);
  // allée de pierres et lanternes
  for (let i = 0; i < 5; i++) b.add(U.box, pick(STONE), [-0.8 - i * 0.7, 0.03, 0], [0.55, 0.06, 0.9]);
  for (const z of [-2.2, 2.2]) {
    b.add(U.cyl6, '#9a978e', [-0.6, 0.45, z], [0.1, 0.9, 0.1]);
    b.add(U.box, '#fff1c4', [-0.6, 1.0, z], [0.28, 0.25, 0.28]);
    b.add(U.cone4, '#9a978e', [-0.6, 1.25, z], [0.4, 0.24, 0.4], [0, Math.PI / 4, 0]);
  }
}

function senbon(b) {   // tunnel de torii vermillon le long d'un sentier
  const n = 8;
  for (let i = 0; i < n; i++) {
    const z = -4.2 + i * 1.2;
    for (const x of [-0.8, 0.8]) {
      b.add(U.cyl6, '#e8502a', [x, 1.2, z], [0.09, 2.4, 0.09]);
      b.add(U.cyl6, '#1f1f22', [x, 0.12, z], [0.11, 0.24, 0.11]);
    }
    b.add(U.box, '#1f1f22', [0, 2.48, z], [2.1, 0.14, 0.2]);
    b.add(U.box, '#e8502a', [0, 2.32, z], [1.9, 0.12, 0.16]);
    b.add(U.box, '#e8502a', [0, 1.95, z], [1.8, 0.1, 0.1]);
  }
  for (let i = 0; i < 12; i++) b.add(U.box, pick(STONE), [rand(-0.15, 0.15), 0.03, -4.6 + i * 0.8], [0.9, 0.05, 0.6]);
}

function stairsShrine(b) {   // escalier de pierre qui monte vers un petit sanctuaire
  for (let i = 0; i < 7; i++) b.add(U.box, pick(STONE), [-0.4 - i * 0.45, 0.12 + i * 0.22, 0], [0.5, 0.24 + i * 0.44, 1.6]);
  b.add(U.box, '#9a978e', [-4.4, 1.55, 0], [2.6, 0.1, 3.4]);
  // torii au pied des marches
  for (const z of [-1.0, 1.0]) b.add(U.cyl6, '#e8502a', [0.2, 1.3, z], [0.11, 2.6, 0.11]);
  b.add(U.box, '#1f1f22', [0.2, 2.65, 0], [0.24, 0.16, 2.6]);
  b.add(U.box, '#e8502a', [0.2, 2.2, 0], [0.16, 0.12, 2.3]);
  // sanctuaire
  b.add(U.box, '#8a5a32', [-4.5, 2.5, 0], [1.6, 1.8, 2.2]);
  b.add(U.box, '#f4ecd8', [-3.68, 2.4, 0], [0.04, 1.0, 1.2]);
  b.add(U.roof, '#3f4656', [-4.5, 3.4, 0], [2.4, 0.9, 2.8], [0, Math.PI / 2, 0]);
  for (const z of [-1.3, 1.3]) {
    b.add(U.cyl6, '#9a978e', [-3.4, 2.05, z], [0.09, 0.9, 0.09]);
    b.add(U.box, '#fff1c4', [-3.4, 2.6, z], [0.26, 0.24, 0.26]);
    b.add(U.cone4, '#9a978e', [-3.4, 2.85, z], [0.36, 0.22, 0.36], [0, Math.PI / 4, 0]);
  }
  for (let i = 0; i < 2; i++) cedar(b, -5.5 + i * 0.5, i ? 2.4 : -2.4, 0.9);
}

// ---------- Champs, eau, campagne ----------
function paddy(b) {
  const flooded = Math.random() < 0.35;
  b.add(U.box, flooded ? '#a8d2dc' : '#89b9ad', [0, 0.03, 0], [8, 0.06, 11]);
  if (flooded) {   // reflets du ciel
    for (let i = 0; i < 4; i++) b.add(U.box, '#d6ecf2', [rand(-3, 3), 0.065, rand(-4.5, 4.5)], [rand(0.8, 2), 0.005, rand(0.2, 0.5)]);
  } else {
    for (let i = 0; i < 9; i++) {
      for (let k = 0; k < 14; k++) b.add(U.cone4, i % 2 ? '#86b84f' : '#7aab47', [-3.6 + i * 0.9, 0.22, -5 + k * 0.77], [0.12, 0.4, 0.12]);
    }
  }
  for (const z of [-5.6, 5.6]) b.add(U.box, '#8a6b48', [0, 0.1, z], [8.4, 0.2, 0.3]);
  for (const x of [-4.1, 4.1]) b.add(U.box, '#8a6b48', [x, 0.1, 0], [0.3, 0.2, 11.2]);
  for (let i = 0; i < 8; i++) b.add(U.cone4, '#6f9c55', [4.1, 0.25, -5 + i * 1.4], [0.08, 0.3, 0.08]);
  if (Math.random() < 0.4) {   // héron blanc
    const x = rand(-2.5, 2.5), z = rand(-3.5, 3.5);
    b.add(BALL, '#f6f6f2', [x, 0.75, z], [0.22, 0.18, 0.12]);
    b.add(U.cyl6, '#f6f6f2', [x + 0.15, 1.0, z], [0.03, 0.4, 0.03], [0, 0, -0.4]);
    b.add(BALL, '#f6f6f2', [x + 0.24, 1.2, z], [0.06, 0.05, 0.05]);
    b.add(U.cone4, '#e8b030', [x + 0.36, 1.19, z], [0.02, 0.14, 0.02], [0, 0, -Math.PI / 2]);
    for (const dz of [-0.05, 0.05]) b.add(U.cyl6, '#2a2a2a', [x, 0.32, z + dz], [0.012, 0.6, 0.012]);
  }
}

function field(b) {
  b.add(U.box, '#8b6a45', [0, 0.05, 0], [7, 0.1, 9]);
  // potager en sillons : une culture par rang (choux, radis daikon, poireaux negi), modèles « cabbage »,
  // « radish », « leek », un peu variés en taille, teinte et orientation
  const crops = [['cabbage', 0.46, 9, 1.35], ['radish', 0.78, 11, 1.5], ['leek', 0.85, 13, 1.4]];
  const first = ri(0, 2);
  for (let r = 0; r < 5; r++) {
    const x = -2.8 + r * 1.4;
    b.add(U.box, '#7a5a3a', [x, 0.12, 0], [0.6, 0.1, 8.6]);
    const [key, h, n, wide] = crops[(first + (r >> 1)) % 3];
    for (let i = 0; i < n; i++) {
      const z = -4.1 + ((i + 0.5) * 8.2) / n + rand(-0.08, 0.08);
      addPlant(b, key, [x + rand(-0.08, 0.08), 0.14, z], h * rand(0.85, 1.15), (role, part, j, up, c) => {
        // feuillage vert du jeu, racines et tiges claires gardées
        if (c[1] > c[0] + 20 && c[1] > c[2]) return _tc.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace).lerp(_leaf, 0.55);
        return null;
      }, { s: [wide, wide], ry: rand(0, Math.PI * 2) });
    }
  }
  if (Math.random() < 0.5) {   // panier et outils au bout d'un rang
    b.add(U.cyl, '#b08850', [3.6, 0.15, 4.2], [0.25, 0.3, 0.25]);
    b.add(U.cyl6, '#8a6a42', [3.4, 0.6, 3.6], [0.025, 1.3, 0.025], [0.3, 0, 0.2]);
  }
}
const _leaf = new THREE.Color('#5f9e45');

function hasakake(b) {   // séchoir à riz : gerbes dorées sur perches
  for (const z of [-1.8, 0, 1.8]) {
    for (const r of [0.35, -0.35]) b.add(U.cyl6, '#8a6a42', [0, 0.95, z], [0.05, 2.0, 0.05], [r, 0, 0]);
  }
  for (const y of [0.9, 1.5]) {
    b.add(U.cyl6, '#9a7a4a', [0, y, 0], [0.045, 4, 0.045], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 14; i++) {
      const z = -1.75 + i * 0.27;
      b.add(U.box, pick(['#e3c66f', '#d8b85a', '#ecd38a']), [0.08, y - 0.28, z], [0.12, 0.55, 0.2]);
      b.add(U.box, pick(['#e3c66f', '#d8b85a']), [-0.08, y - 0.28, z], [0.12, 0.55, 0.2]);
    }
  }
}

function suisha(b) {   // petit moulin à eau
  b.add(U.box, '#4a8aa8', [0.6, 0.05, 0], [1.6, 0.1, 5]);   // canal
  b.add(U.box, '#e8e0cc', [-1.4, 1.1, 0], [2.4, 2.2, 3]);
  for (const z of [-1.5, 1.5]) b.add(U.box, DARK_WOOD, [-1.4, 1.1, z], [2.42, 2.2, 0.12]);
  b.add(U.roof, '#c4a265', [-1.4, 2.2, 0], [3.2, 1.6, 3.6]);
  const cx = 0.55, cy = 1.25, R = 1.15;
  b.add(U.cyl, '#3a2a20', [cx, cy, 0], [0.18, 0.5, 0.18], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(U.box, '#7a5a3a', [cx, cy + Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.5], [0.06, 0.06, R], [-a + Math.PI / 2, 0, 0]);
    b.add(U.box, '#8a6a4a', [cx, cy + Math.sin(a) * R, Math.cos(a) * R], [0.4, 0.06, 0.32], [-a, 0, 0]);
  }
  for (const dx of [-0.2, 0.2]) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      b.add(U.box, '#5a4030', [cx + dx, cy + Math.sin(a) * R * 0.95, Math.cos(a) * R * 0.95], [0.05, 0.08, 0.4], [-a, 0, 0]);
    }
  }
}

function pond(b) {   // étang aux carpes koï
  b.add(U.cyl, '#6fa8b8', [0, 0.03, 0], [2.6, 0.06, 3.4]);
  b.add(U.cyl, '#8cc0cc', [0, 0.065, 0], [2.0, 0.005, 2.7]);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    b.add(U.sph0, pick(STONE), [Math.cos(a) * 2.7, 0.12, Math.sin(a) * 3.5], [rand(0.25, 0.45), 0.2, rand(0.25, 0.45)], [0, a, 0]);
  }
  for (let i = 0; i < 5; i++) b.add(U.cyl, '#5c9a46', [rand(-1.6, 1.6), 0.075, rand(-2.2, 2.2)], [rand(0.2, 0.35), 0.01, rand(0.2, 0.35)]);
  for (let i = 0; i < 4; i++) {
    const x = rand(-1.4, 1.4), z = rand(-2, 2), a = rand(0, 6);
    b.add(BALL, pick(['#f08a24', '#ffffff', '#e8501c']), [x, 0.07, z], [0.08, 0.03, 0.2], [0, a, 0]);
    b.add(BALL, '#ffffff', [x + Math.sin(a) * 0.08, 0.08, z + Math.cos(a) * 0.08], [0.04, 0.02, 0.06], [0, a, 0]);
  }
  b.add(U.cyl6, '#9a978e', [2.9, 0.4, 2.6], [0.1, 0.8, 0.1]);
  b.add(U.box, '#fff1c4', [2.9, 0.9, 2.6], [0.24, 0.22, 0.24]);
  b.add(U.cone4, '#9a978e', [2.9, 1.12, 2.6], [0.34, 0.2, 0.34], [0, Math.PI / 4, 0]);
}

function scarecrow(b) {
  b.add(U.cyl6, '#7a5a3a', [0, 0.9, 0], [0.05, 1.8, 0.05]);
  b.add(U.box, '#7a5a3a', [0, 1.38, 0], [0.07, 0.07, 1.3]);
  b.add(U.box, pick(['#3d5fa8', '#a83d3d', '#5a8a4a']), [0, 1.25, 0], [0.28, 0.6, 0.62]);
  b.add(U.box, '#e8dcc0', [0, 1.3, 0], [0.3, 0.1, 0.64]);
  b.add(BALL, '#efe0c0', [0, 1.78, 0], [0.18, 0.18, 0.18]);
  b.add(BALL, '#2a2a2a', [0.17, 1.8, -0.06], [0.02, 0.02, 0.02]);
  b.add(BALL, '#2a2a2a', [0.17, 1.8, 0.06], [0.02, 0.02, 0.02]);
  b.add(U.cone8, '#d7b56a', [0, 1.98, 0], [0.45, 0.22, 0.45]);
  for (const z of [-0.62, 0.62]) b.add(U.cone4, '#e3c66f', [0, 1.3, z], [0.06, 0.18, 0.06], [Math.PI / 2 * Math.sign(z), 0, 0]);
}

function hill(b) {
  const w = rand(14, 24), h = rand(5, 10), l = rand(18, 30);
  b.add(U.sph, pick(GREENS), [0, -h * 0.25, 0], [w / 2, h, l / 2]);
  b.add(U.sph, pick(GREENS), [rand(-3, 3), -h * 0.3, rand(-6, 6)], [w * 0.3, h * 0.85, l * 0.3]);
  const n = ri(2, 5);
  for (let i = 0; i < n; i++) {
    const x = rand(-w * 0.25, w * 0.25), z = rand(-l * 0.25, l * 0.25);
    const y = h * 0.75 * Math.sqrt(Math.max(0, 1 - (x / (w / 2)) ** 2 - (z / (l / 2)) ** 2)) - h * 0.25;
    if (Math.random() < 0.6) cedar(b, x, z, rand(0.8, 1.1), y - 0.3); else b.add(U.sph, pick(LEAF), [x, y + 1.0, z], [1.3, 1.1, 1.3]);
  }
}

// Grand portail monumental au-dessus de la voie (toit de tuiles noir aux bords relevés,
// consoles, plaque, clous dorés). Assez haut pour sauter depuis le toit d'un train.
export function bigTorii(b) {
  const R = '#c8322a', R2 = '#a8261f', GOLD = '#e0b04a', TILE = '#30333a', TILE2 = '#3d4149';
  for (const sx of [-1, 1]) {
    const x = sx * 5.3;
    // socle à deux gradins et poteau carré
    b.add(U.box, R2, [x, 0.25, 0], [1.6, 0.5, 1.6]);
    b.add(U.box, R, [x, 0.65, 0], [1.25, 0.3, 1.25]);
    b.add(U.box, R, [x, 4.9, 0], [0.78, 8.6, 0.78]);
    b.add(U.box, R2, [x, 4.9, 0], [0.82, 8.6, 0.2]);
    // clous dorés le long du poteau
    for (let k = 0; k < 6; k++) {
      for (const sz of [-1, 1]) b.add(U.box, GOLD, [x, 1.6 + k * 1.15, sz * 0.4], [0.16, 0.16, 0.04]);
    }
    // petites balustrades de part et d'autre du pied
    const fx = x + sx * 1.35;
    for (const dz of [-0.9, 0, 0.9]) b.add(U.box, R, [fx, 0.75, dz], [0.12, 1.5, 0.12]);
    for (const y of [0.55, 1.25]) b.add(U.box, R, [fx, y, 0], [0.1, 0.1, 2.0]);
    for (const dz of [-0.9, 0.9]) b.add(U.cone4, R2, [fx, 1.6, dz], [0.09, 0.2, 0.09], [0, Math.PI / 4, 0]);
    // consoles ajourées sous la poutre basse
    b.add(U.box, R, [x - sx * 0.95, 7.55, 0], [1.2, 0.18, 0.3], [0, 0, sx * 0.35]);
    b.add(U.box, R2, [x - sx * 1.05, 7.75, 0], [0.7, 0.14, 0.32]);
  }
  // poutre basse (nuki) avec clous dorés
  b.add(U.box, R, [0, 8.05, 0], [12.4, 0.45, 0.55]);
  for (const x of [-3.2, -1.2, 1.2, 3.2]) b.add(U.box, GOLD, [x, 8.05, 0.29], [0.18, 0.18, 0.03]);
  // poutre haute et grappes de consoles (tokyō)
  b.add(U.box, R, [0, 8.85, 0], [12.0, 0.35, 0.7]);
  for (const x of [-5.3, -3.5, -1.8, 1.8, 3.5, 5.3]) {
    b.add(U.box, R2, [x, 9.15, 0], [0.5, 0.25, 0.9]);
    b.add(U.box, R, [x, 9.38, 0], [0.9, 0.2, 1.2]);
    b.add(U.box, GOLD, [x, 9.15, 0.46], [0.12, 0.12, 0.02]);
  }
  // plaque centrale noire encadrée de rouge et d'or
  b.add(U.box, GOLD, [0, 8.75, 0.36], [1.0, 1.25, 0.08]);
  b.add(U.box, '#1c1a1a', [0, 8.75, 0.41], [0.82, 1.05, 0.04]);
  for (let k = 0; k < 4; k++) b.add(U.box, '#d8b04a', [0, 9.1 - k * 0.24, 0.435], [0.36, 0.06, 0.01]);
  // bande rouge sous l'avant-toit, avec petits chevrons
  b.add(U.box, R, [0, 9.6, 0], [14.6, 0.32, 3.0]);
  for (let i = 0; i < 28; i++) b.add(U.box, '#f2e6c9', [-7.0 + i * 0.52, 9.47, 1.52], [0.14, 0.08, 0.04]);
  // toit de tuiles : versants + rangées de tuiles + coins relevés + faîtage
  b.add(U.roof, TILE, [0, 9.75, 0], [3.6, 1.35, 15.2], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 30; i++) {
    const x = -7.25 + i * 0.5;
    for (const sz of [-1, 1]) b.add(U.box, TILE2, [x, 10.4, sz * 0.92], [0.12, 0.1, 1.95], [sz * 0.64, 0, 0]);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.add(U.box, TILE, [sx * 7.55, 9.95, sz * 1.65], [1.1, 0.16, 0.5], [0, sz * sx * 0.5, sx * 0.4]);
    }
  }
  b.add(U.box, '#22252b', [0, 11.12, 0], [13.2, 0.3, 0.32]);
  for (const sx of [-1, 1]) {
    b.add(U.box, '#22252b', [sx * 6.7, 11.4, 0], [0.3, 0.5, 0.34], [0, 0, -sx * 0.4]);
    b.add(U.sph, GOLD, [sx * 6.85, 11.68, 0], [0.12, 0.12, 0.12]);
  }
}


// ---------- Sols par zone (bandes de 32 m le long de la voie, côté +x vers la voie) ----------
export const STRIP_LEN = 32;
function streetStrip(b) {   // rue pavée du village
  b.add(U.box, '#b9b3a8', [0, 0.02, 0], [3.1, 0.04, STRIP_LEN]);
  for (let i = 0; i < 40; i++) b.add(U.box, '#a49d90', [0, 0.042, -STRIP_LEN / 2 + i * 0.8], [3.1, 0.005, 0.05]);
  for (const x of [-0.8, 0.75]) b.add(U.box, '#a49d90', [x, 0.042, 0], [0.05, 0.005, STRIP_LEN]);
  for (let i = 0; i < 18; i++) b.add(U.box, pick(['#c6c0b4', '#aaa397']), [rand(-1.3, 1.3), 0.043, rand(-15, 15)], [rand(0.3, 0.7), 0.004, rand(0.3, 0.7)]);
  b.add(U.box, '#8f8c84', [1.6, 0.08, 0], [0.18, 0.16, STRIP_LEN]);   // bordure côté voie
  b.add(U.box, '#6a8aa0', [-1.62, 0.03, 0], [0.22, 0.03, STRIP_LEN]);   // caniveau
}
function pathStrip(b) {   // chemin de terre de campagne
  b.add(U.box, '#b8996a', [0.2, 0.02, 0], [1.6, 0.04, STRIP_LEN]);
  for (let i = 0; i < 26; i++) b.add(U.box, pick(['#a8895a', '#c4a678']), [rand(-0.4, 0.8), 0.043, rand(-15.5, 15.5)], [rand(0.2, 0.5), 0.004, rand(0.3, 0.9)]);
  for (let i = 0; i < 24; i++) b.add(U.cone4, pick(GREENS), [pick([-0.7, 1.1]) + rand(-0.1, 0.1), 0.15, rand(-15.5, 15.5)], [0.07, 0.3, 0.07]);
}
function mossStrip(b) {   // tapis de mousse et de fougères en forêt
  for (let i = 0; i < 10; i++) b.add(U.cyl, pick(['#5f8f45', '#6f9a4f', '#557f3e']), [rand(-1.2, 1.2), 0.02, -15 + i * 3.3 + rand(-1, 1)], [rand(0.8, 1.6), 0.03, rand(1, 2)]);
  for (let i = 0; i < 6; i++) b.add(U.sph0, pick(STONE), [rand(-1, 1), 0.1, rand(-15, 15)], [rand(0.15, 0.3), 0.12, rand(0.15, 0.3)]);
}

// Guirlande de lanternes tendue au-dessus des voies (village), bien au-dessus d'un saut depuis un train
export function garland(b) {
  for (const x of [-5.2, 5.2]) {
    b.add(U.cyl6, DARK_WOOD, [x, 4.8, 0], [0.12, 9.6, 0.12]);
    b.add(U.cone4, DARK_WOOD, [x, 9.75, 0], [0.16, 0.3, 0.16], [0, Math.PI / 4, 0]);
  }
  for (let i = 0; i <= 20; i++) {   // corde en chaînette
    const x = -5.2 + i * 0.52, y = 9.2 - Math.sin((i / 20) * Math.PI) * 0.5;
    b.add(U.box, '#3a2a20', [x, y, 0], [0.54, 0.03, 0.03], [0, 0, (i < 10 ? -1 : 1) * 0.08]);
  }
  for (let i = 0; i < 9; i++) {
    const x = -4.2 + i * 1.05, y = 9.2 - Math.sin(((x + 5.2) / 10.4) * Math.PI) * 0.5 - 0.45;
    b.add(BALL, i % 2 ? '#d8392f' : '#f4e6c4', [x, y, 0], [0.2, 0.28, 0.2]);
    b.add(U.cyl, '#1e1a18', [x, y + 0.27, 0], [0.09, 0.04, 0.09]);
    b.add(U.cyl, '#1e1a18', [x, y - 0.27, 0], [0.09, 0.04, 0.09]);
    b.add(U.box, '#3a2a20', [x, y + 0.36, 0], [0.01, 0.16, 0.01]);
  }
}

// ---------- Catalogue ----------
// len : longueur le long de la voie ; w : profondeur ; face : orienté vers la voie
export const DECOR = {
  sakura: { len: 4.5, w: 4.5, build: (b) => sakura(b, 1) },
  sakuraBig: { len: 6.5, w: 6.5, build: (b) => sakura(b, 1.5) },
  pine: { len: 3.5, w: 3, build: pine },
  cedar: { len: 3, w: 3, build: (b) => sugi(b) },
  cedarGroup: { len: 8, w: 7, build: cedarGroup },
  kaki: { len: 3.6, w: 3.4, build: kaki },
  momiji: { len: 3.6, w: 3.4, build: (b) => momiji(b, rand(0.85, 1.25)) },
  bamboo: { len: 3.2, w: 3, build: bamboo },
  ajisai: { len: 2.2, w: 1.4, build: ajisai },
  tufts: { len: 2.8, w: 0.9, build: tufts },
  ferns: { len: 2.4, w: 1, build: ferns },
  rocks: { len: 2.2, w: 1.6, build: rocks },
  stoneWall: { len: 4, w: 0.5, face: true, build: stoneWall },
  bambooFence: { len: 4, w: 0.3, face: true, build: bambooFence },
  woodFence: { len: 4, w: 0.3, face: true, build: woodFence },
  lantern: { len: 1.4, w: 1, build: lantern },
  jizo: { len: 2, w: 1.2, face: true, build: jizo },
  hokora: { len: 1.6, w: 2, face: true, build: hokora },
  nobori: { len: 3, w: 0.5, face: true, build: nobori },
  chaya: { len: 3, w: 2.2, face: true, build: chaya },
  yatai: { len: 3, w: 2.6, face: true, build: yatai },
  well: { len: 1.8, w: 1.6, face: true, build: well },
  pots: { len: 2.8, w: 0.6, face: true, build: pots },
  minka: { len: 8.8, w: 6.8, face: true, build: minka },
  machiya: { len: 7, w: 5.6, face: true, build: machiya },
  kura: { len: 5.8, w: 5, face: true, build: kura },
  pagoda: { len: 5, w: 5, build: pagoda },
  shrineTorii: { len: 5, w: 5, face: true, build: shrineTorii },
  senbon: { len: 9.6, w: 2.2, face: true, build: senbon },
  stairsShrine: { len: 6, w: 6.5, face: true, build: stairsShrine },
  paddy: { len: 11.8, w: 8.4, face: true, build: paddy },
  field: { len: 9.5, w: 7, face: true, build: field },
  hasakake: { len: 4, w: 0.6, face: true, build: hasakake },
  suisha: { len: 5, w: 4.2, face: true, build: suisha },
  pond: { len: 7.4, w: 6.4, build: pond },
  scarecrow: { len: 1.6, w: 1, face: true, build: scarecrow },
  hill: { len: 26, w: 22, build: hill },
  street: { len: STRIP_LEN, w: 3.4, face: true, build: streetStrip },
  path: { len: STRIP_LEN, w: 2, face: true, build: pathStrip },
  moss: { len: STRIP_LEN, w: 2.6, face: true, build: mossStrip },
};

// Thèmes : sol, positions des bandes (distance à la voie) et éléments pondérés par bande (null = vide)
export const THEMES = {
  campagne: {
    ground: 'path', gateEvery: [450, 700], x: { edge: 4.9, near: 6.7, mid: 8.8, far: 22 },
    edge: [['tufts', 3], ['ajisai', 1], [null, 1]],
    near: [['bambooFence', 2], ['hasakake', 1.5], ['scarecrow', 0.6], ['jizo', 0.6], ['hokora', 0.4], ['rocks', 1], ['kaki', 0.8], [null, 1]],
    mid: [['paddy', 4], ['field', 2], ['minka', 1.5], ['kaki', 1.2], ['sakura', 1], ['suisha', 0.5], ['pond', 0.5], ['pine', 0.6]],
    far: [['hill', 2], ['cedarGroup', 1.5], ['minka', 1], ['sakuraBig', 0.6], ['kaki', 0.5]],
  },
  village: {
    ground: 'street', dense: 0.8, garland: 0.45, x: { edge: 0, near: 8.1, mid: 9.6, far: 22 },
    edge: [],
    near: [['woodFence', 1.5], ['lantern', 1.2], ['nobori', 1], ['chaya', 0.8], ['well', 0.5], ['yatai', 1.2], ['pots', 1.5], ['stoneWall', 0.8], ['ajisai', 0.6]],
    mid: [['machiya', 5], ['kura', 1.6], ['minka', 0.6], ['sakura', 0.8], ['pagoda', 0.3], ['shrineTorii', 0.4]],
    far: [['machiya', 2], ['kura', 1], ['pagoda', 0.4], ['cedarGroup', 0.8], ['hill', 0.8]],
  },
  foret: {
    ground: 'moss', dense: 0.35, x: { edge: 4.9, near: 5.6, mid: 8.6, far: 16 },
    edge: [['ferns', 3], ['rocks', 1], ['tufts', 1]],
    near: [['bamboo', 3], ['lantern', 1], ['stoneWall', 0.5], ['hokora', 0.5], ['senbon', 0.5], ['momiji', 1.2], ['ajisai', 0.5]],
    mid: [['bamboo', 2], ['cedar', 2], ['momiji', 1.5], ['sakura', 1], ['shrineTorii', 0.6], ['stairsShrine', 0.5], ['pond', 0.4], ['pagoda', 0.2]],
    far: [['cedarGroup', 3], ['bamboo', 1.5], ['momiji', 1], ['cedar', 1.5]],
  },
};
export const THEME_ORDER = ['campagne', 'village', 'foret', 'campagne', 'village'];
export const THEME_LEN = 420;

export function weighted(list) {
  let total = 0;
  for (const [, w] of list) total += w;
  if (!total) return null;
  let r = Math.random() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

// Pré-construit plusieurs variantes par type (au chargement)
export function prebuildDecor() {
  for (const d of Object.values(DECOR)) {
    d.geos = [0, 1, 2, 3, 4, 5].map(() => { const b = new Builder(); d.build(b); return b.build(); });
  }
  let b = new Builder();
  bigTorii(b);
  const gate = b.build();
  b = new Builder();
  garland(b);
  return { gate, garland: b.build() };
}
