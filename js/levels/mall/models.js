import { loadPlants, addPlant, plant } from '../../plants.js';

// Modèles du centre commercial pris sur Poly Pizza (models/mall/LICENSE.txt) : plantes d'intérieur,
// mannequin de couturière et banc. Ils sont recolorés et fusionnés dans les boutiques comme les primitives.
await loadPlants('mall');

const GREENS = ['#3f8f3a', '#4ea544', '#2f7a3a', '#5cb04a'];

// hauteur moyenne (relative) de chaque morceau d'un modèle
const partY = {};
function heights(key) {
  if (partY[key]) return partY[key];
  const m = plant(key), sum = {}, cnt = {};
  for (let i = 0; i < m.n; i++) {
    const p = m.part[i];
    sum[p] = (sum[p] || 0) + (m.pos[i * 9 + 1] + m.pos[i * 9 + 4] + m.pos[i * 9 + 7]) / 3;
    cnt[p] = (cnt[p] || 0) + 1;
  }
  const out = {};
  for (const p of Object.keys(sum)) out[p] = sum[p] / cnt[p];
  return (partY[key] = out);
}

// plante en pot (rôles : 0 = pot, 1 = terre, 2 = feuillage) ; la touffe n'a pas de pot
export function potPlant(F, key, p, h, { pot = '#f4f0e8', ry = 0, green = 0 } = {}) {
  addPlant(F, key, p, h, (role, part) => {
    if (key === 'm_tuft') return GREENS[(part + green) % GREENS.length];
    if (role === 0) return pot;
    if (role === 1) return '#5a3e2a';
    return GREENS[(part + green) % GREENS.length];
  }, { ry });
}

// mannequin de couturière habillé : buste à la couleur de la robe, pied en bois
export function dressForm(F, p, body, ry = Math.PI / 2) {
  const Y = heights('m_dress');
  addPlant(F, 'm_dress', p, 1.85, (role, part) => (Y[part] > 0.4 ? body : '#b89068'), { ry });
}

// banc de la galerie, tourné vers les vitrines d'en face (dossier côté boutique)
export function bench(F, p, len = 1.8) {
  addPlant(F, 'm_bench', p, len / plant('m_bench').w, () => null, { ry: Math.PI / 2 });
}
