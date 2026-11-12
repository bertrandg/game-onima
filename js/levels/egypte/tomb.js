import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Obstacles } from '../../obstacles.js';
import { Builder, U, vcMat, pick, rand } from '../../geo.js';
import { LANES, SPAWN_AHEAD, DESPAWN_BEHIND } from '../../config.js';
import * as EX from './textures.js';

// Le tombeau sous l'avenue. Une dalle effondrée fait tomber l'héroïne dans un couloir funéraire peint
// (sans perdre) ; la course continue sur trois voies, entre sarcophages, trésors, momies, poutres
// tombées et portes scellées. Pour ressortir, on monte en courant un escalier baigné de lumière qui
// débouche sur l'avenue, sans s'arrêter. Les deux étages sont générés en même temps ; seul celui où se
// trouve le joueur est affiché.

export const TOMB_Y = -7;                 // sol du tombeau
export const CEIL_Y = -1.0;               // plafond (la dalle de l'avenue fait 1 m d'épaisseur)
const WALL_X = 4.7;
const MODULE = 16;                        // le couloir est fait de tronçons identiques de 16 m
export const STAIR_LEN = 26;              // longueur de l'escalier de sortie, puis un palier de 3 m
const LANDING = 3;
const HOLE_HX = 1.05, HOLE_LEN = 2.4;     // dalle effondrée : demi-largeur et longueur
const P_HALF_X = 0.32, P_HALF_Z = 0.35;
const BALL = new THREE.SphereGeometry(1, 14, 10);
const SMOOTH = new THREE.MeshLambertMaterial({ vertexColors: true });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const TORCH = new THREE.Color('#ffc890');
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const GOLD = EX.PAINT.gold, BLUE = EX.PAINT.blue, RED = EX.PAINT.red;

// hauteur de l'escalier o au point z (0 au palier, TOMB_Y au pied)
const stairY = (o, z) => TOMB_Y * (1 - Math.min(1, Math.max(0, (o.zNear - z) / STAIR_LEN))) + 0;   // + 0 : jamais -0

// trois maillages (facettes, lisse, lumineux) pour un objet construit avec trois Builder
function triMesh(f, s, g) {
  const grp = new THREE.Group();
  if (f.parts.length) grp.add(new THREE.Mesh(f.build(), vcMat));
  if (s.parts.length) grp.add(new THREE.Mesh(s.build(), SMOOTH));
  if (g && g.parts.length) grp.add(new THREE.Mesh(g.build(), GLOW));
  return grp;
}
const builders = () => [new Builder(), new Builder(), new Builder()];

// ---------- Couloir ----------
function texMat(tex, rx, ry) {
  tex.repeat.set(rx, ry);
  return new THREE.MeshLambertMaterial({ map: tex });
}
// un tronçon de 16 m de détails : piliers peints, poutres, torches, statue d'Anubis, trésors au pied des murs
function moduleDetails(f, s, g, lamps) {
  for (const z of [0, -8]) {
    for (const sx of [-1, 1]) {
      const x = sx * (WALL_X - 0.42);
      f.add(U.box, '#d8bc88', [x, (TOMB_Y + CEIL_Y) / 2, z], [0.84, CEIL_Y - TOMB_Y, 0.84]);
      // bandes peintes : soubassement, registres, chapiteau
      for (const [y, c, h] of [[TOMB_Y + 0.3, EX.PAINT.black, 0.6], [TOMB_Y + 0.65, GOLD, 0.1], [CEIL_Y - 0.9, BLUE, 0.2], [CEIL_Y - 0.65, GOLD, 0.15], [CEIL_Y - 0.45, RED, 0.2]]) {
        f.add(U.box, c, [x, y, z], [0.86, h, 0.86]);
      }
      // dieu peint sur la face du pilier tournée vers le couloir : silhouette, coiffe, collier
      const fx = x - sx * 0.43;
      f.add(U.box, '#b8603a', [fx, TOMB_Y + 2.6, z], [0.02, 2.4, 0.36]);
      f.add(U.box, '#f4ecd8', [fx, TOMB_Y + 1.7, z], [0.025, 0.7, 0.4]);
      f.add(U.box, sx < 0 ? '#2a2420' : '#4a6a8a', [fx, TOMB_Y + 4.0, z], [0.025, 0.6, 0.34]);
      f.add(U.box, EX.PAINT.turq, [fx, TOMB_Y + 3.6, z], [0.03, 0.16, 0.42]);
      for (let k = 0; k < 4; k++) f.add(U.box, k % 2 ? BLUE : RED, [fx, TOMB_Y + 1.2 + k * 0.9, z + 0.34], [0.025, 0.36, 0.1]);
      // torche dans son applique de bronze (en quinconce)
      if ((z === 0) === (sx < 0)) {
        const tx = x - sx * 0.62, ty = TOMB_Y + 3.4;
        f.add(U.box, '#8a5a2a', [x - sx * 0.48, ty - 0.1, z], [0.14, 0.1, 0.12]);
        s.add(U.cyl, '#6a4a2a', [tx, ty, z], [0.05, 0.7, 0.05], [0, 0, -sx * 0.35]);
        s.add(U.cone8, '#b8823a', [tx - sx * 0.12, ty + 0.38, z], [0.14, 0.18, 0.14], [Math.PI, 0, 0]);
        g.add(U.cone8, '#ff8a1a', [tx - sx * 0.12, ty + 0.62, z], [0.13, 0.38, 0.13]);
        g.add(U.cone8, '#fff0a0', [tx - sx * 0.12, ty + 0.56, z], [0.06, 0.22, 0.06]);
        lamps.push([tx - sx * 0.12, ty + 0.62, z]);
      }
    }
    // poutre peinte au plafond, en travers du couloir
    f.add(U.box, '#e2c48a', [0, CEIL_Y - 0.18, z], [WALL_X * 2, 0.36, 0.6]);
    for (let k = 0; k < 10; k++) f.add(U.box, [BLUE, RED, EX.PAINT.green][k % 3], [-WALL_X + 0.5 + k * 0.92, CEIL_Y - 0.37, z], [0.36, 0.02, 0.36], [0, 0.785, 0]);
  }
  // Anubis couché sur sa chapelle dorée, dans une niche (un côté par tronçon)
  const ax = -(WALL_X - 0.75), az = -4;
  f.add(U.box, '#3a2a1a', [ax - 0.2, TOMB_Y + 1.9, az], [0.5, 3.8, 2.8]);
  f.add(U.box, GOLD, [ax, TOMB_Y + 0.6, az], [1.0, 1.2, 2.2]);
  for (let k = 0; k < 5; k++) f.add(U.box, k % 2 ? BLUE : '#c89a30', [ax + 0.51, TOMB_Y + 0.6, az - 0.8 + k * 0.4], [0.02, 0.9, 0.18]);
  const y = TOMB_Y + 1.2, J = '#1e1a1c';
  s.add(BALL, J, [ax, y + 0.32, az - 0.15], [0.3, 0.3, 0.7]);
  s.add(BALL, J, [ax, y + 0.55, az + 0.5], [0.22, 0.32, 0.22]);
  s.add(BALL, J, [ax, y + 0.92, az + 0.62], [0.16, 0.16, 0.18]);
  s.add(BALL, J, [ax, y + 0.86, az + 0.84], [0.07, 0.07, 0.16]);   // museau
  for (const sz of [-1, 1]) {
    s.add(U.cone8, J, [ax + sz * 0.08, y + 1.18, az + 0.58], [0.06, 0.22, 0.05]);
    s.add(BALL, J, [ax + sz * 0.12, y + 0.12, az + 0.55], [0.07, 0.07, 0.3]);   // pattes avant
    g.add(BALL, GOLD, [ax + sz * 0.1, y + 0.96, az + 0.74], [0.03, 0.025, 0.02]);   // yeux d'or
  }
  s.add(BALL, GOLD, [ax, y + 0.6, az + 0.62], [0.2, 0.06, 0.12]);   // collier
  s.add(BALL, J, [ax, y + 0.18, az - 0.9], [0.05, 0.05, 0.3]);   // queue
  // trésors au pied des murs : jarres canopes, pièces d'or, coffret
  for (const sx of [-1, 1]) {
    const zz = sx < 0 ? -12 : -6, x = sx * (WALL_X - 0.5);
    for (let k = 0; k < 4; k++) {
      s.add(BALL, '#e8dcc0', [x, TOMB_Y + 0.25, zz - 0.6 + k * 0.4], [0.13, 0.25, 0.13]);
      s.add(BALL, [J, GOLD, '#c87a4a', '#f4ecd8'][k], [x, TOMB_Y + 0.56, zz - 0.6 + k * 0.4], [0.1, 0.1, 0.1]);
    }
    for (let k = 0; k < 9; k++) g.add(U.cyl, '#ffd040', [x + rand(-0.25, 0.25), TOMB_Y + 0.03 + (k % 3) * 0.03, zz + 1.2 + rand(-0.3, 0.3)], [0.07, 0.02, 0.07]);
    f.add(U.box, '#d8b884', [sx * (WALL_X - 0.3), TOMB_Y + 0.08, zz + 4], [0.6, 0.16, 2.4]);   // sable accumulé
  }
}

function buildTomb() {
  const group = new THREE.Group();
  const Z0 = MODULE * 3, Z1 = -MODULE * 13, L = Z0 - Z1, zc = (Z0 + Z1) / 2;
  const H = CEIL_Y - TOMB_Y;
  const wallMat = texMat(EX.tombWall(), L / 12, 1);
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wallMat);
    w.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    w.position.set(sx * WALL_X, TOMB_Y + H / 2, zc);
    group.add(w);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(WALL_X * 2, L), texMat(EX.starCeiling(), WALL_X * 2 / 2.6, L / 2.6));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, CEIL_Y, zc);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WALL_X * 2, L), texMat(EX.tombFloor(), WALL_X * 2 / 2.4, L / 2.4));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, TOMB_Y, zc);
  group.add(ceil, floor);
  // tous les tronçons de détails fusionnés : trois appels de dessin pour tout le couloir
  const [f, s, g] = builders(), one = [];
  moduleDetails(f, s, g, one);
  const geos = [f.build(), s.build(), g.build()], lamps = [];
  const lists = [[], [], []];
  for (let z = Z0; z > Z1; z -= MODULE) {
    geos.forEach((geo, i) => lists[i].push(geo.clone().translate(0, 0, z)));
    for (const [x, y, lz] of one) lamps.push(x, y, lz + z);
  }
  [vcMat, SMOOTH, GLOW].forEach((m, i) => group.add(new THREE.Mesh(mergeGeometries(lists[i], false), m)));
  [...lists.flat(), ...geos].forEach((x) => x.dispose());
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
  const halo = new THREE.Points(pg, new THREE.PointsMaterial({
    size: 2.6, map: haloTexture(), color: '#ffc070', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(halo);
  return { group, halo };
}

function canvasSprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const haloTexture = () => canvasSprite(64, (g) => {
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,230,170,0.9)');
  grd.addColorStop(0.3, 'rgba(255,190,100,0.35)');
  grd.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
});
// flèche dorée lumineuse au pied de l'escalier : « monte par ici »
const arrowTexture = () => canvasSprite(128, (g) => {
  g.shadowColor = '#ffd24a';
  g.shadowBlur = 18;
  g.fillStyle = '#ffe27a';
  g.beginPath();
  g.moveTo(64, 14); g.lineTo(110, 62); g.lineTo(80, 62); g.lineTo(80, 112); g.lineTo(48, 112); g.lineTo(48, 62); g.lineTo(18, 62);
  g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = '#7a4a10'; g.lineWidth = 5; g.stroke();
});

// ---------- Obstacles du tombeau (posés au sol du tombeau, centrés en z) ----------
function sarcophagus() {   // cercueil doré couché en travers de la voie, visage kawaii
  const [f, s, g] = builders();
  const y = TOMB_Y;
  f.add(U.box, '#5a4630', [0, y + 0.1, 0], [2.3, 0.2, 0.85]);
  s.add(BALL, GOLD, [0, y + 0.5, 0], [1.05, 0.38, 0.38]);
  s.add(BALL, BLUE, [-0.05, y + 0.56, 0], [0.75, 0.3, 0.36]);
  for (let k = 0; k < 6; k++) f.add(U.box, k % 2 ? GOLD : EX.PAINT.turq, [-0.55 + k * 0.2, y + 0.86, 0], [0.12, 0.02, 0.5]);
  const hx = 0.82;
  s.add(BALL, '#e8b478', [hx, y + 0.66, 0], [0.2, 0.26, 0.24]);
  s.add(BALL, BLUE, [hx - 0.06, y + 0.72, 0], [0.24, 0.3, 0.3]);
  for (const sz of [-1, 1]) {
    s.add(BALL, '#1a1410', [hx + 0.06, y + 0.9, sz * 0.08], [0.04, 0.02, 0.05]);
    g.add(BALL, '#ffffff', [hx + 0.07, y + 0.92, sz * 0.07], [0.012, 0.008, 0.012]);
    s.add(BALL, '#f08a8a', [hx + 0.1, y + 0.86, sz * 0.14], [0.03, 0.01, 0.04]);
  }
  for (const sx of [-1, 1]) g.add(BALL, '#ffe070', [sx * 0.3, y + 0.88, 0.3], [0.05, 0.05, 0.05]);
  return triMesh(f, s, g);
}

function treasure() {   // coffre ouvert débordant d'or, jarres et vases
  const [f, s, g] = builders();
  const y = TOMB_Y;
  f.add(U.box, '#7a4a28', [0, y + 0.4, 0], [1.2, 0.8, 0.7]);
  f.add(U.box, GOLD, [0, y + 0.82, 0], [1.24, 0.06, 0.74]);
  f.add(U.box, '#7a4a28', [0, y + 1.05, -0.38], [1.2, 0.5, 0.08], [-0.4, 0, 0]);
  for (let k = 0; k < 14; k++) g.add(BALL, k % 3 ? '#ffd040' : '#ffe890', [rand(-0.5, 0.5), y + 0.85 + rand(0, 0.15), rand(-0.25, 0.25)], [0.09, 0.03, 0.09]);
  for (const [x, c] of [[-0.95, '#c46a3a'], [0.95, '#e8dcc0']]) {
    s.add(BALL, c, [x, y + 0.42, 0], [0.26, 0.42, 0.26]);
    s.add(BALL, GOLD, [x, y + 0.88, 0], [0.12, 0.1, 0.12]);
  }
  for (let k = 0; k < 7; k++) g.add(U.cyl, '#ffd040', [rand(-1.1, 1.1), y + 0.02, rand(0.3, 0.6)], [0.08, 0.02, 0.08]);
  g.add(BALL, '#4a9aff', [0.3, y + 0.95, 0.1], [0.07, 0.07, 0.07]);
  g.add(BALL, '#ff4a6a', [-0.25, y + 0.97, -0.05], [0.06, 0.06, 0.06]);
  return triMesh(f, s, g);
}

function mummy() {   // momie debout aux bras tendus, bandelettes et yeux qui luisent (à sauter au bon moment)
  const [f, s, g] = builders();
  const y = TOMB_Y, C = '#e8dcc0', C2 = '#d8c8a4';
  for (const x of [-0.14, 0.14]) s.add(BALL, C2, [x, y + 0.45, 0], [0.13, 0.45, 0.13]);
  s.add(BALL, C, [0, y + 1.1, 0], [0.3, 0.45, 0.24]);
  s.add(BALL, C, [0, y + 1.66, 0], [0.24, 0.24, 0.24]);
  for (const x of [-1, 1]) {
    s.add(U.cyl, C2, [x * 0.26, y + 1.32, 0.3], [0.07, 0.6, 0.07], [Math.PI / 2, 0, 0]);
    s.add(BALL, C2, [x * 0.26, y + 1.32, 0.62], [0.08, 0.08, 0.08]);
    g.add(BALL, '#7aff8a', [x * 0.08, y + 1.7, 0.21], [0.045, 0.035, 0.02]);
  }
  // bandelettes : anneaux légèrement de travers, bout qui pend
  for (let k = 0; k < 9; k++) f.add(U.box, k % 2 ? '#c8b890' : '#f4ecd8', [0, y + 0.3 + k * 0.17, 0], [0.5 - Math.abs(k - 4) * 0.02, 0.035, 0.42], [0, 0, (k % 3 - 1) * 0.12]);
  f.add(U.box, '#f4ecd8', [0.22, y + 0.7, 0.2], [0.04, 0.5, 0.08], [0, 0, 0.2]);
  for (let k = 0; k < 3; k++) f.add(U.box, '#c8b890', [0, y + 1.6 + k * 0.1, 0.02], [0.5, 0.03, 0.5], [0, 0, (k - 1) * 0.2]);
  // agrandie autour de ses pieds, qui servent aussi de pivot quand elle se dandine
  const m = triMesh(f, s, g);
  m.scale.setScalar(1.15);
  m.position.y = -1.15 * TOMB_Y;
  const grp = new THREE.Group();
  grp.add(m);
  grp.position.y = TOMB_Y;
  return grp;
}

function fallenBeam() {   // poutre peinte tombée du plafond, posée sur deux blocs : roulade !
  const [f, s] = builders();
  const y = TOMB_Y;
  for (const x of [-1.2, 1.25]) {
    f.add(U.box, '#c8a878', [x, y + 0.75, 0], [0.5, 1.5, 0.6], [0, 0.2, 0]);
    f.add(U.box, '#b89868', [x + 0.1, y + 0.1, 0.3], [0.4, 0.2, 0.3]);
  }
  f.add(U.box, '#e2c48a', [0, y + 1.95, 0], [3.0, 0.7, 0.6], [0, 0, 0.04]);
  for (let k = 0; k < 8; k++) f.add(U.box, [BLUE, RED, EX.PAINT.green, GOLD][k % 4], [-1.2 + k * 0.34, y + 1.95, 0.31], [0.2, 0.2, 0.02], [0, 0, k * 0.5]);
  f.add(U.box, GOLD, [0, y + 1.62, 0.31], [3.0, 0.06, 0.02]);
  for (let k = 0; k < 6; k++) f.add(U.box, '#d8b884', [rand(-1.3, 1.3), y + 0.06, rand(-0.4, 0.4)], [0.25, 0.12, 0.2], [0, rand(0, 3), 0]);
  s.add(BALL, '#d8b884', [0, y + 0.02, 0], [0.9, 0.06, 0.5]);   // sable tombé
  return triMesh(f, s);
}

function sealedDoor() {   // porte scellée : jambages, linteau ailé, œil d'Horus et sceau de corde : infranchissable
  const [f, s, g] = builders();
  const y = TOMB_Y, top = CEIL_Y + 0.05, h = top - y;
  for (const x of [-1.3, 1.3]) f.add(U.box, '#d8bc88', [x, y + h / 2, 0], [0.35, h, 0.6]);
  f.add(U.box, '#e2c48a', [0, top - 0.5, 0], [3.0, 1.0, 0.65]);
  f.add(U.box, RED, [0, top - 0.5, 0.34], [0.5, 0.5, 0.02]);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) f.add(U.box, [BLUE, EX.PAINT.green, GOLD][k], [sx * (0.55 + k * 0.18), top - 0.45 - k * 0.1, 0.34], [0.5, 0.08, 0.02], [0, 0, sx * 0.15]);
  f.add(U.box, '#c8a878', [0, y + (h - 1) / 2, 0], [2.3, h - 1, 0.4]);
  for (let k = 1; k < 5; k++) f.add(U.box, '#b89868', [0, y + k * 1.0, 0.21], [2.3, 0.03, 0.02]);
  // œil d'Horus peint
  const ey = y + 2.4;
  f.add(U.box, '#f4ecd8', [0, ey, 0.22], [0.9, 0.36, 0.02]);
  f.add(U.box, BLUE, [0, ey, 0.235], [0.3, 0.3, 0.02]);
  f.add(U.box, '#1a1410', [0, ey + 0.28, 0.23], [1.0, 0.08, 0.02]);
  f.add(U.box, '#1a1410', [-0.2, ey - 0.35, 0.23], [0.08, 0.4, 0.02], [0, 0, 0.2]);
  f.add(U.box, '#1a1410', [0.3, ey - 0.3, 0.23], [0.4, 0.07, 0.02], [0, 0, -0.5]);
  // cordes croisées et sceau d'argile
  for (const r of [0.5, -0.5]) f.add(U.box, '#c8a868', [0, y + 1.1, 0.24], [2.4, 0.06, 0.04], [0, 0, r]);
  s.add(BALL, '#8a3a2a', [0, y + 1.1, 0.27], [0.18, 0.18, 0.06]);
  g.add(BALL, GOLD, [0, y + 1.1, 0.33], [0.08, 0.08, 0.02]);
  return triMesh(f, s, g);
}

// escalier de sortie, du sol du tombeau jusqu'à l'avenue (avant de l'escalier en z = 0, vers -z)
function stairGeo() {
  const [f, s] = builders();
  const N = 26, dz = STAIR_LEN / N, dy = -TOMB_Y / N;
  for (let i = 0; i < N; i++) {
    const top = TOMB_Y + (i + 1) * dy, z = -i * dz - dz / 2;
    f.add(U.box, i % 2 ? '#e2c48a' : '#d8b880', [0, (TOMB_Y + top) / 2, z], [2.3, top - TOMB_Y, dz]);
    f.add(U.box, '#f2dcae', [0, top - 0.02, z + dz / 2 - 0.06], [2.32, 0.04, 0.12]);   // nez de marche
  }
  f.add(U.box, '#e2c48a', [0, -0.5, -STAIR_LEN - LANDING / 2], [2.3, 1.0, LANDING]);   // palier
  // puits de pierre dans l'épaisseur de la dalle de l'avenue, autour du haut de l'escalier :
  // en le traversant, la caméra ne voit que ses parois (et pas le tombeau en coupe)
  const z1 = -(STAIR_LEN - 16), z2 = -(STAIR_LEN + LANDING);
  for (const sx of [-1, 1]) {
    f.add(U.box, '#b89868', [sx * 3.05, (CEIL_Y - 0.06) / 2, (z1 + z2) / 2], [3.6, -CEIL_Y + 0.02, z1 - z2]);
    for (let k = 0; k < 6; k++) f.add(U.box, '#a8885a', [sx * 1.255, CEIL_Y + 0.15 + k * 0.15, (z1 + z2) / 2], [0.01, 0.02, z1 - z2]);   // assises
  }
  // rampes basses de chaque côté, sphinx miniatures au pied
  for (const sx of [-1, 1]) {
    const L = Math.hypot(STAIR_LEN, -TOMB_Y), a = Math.atan2(-TOMB_Y, STAIR_LEN);
    f.add(U.box, '#c8a878', [sx * 1.22, TOMB_Y / 2 + 0.35, -STAIR_LEN / 2], [0.16, 0.5, L], [a, 0, 0]);
    f.add(U.box, GOLD, [sx * 1.22, TOMB_Y / 2 + 0.62, -STAIR_LEN / 2], [0.18, 0.05, L], [a, 0, 0]);
    f.add(U.box, '#d8bc88', [sx * 1.3, TOMB_Y + 0.4, 0.6], [0.5, 0.8, 1.2]);
    s.add(BALL, '#e2bc7c', [sx * 1.3, TOMB_Y + 1.0, 0.6], [0.2, 0.2, 0.42]);
    s.add(BALL, '#e8b478', [sx * 1.3, TOMB_Y + 1.32, 0.95], [0.15, 0.17, 0.15]);
    s.add(BALL, BLUE, [sx * 1.3, TOMB_Y + 1.36, 0.9], [0.17, 0.17, 0.16]);
  }
  return { flat: f.build(), smooth: s.build() };
}

// dalle effondrée sur l'avenue : trou sombre, bords cassés, dalle basculée, filet de sable
function holeGeo() {
  const b = new Builder();
  b.add(U.box, '#1a120a', [0, 0.015, 0], [HOLE_HX * 2, 0.02, HOLE_LEN]);
  b.add(U.box, '#0a0604', [0, 0.02, 0], [HOLE_HX * 1.6, 0.02, HOLE_LEN * 0.8]);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k++) b.add(U.box, pick(['#c8a878', '#b89868', '#d8bc88']), [sx * (HOLE_HX + 0.08), 0.05, -HOLE_LEN / 2 + 0.3 + k * 0.6], [0.22, 0.1, 0.55], [0, rand(-0.3, 0.3), sx * 0.15]);
  }
  for (const sz of [-1, 1]) for (let k = 0; k < 3; k++) b.add(U.box, '#c8a878', [-0.7 + k * 0.7, 0.05, sz * (HOLE_LEN / 2 + 0.08)], [0.6, 0.1, 0.2], [0.15 * sz, rand(-0.3, 0.3), 0]);
  b.add(U.box, '#d8bc88', [0.2, -0.35, -0.3], [1.3, 0.14, 1.0], [0.6, 0.3, 0.2]);   // dalle qui bascule
  for (let k = 0; k < 8; k++) b.add(U.box, '#e8cc96', [rand(-0.9, 0.9), 0.04, rand(-1.4, 1.4)], [0.12, 0.06, 0.1]);
  return b.build();
}

// débouché de l'escalier sur l'avenue : trémie sombre et premières marches (on ne tombe pas dedans :
// la sortie est toujours derrière le joueur)
function openingGeo() {
  const b = new Builder();
  b.add(U.box, '#c8a878', [0, 0.03, -4], [2.6, 0.06, 8.4]);
  b.add(U.box, '#2a1a0e', [0, 0.04, -4], [2.2, 0.04, 8]);
  for (let i = 0; i < 6; i++) b.add(U.box, '#8a6a48', [0, 0.05, -1 - i * 1.1], [2.2, 0.02, 0.5]);
  for (const sx of [-1, 1]) b.add(U.box, GOLD, [sx * 1.25, 0.08, -4], [0.08, 0.08, 8.2]);
  return b.build();
}

// ---------- Voile sombre pendant le passage avenue / tombeau ----------
let veil = null;
function getVeil() {
  if (veil) return veil;
  veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:1;'
    + 'background:radial-gradient(circle at 50% 55%, rgba(40,26,12,0.55) 0%, rgba(10,6,2,0.96) 70%);';
  const game = document.getElementById('game');
  (game && game.parentNode ? game.parentNode : document.body).insertBefore(veil, game ? game.nextSibling : null);
  return veil;
}

// ---------- Moteur d'obstacles à deux étages ----------
export class TombObstacles extends Obstacles {
  constructor(root, opts) {
    const street = new THREE.Group();
    root.add(street);
    super(street, opts);
    this.root = root;
    this.world = opts.world;
    this.sound = opts.sound;
    this.fog = opts.fog;
    this.fogColor = new THREE.Color(opts.fogColor);
    this.tombFog = new THREE.Color('#2a1a0c');

    this.tomb = new THREE.Group();
    root.add(this.tomb);
    const T = buildTomb();
    this.corridor = T.group;
    this.halo = T.halo;
    this.tomb.add(this.corridor);

    this.geo = { hole: holeGeo(), opening: openingGeo(), stair: stairGeo() };
    this.make = { sarcophagus, treasure, mummy, beam: fallenBeam, door: sealedDoor };
    this.proto = {};
    for (const k of Object.keys(this.make)) this.proto[k] = [0, 1, 2].map(() => this.make[k]());
    this.beamMat = new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beamGeo = new THREE.CylinderGeometry(0.9, 1.6, 1, 16, 1, true);
    this.arrowMat = new THREE.SpriteMaterial({ map: arrowTexture(), transparent: true, depthWrite: false });
    this.sandGeo = (() => { const b = new Builder(); b.add(BALL, '#d8b884', [0, TOMB_Y, 0], [1.0, 0.35, 1.4]); for (let k = 0; k < 6; k++) b.add(U.box, '#c8a878', [rand(-0.8, 0.8), TOMB_Y + 0.2, rand(-1, 1)], [0.4, 0.12, 0.3], [rand(-0.5, 0.5), rand(0, 3), 0]); return b.build(); })();

    this.veil = getVeil();
    this.veilOp = -1;
    this.lightBase = this.world ? { hemi: this.world.hemi.intensity, sun: this.world.sun.intensity, hemiCol: this.world.hemi.color.clone() } : null;
    this.reset(0);
  }

  reset(startZ) {
    super.reset(startZ);
    if (!this.tomb) return;   // appelé une première fois par le constructeur parent
    for (const o of this.sList || []) if (o.mesh) this.tomb.remove(o.mesh);
    this.sList = [];
    this.sCursor = startZ - 50;
    this.sBusy = [startZ, startZ, startZ];
    this.sLast = null;
    this.nextStair = startZ - rand(70, 110);
    this.nextHole = startZ - rand(150, 230);
    this.under = false;
    this.onStair = null;
    this.tomb.visible = true;
    this.setStreetVisible(true);
    this.applyDepth(0);
    if (this.sound && this.sound.setMuffle) this.sound.setMuffle(false);
  }

  warmupGroup() {
    const g = super.warmupGroup();
    for (const k of Object.keys(this.proto)) g.add(this.proto[k][0].clone());
    g.add(new THREE.Mesh(this.geo.hole, vcMat), new THREE.Mesh(this.geo.opening, vcMat), new THREE.Mesh(this.geo.stair.smooth, SMOOTH));
    g.add(new THREE.Mesh(this.beamGeo, this.beamMat), new THREE.Sprite(this.arrowMat));
    return g;
  }

  // ---------- Avenue : dalles effondrées ----------
  spawnObstacles(z, speed, dist) {
    const gap = super.spawnObstacles(z, speed, dist);
    if (dist > 40 && z < this.nextHole) {
      const lanes = [0, 1, 2].filter((l) => this.busy[l] - z >= 6 && !(this.reserve && this.reserve.lane === l)
        && !this.list.some((o) => o.moving && o.lane === l));
      if (lanes.length) {
        this.addHole(pick(lanes), z, true);
        this.nextHole = z - rand(140, 260);
      }
    }
    return gap;
  }

  addHole(lane, z, open) {
    const x = LANES[lane];
    const mesh = new THREE.Mesh(open ? this.geo.hole : this.geo.opening, vcMat);
    mesh.position.set(x, 0, open ? z - HOLE_LEN / 2 : z);
    this.scene.add(mesh);
    const o = open
      ? { kind: 'hole', lane, x, halfW: HOLE_HX, zNear: z, zFar: z - HOLE_LEN, mesh }
      : { kind: 'deco', lane, x, halfW: HOLE_HX, zNear: z + 0.2, zFar: z - 8.2, mesh };
    this.list.push(o);
    if (open) this.busy[lane] = Math.min(this.busy[lane], z - HOLE_LEN - 0.5);
    return o;
  }

  // ---------- Tombeau : génération ----------
  addS(o) {
    o.x = LANES[o.lane];
    if (o.mesh) {
      o.mesh.position.x = o.x;
      o.mesh.position.z = (o.zNear + o.zFar) / 2;
      this.tomb.add(o.mesh);
    }
    this.sList.push(o);
    return o;
  }

  addStair(lane, z) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.geo.stair.flat, vcMat), new THREE.Mesh(this.geo.stair.smooth, SMOOTH));
    // rai de lumière du jour qui tombe sur les marches, flèche dorée au pied
    const beam = new THREE.Mesh(this.beamGeo, this.beamMat);
    beam.scale.y = CEIL_Y - TOMB_Y - 0.4;   // reste sous le plafond (sinon il dépasse sur l'avenue)
    beam.position.set(0, (CEIL_Y + TOMB_Y) / 2 - 0.3, -STAIR_LEN * 0.6);
    beam.rotation.x = -0.3;
    const arrow = new THREE.Sprite(this.arrowMat);
    arrow.scale.set(1.2, 1.2, 1);
    arrow.position.set(0, TOMB_Y + 2.2, 1.5);
    g.add(beam, arrow);
    const o = this.addS({ kind: 'stair', lane, halfW: 1.0, zNear: z, zFar: z - STAIR_LEN - LANDING, zTop: z - STAIR_LEN, mesh: null, arrow });
    g.position.set(o.x, 0, z);
    o.mesh = g;
    this.tomb.add(g);
    return o;
  }

  addTombObstacle(lane, z, type) {
    const spec = {
      sarcophagus: { kind: 'low', h: 1.0, depth: 0.85 },
      treasure: { kind: 'low', h: 1.0, depth: 0.8 },
      mummy: { kind: 'low', h: 2.05, depth: 0.6 },
      beam: { kind: 'high', depth: 0.6 },
      door: { kind: 'wall', depth: 0.7 },
    }[type];
    const mesh = pick(this.proto[type]).clone();
    const o = this.addS({ kind: spec.kind, h: spec.h || 0, lane, halfW: type === 'door' ? 1.2 : 1.0, zNear: z, zFar: z - spec.depth, mesh, type, phase: Math.random() * 6 });
    this.sBusy[lane] = Math.min(this.sBusy[lane], z - spec.depth);
    return o;
  }

  spawnTombRow(z, speed, dist) {
    const diff = Math.min(1, dist / 2500);
    const rowGap = Math.max(16, speed * 1.15) + rand(0, 8) * (1 - diff * 0.5);
    const minGap = Math.max(8, speed * 0.6);
    const free = [0, 1, 2].filter((l) => this.sBusy[l] - z >= minGap);
    this.tombCandies(z, speed);
    // escalier de sortie, régulièrement
    if (z < this.nextStair && free.length) {
      const l = pick(free);
      this.addStair(l, z);
      this.sBusy[l] = z - STAIR_LEN - LANDING - 6;
      this.nextStair = z - rand(110, 170);
      return rowGap * 0.8;
    }
    if (Math.random() < 0.12) return rowGap * 0.6;   // respiration
    const lanes = free.sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.55 ? 1 : 2;
    let wall = false;
    for (const l of lanes.slice(0, count)) {
      const r = Math.random();
      if (r < 0.26) this.addTombObstacle(l, z, 'sarcophagus');
      else if (r < 0.44) this.addTombObstacle(l, z, 'treasure');
      else if (r < 0.58 && dist > 200) this.addTombObstacle(l, z, 'mummy');
      else if (r < 0.8 || wall) this.addTombObstacle(l, z, 'beam');
      else { this.addTombObstacle(l, z, 'door'); wall = true; }
    }
    return rowGap;
  }

  // friandises : en ligne dans une voie libre, ou en montant l'escalier
  tombCandies(z) {
    const C = this.candies;
    if (!C || this.sLast === null) { this.sLast = z; return; }
    const zFrom = this.sLast - 3, zTo = z + 3;
    this.sLast = z;
    if (zFrom - zTo < 7 || Math.random() > 0.7) return;
    const l = pick([0, 1, 2]);
    if (this.sList.some((o) => o.lane === l && o.kind !== 'deco' && o.zNear > zTo - 2 && o.zFar < zFrom + 2)) return;
    const z0 = zFrom - Math.random() * Math.max(0, zFrom - zTo - 7);
    for (let i = 0; i < 3; i++) C.placeAt(LANES[l], TOMB_Y + 0.9, z0 - i * 2.2, -1, i * 0.6);
  }

  // vide une zone d'une voie à un étage (là où le joueur va arriver : il ne pouvait pas la voir)
  clearLane(below, lane, zFrom, zTo) {
    const list = below ? this.sList : this.list, grp = below ? this.tomb : this.scene;
    let j = 0;
    for (const o of list) {
      const hit = o.lane === lane && o.kind !== 'stair' && !o.landing
        && (o.moving ? o.zFar < zFrom : o.zFar < zFrom && o.zNear > zTo);
      if (hit) { if (o.mesh) grp.remove(o.mesh); } else list[j++] = o;
    }
    list.length = j;
  }

  update(pz, speed, dist) {
    super.update(pz, speed, dist);
    while (this.sCursor > pz - SPAWN_AHEAD * 0.65) this.sCursor -= this.spawnTombRow(this.sCursor, speed, dist);
    const limit = pz + DESPAWN_BEHIND;
    let j = 0;
    for (const o of this.sList) {
      if (o.zFar > limit) { if (o.mesh) this.tomb.remove(o.mesh); } else this.sList[j++] = o;
    }
    this.sList.length = j;
  }

  // ---------- Collisions ----------
  resolve(p) {
    if (p.under) {
      if (p.y >= -0.05 && (p.vy > 0 || this.onStair)) {   // en haut de l'escalier : retour sur l'avenue
        p.under = false;
        this.onStair = null;
      } else {
        this.under = true;
        return this.resolveTomb(p);
      }
    }
    this.under = false;
    const r = super.resolve(p);
    if (!r.crash && p.y <= 0.02 && r.ground === 0) {
      for (const o of this.list) {
        if (o.kind !== 'hole' || Math.abs(p.x - o.x) > HOLE_HX - 0.25) continue;
        if (p.z <= o.zNear - 0.3 && p.z >= o.zFar + 0.3) {
          this.enterTomb(p, o);
          r.ground = TOMB_Y;
          break;
        }
      }
    }
    return r;
  }

  resolveTomb(p) {
    let ground = TOMB_Y, crash = null, stair = null;
    const ry = p.y - TOMB_Y;
    const zMin = p.z - P_HALF_Z, zMax = p.z + P_HALF_Z;
    for (const o of this.sList) {
      if (o.kind === 'deco') continue;
      if (o.kind === 'stair') {
        if (Math.abs(p.x - o.x) > o.halfW || p.z > o.zNear || p.z < o.zFar) continue;
        const h = stairY(o, p.z);
        if (p.y >= h - 1.2) { if (h > ground) { ground = h; stair = o; } }
        else crash = o;   // arrivé de côté contre le flanc de l'escalier
        continue;
      }
      if (Math.abs(p.x - o.x) > o.halfW + P_HALF_X) continue;
      if (zMin > o.zNear || zMax < o.zFar) continue;
      if (o.kind === 'low') { if (ry < o.h) crash = o; }
      else if (o.kind === 'high') { if (ry + p.h > 1.32 && ry < 2.75) crash = o; }
      else if (o.kind === 'wall' && ry < 5) crash = o;
    }
    // on monte l'escalier : la sortie sur l'avenue est dégagée avant qu'on la voie
    if (stair && ground > TOMB_Y + 0.3 && !stair.climbed) this.climb(p, stair);
    this.onStair = stair && ground > TOMB_Y + 0.05 ? stair : null;
    return { ground, crash };
  }

  enterTomb(p, hole) {
    p.under = true;
    this.under = true;
    // la zone d'atterrissage est dégagée (et sans porte scellée avant longtemps)
    this.clearLane(true, hole.lane, p.z + 4, p.z - 45);
    for (const o of this.sList) {
      if (o.kind === 'wall' && o.lane === hole.lane && o.zNear > p.z - 90) o.dead = true;
    }
    this.sList = this.sList.filter((o) => { if (o.dead) { this.tomb.remove(o.mesh); return false; } return true; });
    // tas de sable et rai de lumière sous la dalle effondrée
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.sandGeo, vcMat));
    const beam = new THREE.Mesh(this.beamGeo, this.beamMat);
    beam.scale.set(0.8, CEIL_Y - TOMB_Y, 0.8);
    beam.position.y = (CEIL_Y + TOMB_Y) / 2;
    g.add(beam);
    this.addS({ kind: 'deco', landing: true, lane: hole.lane, zNear: hole.zNear, zFar: hole.zFar, mesh: g });
    if (this.sound && this.sound.fall) this.sound.fall();
  }

  climb(p, stair) {
    stair.climbed = true;
    // l'avenue au débouché est dégagée dans cette voie, et la trémie de l'escalier y apparaît
    this.clearLane(false, stair.lane, stair.zTop + 10, stair.zTop - 70);
    this.addHole(stair.lane, stair.zTop + 8, false);
    if (this.sound && this.sound.climb) this.sound.climb();
  }

  groundAt(x, z, margin = 0, under = false) {
    if (!under) return super.groundAt(x, z, margin);
    let g = TOMB_Y;
    for (const o of this.sList) {
      if (o.kind !== 'stair' || Math.abs(x - o.x) > o.halfW + margin || z > o.zNear || z < o.zFar) continue;
      g = Math.max(g, stairY(o, z));
    }
    return g;
  }

  baseY(p) { return p.under ? TOMB_Y : 0; }

  // la caméra reste sous le plafond, sauf pendant la montée de l'escalier (le voile couvre le passage)
  clampCam(out, look, p) {
    if (!p.under || this.onStair) return;
    out.y = Math.min(out.y, CEIL_Y - 0.45);
    look.y = Math.min(look.y, out.y - 0.6);
  }

  // ---------- Affichage ----------
  setStreetVisible(v) {
    if (this.streetVis === v) return;
    this.streetVis = v;
    this.scene.visible = v;
    const w = this.world;
    if (!w) return;
    w.trackGroup.visible = v;
    w.petals.visible = v;
    const s = w.scenery;
    s.sky.visible = s.far.visible = s.fireflies.visible = v;
  }

  // 0 = sur l'avenue, 1 = dans le tombeau : brouillard, lumière des torches et son
  applyDepth(k) {
    if (this.depthK === k) return;
    this.depthK = k;
    if (this.fog) {
      this.fog.color.copy(this.fogColor).lerp(this.tombFog, k);
      this.fog.near = 80 + (8 - 80) * k;
      this.fog.far = 270 + (80 - 270) * k;
    }
    const L = this.lightBase;
    if (L) {
      this.world.hemi.intensity = L.hemi + (1.7 - L.hemi) * k;
      this.world.hemi.color.copy(L.hemiCol).lerp(TORCH, k);
      this.world.sun.intensity = L.sun * (1 - 0.65 * k);
    }
  }

  // appelé à chaque image par la boucle principale
  frame(dt, p, camera, { running }) {
    const camY = camera.position.y;
    this.tomb.visible = p.under || camY < 0.8 || p.y < -0.05;
    const deep = camY < -0.8 && p.y < -0.8;
    this.setStreetVisible(!deep);
    // friandises de l'avenue cachées sous terre (calque 1, que la caméra ne voit pas), et inversement
    if (this.candies && (deep || this.wasDeep)) {
      for (const c of this.candies.list) c.mesh.layers.set(deep === c.y >= 0 ? 1 : 0);
      for (const f of this.candies.fugus) f.mesh.traverse((m) => m.layers.set(deep ? 1 : 0));
    }
    if (deep && this.world) for (const it of this.world.items) it.mesh.visible = false;
    else if (this.world && this.wasDeep) for (const it of this.world.items) it.mesh.visible = true;
    this.wasDeep = deep;
    this.corridor.position.z = Math.floor(p.z / MODULE) * MODULE;
    this.applyDepth(Math.round(smooth(0.6, -1.4, camY) * 50) / 50);
    // voile sombre, opaque tant que la caméra traverse la dalle de l'avenue (on y verrait le tombeau en coupe)
    const top = 0.15, bottom = CEIL_Y - 0.15;
    const out = camY > top ? camY - top : camY < bottom ? bottom - camY : 0;
    const v = Math.round(Math.max(0, 1 - out / 0.7) * 20) / 20;
    if (v !== this.veilOp) { this.veilOp = v; this.veil.style.opacity = v; }
    if (this.sound && this.sound.setMuffle) this.sound.setMuffle(running && p.under);
    if (!this.tomb.visible) return;
    const t = performance.now() / 1000;
    // flammes qui vacillent, momies qui se dandinent, flèches qui dansent
    this.halo.material.size = 2.6 + Math.sin(t * 9.1) * 0.18 + Math.sin(t * 13.7) * 0.12;
    this.halo.material.opacity = 0.85 + Math.sin(t * 7.3) * 0.12;
    for (const o of this.sList) {
      if (o.type === 'mummy') o.mesh.rotation.z = Math.sin(t * 2.2 + o.phase) * 0.06;
      else if (o.arrow) o.arrow.position.y = TOMB_Y + 2.2 + Math.sin(t * 5) * 0.2;
    }
  }
}
