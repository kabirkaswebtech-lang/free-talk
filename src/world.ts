/**
 * The layout of the house (metres). The back wall is at z = BACK and the camera looks at it from +z,
 * so smaller x is further left on screen. The camera follows the character along x.
 *
 *   bedroom        tree        shelf   fireplace   armchair   window   dining      kitchen
 *   x -7.7         -4.3        -2.4    0           2.3        4.2      5.0         8.0
 */
export const BACK = -3.2;
export const ROOM_MIN_X = -10.5;
export const ROOM_MAX_X = 10.5;
export const CAM_MIN_X = -7.4;
export const CAM_MAX_X = 7.2;

export const ST = {
  // bed: the body lies along x with the head to the left
  bed: { x: -7.7, z: -2.4 },
  bedLie: { x: -7.0, z: -2.4 }, // where the feet end up when lying down
  bedSide: { x: -5.9, z: -1.4 },
  bedRise: { x: -6.2, z: -1.2 },

  tree: { x: -4.3, z: -2.2 },
  treeSpot: { x: -3.2, z: -0.9 },

  logs: { x: -1.35, z: -2.55 },
  logSpot: { x: -1.2, z: -1.75 },
  fire: { x: 0, z: -2.9 },
  fireSpot: { x: 0.1, z: -1.8 },

  chair: { x: 2.3, z: -1.3 }, // centre of the seat
  chairFront: { x: 2.3, z: -0.35 },

  table: { x: 5.0, z: -1.55 },
  diningSeat: { x: 5.0, z: -2.3 },
  diningStart: { x: 6.5, z: -0.8 },
  diningSide: { x: 6.5, z: -2.3 },

  stove: { x: 7.45, z: -2.85 },
  cookSpot: { x: 7.45, z: -2.3 },
};

/** Yaw (rotation about y) that makes something facing +z look from (fx, fz) towards (tx, tz). */
export const faceTo = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(tx - fx, tz - fz);
