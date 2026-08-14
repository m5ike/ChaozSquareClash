import { COLORS } from '@/game/constants.js';

// Obvodové budovy náměstí — pos = střed [x, y, z], size = [šířka, výška, hloubka].
export const BUILDINGS = [
  { pos: [-15, 4, -14], size: [8, 8, 2], color: COLORS.buildingA },
  { pos: [-5, 5, -14], size: [7, 10, 2], color: COLORS.buildingB },
  { pos: [5, 4, -14], size: [7, 8, 2], color: COLORS.buildingC },
  { pos: [14, 6, -14], size: [8, 12, 2], color: COLORS.buildingD },
  { pos: [-15, 4, 14], size: [8, 8, 2], color: COLORS.buildingE },
  { pos: [-5, 5, 14], size: [7, 10, 2], color: COLORS.buildingF },
  { pos: [5, 4, 14], size: [7, 8, 2], color: COLORS.buildingA },
  { pos: [14, 5, 14], size: [8, 10, 2], color: COLORS.buildingB },
  { pos: [19, 4, -8], size: [2, 8, 8], color: COLORS.buildingC },
  { pos: [19, 4, 2], size: [2, 8, 8], color: COLORS.buildingD },
  { pos: [-19, 4, -8], size: [2, 8, 8], color: COLORS.buildingE },
  { pos: [-19, 4, 2], size: [2, 8, 8], color: COLORS.buildingF },
];

// Střechy — odvozené z budov (mírný přesah, posazené na horní hranu).
export const ROOFS = BUILDINGS.map((b) => ({
  pos: [b.pos[0], b.pos[1] + b.size[1] / 2 + 0.4, b.pos[2]],
  size: [b.size[0] + 0.4, 0.8, b.size[2] + 0.4],
  color: COLORS.roof,
}));

// Překážky na náměstí — bedny a zídky (kryty).
export const OBSTACLES = [
  { pos: [-6, 0.5, 0], size: [1.5, 1, 1.5], color: COLORS.crate },
  { pos: [-6, 1.5, 0], size: [1.5, 1, 1.5], color: COLORS.crate },
  { pos: [6, 0.5, -2], size: [2, 1.2, 1], color: COLORS.crate },
  { pos: [0, 0.5, 5], size: [2.5, 1, 1], color: COLORS.wall },
  { pos: [-3, 0.5, -5], size: [1, 1, 2], color: COLORS.wall },
  { pos: [3, 0.5, 3], size: [1, 1.2, 1.2], color: COLORS.crate },
  { pos: [-8, 0.5, 6], size: [1.5, 1, 1.5], color: COLORS.crate },
  { pos: [8, 0.5, -6], size: [1.5, 1, 1.5], color: COLORS.crate },
  { pos: [0, 0.5, -3], size: [3, 1, 1.5], color: COLORS.buildingA },
  { pos: [-5, 0.5, 3], size: [1.5, 1, 2], color: COLORS.buildingC },
];

// Stromy v rozích náměstí.
export const TREES = [
  { pos: [-10, 0, -8] },
  { pos: [10, 0, 8] },
  { pos: [-10, 0, 8] },
  { pos: [10, 0, -8] },
];

// Lavičky — pozice [x, z] na dlažbě (pouliční lampy jsou definované inline v CityMap).
export const BENCHES = [
  [-3, -3],
  [3, 3],
  [-3, 3],
  [3, -3],
  [0, -7],
  [0, 7],
];

// Spawnovací body botů [x, y, z].
export const BOT_SPAWNS = [
  [-10, 1, -10],
  [10, 1, -10],
  [-10, 1, 10],
  [10, 1, 10],
  [0, 1, -12],
];

// Pozice lékárniček [x, y, z].
export const PICKUP_SPOTS = [
  [-12, 1, -5],
  [12, 1, 5],
  [-5, 1, 10],
  [5, 1, -10],
];
