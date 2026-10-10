// Réglages globaux du jeu
export const LANE_W = 2.6;
export const LANES = [-LANE_W, 0, LANE_W];

export const GRAVITY = 52;
export const JUMP_V = 18.5;          // hauteur max ≈ 3.3
export const FAST_DROP_V = -30;
export const SLIDE_TIME = 0.6;
export const PLAYER_H = 1.6;
export const PLAYER_SLIDE_H = 0.8;

export const TRAIN_TOP = 2.6;
export const TRAIN_HALF_W = 1.1;
export const CAR_LEN = 10;
export const CAR_GAP = 0.6;
export const RAMP_LEN = 7;
export const MOVING_TRAIN_SPEED = 11;

export const BASE_SPEED = 14;
export const MAX_SPEED = 40;

export const SPAWN_AHEAD = 230;
export const DESPAWN_BEHIND = 25;

// La vitesse augmente avec la distance, sans limite de niveau (plafond MAX_SPEED)
export function speedAt(dist) {
  return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - Math.exp(-dist / 3200));
}
