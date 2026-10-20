import * as THREE from 'three';
import { LANES } from './config.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, U, vcMat, rand } from './geo.js';
import * as TX from './textures.js';

const TRACK_LEN = 600;
const CHUNK = 32;   // le décor est généré par tranches de 32 m fusionnées en un seul objet
// bandes latérales : écart en z entre éléments et dispersion en x
const BANDS = {
  edge: { spread: 0.4, gap: () => rand(0.5, 3.5) },
  near: { spread: 0.6, gap: () => rand(0.3, 2.5) },
  mid: { spread: 2.5, gap: () => rand(0.3, 3) },
  far: { spread: 28, gap: () => rand(1, 9) },
};

// Fusion incrémentale d'une tranche : les éléments (rotation autour de y + échelle uniforme + teinte)
// sont recopiés dans des tableaux communs, quelques-uns par image, pour ne jamais provoquer d'à-coup.
function startJob(parts, zFar) {
  let n = 0;
  for (const p of parts) n += p.geo.attributes.position.count;
  return { parts, zFar, i: 0, o: 0, P: new Float32Array(n * 3), N: new Float32Array(n * 3), C: new Float32Array(n * 3) };
}
function mergeNext(job) {
  const { geo, x0, z0, rot, sc, tint } = job.parts[job.i++];
  const pa = geo.attributes.position.array, na = geo.attributes.normal.array, ca = geo.attributes.color.array;
  const c = Math.cos(rot), sn = Math.sin(rot);
  const P = job.P, N = job.N, C = job.C, o = job.o, t0 = tint[0], t1 = tint[1], t2 = tint[2];
  for (let i = 0; i < pa.length; i += 3) {
    const x = pa[i], z = pa[i + 2], nx = na[i], nz = na[i + 2];
    P[o + i] = (c * x + sn * z) * sc + x0;
    P[o + i + 1] = pa[i + 1] * sc;
    P[o + i + 2] = (c * z - sn * x) * sc + z0;
    N[o + i] = c * nx + sn * nz;
    N[o + i + 1] = na[i + 1];
    N[o + i + 2] = c * nz - sn * nx;
    C[o + i] = ca[i] * t0; C[o + i + 1] = ca[i + 1] * t1; C[o + i + 2] = ca[i + 2] * t2;
  }
  job.o += pa.length;
  return job.i >= job.parts.length;
}
function finishJob(job) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(job.P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(job.N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(job.C, 3));
  g.computeBoundingSphere();
  return g;
}
// Parties texturées d'une tranche (façades, panneaux lumineux…) : regroupées par matériau, une géométrie chacune
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _tp = new THREE.Vector3(), _ts = new THREE.Vector3(), _ty = new THREE.Vector3(0, 1, 0);
function finishTex(job, mats, mesh) {
  const byKey = {};
  for (const p of job.parts) {
    if (!p.tex) continue;
    _tm.compose(_tp.set(p.x0, 0, p.z0), _tq.setFromAxisAngle(_ty, p.rot), _ts.set(p.sc, p.sc, p.sc));
    for (const t of p.tex) (byKey[t.key] ||= []).push(t.geo.clone().applyMatrix4(_tm));
  }
  for (const k of Object.keys(byKey)) {
    const g = mergeGeometries(byKey[k], false);
    byKey[k].forEach((x) => x.dispose());
    g.computeBoundingSphere();
    mesh.add(new THREE.Mesh(g, mats[k]));
  }
}

// Monde d'un niveau : sol et voie, décor latéral par tranches, lointain, particules.
// Tout le contenu vient de la définition du niveau (def.world) ; tous les objets sont dans `root`.
export class World {
  constructor(root, def) {
    this.scene = root;
    this.def = def;
    this.items = [];
    const D = def.decor;
    this.DECOR = D.DECOR;
    this.THEMES = D.THEMES;
    this.order = D.THEME_ORDER;
    this.themeLen = D.THEME_LEN;
    this.weighted = D.weighted;
    this.special = D.prebuild();

    const L = def.lights;
    const hemi = new THREE.HemisphereLight(L.sky, L.ground, L.hemi);
    const sun = new THREE.DirectionalLight(L.sun, L.sunI);
    sun.position.set(-0.6, 1, 0.5);
    root.add(hemi, sun);
    this.hemi = hemi;
    this.sun = sun;
    this.texMats = D.texMats || {};

    this.buildTrack();
    this.scenery = def.scenery(root);
    this.buildPetals();
  }

  themeAt(z) {
    const zone = Math.floor(Math.max(0, -z) / this.themeLen);
    return this.order[zone % this.order.length];
  }

  buildTrack() {
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    const T = this.def.track;
    this.grassTex = T.ground();
    this.groundTile = T.groundTile || 10;
    this.grassTex.repeat.set(TRACK_LEN / this.groundTile, TRACK_LEN / this.groundTile);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_LEN, TRACK_LEN),
      new THREE.MeshLambertMaterial({ map: this.grassTex }));
    grass.rotation.x = -Math.PI / 2;
    this.trackGroup.add(grass);

    this.gravelTex = T.bed();
    this.gravelTex.repeat.set(3, TRACK_LEN / 3);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(9, TRACK_LEN),
      new THREE.MeshLambertMaterial({ map: this.gravelTex }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0.01;
    this.trackGroup.add(bed);

    this.sleeperTex = T.sleepers();
    this.sleeperTex.repeat.set(1, TRACK_LEN / 1.3);
    const sleeperMat = new THREE.MeshLambertMaterial({ map: this.sleeperTex, transparent: true, alphaTest: 0.5 });
    const sleeperGeo = new THREE.PlaneGeometry(2.3, TRACK_LEN);
    const b = new Builder();
    for (const x of LANES) {
      const s = new THREE.Mesh(sleeperGeo, sleeperMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, 0.02, 0);
      this.trackGroup.add(s);
      if (T.rails === false) continue;   // ex. Paris : pas de rails, seulement l'usure des pavés
      for (const dx of [-0.72, 0.72]) {
        b.add(U.box, T.rail || '#7d8288', [x + dx, 0.08, 0], [0.12, 0.12, TRACK_LEN]);
        b.add(U.box, T.railTop || '#c9ced3', [x + dx, 0.145, 0], [0.08, 0.02, TRACK_LEN]);
      }
    }
    // bandes de pierre qui séparent les voies (optionnel)
    if (T.dividers) {
      for (const x of [-1.3, 1.3]) {
        b.add(U.box, T.dividers, [x, 0.012, 0], [0.28, 0.024, TRACK_LEN]);
        b.add(U.box, T.dividerEdge || '#8a857c', [x, 0.026, 0], [0.32, 0.004, TRACK_LEN]);
      }
    }
    for (const x of [-4.6, 4.6]) b.add(U.box, T.curb || '#a9a397', [x, 0.08, 0], [0.35, 0.16, TRACK_LEN]);
    // marquage au sol sur toute la largeur de la chaussée (optionnel), qui défile avec le sol
    if (T.overlay) {
      this.overlayTex = T.overlay();
      this.overlayTile = T.overlayTile || 6;
      this.overlayTex.repeat.set(1, TRACK_LEN / this.overlayTile);
      const ov = new THREE.Mesh(new THREE.PlaneGeometry(9, TRACK_LEN),
        new THREE.MeshLambertMaterial({ map: this.overlayTex, transparent: true, alphaTest: 0.3 }));
      ov.rotation.x = -Math.PI / 2;
      ov.position.y = 0.025;
      this.trackGroup.add(ov);
    }
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
    const P = this.def.particles || {};
    // couleurs par particule (optionnel) : la texture claire est teintée
    if (P.colors) {
      const cols = P.colors.map((h) => new THREE.Color(h)), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const c = cols[i % cols.length]; col.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    this.petals = new THREE.Points(g, new THREE.PointsMaterial({
      size: P.size || 0.28, map: (P.texture || TX.petalTexture)(), transparent: true, depthWrite: false, alphaTest: 0.1, vertexColors: !!P.colors,
    }));
    this.scene.add(this.petals);
  }

  reset(startZ) {
    for (const it of this.items) this.drop(it);
    this.items = [];
    this.cursors = { '-1': {}, '1': {} };
    for (const s of ['-1', '1']) for (const band of Object.keys(BANDS)) this.cursors[s][band] = startZ + 140 - rand(0, 8);
    this.chunkCursor = startZ + 140;
    this.toriiCursor = startZ - 60;
    this.jobs = [];
    this.update(0, startZ, 0, true);
  }

  drop(it) {
    this.scene.remove(it.mesh);
    if (it.own) it.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  // Ajoute un élément de décor à la tranche en cours ; renvoie le z du prochain élément de la bande
  placeItem(side, band, z, parts) {
    const theme = this.THEMES[this.themeAt(z)];
    const list = theme[band];
    const type = list && list.length ? this.weighted(list) : null;
    if (!type) return z - rand(1.5, 5);
    const d = this.DECOR[type];
    const sc = d.face ? rand(0.95, 1.06) : rand(0.85, 1.18);
    const spread = theme.spread && theme.spread[band] !== undefined ? theme.spread[band] : BANDS[band].spread;
    const x = side * (theme.x[band] + (d.w * sc) / 2 + rand(0, spread));
    const rotY = d.face ? (side > 0 ? Math.PI : 0) : rand(0, Math.PI * 2);
    // légère variation de teinte pour casser la répétition
    const k = rand(0.92, 1.07);
    const vi = (Math.random() * d.geos.length) | 0;
    parts.push({ geo: d.geos[vi], tex: d.texs && d.texs[vi], x0: x, z0: z - (d.len * sc) / 2, rot: rotY, sc, tint: [k * rand(0.97, 1.03), k * rand(0.97, 1.03), k * rand(0.97, 1.03)] });
    // densité de zone appliquée près de la voie seulement (au loin les éléments sont minuscules)
    const mult = theme.mult && theme.mult[band] !== undefined ? theme.mult[band] : band === 'far' ? 1 : theme.dense || 1;
    return z - d.len * sc - BANDS[band].gap() * mult;
  }

  // Construit une tranche de décor [z0, z0 - CHUNK] des deux côtés et la fusionne en un seul objet
  buildChunk(z0) {
    const parts = [];
    const zEnd = z0 - CHUNK;
    let zFar = zEnd;
    for (const s of [-1, 1]) {
      const cur = this.cursors[String(s)];
      for (const band of Object.keys(BANDS)) {
        while (cur[band] > zEnd) {
          cur[band] = this.placeItem(s, band, cur[band], parts);
          zFar = Math.min(zFar, cur[band]);   // la tranche disparaît quand son élément le plus lointain est dépassé
        }
      }
      // sol de la zone (rue pavée, chemin, mousse)
      const theme = this.THEMES[this.themeAt(z0 - CHUNK / 2)];
      const gd = this.DECOR[theme.ground];
      const gi = (Math.random() * gd.geos.length) | 0;
      parts.push({ geo: gd.geos[gi], tex: gd.texs && gd.texs[gi], x0: s * (4.85 + gd.w / 2), z0: z0 - CHUNK / 2, rot: s > 0 ? Math.PI : 0, sc: 1, tint: [1, 1, 1] });
    }
    // guirlande tendue au-dessus des voies (selon la zone)
    const th = this.THEMES[this.themeAt(z0)];
    const gGeo = this.special[th.garlandType || 'garland'];
    if (gGeo && Math.random() < (th.garland || 0)) {
      parts.push({ geo: gGeo, x0: 0, z0: z0 - rand(4, CHUNK - 4), rot: 0, sc: 1, tint: [1, 1, 1] });
    }
    this.jobs.push(startJob(parts, zFar));
  }

  // Avance les fusions en attente, dans la limite d'un budget de temps par image
  processJobs(budgetMs) {
    const t0 = performance.now();
    while (this.jobs.length) {
      const job = this.jobs[0];
      if (mergeNext(job)) {
        this.jobs.shift();
        const mesh = new THREE.Mesh(finishJob(job), vcMat);
        finishTex(job, this.texMats, mesh);
        this.scene.add(mesh);
        this.items.push({ mesh, zFar: job.zFar, own: true });
      }
      if (performance.now() - t0 > budgetMs) break;
    }
  }

  update(dt, pz, speed, instant = false) {
    const ahead = pz - 250;
    while (this.chunkCursor > ahead) {
      this.buildChunk(this.chunkCursor);
      this.chunkCursor -= CHUNK;
    }
    // au démarrage tout est construit d'un coup ; en course, 2 ms par image au maximum
    this.processJobs(instant ? Infinity : 2);
    while (this.toriiCursor > ahead) {
      const th = this.THEMES[this.themeAt(this.toriiCursor)];
      const gate = this.special[th.gate || 'gate'];
      if (gate) {
        const mesh = new THREE.Mesh(gate, vcMat);
        mesh.position.set(0, 0, this.toriiCursor);
        this.scene.add(mesh);
        this.items.push({ mesh, zFar: this.toriiCursor - 1 });
      }
      const [g0, g1] = th.gateEvery || [220, 380];
      this.toriiCursor -= rand(g0, g1);
    }

    // retrait des éléments dépassés
    const limit = pz + 30;
    let j = 0;
    for (const it of this.items) {
      if (it.zFar > limit) this.drop(it);
      else this.items[j++] = it;
    }
    this.items.length = j;

    // la voie et le sol suivent le joueur, les textures défilent
    this.trackGroup.position.z = pz;
    this.grassTex.offset.y = (-pz / this.groundTile) % 1;
    this.gravelTex.offset.y = (-pz / 3) % 1;
    this.sleeperTex.offset.y = (-pz / 1.3) % 1;
    if (this.overlayTex) this.overlayTex.offset.y = (-pz / this.overlayTile) % 1;

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
