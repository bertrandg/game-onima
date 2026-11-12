import * as THREE from 'three';
import { Scenery, makeMist, makeSunGlow, hash, smooth } from '../../scenery.js';

// Lointain de l'Égypte : ciel doré de fin d'après-midi, pyramides de Gizeh au bout de l'avenue (face au
// soleil dorée, face à l'ombre rosée, pointe de calcaire blanc), dunes en couches qui se fondent dans la brume.
export const SKY = {
  top: '#5f8ee0',
  mid: '#b8c4ec',
  pink: '#ffc8a8',
  horizon: '#ffd494',
  low: '#ffe4b0',
  mist: '#f6d2a0',
  sun: '#fff0b8',
};
export const FOG_COLOR = SKY.horizon;
const SUN_DIR = new THREE.Vector3(0.45, 0.12, -1).normalize();

// ---------- Pyramides ----------
// [x, z, demi-base, hauteur] : Khéops, Khéphren (avec son revêtement intact au sommet), Mykérinos
const PYRAMIDS = [[-150, -820, 120, 150], [40, -960, 112, 146], [190, -880, 58, 70], [-300, -760, 22, 26], [-270, -740, 18, 21]];
function makePyramids() {
  const pos = [], col = [];
  const mist = new THREE.Color(SKY.mist), sunC = new THREE.Color('#f6c47a'), shadeC = new THREE.Color('#d8a088');
  const cap = new THREE.Color('#fff2d8'), c = new THREE.Color();
  const sun = new THREE.Vector3(SUN_DIR.x, 0.6, SUN_DIR.z).normalize();
  PYRAMIDS.forEach(([x, z, r, h], k) => {
    const base = -30;
    const corners = [[-r, -r], [r, -r], [r, r], [-r, r]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      const n = new THREE.Vector3((ax + bx) / 2, r * 0.7, (az + bz) / 2).normalize();
      const lit = Math.max(0, n.dot(sun));
      // assises de pierre : bandes horizontales légèrement plus sombres
      const rows = 14;
      for (let j = 0; j < rows; j++) {
        const t0 = j / rows, t1 = (j + 1) / rows;
        const y0 = base + (h - base) * t0, y1 = base + (h - base) * t1;
        const k0 = 1 - t0, k1 = 1 - t1;
        const quad = [[ax * k0, y0, az * k0], [bx * k0, y0, bz * k0], [bx * k1, y1, bz * k1], [ax * k1, y1, az * k1]];
        c.copy(shadeC).lerp(sunC, lit);
        if (j % 2) c.multiplyScalar(0.95);
        const top = k === 1 && t0 > 0.8;   // revêtement de Khéphren
        if (top) c.lerp(cap, 0.7);
        const low = c.clone().lerp(mist, 0.55 * (1 - t0)), high = c.clone().lerp(mist, 0.55 * (1 - t1));
        for (const v of [0, 1, 2, 0, 2, 3]) {
          const q = quad[v];
          pos.push(x + q[0], q[1], z + q[2]);
          const cc = v < 2 ? low : high;
          col.push(cc.r, cc.g, cc.b);
        }
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
}

// ---------- Dunes ----------
function makeDunes() {
  const group = new THREE.Group();
  const mist = new THREE.Color(SKY.mist);
  const layers = [
    { r: 860, base: 10, amp: 34, color: '#e8b880', seed: 2 },
    { r: 680, base: 4, amp: 26, color: '#e2aa70', seed: 5 },
    { r: 520, base: -4, amp: 18, color: '#d89a62', seed: 9 },
  ];
  for (const L of layers) {
    const N = Math.round((Math.PI * 2 * L.r) / 6);
    const pos = [], col = [], idx = [];
    const top = new THREE.Color(L.color), midC = top.clone().lerp(mist, 0.5);
    for (let k = 0; k <= N; k++) {
      const th = (k / N) * Math.PI * 2;
      // crêtes de dunes : sinus mélangés, plus abruptes d'un côté (le vent)
      let h = 0;
      for (let o = 0; o < 4; o++) {
        const f = 3 + o * 4 + Math.round(hash(L.seed + o) * 5), ph = hash(L.seed * 7 + o) * 6.28;
        const s = Math.sin(th * f + ph);
        h += Math.pow(Math.abs(s), 1.6) * Math.sign(s) * (1 / (o + 1));
      }
      // les pyramides se détachent : dunes plus basses dans l'axe de l'avenue
      const d = Math.abs(Math.atan2(Math.sin(th + Math.PI / 2), Math.cos(th + Math.PI / 2)));
      h = L.base + (h * 0.5 + 0.6) * L.amp * (0.35 + 0.65 * smooth(0.1, 0.6, d));
      const x = Math.cos(th) * L.r, z = Math.sin(th) * L.r;
      pos.push(x, h, z, x, h * 0.3 - 10, z, x, -60, z);
      col.push(top.r, top.g, top.b, midC.r, midC.g, midC.b, mist.r, mist.g, mist.b);
      if (k < N) {
        const p = k * 3, q = (k + 1) * 3;
        idx.push(p, p + 1, q, q, p + 1, q + 1, p + 1, p + 2, q + 1, q + 1, p + 2, q + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })));
  }
  return group;
}

export function egyptSky(root) {
  return new Scenery(root, {
    sky: SKY,
    sunDir: SUN_DIR,
    fujiCap: false,
    fireflyColors: ['#fff0b0', '#ffd27a', '#ffe8c0', '#ffc890'],   // poussière dorée dans la lumière
    far: () => [makeDunes(), makePyramids(), makeMist(560, 60, 0.5, SKY.mist), makeMist(400, 40, 0.35, SKY.mist), makeSunGlow(SUN_DIR)],
  });
}
