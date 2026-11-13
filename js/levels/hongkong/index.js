// Niveau 5 : Hong Kong la nuit. La rue des néons de Mong Kok, le marché de nuit de Temple Street et le
// front de mer du port Victoria se succèdent sous la skyline illuminée, et des passerelles d'échafaudage
// de bambou courent au-dessus de la rue : un deuxième étage où l'on monte par des rampes ou depuis le toit
// des minibus. Ce dossier n'est téléchargé qu'au choix du niveau.
import * as THREE from 'three';
import { hongKongSky, FOG_COLOR } from './scenery.js';
import { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild, makeTexMats, CLEARANCE } from './decor.js';
import { hongKongVehicleKit } from './vehicles.js';
import { hongKongItems } from './items.js';
import { ScaffoldObstacles } from './scaffold.js';
import * as HX from './textures.js';

// bruine : fins traits clairs qui accrochent la lumière des néons
const drizzle = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 2, 0, 30);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(15, 2, 2, 28);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export default {
  id: 'hongkong',
  fog: FOG_COLOR,
  // hauteur libre au-dessus des voies : on saute depuis les passerelles (vérifiée par les tests du décor)
  clearance: CLEARANCE,
  // musique : pop de synthés des années 80 (gamme pentatonique), arpèges, basse et caisse claire
  music: { scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99], meter: 4, bpm: 118, voice: 'neon' },
  world: {
    decor: { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild, texMats: makeTexMats() },
    lights: { sky: '#9a90e8', ground: '#3a2848', hemi: 1.45, sun: '#d0d8ff', sunI: 1.3 },
    track: {
      ground: HX.sidewalkTiles, groundTile: 8, bed: HX.wetAsphalt, sleepers: HX.laneWear, rails: false,
      overlay: HX.roadLines, overlayTile: 6, curb: '#8a8898',
    },
    particles: { texture: drizzle, size: 0.32, colors: ['#ffffff', '#c8e8ff', '#ffd0ec', '#d8f8ff'] },
    scenery: hongKongSky,
  },
  // tenues débloquées tous les 10 objets à Hong Kong (la première est la tenue de départ)
  palettes: [
    { name: 'Néon rose', top: '#ff4fa8', cuff: '#ffffff', sash: '#3ff0ff', skirt: '#1a1838', ribbon: '#3ff0ff' },
    { name: 'Ding Ding', top: '#2a8a4a', cuff: '#f4f0e8', sash: '#f2c230', skirt: '#1f4a2a', ribbon: '#f2c230' },
    { name: 'Taxi rouge', top: '#d8202a', cuff: '#d8dcdf', sash: '#d8dcdf', skirt: '#2a2a34', ribbon: '#fff4b0' },
    { name: 'Star Ferry', top: '#f4f0e8', cuff: '#2a6a4a', sash: '#2a6a4a', skirt: '#2a6a4a', ribbon: '#e8b830' },
    { name: 'Dim Sum', top: '#f2d850', cuff: '#fffaf0', sash: '#c83a2a', skirt: '#d8963a', ribbon: '#ff7a2a' },
    { name: 'Jade', top: '#3aa880', cuff: '#e8fff4', sash: '#d8a030', skirt: '#1a4a3a', ribbon: '#d8a030' },
    { name: 'Mong Kok', top: '#b06aff', cuff: '#ffe84a', sash: '#ff4fa8', skirt: '#141428', ribbon: '#ffe84a' },
    { name: 'Temple Street', top: '#e8202a', cuff: '#ffd890', sash: '#2a5ad8', skirt: '#3a1a2a', ribbon: '#ffd890' },
    { name: 'Victoria', top: '#3a4a8a', cuff: '#7af0ff', sash: '#ff8ac8', skirt: '#141a3a', ribbon: '#7af0ff' },
    { name: 'Pic', top: '#1e1c3a', cuff: '#c8d0ff', sash: '#c8d0ff', skirt: '#2a2850', ribbon: '#ff9a2a' },
    { name: 'Thé au lait', top: '#c89a6a', cuff: '#fff4e0', sash: '#7a4a2a', skirt: '#e8d2b0', ribbon: '#c83a2a' },
    { name: 'Mangue', top: '#ffb030', cuff: '#ffffff', sash: '#ff6a8a', skirt: '#ffe080', ribbon: '#3aa880' },
    { name: 'Lanterne', top: '#ff3a3a', cuff: '#ffd040', sash: '#ffd040', skirt: '#7a1a1a', ribbon: '#ffd040' },
    { name: 'Bambou', top: '#c8b070', cuff: '#f4f0e8', sash: '#4a7a3a', skirt: '#6a5a3a', ribbon: '#4a7a3a' },
    { name: 'Cyber', top: '#3ff0ff', cuff: '#141428', sash: '#b06aff', skirt: '#141428', ribbon: '#ff4fa8' },
    { name: 'Typhon', top: '#6a7a9a', cuff: '#e8f0ff', sash: '#3a4a6a', skirt: '#2a3048', ribbon: '#ffe84a' },
  ],
  obstacleKit: hongKongVehicleKit,
  // moteur d'obstacles à deux étages : la rue et les passerelles d'échafaudage au-dessus
  obstacles: (root, opts) => new ScaffoldObstacles(root, opts),
  items: hongKongItems,
};
