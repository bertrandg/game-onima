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
const TOWER = { x: 38, z: -720, base: -10, h: 300, w: 150 };   // au bout du boulevard, visible entre les immeubles
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- Tour Eiffel dessinée (style illustration : bronze doré, contours foncés, treillis) ----------
const TW = 1024, TH = 2048, CX = 512, BASE = TH - 8, TIP = 30;
const yAt = (f) => BASE - f * (BASE - TIP);            // f : fraction de hauteur (0 au pied, 1 à la pointe)
const F1 = 0.25, F2 = 0.43, F3 = 0.87;                  // 1er, 2e et 3e étages
// demi-largeur de la silhouette selon la hauteur
function hw(f) {
  if (f <= F1) return 285 + 185 * Math.pow(1 - f / F1, 1.5);
  if (f <= F2) return 150 + 135 * Math.pow(1 - (f - F1) / (F2 - F1), 1.3);
  if (f <= F3) return 30 + 120 * Math.pow(1 - (f - F2) / (F3 - F2), 1.7);
  return 30 - 10 * Math.min(1, (f - F3) / 0.05);
}

function silhouette(g) {
  g.beginPath();
  for (let i = 0; i <= 120; i++) { const f = (i / 120) * 0.92; g.lineTo(CX - hw(f), yAt(f)); }
  for (let i = 120; i >= 0; i--) { const f = (i / 120) * 0.92; g.lineTo(CX + hw(f), yAt(f)); }
  g.closePath();
}
function archPath(g) {   // grande arche entre les pieds
  const x0 = 300, top = yAt(0.205);
  g.beginPath();
  g.moveTo(CX - x0, BASE);
  g.bezierCurveTo(CX - x0, top + 40, CX - 150, top, CX, top);
  g.bezierCurveTo(CX + 150, top, CX + x0, top + 40, CX + x0, BASE);
  g.closePath();
}
function windowPath(g) {   // vide entre le 1er et le 2e étage
  g.beginPath();
  g.moveTo(CX - 118, yAt(F1 + 0.035));
  g.lineTo(CX + 118, yAt(F1 + 0.035));
  g.lineTo(CX + 36, yAt(F2 - 0.025));
  g.lineTo(CX - 36, yAt(F2 - 0.025));
  g.closePath();
}

function drawTower() {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const g = c.getContext('2d');
  const INK = '#3a2210';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // corps : bronze doré, éclairé à gauche, dans l'ombre à droite
  const body = g.createLinearGradient(CX - 470, 0, CX + 470, 0);
  body.addColorStop(0, '#f2bf6a');
  body.addColorStop(0.42, '#d29548');
  body.addColorStop(0.62, '#b8783a');
  body.addColorStop(1, '#7e4c22');
  g.fillStyle = body;
  silhouette(g);
  g.fill();

  // treillis : croisillons et traverses, limités à la silhouette
  g.save();
  silhouette(g);
  g.clip();
  g.strokeStyle = 'rgba(70,38,16,0.55)';
  g.lineWidth = 3;
  for (let k = -TH; k < TH * 2; k += 26) {
    g.beginPath(); g.moveTo(CX - 520, k); g.lineTo(CX + 520, k + 380); g.stroke();
    g.beginPath(); g.moveTo(CX + 520, k); g.lineTo(CX - 520, k + 380); g.stroke();
  }
  g.strokeStyle = 'rgba(60,32,14,0.75)';
  g.lineWidth = 5;
  for (let f = 0.02; f < 0.9; f += 0.022) { g.beginPath(); g.moveTo(CX - hw(f), yAt(f)); g.lineTo(CX + hw(f), yAt(f)); g.stroke(); }
  // arêtiers intérieurs des quatre piliers
  g.lineWidth = 7;
  g.strokeStyle = INK;
  for (const s of [-1, 1]) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const f = (i / 40) * F3; g.lineTo(CX + s * hw(f) * 0.42, yAt(f)); }
    g.stroke();
  }
  // reflets dorés côté lumière
  g.strokeStyle = 'rgba(255,230,160,0.55)';
  g.lineWidth = 5;
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const f = (i / 60) * F3; g.lineTo(CX - hw(f) + 10, yAt(f)); }
  g.stroke();
  g.restore();

  // ajours : arche et vide entre les étages
  g.globalCompositeOperation = 'destination-out';
  archPath(g); g.fill();
  windowPath(g); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = INK;
  g.lineWidth = 9;
  archPath(g); g.stroke();
  windowPath(g); g.stroke();
  // frise intérieure de l'arche
  g.strokeStyle = 'rgba(242,191,106,0.9)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(CX - 280, BASE);
  g.bezierCurveTo(CX - 280, yAt(0.19) + 46, CX - 140, yAt(0.19) + 8, CX, yAt(0.19) + 8);
  g.bezierCurveTo(CX + 140, yAt(0.19) + 8, CX + 280, yAt(0.19) + 46, CX + 280, BASE);
  g.stroke();
  // contour de la silhouette
  g.strokeStyle = INK;
  g.lineWidth = 9;
  silhouette(g);
  g.stroke();

  // étages : plateformes avec frise d'arcades et garde-corps
  const platform = (f, h, ext, arches) => {
    const y = yAt(f), w = hw(f) + ext;
    const pg = g.createLinearGradient(0, y - h, 0, y);
    pg.addColorStop(0, '#f0b860'); pg.addColorStop(1, '#a8682e');
    g.fillStyle = pg;
    g.fillRect(CX - w, y - h, w * 2, h);
    g.strokeStyle = INK; g.lineWidth = 7;
    g.strokeRect(CX - w, y - h, w * 2, h);
    if (arches) {
      g.lineWidth = 4;
      const n = Math.floor((w * 2) / 34);
      for (let i = 0; i < n; i++) {
        const x = CX - w + 17 + i * ((w * 2 - 34) / (n - 1));
        g.beginPath(); g.arc(x, y - 6, 12, Math.PI, 0); g.stroke();
      }
    }
    // garde-corps clair
    g.fillStyle = '#f6d48a';
    g.fillRect(CX - w + 4, y - h - 12, w * 2 - 8, 6);
    g.fillStyle = INK;
    for (let x = CX - w + 6; x < CX + w - 6; x += 16) g.fillRect(x, y - h - 12, 3, 12);
  };
  platform(F1, 62, 34, true);
  platform(F2, 40, 22, true);
  platform(F3, 26, 14, false);
  // campanile, dôme et antenne
  g.fillStyle = '#c4843c';
  g.fillRect(CX - 20, yAt(0.93), 40, yAt(F3) - yAt(0.93) - 26);
  g.strokeStyle = INK; g.lineWidth = 6;
  g.strokeRect(CX - 20, yAt(0.93), 40, yAt(F3) - yAt(0.93) - 26);
  g.fillStyle = '#d89a48';
  g.beginPath(); g.ellipse(CX, yAt(0.93), 26, 20, 0, Math.PI, 0); g.fill(); g.stroke();
  g.lineWidth = 8;
  g.beginPath(); g.moveTo(CX, yAt(0.935)); g.lineTo(CX, TIP); g.stroke();
  // pied légèrement voilé par la brume du lointain
  g.globalCompositeOperation = 'source-atop';
  const fog = g.createLinearGradient(0, TH * 0.82, 0, TH);
  fog.addColorStop(0, 'rgba(242,216,204,0)');
  fog.addColorStop(1, 'rgba(242,216,204,0.55)');
  g.fillStyle = fog;
  g.fillRect(0, TH * 0.8, TW, TH * 0.2);
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
    const f = (i / 70) * 0.9;
    for (const s of [-1, 1]) pts.push(toWorld(CX + s * hw(f) * 0.97, yAt(f)));
  }
  for (const [f, ext] of [[F1, 34], [F2, 22], [F3, 14]]) {
    for (let k = -8; k <= 8; k++) pts.push(toWorld(CX + (k / 8) * (hw(f) + ext), yAt(f) - 12));
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
        vA = 0.2 + 0.8 * tw;
        gl_PointSize = uScale * (1.4 + tw * 2.2) / -mv.z;
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

// faisceau laser électrique qui part de la pointe vers le ciel : cœur blanc, halo bleu-violet,
// deux arcs en zigzag qui changent de forme plusieurs fois par seconde, petite boule d'énergie à la pointe
const LASER_H = 520, LASER_W = 48;
function towerLaser() {
  const geo = new THREE.PlaneGeometry(LASER_W, LASER_H);
  geo.translate(0, LASER_H / 2 - 14, 0);   // démarre un peu sous la pointe pour la boule d'énergie
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      // ligne brisée : décalage aléatoire par segment, renouvelé à chaque « tic » électrique
      float bolt(float y, float seed, float tick, float amp) {
        float seg = y * 38.0;
        float i = floor(seg), f = fract(seg);
        float a = hash(i + seed + tick * 13.1) - 0.5;
        float b = hash(i + 1.0 + seed + tick * 13.1) - 0.5;
        return mix(a, b, f) * amp;
      }
      void main() {
        float x = (vUv.x - 0.5) * ${LASER_W.toFixed(1)};   // en unités du monde
        float y = vUv.y;
        float tick = floor(uTime * 14.0);
        float flick = 0.82 + 0.18 * hash(tick);
        float wob = sin(y * 40.0 + uTime * 9.0) * 0.4;
        float core = exp(-pow((x - wob) / 1.1, 2.0));
        float glow = exp(-pow((x - wob) / 5.5, 2.0)) * 0.5;
        float amp = 5.0 + 9.0 * (1.0 - y);
        float b1 = exp(-pow((x - bolt(y, 1.7, tick, amp)) / 0.55, 2.0));
        float b2 = exp(-pow((x - bolt(y, 9.3, tick + 0.5, amp * 0.8)) / 0.4, 2.0)) * step(0.5, hash(tick * 3.7));
        float tipY = y * ${LASER_H.toFixed(1)} - 14.0;
        float fade = smoothstep(-0.5, 2.0, tipY) * pow(1.0 - y, 1.6);
        float orb = exp(-(x * x + tipY * tipY) / (30.0 + 10.0 * flick));
        vec3 col = vec3(1.0) * core + vec3(0.45, 0.7, 1.0) * glow + vec3(0.75, 0.85, 1.0) * (b1 + b2) * 0.9;
        col *= fade * flick;
        col += vec3(0.85, 0.9, 1.0) * orb * 1.4;
        float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
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
  const laser = towerLaser();
  laser.position.set(0, TOWER.h / 2 - (TIP / TH) * TOWER.h, 0.8);
  group.add(laser);
  group.position.set(TOWER.x, TOWER.base + TOWER.h / 2, TOWER.z);
  group.userData.tick = (t, pr) => {
    sparkles.material.uniforms.uTime.value = t;
    sparkles.material.uniforms.uScale.value = window.innerHeight * pr;
    laser.material.uniforms.uTime.value = t;
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
