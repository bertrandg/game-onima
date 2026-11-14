// Dimensions du centre commercial, partagées par les étages, les escalators et le moteur d'obstacles
export const FLOOR_H = 6.4;          // d'un étage à l'autre
export const SLAB = 0.4;             // épaisseur des dalles (le plafond d'un étage est à FLOOR_H - SLAB)
export const CEIL = FLOOR_H - SLAB;  // hauteur libre sous le plafond de la galerie
export const MOD = 5.2;              // module des dalles le long de la galerie (4 carreaux de 1,3 m)
export const ESC_LEN = 4 * MOD;      // longueur d'un escalator (pente d'environ 17°)
export const LANE_HX = 1.3;          // demi-largeur d'une voie (et de la trémie d'un escalator)
export const WALK_X = 3.9;           // bord extérieur des voies : au-delà, la galerie devant les boutiques
export const ROOF_Y = 8.6;           // verrière du dernier étage, au-dessus de son sol
export const TOP = 5;                // le dernier étage (6 étages : 0 à 5)

// hauteur des marches d'un escalator au point z (depuis le sol de l'étage du bas)
export const escY = (c, z) => {
  const t = Math.min(1, Math.max(0, (c.zNear - z) / ESC_LEN));
  return c.a * FLOOR_H + FLOOR_H * (c.dir > 0 ? t : 1 - t);
};
