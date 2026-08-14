// Katalog herních assetů — statické objekty, vozidla, chodci a zvířata.
// Každý typ popisuje chování (pohyb, cesta, rychlost), odolnost (HP),
// přibližný bounding box a varianty vzhledu pro <AssetModel />.
//
// group:     'static' | 'vehicle' | 'pedestrian' | 'animal'
// surface:   'silnice' | 'chodnik' | 'koleje' | 'stezka' | 'kdekoli' — po čem se pohybuje / kde stojí
// moveType:  'static' | 'jizda' | 'rychla_jizda' | 'chuze' | 'beh' | 'tanec' | 'opilecka_chuze' | 'drepy' | 'kliky'
// pathType:  'nahodna' | 'osa' | 'vice_os' | 'kopiruj_hrace' | 'ai' (u statiky jen způsob rozmístění)
// speed:     jednotky za sekundu, health: HP, size: přibližný bounding box {w,h,d} v metrech
// protected: za zabití je penalizace (jen dite, pes, zdravotnik) — reward pak nepadá
// reward:    za zničení/zabití padá odměna (všechno kromě chráněných)

// Karoserie a barvy aut — varianty vznikají kartézským součinem (5 × 5 = 25)
const CAR_BODY_TYPES = [
  { typ: 'sedan', nazev: 'Sedan' },
  { typ: 'hatchback', nazev: 'Hatchback' },
  { typ: 'kombi', nazev: 'Kombi' },
  { typ: 'dodavka', nazev: 'Dodávka' },
  { typ: 'veteran', nazev: 'Veterán' },
];
const CAR_COLORS = [
  { nazev: 'červená', barva: '#b3342e' },
  { nazev: 'modrá', barva: '#2e5fb3' },
  { nazev: 'bílá', barva: '#dcdcd4' },
  { nazev: 'černá', barva: '#26292e' },
  { nazev: 'žlutá', barva: '#d6a63a' },
];
const carVariants = CAR_BODY_TYPES.flatMap((b) =>
  CAR_COLORS.map((c) => ({ name: `${b.nazev} — ${c.nazev}`, typ: b.typ, barva: c.barva }))
);

export const ASSET_TYPES = {
  /* ---------- Statika ---------- */
  strom: {
    name: 'Strom', group: 'static', surface: 'kdekoli',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 40,
    size: { w: 1.6, h: 3.1, d: 1.6 }, protected: false, reward: true,
    variants: [
      { name: 'listnatý', tvar: 'listnaty', listy: '#3e7c33', kmen: '#6b4a2b' },
      { name: 'jehličnatý', tvar: 'jehlicnaty', listy: '#2c5d33', kmen: '#5a3d24' },
      { name: 'kulatý', tvar: 'kulaty', listy: '#5c8f3a', kmen: '#71512f' },
    ],
  },
  ker: {
    name: 'Keř', group: 'static', surface: 'kdekoli',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 10,
    size: { w: 1.1, h: 0.75, d: 1.1 }, protected: false, reward: true,
    variants: [
      { name: 'zelený', barva: '#3e7c33' },
      { name: 'tmavý', barva: '#2c5d33' },
      { name: 'světlý', barva: '#5c8f3a' },
    ],
  },
  kvetina: {
    name: 'Květina', group: 'static', surface: 'kdekoli',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 1,
    size: { w: 0.25, h: 0.55, d: 0.25 }, protected: false, reward: true,
    variants: [
      { name: 'červená', barva: '#d94a43' },
      { name: 'žlutá', barva: '#e0c23c' },
      { name: 'fialová', barva: '#9a5bbf' },
      { name: 'bílá', barva: '#eeeeea' },
    ],
  },
  kvetinac: {
    name: 'Květináč', group: 'static', surface: 'chodnik',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 12,
    size: { w: 1.25, h: 0.6, d: 0.45 }, protected: false, reward: true,
    variants: [
      { name: 'červeno-žlutý', kvety: ['#d94a43', '#e0c23c', '#d94a43'] },
      { name: 'fialovo-bílý', kvety: ['#9a5bbf', '#eeeeea', '#9a5bbf'] },
      { name: 'pestrý', kvety: ['#e0c23c', '#d94a43', '#9a5bbf'] },
    ],
  },
  budka: {
    name: 'Budka', group: 'static', surface: 'chodnik',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 45,
    size: { w: 1.15, h: 2.45, d: 1.15 }, protected: false, reward: true,
    variants: [
      { name: 'telefonní', typ: 'telefonni', barva: '#e07818' },
      { name: 'novinová', typ: 'novinova', barva: '#5a6d7d' },
    ],
  },
  stanek: {
    name: 'Stánek', group: 'static', surface: 'chodnik',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 60,
    size: { w: 2.6, h: 2.5, d: 2.0 }, protected: false, reward: true,
    variants: [
      { name: 'červený', plachta: '#b3342e' },
      { name: 'modrý', plachta: '#2e5fb3' },
      { name: 'zelený', plachta: '#3e7a3e' },
    ],
  },
  billboard: {
    name: 'Billboard', group: 'static', surface: 'kdekoli',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 70,
    size: { w: 3.9, h: 3.7, d: 0.6 }, protected: false, reward: true,
    variants: [
      { name: 'reklama A', pruhy: ['#d94a43', '#e0c23c', '#2e5fb3'] },
      { name: 'reklama B', pruhy: ['#3e7a3e', '#eeeeea', '#9a5bbf'] },
      { name: 'reklama C', pruhy: ['#e07818', '#26292e', '#d6a63a'] },
    ],
  },
  kos: {
    name: 'Odpadkový koš', group: 'static', surface: 'chodnik',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 8,
    size: { w: 0.4, h: 0.9, d: 0.4 }, protected: false, reward: true,
    variants: [
      { name: 'zelený', barva: '#3e6b3e' },
      { name: 'šedý', barva: '#5a5f66' },
    ],
  },
  popelnice: {
    name: 'Popelnice', group: 'static', surface: 'chodnik',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 25,
    size: { w: 0.85, h: 1.15, d: 0.7 }, protected: false, reward: true,
    variants: [
      { name: 'směsný odpad', barva: '#33363c', viko: '#26292e' },
      { name: 'plast', barva: '#d6a63a', viko: '#b8892e' },
      { name: 'papír', barva: '#2e5fb3', viko: '#26508f' },
      { name: 'sklo', barva: '#3e7a3e', viko: '#336633' },
    ],
  },
  schranka: {
    name: 'Poštovní schránka', group: 'static', surface: 'chodnik',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 20,
    size: { w: 0.55, h: 1.25, d: 0.4 }, protected: false, reward: true,
    variants: [{ name: 'oranžová', barva: '#e07818' }],
  },
  zaparkovane_auto: {
    name: 'Zaparkované auto', group: 'static', surface: 'silnice',
    moveType: 'static', pathType: 'nahodna', speed: 0, health: 70,
    size: { w: 1.8, h: 1.6, d: 4.4 }, protected: false, reward: true,
    variants: carVariants,
  },

  /* ---------- Vozidla ---------- */
  auto: {
    name: 'Auto', group: 'vehicle', surface: 'silnice',
    moveType: 'jizda', pathType: 'osa', speed: 7, health: 70,
    size: { w: 1.8, h: 1.6, d: 4.4 }, protected: false, reward: true,
    variants: carVariants,
  },
  autobus: {
    name: 'Autobus', group: 'vehicle', surface: 'silnice',
    moveType: 'jizda', pathType: 'osa', speed: 5, health: 140,
    size: { w: 2.3, h: 2.8, d: 9 }, protected: false, reward: true,
    variants: [
      { name: 'červený', barva: '#b3342e' },
      { name: 'modrý', barva: '#2e5fb3' },
      { name: 'zelený', barva: '#3e7a3e' },
    ],
  },
  tramvaj: {
    name: 'Tramvaj', group: 'vehicle', surface: 'koleje',
    moveType: 'jizda', pathType: 'osa', speed: 6, health: 170,
    size: { w: 2.1, h: 3.3, d: 10.5 }, protected: false, reward: true,
    variants: [
      { name: 'červeno-krémová', barva: '#b3342e', krem: '#efe6c8' },
      { name: 'zeleno-krémová', barva: '#3e7a3e', krem: '#efe6c8' },
    ],
  },

  /* ---------- Zvířata ---------- */
  pes: {
    name: 'Pes', group: 'animal', surface: 'kdekoli',
    moveType: 'chuze', pathType: 'nahodna', speed: 2, health: 20,
    size: { w: 0.35, h: 0.65, d: 0.95 }, protected: true, reward: false,
    variants: [
      { name: 'hnědý', srst: '#8a5a2e', srstB: '#6e4522' },
      { name: 'černý', srst: '#2c2c30', srstB: '#1e1e22' },
      { name: 'bílý', srst: '#e6e2d8', srstB: '#c9c4b8' },
      { name: 'flekatý', srst: '#d9c9a8', srstB: '#6e4522' },
    ],
  },
  kocka: {
    name: 'Kočka', group: 'animal', surface: 'kdekoli',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.7, health: 12,
    size: { w: 0.25, h: 0.5, d: 0.75 }, protected: false, reward: true,
    variants: [
      { name: 'černá', srst: '#26262b', srstB: '#3a3a40' },
      { name: 'bílá', srst: '#eae6dc', srstB: '#cfcabc' },
      { name: 'zrzavá', srst: '#c9762e', srstB: '#a85e22' },
      { name: 'šedá', srst: '#7d818a', srstB: '#63666e' },
    ],
  },
  lev: {
    name: 'Lev', group: 'animal', surface: 'kdekoli',
    moveType: 'beh', pathType: 'ai', speed: 5, health: 90,
    size: { w: 0.7, h: 1.3, d: 1.9 }, protected: false, reward: true,
    variants: [{ name: 'lev', srst: '#c98f3d', srstB: '#a8742e', hriva: '#7a4a1e' }],
  },
  kun: {
    name: 'Kůň', group: 'animal', surface: 'stezka',
    moveType: 'chuze', pathType: 'osa', speed: 2.6, health: 70,
    size: { w: 0.5, h: 1.9, d: 1.9 }, protected: false, reward: true,
    variants: [
      { name: 'hnědák', srst: '#7a4a28', srstB: '#5c3820', hriva: '#3a2a18' },
      { name: 'vraník', srst: '#26262b', srstB: '#1c1c20', hriva: '#111114' },
      { name: 'bělouš', srst: '#dcd8cc', srstB: '#bcb8ac', hriva: '#8a867c' },
    ],
  },

  /* ---------- Chodci ---------- */
  dite: {
    name: 'Dítě', group: 'pedestrian', surface: 'chodnik',
    moveType: 'beh', pathType: 'nahodna', speed: 2.6, health: 15,
    size: { w: 0.5, h: 1.2, d: 0.3 }, protected: true, reward: false,
    variants: [
      { name: 'červené tričko', triko: '#c05050' },
      { name: 'modré tričko', triko: '#4a6fb3' },
      { name: 'žluté tričko', triko: '#d9b03a' },
      { name: 'zelené tričko', triko: '#4f9450' },
    ],
  },
  pan: {
    name: 'Pán', group: 'pedestrian', surface: 'chodnik',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.3, health: 30,
    size: { w: 0.6, h: 1.5, d: 0.35 }, protected: false, reward: true,
    variants: [
      { name: 'šedý oblek', oblek: '#3a3f4a' },
      { name: 'modrý oblek', oblek: '#2c3a5c' },
      { name: 'hnědý oblek', oblek: '#5c4632' },
    ],
  },
  pani: {
    name: 'Paní', group: 'pedestrian', surface: 'chodnik',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.25, health: 30,
    size: { w: 0.6, h: 1.5, d: 0.35 }, protected: false, reward: true,
    variants: [
      { name: 'vínové šaty', saty: '#a24a68' },
      { name: 'fialové šaty', saty: '#7d4a9e' },
      { name: 'tyrkysové šaty', saty: '#2e8f8a' },
    ],
  },
  hasic: {
    name: 'Hasič', group: 'pedestrian', surface: 'chodnik',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.4, health: 45,
    size: { w: 0.6, h: 1.55, d: 0.35 }, protected: false, reward: true,
    variants: [{ name: 'uniforma' }],
  },
  policajt: {
    name: 'Policajt', group: 'pedestrian', surface: 'chodnik',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.4, health: 45,
    size: { w: 0.6, h: 1.55, d: 0.35 }, protected: false, reward: true,
    variants: [{ name: 'uniforma' }],
  },
  mestsky_policajt: {
    name: 'Městský policajt', group: 'pedestrian', surface: 'chodnik',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.3, health: 40,
    size: { w: 0.6, h: 1.55, d: 0.35 }, protected: false, reward: true,
    variants: [{ name: 'uniforma' }],
  },
  zdravotnik: {
    name: 'Zdravotník', group: 'pedestrian', surface: 'chodnik',
    moveType: 'chuze', pathType: 'nahodna', speed: 1.4, health: 40,
    size: { w: 0.6, h: 1.5, d: 0.35 }, protected: true, reward: false,
    variants: [{ name: 'uniforma' }],
  },
};

// Id typů podle skupin — odvozeno z katalogu, ať nic nevypadne
export const ASSET_GROUPS = Object.entries(ASSET_TYPES).reduce(
  (acc, [id, def]) => {
    acc[def.group].push(id);
    return acc;
  },
  { static: [], vehicle: [], pedestrian: [], animal: [] }
);

// Výchozí počty objektů ve světě + přepínač chráněných cílů
export const DEFAULT_WORLD_CONFIG = {
  static: 14,
  vehicle: 5,
  pedestrian: 7,
  animal: 4,
  protectedEnabled: true,
};
