// Niveau 3 : New York. Wall Street, Times Square et Chinatown se succèdent entre des gratte-ciel dont
// on ne voit jamais le sommet, la statue de la Liberté au bout de l'avenue, et des égouts sous la
// chaussée où l'on tombe par les bouches ouvertes. Ce dossier n'est téléchargé qu'au choix du niveau.
import * as THREE from 'three';
import { nySky, FOG_COLOR } from './scenery.js';
import { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild, makeTexMats } from './decor.js';
import { nyVehicleKit } from './vehicles.js';
import { nyItems } from './items.js';
import { NYObstacles } from './sewer.js';
import * as NX from './textures.js';

// confettis de papier (« ticker tape ») qui tombent des fenêtres comme lors des grandes parades (teintés en pastel)
const tickerTape = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.translate(16, 16);
  g.rotate(0.7);
  g.fillStyle = '#fbf8f0';
  g.fillRect(-4, -13, 8, 26);
  g.fillStyle = 'rgba(220,220,220,0.8)';
  g.fillRect(-4, -2, 8, 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export default {
  id: 'newyork',
  fog: FOG_COLOR,
  // musique : swing de jazz (contrebasse qui marche, accords de piano, mélodie en gamme blues)
  music: { scale: [261.63, 311.13, 349.23, 369.99, 392.0, 466.16, 523.25, 622.25, 698.46], meter: 4, bpm: 150, voice: 'jazz' },
  world: {
    decor: { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild, texMats: makeTexMats() },
    lights: { sky: '#fff0e0', ground: '#a8a4a0', hemi: 1.7, sun: '#ffd8a8', sunI: 2.2 },
    track: {
      ground: NX.asphalt, groundTile: 8, bed: NX.asphaltBed, sleepers: NX.laneWear, rails: false,
      overlay: NX.roadLines, overlayTile: 6, curb: '#b4b0a8',
    },
    particles: { texture: tickerTape, size: 0.32, colors: ['#ffb3d1', '#b3e5ff', '#fff3a8', '#c8f5c8', '#e0c8ff', '#ffd2b0'] },
    scenery: nySky,
  },
  // tenues débloquées tous les 10 objets à New York (la première est la tenue de départ)
  palettes: [
    { name: 'Jade', top: '#62a86c', cuff: '#b4dc84', sash: '#2f7350', skirt: '#7d2a4c', ribbon: '#4a7fd0' },
    { name: 'Taxi Jaune', top: '#f6c21a', cuff: '#ffffff', sash: '#141414', skirt: '#141414', ribbon: '#f6c21a' },
    { name: 'Big Apple', top: '#d8202a', cuff: '#ffe0e0', sash: '#5a8a2a', skirt: '#3a1a1a', ribbon: '#7ab83a' },
    { name: 'Liberty', top: '#7cc4aa', cuff: '#d8f4ea', sash: '#4a8c7c', skirt: '#2c5a50', ribbon: '#ffd040' },
    { name: 'Broadway', top: '#1a1820', cuff: '#ffd23f', sash: '#ffd23f', skirt: '#c8202a', ribbon: '#ff8ac0' },
    { name: 'Times Square', top: '#ff5ab0', cuff: '#5ae0ff', sash: '#7a3aff', skirt: '#1a1830', ribbon: '#ffe25a' },
    { name: 'Chinatown', top: '#e8202a', cuff: '#ffd890', sash: '#d8b04a', skirt: '#2c7a4a', ribbon: '#ffd23f' },
    { name: 'Central Park', top: '#7ab84a', cuff: '#e8f4d0', sash: '#5a3a20', skirt: '#3a5a2a', ribbon: '#ff8ac0' },
    { name: 'Wall Street', top: '#1f2f5a', cuff: '#f4f0e8', sash: '#c8202a', skirt: '#2a2a34', ribbon: '#d8b04a' },
    { name: 'Brooklyn', top: '#c87058', cuff: '#f4e6d8', sash: '#3a5a8a', skirt: '#3a5a8a', ribbon: '#f2c230' },
  ],
  obstacleKit: nyVehicleKit,
  // moteur d'obstacles à deux étages : la rue et les égouts
  obstacles: (root, opts) => new NYObstacles(root, opts),
  items: nyItems,
};
