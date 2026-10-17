import * as THREE from 'three';
import { Scenery, makeMist, makeSunGlow, hash } from '../../scenery.js';

// Lointain de Paris 1900, dans le même esprit que le mont Fuji : silhouettes peintes, tons pastel
// voilés par la brume. La tour Eiffel est un grand tableau (une seule face plane) dont les lumières
// dorées scintillent ; les toits de Paris forment des couches qui se fondent dans la brume.
export const SKY = {
  top: '#6c8cd4',
  mid: '#c4b8ea',
  pink: '#f4c2c8',
  horizon: '#ffd8b4',
  low: '#ffe6cc',
  mist: '#f2d8cc',
  sun: '#fff0c0',
};
export const FOG_COLOR = SKY.horizon;
const SUN_DIR = new THREE.Vector3(-0.55, 0.12, -1).normalize();
const TOWER = { x: 38, z: -720, base: -12, h: 300, w: 165 };   // au bout du boulevard, visible entre les immeubles
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- Tour Eiffel peinte ----------
const TW = 1024, TH = 2048, CX = 512, TOP = 190;
// demi-largeur de la silhouette (v = 0 en haut, 1 au pied)
const hw = (v) => 16 + 440 * Math.pow(v, 2.5);
const yAt = (v) => TOP + v * (TH - TOP);

function towerPath(g) {
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const v = i / 60; g.lineTo(CX - hw(v), yAt(v)); }
  for (let i = 60; i >= 0; i--) { const v = i / 60; g.lineTo(CX + hw(v), yAt(v)); }
  g.closePath();
}

function drawTower() {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const g = c.getContext('2d');
  // silhouette en dégradé lavande, plus claire vers le haut (voile de brume)
  const grd = g.createLinearGradient(0, TOP, 0, TH);
  grd.addColorStop(0, '#d6c8f4');
  grd.addColorStop(0.45, '#a8a2d6');
  grd.addColorStop(1, '#8e8cc4');
  g.fillStyle = grd;
  towerPath(g);
  g.fill();

  // treillis : croisillons clairs dans la silhouette
  g.save();
  towerPath(g);
  g.clip();
  g.strokeStyle = 'rgba(255,248,255,0.28)';
  g.lineWidth = 3;
  for (let k = -TH; k < TH * 2; k += 30) {
    g.beginPath(); g.moveTo(CX - 500, k); g.lineTo(CX + 500, k + 520); g.stroke();
    g.beginPath(); g.moveTo(CX + 500, k); g.lineTo(CX - 500, k + 520); g.stroke();
  }
  g.strokeStyle = 'rgba(80,70,140,0.25)';
  g.lineWidth = 4;
  for (let v = 0.06; v < 1; v += 0.045) { g.beginPath(); g.moveTo(CX - hw(v), yAt(v)); g.lineTo(CX + hw(v), yAt(v)); g.stroke(); }
  g.restore();

  // ajours : grande arche entre les pieds et vide sous le premier étage
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  const v1 = 0.8;
  g.moveTo(CX - (hw(v1) - hw(v1) * 0.42), yAt(v1) + 30);
  for (let i = 0; i <= 20; i++) { const v = v1 + (i / 20) * (1 - v1); g.lineTo(CX - (hw(v) - hw(v) * 0.36), yAt(v)); }
  for (let i = 20; i >= 0; i--) { const v = v1 + (i / 20) * (1 - v1); g.lineTo(CX + (hw(v) - hw(v) * 0.36), yAt(v)); }
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  // arche festonnée claire
  g.strokeStyle = '#efe6ff';
  g.lineWidth = 7;
  g.beginPath();
  g.ellipse(CX, TH - 8, hw(1) * 0.6, (TH - yAt(v1)) * 0.78, 0, Math.PI, 0);
  g.stroke();

  // étages : plateformes claires avec rambarde dorée
  for (const [v, h, ext] of [[0.8, 30, 34], [0.53, 22, 24], [0.11, 16, 14]]) {
    const y = yAt(v), w = hw(v) + ext;
    g.fillStyle = '#efe6ff';
    g.fillRect(CX - w, y - h / 2, w * 2, h);
    g.fillStyle = 'rgba(90,80,150,0.35)';
    g.fillRect(CX - w, y + h / 2 - 6, w * 2, 6);
    g.fillStyle = '#f4d27a';
    for (let x = CX - w + 6; x < CX + w - 6; x += 14) g.fillRect(x, y - h / 2 - 8, 4, 8);
  }
  // arête éclairée (côté soleil) et arête dans l'ombre
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(255,245,255,0.7)';
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const v = i / 60; g.lineTo(CX - hw(v), yAt(v)); }
  g.stroke();
  g.strokeStyle = 'rgba(70,60,130,0.45)';
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const v = i / 60; g.lineTo(CX + hw(v), yAt(v)); }
  g.stroke();
  // flèche et phare
  g.strokeStyle = '#c8bce8';
  g.lineWidth = 10;
  g.beginPath(); g.moveTo(CX, TOP + 4); g.lineTo(CX, 40); g.stroke();
  const beacon = g.createRadialGradient(CX, 50, 0, CX, 50, 70);
  beacon.addColorStop(0, 'rgba(255,248,210,1)');
  beacon.addColorStop(0.3, 'rgba(255,224,150,0.6)');
  beacon.addColorStop(1, 'rgba(255,210,170,0)');
  g.fillStyle = beacon;
  g.fillRect(CX - 70, 0, 140, 130);
  // pied fondu dans la brume
  g.globalCompositeOperation = 'source-atop';
  const fog = g.createLinearGradient(0, TH * 0.72, 0, TH);
  fog.addColorStop(0, 'rgba(242,216,204,0)');
  fog.addColorStop(1, 'rgba(242,216,204,0.85)');
  g.fillStyle = fog;
  g.fillRect(0, TH * 0.7, TW, TH * 0.3);
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// lumières dorées qui scintillent le long des arêtes et des étages
function towerSparkles() {
  const pts = [];
  const toWorld = (px, py) => [((px - CX) / TW) * TOWER.w, (1 - py / TH) * TOWER.h - TOWER.h / 2];
  for (let i = 0; i < 70; i++) {
    const v = 0.04 + (i / 70) * 0.92;
    for (const s of [-1, 1]) pts.push(toWorld(CX + s * hw(v) * 0.96, yAt(v)));
  }
  for (const v of [0.8, 0.53, 0.11]) {
    for (let k = -8; k <= 8; k++) pts.push(toWorld(CX + (k / 8) * (hw(v) + 20), yAt(v) - 12));
  }
  for (let i = 0; i < 40; i++) {
    const v = Math.random() * 0.78;
    pts.push(toWorld(CX + (Math.random() * 2 - 1) * hw(v) * 0.8, yAt(v)));
  }
  const pos = new Float32Array(pts.length * 3), ph = new Float32Array(pts.length);
  pts.forEach(([x, y], i) => { pos.set([x, y, 0.5], i * 3); ph[i] = Math.random() * 100; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 } },
    vertexShader: /* glsl */`
      uniform float uTime, uScale;
      attribute float aPhase;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = pow(0.5 + 0.5 * sin(uTime * (2.0 + mod(aPhase, 3.0)) + aPhase), 3.0);
        vA = 0.25 + 0.75 * tw;
        gl_PointSize = uScale * (1.6 + tw * 2.4) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.92, 0.65) + smoothstep(0.15, 0.0, d), a * a * vA);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  return new THREE.Points(g, mat);
}

function makeEiffel() {
  const group = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(TOWER.w, TOWER.h),
    new THREE.MeshBasicMaterial({ map: drawTower(), transparent: true, alphaTest: 0.04, fog: false }),
  );
  group.add(plane);
  const sparkles = towerSparkles();
  sparkles.frustumCulled = false;
  group.add(sparkles);
  // halo doré autour du sommet
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,240,200,0.9)');
  r.addColorStop(1, 'rgba(255,220,200,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  halo.scale.set(60, 60, 1);
  halo.position.set(0, TOWER.h / 2 - 12, 1);
  group.add(halo);
  group.position.set(TOWER.x, TOWER.base + TOWER.h / 2, TOWER.z);
  group.userData.tick = (t, pr) => {
    sparkles.material.uniforms.uTime.value = t;
    sparkles.material.uniforms.uScale.value = window.innerHeight * pr;
    halo.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.7);
  };
  return group;
}

// ---------- Toits de Paris en couches, monuments intégrés à la silhouette ----------
function makeSkyline() {
  const group = new THREE.Group();
  const mist = new THREE.Color(SKY.mist);
  const towerAng = Math.atan2(TOWER.z, TOWER.x);
  const layers = [
    { r: 820, base: 26, amp: 22, color: '#bdb8de', seed: 5,
      domes: [[-1.75, 0.05, 60, '#f2ecf2'], [-1.82, 0.016, 42, '#f2ecf2'], [-1.68, 0.016, 42, '#f2ecf2']], hill: [-1.75, 0.22, 46] },   // Sacré-Cœur sur la butte
    { r: 640, base: 20, amp: 16, color: '#a9aad0', seed: 9,
      domes: [[-1.25, 0.03, 42, '#b8b4d4'], [-2.15, 0.026, 38, '#e0c47a']],   // Panthéon, dôme doré des Invalides
      towers: [[-0.95, 0.012, 46], [-0.92, 0.012, 46]] },                     // tours de Notre-Dame
    { r: 470, base: 13, amp: 11, color: '#9498bc', seed: 13 },
  ];
  for (const L of layers) {
    // immeubles : hauteur constante par façade, toit mansardé, cheminées
    const bld = [];
    let a = 0, i = 0;
    while (a < Math.PI * 2) {
      const w = (9 + hash(L.seed + i) * 16) / L.r;
      bld.push({ a0: a, a1: a + w, h: L.base + hash(L.seed + i * 3) * L.amp, chim: hash(L.seed + i * 5) > 0.55 });
      a += w;
      i++;
    }
    const heightAt = (th) => {
      const t = ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let b = bld[0];
      for (const q of bld) if (t >= q.a0 && t < q.a1) { b = q; break; }
      const u = (t - b.a0) / (b.a1 - b.a0);
      let h = b.h - 3 * (1 - smooth(0, 0.2, u) * smooth(1, 0.8, u));   // pente du toit mansardé
      if (b.chim && Math.abs(u - 0.7) < 0.06) h += 3.5;
      const dT = Math.abs(Math.atan2(Math.sin(th - towerAng), Math.cos(th - towerAng)));
      if (dT < 0.06) h *= 0.55 + 0.45 * smooth(0.02, 0.06, dT);            // dégage le pied de la tour
      let tint = null;
      if (L.hill) {
        const d = Math.atan2(Math.sin(th - L.hill[0]), Math.cos(th - L.hill[0]));
        if (Math.abs(d) < L.hill[1]) h += L.hill[2] * Math.cos((d / L.hill[1]) * Math.PI / 2);
      }
      for (const [c, w, dh, col] of L.domes || []) {
        const d = Math.atan2(Math.sin(th - c), Math.cos(th - c));
        if (Math.abs(d) < w) {
          const hd = h + dh * Math.sqrt(1 - (d / w) ** 2) + (Math.abs(d) < w * 0.12 ? 8 : 0);
          if (hd > h) { h = hd; tint = col; }
        }
      }
      for (const [c, w, dh] of L.towers || []) {
        const d = Math.atan2(Math.sin(th - c), Math.cos(th - c));
        if (Math.abs(d) < w) h = Math.max(h, L.base + dh);
      }
      return [h, tint];
    };
    const N = Math.round((Math.PI * 2 * L.r) / 2.2);
    const pos = [], col = [], idx = [];
    const top = new THREE.Color(L.color);
    const c = new THREE.Color();
    for (let k = 0; k <= N; k++) {
      const th = (k / N) * Math.PI * 2;
      const [h, tint] = heightAt(th);
      const x = Math.cos(th) * L.r, z = Math.sin(th) * L.r;
      pos.push(x, h, z, x, h * 0.45 - 6, z, x, -60, z);
      c.copy(tint ? new THREE.Color(tint).lerp(top, 0.35) : top);
      const midC = top.clone().lerp(mist, 0.45);
      col.push(c.r, c.g, c.b, midC.r, midC.g, midC.b, mist.r, mist.g, mist.b);
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

export function parisScenery(root) {
  return new Scenery(root, {
    sky: SKY,
    sunDir: SUN_DIR,
    fujiCap: false,
    fireflyColors: ['#fff0b0', '#ffd27a', '#fff6d8', '#ffe0a0'],   // lueurs des becs de gaz
    far: () => [makeSkyline(), makeEiffel(), makeMist(560, 60, 0.7, SKY.mist), makeMist(400, 40, 0.5, SKY.mist), makeSunGlow(SUN_DIR)],
  });
}
