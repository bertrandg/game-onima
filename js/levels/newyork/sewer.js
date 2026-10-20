import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Obstacles } from '../../obstacles.js';
import { Builder, U, vcMat, pick, rand } from '../../geo.js';
import { LANES, SPAWN_AHEAD, DESPAWN_BEHIND } from '../../config.js';
import * as NX from './textures.js';

// Les égouts de New York, sous la chaussée. Une bouche d'égout ouverte fait tomber l'héroïne dans le
// tunnel (sans perdre) ; la course continue sur les deux quais latéraux, de part et d'autre d'un canal
// de boue mortel qu'il faut franchir d'un saut (on change alors de 2 voies d'un coup). En sautant au
// pied d'une échelle, on remonte d'un bond à la surface. Les deux étages sont générés en même temps ;
// seul celui où se trouve le joueur est affiché.

export const SEWER_Y = -7;                // niveau des quais
const SLUDGE_Y = SEWER_Y - 0.55;          // surface de la boue
const WALL_X = 4.3, WALL_TOP = SEWER_Y + 3.6, CROWN = -0.35;
const ARCH_H = CROWN - WALL_TOP;
const EDGE = 1.35;                        // bord des quais : le canal est entre -EDGE et EDGE
const MODULE = 16;                        // le tunnel est fait de tronçons identiques de 16 m
const CLIMB_V = 31;                       // bond de l'échelle jusqu'à la surface
const P_HALF_X = 0.32, P_HALF_Z = 0.35;
const BALL = new THREE.SphereGeometry(1, 8, 6);
const SEWER_LIGHT = new THREE.Color('#d8ecc0');
export const ceilAt = (x) => WALL_TOP + ARCH_H * Math.sqrt(Math.max(0, 1 - (x / WALL_X) ** 2));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// ---------- Tunnel ----------
// profil (x, y) extrudé le long de z ; parcouru dans le sens horaire vu de derrière, la face visible
// est à droite du sens de parcours (intérieur du tunnel, dessus des quais)
function extrude(profile, z0, z1, tile) {
  const pos = [], nor = [], uv = [], idx = [];
  let s = 0;
  for (let k = 0; k < profile.length; k++) {
    const [x, y] = profile[k];
    if (k) s += Math.hypot(x - profile[k - 1][0], y - profile[k - 1][1]);
    // normale : à droite de la tangente locale
    const a = profile[Math.max(0, k - 1)], b = profile[Math.min(profile.length - 1, k + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    for (const z of [z0, z1]) {
      pos.push(x, y, z);
      nor.push(ty / l, -tx / l, 0);
      uv.push(s / tile, z / tile);
    }
    if (k) {
      const A = (k - 1) * 2, B = A + 1, C = k * 2 + 1, D = k * 2;
      idx.push(A, B, C, A, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function archProfile(n = 24) {
  const pts = [[-WALL_X, SLUDGE_Y], [-WALL_X, WALL_TOP]];
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([Math.cos(a) * WALL_X, WALL_TOP + Math.sin(a) * ARCH_H]);
  }
  pts.push([WALL_X, WALL_TOP], [WALL_X, SLUDGE_Y]);
  return pts;
}

// un tronçon de 16 m de détails : arcs de pierre, lampes grillagées, tuyaux, déversoirs, graffitis
function moduleDetails(b, glow, lamps) {
  const arch = archProfile(14);
  for (const z of [0, -8]) {
    for (let k = 1; k < arch.length - 2; k++) {
      const [x0, y0] = arch[k], [x1, y1] = arch[k + 1];
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.hypot(cx, cy - WALL_TOP) || 1;
      const ix = k === 1 || k === arch.length - 3 ? -Math.sign(cx) * 0.12 : (-cx / n) * 0.12;
      b.add(U.box, '#5a4636', [cx + ix, cy - (cy > WALL_TOP ? ((cy - WALL_TOP) / n) * 0.12 : 0), z], [0.26, len + 0.06, 0.6], [0, 0, Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2]);
    }
    for (const s of [-1, 1]) {
      b.add(U.box, '#4a3a2e', [s * (WALL_X - 0.2), SEWER_Y + 0.25, z], [0.4, 0.5, 0.8]);   // socles
      b.add(U.box, '#5a4636', [s * (WALL_X - 0.12), (SEWER_Y + WALL_TOP) / 2, z], [0.26, WALL_TOP - SEWER_Y, 0.6]);
    }
  }
  for (const s of [-1, 1]) {
    // bordure des quais et coulures de mousse au pied des murs
    b.add(U.box, '#6a665c', [s * (EDGE + 0.12), SEWER_Y + 0.02, -8], [0.26, 0.06, MODULE]);
    b.add(U.box, '#3e5a2a', [s * (WALL_X - 0.01), SEWER_Y + 0.15, -8], [0.02, 0.3, MODULE]);
    // tuyaux le long des murs
    b.add(U.cyl, '#5a6066', [s * (WALL_X - 0.22), SEWER_Y + 2.7, -8], [0.18, MODULE, 0.18], [Math.PI / 2, 0, 0]);
    b.add(U.cyl, '#7a4a2a', [s * (WALL_X - 0.16), SEWER_Y + 3.2, -8], [0.1, MODULE, 0.1], [Math.PI / 2, 0, 0]);
    for (const z of [-2, -10]) {
      b.add(U.cyl, '#4a5056', [s * (WALL_X - 0.22), SEWER_Y + 2.7, z], [0.23, 0.2, 0.23], [Math.PI / 2, 0, 0]);
      b.add(U.box, '#2a2a2e', [s * (WALL_X - 0.12), SEWER_Y + 2.95, z], [0.24, 0.7, 0.1]);
    }
    // lampe grillagée (une par côté, en quinconce)
    const lz = s < 0 ? -4 : -12, lx = s * (WALL_X - 0.25), ly = SEWER_Y + 3.9;
    b.add(U.box, '#2a2a2e', [s * (WALL_X - 0.1), ly + 0.25, lz], [0.2, 0.08, 0.08]);
    b.add(U.cone8, '#2a2a2e', [lx, ly + 0.2, lz], [0.22, 0.14, 0.22], [Math.PI, 0, 0]);
    for (let i = 0; i < 4; i++) b.add(U.box, '#2a2a2e', [lx + Math.cos(i * 1.57) * 0.12, ly, lz + Math.sin(i * 1.57) * 0.12], [0.02, 0.3, 0.02]);
    glow.add(BALL, '#ffe2a0', [lx, ly, lz], [0.11, 0.14, 0.11]);
    lamps.push([lx, ly, lz]);
    // déversoir dans la paroi du canal, filet vert qui coule
    const dz = s < 0 ? -11 : -3;
    b.add(U.cyl, '#3a3a3e', [s * (EDGE + 0.02), SEWER_Y - 0.3, dz], [0.26, 0.1, 0.26], [0, 0, Math.PI / 2]);
    b.add(U.cyl, '#0e100c', [s * (EDGE - 0.02), SEWER_Y - 0.3, dz], [0.18, 0.04, 0.18], [0, 0, Math.PI / 2]);
    glow.add(U.box, '#8ad84a', [s * (EDGE - 0.12), SEWER_Y - 0.48, dz], [0.18, 0.36, 0.12]);
    // graffitis kawaii : cœur, étoile, bulle
    const gz = s < 0 ? -6.5 : -14.5, gx = s * (WALL_X - 0.02);
    const gc = pick(['#ff7ab0', '#7ad8f0', '#ffd23f', '#9a7aff', '#7ae0a0']);
    b.add(U.box, gc, [gx, SEWER_Y + 1.6, gz - 0.2], [0.02, 0.5, 0.5], [0.785, 0, 0]);
    b.add(U.box, gc, [gx, SEWER_Y + 1.6, gz + 0.2], [0.02, 0.5, 0.5], [0.785, 0, 0]);
    b.add(U.box, gc, [gx, SEWER_Y + 1.4, gz], [0.02, 0.5, 0.5], [0.785, 0, 0]);
    b.add(U.box, pick(['#f4f0e8', '#ffd23f']), [gx, SEWER_Y + 1.1, gz + 1.4], [0.02, 0.12, 1.8]);
    // grille d'égout au sol des quais
    b.add(U.box, '#2a2826', [s * 3.2, SEWER_Y + 0.01, s < 0 ? -13 : -5.5], [0.8, 0.02, 0.8]);
  }
}

function buildTunnel() {
  const group = new THREE.Group();
  const Z0 = MODULE * 3, Z1 = -MODULE * 13;
  const brick = NX.sewerBrick();
  const brickMat = new THREE.MeshLambertMaterial({ map: brick });
  // voûte + murs, et parois du canal
  const shell = extrude(archProfile(), Z0, Z1, 4);
  const chanL = extrude([[-EDGE, SLUDGE_Y - 0.3], [-EDGE, SEWER_Y]], Z0, Z1, 4);
  const chanR = extrude([[EDGE, SEWER_Y], [EDGE, SLUDGE_Y - 0.3]], Z0, Z1, 4);
  group.add(new THREE.Mesh(shell, brickMat), new THREE.Mesh(chanL, brickMat), new THREE.Mesh(chanR, brickMat));
  // quais en dalles
  const slabMat = new THREE.MeshLambertMaterial({ map: NX.sewerSlabs() });
  group.add(new THREE.Mesh(extrude([[-EDGE, SEWER_Y], [-WALL_X, SEWER_Y]], Z0, Z1, 2), slabMat));
  group.add(new THREE.Mesh(extrude([[WALL_X, SEWER_Y], [EDGE, SEWER_Y]], Z0, Z1, 2), slabMat));
  // boue qui coule vers le joueur
  const sludgeTex = NX.sludgeTexture();
  const sludge = new THREE.Mesh(extrude([[EDGE, SLUDGE_Y], [-EDGE, SLUDGE_Y]], Z0, Z1, 4),
    new THREE.MeshLambertMaterial({ map: sludgeTex, emissive: '#26300c' }));
  group.add(sludge);
  // détails répétés à chaque tronçon
  const b = new Builder(), glow = new Builder(), lamps = [];
  const one = [];
  moduleDetails(b, glow, one);
  const modGeo = b.build(), glowGeo = glow.build();
  // tous les tronçons fusionnés : 2 appels de dessin pour tout le tunnel
  const mods = [], glows = [];
  for (let z = Z0; z > Z1; z -= MODULE) {
    mods.push(modGeo.clone().translate(0, 0, z));
    glows.push(glowGeo.clone().translate(0, 0, z));
    for (const [x, y, lz] of one) lamps.push(x, y, lz + z);
  }
  group.add(new THREE.Mesh(mergeGeometries(mods, false), vcMat));
  group.add(new THREE.Mesh(mergeGeometries(glows, false), new THREE.MeshBasicMaterial({ vertexColors: true })));
  [...mods, ...glows, modGeo, glowGeo].forEach((g) => g.dispose());
  // halo des lampes
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
  const halo = new THREE.Points(pg, new THREE.PointsMaterial({
    size: 2.2, map: haloTexture(), color: '#ffd890', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(halo);
  return { group, sludgeTex };
}

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,200,0.9)');
  grd.addColorStop(0.3, 'rgba(255,220,140,0.35)');
  grd.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// flèche verte lumineuse qui signale une échelle : « saute ici pour remonter »
function arrowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.shadowColor = '#5aff7a';
  g.shadowBlur = 18;
  g.fillStyle = '#7aff9a';
  g.beginPath();
  g.moveTo(64, 14); g.lineTo(110, 62); g.lineTo(80, 62); g.lineTo(80, 112); g.lineTo(48, 112); g.lineTo(48, 62); g.lineTo(18, 62);
  g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = '#1a5a2a'; g.lineWidth = 5; g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bubbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(200,230,140,0.9)';
  g.lineWidth = 3;
  g.beginPath(); g.arc(16, 16, 12, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.arc(11, 11, 3, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}

// ---------- Objets des égouts (construits pour le quai de droite, tournés de 180° à gauche) ----------
// x local : 0 = centre de la voie, + vers le mur, - vers le canal
function ratGeo() {   // un gros rat assis, immobile, qui fixe le joueur de ses yeux rouges
  const b = new Builder();
  const y = SEWER_Y, fur = pick(['#5e5a66', '#6a6672', '#54505c']);
  b.add(BALL, fur, [0, y + 0.3, -0.05], [0.3, 0.3, 0.42]);                   // corps
  b.add(BALL, '#c8c0c8', [0, y + 0.24, 0.05], [0.22, 0.2, 0.33]);            // ventre
  b.add(BALL, fur, [0, y + 0.5, 0.3], [0.22, 0.21, 0.24]);                   // tête
  b.add(BALL, '#827e8a', [0, y + 0.45, 0.5], [0.11, 0.1, 0.14]);             // museau
  b.add(BALL, '#ff8aa8', [0, y + 0.47, 0.63], [0.045, 0.04, 0.035]);         // nez
  for (const s of [-1, 1]) {
    b.add(BALL, fur, [s * 0.16, y + 0.72, 0.25], [0.12, 0.12, 0.035]);       // oreilles
    b.add(BALL, '#ffb0c8', [s * 0.16, y + 0.72, 0.28], [0.08, 0.08, 0.012]);
    b.add(BALL, '#1a0606', [s * 0.1, y + 0.56, 0.47], [0.06, 0.065, 0.03]);   // yeux rouges luisants
    b.add(BALL, '#ff2020', [s * 0.1, y + 0.56, 0.49], [0.045, 0.05, 0.02]);
    b.add(BALL, '#ffd0d0', [s * 0.085, y + 0.58, 0.505], [0.014, 0.014, 0.006]);
    b.add(U.box, '#2a1a1a', [s * 0.1, y + 0.64, 0.47], [0.1, 0.02, 0.02], [0, 0, s * -0.4]);   // sourcils méchants
    for (const dy of [-0.015, 0.02]) b.add(U.box, '#e8e8e8', [s * 0.16, y + 0.46 + dy, 0.6], [0.22, 0.008, 0.008], [0, s * 0.3, dy * 6]);
    b.add(BALL, '#d88aa0', [s * 0.12, y + 0.06, 0.25], [0.06, 0.06, 0.09]);  // pattes
    b.add(BALL, '#d88aa0', [s * 0.18, y + 0.06, -0.3], [0.07, 0.06, 0.11]);
  }
  for (const s of [-1, 1]) b.add(U.box, '#f4f0e0', [s * 0.025, y + 0.37, 0.6], [0.04, 0.06, 0.02]);   // dents
  for (let k = 0; k < 9; k++) b.add(U.cyl6, '#e8a0b0', [Math.sin(k * 0.8) * 0.12, y + 0.08, -0.45 - k * 0.11], [0.03 - k * 0.002, 0.13, 0.03 - k * 0.002], [Math.PI / 2, 0, 0]);
  const g = b.build();
  g.translate(0, -SEWER_Y, 0).scale(1.5, 1.5, 1.5).translate(0, SEWER_Y, 0);
  return g;
}

function toxicBarrels() {
  const b = new Builder();
  for (const x of [-0.4, 0.42]) {
    const y = SEWER_Y;
    b.add(U.cyl, '#6a4a28', [x, y + 0.47, 0], [0.34, 0.94, 0.34]);
    for (const dy of [0.2, 0.74]) b.add(U.cyl, '#4a3420', [x, y + dy, 0], [0.355, 0.06, 0.355]);
    b.add(U.cyl, '#f2c230', [x, y + 0.47, 0.33], [0.16, 0.02, 0.16], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) {   // trèfle de danger
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      b.add(U.cone4, '#141414', [x + Math.cos(a) * 0.08, y + 0.47 - Math.sin(a) * 0.08, 0.35], [0.06, 0.08, 0.01], [Math.PI / 2, 0, a - Math.PI / 2]);
    }
    b.add(U.cyl, '#7aff4a', [x, y + 0.95, 0], [0.3, 0.03, 0.3]);   // boue fluo qui déborde
    for (let i = 0; i < 4; i++) b.add(BALL, '#7aff4a', [x + Math.cos(i * 1.6) * 0.3, y + 0.8 - (i % 2) * 0.2, Math.sin(i * 1.6) * 0.3], [0.06, 0.16, 0.06]);
  }
  b.add(U.cyl, '#5ad83a', [0, SEWER_Y + 0.01, 0.4], [0.7, 0.01, 0.5]);   // flaque
  return b.build();
}

function bigPipe() {   // gros tuyau rouillé en travers du quai, à hauteur de tête : roulade !
  const b = new Builder();
  const y = SEWER_Y + 1.78;
  b.add(U.cyl, '#7a5a3a', [0.3, y, 0], [0.32, 3.2, 0.32], [0, 0, Math.PI / 2]);
  for (const x of [-1.0, -0.2, 0.6, 1.4]) b.add(U.cyl, '#f2c230', [x, y, 0], [0.335, 0.16, 0.335], [0, 0, Math.PI / 2]);
  for (const x of [-0.6, 0.2, 1.0]) b.add(U.cyl, '#1a1a1c', [x, y, 0], [0.335, 0.16, 0.335], [0, 0, Math.PI / 2]);
  b.add(U.cyl, '#5a4028', [-1.3, y, 0], [0.42, 0.12, 0.42], [0, 0, Math.PI / 2]);   // bride
  b.add(U.cyl, '#5a4028', [1.75, y - 0.9, 0], [0.12, 1.8, 0.12]);                    // descente au mur
  // vanne rouge
  b.add(U.cyl6, '#3a3a3e', [0.2, y + 0.45, 0], [0.05, 0.3, 0.05]);
  b.add(U.cyl, '#d8202a', [0.2, y + 0.6, 0], [0.24, 0.04, 0.24]);
  for (let i = 0; i < 3; i++) b.add(U.box, '#d8202a', [0.2, y + 0.6, 0], [0.46, 0.04, 0.04], [0, (i * Math.PI) / 3, 0]);
  // gouttes vertes et flaque dessous
  for (const x of [-0.8, 0.4]) {
    b.add(BALL, '#7ad84a', [x, y - 0.42, 0], [0.05, 0.09, 0.05]);
    b.add(U.cyl, '#5ab83a', [x, SEWER_Y + 0.01, 0.1], [0.3, 0.01, 0.25]);
  }
  return b.build();
}

function grille() {   // grille rouillée du sol à la voûte avec panneau DANGER : infranchissable
  const b = new Builder();
  const top = ceilAt(LANES[2] - 1.3) + 0.2, y0 = SEWER_Y, h = top - y0;
  const RUST = '#5a3e2c';
  for (let i = 0; i <= 12; i++) b.add(U.box, RUST, [-1.3 + i * 0.25, y0 + h / 2, 0], [0.06, h, 0.06]);
  for (const dy of [0.15, 1.6, 3.2, 4.8]) if (dy < h) b.add(U.box, '#4a3022', [0.2, y0 + dy, 0], [3.1, 0.14, 0.12]);
  // panneau jaune et noir
  b.add(U.box, '#f2c230', [0, y0 + 2.3, 0.08], [0.9, 0.9, 0.03], [0, 0, Math.PI / 4]);
  b.add(U.box, '#141414', [0, y0 + 2.36, 0.1], [0.1, 0.4, 0.01]);
  b.add(U.box, '#141414', [0, y0 + 2.04, 0.1], [0.1, 0.1, 0.01]);
  for (let i = 0; i < 6; i++) b.add(U.box, i % 2 ? '#141414' : '#f2c230', [-1.0 + i * 0.4, y0 + 1.2, 0.08], [0.4, 0.2, 0.02]);
  // éboulis de briques au pied
  for (let i = 0; i < 9; i++) b.add(U.box, pick(['#7a4a3a', '#6a3a2a', '#8a5a44']), [rand(-1.1, 1.4), y0 + 0.12 + rand(0, 0.2), rand(0.1, 0.5)], [0.36, 0.16, 0.18], [rand(-0.4, 0.4), rand(0, 3), rand(-0.3, 0.3)]);
  return b.build();
}

function ladderGeo() {   // échelle de fer contre le mur, jusqu'au puits de la bouche d'égout
  const b = new Builder();
  const lx = 1.0, top = ceilAt(LANES[2] + lx) + 0.4;
  for (const dz of [-0.28, 0.28]) b.add(U.box, '#3a3e42', [lx, (SEWER_Y + top) / 2, dz], [0.06, top - SEWER_Y, 0.06]);
  for (let y = SEWER_Y + 0.3; y < top; y += 0.32) b.add(U.box, '#5a5e62', [lx, y, 0], [0.05, 0.05, 0.56]);
  // panneau « EXIT » vert sur le mur
  b.add(U.box, '#1a6a3a', [1.68, SEWER_Y + 2.2, 1.1], [0.04, 0.4, 0.9]);
  b.add(U.box, '#c8ffd8', [1.66, SEWER_Y + 2.2, 1.1], [0.02, 0.16, 0.6]);
  return b.build();
}

function poopGeo() {   // tas dégoûtant qui flotte dans la boue (et qui louche)
  const b = new Builder();
  const C = ['#6a4220', '#7a5028', '#5a3818'];
  for (let i = 0; i < 3; i++) b.add(BALL, C[i], [0, 0.1 + i * 0.13, 0], [0.3 - i * 0.08, 0.1, 0.3 - i * 0.08]);
  b.add(U.cone8, C[1], [0.02, 0.5, 0], [0.07, 0.14, 0.07], [0, 0, -0.4]);
  for (const s of [-1, 1]) {
    b.add(BALL, '#ffffff', [s * 0.07, 0.3, 0.17], [0.05, 0.06, 0.03]);
    b.add(BALL, '#141414', [s * 0.07 - s * 0.02, 0.29, 0.195], [0.025, 0.03, 0.01]);
  }
  return b.build();
}

// bouche d'égout ouverte sur la chaussée : trou noir, plaque déplacée, cône, vapeur
function holeGeo() {
  const b = new Builder();
  b.add(U.cyl, '#3a3a40', [0, 0.012, 0], [0.92, 0.02, 0.92]);
  b.add(U.cyl, '#0c0c0e', [0, 0.02, 0], [0.8, 0.02, 0.8]);
  b.add(U.cyl, '#020203', [0, 0.024, 0], [0.62, 0.02, 0.62]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(U.box, '#6a6a70', [Math.cos(a) * 0.86, 0.04, Math.sin(a) * 0.86], [0.1, 0.05, 0.36], [0, -a, 0]);
  }
  // plaque de fonte posée de travers à côté
  b.add(U.cyl, '#4a4a50', [1.05, 0.12, 0.4], [0.72, 0.05, 0.72], [0.12, 0, 0.18]);
  for (let i = 0; i < 4; i++) b.add(U.box, '#3a3a40', [1.05, 0.155 + i * 0.008, 0.4 - 0.45 + i * 0.3], [1.0, 0.02, 0.06], [0.12, 0, 0.18]);
  // vapeur qui s'échappe
  for (let i = 0; i < 4; i++) b.add(BALL, '#ecece8', [rand(-0.2, 0.2), 0.7 + i * 0.5, -0.4 - i * 0.2], [0.32 + i * 0.1, 0.26 + i * 0.06, 0.32 + i * 0.1]);
  return b.build();
}
function coneGeo() {
  const b = new Builder();
  b.add(U.box, '#2a2a2e', [0, 0.03, 0], [0.42, 0.06, 0.42]);
  b.add(U.cone8, '#ff6a1a', [0, 0.4, 0], [0.18, 0.75, 0.18]);
  b.add(U.cyl, '#f4f0e8', [0, 0.45, 0], [0.11, 0.08, 0.11]);
  return b.build();
}

// ---------- Voile sombre pendant le passage rue / égout ----------
let veil = null;
function getVeil() {
  if (veil) return veil;
  veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:1;'
    + 'background:radial-gradient(circle at 50% 55%, rgba(20,26,14,0.55) 0%, rgba(6,8,4,0.96) 70%);';
  const game = document.getElementById('game');
  (game && game.parentNode ? game.parentNode : document.body).insertBefore(veil, game ? game.nextSibling : null);
  return veil;
}

// ---------- Moteur d'obstacles à deux étages ----------
export class NYObstacles extends Obstacles {
  constructor(root, opts) {
    const street = new THREE.Group();
    root.add(street);
    super(street, opts);
    this.root = root;
    this.world = opts.world;
    this.sound = opts.sound;
    this.fog = opts.fog;
    this.fogColor = new THREE.Color(opts.fogColor);
    this.sewerFog = new THREE.Color('#1c2418');

    this.sewer = new THREE.Group();
    root.add(this.sewer);
    const T = buildTunnel();
    this.tunnel = T.group;
    this.sludgeTex = T.sludgeTex;
    this.sewer.add(this.tunnel);

    this.geo = {
      rats: [0, 1, 2].map(ratGeo), barrels: toxicBarrels(), pipe: bigPipe(), grille: grille(),
      ladder: ladderGeo(), poop: poopGeo(), hole: holeGeo(), cone: coneGeo(),
    };
    this.shaftMat = new THREE.MeshBasicMaterial({ color: '#0c0e0a', side: THREE.BackSide });
    this.skyMat = new THREE.MeshBasicMaterial({ color: '#fff4d8' });
    this.beamMat = new THREE.MeshBasicMaterial({ color: '#fff2c0', transparent: true, opacity: 0.11, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.arrowMat = new THREE.SpriteMaterial({ map: arrowTexture(), transparent: true, depthWrite: false });
    this.shaftGeo = new THREE.CylinderGeometry(0.72, 0.72, 1, 16, 1, true);
    this.beamGeo = new THREE.CylinderGeometry(0.6, 1.5, 1, 16, 1, true);

    // bulles qui remontent de la boue
    const N = 50;
    const bp = new Float32Array(N * 3);
    this.bubbleSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) { bp.set([rand(-1.1, 1.1), SLUDGE_Y + rand(0, 0.8), rand(-60, 6)], i * 3); this.bubbleSeed[i] = Math.random(); }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    this.bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.22, map: bubbleTexture(), transparent: true, depthWrite: false }));
    this.bubbles.frustumCulled = false;
    this.sewer.add(this.bubbles);

    this.veil = getVeil();
    this.veilOp = -1;
    this.lightBase = this.world ? { hemi: this.world.hemi.intensity, sun: this.world.sun.intensity, hemiCol: this.world.hemi.color.clone() } : null;
    this.reset(0);
  }

  reset(startZ) {
    super.reset(startZ);
    if (!this.sewer) return;   // appelé une première fois par le constructeur parent
    for (const o of this.sList || []) if (o.mesh) this.sewer.remove(o.mesh);
    this.sList = [];
    this.sCursor = startZ - 50;
    this.sBusy = [startZ, startZ, startZ];
    this.sLast = null;
    this.nextLadder = startZ - rand(70, 110);
    this.nextHole = startZ - rand(150, 230);
    this.under = false;
    this.sewer.visible = true;
    this.setStreetVisible(true);
    this.applyDepth(0);
    if (this.sound && this.sound.setMuffle) this.sound.setMuffle(false);
  }

  warmupGroup() {
    const g = super.warmupGroup();
    for (const k of ['barrels', 'pipe', 'grille', 'ladder', 'poop', 'hole', 'cone']) g.add(new THREE.Mesh(this.geo[k], vcMat));
    g.add(new THREE.Mesh(this.geo.rats[0], vcMat), new THREE.Mesh(this.shaftGeo, this.shaftMat), new THREE.Mesh(this.beamGeo, this.beamMat), new THREE.Sprite(this.arrowMat));
    return g;
  }

  // ---------- Rue : bouches d'égout ouvertes ----------
  spawnObstacles(z, speed, dist) {
    const gap = super.spawnObstacles(z, speed, dist);
    if (dist > 40 && z < this.nextHole) {
      const lanes = [0, 2].filter((l) => this.busy[l] - z >= 6 && !(this.reserve && this.reserve.lane === l)
        && !this.list.some((o) => o.moving && o.lane === l));
      if (lanes.length) {
        this.addHole(pick(lanes), z, true);
        this.nextHole = z - rand(130, 260);
      }
    }
    return gap;
  }

  addHole(lane, z, open) {
    const x = LANES[lane];
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.geo.hole, vcMat));
    const cone = new THREE.Mesh(this.geo.cone, vcMat);
    cone.position.set(lane === 0 ? -1.3 : 1.3, 0, 1.2);
    g.add(cone);
    if (lane === 0) g.rotation.y = Math.PI;
    g.position.set(x, 0, z - 0.8);
    this.scene.add(g);
    this.list.push({ kind: open ? 'hole' : 'deco', lane, x, halfW: 0.8, zNear: z, zFar: z - 1.6, mesh: g });
    this.busy[lane] = Math.min(this.busy[lane], z - 2);
  }

  // ---------- Égouts : génération ----------
  addS(o) {
    o.x = LANES[o.lane];
    if (o.mesh) {
      o.mesh.position.set(o.x, 0, (o.zNear + o.zFar) / 2);
      if (o.lane === 0) o.mesh.rotation.y = Math.PI;
      this.sewer.add(o.mesh);
    }
    this.sList.push(o);
    return o;
  }

  addLadder(lane, z) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.geo.ladder, vcMat));
    // puits de la bouche d'égout et rai de lumière du jour
    const sx = 0.5, cy = ceilAt(LANES[2] + sx);
    const shaft = new THREE.Mesh(this.shaftGeo, this.shaftMat);
    shaft.scale.y = -cy + 0.2;
    shaft.position.set(sx, (cy - 0.2) / 2, 0);
    const sky = new THREE.Mesh(new THREE.CircleGeometry(0.72, 16), this.skyMat);
    sky.rotation.x = Math.PI / 2;
    sky.position.set(sx, -0.25, 0);
    const beam = new THREE.Mesh(this.beamGeo, this.beamMat);
    beam.scale.y = cy - SEWER_Y;
    beam.position.set(sx - 0.2, (cy + SEWER_Y) / 2, 0);
    const arrow = new THREE.Sprite(this.arrowMat);
    arrow.scale.set(1.1, 1.1, 1);
    arrow.position.set(0, SEWER_Y + 2.5, 0);
    g.add(shaft, sky, beam, arrow);
    const o = this.addS({ kind: 'ladder', lane, zNear: z + 4.5, zFar: z - 3, mesh: g, arrow });
    o.mesh.position.z = z;
    return o;
  }

  addSewerObstacle(lane, z, type, moving) {
    let geo, kind, h = 0, depth, halfW = 1.0;
    if (type === 'rats') { geo = pick(this.geo.rats); kind = 'low'; h = 1.0; depth = 1.2; halfW = 0.7; }
    else if (type === 'barrels') { geo = this.geo.barrels; kind = 'low'; h = 1.0; depth = 0.8; }
    else if (type === 'pipe') { geo = this.geo.pipe; kind = 'high'; depth = 0.7; }
    else { geo = this.geo.grille; kind = 'wall'; depth = 0.5; halfW = 1.2; }
    const mesh = new THREE.Mesh(geo, vcMat);
    const o = this.addS({ kind, h, lane, halfW, zNear: z, zFar: z - depth, mesh, moving: !!moving, v: moving ? rand(4, 6) : 0, rats: type === 'rats', phase: Math.random() * 6 });
    this.sBusy[lane] = Math.min(this.sBusy[lane], z - depth);
    return o;
  }

  spawnSewerRow(z, speed, dist) {
    const diff = Math.min(1, dist / 2500);
    const rowGap = Math.max(16, speed * 1.15) + rand(0, 8) * (1 - diff * 0.5);
    const minGap = Math.max(8, speed * 0.6);
    const free = [0, 2].filter((l) => this.sBusy[l] - z >= minGap);
    this.sewerCandies(z, speed);
    // petits tas qui flottent dans la boue
    if (Math.random() < 0.5) {
      const m = new THREE.Mesh(this.geo.poop, vcMat);
      const pz = z - rand(0, rowGap);
      m.position.set(rand(-0.7, 0.7), SLUDGE_Y, pz);
      m.rotation.y = rand(-0.6, 0.6);
      this.sewer.add(m);
      this.sList.push({ kind: 'deco', lane: 1, x: m.position.x, zNear: pz + 0.4, zFar: pz - 0.4, mesh: m, moving: true, v: 2.2, phase: Math.random() * 6, float: true });
    }
    // échelle de sortie, régulièrement
    if (z < this.nextLadder && free.length) {
      const l = pick(free);
      this.addLadder(l, z);
      this.sBusy[l] = z - 8;
      this.nextLadder = z - rand(80, 140);
      return rowGap * 0.8;
    }
    if (Math.random() < 0.12) return rowGap * 0.6;   // respiration
    // grille qui bloque un quai : il faut sauter de l'autre côté du canal
    if (free.length === 2 && Math.random() < 0.28 + 0.1 * diff) {
      const a = pick([0, 2]), other = 2 - a;
      if (this.sBusy[other] - z >= 14) {
        this.addSewerObstacle(a, z, 'grille');
        this.sBusy[other] = Math.min(this.sBusy[other], z - 10);   // l'autre quai reste dégagé pour se poser
        return rowGap;
      }
    }
    const lanes = free.sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.6 ? 1 : 2;
    lanes.slice(0, count).forEach((l) => {
      const r = Math.random();
      if (r < 0.42) this.addSewerObstacle(l, z, 'rats');
      else if (r < 0.65) this.addSewerObstacle(l, z, 'barrels');
      else this.addSewerObstacle(l, z, 'pipe');
    });
    return rowGap;
  }

  // friandises : en arc au-dessus du canal (pour donner envie de traverser) ou en ligne sur un quai
  sewerCandies(z, speed) {
    const C = this.candies;
    if (!C || this.sLast === null) { this.sLast = z; return; }
    const zFrom = this.sLast - 3, zTo = z + 3;
    this.sLast = z;
    if (zFrom - zTo < 6) return;
    if (Math.random() < 0.4) {
      const a = pick([0, 2]), b = 2 - a, len = Math.min(zFrom - zTo, speed * 0.7);
      const z0 = zFrom - Math.random() * Math.max(0, zFrom - zTo - len);
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const x = LANES[a] + (LANES[b] - LANES[a]) * smooth(0.1, 0.8, t);
        C.placeAt(x, SEWER_Y + 0.9 + 2.0 * Math.sin(t * Math.PI), z0 - t * len, -1, i * 0.6);
      }
    } else if (Math.random() < 0.75) {
      const l = pick([0, 2]);
      if (this.sList.some((o) => o.lane === l && o.kind !== 'deco' && o.zNear > zTo - 2 && o.zFar < zFrom + 2)) return;
      const z0 = zFrom - Math.random() * Math.max(0, zFrom - zTo - 6);
      for (let i = 0; i < 3; i++) C.placeAt(LANES[l], SEWER_Y + 0.9, z0 - i * 2.2, -1, i * 0.6);
    }
  }

  // vide une zone d'une voie à un étage (là où le joueur va se poser : il ne pouvait pas la voir)
  clearLane(sewer, lane, zFrom, zTo) {
    const list = sewer ? this.sList : this.list, grp = sewer ? this.sewer : this.scene;
    let j = 0;
    for (const o of list) {
      const hit = o.lane === lane && o.kind !== 'ladder' && !o.float
        && (o.moving ? o.zFar < zFrom : o.zFar < zFrom && o.zNear > zTo);
      if (hit) { if (o.mesh) grp.remove(o.mesh); } else list[j++] = o;
    }
    list.length = j;
  }

  update(pz, speed, dist) {
    super.update(pz, speed, dist);
    while (this.sCursor > pz - SPAWN_AHEAD * 0.65) this.sCursor -= this.spawnSewerRow(this.sCursor, speed, dist);
    const limit = pz + DESPAWN_BEHIND;
    let j = 0;
    for (const o of this.sList) {
      if (o.zFar > limit) { if (o.mesh) this.sewer.remove(o.mesh); } else this.sList[j++] = o;
    }
    this.sList.length = j;
  }

  move(dt) {
    super.move(dt);
    for (const o of this.sList) {
      if (!o.moving) continue;
      const d = o.v * dt;
      o.zNear += d; o.zFar += d;
      o.mesh.position.z += d;
    }
  }

  // ---------- Collisions ----------
  resolve(p) {
    if (p.under) {
      if (p.y >= 0 && p.vy > 0) {   // sortie par le puits : retour à la surface
        p.under = false;
      } else {
        this.under = true;
        return this.resolveSewer(p);
      }
    }
    this.under = false;
    const r = super.resolve(p);
    if (!r.crash && p.y <= 0.02 && r.ground === 0) {
      for (const o of this.list) {
        if (o.kind !== 'hole' || Math.abs(p.x - o.x) > 0.62) continue;
        if (p.z <= o.zNear - 0.25 && p.z >= o.zFar + 0.25) {
          this.enterSewer(p, o);
          r.ground = SEWER_Y;
          break;
        }
      }
    }
    return r;
  }

  resolveSewer(p) {
    let ground = SEWER_Y, crash = null;
    const ry = p.y - SEWER_Y;
    if (Math.abs(p.x) < EDGE - 0.25) {   // au-dessus de la boue : on y tombe
      ground = SLUDGE_Y - 0.4;
      if (p.y <= SEWER_Y - 0.3) crash = { kind: 'sludge' };
    }
    const zMin = p.z - P_HALF_Z, zMax = p.z + P_HALF_Z;
    for (const o of this.sList) {
      if (o.kind === 'deco' || o.kind === 'ladder') continue;
      if (Math.abs(p.x - o.x) > o.halfW + P_HALF_X) continue;
      if (zMin > o.zNear || zMax < o.zFar) continue;
      if (o.kind === 'low') { if (ry < o.h) crash = o; }
      else if (o.kind === 'high') { if (ry + p.h > 1.32 && ry < 2.75) crash = o; }
      else if (o.kind === 'wall' && ry < 5) crash = o;
    }
    return { ground, crash };
  }

  enterSewer(p, hole) {
    p.under = true;
    this.under = true;
    // la zone d'atterrissage est dégagée (et sans grille avant longtemps)
    this.clearLane(true, hole.lane, p.z + 4, p.z - 45);
    for (const o of this.sList) {
      if (o.kind === 'wall' && o.lane === hole.lane && o.zNear > p.z - 90) o.dead = true;
    }
    this.sList = this.sList.filter((o) => { if (o.dead) { this.sewer.remove(o.mesh); return false; } return true; });
    if (this.sound && this.sound.fall) this.sound.fall();
  }

  // saut au pied d'une échelle : bond jusqu'à la surface (renvoie la vitesse verticale, 0 sinon)
  jumpBoost(p) {
    if (!p.under || p.y > SEWER_Y + 0.2) return 0;
    const lad = this.sList.find((o) => o.kind === 'ladder' && o.lane === p.lane && p.z <= o.zNear && p.z >= o.zFar);
    if (!lad) return 0;
    // la rue au-dessus est dégagée dans cette voie (le joueur ne pouvait pas la voir)
    this.clearLane(false, p.lane, p.z + 6, p.z - 70);
    const exitZ = p.z - (this.lastSpeed || 20) * 0.3;
    this.addHole(p.lane, exitZ + 0.8, false);
    if (this.sound && this.sound.climb) this.sound.climb();
    return CLIMB_V;
  }

  // changement de voie : en l'air au-dessus des égouts, on traverse le canal d'un coup
  laneTarget(p, d) {
    const to = p.lane + d;
    if (p.under && !p.grounded && p.lane !== 1 && to === 1) return 1 + d;
    return to;
  }

  groundAt(x, z, margin = 0, under = false) {
    if (under) return Math.abs(x) < EDGE - 0.25 ? SLUDGE_Y : SEWER_Y;
    return super.groundAt(x, z, margin);
  }

  baseY(p) { return p.under ? SEWER_Y : 0; }

  // la caméra reste sous la voûte tant que le joueur est dans les égouts
  clampCam(out, look, p) {
    if (!p.under) return;
    out.y = Math.min(out.y, ceilAt(out.x) - 0.5);
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

  // 0 = dans la rue, 1 = dans les égouts : brouillard, lumière et son
  applyDepth(k) {
    if (this.depthK === k) return;
    this.depthK = k;
    if (this.fog) {
      this.fog.color.copy(this.fogColor).lerp(this.sewerFog, k);
      this.fog.near = 80 + (6 - 80) * k;
      this.fog.far = 270 + (75 - 270) * k;
    }
    const L = this.lightBase;
    if (L) {
      this.world.hemi.intensity = L.hemi + (1.9 - L.hemi) * k;
      this.world.hemi.color.copy(L.hemiCol).lerp(SEWER_LIGHT, k);
      this.world.sun.intensity = L.sun * (1 - 0.6 * k);
    }
  }

  // appelé à chaque image par la boucle principale
  frame(dt, p, camera, { running, speed }) {
    this.lastSpeed = speed;
    const camY = camera.position.y;
    this.sewer.visible = p.under || camY < 0.8 || p.y < -0.05;
    const deep = camY < -0.8 && p.y < -0.8;
    this.setStreetVisible(!deep);
    // friandises de la rue cachées sous terre (calque 1, que la caméra ne voit pas), et inversement
    if (this.candies && (deep || this.wasDeep)) {
      for (const c of this.candies.list) c.mesh.layers.set(deep === c.y >= 0 ? 1 : 0);
      for (const f of this.candies.fugus) f.mesh.traverse((m) => m.layers.set(deep ? 1 : 0));
    }
    if (deep && this.world) for (const it of this.world.items) it.mesh.visible = false;
    else if (this.world && this.wasDeep) for (const it of this.world.items) it.mesh.visible = true;
    this.wasDeep = deep;
    this.tunnel.position.z = Math.floor(p.z / MODULE) * MODULE;
    this.applyDepth(Math.round(smooth(0.6, -1.4, camY) * 50) / 50);
    // voile sombre, opaque tant que la caméra est entre la voûte et la chaussée (on y verrait le tunnel en coupe)
    const top = 0.15, bottom = ceilAt(camera.position.x) - 0.15;
    const out = camY > top ? camY - top : camY < bottom ? bottom - camY : 0;
    const v = Math.round(Math.max(0, 1 - out / 0.7) * 20) / 20;
    if (v !== this.veilOp) { this.veilOp = v; this.veil.style.opacity = v; }
    if (this.sound && this.sound.setMuffle) this.sound.setMuffle(running && p.under);
    if (!this.sewer.visible) return;
    const t = performance.now() / 1000;
    this.sludgeTex.offset.y = (t * 0.35) % 1;
    for (const o of this.sList) {
      if (o.float) {
        o.mesh.position.y = SLUDGE_Y + Math.sin(t * 2 + o.phase) * 0.05;
        o.mesh.rotation.y += dt * 0.4;
      } else if (o.arrow) {
        o.arrow.position.y = SEWER_Y + 2.4 + Math.sin(t * 5) * 0.2;
      }
    }
    // bulles
    const a = this.bubbles.geometry.attributes.position;
    const arr = a.array;
    for (let i = 0; i < this.bubbleSeed.length; i++) {
      arr[i * 3 + 1] += dt * (0.25 + this.bubbleSeed[i] * 0.3);
      arr[i * 3 + 2] += dt * 2.2;
      if (arr[i * 3 + 1] > SLUDGE_Y + 0.9 || arr[i * 3 + 2] > p.z + 6 || arr[i * 3 + 2] < p.z - 70) {
        arr[i * 3] = rand(-1.1, 1.1);
        arr[i * 3 + 1] = SLUDGE_Y + rand(0, 0.1);
        arr[i * 3 + 2] = p.z - rand(0, 60);
      }
    }
    a.needsUpdate = true;
  }
}
