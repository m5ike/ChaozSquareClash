// Mapa „Praha — Staroměstské náměstí" — přesná data původního mapLayout.js.
// Modul je samostatný: paleta = hex hodnoty COLORS z game/constants.js, bez importu.

const PALETTE = {
  sky: '#4a7ab8',
  fog: '#3a5a8a',
  buildingA: '#d4a86a',
  buildingB: '#c4856a',
  buildingC: '#a8b88a',
  buildingD: '#b8986a',
  buildingE: '#c8a878',
  buildingF: '#9ab8a0',
  monument: '#a8a8a8',
  wall: '#5a4a3a',
  crate: '#8a6a3a',
  tree: '#3a7a2a',
  trunk: '#4a2a1a',
  roof: '#7a2a1a',
};

// Obvodové budovy náměstí — pos = střed [x, y, z], size = [šířka, výška, hloubka].
const BUILDINGS = [
  { pos: [-15, 4, -14], size: [8, 8, 2], color: PALETTE.buildingA },
  { pos: [-5, 5, -14], size: [7, 10, 2], color: PALETTE.buildingB },
  { pos: [5, 4, -14], size: [7, 8, 2], color: PALETTE.buildingC },
  { pos: [14, 6, -14], size: [8, 12, 2], color: PALETTE.buildingD },
  { pos: [-15, 4, 14], size: [8, 8, 2], color: PALETTE.buildingE },
  { pos: [-5, 5, 14], size: [7, 10, 2], color: PALETTE.buildingF },
  { pos: [5, 4, 14], size: [7, 8, 2], color: PALETTE.buildingA },
  { pos: [14, 5, 14], size: [8, 10, 2], color: PALETTE.buildingB },
  { pos: [19, 4, -8], size: [2, 8, 8], color: PALETTE.buildingC },
  { pos: [19, 4, 2], size: [2, 8, 8], color: PALETTE.buildingD },
  { pos: [-19, 4, -8], size: [2, 8, 8], color: PALETTE.buildingE },
  { pos: [-19, 4, 2], size: [2, 8, 8], color: PALETTE.buildingF },
];

// Střechy — odvozené z budov (mírný přesah, posazené na horní hranu).
const ROOFS = BUILDINGS.map((b) => ({
  pos: [b.pos[0], b.pos[1] + b.size[1] / 2 + 0.4, b.pos[2]],
  size: [b.size[0] + 0.4, 0.8, b.size[2] + 0.4],
  color: PALETTE.roof,
}));

// Překážky na náměstí — bedny a zídky (kryty).
const OBSTACLES = [
  { pos: [-6, 0.5, 0], size: [1.5, 1, 1.5], color: PALETTE.crate },
  { pos: [-6, 1.5, 0], size: [1.5, 1, 1.5], color: PALETTE.crate },
  { pos: [6, 0.5, -2], size: [2, 1.2, 1], color: PALETTE.crate },
  { pos: [0, 0.5, 5], size: [2.5, 1, 1], color: PALETTE.wall },
  { pos: [-3, 0.5, -5], size: [1, 1, 2], color: PALETTE.wall },
  { pos: [3, 0.5, 3], size: [1, 1.2, 1.2], color: PALETTE.crate },
  { pos: [-8, 0.5, 6], size: [1.5, 1, 1.5], color: PALETTE.crate },
  { pos: [8, 0.5, -6], size: [1.5, 1, 1.5], color: PALETTE.crate },
  { pos: [0, 0.5, -3], size: [3, 1, 1.5], color: PALETTE.buildingA },
  { pos: [-5, 0.5, 3], size: [1.5, 1, 2], color: PALETTE.buildingC },
];

// Stromy v rozích náměstí.
const TREES = [
  { pos: [-10, 0, -8] },
  { pos: [10, 0, 8] },
  { pos: [-10, 0, 8] },
  { pos: [10, 0, -8] },
];

// Lavičky — pozice [x, z] na dlažbě.
const BENCHES = [
  [-3, -3],
  [3, 3],
  [-3, 3],
  [3, -3],
  [0, -7],
  [0, 7],
];

// Spawnovací body botů [x, y, z] — původních 5 + 5 nových po obvodu.
const BOT_SPAWNS = [
  [-10, 1, -10],
  [10, 1, -10],
  [-10, 1, 10],
  [10, 1, 10],
  [0, 1, -12],
  [0, 1, 12],
  [-16, 1, 0],
  [16, 1, 0],
  [-16, 1, -9],
  [16, 1, 9],
];

// Pozice lékárniček [x, y, z].
const PICKUP_SPOTS = [
  [-12, 1, -5],
  [12, 1, 5],
  [-5, 1, 10],
  [5, 1, -10],
];

// Pouliční lampy — pozice [x, z].
const LAMPS = [
  [-9, -9],
  [9, -9],
  [-9, 9],
  [9, 9],
];

export default {
  id: 'praha',
  name: 'Praha — Staroměstské náměstí',
  desc: 'Klasické dlážděné náměstí s kašnou uprostřed, měšťanskými domy po obvodu a bednami na krytí.',
  palette: PALETTE,
  centerpiece: 'fountain',
  buildings: BUILDINGS,
  roofs: ROOFS,
  obstacles: OBSTACLES,
  trees: TREES,
  benches: BENCHES,
  botSpawns: BOT_SPAWNS,
  pickupSpots: PICKUP_SPOTS,
  lamps: LAMPS,
};
