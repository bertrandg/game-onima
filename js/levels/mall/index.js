// Niveau 6 : le centre commercial. Six étages de boutiques superposés (mode, jouets, high-tech, sport,
// maison et livres, gourmandises sous la verrière) reliés par des escalators qui montent et descendent.
// Rester dans la voie d'un escalator, c'est le prendre. Plus on monte, plus il y a de friandises : le
// dernier étage en regorge. Ce dossier n'est téléchargé qu'au choix du niveau.
import * as THREE from 'three';
import { MallObstacles } from './engine.js';
import { mallObstacleKit } from './kit.js';
import { mallItems } from './items.js';

export const FOG_COLOR = '#f6eee8';

// paillettes qui scintillent dans la lumière des verrières
const sparkle = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.translate(16, 16);
  g.fillStyle = '#ffffff';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 4 : 14, a = (i / 8) * Math.PI * 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export default {
  id: 'mall',
  fog: FOG_COLOR,
  // musique : petite musique de galerie marchande, jazz léger et guilleret en gamme majeure
  music: { scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99], meter: 4, bpm: 116, voice: 'jazz' },
  world: {
    decor: null,   // les étages et les boutiques sont construits par le moteur du niveau (shell.js)
    lights: { sky: '#fffaf4', ground: '#d8ccc0', hemi: 1.9, sun: '#ffffff', sunI: 1.0 },
    track: null,
    particles: { texture: sparkle, size: 0.16, colors: ['#ffffff', '#ffe8f4', '#fff6c8', '#e0f4ff'] },
    scenery: () => ({ update() {} }),
  },
  // tenues débloquées tous les 10 objets au centre commercial (la première est la tenue de départ)
  palettes: [
    { name: 'Shopping', top: '#ff6aa8', cuff: '#ffffff', sash: '#ffd23f', skirt: '#2a2a48', ribbon: '#ffd23f' },
    { name: 'Soldes', top: '#e8202a', cuff: '#ffffff', sash: '#ffffff', skirt: '#1a1a1e', ribbon: '#ffd23f' },
    { name: 'Vitrine', top: '#c8ecff', cuff: '#ffffff', sash: '#ff8ac0', skirt: '#5a7ab8', ribbon: '#ff8ac0' },
    { name: 'Escalator', top: '#c8ccd4', cuff: '#1a1a1e', sash: '#f2c230', skirt: '#4a4c54', ribbon: '#f2c230' },
    { name: 'Peluche', top: '#c88a5a', cuff: '#f4e4d0', sash: '#ffb0c8', skirt: '#7a4a2a', ribbon: '#ffb0c8' },
    { name: 'Console', top: '#141428', cuff: '#3ff0ff', sash: '#ff4fa8', skirt: '#2a2a48', ribbon: '#3ff0ff' },
    { name: 'Survêt', top: '#1a8a3a', cuff: '#ffffff', sash: '#ffffff', skirt: '#1a1a1e', ribbon: '#c8ff3a' },
    { name: 'Librairie', top: '#6a3a2a', cuff: '#ffe8b0', sash: '#2a5a8a', skirt: '#c8a070', ribbon: '#ffe8b0' },
    { name: 'Barbe à papa', top: '#ffc0e0', cuff: '#ffffff', sash: '#d8b8ff', skirt: '#b0e0ff', ribbon: '#ff5aa8' },
    { name: 'Glace vanille', top: '#fff4d0', cuff: '#ffffff', sash: '#ff8ab0', skirt: '#e8b06a', ribbon: '#e8302a' },
    { name: 'Chocolat', top: '#5a3020', cuff: '#ffd8a0', sash: '#d8b04a', skirt: '#3a2010', ribbon: '#ffd8a0' },
    { name: 'Carte cadeau', top: '#1a1a2e', cuff: '#ffd23f', sash: '#ffd23f', skirt: '#3a3a5a', ribbon: '#ff5aa8' },
    { name: 'Verrière', top: '#b0e8ff', cuff: '#ffffff', sash: '#7ae07a', skirt: '#ffffff', ribbon: '#ffb0d0' },
    { name: 'Macaron', top: '#a8e8c8', cuff: '#ffffff', sash: '#ffb0c8', skirt: '#ffe08a', ribbon: '#d8b8ff' },
  ],
  obstacleKit: mallObstacleKit,
  // moteur d'obstacles à six étages reliés par des escalators
  obstacles: (root, opts) => new MallObstacles(root, opts),
  items: mallItems,
};
