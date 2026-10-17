// Niveau 1 : le Japon traditionnel (campagne, villages, forêt, mont Fuji)
import { Scenery, FOG_COLOR } from '../scenery.js';
import { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuildDecor } from '../decor.js';
import { japanObstacleKit } from '../obstacles.js';
import { japanItems } from '../candies.js';
import * as TX from '../textures.js';

export default {
  id: 'japon',
  fog: FOG_COLOR,
  // musique : koto sur la gamme In, en 4/4
  music: { scale: [293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99, 880.0], meter: 4, bpm: 104, voice: 'koto' },
  world: {
    decor: { DECOR, THEMES, THEME_ORDER, THEME_LEN, weighted, prebuild: prebuildDecor },
    lights: { sky: '#e6ecff', ground: '#a8b97a', hemi: 1.75, sun: '#ffe9cf', sunI: 2.1 },
    track: { ground: TX.grassTexture, groundTile: 10, bed: TX.gravelTexture, sleepers: TX.sleeperTexture },
    particles: { texture: TX.petalTexture, size: 0.28 },
    scenery: (root) => new Scenery(root),
  },
  obstacleKit: japanObstacleKit,
  items: japanItems,
};
