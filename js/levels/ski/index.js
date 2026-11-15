// Niveau 7 : la piste de ski. Une longue piste rouge qui descend face au Mont Blanc, en virages doux, entre
// les jalons, les sapins enneigés et les rochers. L'héroïne est à ski (combinaison, skis freeride larges) :
// elle glisse, change de voie par un virage, et ne saute que depuis une bosse ou un tremplin, d'autant plus
// haut qu'elle saute tard ; un saut parfait au tremplin l'envoie sur la barre de slide en hauteur. Six voies
// sans marquage. La pente et les virages sont un effet d'affichage (bend.js) : le jeu reste calculé sur une
// piste droite et plate. Ce dossier n'est téléchargé qu'au choix du niveau.
import { SkiObstacles, SKI_LANES, START_LANE } from './engine.js';
import { skiItems } from './items.js';
import { skiScenery, FOG_COLOR } from './scenery.js';
import { flakeTex } from './textures.js';

export default {
  id: 'ski',
  fog: FOG_COLOR,
  lanes: SKI_LANES,
  startLane: START_LANE,
  laneRate: 7.5,
  holdLanes: true, // garder ← ou → enfoncé enchaîne les virages jusqu'au bord de la piste   // changement de voie plus coulé : c'est un virage à ski
  outfit: 'ski',
  // musique : accordéon de fête au village de montagne (valse musette, gamme majeure)
  music: { scale: [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 523.25, 587.33, 659.25], meter: 3, bpm: 150, voice: 'musette' },
  world: {
    decor: null,   // piste, forêt et équipements sont construits par le moteur du niveau (terrain.js)
    lights: { sky: '#f2e6f6', ground: '#a0a2c4', hemi: 1.35, sun: '#fff0e4', sunI: 1.25 },   // teintes du coucher de soleil de l'image du fond
    track: null,
    particles: { texture: flakeTex, size: 0.2, colors: ['#ffffff', '#f0f6ff', '#e8f2ff'] },
    scenery: skiScenery,
  },
  // tenues : top = veste, skirt = pantalon, sash = finitions (masque, sac, fermeture), cuff = gants et col,
  // ribbon = skis
  palettes: [
    { name: 'Piste rouge', top: '#e8302a', cuff: '#ffffff', sash: '#1a1a24', skirt: '#1a1a24', ribbon: '#ffd23f' },
    { name: 'Glacier', top: '#7ad8f0', cuff: '#ffffff', sash: '#2a4a8a', skirt: '#ffffff', ribbon: '#2a4a8a' },
    { name: 'Myrtille', top: '#5a3ab0', cuff: '#ffd23f', sash: '#ffd23f', skirt: '#2a1a4a', ribbon: '#ff5aa8' },
    { name: 'Chamois', top: '#c88a4a', cuff: '#f4e8d0', sash: '#5a3a20', skirt: '#3a2a1a', ribbon: '#e8302a' },
    { name: 'Edelweiss', top: '#ffffff', cuff: '#ffd23f', sash: '#3aa84a', skirt: '#2a5a3a', ribbon: '#3aa84a' },
    { name: 'Fluo 90', top: '#ff4fa8', cuff: '#c8ff3a', sash: '#3ff0ff', skirt: '#5a3ab0', ribbon: '#c8ff3a' },
    { name: 'Génépi', top: '#a8d84a', cuff: '#ffffff', sash: '#2a4a1a', skirt: '#1a2a1a', ribbon: '#ff7a1a' },
    { name: 'Moniteur', top: '#e8202a', cuff: '#1a2a5a', sash: '#ffffff', skirt: '#1a2a5a', ribbon: '#1a2a5a' },
    { name: 'Poudreuse', top: '#e8f0fa', cuff: '#a8c8f0', sash: '#5a7ab8', skirt: '#a8c8f0', ribbon: '#ff8ac0' },
    { name: 'Dameuse', top: '#d8202a', cuff: '#ffd23f', sash: '#2a2a30', skirt: '#2a2a30', ribbon: '#ffd23f' },
    { name: 'Chocolat chaud', top: '#6a3a22', cuff: '#fff4e0', sash: '#e8302a', skirt: '#3a2010', ribbon: '#fff4e0' },
    { name: 'Aiguille du Midi', top: '#2a3a5a', cuff: '#ff7a1a', sash: '#ff7a1a', skirt: '#141a2a', ribbon: '#e8eef6' },
    { name: 'Coucher de soleil', top: '#ff8a4a', cuff: '#ffd8b0', sash: '#c83a6a', skirt: '#4a2a5a', ribbon: '#ffd23f' },
    { name: 'Sapin', top: '#1f5a3a', cuff: '#ffffff', sash: '#e8302a', skirt: '#1a2a20', ribbon: '#ffffff' },
  ],
  obstacleKit: () => ({}),
  obstacles: (root, opts) => new SkiObstacles(root, opts),
  items: skiItems,
};


