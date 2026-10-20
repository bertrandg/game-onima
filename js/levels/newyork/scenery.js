import * as THREE from 'three';
import { Scenery, makeMist, makeSunGlow, hash, smooth } from '../../scenery.js';

// Lointain de New York : ciel doré de fin d'après-midi, statue de la Liberté peinte (grand tableau plat,
// comme la tour Eiffel à Paris) tout au bout de l'avenue, flamme qui scintille, skyline en couches.
export const SKY = {
  top: '#5f7fd0',
  mid: '#c2b4e6',
  pink: '#f8bcb4',
  horizon: '#ffd2a8',
  low: '#ffe2c4',
  mist: '#f2cdb8',
  sun: '#fff0c0',
};
export const FOG_COLOR = SKY.horizon;
const SUN_DIR = new THREE.Vector3(0.32, 0.1, -1).normalize();
// dans l'axe de l'avenue : visible dans la fente entre les gratte-ciel
const STATUE = { x: 0, z: -700, base: -6, h: 112, w: 112 * 467 / 865 };   // assez étroite pour tenir entre les gratte-ciel

// ---------- Statue de la Liberté : illustration kawaii (fond transparent, 467 × 865 px) ----------
// Illustration : Vecteezy.com (licence gratuite, attribution dans l'aide et le README)
const IMG = { url: new URL('../../../img/liberty.png', import.meta.url).href, w: 467, h: 865, flame: [62, 45] };

// halo de la flamme qui palpite et étincelles qui s'en échappent
function torchGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,250,210,1)');
  grd.addColorStop(0.25, 'rgba(255,210,90,0.65)');
  grd.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
}

function makeLiberty() {
  const group = new THREE.Group();
  const tex = new THREE.TextureLoader().load(IMG.url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  group.add(new THREE.Mesh(
    new THREE.PlaneGeometry(STATUE.w, STATUE.h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, fog: false }),
  ));
  // halo qui palpite sur la flamme de la torche
  const fx = (IMG.flame[0] / IMG.w - 0.5) * STATUE.w, fy = (0.5 - IMG.flame[1] / IMG.h) * STATUE.h;
  const glow = torchGlow();
  glow.position.set(fx, fy, 1);
  group.add(glow);
  group.position.set(STATUE.x, STATUE.base + STATUE.h / 2, STATUE.z);
  group.userData.tick = (t) => {
    const k = 1 + 0.12 * Math.sin(t * 7.3) + 0.08 * Math.sin(t * 13.1);
    glow.scale.set(15 * k, 17 * k, 1);
    glow.material.opacity = 0.6 + 0.25 * Math.sin(t * 5.2);
  };
  return group;
}

// ---------- Skyline en couches : gratte-ciel à antennes, plus bas autour de la statue ----------
function makeSkyline() {
  const group = new THREE.Group();
  const mist = new THREE.Color(SKY.mist);
  const statueAng = Math.atan2(STATUE.z, STATUE.x);
  const layers = [
    { r: 820, base: 40, amp: 120, color: '#b4b0dc', seed: 3 },
    { r: 640, base: 30, amp: 90, color: '#9ea2d0', seed: 7 },
    { r: 470, base: 20, amp: 60, color: '#8a90bc', seed: 11 },
  ];
  for (const L of layers) {
    const bld = [];
    let a = 0, i = 0;
    while (a < Math.PI * 2) {
      const w = (12 + hash(L.seed + i) * 22) / L.r;
      bld.push({ a0: a, a1: a + w, h: L.base + Math.pow(hash(L.seed + i * 3), 1.6) * L.amp, spire: hash(L.seed + i * 5) > 0.8, step: hash(L.seed + i * 7) > 0.5 });
      a += w;
      i++;
    }
    const heightAt = (th) => {
      const t = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let b = bld[0];
      for (const q of bld) if (t >= q.a0 && t < q.a1) { b = q; break; }
      const u = (t - b.a0) / (b.a1 - b.a0);
      let h = b.h;
      if (b.step && (u < 0.2 || u > 0.8)) h *= 0.82;                       // gradins Art déco
      if (b.spire && Math.abs(u - 0.5) < 0.05) h += 26 * (1 - Math.abs(u - 0.5) / 0.05);   // flèche
      const d = Math.abs(Math.atan2(Math.sin(th - statueAng), Math.cos(th - statueAng)));
      return h * (0.12 + 0.88 * smooth(0.06, 0.3, d));   // la baie s'ouvre autour de la statue
    };
    const N = Math.round((Math.PI * 2 * L.r) / 2.0);
    const pos = [], col = [], idx = [];
    const top = new THREE.Color(L.color);
    const midC = top.clone().lerp(mist, 0.45);
    for (let k = 0; k <= N; k++) {
      const th = (k / N) * Math.PI * 2;
      const h = heightAt(th);
      const x = Math.cos(th) * L.r, z = Math.sin(th) * L.r;
      pos.push(x, h, z, x, h * 0.45 - 6, z, x, -60, z);
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

export function nySky(root) {
  return new Scenery(root, {
    sky: SKY,
    sunDir: SUN_DIR,
    fujiCap: false,
    fireflyColors: ['#fff0b0', '#ffd27a', '#ffb0d0', '#b0e8ff'],   // lumières de la ville
    far: () => [makeSkyline(), makeLiberty(), makeMist(560, 60, 0.6, SKY.mist), makeMist(400, 40, 0.45, SKY.mist), makeSunGlow(SUN_DIR)],
  });
}
