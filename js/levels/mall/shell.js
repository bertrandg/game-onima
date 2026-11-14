import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, U, vcMat } from '../../geo.js';
import { LANES } from '../../config.js';
import { FLOORS } from './themes.js';
import { FLOOR_H, SLAB, CEIL, MOD, LANE_HX, WALK_X, ROOF_Y, TOP } from './dims.js';
import { shopGeos, plaqueGeo, atlasTexture, SHOP_W, FRONT_X } from './shops.js';

// Les étages du centre commercial : dalles (sol carrelé dessus, plafond et luminaires dessous), boutiques
// des deux côtés de la galerie et, au dernier étage, la verrière. Tout est en maillages instanciés (un
// appel de dessin par matière et par modèle, quelle que soit la longueur de galerie affichée) : à chaque
// pas de module, les instances proches du joueur sont réécrites. Les trémies des escalators sont des
// modules de dalle manquants.

const BEHIND = 25, AHEAD = 170;
const N_LANE = Math.ceil((BEHIND + AHEAD) / MOD) + 2;
// les boutiques sont regroupées par rangées de six (deux ordres différents), une instance par rangée
const ORDERS = [[0, 1, 2, 3, 4, 5], [3, 5, 1, 4, 0, 2]];
const BLOCK = 6 * SHOP_W;
const N_BLOCK = Math.ceil((BEHIND + AHEAD) / BLOCK) + 1;
const hash = (n) => { const x = Math.sin(n * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };

const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });

// carrelage : damier de dalles de 1,3 m (deux tons de gris clair veinés), teinté par la couleur de l'étage
function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? '#e4e4e4' : '#ffffff';
    g.fillRect(i * 128, j * 128, 128, 128);
  }
  g.strokeStyle = 'rgba(150,150,150,0.16)'; g.lineWidth = 2;   // veines du marbre
  for (let k = 0; k < 9; k++) {
    g.beginPath();
    let x = (k * 53) % 256, y = (k * 97) % 256;
    g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { x += 18 + ((k * 7 + s * 13) % 20); y += ((k + s) % 3 - 1) * 16; g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = '#b4b4b4';   // joints
  for (const p of [0, 127]) { g.fillRect(p, 0, 2, 256); g.fillRect(0, p, 256, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// carré horizontal (x0..x1, z0..z1) à la hauteur y ; up = face vers le haut ; uv selon x et z (2,6 m par répétition)
function quad(x0, x1, z0, z1, y, up, color) {
  const pos = up ? [x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0]
    : [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = [], nor = [], col = [];
  const c = new THREE.Color(color);
  for (let i = 0; i < 6; i++) {
    uv.push(pos[i * 3] / 2.6 + 0.5, -pos[i * 3 + 2] / 2.6);
    nor.push(0, up ? 1 : -1, 0);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
const merge = (geos) => {
  const b = new Builder();
  b.parts.push(...geos.map((g) => { const x = g.clone(); x.deleteAttribute('uv'); return x; }));
  return b.build();
};

// module de dalle d'une voie (centré, MOD de long) : dessus carrelé, dessous = plafond de l'étage du dessous
function laneGeos(f) {
  const F = FLOORS[f], below = FLOORS[Math.max(0, f - 1)];
  const top = quad(-LANE_HX, LANE_HX, -MOD / 2, MOD / 2, 0, true, F.tile);
  if (f === 0) return { top };
  const b = new Builder();
  b.parts.push(merge([quad(-LANE_HX, LANE_HX, -MOD / 2, MOD / 2, -SLAB, false, below.ceil)]));
  b.add(U.box, '#d8d4cc', [0, -SLAB - 0.03, 0], [1.5, 0.06, 1.5]);   // cadre du luminaire
  const g = new Builder();
  g.add(U.box, '#fffaf0', [0, -SLAB - 0.065, 0], [1.3, 0.02, 1.3]);
  return { top, bottom: b.build(), light: g.build() };
}

// galeries devant les boutiques, des deux côtés (de WALK_X à FRONT_X), MOD de long
function walkGeos(f) {
  const F = FLOORS[f], below = FLOORS[Math.max(0, f - 1)];
  const tops = [];
  for (const s of [-1, 1]) tops.push(quad(s < 0 ? -FRONT_X : WALK_X, s < 0 ? -WALK_X : FRONT_X, -MOD / 2, MOD / 2, 0, true, F.tile));
  const top = new Builder();
  top.parts.push(...tops);
  const topGeo = top.build();
  if (f === 0) return { top: topGeo };
  const b = new Builder(), g = new Builder();
  for (const s of [-1, 1]) {
    b.parts.push(merge([quad(s < 0 ? -FRONT_X : WALK_X, s < 0 ? -WALK_X : FRONT_X, -MOD / 2, MOD / 2, -SLAB, false, below.ceil)]));
    b.add(U.box, below.accent, [s * (WALK_X + 0.05), -SLAB - 0.15, 0], [0.1, 0.3, MOD]);   // retombée colorée au bord des voies
    g.add(U.box, '#fff6e0', [s * 4.8, -SLAB - 0.02, 0], [0.18, 0.03, MOD - 0.3]);          // bandeau lumineux
  }
  return { top: topGeo, bottom: b.build(), light: g.build() };
}

// verrière du dernier étage (MOD de long) : murs au-dessus des boutiques, poutres, ciel lumineux, guirlandes
function roofGeos() {
  const F = FLOORS[TOP];
  const b = new Builder(), g = new Builder();
  for (const s of [-1, 1]) {
    b.add(U.box, '#fff0f6', [s * (FRONT_X + 0.1), (CEIL + ROOF_Y) / 2, 0], [0.2, ROOF_Y - CEIL, MOD]);
    b.add(U.box, F.accent, [s * (FRONT_X - 0.02), CEIL + 0.1, 0], [0.12, 0.2, MOD]);
  }
  b.add(U.box, '#ffffff', [0, ROOF_Y - 0.1, 0], [FRONT_X * 2, 0.2, 0.25]);   // poutre transversale
  for (const x of [-2.6, 0, 2.6]) b.add(U.box, '#ffffff', [x, ROOF_Y - 0.08, 0], [0.16, 0.16, MOD]);
  g.add(U.box, '#c8ecff', [0, ROOF_Y + 0.02, 0], [FRONT_X * 2, 0.02, MOD]);
  // guirlande de lampions pastel au-dessus de chaque voie
  for (const x of LANES) for (let k = 0; k < 4; k++) g.add(U.sph0, ['#ffb0d0', '#fff0a0', '#b0e8ff', '#c8ffc0'][(k + (x > 0 ? 2 : 0)) % 4], [x, 7.2 - Math.sin((k + 0.5) / 4 * Math.PI) * 0.35, -MOD / 2 + (k + 0.5) * (MOD / 4)], [0.14, 0.14, 0.14]);
  for (const x of LANES) b.add(U.box, '#e8e4dc', [x, 7.1, 0], [0.01, 0.01, MOD]);
  return { flat: b.build(), glow: g.build() };
}

// une rangée de six boutiques (côté gauche, de z = 0 à -BLOCK) : facettes, lumières, enseignes et plaques
function blockGeos(f, order) {
  const shops = order.map((i) => shopGeos(f, i));
  const at = (g, j) => g.clone().translate(0, 0, -(j + 0.5) * SHOP_W);
  const plaque = plaqueGeo(f);
  const out = {
    flat: mergeGeometries(shops.map((s, j) => at(s.flat, j)), false),
    glow: mergeGeometries(shops.map((s, j) => at(s.glow, j)), false),
    sign: mergeGeometries([...shops.flatMap((s, j) => s.sign.map((t) => at(t.geo, j))), at(plaque, 0), at(plaque, 3)], false),
  };
  for (const s of shops) { s.flat.dispose(); s.glow.dispose(); s.sign.forEach((t) => t.geo.dispose()); }
  return out;
}

function inst(group, geo, mat, n) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.count = 0;
  m.frustumCulled = false;
  group.add(m);
  return m;
}

export class MallShell {
  constructor(root) {
    this.tileMat = new THREE.MeshLambertMaterial({ map: tileTexture(), vertexColors: true });
    this.signMat = new THREE.MeshBasicMaterial({ map: atlasTexture(), vertexColors: true });
    this.floors = FLOORS.map((F, f) => {
      const slab = new THREE.Group(), shops = new THREE.Group();
      slab.position.y = shops.position.y = f * FLOOR_H;
      root.add(slab, shops);
      const lg = laneGeos(f), wg = walkGeos(f);
      const L = {
        slab, shops,
        lane: [inst(slab, lg.top, this.tileMat, N_LANE * 3)],
        walk: [inst(slab, wg.top, this.tileMat, N_LANE)],
        blocks: [],
        key: null,
      };
      if (lg.bottom) {
        L.lane.push(inst(slab, lg.bottom, vcMat, N_LANE * 3), inst(slab, lg.light, GLOW, N_LANE * 3));
        L.walk.push(inst(slab, wg.bottom, vcMat, N_LANE), inst(slab, wg.light, GLOW, N_LANE));
      }
      for (const order of ORDERS) {
        const g = blockGeos(f, order);
        L.blocks.push([g.flat, g.glow, g.sign].map((geo, i) => inst(shops, geo, [vcMat, GLOW, this.signMat][i], (N_BLOCK + 2) * 2)));
      }
      if (f === TOP) {
        const r = roofGeos();
        L.roof = [inst(shops, r.flat, vcMat, N_LANE), inst(shops, r.glow, GLOW, N_LANE)];
      }
      return L;
    });
  }

  // rangée de boutiques (ordre 0 ou 1) du bloc k, côté s
  static order(f, k, s) { return hash(k * 7 + f * 131 + (s > 0 ? 3 : 0)) < 0.5 ? 0 : 1; }

  // réécrit les instances d'un étage autour de pz ; holes(l, zc) dit si la dalle manque à cet endroit
  // ahead : longueur affichée devant (moins pour les étages voisins, vus par les trémies)
  place(f, pz, holes, version, ahead = AHEAD, shopAhead = ahead) {
    const L = this.floors[f];
    const k0 = Math.floor(-(pz + BEHIND) / MOD), j0 = Math.floor(-(pz + BEHIND) / BLOCK);
    const nL = Math.min(N_LANE, Math.ceil((BEHIND + ahead) / MOD) + 2), nB = Math.min(N_BLOCK, Math.ceil((BEHIND + shopAhead) / BLOCK) + 1);
    const key = k0 + ':' + j0 + ':' + version + ':' + ahead + ':' + shopAhead;
    if (L.key === key) return;
    L.key = key;
    const m = new THREE.Matrix4();
    // dalles
    let nl = 0, nw = 0;
    for (let k = k0; k < k0 + nL; k++) {
      const zc = -(k + 0.5) * MOD;
      m.makeTranslation(0, 0, zc);
      for (const x of L.walk) x.setMatrixAt(nw, m);
      nw++;
      for (let l = 0; l < 3; l++) {
        if (holes(l, zc)) continue;
        m.makeTranslation(LANES[l], 0, zc);
        for (const x of L.lane) x.setMatrixAt(nl, m);
        nl++;
      }
    }
    for (const x of L.lane) { x.count = nl; x.instanceMatrix.needsUpdate = true; }
    for (const x of L.walk) { x.count = nw; x.instanceMatrix.needsUpdate = true; }
    if (L.roof) {
      for (let i = 0; i < nw; i++) { m.makeTranslation(0, 0, -(k0 + i + 0.5) * MOD); for (const x of L.roof) x.setMatrixAt(i, m); }
      for (const x of L.roof) { x.count = nw; x.instanceMatrix.needsUpdate = true; }
    }
    // boutiques : côté gauche tel quel, côté droit tourné d'un demi-tour et décalé de trois boutiques
    const counts = [0, 0];
    const rot = new THREE.Matrix4().makeRotationY(Math.PI);
    for (let j = j0 - 1; j < j0 + nB; j++) {
      for (const s of [-1, 1]) {
        const z = -j * BLOCK - (s > 0 ? BLOCK / 2 : 0);
        const v = MallShell.order(f, j, s);
        // à droite, la rangée tournée part de z + BLOCK
        if (s < 0) m.makeTranslation(0, 0, z); else m.copy(rot).setPosition(0, 0, z - BLOCK);
        for (const x of L.blocks[v]) x.setMatrixAt(counts[v], m);
        counts[v]++;
      }
    }
    L.blocks.forEach((ms, v) => { for (const x of ms) { x.count = counts[v]; x.instanceMatrix.needsUpdate = true; } });
  }

  // étages affichés : slabs = dalles (sol et plafonds), shops = boutiques
  show(slabs, shops) {
    this.floors.forEach((L, f) => {
      L.slab.visible = slabs.has(f);
      L.shops.visible = shops.has(f);
    });
  }
}
