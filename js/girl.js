import * as THREE from 'three';

const COL = {
  skin: '#ffe6d8',
  hair: '#f8d874',
  hairDark: '#ecbd52',
  hairLight: '#fff4c2',
  dress: '#ff9cc4',
  dressDark: '#f27fae',
  white: '#ffffff',
  cream: '#fff6ee',
  red: '#e2475a',
  shoe: '#d64561',
  ribbon: '#ff6fa5',
  sakura: '#ffc6dc',
  sakuraCenter: '#ffd84a',
  dark: '#2b1830',
};

function toonGradient(levels) {
  const t = new THREE.DataTexture(new Uint8Array(levels), levels.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// ---------- Visage dessiné (texture sur la sphère de la tête, centrée en u = 0.75) ----------
const FACE_W = 1024, FACE_H = 512, FCX = 768, EYE_Y = 268, EYE_DX = 62;

function drawFace(kind) {
  const c = document.createElement('canvas');
  c.width = FACE_W;
  c.height = FACE_H;
  const g = c.getContext('2d');
  g.fillStyle = COL.skin;
  g.fillRect(0, 0, FACE_W, FACE_H);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // joues roses
  for (const sx of [-1, 1]) {
    const bx = FCX + sx * 100, by = 306;
    const grd = g.createRadialGradient(bx, by, 2, bx, by, 34);
    grd.addColorStop(0, 'rgba(255,120,155,0.6)');
    grd.addColorStop(1, 'rgba(255,120,155,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(bx, by, 36, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(235,95,130,0.65)';
    g.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(bx + i * 11 - 4, by + 7);
      g.lineTo(bx + i * 11 + 4, by - 7);
      g.stroke();
    }
  }

  // sourcils fins
  g.strokeStyle = '#c99a50';
  g.lineWidth = 4;
  for (const sx of [-1, 1]) {
    const ex = FCX + sx * EYE_DX;
    g.beginPath();
    g.moveTo(ex - 22, EYE_Y - 62 + (sx < 0 ? 4 : 0));
    g.quadraticCurveTo(ex, EYE_Y - 72, ex + 22, EYE_Y - 62 + (sx > 0 ? 4 : 0));
    g.stroke();
  }

  for (const sx of [-1, 1]) {
    const ex = FCX + sx * EYE_DX, ey = EYE_Y;
    g.strokeStyle = COL.dark;
    g.fillStyle = COL.dark;
    if (kind === 'open') {
      // blanc
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(ex, ey + 2, 34, 41, 0, 0, Math.PI * 2); g.fill();
      // iris en dégradé
      const grd = g.createLinearGradient(0, ey - 36, 0, ey + 42);
      grd.addColorStop(0, '#2a1440');
      grd.addColorStop(0.5, '#6b3b9e');
      grd.addColorStop(1, '#d6a8ff');
      g.fillStyle = grd;
      g.beginPath(); g.ellipse(ex, ey + 4, 29, 38, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a0b28';
      g.beginPath(); g.ellipse(ex, ey + 2, 13, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(245,225,255,0.75)';
      g.beginPath(); g.ellipse(ex, ey + 30, 17, 7, 0, 0, Math.PI * 2); g.fill();
      // reflets
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(ex - 10, ey - 13, 11, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ex + 12, ey + 15, 5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ex + 9, ey - 21, 3, 0, Math.PI * 2); g.fill();
      // cils
      g.strokeStyle = COL.dark;
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(ex - 37, ey - 22);
      g.quadraticCurveTo(ex, ey - 50, ex + 37, ey - 22);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(ex + sx * 34, ey - 26);
      g.lineTo(ex + sx * 50, ey - 36);
      g.moveTo(ex + sx * 36, ey - 18);
      g.lineTo(ex + sx * 50, ey - 22);
      g.stroke();
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(ex + sx * 14, ey + 45);
      g.quadraticCurveTo(ex + sx * 28, ey + 42, ex + sx * 32, ey + 32);
      g.stroke();
    } else if (kind === 'blink') {
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(ex - 34, ey + 4);
      g.quadraticCurveTo(ex, ey + 22, ex + 34, ey + 4);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(ex + sx * 32, ey + 6);
      g.lineTo(ex + sx * 46, ey);
      g.stroke();
    } else if (kind === 'happy') {
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(ex - 32, ey + 14);
      g.quadraticCurveTo(ex, ey - 30, ex + 32, ey + 14);
      g.stroke();
    } else if (kind === 'ouch') {
      g.lineWidth = 9;
      const d = -sx; // > à gauche, < à droite
      g.beginPath();
      g.moveTo(ex - d * 24, ey - 22);
      g.lineTo(ex + d * 22, ey);
      g.lineTo(ex - d * 24, ey + 22);
      g.stroke();
      g.fillStyle = 'rgba(140,200,255,0.9)';
      g.beginPath(); g.ellipse(ex + sx * 34, ey + 34, 7, 11, 0, 0, Math.PI * 2); g.fill();
    }
  }

  // petit nez
  g.fillStyle = 'rgba(225,140,130,0.6)';
  g.beginPath(); g.arc(FCX, 304, 3, 0, Math.PI * 2); g.fill();

  // bouche
  const my = 336;
  if (kind === 'happy' || kind === 'ouch') {
    g.fillStyle = '#b8344b';
    g.beginPath();
    if (kind === 'happy') {
      g.moveTo(FCX - 20, my - 6);
      g.quadraticCurveTo(FCX, my + 34, FCX + 20, my - 6);
      g.closePath();
    } else {
      g.ellipse(FCX, my + 2, 11, 9, 0, 0, Math.PI * 2);
    }
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#ff8fa6';
    g.beginPath(); g.ellipse(FCX, my + 14, 12, 7, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  } else {
    g.strokeStyle = '#a63b4c';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(FCX - 9, my - 2, 9, 0.1, Math.PI - 0.1);
    g.moveTo(FCX + 17.5, my - 1);
    g.arc(FCX + 9, my - 2, 9, 0.1, Math.PI - 0.1);
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const lerp = (a, b, k) => a + (b - a) * k;

export class Girl {
  constructor() {
    const grad = toonGradient([120, 195, 255]);
    const mats = {};
    const m = (c) => (mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: grad }));
    const sph = new THREE.SphereGeometry(1, 20, 14);
    const cyl = (rt, rb, h, seg = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

    const add = (parent, geo, mat, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], order = 'XYZ') => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...p);
      mesh.scale.set(...s);
      mesh.rotation.order = order;
      mesh.rotation.set(...r);
      parent.add(mesh);
      return mesh;
    };
    const group = (parent, p = [0, 0, 0]) => {
      const g = new THREE.Group();
      g.position.set(...p);
      parent.add(g);
      return g;
    };
    // noeud : deux boucles, un noeud central et deux pans
    const bow = (parent, p, size, color, dots = false, r = [0, 0, 0]) => {
      const b = group(parent, p);
      b.rotation.set(...r);
      for (const sx of [-1, 1]) {
        add(b, sph, m(color), [sx * size * 0.95, size * 0.1, 0], [size, size * 0.62, size * 0.38], [0, 0, -sx * 0.35]);
        add(b, sph, m(color), [sx * size * 0.45, -size * 1.0, 0], [size * 0.3, size * 0.8, size * 0.16], [0, 0, sx * 0.35]);
        if (dots) {
          add(b, sph, m(COL.white), [sx * size * 1.2, size * 0.25, -size * 0.32], [size * 0.16, size * 0.16, size * 0.06]);
          add(b, sph, m(COL.white), [sx * size * 0.75, -size * 0.15, -size * 0.34], [size * 0.12, size * 0.12, size * 0.05]);
        }
      }
      add(b, sph, m(color), [0, 0, 0], [size * 0.38, size * 0.38, size * 0.38]);
      return b;
    };

    // root : position monde ; pivot : rotation (roulade/chute) ; body : modèle (pieds à y = 0, visage vers -z)
    this.root = new THREE.Group();
    this.pivot = group(this.root, [0, 0.55, 0]);
    this.body = group(this.pivot, [0, -0.55, 0]);
    const B = this.body;

    // ---------- Jambes : chaussettes hautes à volant, babies à bride ----------
    this.legs = [-1, 1].map((sx) => {
      const leg = group(B, [sx * 0.09, 0.62, 0]);
      add(leg, cyl(0.058, 0.052, 0.56), m(COL.skin), [0, -0.28, 0]);
      add(leg, cyl(0.062, 0.056, 0.36), m(COL.white), [0, -0.4, 0]);
      add(leg, new THREE.TorusGeometry(0.064, 0.016, 6, 16), m(COL.white), [0, -0.22, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      bow(leg, [sx * 0.03, -0.24, -0.06], 0.028, COL.ribbon);
      add(leg, sph, m(COL.shoe), [0, -0.59, -0.035], [0.072, 0.058, 0.12]);
      add(leg, new THREE.BoxGeometry(0.15, 0.018, 0.03), m(COL.shoe), [0, -0.54, -0.02]);
      add(leg, sph, m(COL.cream), [0, -0.635, -0.035], [0.074, 0.018, 0.122]);
      return leg;
    });

    // ---------- Jupe plissée + jupon en dentelle ----------
    add(B, cyl(0.2, 0.42, 0.06, 24), m(COL.white), [0, 0.605, 0]);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      add(B, sph, m(COL.white), [Math.cos(a) * 0.41, 0.585, Math.sin(a) * 0.41], [0.045, 0.035, 0.045]);
    }
    add(B, cyl(0.19, 0.39, 0.34, 12), m(COL.dress), [0, 0.78, 0]);
    add(B, cyl(0.392, 0.392, 0.025, 12, true), m(COL.dressDark), [0, 0.64, 0]);

    // ---------- Haut ----------
    add(B, cyl(0.15, 0.195, 0.36), m(COL.dress), [0, 1.1, 0]);
    add(B, cyl(0.2, 0.2, 0.09), m(COL.red), [0, 0.95, 0]);
    // gros noeud dans le dos
    bow(B, [0, 0.96, 0.22], 0.12, COL.red, false, [0, Math.PI, 0]);
    // col marin
    add(B, new THREE.BoxGeometry(0.34, 0.2, 0.02), m(COL.white), [0, 1.2, 0.165], [1, 1, 1], [-0.28, 0, 0]);
    add(B, new THREE.BoxGeometry(0.3, 0.014, 0.022), m(COL.ribbon), [0, 1.135, 0.185], [1, 1, 1], [-0.28, 0, 0]);
    add(B, new THREE.TorusGeometry(0.13, 0.035, 8, 22), m(COL.white), [0, 1.27, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    for (const sx of [-1, 1]) {
      add(B, new THREE.BoxGeometry(0.11, 0.17, 0.02), m(COL.white), [sx * 0.07, 1.2, -0.15], [1, 1, 1], [0.3, 0, sx * 0.5]);
    }
    bow(B, [0, 1.17, -0.19], 0.06, COL.red, false, [0.2, 0, 0]);
    for (const y of [1.05, 0.995]) add(B, sph, m(COL.white), [0, y, -0.19], [0.018, 0.018, 0.012]);
    add(B, cyl(0.052, 0.052, 0.1), m(COL.skin), [0, 1.32, 0]);

    // ---------- Sac à dos lapin ----------
    const bag = group(B, [0, 1.1, 0.24]);
    add(bag, sph, m(COL.white), [0, 0, 0], [0.13, 0.14, 0.08]);
    for (const sx of [-1, 1]) {
      add(bag, sph, m(COL.white), [sx * 0.06, 0.17, -0.01], [0.035, 0.1, 0.03], [0, 0, -sx * 0.25]);
      add(bag, sph, m(COL.sakura), [sx * 0.06, 0.17, 0.012], [0.02, 0.07, 0.02], [0, 0, -sx * 0.25]);
      add(bag, sph, m(COL.dark), [sx * 0.04, 0.02, 0.074], [0.014, 0.018, 0.01]);
      add(bag, sph, m('#ffb3c7'), [sx * 0.07, -0.025, 0.066], [0.022, 0.014, 0.01]);
      add(bag, new THREE.TorusGeometry(0.1, 0.012, 6, 12, Math.PI), m(COL.ribbon), [sx * 0.11, 0.0, -0.1], [1, 1.2, 1], [0, Math.PI / 2, 0]);
    }
    add(bag, sph, m('#ff8fa6'), [0, -0.005, 0.078], [0.012, 0.01, 0.008]);

    // ---------- Bras : manches ballon, poignets blancs, mains ----------
    this.arms = [-1, 1].map((sx) => {
      const arm = group(B, [sx * 0.2, 1.24, 0]);
      add(arm, sph, m(COL.dress), [0, -0.04, 0], [0.095, 0.095, 0.095]);
      add(arm, new THREE.TorusGeometry(0.06, 0.018, 6, 14), m(COL.white), [0, -0.115, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      add(arm, cyl(0.04, 0.036, 0.3), m(COL.skin), [0, -0.25, 0]);
      add(arm, sph, m(COL.skin), [0, -0.41, 0], [0.052, 0.058, 0.045]);
      add(arm, sph, m(COL.skin), [-sx * 0.035, -0.39, -0.02], [0.02, 0.03, 0.02], [0, 0, sx * 0.4]);
      return arm;
    });

    // ---------- Tête ----------
    const H = (this.head = group(B, [0, 1.63, 0]));
    H.scale.setScalar(1.06);
    this.faceTex = { open: drawFace('open'), blink: drawFace('blink'), happy: drawFace('happy'), ouch: drawFace('ouch') };
    this.faceMat = new THREE.MeshToonMaterial({ map: this.faceTex.open, gradientMap: toonGradient([200, 235, 255]) });
    add(H, new THREE.SphereGeometry(1, 48, 32), this.faceMat, [0, 0, 0], [0.34, 0.34, 0.34]);
    this.face = 'open';
    for (const sx of [-1, 1]) add(H, sph, m(COL.skin), [sx * 0.33, -0.03, 0.02], [0.04, 0.06, 0.04]);

    // calotte de cheveux, décalée vers l'arrière pour dégager le visage
    add(H, sph, m(COL.hair), [0, 0.05, 0.075], [0.372, 0.372, 0.372]);
    // reflet "anneau d'ange"
    add(H, new THREE.TorusGeometry(0.336, 0.012, 6, 40, Math.PI * 1.25), m(COL.hairLight), [0, 0.2, 0.075], [1, 1, 1],
      [Math.PI / 2, 0, Math.PI * 0.12]);
    // frange en mèches pointues
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.2;
      const lat = 0.42 - Math.abs(i) * 0.03;
      const R = 0.35;
      const len = 0.25 - Math.abs(i) * 0.012 + (i === 0 ? -0.03 : 0);
      add(H, new THREE.ConeGeometry(0.075, len, 8), m(i % 2 ? COL.hair : COL.hairDark),
        [Math.sin(a) * Math.cos(lat) * R, Math.sin(lat) * R - 0.02, -Math.cos(a) * Math.cos(lat) * R],
        [1, 1, 0.6], [0.42, -a, Math.PI], 'YXZ');
    }
    // mèches latérales encadrant le visage
    for (const sx of [-1, 1]) {
      add(H, sph, m(COL.hair), [sx * 0.29, -0.06, -0.13], [0.075, 0.23, 0.08], [0.15, 0, sx * 0.12]);
      add(H, new THREE.ConeGeometry(0.06, 0.16, 8), m(COL.hairDark), [sx * 0.27, -0.33, -0.15], [1, 1, 0.8], [0.2, 0, Math.PI + sx * 0.15]);
    }
    // mèches de l'arrière (vues pendant la course)
    for (let i = -2; i <= 2; i++) {
      add(H, sph, m(i % 2 ? COL.hairDark : COL.hair), [i * 0.1, -0.2, 0.25 - Math.abs(i) * 0.04],
        [0.085, 0.2, 0.08], [-0.35, i * 0.15, i * 0.15]);
    }
    // épi (ahoge)
    add(H, new THREE.TorusGeometry(0.08, 0.016, 6, 14, Math.PI * 1.1), m(COL.hair), [0.06, 0.4, 0.02], [1, 1, 1], [0, 0.35, -0.5]);
    // barrette fleur de sakura
    const flower = group(H, [-0.21, 0.24, -0.23]);
    flower.rotation.set(-0.6, 0.6, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add(flower, sph, m(COL.sakura), [Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0], [0.032, 0.022, 0.012], [0, 0, a]);
    }
    add(flower, sph, m(COL.sakuraCenter), [0, 0, -0.006], [0.014, 0.014, 0.01]);

    // ---------- Couettes longues et ondulées ----------
    this.tails = [-1, 1].map((sx) => {
      const t = group(H, [sx * 0.31, 0.15, 0.1]);
      const seg = [
        [0.05, -0.1, 0.0, 0.12, 0.17],
        [0.11, -0.28, 0.03, 0.135, 0.18],
        [0.13, -0.48, 0.05, 0.125, 0.18],
        [0.1, -0.68, 0.05, 0.105, 0.16],
        [0.05, -0.85, 0.03, 0.08, 0.13],
      ];
      seg.forEach(([x, y, z, r, h], i) => {
        add(t, sph, m(i === seg.length - 1 ? COL.hairDark : COL.hair), [sx * x, y, z], [r, h, r * 0.95], [0, 0, sx * (0.35 - i * 0.18)]);
      });
      add(t, new THREE.TorusGeometry(0.055, 0.03, 8, 14, Math.PI * 1.5), m(COL.hair), [sx * 0.07, -0.98, 0.02], [1, 1, 1], [0, Math.PI / 2, 0.6]);
      add(t, sph, m(COL.ribbon), [0, 0, 0], [0.05, 0.05, 0.05]);
      bow(t, [sx * 0.02, 0.07, 0.0], 0.085, COL.ribbon, true, [0, sx * 0.45, sx * 0.35]);
      return t;
    });

    this.phase = 0;
    this.blinkT = 0;
    this.nextBlink = 2.5;
    this.happyT = 0;
    this.deadT = 0;
  }

  setFace(kind) {
    if (this.face === kind) return;
    this.face = kind;
    this.faceMat.map = this.faceTex[kind];
  }

  reset() {
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.body.position.y = -0.55;
    this.root.rotation.set(0, 0, 0);
    this.deadT = 0;
    this.setFace('open');
  }

  // mode : 'idle' | 'run' | 'jump' | 'roll' | 'dead'
  animate(mode, dt, { speed = 14, slideFrac = 0, vy = 0 } = {}) {
    const k = 1 - Math.exp(-dt * 16);
    const t = performance.now() / 1000;
    const [legL, legR] = this.legs;
    const [armL, armR] = this.arms;
    const tgt = {
      legL: 0, legR: 0, armLx: 0, armRx: 0, armLz: -0.2, armRz: 0.2,
      bodyY: 0, lean: 0, tailX: -0.1, tailZ: 0, headZ: 0, headX: 0,
    };

    if (mode === 'run' || mode === 'roll') {
      this.phase += dt * (8 + speed * 0.22);
      const s = Math.sin(this.phase);
      tgt.legL = s * 0.95; tgt.legR = -s * 0.95;
      tgt.armLx = -s * 0.85; tgt.armRx = s * 0.85;
      tgt.bodyY = Math.abs(s) * 0.07;
      tgt.lean = -0.12;
      tgt.tailX = -0.5 + Math.sin(this.phase * 2) * 0.12;
      tgt.tailZ = s * 0.14;
      tgt.headZ = s * 0.05;
    } else if (mode === 'jump') {
      tgt.legL = 0.8; tgt.legR = -0.35;
      tgt.armLz = -2.4; tgt.armRz = 2.4;
      tgt.lean = -0.05;
      tgt.tailX = vy > 0 ? -0.2 : -1.2;
      tgt.headX = 0.1;
    } else if (mode === 'idle') {
      tgt.bodyY = Math.sin(t * 2.2) * 0.02;
      tgt.armRz = 2.55 + Math.sin(t * 8) * 0.3;
      tgt.armLz = -0.25;
      tgt.headZ = Math.sin(t * 1.4) * 0.12;
      tgt.tailZ = Math.sin(t * 2.2) * 0.1;
      tgt.tailX = Math.sin(t * 1.7) * 0.06;
    } else if (mode === 'dead') {
      tgt.armLz = -2.2; tgt.armRz = 2.2;
      tgt.legL = 0.6; tgt.legR = -0.2;
      tgt.tailX = -1.4;
    }

    legL.rotation.x = lerp(legL.rotation.x, tgt.legL, k);
    legR.rotation.x = lerp(legR.rotation.x, tgt.legR, k);
    armL.rotation.x = lerp(armL.rotation.x, tgt.armLx, k);
    armR.rotation.x = lerp(armR.rotation.x, tgt.armRx, k);
    armL.rotation.z = lerp(armL.rotation.z, tgt.armLz, k);
    armR.rotation.z = lerp(armR.rotation.z, tgt.armRz, k);
    this.body.position.y = lerp(this.body.position.y, -0.55 + tgt.bodyY, k);
    this.body.rotation.x = lerp(this.body.rotation.x, tgt.lean, k);
    this.head.rotation.z = lerp(this.head.rotation.z, tgt.headZ, k);
    this.head.rotation.x = lerp(this.head.rotation.x, tgt.headX, k);
    for (const tl of this.tails) {
      tl.rotation.x = lerp(tl.rotation.x, tgt.tailX, k);
      tl.rotation.z = lerp(tl.rotation.z, tgt.tailZ, k);
    }

    // roulade
    if (mode === 'roll') {
      this.pivot.rotation.x = -slideFrac * Math.PI * 2;
      const sq = Math.sin(slideFrac * Math.PI);
      this.pivot.scale.set(1 - sq * 0.15, 1 - sq * 0.5, 1 - sq * 0.15);
      this.pivot.position.y = 0.55 - sq * 0.15;
    } else if (mode === 'dead') {
      this.deadT += dt;
      this.pivot.rotation.x = lerp(this.pivot.rotation.x, 1.35, 1 - Math.exp(-dt * 8));
      this.pivot.position.y = 0.55 + Math.max(0, Math.sin(Math.min(this.deadT * 5, Math.PI))) * 0.4;
    } else {
      this.pivot.rotation.x = lerp(this.pivot.rotation.x, 0, 1 - Math.exp(-dt * 20));
      this.pivot.scale.lerp(new THREE.Vector3(1, 1, 1), k);
      this.pivot.position.y = 0.55;
    }

    // expressions : clignement, sourire en saut / en saluant, >< en cas de choc
    this.blinkT -= dt;
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blinkT = 0.13; this.nextBlink = 2.5 + Math.random() * 2.5; }
    if (mode === 'idle') {
      this.happyT -= dt;
      if (this.happyT < -4) this.happyT = 1.4;
    }
    let face = 'open';
    if (mode === 'dead') face = 'ouch';
    else if (mode === 'jump' || mode === 'roll' || (mode === 'idle' && this.happyT > 0)) face = 'happy';
    else if (this.blinkT > 0) face = 'blink';
    this.setFace(face);
  }
}
