import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Héroïne chibi aux oreilles de chat : cheveux vert très sombre, kimono vert, longue jupe bordeaux
const COL = {
  skin: '#ffe1cc',
  hair: '#1f3a39',
  hairDark: '#152928',
  hairLight: '#3f6a66',
  collar: '#e4ecf7',
  collarBlue: '#b9c9e6',
  shoe: '#3a2430',
  beadPink: '#d8303a',
  beadTeal: '#2f6fb8',
  dark: '#2b1a1a',
};

// Tenues débloquées tous les 10 bonbons : haut, poignets, bandoulière, jupe, ruban
export const PALETTES = [
  { name: 'Jade', top: '#62a86c', cuff: '#b4dc84', sash: '#2f7350', skirt: '#7d2a4c', ribbon: '#4a7fd0' },
  { name: 'Sakura', top: '#f49ac0', cuff: '#ffd6e6', sash: '#c2457a', skirt: '#3b4a8a', ribbon: '#ffd23f' },
  { name: 'Lavande', top: '#a98be0', cuff: '#e2d4ff', sash: '#6a4bb8', skirt: '#3d2f63', ribbon: '#ff8fb6' },
  { name: 'Ciel', top: '#6fb3e8', cuff: '#cfe8ff', sash: '#2e6fb0', skirt: '#24406e', ribbon: '#ffd23f' },
  { name: 'Pêche', top: '#f5a77a', cuff: '#ffe0c8', sash: '#d0603a', skirt: '#5a2d2a', ribbon: '#5fc3a8' },
  { name: 'Citron', top: '#e8cf4a', cuff: '#fff3b0', sash: '#b5952a', skirt: '#3f6b46', ribbon: '#e8556c' },
  { name: 'Cerise', top: '#e0566a', cuff: '#ffc7cf', sash: '#9a2236', skirt: '#2b2238', ribbon: '#ffd6f0' },
  { name: 'Minuit', top: '#4f5aa8', cuff: '#b9c2f2', sash: '#2a2f6a', skirt: '#1e1a33', ribbon: '#f2c94c' },
];

function toonGradient(levels) {
  const t = new THREE.DataTexture(new Uint8Array(levels), levels.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// ---------- Visage dessiné (texture sur la sphère de la tête, centrée en u = 0.75) ----------
const FACE_W = 1024, FACE_H = 512, FCX = 768, EYE_Y = 284, EYE_DX = 66;

// étoile à 4 branches (reflet dans les yeux)
function star4(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + r * 0.15, y - r * 0.15, x + r * 0.8, y);
  g.quadraticCurveTo(x + r * 0.15, y + r * 0.15, x, y + r);
  g.quadraticCurveTo(x - r * 0.15, y + r * 0.15, x - r * 0.8, y);
  g.quadraticCurveTo(x - r * 0.15, y - r * 0.15, x, y - r);
  g.fill();
}

function drawFace(kind) {
  const c = document.createElement('canvas');
  c.width = FACE_W;
  c.height = FACE_H;
  const g = c.getContext('2d');
  g.fillStyle = COL.skin;
  g.fillRect(0, 0, FACE_W, FACE_H);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  for (const sx of [-1, 1]) {
    // joues roses et petits traits
    const bx = FCX + sx * 104, by = 326;
    const grd = g.createRadialGradient(bx, by, 2, bx, by, 32);
    grd.addColorStop(0, 'rgba(255,125,140,0.42)');
    grd.addColorStop(1, 'rgba(255,125,140,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(bx, by, 34, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(225,90,110,0.6)';
    g.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(bx + 12 + i * 8 - 3, by + 7);
      g.lineTo(bx + 12 + i * 8 + 3, by - 7);
      g.stroke();
    }
    // taches de rousseur sous les yeux
    g.fillStyle = 'rgba(185,105,70,0.8)';
    for (const [dx, dy] of [[-26, 0], [-16, -6], [-10, 5], [-20, 10], [-32, -6], [-4, -2]]) {
      g.beginPath();
      g.arc(FCX + sx * (EYE_DX + dx), 330 + dy, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }

  g.strokeStyle = COL.dark;
  for (const sx of [-1, 1]) {
    const ex = FCX + sx * EYE_DX, ey = EYE_Y;
    if (kind === 'open') {
      // grands yeux violets aux reflets en étoile
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(ex, ey + 3, 31, 36, 0, 0, Math.PI * 2); g.fill();
      const ig = g.createLinearGradient(0, ey - 32, 0, ey + 38);
      ig.addColorStop(0, '#2a1450');
      ig.addColorStop(0.45, '#5b34a8');
      ig.addColorStop(1, '#c9a6ff');
      g.fillStyle = ig;
      g.beginPath(); g.ellipse(ex, ey + 5, 27, 33, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(25,10,45,0.85)';
      g.beginPath(); g.ellipse(ex, ey + 2, 14, 17, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      star4(g, ex, ey + 2, 17);                   // étoile centrale
      g.beginPath(); g.arc(ex - sx * 12, ey - 15, 5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ex + sx * 13, ey + 22, 3, 0, Math.PI * 2); g.fill();
      // trait de cils épais, légèrement inquiet (plus haut côté intérieur)
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(ex - sx * 34, ey - 18);
      g.quadraticCurveTo(ex, ey - 40, ex + sx * 32, ey - 28);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(ex - sx * 33, ey - 17); g.lineTo(ex - sx * 44, ey - 9); g.stroke();
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(ex - sx * 16, ey + 40); g.quadraticCurveTo(ex - sx * 26, ey + 38, ex - sx * 30, ey + 28); g.stroke();
    } else if (kind === 'blink') {
      // yeux fermés d'aise : trait arrondi et petits cils dessous
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(ex - 34, ey + 4);
      g.quadraticCurveTo(ex, ey - 12, ex + 34, ey + 4);
      g.stroke();
      g.lineWidth = 4;
      for (const k of [-0.55, 0, 0.55]) {
        const x = ex + k * 30, y = ey - 3 + Math.abs(k) * 6;
        g.beginPath();
        g.moveTo(x, y + 4);
        g.lineTo(x + k * 6, y + 14);
        g.stroke();
      }
    } else if (kind === 'happy') {
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(ex - 30, ey + 10);
      g.quadraticCurveTo(ex, ey - 28, ex + 30, ey + 10);
      g.stroke();
    } else if (kind === 'ouch') {
      g.lineWidth = 9;
      const d = -sx;
      g.beginPath();
      g.moveTo(ex - d * 24, ey - 22);
      g.lineTo(ex + d * 22, ey);
      g.lineTo(ex - d * 24, ey + 22);
      g.stroke();
      g.fillStyle = 'rgba(140,200,255,0.9)';
      g.beginPath(); g.ellipse(ex + sx * 34, ey + 34, 7, 11, 0, 0, Math.PI * 2); g.fill();
    }
  }

  // bouche
  const my = 352;
  if (kind === 'happy' || kind === 'ouch') {
    g.fillStyle = '#b8344b';
    g.beginPath();
    if (kind === 'happy') {
      g.moveTo(FCX - 18, my - 6);
      g.quadraticCurveTo(FCX, my + 30, FCX + 18, my - 6);
      g.closePath();
    } else {
      g.ellipse(FCX, my + 2, 10, 8, 0, 0, Math.PI * 2);
    }
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#ff8fa6';
    g.beginPath(); g.ellipse(FCX, my + 13, 11, 6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  } else {
    // "tehe" : petite bouche ouverte et langue tirée
    g.fillStyle = '#9a2a3a';
    g.beginPath();
    g.moveTo(FCX - 16, my - 4);
    g.quadraticCurveTo(FCX, my - 9, FCX + 16, my - 4);
    g.quadraticCurveTo(FCX + 12, my + 10, FCX, my + 11);
    g.quadraticCurveTo(FCX - 12, my + 10, FCX - 16, my - 4);
    g.fill();
    g.fillStyle = '#ff8a9e';
    g.beginPath();
    g.moveTo(FCX - 10, my + 4);
    g.quadraticCurveTo(FCX - 12, my + 24, FCX + 1, my + 25);
    g.quadraticCurveTo(FCX + 12, my + 24, FCX + 10, my + 4);
    g.fill();
    g.strokeStyle = '#e0607a';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(FCX, my + 9); g.lineTo(FCX, my + 18); g.stroke();
    g.strokeStyle = COL.dark;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(FCX - 17, my - 4);
    g.quadraticCurveTo(FCX, my - 10, FCX + 17, my - 4);
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const lerp = (a, b, k) => a + (b - a) * k;

// Fusionne, dans chaque groupe animé, les pièces qui partagent le même matériau :
// même rendu, beaucoup moins d'appels de dessin
function mergeByMaterial(obj) {
  for (const child of [...obj.children]) if (!child.isMesh) mergeByMaterial(child);
  const byMat = new Map();
  for (const c of obj.children) {
    if (!c.isMesh) continue;
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(c);
  }
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map((m) => {
      m.updateMatrix();
      const g = m.geometry.clone().applyMatrix4(m.matrix);
      return g.index ? g.toNonIndexed() : g;
    });
    for (const m of list) obj.remove(m);
    obj.add(new THREE.Mesh(mergeGeometries(geos), mat));
  }
}
const ONE = new THREE.Vector3(1, 1, 1);

export class Girl {
  constructor() {
    const grad = toonGradient([120, 195, 255]);
    const mats = {};
    const m = (c) => (mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: grad }));
    // matériaux dont la couleur change avec la tenue
    const pal = {};
    for (const k of ['top', 'cuff', 'sash', 'skirt', 'skirtDark', 'ribbon']) {
      pal[k] = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad });
    }
    const hairMat = new THREE.MeshToonMaterial({ color: COL.hair, gradientMap: grad, side: THREE.DoubleSide });
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

    // root : position monde ; pivot : rotation (roulade/chute) ; body : modèle (pieds à y = 0, visage vers -z)
    this.root = new THREE.Group();
    this.baseScale = 0.8;   // un peu plus petite par rapport aux trains et obstacles
    this.root.scale.setScalar(this.baseScale);
    this.pivot = group(this.root, [0, 0.55, 0]);
    this.body = group(this.pivot, [0, -0.55, 0]);
    const B = this.body;

    // ---------- Jambes (surtout cachées par la longue jupe) ----------
    this.legs = [-1, 1].map((sx) => {
      const leg = group(B, [sx * 0.09, 0.62, 0]);
      add(leg, cyl(0.055, 0.05, 0.56), m(COL.skin), [0, -0.28, 0]);
      add(leg, sph, m(COL.shoe), [0, -0.59, -0.03], [0.07, 0.055, 0.115]);
      return leg;
    });

    // ---------- Longue jupe bordeaux ----------
    add(B, cyl(0.2, 0.36, 0.74, 20), pal.skirt, [0, 0.5, 0]);
    add(B, cyl(0.205, 0.215, 0.09, 20), pal.skirtDark, [0, 0.87, 0]);
    // plis de la jupe et ourlet
    // (fusionnés en une seule géométrie : 1 appel de dessin)
    const pleats = [];
    const _o = new THREE.Object3D();
    _o.rotation.order = 'YXZ';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      _o.position.set(Math.sin(a) * 0.284, 0.5, Math.cos(a) * 0.284);
      _o.rotation.set(-0.21, a, 0);
      _o.updateMatrix();
      pleats.push(new THREE.BoxGeometry(0.012, 0.72, 0.012).applyMatrix4(_o.matrix));
    }
    add(B, mergeGeometries(pleats), pal.skirtDark);
    add(B, cyl(0.362, 0.366, 0.05, 20), pal.skirtDark, [0, 0.16, 0]);

    // ---------- Kimono vert ----------
    add(B, cyl(0.16, 0.22, 0.42), pal.top, [0, 1.08, 0]);
    add(B, cyl(0.22, 0.26, 0.12), pal.top, [0, 0.89, 0]);
    add(B, cyl(0.262, 0.264, 0.035, 20), pal.sash, [0, 0.83, 0]);       // liseré du bas de la veste
    // ceinture nouée : noeud sur le côté et deux pans qui pendent
    add(B, cyl(0.228, 0.228, 0.07, 20), pal.sash, [0, 0.93, 0]);
    const knot = group(B, [0.13, 0.93, -0.18]);
    add(knot, sph, pal.sash, [0, 0, 0], [0.04, 0.035, 0.03]);
    for (const sx of [-1, 1]) add(knot, sph, pal.sash, [sx * 0.05, 0.005, 0], [0.05, 0.025, 0.018], [0, 0, -sx * 0.35]);
    add(knot, new THREE.BoxGeometry(0.03, 0.2, 0.01), pal.sash, [-0.015, -0.11, 0], [1, 1, 1], [0, 0, 0.12]);
    add(knot, new THREE.BoxGeometry(0.03, 0.16, 0.01), pal.sash, [0.025, -0.09, 0.005], [1, 1, 1], [0, 0, -0.18]);
    // petite bourse à remèdes d'apothicaire, à la hanche
    const pouch = group(B, [-0.25, 0.78, 0.04]);
    add(pouch, sph, m('#a8845a'), [0, 0, 0], [0.075, 0.09, 0.06]);
    add(pouch, cyl(0.04, 0.05, 0.03, 10), m('#8a6a44'), [0, 0.08, 0]);
    add(pouch, cyl(0.006, 0.006, 0.16, 6), m('#5a4030'), [0.01, 0.15, 0], [1, 1, 1], [0, 0, -0.2]);
    add(pouch, sph, m('#e8556c'), [0, 0.02, -0.06], [0.018, 0.018, 0.01]);
    // col croisé blanc et bleu pâle
    add(B, new THREE.TorusGeometry(0.12, 0.03, 8, 20), m(COL.collar), [0, 1.28, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    for (const sx of [-1, 1]) {
      // les deux pans partent des côtés du cou et se rejoignent en V sur la poitrine
      add(B, new THREE.BoxGeometry(0.06, 0.2, 0.02), m(sx < 0 ? COL.collarBlue : COL.collar), [sx * 0.042, 1.195, -0.168 - (sx > 0 ? 0.004 : 0)], [1, 1, 1], [0.22, 0, -sx * 0.48]);
    }
    // bandoulière en diagonale (devant et dans le dos)
    add(B, new THREE.BoxGeometry(0.065, 0.56, 0.02), pal.sash, [0.0, 1.06, -0.2], [1, 1, 1], [0.15, 0, 0.6]);
    add(B, new THREE.BoxGeometry(0.065, 0.56, 0.02), pal.sash, [0.0, 1.06, 0.205], [1, 1, 1], [-0.15, 0, -0.6]);
    // liserés foncés du col croisé
    for (const sx of [-1, 1]) {
      add(B, new THREE.BoxGeometry(0.02, 0.22, 0.02), pal.sash, [sx * 0.075, 1.19, -0.172], [1, 1, 1], [0.22, 0, -sx * 0.48]);
    }
    add(B, cyl(0.052, 0.052, 0.1), m(COL.skin), [0, 1.32, 0]);

    // ---------- Bras : larges manches de kimono ----------
    // bras en deux parties (coude) pour pouvoir lever les petites mains
    this.forearms = [];
    this.arms = [-1, 1].map((sx) => {
      const arm = group(B, [sx * 0.19, 1.25, 0]);
      add(arm, sph, pal.top, [0, -0.02, 0], [0.08, 0.08, 0.08]);
      add(arm, cyl(0.07, 0.1, 0.18), pal.top, [0, -0.09, 0]);
      const fore = group(arm, [0, -0.17, 0]);
      add(fore, sph, pal.top, [0, 0, 0], [0.095, 0.06, 0.095]);
      add(fore, cyl(0.098, 0.125, 0.17), pal.top, [0, -0.085, 0]);
      add(fore, cyl(0.128, 0.128, 0.06, 16, true), pal.cuff, [0, -0.19, 0]);
      add(fore, cyl(0.131, 0.131, 0.015, 16, true), pal.sash, [0, -0.165, 0]);
      add(fore, cyl(0.075, 0.075, 0.05, 12, true), m(COL.collar), [0, -0.21, 0]);   // manche intérieure blanche
      // petite main avec doigts esquissés
      add(fore, sph, m(COL.skin), [0, -0.235, 0], [0.05, 0.055, 0.035]);
      for (const f of [-1, 0, 1]) add(fore, sph, m(COL.skin), [f * 0.025, -0.285, 0], [0.014, 0.024, 0.014]);
      add(fore, sph, m(COL.skin), [-sx * 0.045, -0.25, 0], [0.013, 0.022, 0.013], [0, 0, sx * 0.6]);
      this.forearms.push(fore);
      return arm;
    });

    // ---------- Chat : queue qui ondule (chaîne de segments) ----------
    this.catTail = [];
    let parent = group(B, [0, 0.62, 0.3]);
    parent.rotation.x = 0.9;
    const tailRoot = parent;
    for (let i = 0; i < 8; i++) {
      const r = 0.042 - i * 0.003;
      add(parent, cyl(r * 0.92, r, 0.11, 8), hairMat, [0, 0.055, 0]);
      add(parent, sph, hairMat, [0, 0.11, 0], [r * 0.92, r * 0.92, r * 0.92]);
      const next = group(parent, [0, 0.11, 0]);
      this.catTail.push(next);
      parent = next;
    }
    this.tailRoot = tailRoot;

    // ---------- Tête ----------
    const H = (this.head = group(B, [0, 1.63, 0]));
    H.scale.setScalar(1.06);
    this.faceTex = { open: drawFace('open'), blink: drawFace('blink'), happy: drawFace('happy'), ouch: drawFace('ouch') };
    this.faceMat = new THREE.MeshToonMaterial({ map: this.faceTex.open, gradientMap: toonGradient([200, 235, 255]) });
    add(H, new THREE.SphereGeometry(1, 48, 32), this.faceMat, [0, 0, 0], [0.34, 0.34, 0.34]);
    this.face = 'open';
    for (const sx of [-1, 1]) add(H, sph, m(COL.skin), [sx * 0.33, -0.04, 0.03], [0.04, 0.06, 0.04]);

    // calotte, reflet
    add(H, sph, hairMat, [0, 0.05, 0.075], [0.372, 0.372, 0.372]);
    add(H, new THREE.TorusGeometry(0.336, 0.01, 6, 40, Math.PI * 1.2), m(COL.hairLight), [0, 0.2, 0.075], [1, 1, 1],
      [Math.PI / 2, 0, Math.PI * 0.15]);
    // frange droite (coupe "hime") : coque conique ouverte devant le front
    add(H, new THREE.CylinderGeometry(0.29, 0.362, 0.24, 28, 1, true, Math.PI - 1.15, 2.3), hairMat, [0, 0.165, 0.01]);
    for (const x of [-0.12, 0.02, 0.15]) {
      add(H, new THREE.BoxGeometry(0.008, 0.18, 0.01), m(COL.hairDark), [x, 0.15, -0.352 + Math.abs(x) * 0.25], [1, 1, 1], [0, -x * 1.2, 0]);
    }
    // longues mèches raides encadrant le visage
    for (const sx of [-1, 1]) {
      add(H, new THREE.BoxGeometry(0.1, 0.46, 0.15), hairMat, [sx * 0.3, -0.1, -0.07], [1, 1, 1], [0.05, 0, sx * 0.04]);
    }
    // arrière : mèches sur la nuque, chignon en pointes et ruban violet
    for (let i = -2; i <= 2; i++) {
      add(H, sph, hairMat, [i * 0.1, -0.18, 0.26 - Math.abs(i) * 0.04], [0.09, 0.19, 0.08], [-0.3, i * 0.15, i * 0.12]);
    }
    const bun = group(H, [0.06, 0.12, 0.34]);
    add(bun, sph, hairMat, [0, 0, 0], [0.13, 0.12, 0.11]);
    for (const [x, y, rz, rx] of [[0.05, 0.12, -0.5, -0.4], [0.12, 0.05, -1.2, -0.2], [-0.04, 0.13, 0.2, -0.5], [0.1, -0.06, -2.0, 0.1]]) {
      add(bun, new THREE.ConeGeometry(0.05, 0.2, 7), hairMat, [x, y, 0.03], [1, 1, 0.8], [rx, 0, rz]);
    }
    this.ribbon = group(bun, [0.12, 0.1, 0.0]);
    for (const sx of [-1, 1]) {
      add(this.ribbon, sph, pal.ribbon, [sx * 0.05, 0.02, 0], [0.055, 0.03, 0.02], [0, 0.4, -sx * 0.4]);
    }
    add(this.ribbon, sph, pal.ribbon, [0, 0, 0], [0.025, 0.025, 0.025]);
    // épingle à cheveux en bois piquée dans le chignon, avec une perle
    add(bun, cyl(0.009, 0.007, 0.36, 6), m('#8a5a2a'), [-0.02, 0.04, 0.02], [1, 1, 1], [0.2, 0, 1.15]);
    add(bun, sph, m(COL.beadTeal), [-0.18, 0.12, 0.05], [0.022, 0.022, 0.022]);
    // oreilles de chat
    for (const sx of [-1, 1]) {
      add(H, new THREE.ConeGeometry(0.11, 0.24, 4), hairMat, [sx * 0.21, 0.36, 0.04], [1, 1, 0.55], [0, Math.PI / 4, -sx * 0.38]);
      add(H, new THREE.ConeGeometry(0.06, 0.14, 4), m(COL.hairLight), [sx * 0.2, 0.34, 0.0], [1, 1, 0.3], [0, Math.PI / 4, -sx * 0.38]);
    }
    // petites tresses avec perles et pompons, devant les épaules
    for (const sx of [-1, 1]) {
      const br = group(H, [sx * 0.24, -0.26, -0.05]);
      for (let i = 0; i < 3; i++) add(br, sph, hairMat, [0, -i * 0.07, 0], [0.032, 0.042, 0.032]);
      add(br, sph, m(COL.beadPink), [0, -0.22, 0], [0.024, 0.024, 0.024]);
      add(br, sph, m(COL.beadTeal), [0, -0.265, 0], [0.026, 0.03, 0.026]);
      add(br, new THREE.ConeGeometry(0.035, 0.1, 8), hairMat, [0, -0.33, 0]);
    }

    mergeByMaterial(this.root);
    this.allMats = [...Object.values(mats), ...Object.values(pal), hairMat, this.faceMat];
    this.palMats = pal;
    this.setPalette(0);
    this.tails = [];
    this.pop = 0;
    this.phase = 0;
    this.blinkT = 0;
    this.nextBlink = 2.5;
    this.happyT = 0;
    this.deadT = 0;
  }

  setPalette(i) {
    const p = PALETTES[i % PALETTES.length];
    for (const k of ['top', 'cuff', 'sash', 'skirt', 'ribbon']) this.palMats[k].color.set(p[k]);
    this.palMats.skirtDark.color.set(p.skirt).multiplyScalar(0.7);
    return p;
  }

  // halo lumineux (0 = normal, 1 = toute blanche)
  setGlow(v) {
    for (const mat of this.allMats) mat.emissive.setRGB(v, v * 0.95, v * 0.85);
  }

  // petit rebond quand elle change de tenue
  levelUp(i) {
    this.pop = 1;
    return this.setPalette(i);
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
    this.pop = 0;
    this.root.scale.setScalar(this.baseScale);
    this.setPalette(0);
    this.setFace('open');
  }

  // mode : 'idle' | 'run' | 'jump' | 'roll' | 'dead'
  animate(mode, dt, { speed = 14, slideFrac = 0 } = {}) {
    const k = 1 - Math.exp(-dt * 16);
    const t = performance.now() / 1000;
    const [legL, legR] = this.legs;
    const [armL, armR] = this.arms;
    const tgt = {
      legL: 0, legR: 0, armLx: 0, armRx: 0, armLz: -0.25, armRz: 0.25, fore: 0.35,
      bodyY: 0, lean: 0, headZ: 0, headX: 0,
    };
    let tailSpeed = 3, tailAmp = 0.25, tailLift = 0.75;

    if (mode === 'run' || mode === 'roll') {
      this.phase += dt * (8 + speed * 0.22);
      const s = Math.sin(this.phase);
      tgt.legL = s * 0.6; tgt.legR = -s * 0.6;
      tgt.armLx = -s * 0.8; tgt.armRx = s * 0.8;
      tgt.bodyY = Math.abs(s) * 0.07;
      tgt.lean = -0.12;
      tgt.headZ = s * 0.05;
      tailSpeed = 9; tailAmp = 0.3; tailLift = 1.15;
    } else if (mode === 'jump') {
      tgt.legL = 0.6; tgt.legR = -0.3;
      tgt.armLz = -2.4; tgt.armRz = 2.4;
      tgt.lean = -0.05;
      tgt.headX = 0.1;
      tailSpeed = 6; tailAmp = 0.15; tailLift = 1.5;
    } else if (mode === 'idle') {
      // pose "pattes de chat" : petites mains levées de part et d'autre de la poitrine
      tgt.bodyY = Math.sin(t * 2.2) * 0.02;
      tgt.armLx = 0.35; tgt.armRx = 0.35;
      tgt.armLz = -0.32; tgt.armRz = 0.32;
      tgt.fore = 2.15;
      tgt.foreWave = Math.sin(t * 5) * 0.12;
      tgt.headZ = Math.sin(t * 1.4) * 0.1;
      tgt.headX = 0.06;
    } else if (mode === 'dead') {
      tgt.armLz = -2.2; tgt.armRz = 2.2;
      tgt.legL = 0.5; tgt.legR = -0.2;
      tailSpeed = 0; tailAmp = 0;
    }

    legL.rotation.x = lerp(legL.rotation.x, tgt.legL, k);
    legR.rotation.x = lerp(legR.rotation.x, tgt.legR, k);
    armL.rotation.x = lerp(armL.rotation.x, tgt.armLx, k);
    armR.rotation.x = lerp(armR.rotation.x, tgt.armRx, k);
    armL.rotation.z = lerp(armL.rotation.z, tgt.armLz, k);
    this.forearms.forEach((f, i) => {
      const w = tgt.foreWave ? (i ? -tgt.foreWave : tgt.foreWave) : 0;
      f.rotation.x = lerp(f.rotation.x, tgt.fore + w, k);
    });
    armR.rotation.z = lerp(armR.rotation.z, tgt.armRz, k);
    this.body.position.y = lerp(this.body.position.y, -0.55 + tgt.bodyY, k);
    this.body.rotation.x = lerp(this.body.rotation.x, tgt.lean, k);
    this.head.rotation.z = lerp(this.head.rotation.z, tgt.headZ, k);
    this.head.rotation.x = lerp(this.head.rotation.x, tgt.headX, k);

    // queue de chat : vague qui se propage le long des segments, bout recourbé
    this.tailRoot.rotation.x = lerp(this.tailRoot.rotation.x, tailLift, k * 0.5);
    this.catTail.forEach((seg, i) => {
      seg.rotation.z = Math.sin(t * tailSpeed - i * 0.7) * tailAmp * (0.4 + i * 0.12);
      seg.rotation.x = i > 4 ? -0.35 : -0.12;   // la queue se recourbe vers le haut
    });

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
      this.pivot.scale.lerp(ONE, k);
      this.pivot.position.y = 0.55;
    }

    // expressions : yeux fermés d'aise, sourire en saut / en saluant, >< en cas de choc
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blinkT = 0.14; this.nextBlink = 2.2 + Math.random() * 2.5; }
    this.blinkT -= dt;
    if (this.pop > 0) {
      this.pop = Math.max(0, this.pop - dt * 2);
      this.root.scale.setScalar(this.baseScale * (1 + Math.sin(this.pop * Math.PI * 3) * 0.12 * this.pop));
    }
    let face = 'open';
    if (mode === 'dead') face = 'ouch';
    else if (mode === 'jump' || mode === 'roll' || this.pop > 0) face = 'happy';
    else if (this.blinkT > 0) face = 'blink';
    this.setFace(face);
  }
}
