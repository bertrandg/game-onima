import * as THREE from 'three';

// Décor lointain féerique : ciel, mont Fuji, chaînes de montagnes en couches, nuages, arc-en-ciel, lucioles
export const SKY = {
  top: '#6c9de8',
  mid: '#bcd3f6',
  pink: '#f8c9dc',
  horizon: '#ffdccb',
  low: '#ffe6d6',
  mist: '#f6d9d6',
  sun: '#fff1c9',
};
export const FOG_COLOR = SKY.horizon;

export const SUN_DIR = new THREE.Vector3(0.62, 0.11, -1).normalize();
const FUJI_POS = new THREE.Vector3(-150, -62, -800);

// petit bruit déterministe
export function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
export function fbmAngle(theta, seed, octaves = 5) {
  let v = 0, a = 1, f = 3, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * Math.sin(theta * f + hash(seed + i) * 6.283);
    norm += a;
    a *= 0.55;
    f = Math.round(f * 2.1) + 1;
  }
  return v / norm;
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- Ciel ----------
export function makeSky(sky = SKY, sunDir = SUN_DIR) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(sky.top) },
      pink: { value: new THREE.Color(sky.pink) },
      mid: { value: new THREE.Color(sky.mid) },
      horizon: { value: new THREE.Color(sky.horizon) },
      low: { value: new THREE.Color(sky.low) },
      sunColor: { value: new THREE.Color(sky.sun) },
      sunDir: { value: sunDir },
      time: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top, mid, pink, horizon, low, sunColor, sunDir;
      uniform float time;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizon, pink, smoothstep(0.0, 0.08, h));
        col = mix(col, mid, smoothstep(0.06, 0.3, h));
        col = mix(col, top, smoothstep(0.25, 0.8, h));
        col = mix(col, low, smoothstep(0.0, -0.2, h));
        // soleil et halo
        float s = max(dot(d, sunDir), 0.0);
        col += sunColor * (pow(s, 900.0) * 2.0 + pow(s, 60.0) * 0.45 + pow(s, 8.0) * 0.18);
        // étoiles très discrètes en haut du ciel
        vec2 g = vec2(atan(d.z, d.x) * 90.0, h * 90.0);
        vec2 cell = floor(g);
        float r = hash(cell);
        if (r > 0.985) {
          vec2 c = fract(g) - 0.5;
          float tw = 0.5 + 0.5 * sin(time * (1.5 + r * 4.0) + r * 60.0);
          float star = smoothstep(0.12, 0.0, length(c)) * tw * smoothstep(0.35, 0.8, h);
          col += vec3(1.0, 0.97, 0.9) * star * 0.7;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

// ---------- Mont Fuji ----------
function makeFuji() {
  const R = 640, H = 264, RC = 22, NR = 92, NA = 420;
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  const forest = new THREE.Color('#2c5a52'), rockLow = new THREE.Color('#4b5370'), rock = new THREE.Color('#6a5262');
  const snow = new THREE.Color('#ffffff'), snowShade = new THREE.Color('#cfdcf5'), haze = new THREE.Color('#c9cde8');
  const hoei = 1.3; // angle du cratère Hōei (flanc tourné vers la voie)

  // ravines d'érosion irrégulières : angle, largeur, profondeur, extension vers le bas
  const gullies = [];
  for (let k = 0; k < 120; k++) {
    gullies.push({
      a: hash(k * 3.1) * Math.PI * 2,
      w: 0.006 + hash(k * 5.7) * 0.022,
      d: 0.3 + hash(k * 7.3) ** 2 * 0.9,
      lo: 0.15 + hash(k * 9.9) * 0.45,   // jusqu'où la ravine descend (hauteur relative)
      hi: 0.93 + hash(k * 2.3) * 0.06,
    });
  }
  const grooveAt = (th, hn) => {
    let g = 0;
    for (const q of gullies) {
      if (hn < q.lo - 0.08 || hn > q.hi) continue;
      let d = th - q.a;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      // les ravines s'élargissent en descendant
      const w = q.w * (1.6 - hn);
      if (Math.abs(d) > w * 3) continue;
      g = Math.max(g, q.d * Math.exp(-(d * d) / (w * w)) * smooth(q.lo - 0.08, q.lo + 0.08, hn) * (1 - smooth(q.hi - 0.04, q.hi, hn)));
    }
    return g;
  };

  // centre du cratère
  pos.push(0, H - 9, 0);
  col.push(0.78, 0.8, 0.88);
  for (let i = 0; i <= NR; i++) {
    const t = i / NR;
    const r = RC + (R - RC) * Math.pow(t, 1.45);
    const hn = Math.pow(1 - (r - RC) / (R - RC), 1.85);  // profil concave
    for (let j = 0; j < NA; j++) {
      const th = (j / NA) * Math.PI * 2;
      const groove = grooveAt(th, hn);
      let h = H * hn - H * 0.03 * groove - H * 0.006 * Math.sin(th * 40 + hn * 30) * hn;
      if (i === 0) h = H * (1 - 0.015 * Math.abs(Math.sin(th * 4 + 1)) - 0.01 * hash(j));   // bord du cratère
      // cratère Hōei : bosse puis creux sur un flanc
      const dTh = Math.atan2(Math.sin(th - hoei), Math.cos(th - hoei));
      const hz = Math.exp(-(dTh * dTh) / 0.012) * Math.exp(-Math.pow((hn - 0.5) / 0.07, 2));
      h += hz * H * 0.05 - Math.exp(-(dTh * dTh) / 0.003) * Math.exp(-Math.pow((hn - 0.52) / 0.03, 2)) * H * 0.04;
      const rr = r * (1 + 0.02 * Math.sin(th * 3 + 1) + 0.012 * Math.sin(th * 7 + 2));
      pos.push(Math.cos(th) * rr, h, Math.sin(th) * rr);

      // couleurs : forêt, roche volcanique, neige en langues dans les ravines
      // la neige descend en langues dans les ravines, la roche affleure sur les arêtes
      const snowLine = 0.66 + 0.045 * Math.sin(th * 3 + 2) + 0.03 * Math.sin(th * 11 + 0.5) + 0.02 * fbmAngle(th * 4, 3)
        - 0.32 * Math.min(1, groove);
      const sn = smooth(snowLine - 0.012, snowLine + 0.012, hn);
      c.copy(forest).lerp(rockLow, smooth(0.25, 0.45, hn + 0.04 * fbmAngle(th * 6, 9))).lerp(rock, smooth(0.45, 0.62, hn));
      c.lerp(snowShade.clone().lerp(snow, smooth(0.6, 0.95, hn) * (1 - groove * 0.3)), sn);
      c.lerp(haze, 0.1 + 0.4 * Math.pow(1 - hn, 1.8));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < NA; j++) idx.push(0, 1 + ((j + 1) % NA), 1 + j);
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NA; j++) {
      const a = 1 + i * NA + j, b = 1 + i * NA + ((j + 1) % NA);
      const a2 = a + NA, b2 = b + NA;
      idx.push(a, b, a2, b, b2, a2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  m.position.copy(FUJI_POS);
  m.rotation.y = 0.3;
  return m;
}

// ---------- Chaînes de montagnes en couches (style estampe) ----------
function makeRidges() {
  const group = new THREE.Group();
  const fujiAngle = Math.atan2(FUJI_POS.z, FUJI_POS.x);
  const mist = new THREE.Color(SKY.mist);
  const layers = [
    { r: 820, base: 40, amp: 75, color: '#b9bde0', seed: 11 },
    { r: 640, base: 22, amp: 55, color: '#9eb1d1', seed: 23 },
    { r: 500, base: 10, amp: 38, color: '#86a6bd', seed: 37 },
    { r: 400, base: 2, amp: 24, color: '#6f9aa4', seed: 51 },
  ];
  for (const L of layers) {
    const N = 360, pos = [], col = [], idx = [];
    const top = new THREE.Color(L.color);
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const dF = Math.abs(Math.atan2(Math.sin(th - fujiAngle), Math.cos(th - fujiAngle)));
      const near = L.r < FUJI_POS.length() ? 0.25 + 0.75 * smooth(0.08, 0.45, dF) : 1;
      const n = fbmAngle(th, L.seed) * 0.6 + (1 - Math.abs(fbmAngle(th * 1.7, L.seed + 5))) * 0.6;
      const y = L.base + L.amp * Math.max(0.05, n) * near;
      const x = Math.cos(th) * L.r, z = Math.sin(th) * L.r;
      pos.push(x, y, z, x, y * 0.45 - 8, z, x, -60, z);
      const midC = top.clone().lerp(mist, 0.45);
      col.push(top.r, top.g, top.b, midC.r, midC.g, midC.b, mist.r, mist.g, mist.b);
      if (i < N) {
        const a = i * 3, b = (i + 1) * 3;
        idx.push(a, a + 1, b, b, a + 1, b + 1, a + 1, a + 2, b + 1, b + 1, a + 2, b + 2);
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

// Brume au pied des montagnes : anneau dégradé transparent
export function makeMist(radius, height, opacity, color = SKY.mist) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity } },
    vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying float vY;
      void main(){ gl_FragColor = vec4(color, opacity * pow(1.0 - vY, 1.6));
      #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 96, 1, true), mat);
  m.position.y = height / 2 - 30;
  return m;
}

// ---------- Nuages ----------
function cloudTexture(seed) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const puffs = [];
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = 70 + t * 372 + (hash(seed + i) - 0.5) * 40;
    const y = 160 - Math.sin(t * Math.PI) * (50 + hash(seed + i * 3) * 45);
    puffs.push([x, y, 34 + Math.sin(t * Math.PI) * 42 + hash(seed + i * 7) * 18]);
  }
  for (const [x, y, r] of puffs) {
    const grd = g.createRadialGradient(x, y - r * 0.25, r * 0.1, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.6, 'rgba(255,246,248,0.9)');
    grd.addColorStop(1, 'rgba(255,230,235,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // dessous rosé
  g.globalCompositeOperation = 'source-atop';
  const shade = g.createLinearGradient(0, 90, 0, 220);
  shade.addColorStop(0, 'rgba(255,200,210,0)');
  shade.addColorStop(1, 'rgba(250,175,195,0.75)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function lensCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  for (let k = 0; k < 3; k++) {
    const grd = g.createRadialGradient(256, 64 + k * 8, 10, 256, 64 + k * 8, 240 - k * 50);
    grd.addColorStop(0, `rgba(255,255,255,${1 - k * 0.15})`);
    grd.addColorStop(0.7, `rgba(255,248,250,${0.85 - k * 0.15})`);
    grd.addColorStop(1, 'rgba(255,225,235,0)');
    g.save();
    g.translate(256, 64 + k * 8);
    g.scale(1, 0.22 - k * 0.03);
    g.translate(-256, -64 - k * 8);
    g.fillStyle = grd;
    g.beginPath(); g.arc(256, 64 + k * 8, 240 - k * 50, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeClouds(fujiCap = true) {
  const group = new THREE.Group();
  const texs = [1, 2, 3, 4].map((s) => cloudTexture(s * 17));
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + hash(i) * 0.3;
    const d = 650 + hash(i * 5) * 350;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texs[i % texs.length], fog: false, depthWrite: false, transparent: true, opacity: 0.85 + hash(i * 9) * 0.15,
    }));
    const w = 160 + hash(i * 3) * 160;
    s.scale.set(w, w * 0.45, 1);
    s.position.set(Math.cos(a) * d, 70 + hash(i * 7) * 150, Math.sin(a) * d);
    s.userData.speed = 1 + hash(i * 11) * 2;
    group.add(s);
    clouds.push(s);
  }
  // nuage-chapeau (kasagumo) sur le sommet du Fuji
  const cap = new THREE.Sprite(new THREE.SpriteMaterial({ map: lensCloudTexture(), fog: false, depthWrite: false, transparent: true, opacity: 0.95 }));
  cap.scale.set(150, 30, 1);
  cap.position.set(FUJI_POS.x + 4, FUJI_POS.y + 268, FUJI_POS.z + 30);
  if (fujiCap) group.add(cap);
  return { group, clouds };
}

// Halo du soleil (sprite additif)
export function makeSunGlow(sunDir = SUN_DIR) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,250,225,1)');
  grd.addColorStop(0.12, 'rgba(255,240,200,0.8)');
  grd.addColorStop(0.4, 'rgba(255,210,190,0.18)');
  grd.addColorStop(1, 'rgba(255,200,200,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  s.scale.set(320, 320, 1);
  s.position.copy(sunDir).multiplyScalar(1000);
  return s;
}

// Arc-en-ciel léger
export function makeRainbow() {
  const inner = 300, outer = 335;
  const mat = new THREE.ShaderMaterial({
    uniforms: { inner: { value: inner }, outer: { value: outer } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float inner, outer; varying vec2 vP;
      vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      void main(){
        float t = (length(vP) - inner) / (outer - inner);
        vec3 c = hue(0.78 * (1.0 - t));
        float a = 0.2 * sin(3.14159 * t) * smoothstep(-40.0, 140.0, vP.y);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96, 1, 0, Math.PI), mat);
  m.position.set(420, -40, -760);
  m.rotation.y = -0.45;
  return m;
}

// ---------- Lucioles / poussière de fée le long de la voie ----------
export function makeFireflies(colors = ['#fff3a8', '#ffc2e2', '#bfe9ff', '#ffe0a0', '#e2c8ff']) {
  const N = 170;
  const pos = new Float32Array(N * 3), phase = new Float32Array(N), color = new Float32Array(N * 3);
  const cols = colors.map((h) => new THREE.Color(h));
  for (let i = 0; i < N; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const overTrack = Math.random() < 0.15;
    pos[i * 3] = overTrack ? (Math.random() - 0.5) * 8 : side * (4.8 + Math.random() * 13);
    pos[i * 3 + 1] = overTrack ? 4 + Math.random() * 5 : 0.4 + Math.random() * 6;
    pos[i * 3 + 2] = Math.random() * 80;
    phase[i] = Math.random() * 100;
    const k = cols[i % cols.length];
    color.set([k.r, k.g, k.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uScale: { value: 300 } },
    vertexShader: /* glsl */`
      uniform float uTime, uScroll, uScale;
      attribute float aPhase;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vA;
      void main() {
        vec3 p = position;
        p.z = mod(p.z + uScroll, 80.0) - 66.0;
        p.y += sin(uTime * 0.7 + aPhase) * 0.5;
        p.x += cos(uTime * 0.5 + aPhase * 1.3) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * 2.3 + aPhase * 3.0);
        gl_PointSize = uScale * 0.16 * tw / -mv.z;
        vA = smoothstep(-66.0, -50.0, p.z) * smoothstep(14.0, 4.0, p.z) * (0.5 + 0.5 * tw);
        vColor = aColor;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        float core = smoothstep(0.12, 0.0, d);
        gl_FragColor = vec4(vColor + core, a * a * vA);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

// Lointain du Japon : mont Fuji, chaînes en couches, brume, soleil, arc-en-ciel
export function japanFar() {
  return [makeFuji(), makeRidges(), makeMist(560, 70, 0.75), makeMist(380, 45, 0.55), makeSunGlow(), makeRainbow()];
}

// Ciel + lointain + nuages + lucioles. Chaque niveau fournit ses couleurs et ses objets lointains.
export class Scenery {
  constructor(root, { sky = SKY, far = japanFar, fujiCap = true, sunDir = SUN_DIR, fireflyColors } = {}) {
    this.sky = makeSky(sky, sunDir);
    root.add(this.sky);

    this.far = new THREE.Group();
    const objs = far();
    this.far.add(...objs);
    // objets lointains animés (ex. scintillement des lumières) : userData.tick(t, pixelRatio)
    this.tickers = objs.filter((o) => o.userData && o.userData.tick);
    const { group, clouds } = makeClouds(fujiCap);
    this.clouds = clouds;
    this.far.add(group);
    root.add(this.far);

    this.fireflies = makeFireflies(fireflyColors);
    root.add(this.fireflies);
  }

  update(dt, pz, camera, pixelRatio) {
    const t = performance.now() / 1000;
    this.sky.position.copy(camera.position);
    this.sky.material.uniforms.time.value = t;
    this.far.position.z = pz;
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 1000) c.position.x -= 2000;
    }
    const u = this.fireflies.material.uniforms;
    u.uTime.value = t;
    u.uScroll.value = -pz * 0.45;
    u.uScale.value = window.innerHeight * pixelRatio;
    this.fireflies.position.z = pz;
    for (const o of this.tickers) o.userData.tick(t, pixelRatio);
  }
}
