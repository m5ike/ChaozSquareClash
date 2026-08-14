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

// Povrchy — silniční okruh, chodníky u fasád, tramvajový úsek a pěšiny.
// Pásy jsou volené tak, aby nekolidovaly s OBSTACLES, stromy, lavičkami ani
// lampami a nechávaly volný střed (r 3 kolem [0,0] a kašny [0,6]).
const SURFACES = {
  // Okružní silnice šířky 3 — sever/jih na z=±10.75, boky na x=±13
  // (boční pásy posunuté ven kvůli stromům na x=±10).
  roads: [
    { x: 0, z: -10.75, w: 29, d: 3 },
    { x: 0, z: 10.75, w: 29, d: 3 },
    { x: -13, z: 0, w: 3, d: 18.5 },
    { x: 13, z: 0, w: 3, d: 18.5 },
  ],
  // Chodníky šířky 1.5 mezi okruhem a budovami (u severní/jižní řady
  // zajíždějí pod fasády a vykukují v prolukách).
  sidewalks: [
    { x: 0, z: -13, w: 29, d: 1.5 },
    { x: 0, z: 13, w: 29, d: 1.5 },
    { x: -15.25, z: 0, w: 1.5, d: 24.5 },
    { x: 15.25, z: 0, w: 1.5, d: 24.5 },
  ],
  // Tramvajový úsek západ–východ; z≈-8 místo -6 kvůli bedně [8,-6]
  // a zídce [-3,-5], konce před stromy na x=±10 (lavička [0,-7] = zastávka).
  rails: [{ x: 0, z: -8, w: 19, d: 1.6 }],
  // Pěšiny k centru — od východní silnice k pomníku a od severní k rails.
  paths: [
    { x: 7.25, z: 0, w: 8.5, d: 1.2 },
    { x: 1.5, z: -6.55, w: 1.2, d: 5.4 },
  ],
  // Přechody: přes severní pás (navazuje na pěšinu) a přes východní pás.
  crosswalks: [
    { x: 1.5, z: -10.75, w: 2.4, d: 3, axis: 'z' },
    { x: 13, z: 0, w: 3, d: 2.4, axis: 'x' },
  ],
};

// Výchozí počty dekoračních assetů — turistické centrum: dost chodců, málo aut.
const ASSET_DEFAULTS = { static: 10, vehicle: 4, pedestrian: 8, animal: 5 };

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
  surfaces: SURFACES,
  assetDefaults: ASSET_DEFAULTS,
};
