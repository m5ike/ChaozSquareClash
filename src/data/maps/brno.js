// Mapa „Brno — Zelný trh" — útulnější trhové náměstí s teplou okrovo-cihlovou
// paletou, hustšími domy s uličkami, stánky a morovým sloupem uprostřed.

const PALETTE = {
  sky: '#6a8cbc', // denní modř s teplým nádechem
  fog: '#3a4e74', // tmavší mlha
  buildingA: '#d89a5a', // okrová
  buildingB: '#b86a42', // cihlová
  buildingC: '#e2c088', // písková
  buildingD: '#c48a54', // karamelová
  buildingE: '#a85a38', // tmavá terakota
  buildingF: '#bc9a62', // hořčicová
  monument: '#c8bca0', // pískovec morového sloupu
  wall: '#6a5040',
  crate: '#9a7440', // trhové bedny
  tree: '#4a8a34',
  trunk: '#503018',
  roof: '#8e3c24',
};

// Obvodové budovy — hustší zástavba s úzkými uličkami, uzavřený rám (±19 / ±14).
const BUILDINGS = [
  // Severní řada (z = -14)
  { pos: [-16, 5, -14], size: [6, 10, 2], color: '#d89a5a' },
  { pos: [-10.5, 4, -14], size: [4, 8, 2], color: '#b86a42' },
  { pos: [-5, 6, -14], size: [6, 12, 2], color: '#e2c088' },
  { pos: [0.5, 3.5, -14], size: [4, 7, 2], color: '#c48a54' },
  { pos: [5.5, 5, -14], size: [5, 10, 2], color: '#a85a38' },
  { pos: [11, 7, -14], size: [5, 14, 2], color: '#bc9a62' },
  { pos: [16.5, 4.5, -14], size: [5, 9, 2], color: '#d89a5a' },
  // Jižní řada (z = 14)
  { pos: [-16, 4.5, 14], size: [6, 9, 2], color: '#c48a54' },
  { pos: [-10, 6, 14], size: [5, 12, 2], color: '#e2c088' },
  { pos: [-4.5, 4, 14], size: [5, 8, 2], color: '#a85a38' },
  { pos: [1, 5.5, 14], size: [5, 11, 2], color: '#d89a5a' },
  { pos: [6.5, 3, 14], size: [5, 6, 2], color: '#b86a42' },
  { pos: [12, 5, 14], size: [5, 10, 2], color: '#bc9a62' },
  { pos: [17, 6.5, 14], size: [4, 13, 2], color: '#c48a54' },
  // Východní strana (x = 19)
  { pos: [19, 4, -10], size: [2, 8, 7], color: '#e2c088' },
  { pos: [19, 5.5, -3], size: [2, 11, 6], color: '#b86a42' },
  { pos: [19, 4.5, 4], size: [2, 9, 7], color: '#d89a5a' },
  { pos: [19, 3.5, 10.5], size: [2, 7, 5], color: '#a85a38' },
  // Západní strana (x = -19)
  { pos: [-19, 5, -10], size: [2, 10, 7], color: '#bc9a62' },
  { pos: [-19, 4, -3], size: [2, 8, 6], color: '#c48a54' },
  { pos: [-19, 6, 4], size: [2, 12, 7], color: '#e2c088' },
  { pos: [-19, 4.5, 10.5], size: [2, 9, 5], color: '#b86a42' },
];

// Střechy — stejné odvození jako v Praze.
const ROOFS = BUILDINGS.map((b) => ({
  pos: [b.pos[0], b.pos[1] + b.size[1] / 2 + 0.4, b.pos[2]],
  size: [b.size[0] + 0.4, 0.8, b.size[2] + 0.4],
  color: '#8e3c24',
}));

// Překážky — trhové stánky (nízké široké pulty) a bedny se zeleninou.
const OBSTACLES = [
  // Stánky
  { pos: [-8, 0.6, -3], size: [3, 1.2, 1.6], color: '#7a5432' },
  { pos: [-8, 0.6, 2], size: [3, 1.2, 1.6], color: '#8a5c34' },
  { pos: [8, 0.6, -2], size: [3, 1.2, 1.6], color: '#7a5432' },
  { pos: [8, 0.6, 3], size: [3, 1.2, 1.6], color: '#8a5c34' },
  { pos: [-2, 0.6, -6], size: [1.6, 1.2, 3], color: '#8a5c34' },
  { pos: [3, 0.6, 6], size: [1.6, 1.2, 3], color: '#7a5432' },
  // Bedny se zeleninou
  { pos: [-8, 0.5, -0.5], size: [1.1, 1, 1.1], color: '#9a7440' },
  { pos: [8, 0.5, 0.5], size: [1.1, 1, 1.1], color: '#9a7440' },
  { pos: [-3.5, 0.5, 5.5], size: [1.2, 1, 1.2], color: '#9a7440' },
  { pos: [-3.5, 1.5, 5.5], size: [1.2, 1, 1.2], color: '#6a8a3a' },
  { pos: [4, 0.5, -6.5], size: [1.2, 1, 1.2], color: '#6a8a3a' },
];

// Stromy podél trhu.
const TREES = [
  { pos: [-12, 0, -6] },
  { pos: [12, 0, 6] },
  { pos: [-12, 0, 7] },
  { pos: [12, 0, -7] },
  { pos: [-5, 0, 9] },
];

// Lavičky — pozice [x, z].
const BENCHES = [
  [-3, -4],
  [3, 4],
  [-4, 4],
  [4, -4],
  [-11, 0],
  [11, 0],
];

// Spawnovací body botů [x, y, z] — po obvodu trhu.
const BOT_SPAWNS = [
  [-14, 1, -10],
  [14, 1, -10],
  [-14, 1, 10],
  [14, 1, 10],
  [0, 1, -11],
  [-16, 1, 0],
  [16, 1, 0],
  [-7, 1, 11],
  [7, 1, 11],
  [11, 1, -5],
];

// Pozice lékárniček [x, y, z].
const PICKUP_SPOTS = [
  [-13, 1, -3],
  [13, 1, 3],
  [-5, 1, -9],
  [6, 1, 9],
];

// Pouliční lampy — pozice [x, z].
const LAMPS = [
  [-6, -6],
  [6, -6],
  [-6, 6],
  [6, 6],
  [-13, 0],
  [13, 0],
];

// Povrchy — užší uličky ve tvaru L, hodně chodníků a pěšin mezi stánky,
// tramvaj na Zelňáku nejezdí. Pásy se vyhýbají stánkům, bednám, stromům,
// lavičkám i lampám a nechávají volný střed (r 3 kolem [0,0] a [0,6]).
const SURFACES = {
  // Silnice šířky 2.5 ve dvou tvarech L — severozápadní a jihovýchodní ulička.
  roads: [
    { x: -14, z: -7.25, w: 2.5, d: 11.5 },
    { x: -5.875, z: -11.75, w: 13.75, d: 2.5 },
    { x: 14, z: 7.25, w: 2.5, d: 11.5 },
    { x: 5.875, z: 11.75, w: 13.75, d: 2.5 },
  ],
  // Chodníky — podél fasád na všech stranách + vnitřní lemy obou L ulic.
  sidewalks: [
    { x: 7.75, z: -12.4, w: 13.5, d: 1.2 },
    { x: -7.75, z: 12.4, w: 13.5, d: 1.2 },
    { x: 17.4, z: 0, w: 1.2, d: 26 },
    { x: -17.4, z: 0, w: 1.2, d: 26 },
    { x: -5.875, z: -9.9, w: 13.75, d: 1.2 },
    { x: 5.875, z: 9.9, w: 13.75, d: 1.2 },
  ],
  // Koleje v Brně nejsou.
  rails: [],
  // Pěšiny — trhové uličky mezi stánky a cestička k jižnímu chodníku.
  paths: [
    { x: -7.55, z: 0.6, w: 8.9, d: 0.8 },
    { x: 7.55, z: -0.65, w: 8.9, d: 0.8 },
    { x: -7, z: 7.8, w: 0.8, d: 8 },
  ],
  // Přechody — po jednom na každém rameni obou L.
  crosswalks: [
    { x: -5, z: -11.75, w: 2, d: 2.5, axis: 'z' },
    { x: -14, z: -8, w: 2.5, d: 2, axis: 'x' },
    { x: 5, z: 11.75, w: 2, d: 2.5, axis: 'z' },
    { x: 14, z: 8, w: 2.5, d: 2, axis: 'x' },
  ],
};

// Výchozí počty dekoračních assetů — živý trh: nejvíc chodců, aut minimum.
const ASSET_DEFAULTS = { static: 12, vehicle: 2, pedestrian: 12, animal: 6 };

export default {
  id: 'brno',
  name: 'Brno — Zelný trh',
  desc: 'Teplý cihlový trh s morovým sloupem, úzkými uličkami mezi domy a stánky plnými zeleniny.',
  palette: PALETTE,
  centerpiece: 'plagueColumn',
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
