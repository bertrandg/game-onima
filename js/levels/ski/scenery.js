import * as THREE from 'three';
import { view } from './bend.js';

// Le lointain est une image fixe : le Mont Blanc et ses sommets souriants au coucher du soleil
// (models/ski/montblanc.jpg), peinte sur un grand panneau courbe qui suit la caméra. Elle glisse un peu de
// côté dans les virages de la piste ; au-delà de ses bords, elle se prolonge en miroir.
export const FOG_COLOR = '#ece4f2';
const URL_IMG = new URL('../../../models/ski/montblanc.jpg', import.meta.url).href;

const R = 1300;            // rayon du panneau
const ARC = 1.75;          // angle couvert par l'image (radians), un peu plus que le champ de vision
const H = 1240;            // hauteur (proportions de l'image : 1408 × 768)
const SPAN = 1.6;          // le panneau couvre 1,6 fois l'image (prolongée en miroir de chaque côté)
const BASE = -470 - 0.35 * H;   // pied des montagnes de l'image vers 20° sous l'horizon, sommets juste au-dessus

export function skiScenery(root) {
  const g = new THREE.Group();
  root.add(g);
  // ciel de secours au-dessus de l'image (téléphone tenu en portrait) : violet du haut de l'image
  const sky = new THREE.Mesh(new THREE.SphereGeometry(R + 80, 24, 12),
    new THREE.MeshBasicMaterial({ color: '#9a5ad0', side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -3;
  g.add(sky);

  const tex = new THREE.TextureLoader().load(URL_IMG);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.anisotropy = 4;
  const L = ARC * SPAN;
  const geo = new THREE.CylinderGeometry(R, R, H, 64, 1, true, Math.PI - L / 2, L);
  geo.translate(0, BASE + H / 2, 0);
  // u de -0,3 à 1,3 : l'image au milieu, prolongée en miroir ; lue depuis l'intérieur du cylindre
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - (uv.getX(i) * SPAN - (SPAN - 1) / 2));
  const panel = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  panel.renderOrder = -2;
  g.add(panel);
  g.traverse((o) => { o.frustumCulled = false; });

  return {
    group: g,
    update(dt, pz, camera) {
      g.position.copy(camera.position);
      g.rotation.y = Math.atan(view.heading) * 0.4;
    },
  };
}
