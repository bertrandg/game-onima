import * as THREE from 'three';
import { U } from '../../geo.js';
import { uv, PLAIN_UV } from './textures.js';

// Outils de modelage du niveau Hong Kong (mêmes principes que l'Égypte). Trois matières par tranche de décor :
// - « flat » : pièces à facettes (Builder commun, couleurs de sommets) pour le béton, le métal, le bois ;
// - « eg » : pièces lisses, éclairées en douceur, éventuellement peintes avec une région de l'atlas
//   (bambous, réservoirs, lanternes, façades) ;
// - « glow » : néons, vitrines et fenêtres allumées (sans éclairage : peints déjà éclairés).
// Les pièces « eg » et « glow » vont dans le TexBuilder : le monde les fusionne par matière.

// géométries lisses partagées (indexées, avec position / normale / uv)
export const S = {
  sph: new THREE.SphereGeometry(1, 12, 9),
  sphLo: new THREE.SphereGeometry(1, 8, 6),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12, 1),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 8, 1),
  cone: new THREE.ConeGeometry(1, 1, 12, 1),
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  torus: new THREE.TorusGeometry(1, 0.22, 6, 14),
};

// profil tourné (x = rayon, y = hauteur), mis en cache
const lathes = {};
export function lathe(name, pts, seg = 16) {
  if (!lathes[name]) lathes[name] = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  return lathes[name];
}

// lanterne chinoise ronde, pot de fleurs, panier vapeur de dim sum (hauteur 1, rayon ~0.5)
export const LANTERN = () => lathe('lantern', [[0, 0], [0.18, 0], [0.18, 0.06], [0.4, 0.2], [0.5, 0.5], [0.4, 0.8], [0.18, 0.94], [0.18, 1.0], [0, 1.0]], 14);
export const POT = () => lathe('pot', [[0, 0], [0.32, 0], [0.4, 0.8], [0.46, 0.84], [0.46, 1.0], [0, 1.0]], 12);
export const STEAMER = () => lathe('steamer', [[0, 0], [0.48, 0], [0.5, 0.04], [0.5, 0.4], [0.46, 0.44], [0.1, 0.52], [0, 0.52]], 14);
export const JAR = () => lathe('jar', [[0, 0], [0.3, 0], [0.46, 0.2], [0.5, 0.45], [0.42, 0.75], [0.26, 0.9], [0.28, 1.0], [0, 1.0]], 14);
export const BOWL = () => lathe('bowl', [[0, 0], [0.3, 0], [0.48, 0.12], [0.56, 0.3], [0.5, 0.32], [0, 0.18]], 14);

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

function push(t, key, geo, color, p, s, r, region, order = 'XYZ') {
  const g = geo.clone();
  const a = g.attributes.uv;
  if (region) {
    const [u0, v0, u1, v1] = uv(region);
    for (let i = 0; i < a.count; i++) a.setXY(i, u0 + a.getX(i) * (u1 - u0), v0 + a.getY(i) * (v1 - v0));
  } else {
    for (let i = 0; i < a.count; i++) a.setXY(i, PLAIN_UV[0], PLAIN_UV[1]);
  }
  _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2], order)), _s.set(s[0], s[1], s[2]));
  g.applyMatrix4(_m);
  _c.set(color);
  const c = new Float32Array(a.count * 3);
  for (let i = 0; i < a.count; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  (t.parts[key] ||= []).push(g);
}

// Pinceau : un seul objet pour poser les trois sortes de pièces (b = Builder, t = TexBuilder)
export class Painter {
  constructor(b, t) { this.b = b; this.t = t; }
  flat(geo, color, p, s = [1, 1, 1], r = [0, 0, 0]) { this.b.add(geo, color, p, s, r); return this; }
  smooth(geo, color, p, s = [1, 1, 1], r = [0, 0, 0]) { push(this.t, 'eg', geo, color, p, s, r, null); return this; }
  paint(geo, region, p, s = [1, 1, 1], r = [0, 0, 0], color = '#ffffff') { push(this.t, 'eg', geo, color, p, s, r, region); return this; }
  glow(geo, color, p, s = [1, 1, 1], r = [0, 0, 0]) { push(this.t, 'glow', geo, color, p, s, r, null); return this; }
  // panneau peint tourné vers +x (lisible depuis la voie quand l'élément est à gauche), size = [long. en z, hauteur] ;
  // tilt penche le haut du panneau vers l'arrière (fruit des murs de temple)
  panel(region, p, size, color = '#ffffff', rotY = Math.PI / 2, tilt = 0) {
    push(this.t, 'eg', S.plane, color, p, [size[0], size[1], 1], [-tilt, rotY, 0], region, 'YXZ');
    return this;
  }
  // panneau peint déjà éclairé (façades de nuit, néons, vitrines) : sans calcul de lumière
  lit(region, p, size, color = '#ffffff', rotY = Math.PI / 2, tilt = 0) {
    push(this.t, 'glow', S.plane, color, p, [size[0], size[1], 1], [-tilt, rotY, 0], region, 'YXZ');
    return this;
  }
  // n'importe quelle géométrie peinte et déjà éclairée (eau du port la nuit…)
  litGeo(geo, region, p, s = [1, 1, 1], r = [0, 0, 0], color = '#ffffff') { push(this.t, 'glow', geo, color, p, s, r, region); return this; }
}

// teintes de sommets plus ou moins claires
export function shade(hex, k) {
  _c.set(hex).multiplyScalar(k);
  return '#' + _c.getHexString();
}

// sommets à facettes (Builder) : reprise des primitives communes pour la lisibilité
export { U };
