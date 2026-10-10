import * as THREE from 'three';

const COL = {
  skin: '#ffe3d3',
  hair: '#f7d672',
  hairDark: '#eabf4e',
  dress: '#ff9cc4',
  white: '#ffffff',
  obi: '#e2475a',
  shoe: '#d64561',
  eye: '#3b2347',
  eye2: '#8a5bb5',
  blush: '#ff9bb0',
  mouth: '#b8404f',
  ribbon: '#ff6fa5',
};

function toonGradient() {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

const lerp = (a, b, k) => a + (b - a) * k;

export class Girl {
  constructor() {
    const grad = toonGradient();
    const mats = {};
    const m = (c) => (mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: grad }));
    const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
    const sph = new THREE.SphereGeometry(1, 20, 14);
    const cyl = (rt, rb, h, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);

    const add = (parent, geo, mat, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...p);
      mesh.scale.set(...s);
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

    // root : position monde ; pivot : rotation (roulade/chute) ; body : tout le modèle (pieds à y = 0)
    this.root = new THREE.Group();
    this.pivot = group(this.root, [0, 0.55, 0]);
    this.body = group(this.pivot, [0, -0.55, 0]);
    const B = this.body;

    // Jambes
    this.legs = [-1, 1].map((sx) => {
      const leg = group(B, [sx * 0.09, 0.62, 0]);
      add(leg, cyl(0.06, 0.055, 0.56), m(COL.skin), [0, -0.28, 0]);
      add(leg, cyl(0.064, 0.059, 0.3), m(COL.white), [0, -0.42, 0]);
      add(leg, sph, m(COL.shoe), [0, -0.59, -0.03], [0.075, 0.06, 0.12]);
      return leg;
    });

    // Robe
    add(B, cyl(0.19, 0.38, 0.34, 18), m(COL.dress), [0, 0.76, 0]);
    add(B, new THREE.TorusGeometry(0.37, 0.035, 6, 24), m(COL.white), [0, 0.6, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    add(B, cyl(0.16, 0.2, 0.36), m(COL.dress), [0, 1.1, 0]);
    add(B, cyl(0.207, 0.207, 0.09), m(COL.obi), [0, 0.95, 0]);
    // gros noeud dans le dos
    const bow = group(B, [0, 0.97, 0.21]);
    add(bow, sph, m(COL.obi), [-0.12, 0.01, 0], [0.12, 0.08, 0.05], [0, 0, 0.2]);
    add(bow, sph, m(COL.obi), [0.12, 0.01, 0], [0.12, 0.08, 0.05], [0, 0, -0.2]);
    add(bow, sph, m(COL.obi), [0, 0, 0.02], [0.045, 0.045, 0.045]);
    add(bow, sph, m(COL.obi), [-0.06, -0.13, 0], [0.035, 0.11, 0.02], [0, 0, -0.3]);
    add(bow, sph, m(COL.obi), [0.06, -0.13, 0], [0.035, 0.11, 0.02], [0, 0, 0.3]);
    // col marin
    add(B, new THREE.TorusGeometry(0.13, 0.035, 6, 20), m(COL.white), [0, 1.28, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    add(B, new THREE.BoxGeometry(0.3, 0.17, 0.02), m(COL.white), [0, 1.2, 0.17], [1, 1, 1], [-0.25, 0, 0]);
    add(B, sph, m(COL.obi), [0, 1.22, -0.17], [0.05, 0.035, 0.03]);
    add(B, cyl(0.055, 0.055, 0.1), m(COL.skin), [0, 1.32, 0]);

    // Bras
    this.arms = [-1, 1].map((sx) => {
      const arm = group(B, [sx * 0.2, 1.24, 0]);
      add(arm, sph, m(COL.dress), [0, -0.03, 0], [0.085, 0.085, 0.085]);
      add(arm, cyl(0.042, 0.038, 0.36), m(COL.skin), [0, -0.21, 0]);
      add(arm, sph, m(COL.skin), [0, -0.4, 0], [0.05, 0.05, 0.05]);
      arm.userData.sx = sx;
      return arm;
    });

    // Tête (visage vers -z)
    const H = (this.head = group(B, [0, 1.62, 0]));
    add(H, sph, m(COL.skin), [0, 0, 0], [0.34, 0.34, 0.34]);
    add(H, sph, m(COL.hair), [0, 0.035, 0.045], [0.37, 0.37, 0.37]);
    for (const [x, y, z, sx] of [[-0.13, 0.17, -0.25, 0.13], [0.13, 0.17, -0.25, 0.13], [0, 0.2, -0.27, 0.12]]) {
      add(H, sph, m(COL.hair), [x, y, z], [sx, 0.09, 0.08]);
    }
    for (const sx of [-1, 1]) add(H, sph, m(COL.hair), [sx * 0.29, -0.12, -0.12], [0.07, 0.2, 0.08], [0, 0, sx * 0.1]);
    add(H, new THREE.ConeGeometry(0.03, 0.18, 6), m(COL.hair), [0.02, 0.42, 0.02], [1, 1, 1], [-0.6, 0, 0.3]);

    // Yeux kawaii
    this.eyes = [-1, 1].map((sx) => {
      const e = group(H, [sx * 0.125, -0.03, -0.305]);
      e.rotation.y = -sx * 0.38;
      add(e, sph, basic(COL.eye), [0, 0, 0], [0.075, 0.095, 0.03]);
      add(e, sph, basic(COL.eye2), [0, -0.035, -0.012], [0.05, 0.045, 0.02]);
      add(e, sph, basic(COL.white), [-sx * 0.025, 0.035, -0.028], [0.024, 0.024, 0.01]);
      add(e, sph, basic(COL.white), [sx * 0.02, -0.03, -0.028], [0.012, 0.012, 0.01]);
      add(e, new THREE.BoxGeometry(0.165, 0.026, 0.02), basic(COL.eye), [0, 0.088, -0.012]);
      return e;
    });
    for (const sx of [-1, 1]) {
      const b = add(H, sph, basic(COL.blush), [sx * 0.2, -0.115, -0.25], [0.065, 0.035, 0.015]);
      b.rotation.y = -sx * 0.67;
    }
    add(H, sph, basic(COL.mouth), [0, -0.165, -0.297], [0.035, 0.022, 0.01]);

    // Couettes
    this.tails = [-1, 1].map((sx) => {
      const t = group(H, [sx * 0.32, 0.12, 0.08]);
      add(t, sph, m(COL.ribbon), [0, 0, 0], [0.055, 0.055, 0.055]);
      add(t, sph, m(COL.ribbon), [sx * 0.02, 0.07, -0.02], [0.03, 0.08, 0.06], [0.3, 0, sx * -0.5]);
      add(t, sph, m(COL.ribbon), [sx * 0.02, 0.07, 0.07], [0.03, 0.08, 0.06], [-0.3, 0, sx * -0.5]);
      add(t, sph, m(COL.hair), [sx * 0.06, -0.34, 0.02], [0.13, 0.36, 0.13], [0, 0, sx * 0.15]);
      add(t, sph, m(COL.hairDark), [sx * 0.12, -0.66, 0], [0.09, 0.12, 0.09]);
      return t;
    });

    this.phase = 0;
    this.blink = 0;
    this.rollT = 0;
    this.deadT = 0;
  }

  reset() {
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.body.position.y = -0.55;
    this.root.rotation.set(0, 0, 0);
    this.deadT = 0;
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
      tgt.tailX = -0.45 + Math.sin(this.phase * 2) * 0.12;
      tgt.tailZ = s * 0.12;
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
      tgt.tailZ = Math.sin(t * 2.2) * 0.08;
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

    // clignement des yeux
    this.blink -= dt;
    if (this.blink < -3 - Math.random() * 2) this.blink = 0.12;
    const ey = this.blink > 0 ? 0.12 : 1;
    for (const e of this.eyes) e.scale.y = ey;
  }
}
