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
    unlock: { level: 'paris', score: 1500 },
    load: () => import('./newyork/index.js'),
  },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
