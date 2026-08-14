// Mapa „Ostrava — Dolní oblast" — industriální prostranství mezi halami
// a paneláky, šedo-rezavá paleta, kontejnery místo beden, těžní věž uprostřed.

const PALETTE = {
  sky: '#5a6a7a', // zakouřené nebe
  fog: '#3a4450', // hutná mlha
  buildingA: '#7c7c80', // panelová šedá
  buildingB: '#8c847a', // betonová
  buildingC: '#62666e', // tmavě šedá
  buildingD: '#9a5a36', // rezavá hala
  buildingE: '#55555c', // antracit
  buildingF: '#a86c48', // rez a cihla
  monument: '#3e4246', // ocel těžní věže
  wall: '#5a5a54', // beton
  crate: '#3a6a9a', // kontejnerová modř (rez varianta '#8a4a2a')
  tree: '#3a6a34',
  trunk: '#3a281a',
  roof: '#474e56', // plech
};

// Obvodové budovy — dlouhé haly a paneláky, vyšší a hranatější, uzavřený rám.
const BUILDINGS = [
  // Severní řada (z = -14)
  { pos: [-14, 7, -14], size: [10, 14, 2], color: '#7c7c80' },
  { pos: [-4, 8, -14], size: [9, 16, 2], color: '#9a5a36' },
  { pos: [6, 6, -14], size: [10, 12, 2], color: '#62666e' },
  { pos: [15.5, 7.5, -14], size: [7, 15, 2], color: '#8c847a' },
  // Jižní řada (z = 14)
  { pos: [-14.5, 8, 14], size: [9, 16, 2], color: '#a86c48' },
  { pos: [-4.5, 6, 14], size: [10, 12, 2], color: '#55555c' },
  { pos: [5.5, 7, 14], size: [9, 14, 2], color: '#7c7c80' },
  { pos: [15, 8, 14], size: [8, 16, 2], color: '#62666e' },
  // Východní strana (x = 19)
  { pos: [19, 6, -7], size: [2, 12, 12], color: '#8c847a' },
  { pos: [19, 7, 6], size: [2, 14, 12], color: '#9a5a36' },
  // Západní strana (x = -19)
  { pos: [-19, 7, -7], size: [2, 14, 12], color: '#55555c' },
  { pos: [-19, 6, 6], size: [2, 12, 12], color: '#a86c48' },
];

// Střechy — stejné odvození jako v Praze, plechově šedé.
const ROOFS = BUILDINGS.map((b) => ({
  pos: [b.pos[0], b.pos[1] + b.size[1] / 2 + 0.4, b.pos[2]],
  size: [b.size[0] + 0.4, 0.8, b.size[2] + 0.4],
  color: '#474e56',
}));

// Překážky — přepravní kontejnery (delší boxy) a dřevěné palety.
const OBSTACLES = [
  // Kontejnery
  { pos: [-6, 0.8, -3], size: [4, 1.6, 1.6], color: '#3a6a9a' },
  { pos: [-6, 2.4, -3], size: [4, 1.6, 1.6], color: '#8a4a2a' }, // stohovaný
  { pos: [6, 0.8, 3], size: [4, 1.6, 1.6], color: '#8a4a2a' },
  { pos: [0, 0.8, -6], size: [1.6, 1.6, 4], color: '#3a6a9a' },
  { pos: [-8, 0.8, 5], size: [1.6, 1.6, 4], color: '#8a4a2a' },
  { pos: [8, 0.8, -5], size: [1.6, 1.6, 4], color: '#3a6a9a' },
  // Palety
  { pos: [3, 0.15, 6], size: [1.6, 0.3, 1.6], color: '#7a5a36' },
  { pos: [-3, 0.15, 7], size: [1.6, 0.3, 1.6], color: '#7a5a36' },
  { pos: [10, 0.15, 8], size: [1.6, 0.3, 1.6], color: '#7a5a36' },
  { pos: [-10, 0.15, -8], size: [1.6, 0.3, 1.6], color: '#7a5a36' },
];

// Zeleně tu moc není.
const TREES = [
  { pos: [-12, 0, -8] },
  { pos: [12, 0, 8] },
];

// Lavičky — pozice [x, z].
const BENCHES = [
  [-5, 3],
  [5, -3],
];

// Spawnovací body botů [x, y, z] — po obvodu areálu.
const BOT_SPAWNS = [
  [-14, 1, -10],
  [14, 1, -10],
  [-14, 1, 10],
  [14, 1, 10],
  [0, 1, -11],
  [-16, 1, 0],
  [16, 1, 0],
  [-6, 1, 11],
  [6, 1, 11],
  [10, 1, -2],
];

// Pozice lékárniček [x, y, z].
const PICKUP_SPOTS = [
  [-13, 1, -4],
  [13, 1, 4],
  [-5, 1, 9],
  [5, 1, -9],
];

// Pouliční lampy — pozice [x, z].
const LAMPS = [
  [-9, -9],
  [9, -9],
  [-9, 9],
  [9, 9],
  [-13, 0],
  [13, 0],
];

// Povrchy — jedna široká průjezdná silnice, průmyslová vlečka přes celou šířku
// a betonové/škvárové pěšiny mezi kontejnery. Silnice je na z≈11 a vlečka na
// z≈-10 (posun od ±8 kvůli paletám [±10,±8], stromům na z=±8 a kontejneru
// [0,-6] sahajícímu až k z=-8); pásy nekolidují s žádnou překážkou.
const SURFACES = {
  // Široká přímá silnice přes celou šířku areálu (mezi fasádami x=±18).
  roads: [{ x: 0, z: 10.9, w: 36, d: 3.6 }],
  // Betonové chodníky podél severních hal a bočních stěn.
  sidewalks: [
    { x: 0, z: -12.5, w: 36, d: 1 },
    { x: -17.5, z: 0.15, w: 1, d: 17.9 },
    { x: 17.5, z: 0.15, w: 1, d: 17.9 },
  ],
  // Kolejová vlečka přes celou šířku (těžší rozchod 1.8).
  rails: [{ x: 0, z: -10.2, w: 36, d: 1.8 }],
  // Industriální pěšiny — dvě podélné spojky silnice↔vlečka a krátká odbočka.
  paths: [
    { x: -10.9, z: 1.15, w: 1.4, d: 15.9 },
    { x: 10.9, z: -1.15, w: 1.4, d: 15.9 },
    { x: 4.5, z: -6.9, w: 1.2, d: 4.8 },
  ],
  // Přechody přes silnici — u středu a u ústí západní pěšiny.
  crosswalks: [
    { x: 0, z: 10.9, w: 2.6, d: 3.6, axis: 'z' },
    { x: -10.9, z: 10.9, w: 2.2, d: 3.6, axis: 'z' },
  ],
};

// Výchozí počty dekoračních assetů — průmysl: nejvíc vozidel, chodců málo.
const ASSET_DEFAULTS = { static: 8, vehicle: 7, pedestrian: 4, animal: 2 };

export default {
  id: 'ostrava',
  name: 'Ostrava — Dolní oblast',
  desc: 'Zamlžený industriální plac mezi halami a paneláky, kde kryjí stohované kontejnery a palety.',
  palette: PALETTE,
  centerpiece: 'miningTower',
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
