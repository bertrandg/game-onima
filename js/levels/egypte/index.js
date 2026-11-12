// Niveau 4 : l'Égypte des pharaons. L'allée des sphinx devant les temples, les bords du Nil et le souk
// se succèdent, les pyramides de Gizeh au bout de l'avenue, et un tombeau peint sous les dalles où
// l'on tombe par les dalles effondrées. Ce dossier n'est téléchargé qu'au choix du niveau.
import * as THREE from 'three';
import { egyptSky, FOG_COLOR } from './scenery.js';
import { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild, makeTexMats } from './decor.js';
import { egyptVehicleKit } from './vehicles.js';
import { egyptItems } from './items.js';
import { TombObstacles } from './tomb.js';
import * as EX from './textures.js';

// pétales de lotus qui tombent doucement (texture claire, teintée par particule)
const lotusPetal = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.translate(16, 16);
  g.rotate(0.6);
  const grd = g.createRadialGradient(0, 4, 1, 0, 0, 14);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, '#f0e8e0');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(0, -13); g.quadraticCurveTo(9, -2, 0, 13); g.quadraticCurveTo(-9, -2, 0, -13);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export default {
  id: 'egypte',
  fog: FOG_COLOR,
  // musique : gamme hijaz, darbouka en rythme maqsoum, oud pincé et bourdon
  music: { scale: [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33, 622.25], meter: 4, bpm: 112, voice: 'oud' },
  world: {
    decor: { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild, texMats: makeTexMats() },
    lights: { sky: '#fff2dc', ground: '#d8b080', hemi: 1.65, sun: '#ffd8a0', sunI: 2.4 },
    track: {
      ground: EX.sand, groundTile: 9, bed: EX.paving, sleepers: EX.laneWear, rails: false, curb: '#c8a878',
    },
    particles: { texture: lotusPetal, size: 0.3, colors: ['#ffb8d0', '#ffffff', '#a8c8ff', '#ffd8a0', '#ff9ac0'] },
    scenery: egyptSky,
  },
  // tenues débloquées tous les 10 objets en Égypte (la première est la tenue de départ)
  palettes: [
    { name: 'Lin du Nil', top: '#f4ecd8', cuff: '#e8b838', sash: '#2a5aa8', skirt: '#f4ecd8', ribbon: '#3aa8a0' },
    { name: 'Lapis', top: '#1f3f8a', cuff: '#f0c040', sash: '#f0c040', skirt: '#f4ecd8', ribbon: '#f0c040' },
    { name: 'Turquoise', top: '#3aa8a0', cuff: '#f4ecd8', sash: '#c0442c', skirt: '#1f3f8a', ribbon: '#f0c040' },
    { name: 'Néfertiti', top: '#2a7ab0', cuff: '#e8b838', sash: '#c0442c', skirt: '#e8d2a8', ribbon: '#4a9a5a' },
    { name: 'Toutânkhamon', top: '#f0c040', cuff: '#1f3f8a', sash: '#1f3f8a', skirt: '#f4ecd8', ribbon: '#c0442c' },
    { name: 'Cléopâtre', top: '#a82a2a', cuff: '#f0c040', sash: '#f0c040', skirt: '#2a1a3a', ribbon: '#3aa8a0' },
    { name: 'Lotus', top: '#ffb8d8', cuff: '#ffffff', sash: '#4a9a5a', skirt: '#a8c8ff', ribbon: '#ffd040' },
    { name: 'Papyrus', top: '#7aae48', cuff: '#f4ecd8', sash: '#c8a058', skirt: '#4a6a2a', ribbon: '#ffd040' },
    { name: 'Sphinx', top: '#e2bc7c', cuff: '#2a5aa8', sash: '#e8b838', skirt: '#c49a6e', ribbon: '#2a5aa8' },
    { name: 'Anubis', top: '#2a2428', cuff: '#f0c040', sash: '#f0c040', skirt: '#1a1418', ribbon: '#3aa8a0' },
    { name: 'Scarabée', top: '#2a8a6a', cuff: '#f0c040', sash: '#5a3a8a', skirt: '#1a3a3a', ribbon: '#f0c040' },
    { name: 'Souk', top: '#d8402a', cuff: '#e8a838', sash: '#2a5aa8', skirt: '#6a2a6a', ribbon: '#e8a838' },
    { name: 'Dune', top: '#f2d6a0', cuff: '#ffffff', sash: '#d89a62', skirt: '#c88a52', ribbon: '#ff9a7a' },
    { name: 'Felouque', top: '#f2ead6', cuff: '#3a8aa8', sash: '#3a8aa8', skirt: '#7a4a28', ribbon: '#3a8aa8' },
    { name: 'Coucher sur le Nil', top: '#ff9a6a', cuff: '#ffe0a0', sash: '#8a4ab0', skirt: '#3a2a6a', ribbon: '#ffd040' },
    { name: 'Horus', top: '#4a6a8a', cuff: '#f0c040', sash: '#c0442c', skirt: '#f4ecd8', ribbon: '#c0442c' },
  ],
  obstacleKit: egyptVehicleKit,
  // moteur d'obstacles à deux étages : l'avenue et le tombeau
  obstacles: (root, opts) => new TombObstacles(root, opts),
  items: egyptItems,
};
