import * as THREE from 'three';
import { LANES } from './config.js';
import { Builder, U, vcMat, pick, rand } from './geo.js';
import * as TX from './textures.js';
import { Scenery, FOG_COLOR } from './scenery.js';
import { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuildDecor } from './decor.js';

const TRACK_LEN = 600;
const BANDS = {
  near: { x: (w) => 5.4 + w / 2 + rand(0, 0.6), gap: () => rand(0.3, 3) },
  mid: { x: (w) => 8.6 + w / 2 + rand(0, 2.5), gap: () => rand(0.4, 4) },
  far: { x: (w) => 22 + w / 2 + rand(0, 28), gap: () => rand(2, 12) },
};

export function themeAt(z) {
  const zone = Math.floor(Math.max(0, -z) / THEME_LEN);
  return THEME_ORDER[zone % THEME_ORDER.length];
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.special = prebuildDecor();

    scene.fog = new THREE.Fog(FOG_COLOR, 80, 270);

    const hemi = new THREE.HemisphereLight('#e6ecff', '#a8b97a', 1.75);
    const sun = new THREE.DirectionalLight('#ffe9cf', 2.1);
    sun.position.set(-0.6, 1, 0.5);
    scene.add(hemi, sun);

    this.buildTrack();
    this.scenery = new Scenery(scene);
    this.buildPetals();
  }

  buildTrack() {
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    this.grassTex = TX.grassTexture();
    this.grassTex.repeat.set(60, 60);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_LEN, TRACK_LEN),
      new THREE.MeshLambertMaterial({ map: this.grassTex }));
    grass.rotation.x = -Math.PI / 2;
    this.trackGroup.add(grass);

    this.gravelTex = TX.gravelTexture();
    this.gravelTex.repeat.set(3, TRACK_LEN / 3);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(9, TRACK_LEN),
      new THREE.MeshLambertMaterial({ map: this.gravelTex }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0.01;
    this.trackGroup.add(bed);

    this.sleeperTex = TX.sleeperTexture();
    this.sleeperTex.repeat.set(1, TRACK_LEN / 1.3);
    const sleeperMat = new THREE.MeshLambertMaterial({ map: this.sleeperTex, transparent: true, alphaTest: 0.5 });
    const sleeperGeo = new THREE.PlaneGeometry(2.3, TRACK_LEN);
    const b = new Builder();
    for (const x of LANES) {
      const s = new THREE.Mesh(sleeperGeo, sleeperMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, 0.02, 0);
      this.trackGroup.add(s);
      for (const dx of [-0.72, 0.72]) {
        b.add(U.box, '#7d8288', [x + dx, 0.08, 0], [0.12, 0.12, TRACK_LEN]);
        b.add(U.box, '#c9ced3', [x + dx, 0.145, 0], [0.08, 0.02, TRACK_LEN]);
      }
    }
    for (const x of [-4.6, 4.6]) b.add(U.box, '#a9a397', [x, 0.08, 0], [0.35, 0.16, TRACK_LEN]);
    this.trackGroup.add(new THREE.Mesh(b.build(), vcMat));

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({ map: TX.shadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    this.shadow = sh;
    this.scene.add(sh);
  }

  buildPetals() {
    const N = 260;
    const pos = new Float32Array(N * 3);
    this.petalSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rand(-18, 18);
      pos[i * 3 + 1] = rand(0, 12);
      pos[i * 3 + 2] = rand(-45, 10);
      this.petalSeed[i] = Math.random() * 10;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.petals = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.28, map: TX.petalTexture(), transparent: true, depthWrite: false, alphaTest: 0.1,
    }));
    this.scene.add(this.petals);
  }

  reset(startZ) {
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items = [];
    this.cursors = { '-1': {}, '1': {} };
    for (const s of ['-1', '1']) for (const band of Object.keys(BANDS)) this.cursors[s][band] = startZ + 140 - rand(0, 8);
    this.toriiCursor = startZ - 60;
    this.update(0, startZ, 0);
  }

  spawnItem(side, band, z) {
    const theme = THEMES[themeAt(z)];
    const type = weighted(theme[band]);
    if (!type) return z - rand(2, 6);
    const d = DECOR[type];
    const mesh = new THREE.Mesh(pick(d.geos), vcMat);
    const x = side * BANDS[band].x(d.w);
    mesh.position.set(x, 0, z - d.len / 2);
    mesh.rotation.y = d.face ? (side > 0 ? Math.PI : 0) : Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.items.push({ mesh, zFar: z - d.len });
    return z - d.len - BANDS[band].gap();
  }

  update(dt, pz, speed) {
    const ahead = pz - 250;
    for (const s of [-1, 1]) {
      const cur = this.cursors[String(s)];
      for (const band of Object.keys(BANDS)) {
        while (cur[band] > ahead) cur[band] = this.spawnItem(s, band, cur[band]);
      }
    }
    while (this.toriiCursor > ahead) {
      const mesh = new THREE.Mesh(this.special.bigTorii, vcMat);
      mesh.position.set(0, 0, this.toriiCursor);
      this.scene.add(mesh);
      this.items.push({ mesh, zFar: this.toriiCursor - 1 });
      this.toriiCursor -= themeAt(this.toriiCursor) === 'campagne' ? rand(450, 700) : rand(220, 380);
    }

    // retrait des éléments dépassés
    const limit = pz + 30;
    let j = 0;
    for (const it of this.items) {
      if (it.zFar > limit) this.scene.remove(it.mesh);
      else this.items[j++] = it;
    }
    this.items.length = j;

    // la voie et le sol suivent le joueur, les textures défilent
    this.trackGroup.position.z = pz;
    this.grassTex.offset.y = (-pz / 10) % 1;
    this.gravelTex.offset.y = (-pz / 3) % 1;
    this.sleeperTex.offset.y = (-pz / 1.3) % 1;

    this.updatePetals(dt, pz, speed);
  }

  updatePetals(dt, pz, speed) {
    const p = this.petals.geometry.attributes.position;
    const a = p.array;
    const t = performance.now() / 1000;
    for (let i = 0; i < this.petalSeed.length; i++) {
      const sd = this.petalSeed[i];
      a[i * 3] += Math.sin(t * 1.3 + sd) * dt * 0.8;
      a[i * 3 + 1] -= dt * (0.8 + (sd % 1) * 0.6);
      a[i * 3 + 2] += dt * (speed * 0.15 + 0.6);
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 12;
      if (a[i * 3 + 2] > 10) a[i * 3 + 2] -= 55;
    }
    p.needsUpdate = true;
    this.petals.position.z = pz;
  }

  setShadow(x, groundY, y, z) {
    const s = Math.max(0.4, 1 - (y - groundY) * 0.15);
    this.shadow.position.set(x, groundY + 0.03, z);
    this.shadow.scale.setScalar(s);
  }
}
