import { addPiece, pieceWidth } from './kit.js';

// Styles de façade composés avec les pièces du kit. Une façade fait 16 m de long : chaque rangée est
// une suite de pièces (2 ou 4 m) qui remplit ces 16 m ; des colonnes en saillie sont posées aux joints.
// Les étages bas sont en vraies pièces 3D ; au-dessus, une texture « photographiée » de deux étages
// types (models/nykit/facades.jpg, générée par tools/bake-facades.html) se répète jusqu'en haut.
export const FACADE_LEN = 16;
export const FLOOR_H = 3;
export const FLOORS_3D = 2;               // rez-de-chaussée + 1er étage en 3D (au-dessus : texture)
export const BAKE = { pxPerM: 48, floors: 2, atlasW: 768, atlasH: 2048 };

const rep = (p, n) => Array(n).fill(p);
export const STYLES = {
  trimStone: {
    ground: [...rep('Trim_FirstFloor_Window_001', 3), 'DoorFrame_Trim', ...rep('Trim_FirstFloor_Window_001', 4)],
    floor: rep('Trim_Window', 8),
    cols: { piece: 'Trim_Column_Center', ground: 'Trim_Column_Bottom', every: 4 },
    band: 'Cornice_Trim_Center',
  },
  modern: {
    ground: [...rep('Metal_FirstFloor_Window', 3), 'DoorFrame_Metal_Single', ...rep('Metal_FirstFloor_Window', 4)],
    floor: rep('Metal_Window', 4),
    cols: { piece: 'Metal_Column_Center', ground: 'Metal_Column_Bottom', every: 4 },
    band: 'Cornice_Metal_Center',
  },
  paleInset: {
    ground: [...rep('Metal_FirstFloor_Window', 3), 'DoorFrame_Metal_Single', 'Metal_FirstFloor_Wall', ...rep('Metal_FirstFloor_Window', 3)],
    floor: rep('Brick_Inset_Window', 4),
    cols: { piece: 'Brick_HalfColumn_Center', ground: 'Brick_HalfColumn_Bottom', every: 4 },
    band: 'Cornice_Trim_Center', pale: true,
  },
  curved: {
    ground: [...rep('Trim_FirstFloor_Window_001', 4), 'DoorFrame_Trim', ...rep('Trim_FirstFloor_Window_001', 3)],
    floor: rep('Brick_Inset_Window_Curved', 4),
    cols: { piece: 'Brick_HalfColumn_Center', ground: 'Brick_HalfColumn_Bottom', every: 4 },
    band: 'Brick_Ornament_Horizontal', pale: true,
  },
  redWhite: {
    ground: [...rep('Trim_FirstFloor_Window_001', 2), 'DoorFrame_Trim', ...rep('Trim_FirstFloor_Window_001', 5)],
    floor: rep('Brick_RedWhite_DoubleWindow', 4),
    cols: null,
    band: 'Cornice_Brick_Center',
  },
  brownstone: {
    ground: [...rep('Trim_FirstFloor_Window_001', 3), 'DoorFrame_Trim', ...rep('Trim_FirstFloor_Window_001', 4)],
    floor: rep('Brick_Window_Trim', 8),
    cols: { piece: 'Brick_HalfColumn_Center', ground: 'Brick_HalfColumn_Bottom', every: 4 },
    band: 'Brick_Ornament_Horizontal',
  },
  squares: {
    ground: [...rep('Metal_FirstFloor_Window', 2), 'DoorFrame_Metal_Single', ...rep('Metal_FirstFloor_Window', 5)],
    floor: ['Brick_Window_Square_Single', 'Brick_Window_Trim_Single', 'Brick_Window_Square_Single', 'Brick_Window_Trim_Single',
      'Brick_Window_Square_Single', 'Brick_Window_Trim_Single', 'Brick_Window_Square_Single', 'Brick_Window_Trim_Single'],
    cols: { piece: 'Brick_HalfColumn_Center', ground: 'Brick_HalfColumn_Bottom', every: 8 },
    band: 'Cornice_Brick_Center',
  },
};
export const STYLE_NAMES = Object.keys(STYLES);
const PALE = [1.3, 1.18, 1.08];

// place une rangée de pièces : at(u, y) donne [position, rotY] pour l'abscisse u le long de la façade
function row(t, list, y, at, opt) {
  let u = 0;
  for (const name of list) {
    const w = pieceWidth(name);
    const [p, r] = at(u + w / 2, y);
    addPiece(t, name, p, r, { interior: opt.interior(), tint: opt.tint });
    // une porte dans chaque encadrement (pièce de 1 m, à centrer)
    if (name.startsWith('DoorFrame')) {
      const [dp, dr] = at(u + w / 2 + 0.5, y);
      addPiece(t, name === 'DoorFrame_Metal_Single' ? 'Door_3' : 'Door_2', [dp[0] - (dr ? 0.12 : 0), dp[1], dp[2] - (dr ? 0 : 0.12)], dr, { tint: opt.tint });
    }
    u += w;
  }
}

// étages [f0, f1[ d'un style, rez-de-chaussée compris si f0 = 0, et bandeau au-dessus du dernier
export function buildFloors(t, styleName, f0, f1, at, { tint = null, interior = () => (Math.random() * 3) | 0, band = true } = {}) {
  const S = STYLES[styleName];
  const tn = S.pale ? (tint ? tint.map((v, i) => v * PALE[i]) : PALE) : tint;
  const opt = { tint: tn, interior };
  for (let f = f0; f < f1; f++) {
    const y = f * FLOOR_H;
    row(t, f === 0 ? S.ground : S.floor, y, at, opt);
    if (S.cols) {
      for (let u = 0; u <= FACADE_LEN + 0.01; u += S.cols.every) {
        const [p, r] = at(Math.min(FACADE_LEN - 0.3, Math.max(0.3, u)), y);
        addPiece(t, f === 0 ? S.cols.ground : S.cols.piece, p, r, { tint: tn });
      }
    }
  }
  if (band && S.band) {
    const yb = f1 * FLOOR_H;
    for (let u = 1; u < FACADE_LEN; u += 2) {
      const [p, r] = at(u, S.band === 'Brick_Ornament_Horizontal' ? yb - 0.2 : yb - 0.5);
      addPiece(t, S.band, p, r, { tint: tn });
    }
  }
}

// région de la texture des étages supérieurs pour un style
export function bakedUV(styleName) {
  const k = STYLE_NAMES.indexOf(styleName);
  const h = (BAKE.floors * FLOOR_H * BAKE.pxPerM) / BAKE.atlasH;
  return [0, 1 - (k + 1) * h, 1, 1 - k * h];
}
