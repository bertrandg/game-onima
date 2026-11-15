import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { U } from '../../geo.js';

// Façades des boutiques du centre commercial, dans le repère de la boutique de gauche (vitrine tournée
// vers +x, en x = -5,6 ; module de 7,8 m le long de z). Sept styles : pierre (marbre et liseré doré),
// bois (chêne et menuiseries noires), lattes (bois sombre et laiton), brique (brique blanchie, verrières
// d'atelier et lampes col-de-cygne), store (store rayé à lambrequin), néon (panneaux sombres cernés de
// lumière) et blocs (gros cubes de couleur pour les jouets). Les parements sont texturés à partir de
// photos de Poly Haven (models/mall/facades.jpg, une planche de 2 × 2 matières) ; menuiseries, stores et
// lumières sont en couleurs unies. Enseigne : lettres lumineuses posées sur le parement, ou caisson ; et
// une enseigne-drapeau perpendiculaire, lisible depuis la galerie.

const FX = -5.6;                 // plan de la vitrine
const FY = 4.0;                  // bas du bandeau de l'enseigne
const TOP_Y = 6.0;               // plafond de la galerie
const EDGE = 3.78;               // bord de la façade (le pilastre commun est en z = ±3,9)
const PIER = 0.5;                // largeur des trumeaux de chaque côté
const GZ = EDGE - PIER;          // demi-largeur vitrée
const DOOR = 1.2;                // demi-largeur de l'entrée

// ---------- Planche des parements ----------
// tuiles de la planche (u0, v0 en bas à gauche, taille 0,5) et taille réelle d'une répétition (m)
export const CLAD = {
  stone: { tile: [0, 0.5], size: 1.5 },
  wood: { tile: [0.5, 0.5], size: 1.2 },
  slats: { tile: [0, 0], size: 1.1 },
  brick: { tile: [0.5, 0], size: 1.3 },
};
const INSET = 3 / 1024;   // marge dans la tuile (pas de bavure de la tuile voisine)

export function facadeTexture() {
  const t = new THREE.TextureLoader().load(new URL('../../../models/mall/facades.jpg', import.meta.url).href);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const _c = new THREE.Color();
// Parements texturés : boîtes dont chaque face est découpée aux limites de répétition de la texture
// (les coordonnées absolues servent d'origine : le motif se prolonge d'une pièce à l'autre)
export class CladBuilder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }

  // face plane : origine o, axes unitaires a (largeur) et b (hauteur), étendues [a0, a1] × [b0, b1], normale n
  face(clad, o, a, b, n, a0, a1, b0, b1, color) {
    const { tile, size } = CLAD[clad];
    _c.set(color);
    const cuts = (x0, x1) => {
      const out = [x0];
      for (let k = Math.floor(x0 / size) + 1; k * size < x1 - 1e-6; k++) out.push(k * size);
      out.push(x1);
      return out;
    };
    const ca = cuts(a0, a1), cb = cuts(b0, b1);
    const flip = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...b)).dot(new THREE.Vector3(...n)) < 0;
    const P = (s, t) => [o[0] + a[0] * s + b[0] * t, o[1] + a[1] * s + b[1] * t, o[2] + a[2] * s + b[2] * t];
    const span = 0.5 - 2 * INSET;
    for (let i = 0; i < ca.length - 1; i++) for (let j = 0; j < cb.length - 1; j++) {
      const s0 = ca[i], s1 = ca[i + 1], t0 = cb[j], t1 = cb[j + 1];
      const ks = Math.floor((s0 + s1) / 2 / size), kt = Math.floor((t0 + t1) / 2 / size);
      const u = (s) => tile[0] + INSET + (s / size - ks) * span, v = (t) => tile[1] + INSET + (t / size - kt) * span;
      let q = [[s0, t0], [s1, t0], [s1, t1], [s0, t0], [s1, t1], [s0, t1]];
      if (flip) q = [q[0], q[2], q[1], q[3], q[5], q[4]];
      for (const [s, t] of q) {
        this.pos.push(...P(s, t));
        this.nor.push(...n);
        this.uv.push(u(s), v(t));
        this.col.push(_c.r, _c.g, _c.b);
      }
    }
    return this;
  }

  // boîte alignée sur les axes, de (x0, y0, z0) à (x1, y1, z1) ; faces cachées (dos, dessous) omises
  box(clad, [x0, y0, z0], [x1, y1, z1], color = '#ffffff', { top = true, bottom = false } = {}) {
    this.face(clad, [x1, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], z0, z1, y0, y1, color);     // face à la galerie
    this.face(clad, [0, 0, z1], [1, 0, 0], [0, 1, 0], [0, 0, 1], x0, x1, y0, y1, color);     // côtés
    this.face(clad, [0, 0, z0], [1, 0, 0], [0, 1, 0], [0, 0, -1], x0, x1, y0, y1, color);
    if (top) this.face(clad, [0, y1, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0], z0, z1, x0, x1, color);
    if (bottom) this.face(clad, [0, y0, 0], [0, 0, 1], [1, 0, 0], [0, -1, 0], z0, z1, x0, x1, color);
    return this;
  }

  build() {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}
export const mergeClad = (geos) => mergeGeometries(geos.filter(Boolean), false);

// ---------- Outils ----------
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const lum = (c) => { _c.set(c); return 0.2126 * _c.r + 0.7152 * _c.g + 0.0722 * _c.b; };

// cadre d'un panneau vertical (dans le plan x) : 4 baguettes
function frame(F, color, x, z0, z1, y0, y1, w = 0.07, d = 0.08) {
  F.add(U.box, color, [x, y0 + w / 2, (z0 + z1) / 2], [d, w, z1 - z0]);
  F.add(U.box, color, [x, y1 - w / 2, (z0 + z1) / 2], [d, w, z1 - z0]);
  F.add(U.box, color, [x, (y0 + y1) / 2, z0 + w / 2], [d, y1 - y0, w]);
  F.add(U.box, color, [x, (y0 + y1) / 2, z1 - w / 2], [d, y1 - y0, w]);
}

// reflets en biais sur une vitre
function glints(G, z0, z1, y0, y1) {
  const w = z1 - z0, h = y1 - y0;
  for (const [t, len, th] of [[0.3, 0.55, 0.05], [0.72, 0.4, 0.035]]) {
    const L = Math.min(w, h) * len * 1.4;
    G.add(U.box, '#eef8ff', [FX - 0.12, y0 + h * (0.35 + 0.3 * t), z0 + w * t], [0.01, L, th], [Math.PI / 4, 0, 0]);
  }
}

// vitrines, entrée (portes coulissantes entrouvertes) et menuiseries, communes à tous les styles
function shopfront(F, G, s, metal, { grid = false, riser = s.bg, lip = true } = {}) {
  const VB = 0.38, VT = FY - 0.06;   // allège des vitrines, haut des menuiseries
  for (const sz of [-1, 1]) {
    const z0 = sz < 0 ? -GZ : DOOR, z1 = sz < 0 ? -DOOR : GZ;
    F.add(U.box, riser, [FX - 0.12, VB / 2, (z0 + z1) / 2], [0.26, VB, z1 - z0]);   // allège
    frame(F, metal, FX - 0.12, z0, z1, VB, VT);
    F.add(U.box, metal, [FX - 0.12, 3.1, (z0 + z1) / 2], [0.08, 0.06, z1 - z0]);   // imposte
    if (grid) {   // verrière d'atelier : petits carreaux
      for (let k = 1; k < 3; k++) F.add(U.box, metal, [FX - 0.12, (VB + 3.1) / 2, z0 + (z1 - z0) * k / 3], [0.06, 3.1 - VB, 0.04]);
      F.add(U.box, metal, [FX - 0.12, 1.7, (z0 + z1) / 2], [0.06, 0.04, z1 - z0]);
      for (let k = 1; k < 4; k++) F.add(U.box, metal, [FX - 0.12, 3.1 + (VT - 3.1) * k / 4, (z0 + z1) / 2], [0.05, 0.03, z1 - z0]);
    }
    glints(G, z0 + 0.1, z1 - 0.1, VB + 0.2, 3.0);
  }
  // entrée : seuil, imposte et deux vantaux coulissants entrouverts
  F.add(U.box, mix(metal, '#ffffff', 0.4), [FX - 0.1, 0.012, 0], [0.5, 0.024, DOOR * 2]);
  frame(F, metal, FX - 0.12, -DOOR, DOOR, 3.1, VT);
  for (const sz of [-1, 1]) {
    const zc = sz * (DOOR - 0.45);
    frame(F, metal, FX - 0.2, zc - 0.42, zc + 0.42, 0.02, 3.06, 0.05, 0.05);
    F.add(U.box, '#d8dce4', [FX - 0.14, 1.1, zc - sz * 0.32], [0.04, 0.7, 0.04]);   // poignée
  }
  if (lip) F.add(U.box, metal, [FX - 0.02, FY - 0.03, 0], [0.16, 0.06, 2 * EDGE]);   // larmier sous l'enseigne
}

// lettres lumineuses (sur le parement) ou caisson d'enseigne
function signLetters(T, uvL, y = 5.0, dx = 0.14) { T.quad('sign', [FX + dx, y, 0], [5.6, 1.05], uvL); }
function signBox(F, T, s, uvS, { y = 5.0, w = 5.6, h = 1.15, bg = s.bg } = {}) {
  F.add(U.box, bg, [FX + 0.16, y, 0], [0.12, h + 0.14, w + 0.14]);
  T.quad('sign', [FX + 0.24, y, 0], [w, h], uvS);
}

// enseigne-drapeau perpendiculaire à la façade (pastille ronde, des deux côtés)
function blade(F, T, s, uvB, metal) {
  const z = EDGE - 0.35, y = 4.55, x = FX + 0.95;
  F.add(U.box, metal, [FX + 0.55, y + 0.62, z], [1.1, 0.06, 0.06]);   // potence
  F.add(U.box, metal, [FX + 0.06, y + 0.62, z], [0.1, 0.3, 0.14]);
  for (const dx of [-0.25, 0.25]) F.add(U.box, metal, [x + dx, y + 0.53, z], [0.02, 0.16, 0.02]);
  F.add(U.cyl, s.fg, [x, y, z], [0.5, 0.08, 0.5], [Math.PI / 2, 0, 0]);
  F.add(U.cyl, s.bg, [x, y, z], [0.45, 0.1, 0.45], [Math.PI / 2, 0, 0]);
  T.quad('sign', [x, y, z + 0.052], [0.86, 0.86], uvB, '#ffffff', 0);
  T.quad('sign', [x, y, z - 0.052], [0.86, 0.86], uvB, '#ffffff', Math.PI);
}

// petites appliques (cônes lumineux) sous le bandeau
function downlights(F, G, metal, n = 3, y = FY - 0.06) {
  for (let k = 0; k < n; k++) {
    const z = -GZ + 0.6 + k * (2 * GZ - 1.2) / (n - 1);
    F.add(U.cyl6, metal, [FX + 0.12, y - 0.03, z], [0.08, 0.06, 0.08]);
    G.add(U.cyl6, '#fff4d0', [FX + 0.12, y - 0.065, z], [0.06, 0.01, 0.06]);
  }
}

// ---------- Les sept styles ----------
// C = parements texturés, F = facettes colorées, G = parties lumineuses, T = textes (atlas)
const STYLES = {
  stone(C, F, G, T, s, uv) {
    const tint = mix('#ffffff', s.bg, 0.18), gold = '#d8b04a';
    C.box('stone', [FX - 0.3, 0, -EDGE], [FX + 0.1, FY, -GZ], tint).box('stone', [FX - 0.3, 0, GZ], [FX + 0.1, FY, EDGE], tint);
    C.box('stone', [FX - 0.3, FY, -EDGE], [FX + 0.12, TOP_Y, EDGE], tint);
    for (const z of [-GZ, GZ]) F.add(U.box, gold, [FX + 0.11, FY / 2, z], [0.04, FY, 0.05]);   // joncs dorés
    F.add(U.box, gold, [FX + 0.13, FY + 0.12, 0], [0.04, 0.05, 2 * EDGE]);
    F.add(U.box, gold, [FX + 0.13, TOP_Y - 0.2, 0], [0.04, 0.05, 2 * EDGE]);
    shopfront(F, G, s, gold, { riser: mix(s.bg, '#ffffff', 0.3) });
    downlights(F, G, gold, 4);
    signLetters(T, uv.letters);
    blade(F, T, s, uv.blade, gold);
  },
  wood(C, F, G, T, s, uv) {
    const black = '#22201e';
    C.box('wood', [FX - 0.3, 0, -EDGE], [FX + 0.08, FY, -GZ]).box('wood', [FX - 0.3, 0, GZ], [FX + 0.08, FY, EDGE]);
    C.box('wood', [FX - 0.3, FY, -EDGE], [FX + 0.1, TOP_Y, EDGE]);
    F.add(U.box, black, [FX + 0.11, FY + 0.05, 0], [0.04, 0.1, 2 * EDGE]);
    shopfront(F, G, s, black, { riser: '#3a3430' });
    for (const z of [-EDGE + 0.25, EDGE - 0.25]) {   // jardinières au pied des trumeaux
      F.add(U.box, black, [FX + 0.32, 0.25, z], [0.4, 0.5, 0.4]);
      for (let k = 0; k < 3; k++) F.add(U.sph0, ['#3f8f3a', '#4ea544', '#2f7a3a'][k], [FX + 0.32 + (k - 1) * 0.08, 0.62 + (k % 2) * 0.12, z + (k - 1) * 0.07], [0.2, 0.22, 0.2]);
    }
    signBox(F, T, s, uv.shop, { bg: black, w: 5.2, h: 1.0 });
    downlights(F, G, black, 3);
    blade(F, T, s, uv.blade, black);
  },
  slats(C, F, G, T, s, uv) {
    const brass = '#c8a060';
    C.box('slats', [FX - 0.3, 0, -EDGE], [FX + 0.1, TOP_Y, -GZ]).box('slats', [FX - 0.3, 0, GZ], [FX + 0.1, TOP_Y, EDGE]);
    C.box('slats', [FX - 0.3, FY, -GZ], [FX + 0.1, TOP_Y, GZ]);
    shopfront(F, G, s, brass, { riser: '#2a1e18' });
    G.add(U.box, '#ffe0a8', [FX + 0.06, FY - 0.08, 0], [0.04, 0.03, 2 * GZ - 0.2]);   // ruban de lumière chaude
    F.add(U.box, brass, [FX + 0.12, 5.0, 0], [0.04, 1.4, 5.9]);
    F.add(U.box, '#2a1e18', [FX + 0.13, 5.0, 0], [0.04, 1.3, 5.8]);
    signLetters(T, uv.letters, 5.0, 0.18);
    blade(F, T, s, uv.blade, brass);
  },
  brick(C, F, G, T, s, uv) {
    const steel = '#1e2226', tint = mix('#ffffff', s.bg, 0.1);
    C.box('brick', [FX - 0.3, 0, -EDGE], [FX + 0.1, TOP_Y, -GZ], tint).box('brick', [FX - 0.3, 0, GZ], [FX + 0.1, TOP_Y, EDGE], tint);
    C.box('brick', [FX - 0.3, FY, -GZ], [FX + 0.1, TOP_Y, GZ], tint);
    shopfront(F, G, s, steel, { grid: true, riser: steel });
    signLetters(T, uv.letters, 5.05);
    for (let k = 0; k < 3; k++) {   // lampes col-de-cygne au-dessus de l'enseigne
      const z = -2.2 + k * 2.2;
      F.add(U.box, steel, [FX + 0.35, 5.85, z], [0.6, 0.04, 0.04]);
      F.add(U.cone8, steel, [FX + 0.68, 5.72, z], [0.16, 0.2, 0.16]);
      G.add(U.cyl6, '#fff2c8', [FX + 0.68, 5.615, z], [0.13, 0.01, 0.13]);
    }
    blade(F, T, s, uv.blade, steel);
  },
  awning(C, F, G, T, s, uv) {
    const paint = mix(s.bg, '#ffffff', 0.15), white = '#fbf8f2', trim = mix(s.bg, '#000000', 0.25);
    for (const sz of [-1, 1]) F.add(U.box, paint, [FX - 0.1, FY / 2, sz * (GZ + PIER / 2)], [0.4, FY, PIER]);
    F.add(U.box, paint, [FX - 0.09, (FY + TOP_Y) / 2, 0], [0.42, TOP_Y - FY, 2 * EDGE]);
    for (const sz of [-1, 1]) F.add(U.box, white, [FX + 0.12, 0.3, sz * (GZ + PIER / 2)], [0.04, 0.6, PIER - 0.1]);
    shopfront(F, G, s, white, { riser: trim, lip: false });
    signBox(F, T, s, uv.shop, { y: 5.15, w: 5.0, h: 0.95, bg: white });
    // store rayé, incliné vers la galerie, et son lambrequin festonné
    const n = 14, w = (2 * EDGE) / n, ang = 0.55, L = 1.15;
    for (let k = 0; k < n; k++) {
      const z = -EDGE + (k + 0.5) * w, c = k % 2 ? white : s.bg;
      F.add(U.box, c, [FX + 0.12 + Math.sin(ang) * L / 2, FY - Math.cos(ang) * L / 2 + 0.25, z], [0.03, L, w], [0, 0, ang]);
      F.add(U.box, c, [FX + 0.14 + Math.sin(ang) * L, FY - Math.cos(ang) * L + 0.12 - (k % 2) * 0.05, z], [0.03, 0.26 - (k % 2) * 0.1, w]);   // lambrequin
    }
    F.add(U.box, c2(s), [FX + 0.14 + Math.sin(ang) * L, FY - Math.cos(ang) * L + 0.27, 0], [0.04, 0.05, 2 * EDGE]);
    blade(F, T, s, uv.blade, trim);
  },
  neon(C, F, G, T, s, uv) {
    const dark = '#1a1a26', panel = '#2a2a3a';
    for (const sz of [-1, 1]) F.add(U.box, panel, [FX - 0.1, TOP_Y / 2, sz * (GZ + PIER / 2)], [0.4, TOP_Y, PIER]);
    F.add(U.box, dark, [FX - 0.09, (FY + TOP_Y) / 2, 0], [0.42, TOP_Y - FY, 2 * GZ]);
    for (const sz of [-1, 1]) for (let k = 1; k < 5; k++) F.add(U.box, '#3a3a4e', [FX + 0.11, k * 1.2, sz * (GZ + PIER / 2)], [0.02, 0.03, PIER]);
    shopfront(F, G, s, '#3a3a4a', { riser: dark });
    // néons : contour de la vitrine et de l'enseigne
    const neon = s.fg === '#ffffff' ? s.bg : s.fg;
    for (const sz of [-1, 1]) G.add(U.box, neon, [FX + 0.13, FY / 2, sz * (GZ + 0.04)], [0.03, FY, 0.05]);
    G.add(U.box, neon, [FX + 0.13, FY + 0.06, 0], [0.03, 0.05, 2 * GZ + 0.13]);
    G.add(U.box, neon, [FX + 0.13, TOP_Y - 0.12, 0], [0.03, 0.05, 2 * GZ + 0.13]);
    signLetters(T, uv.letters, 5.0, 0.15);
    blade(F, T, s, uv.blade, '#3a3a4a');
  },
  blocks(C, F, G, T, s, uv) {
    const cols = ['#ff6a8a', '#ffd23f', '#5ac8fa', '#7ae07a', '#b07aff', '#ff9a3a'];
    let k = (s.name.length * 7) % 6;
    for (const sz of [-1, 1]) {   // trumeaux en cubes empilés
      const zc = sz * (GZ + PIER / 2);
      for (let y = 0; y < FY - 0.01; y += 1) F.add(U.box, cols[(k++) % 6], [FX - 0.08 + ((k % 2) * 0.06), y + 0.5, zc], [0.44, 0.98, PIER - 0.02 - (k % 2) * 0.06]);
    }
    F.add(U.box, s.bg, [FX - 0.09, (FY + TOP_Y) / 2, 0], [0.42, TOP_Y - FY, 2 * EDGE]);
    for (let i = 0; i < 8; i++) F.add(U.sph0, cols[(k + i) % 6], [FX + 0.14, FY + 0.18, -EDGE + 0.5 + i * (2 * EDGE - 1) / 7], [0.14, 0.14, 0.14]);   // perles
    shopfront(F, G, s, '#ffffff', { riser: cols[k % 6], lip: false });
    signBox(F, T, s, uv.shop, { y: 5.15, w: 5.0, h: 1.0, bg: '#ffffff' });
    blade(F, T, s, uv.blade, '#ffffff');
  },
};
const c2 = (s) => (lum(s.bg) > 0.6 ? mix(s.bg, '#000000', 0.3) : mix(s.bg, '#ffffff', 0.5));

// façade d'une boutique ; uv = { shop, letters, blade } dans l'atlas des textes
export function buildFacade(C, F, G, T, s, uv) {
  (STYLES[s.style] || STYLES.stone)(C, F, G, T, s, uv);
}

// couleur des lettres posées sur un parement : celle de la boutique qui se détache le mieux
export function letterColors(s) {
  const base = { stone: '#f2ece4', wood: '#a87a50', slats: '#4a2a1a', brick: '#ece8e4', neon: '#1a1a26' }[s.style] || '#ffffff';
  const L = lum(base);
  const cand = [s.fg, s.bg, '#ffffff', '#2a2420'];
  const fill = cand.reduce((a, b) => (Math.abs(lum(b) - L) > Math.abs(lum(a) - L) + 0.08 ? b : a));
  return { fill, edge: lum(fill) > 0.5 ? 'rgba(40,30,30,0.85)' : 'rgba(255,255,255,0.9)' };
}
