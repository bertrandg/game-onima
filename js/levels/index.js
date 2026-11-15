// Registre des niveaux. Pour ajouter un niveau : créer son module (voir japon.js et paris/index.js)
// puis l'ajouter ici. Chaque module n'est téléchargé qu'au moment où le niveau est choisi.
export const LEVELS = [
  {
    id: 'japon',
    name: 'Japon',
    subtitle: 'Campagne et villages',
    icon: '🗻',
    item: '🍡',
    load: () => import('./japon.js'),
  },
  {
    id: 'paris',
    name: 'Paris 1900',
    subtitle: 'La Belle Époque',
    icon: '🗼',
    item: '🥐',
    // se débloque avec un score minimum au niveau précédent
    unlock: { level: 'japon', score: 1500 },
    load: () => import('./paris/index.js'),
  },
  {
    id: 'newyork',
    name: 'New York',
    subtitle: 'Big Apple et égouts',
    icon: '🗽',
    item: '🍕',
    unlock: { level: 'paris', score: 2300 },
    load: () => import('./newyork/index.js'),
  },
  {
    id: 'egypte',
    name: 'Égypte',
    subtitle: 'Pharaons et tombeaux',
    icon: '🐪',
    item: '🍯',
    unlock: { level: 'newyork', score: 3000 },
    load: () => import('./egypte/index.js'),
  },
  {
    id: 'hongkong',
    name: 'Hong Kong',
    subtitle: 'Néons et échafaudages',
    icon: '🌃',
    item: '🥟',
    unlock: { level: 'egypte', score: 3500 },
    load: () => import('./hongkong/index.js'),
  },
  {
    id: 'mall',
    name: 'Centre commercial',
    subtitle: 'Six étages et des escalators',
    icon: '🛍️',
    item: '🛍️',
    unlock: { level: 'hongkong', score: 4000 },
    load: () => import('./mall/index.js'),
  },
  {
    id: 'ski',
    name: 'Piste de ski',
    subtitle: 'Face au Mont Blanc',
    icon: '⛷️',
    item: '☕',
    unlock: { level: 'mall', score: 4500 },
    load: () => import('./ski/index.js'),
  },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

// Un niveau est jouable s'il n'a pas de condition, si le code secret a été saisi, ou si le meilleur
// score obtenu au niveau précédent atteint le seuil. scores fournit bestOnLevel(id) et allUnlocked().
export const isUnlocked = (meta, scores) =>
  !meta.unlock || scores.allUnlocked() || scores.bestOnLevel(meta.unlock.level) >= meta.unlock.score;
