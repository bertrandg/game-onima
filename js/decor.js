import { Builder, U, pick, rand } from './geo.js';

// Chaque élément de décor est construit "face à +x" (vers la voie quand il est à gauche).
const WOOD = '#6b4a33';
const DARK_WOOD = '#4a3426';
const RED = '#d6452f';
const PINKS = ['#f9c4d6', '#f4a8c4', '#fcd7e5', '#f1b5cd'];
const GREENS = ['#86b765', '#7aa65a', '#93c070', '#6f9c55'];

function sakura(b, s = 1) {
  const h = rand(2.0, 2.8) * s;
  const trunk = '#6e4b3b';
  b.add(U.cyl6, trunk, [0, h / 2, 0], [0.17 * s, h, 0.17 * s], [0, 0, rand(-0.08, 0.08)]);
  b.add(U.cyl6, trunk, [0.4 * s, h * 0.82, 0], [0.07 * s, h * 0.5, 0.07 * s], [0, 0, -0.8]);
  b.add(U.cyl6, trunk, [-0.35 * s, h * 0.86, 0.1], [0.06 * s, h * 0.45, 0.06 * s], [0.2, 0, 0.8]);
  b.add(U.sph, pick(PINKS), [0, h + 0.5 * s, 0], [1.6 * s, 1.15 * s, 1.6 * s]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.random();
    const r = rand(1.0, 1.5) * s;
    b.add(U.sph, pick(PINKS), [Math.cos(a) * r, h + rand(0, 0.8) * s, Math.sin(a) * r],
      [rand(0.8, 1.3) * s, rand(0.7, 1.0) * s, rand(0.8, 1.3) * s]);
  }
}

function pine(b) {
  const c = '#5a4334';
  b.add(U.cyl6, c, [0.2, 1.5, 0], [0.16, 3, 0.16], [0, 0, -0.15]);
  b.add(U.cyl6, c, [0.7, 2.6, 0], [0.06, 1.2, 0.06], [0, 0, -1.1]);
  b.add(U.cyl6, c, [-0.3, 3.2, 0.2], [0.05, 1, 0.05], [0, 0, 1.0]);
  const g = ['#3e6b3d', '#4a7a45', '#46733f'];
  b.add(U.sph, pick(g), [1.1, 2.9, 0], [1.3, 0.45, 1.1]);
  b.add(U.sph, pick(g), [-0.6, 3.5, 0.3], [1.1, 0.42, 1.0]);
  b.add(U.sph, pick(g), [0.3, 4.0, -0.2], [0.9, 0.4, 0.8]);
}

function cedar(b, x = 0, z = 0, s = 1) {
  b.add(U.cyl6, '#5b4030', [x, 1 * s, z], [0.18 * s, 2 * s, 0.18 * s]);
  b.add(U.cone8, pick(['#335c3a', '#2f5536', '#3a6640']), [x, 4.6 * s, z], [1.3 * s, 6 * s, 1.3 * s]);
}

function cedarGroup(b) {
  const n = 3 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) cedar(b, rand(-2.5, 2.5), rand(-3, 3), rand(0.8, 1.3));
}

function bamboo(b) {
  const n = 6 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const x = rand(-1.2, 1.2), z = rand(-1.2, 1.2), h = rand(5, 8);
    const lean = rand(-0.08, 0.08);
    b.add(U.cyl6, pick(['#8bb84a', '#9cc457', '#7fae45']), [x, h / 2, z], [0.07, h, 0.07], [lean, 0, lean]);
    for (let k = 0; k < 3; k++) {
      b.add(U.sph0, pick(['#6fa34a', '#5f9440', '#7db556']),
        [x + rand(-0.5, 0.5), h - rand(0, 1.5), z + rand(-0.5, 0.5)], [rand(0.5, 0.8), 0.25, rand(0.5, 0.8)]);
    }
  }
}

function bambooFence(b) {
  for (const z of [-1.8, 0, 1.8]) b.add(U.cyl6, '#b49a5c', [0, 0.6, z], [0.06, 1.2, 0.06]);
  for (const y of [0.35, 0.7, 1.05]) b.add(U.cyl6, '#9cb75a', [0, y, 0], [0.04, 4, 0.04], [Math.PI / 2, 0, 0]);
}

function woodFence(b) {
  for (const z of [-1.9, 0, 1.9]) b.add(U.box, DARK_WOOD, [0, 0.6, z], [0.12, 1.2, 0.12]);
  for (let i = 0; i < 11; i++) b.add(U.box, '#7b583c', [0.06, 0.55, -1.75 + i * 0.35], [0.05, 1.0, 0.3]);
  b.add(U.box, DARK_WOOD, [0.08, 1.08, 0], [0.08, 0.08, 4]);
}

function lantern(b) {
  const g = '#a8a59c', g2 = '#96938a';
  b.add(U.cyl6, g2, [0, 0.1, 0], [0.35, 0.2, 0.35]);
  b.add(U.cyl6, g, [0, 0.55, 0], [0.14, 0.7, 0.14]);
  b.add(U.box, g2, [0, 0.95, 0], [0.6, 0.12, 0.6]);
  b.add(U.box, '#fff1c4', [0, 1.18, 0], [0.38, 0.34, 0.38]);
  b.add(U.cone4, g, [0, 1.5, 0], [0.55, 0.32, 0.55], [0, Math.PI / 4, 0]);
  b.add(U.sph0, g, [0, 1.72, 0], [0.09, 0.12, 0.09]);
}

function rocks(b) {
  const n = 2 + ((Math.random() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const s = rand(0.35, 0.8);
    b.add(U.sph0, pick(['#9a9a92', '#86857e', '#a7a59c']), [rand(-0.6, 0.6), s * 0.4, rand(-0.8, 0.8)],
      [s, s * 0.7, s * rand(0.8, 1.2)], [0, Math.random() * 3, 0]);
  }
}

function minka(b) {
  b.add(U.box, '#efe4c8', [0, 1.1, 0], [4.6, 2.2, 7]);
  for (const x of [-2.3, 2.3]) for (const z of [-3.5, -1.2, 1.2, 3.5]) {
    b.add(U.box, DARK_WOOD, [x, 1.1, z], [0.2, 2.2, 0.2]);
  }
  b.add(U.box, DARK_WOOD, [2.32, 1.65, 0], [0.12, 0.18, 7.05]);
  b.add(U.box, '#9b7653', [2.75, 0.3, 0], [0.9, 0.22, 6.6]);
  b.add(U.box, '#f8f3e3', [2.34, 0.95, 0], [0.06, 1.2, 2.2]);
  for (let i = 1; i < 4; i++) b.add(U.box, DARK_WOOD, [2.38, 0.95, -1.1 + i * 0.55], [0.04, 1.2, 0.04]);
  b.add(U.box, DARK_WOOD, [2.38, 1.0, 0], [0.04, 0.04, 2.2]);
  b.add(U.roof, '#c4a265', [0, 2.2, 0], [6.4, 3.4, 8.3]);
  b.add(U.box, '#5b4a36', [0, 5.5, 0], [0.6, 0.35, 8.5]);
}

function machiya(b) {
  const wall = pick(['#ebe1cb', '#efe7d6', '#e4d7bd']);
  b.add(U.box, wall, [0, 1.9, 0], [4.5, 3.8, 6.2]);
  b.add(U.box, '#5d3f2a', [2.27, 0.95, 0], [0.08, 1.9, 6.2]);
  for (let i = 0; i < 22; i++) b.add(U.box, '#7a5638', [2.34, 0.95, -2.9 + i * 0.275], [0.05, 1.8, 0.07]);
  b.add(U.box, '#4b5363', [2.65, 2.05, 0], [1.2, 0.12, 6.6], [0, 0, -0.35]);
  b.add(U.box, '#3a2a20', [2.27, 3.0, 0], [0.06, 0.6, 3]);
  for (let i = 0; i < 10; i++) b.add(U.box, wall, [2.3, 3.0, -1.35 + i * 0.3], [0.04, 0.6, 0.08]);
  b.add(U.roof, '#4b5363', [0, 3.8, 0], [5.6, 1.6, 7]);
  b.add(U.box, '#3a404c', [0, 5.35, 0], [0.3, 0.25, 7.2]);
  b.add(U.box, pick(['#2f3f7a', '#7a2f3f', '#2f6a4a']), [2.4, 1.45, -1.5], [0.04, 0.75, 1.6]);
  b.add(U.sph, '#d8392f', [2.6, 1.55, 1.0], [0.22, 0.32, 0.22]);
  b.add(U.box, '#222', [2.6, 1.9, 1.0], [0.12, 0.06, 0.12]);
}

function pagoda(b) {
  b.add(U.box, '#b9b2a3', [0, 0.3, 0], [4.4, 0.6, 4.4]);
  for (let i = 0; i < 5; i++) {
    const w = 3.2 - i * 0.42;
    const y = 0.6 + i * 1.5;
    b.add(U.box, '#a33b2c', [0, y + 0.6, 0], [w * 0.68, 1.2, w * 0.68]);
    b.add(U.box, '#f0e6d2', [0, y + 0.25, 0], [w * 0.7, 0.12, w * 0.7]);
    b.add(U.cone4, '#3a3f4b', [0, y + 1.5, 0], [w * 1.08, 0.7, w * 1.08], [0, Math.PI / 4, 0]);
  }
  b.add(U.cyl6, '#c9a43a', [0, 9.6, 0], [0.08, 2.6, 0.08]);
  for (let i = 0; i < 4; i++) b.add(U.cyl6, '#c9a43a', [0, 9.0 + i * 0.35, 0], [0.22, 0.05, 0.22]);
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

function paddy(b) {
  const flooded = Math.random() < 0.3;
  b.add(U.box, flooded ? '#a6cfd6' : '#89b9ad', [0, 0.03, 0], [8, 0.06, 11]);
  if (!flooded) {
    for (let i = 0; i < 9; i++) {
      b.add(U.box, i % 2 ? '#86b84f' : '#7aab47', [-3.6 + i * 0.9, 0.2, 0], [0.32, 0.32, 10.4]);
    }
  }
  b.add(U.box, '#8a6b48', [0, 0.1, 5.6], [8.4, 0.2, 0.3]);
  b.add(U.box, '#8a6b48', [0, 0.1, -5.6], [8.4, 0.2, 0.3]);
  b.add(U.box, '#8a6b48', [4.1, 0.1, 0], [0.3, 0.2, 11.2]);
  b.add(U.box, '#8a6b48', [-4.1, 0.1, 0], [0.3, 0.2, 11.2]);
}

function field(b) {
  b.add(U.box, '#8b6a45', [0, 0.05, 0], [7, 0.1, 9]);
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < 8; i++) {
      b.add(U.sph0, pick(['#5f9e45', '#6fb04f', '#7dbb5a']), [-2.8 + r * 1.4, 0.25, -3.8 + i * 1.08],
        [0.4, 0.3, 0.4], [0, Math.random() * 3, 0]);
    }
  }
}

function scarecrow(b) {
  b.add(U.cyl6, '#7a5a3a', [0, 0.9, 0], [0.05, 1.8, 0.05]);
  b.add(U.box, '#7a5a3a', [0, 1.38, 0], [0.07, 0.07, 1.3]);
  b.add(U.box, '#3d5fa8', [0, 1.3, 0], [0.25, 0.55, 0.6]);
  b.add(U.sph, '#efe0c0', [0, 1.78, 0], [0.18, 0.18, 0.18]);
  b.add(U.cone8, '#d7b56a', [0, 1.98, 0], [0.42, 0.22, 0.42]);
}

function hill(b) {
  const w = rand(14, 24), h = rand(5, 10), l = rand(18, 30);
  b.add(U.sph, pick(GREENS), [0, -h * 0.25, 0], [w / 2, h, l / 2]);
  if (Math.random() < 0.6) cedar(b, rand(-2, 2), rand(-4, 4), 1.1);
}

export const DECOR = {
  sakura: { len: 4.5, w: 4.5, build: (b) => sakura(b, 1) },
  sakuraBig: { len: 6.5, w: 6.5, build: (b) => sakura(b, 1.5) },
  pine: { len: 3.5, w: 3, build: pine },
  cedar: { len: 3, w: 3, build: (b) => cedar(b) },
  cedarGroup: { len: 8, w: 7, build: cedarGroup },
  bamboo: { len: 3, w: 3, build: bamboo },
  bambooFence: { len: 4, w: 0.3, build: bambooFence },
  woodFence: { len: 4, w: 0.3, build: woodFence },
  lantern: { len: 1.4, w: 1, build: lantern },
  rocks: { len: 2.2, w: 1.6, build: rocks },
  minka: { len: 8.8, w: 6.5, face: true, build: minka },
  machiya: { len: 6.8, w: 5.6, face: true, build: machiya },
  pagoda: { len: 5, w: 5, build: pagoda },
  shrineTorii: { len: 5, w: 1, face: true, build: shrineTorii },
  paddy: { len: 11.8, w: 8.4, face: true, build: paddy },
  field: { len: 9.5, w: 7, face: true, build: field },
  scarecrow: { len: 1.6, w: 1, face: true, build: scarecrow },
  hill: { len: 26, w: 22, build: hill },
};

// Thèmes : [type, poids] par bande (null = espace vide)
export const THEMES = {
  campagne: {
    near: [['bambooFence', 2], ['rocks', 1], ['scarecrow', 0.6], ['lantern', 0.3], [null, 2]],
    mid: [['paddy', 5], ['field', 2], ['minka', 1.5], ['sakura', 1.5], ['pine', 1]],
    far: [['hill', 2], ['cedarGroup', 1.5], ['minka', 1], ['sakuraBig', 0.7]],
  },
  village: {
    near: [['woodFence', 4], ['lantern', 2], ['sakura', 0.6], [null, 0.6]],
    mid: [['machiya', 6], ['minka', 1], ['sakura', 1], ['pagoda', 0.35], ['shrineTorii', 0.5]],
    far: [['machiya', 2], ['cedarGroup', 1], ['hill', 1], ['pagoda', 0.3]],
  },
  foret: {
    near: [['bamboo', 4], ['lantern', 1], ['rocks', 1.2], [null, 1]],
    mid: [['bamboo', 3], ['sakura', 3], ['cedar', 2], ['shrineTorii', 0.8], ['pagoda', 0.3], ['pine', 1]],
    far: [['cedarGroup', 3], ['sakuraBig', 1], ['hill', 1]],
  },
};
export const THEME_ORDER = ['campagne', 'village', 'foret', 'campagne', 'village'];
export const THEME_LEN = 420;

export function weighted(list) {
  let total = 0;
  for (const [, w] of list) total += w;
  let r = Math.random() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

// Pré-construit quelques variantes par type
export function prebuildDecor() {
  for (const d of Object.values(DECOR)) {
    d.geos = [0, 1, 2].map(() => { const b = new Builder(); d.build(b); return b.build(); });
  }
  const b = new Builder();
  bigTorii(b);
  return { bigTorii: b.build() };
}
