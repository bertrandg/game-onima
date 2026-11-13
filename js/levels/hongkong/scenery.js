import * as THREE from 'three';
import { Scenery, makeMist, makeSunGlow, hash } from '../../scenery.js';

// Lointain de Hong Kong la nuit : ciel bleu nuit qui vire au magenta sur l'horizon (les lumières de la
// ville), lune, pic Victoria en silhouette, gratte-ciel aux fenêtres allumées sur l'autre rive du port et
// faisceaux lumineux qui balaient le ciel depuis le sommet des tours.
export const SKY = {
  top: '#0e1230',
  mid: '#262660',
  pink: '#6a3080',
  horizon: '#c0508a',
  low: '#2a2040',
  mist: '#4a2e62',
  sun: '#f0f0ff',
};
export const FOG_COLOR = '#3a2a58';
const MOON_DIR = new THREE.Vector3(-0.35, 0.32, -1).normalize();

// fenêtres de gratte-ciel (répétées sur chaque tour) : rangées de petites fenêtres plus ou moins allumées
function windowsTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#161a34'; g.fillRect(0, 0, 64, 128);
  for (let r = 0; r < 16; r++) for (let k = 0; k < 8; k++) {
    if (hash(r * 31 + k * 7) < 0.4) {
      g.fillStyle = ['#ffd890', '#e8f0ff', '#a8d0ff', '#ffb8d8'][(hash(r + k * 13) * 4) | 0];
      g.fillRect(k * 8 + 2, r * 8 + 2, 4, 5);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// gratte-ciel de l'autre rive : une seule géométrie (faces tournées vers le joueur), couronnes lumineuses
function makeSkyline() {
  const group = new THREE.Group();
  const pos = [], uv = [], col = [], idx = [];
  const crowns = [];
  const c = new THREE.Color();
  let n = 0;
  const quad = (cx, cz, w, h, base, tint) => {
    // face orientée vers le centre (le joueur), légèrement penchée selon l'angle
    const ang = Math.atan2(cz, cx), tx = -Math.sin(ang), tz = Math.cos(ang);
    const p = [[cx - tx * w / 2, base, cz - tz * w / 2], [cx + tx * w / 2, base, cz + tz * w / 2], [cx + tx * w / 2, h, cz + tz * w / 2], [cx - tx * w / 2, h, cz - tz * w / 2]];
    for (const v of p) pos.push(...v);
    const ru = w / 24, rv = (h - base) / 48;   // fenêtres d'environ 3 m : lisibles de loin
    uv.push(0, 0, ru, 0, ru, rv, 0, rv);
    c.set(tint);
    for (let k = 0; k < 4; k++) col.push(c.r, c.g, c.b);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  };
  for (const [r, count, hMin, hMax, seed] of [[620, 90, 60, 150, 3], [480, 70, 40, 110, 9]]) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + hash(seed + i) * 0.03;
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      // plus haut dans l'axe de l'avenue (le centre de Hong Kong, de l'autre côté du port)
      const ahead = Math.max(0, -Math.sin(a));
      const h = hMin + Math.pow(hash(seed * 3 + i), 2) * (hMax - hMin) * (0.5 + ahead);
      const w = 14 + hash(seed * 5 + i) * 18;
      quad(cx, cz, w, h, -40, ['#b8b0e0', '#c8c8f0', '#a8b8e0', '#d0b8e0'][i % 4]);
      if (hash(seed * 11 + i) > 0.7) crowns.push([cx, h, cz, w]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: windowsTexture(), vertexColors: true, fog: false, side: THREE.DoubleSide })));
  // couronnes lumineuses au sommet des tours les plus hautes
  const cp = [], cc = [];
  const neon = ['#ff4fa8', '#3ff0ff', '#ffe84a', '#b06aff', '#ffffff'].map((h) => new THREE.Color(h));
  crowns.forEach(([x, y, z], i) => {
    for (let k = 0; k < 6; k++) { cp.push(x + (k - 2.5) * 2.2, y + 1.5, z); const q = neon[i % neon.length]; cc.push(q.r, q.g, q.b); }
  });
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  pg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  group.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 3, vertexColors: true, fog: false, sizeAttenuation: true })));
  group.userData.crowns = crowns;
  return group;
}

// pic Victoria et collines : silhouettes sombres derrière la ville
function makeHills() {
  const N = 360, R = 760;
  const pos = [], col = [], idx = [];
  const top = new THREE.Color('#1e1c3a'), low = new THREE.Color(SKY.mist);
  for (let k = 0; k <= N; k++) {
    const th = (k / N) * Math.PI * 2;
    let h = 40;
    for (let o = 0; o < 4; o++) h += Math.sin(th * (2 + o * 3) + hash(o) * 6) * (40 / (o + 1));
    const d = Math.atan2(Math.sin(th + Math.PI / 2), Math.cos(th + Math.PI / 2));
    h += 160 * Math.exp(-(((d + 0.25) / 0.22) ** 2));   // le pic, un peu à gauche de l'avenue
    const x = Math.cos(th) * R, z = Math.sin(th) * R;
    pos.push(x, h, z, x, -60, z);
    col.push(top.r, top.g, top.b, low.r, low.g, low.b);
    if (k < N) { const p = k * 2; idx.push(p, p + 1, p + 2, p + 2, p + 1, p + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
}

// faisceaux lumineux qui balaient le ciel (cônes additifs très allongés)
function makeBeams(crowns) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.4, 9, 420, 10, 1, true).translate(0, 210, 0);
  const cols = ['#7ae0ff', '#ff7ac8', '#b08aff', '#7affb0', '#fff0a0'];
  const beams = crowns.slice(0, 7).map(([x, y, z], i) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.userData.phase = i * 1.7;
    group.add(m);
    return m;
  });
  group.userData.tick = (t) => {
    for (const m of beams) {
      const ph = m.userData.phase;
      m.rotation.set(Math.sin(t * 0.35 + ph) * 0.55, 0, Math.cos(t * 0.27 + ph) * 0.5);
      m.material.opacity = 0.09 + 0.05 * Math.sin(t * 0.8 + ph);
    }
  };
  return group;
}

export function hongKongSky(root) {
  const scenery = new Scenery(root, {
    sky: SKY,
    sunDir: MOON_DIR,
    fujiCap: false,
    fireflyColors: ['#ff8ac8', '#7af0ff', '#ffe890', '#c8a0ff', '#ffffff'],   // reflets de néon dans la bruine
    far: () => {
      const skyline = makeSkyline();
      const moon = makeSunGlow(MOON_DIR);
      moon.material.color.set('#c8d0ff');
      moon.scale.multiplyScalar(0.55);
      return [makeHills(), skyline, makeBeams(skyline.userData.crowns), makeMist(560, 50, 0.45, SKY.mist), makeMist(400, 30, 0.3, SKY.mist), moon];
    },
  });
  // nuages de nuit : éclairés par en dessous par la ville, en violet sombre
  for (const c of scenery.clouds) if (c.material && c.material.color) { c.material.color.set('#7a5a9a'); c.material.opacity = (c.material.opacity ?? 1) * 0.55; }
  return scenery;
}
