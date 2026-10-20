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
const STATUE = { x: 0, z: -700, base: -34, h: 270, w: 135 };

// ---------- Statue de la Liberté dessinée (vert-de-gris, contours sombres, flamme dorée) ----------
const SW = 1024, SH = 2048, CX = 512;
const INK = '#1c3c38';

function robePath(g) {   // drapé de la toge, des pieds aux épaules
  g.beginPath();
  g.moveTo(CX - 150, 1262);
  g.bezierCurveTo(CX - 165, 1080, CX - 140, 860, CX - 120, 650);
  g.quadraticCurveTo(CX - 90, 600, CX - 40, 598);
  g.lineTo(CX + 40, 598);
  g.quadraticCurveTo(CX + 95, 600, CX + 128, 640);
  g.bezierCurveTo(CX + 140, 860, CX + 170, 1080, CX + 158, 1262);
  g.closePath();
}

function drawStatue() {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const g = c.getContext('2d');
  g.lineJoin = 'round';
  g.lineCap = 'round';

  // fort étoilé (socle) et piédestal de granit
  const stone = g.createLinearGradient(CX - 400, 0, CX + 400, 0);
  stone.addColorStop(0, '#f2dcb4'); stone.addColorStop(0.5, '#d8bc90'); stone.addColorStop(1, '#a88a66');
  g.fillStyle = stone;
  g.beginPath();
  g.moveTo(CX - 470, SH); g.lineTo(CX - 420, 1880); g.lineTo(CX - 250, 1840); g.lineTo(CX + 250, 1840); g.lineTo(CX + 420, 1880); g.lineTo(CX + 470, SH);
  g.closePath(); g.fill();
  g.strokeStyle = '#6a5038'; g.lineWidth = 7; g.stroke();
  g.fillStyle = stone;
  g.beginPath();
  g.moveTo(CX - 210, 1840); g.lineTo(CX - 190, 1560); g.lineTo(CX - 170, 1500); g.lineTo(CX - 150, 1330); g.lineTo(CX - 175, 1300);
  g.lineTo(CX + 175, 1300); g.lineTo(CX + 150, 1330); g.lineTo(CX + 170, 1500); g.lineTo(CX + 190, 1560); g.lineTo(CX + 210, 1840);
  g.closePath(); g.fill(); g.stroke();
  // corniches, loggia à colonnes et ombres du piédestal
  g.fillStyle = '#c8a87e';
  for (const [y, w] of [[1500, 172], [1560, 192], [1330, 158]]) g.fillRect(CX - w, y - 10, w * 2, 18);
  g.fillStyle = 'rgba(80,60,40,0.55)';
  for (let i = 0; i < 5; i++) g.fillRect(CX - 110 + i * 50, 1370, 20, 110);
  g.fillStyle = '#e8d2a8';
  for (let i = 0; i < 6; i++) g.fillRect(CX - 128 + i * 50, 1360, 8, 130);
  g.strokeStyle = '#6a5038'; g.lineWidth = 4;
  for (let y = 1600; y < 1840; y += 40) { g.beginPath(); g.moveTo(CX - 200, y); g.lineTo(CX + 200, y); g.stroke(); }

  // la statue : vert-de-gris éclairé à gauche
  const verd = g.createLinearGradient(CX - 200, 0, CX + 200, 0);
  verd.addColorStop(0, '#a8e0c8'); verd.addColorStop(0.45, '#7cc4aa'); verd.addColorStop(1, '#4a8c7c');
  // bras droit levé tenant la torche
  g.fillStyle = verd;
  g.beginPath();
  g.moveTo(CX + 92, 640); g.bezierCurveTo(CX + 130, 520, CX + 150, 400, CX + 150, 268);
  g.lineTo(CX + 196, 262); g.bezierCurveTo(CX + 196, 410, CX + 175, 540, CX + 132, 660);
  g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  // torche et flamme dorée
  g.fillStyle = '#5a9a88';
  g.beginPath(); g.moveTo(CX + 150, 268); g.lineTo(CX + 196, 262); g.lineTo(CX + 186, 180); g.lineTo(CX + 160, 182); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#6aac98';
  g.fillRect(CX + 136, 150, 74, 34); g.strokeRect(CX + 136, 150, 74, 34);
  const fl = g.createLinearGradient(0, 30, 0, 150);
  fl.addColorStop(0, '#fff8c0'); fl.addColorStop(0.5, '#ffd040'); fl.addColorStop(1, '#f08a20');
  g.fillStyle = fl;
  g.beginPath();
  g.moveTo(CX + 140, 150); g.bezierCurveTo(CX + 120, 100, CX + 160, 80, CX + 172, 30);
  g.bezierCurveTo(CX + 190, 80, CX + 228, 100, CX + 206, 150); g.closePath(); g.fill();
  g.strokeStyle = '#a85a10'; g.lineWidth = 6; g.stroke();
  // toge
  g.fillStyle = verd;
  robePath(g); g.fill();
  g.save(); robePath(g); g.clip();
  g.strokeStyle = 'rgba(30,70,64,0.5)'; g.lineWidth = 6;   // plis du drapé
  for (let i = 0; i < 9; i++) {
    const x = CX - 120 + i * 32;
    g.beginPath(); g.moveTo(x + 30, 700); g.bezierCurveTo(x + 10, 900, x - 6, 1050, x + 4, 1262); g.stroke();
  }
  g.strokeStyle = 'rgba(220,255,240,0.45)'; g.lineWidth = 5;
  for (let i = 0; i < 5; i++) { const x = CX - 110 + i * 28; g.beginPath(); g.moveTo(x + 24, 720); g.bezierCurveTo(x + 8, 900, x - 4, 1050, x + 6, 1250); g.stroke(); }
  // écharpe en diagonale
  g.fillStyle = '#62a894';
  g.beginPath(); g.moveTo(CX - 120, 650); g.lineTo(CX + 128, 700); g.lineTo(CX + 132, 760); g.lineTo(CX - 128, 720); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 9; robePath(g); g.stroke();
  // pied qui dépasse et chaîne brisée
  g.fillStyle = '#5a9a88';
  g.beginPath(); g.ellipse(CX + 60, 1262, 46, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // tablette tenue contre le bras gauche
  g.save();
  g.translate(CX - 128, 780); g.rotate(-0.12);
  g.fillStyle = '#8ccab4';
  g.fillRect(-56, -110, 112, 200); g.strokeRect(-56, -110, 112, 200);
  g.fillStyle = INK; g.font = 'bold 28px serif'; g.textAlign = 'center';
  g.fillText('JULY IV', 0, -20); g.fillText('MDCCLXXVI', 0, 20);
  g.restore();
  g.fillStyle = verd;
  g.beginPath(); g.ellipse(CX - 108, 860, 34, 28, 0.3, 0, Math.PI * 2); g.fill(); g.stroke();   // main
  // tête, visage serein et couronne à 7 rayons
  g.fillStyle = verd;
  g.beginPath(); g.moveTo(CX - 30, 600); g.lineTo(CX - 26, 560); g.lineTo(CX + 26, 560); g.lineTo(CX + 30, 600); g.fill();   // cou
  g.beginPath(); g.ellipse(CX, 510, 50, 60, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#5a9a88';
  g.beginPath(); g.ellipse(CX, 466, 56, 24, 0, Math.PI, 0); g.fill(); g.stroke();   // diadème
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32;
    const x0 = CX + Math.cos(a) * 48, y0 = 462 + Math.sin(a) * 20;
    g.beginPath();
    g.moveTo(x0 - Math.sin(a) * 12, y0 + Math.cos(a) * 12);
    g.lineTo(CX + Math.cos(a) * 150, 462 + Math.sin(a) * 120);
    g.lineTo(x0 + Math.sin(a) * 12, y0 - Math.cos(a) * 12);
    g.closePath();
    g.fillStyle = '#86ccb4'; g.fill();
    g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
  }
  g.fillStyle = INK;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(CX + s * 18, 512, 9, 4, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#4a8c7c';
  g.beginPath(); g.moveTo(CX, 515); g.lineTo(CX - 7, 540); g.lineTo(CX + 7, 540); g.fill();
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.moveTo(CX - 12, 552); g.quadraticCurveTo(CX, 556, CX + 12, 552); g.stroke();
  // voile de brume au pied
  g.globalCompositeOperation = 'source-atop';
  const fog = g.createLinearGradient(0, SH * 0.8, 0, SH);
  fog.addColorStop(0, 'rgba(242,205,184,0)');
  fog.addColorStop(1, 'rgba(242,205,184,0.6)');
  g.fillStyle = fog;
  g.fillRect(0, SH * 0.78, SW, SH * 0.22);
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

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
  group.add(new THREE.Mesh(
    new THREE.PlaneGeometry(STATUE.w, STATUE.h),
    new THREE.MeshBasicMaterial({ map: drawStatue(), transparent: true, alphaTest: 0.04, fog: false }),
  ));
  const toWorld = (px, py) => [((px - CX) / SW) * STATUE.w, (1 - py / SH) * STATUE.h - STATUE.h / 2];
  const [fx, fy] = toWorld(CX + 173, 95);
  const glow = torchGlow();
  glow.position.set(fx, fy, 1);
  group.add(glow);
  group.position.set(STATUE.x, STATUE.base + STATUE.h / 2, STATUE.z);
  group.userData.tick = (t) => {
    const k = 1 + 0.12 * Math.sin(t * 7.3) + 0.08 * Math.sin(t * 13.1);
    glow.scale.set(26 * k, 30 * k, 1);
    glow.material.opacity = 0.75 + 0.25 * Math.sin(t * 5.2);
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
