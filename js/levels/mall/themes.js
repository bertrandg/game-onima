// Les six étages du centre commercial « Galeries Onima », du rez-de-chaussée au toit vitré. Chaque étage a
// son sol, sa couleur et ses boutiques : enseigne (texte de l'atlas), couleurs de la vitrine, type
// d'étalage à l'intérieur (voir shops.js), style de façade (voir facades.js) et pictogramme de
// l'enseigne-drapeau. Le dernier étage, celui des gourmandises, est sous une verrière et c'est là qu'on
// trouve le plus de bonus.
export const FLOORS = [
  {
    name: 'Mode', icon: '👗', tile: '#f4ece0', tile2: '#e2d4c0', accent: '#d8a0b0', ceil: '#f6f2ec',
    shops: [
      { name: '👗 Jolie Robe', bg: '#f8d8e4', fg: '#b03a6a', wall: '#fbe8ef', kind: 'dress', style: 'stone', icon: '👗' },
      { name: 'Denim Club', bg: '#2a3a6a', fg: '#f4f0e8', wall: '#d8e0f0', kind: 'jeans', style: 'brick', icon: '👖' },
      { name: '👠 Talons & Cie', bg: '#1a1a1e', fg: '#f2c8d8', wall: '#f4ece8', kind: 'shoes', style: 'slats', icon: '👠' },
      { name: 'Petit Pull', bg: '#f2c230', fg: '#4a3010', wall: '#fff4d8', kind: 'knit', style: 'wood', icon: '🧶' },
      { name: '💄 Parfums d\'Ami', bg: '#e8d8f4', fg: '#6a3a9a', wall: '#f6f0fb', kind: 'perfume', style: 'stone', icon: '💄' },
      { name: 'Chapeau !', bg: '#3a8a6a', fg: '#fff8e8', wall: '#e4f4ec', kind: 'hats', style: 'awning', icon: '🎩' },
    ],
  },
  {
    name: 'Jouets', icon: '🧸', tile: '#dcecf8', tile2: '#c0d8ee', accent: '#5aa8e8', ceil: '#eef6fc',
    shops: [
      { name: '🧸 Peluches & Co', bg: '#ffb0c8', fg: '#7a2a4a', wall: '#ffe8f0', kind: 'plush', style: 'blocks', icon: '🧸' },
      { name: 'Planète Jouets', bg: '#3a6ad8', fg: '#ffe84a', wall: '#e0eaff', kind: 'toys', style: 'blocks', icon: '🪐' },
      { name: '🚗 Mini Bolides', bg: '#e8302a', fg: '#ffffff', wall: '#ffe4e0', kind: 'cars', style: 'awning', icon: '🚗' },
      { name: 'Le Coffre à Jeux', bg: '#7a4ab0', fg: '#ffd84a', wall: '#efe4fa', kind: 'games', style: 'wood', icon: '🎲' },
      { name: '🧩 Puzzle Land', bg: '#3ab87a', fg: '#ffffff', wall: '#e0f6ea', kind: 'toys', style: 'blocks', icon: '🧩' },
      { name: 'Ballons Bulles', bg: '#ffd84a', fg: '#d8302a', wall: '#fff8d8', kind: 'balloons', style: 'awning', icon: '🎈' },
    ],
  },
  {
    name: 'High-tech', icon: '🎮', tile: '#c8ccd8', tile2: '#a8aebe', accent: '#3ad8ff', ceil: '#e4e8f0',
    shops: [
      { name: '🎮 Console Zone', bg: '#141428', fg: '#3ff0ff', wall: '#2a2a48', kind: 'consoles', style: 'neon', icon: '🎮' },
      { name: 'Méga Écran', bg: '#1a1a1e', fg: '#ff4fa8', wall: '#e8eaf0', kind: 'tv', style: 'neon', icon: '📺' },
      { name: '📱 Bip Bip Phone', bg: '#f4f4f8', fg: '#2a6ad8', wall: '#ffffff', kind: 'phones', style: 'stone', icon: '📱' },
      { name: 'Pixel Store', bg: '#3a3a4a', fg: '#7aff8a', wall: '#dfe4ea', kind: 'tv', style: 'neon', icon: '👾' },
      { name: '🤖 Robot Shop', bg: '#ff8a2a', fg: '#1a1a1e', wall: '#fff0e0', kind: 'robots', style: 'blocks', icon: '🤖' },
      { name: '🎧 Son+', bg: '#6a2ad8', fg: '#ffffff', wall: '#ece4fa', kind: 'audio', style: 'slats', icon: '🎧' },
    ],
  },
  {
    name: 'Sport', icon: '⚽', tile: '#d8ecc8', tile2: '#b8d8a4', accent: '#4ac04a', ceil: '#f0f8ea',
    shops: [
      { name: '⚽ Top Sport', bg: '#1a8a3a', fg: '#ffffff', wall: '#e4f4e4', kind: 'balls', style: 'brick', icon: '⚽' },
      { name: 'Vélo Vite', bg: '#ff6a1a', fg: '#ffffff', wall: '#fff0e4', kind: 'bikes', style: 'wood', icon: '🚲' },
      { name: '👟 Running', bg: '#1a1a1e', fg: '#c8ff3a', wall: '#f0f2ea', kind: 'sneakers', style: 'neon', icon: '👟' },
      { name: '⛷️ Glisse & Ski', bg: '#3a9ae8', fg: '#ffffff', wall: '#e8f4ff', kind: 'ski', style: 'wood', icon: '⛷️' },
      { name: '🎾 Tennis Club', bg: '#f4f0c8', fg: '#2a7a3a', wall: '#fafaf0', kind: 'balls', style: 'awning', icon: '🎾' },
      { name: 'Piscine Plouf', bg: '#2ac8d8', fg: '#ffffff', wall: '#e0f8fa', kind: 'swim', style: 'blocks', icon: '🏊' },
    ],
  },
  {
    name: 'Maison & Livres', icon: '📚', tile: '#ecdcc4', tile2: '#d8c0a0', accent: '#c8843a', ceil: '#f8f2e8',
    shops: [
      { name: '📚 Librairie Plume', bg: '#6a3a2a', fg: '#ffe8b0', wall: '#f4e8d8', kind: 'books', style: 'slats', icon: '📚' },
      { name: 'Cocon Déco', bg: '#e8c8a8', fg: '#5a3a2a', wall: '#fbf4ec', kind: 'sofa', style: 'wood', icon: '🛋️' },
      { name: '💡 Lumières', bg: '#2a2a34', fg: '#ffd84a', wall: '#3a3a44', kind: 'lamps', style: 'brick', icon: '💡' },
      { name: 'Mille Pages', bg: '#2a5a8a', fg: '#f4f0e8', wall: '#e8eef4', kind: 'books', style: 'stone', icon: '📖' },
      { name: '🎵 Vinyles', bg: '#d8302a', fg: '#1a1a1e', wall: '#f4e4e0', kind: 'records', style: 'brick', icon: '🎵' },
      { name: '🪴 Jardin d\'Intérieur', bg: '#4a8a3a', fg: '#fff8e0', wall: '#eef6e4', kind: 'plants', style: 'wood', icon: '🪴' },
    ],
  },
  {
    name: 'Gourmandises', icon: '🍭', tile: '#ffe4ee', tile2: '#ffffff', accent: '#ff5aa8', ceil: '#fff4f8',
    roof: true,
    shops: [
      { name: '🍭 Bonbons Magiques', bg: '#ff5aa8', fg: '#ffffff', wall: '#ffe8f4', kind: 'candy', style: 'awning', icon: '🍭' },
      { name: '🍦 Glaces Givrées', bg: '#7ad8f0', fg: '#ffffff', wall: '#e8fbff', kind: 'icecream', style: 'awning', icon: '🍦' },
      { name: '🧁 Pâtisserie Nuage', bg: '#fff0c8', fg: '#c8507a', wall: '#fffaf0', kind: 'cakes', style: 'stone', icon: '🧁' },
      { name: '🍫 Chocolat Câlin', bg: '#5a3020', fg: '#ffd8a0', wall: '#f4e4d8', kind: 'chocolate', style: 'slats', icon: '🍫' },
      { name: 'Barbe à Papa', bg: '#d8b8ff', fg: '#ff4fa8', wall: '#f6eeff', kind: 'candy', style: 'blocks', icon: '🍬' },
      { name: '🧇 Crêpes & Gaufres', bg: '#f2a640', fg: '#4a2a10', wall: '#fff4e4', kind: 'cakes', style: 'awning', icon: '🧇' },
    ],
  },
];

export const FLOOR_COUNT = FLOORS.length;
export const floorLabel = (f) => `Étage ${f + 1}`;
