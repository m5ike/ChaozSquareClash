// Registr herních módů. Runtime stav módu drží gameState.mode (resetuje se
// při startu hry), logiku vyhodnocují komponenty v GameScene + Bots/Projectiles.
export const MODES = [
  {
    id: 'dm',
    name: 'Deathmatch',
    icon: '⚔️',
    desc: 'Každý sám za sebe. První na 40 bodů vyhrává.',
  },
  {
    id: 'tdm',
    name: 'Týmový DM',
    icon: '🎽',
    desc: 'Modří (ty a parťáci) proti červeným. Tým první na 30 bodů.',
    teamTarget: 30,
  },
  {
    id: 'ctf',
    name: 'Ukořistit vlajku',
    icon: '🚩',
    desc: 'Seber červenou vlajku a dones ji k modré základně. 3 zanesení vítězí.',
    captures: 3,
  },
  {
    id: 'koth',
    name: 'Král náměstí',
    icon: '👑',
    desc: 'Drž zónu uprostřed náměstí celkem 45 sekund. Soupeři ji vybíjejí.',
    holdSeconds: 45,
  },
];

export const DEFAULT_MODE_ID = 'dm';

export function getModeById(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}

// Výchozí runtime stav módu (ukládá se do gameState.mode)
export function createModeState(modeId) {
  return {
    id: modeId,
    teamScores: { blue: 0, red: 0 },
    captures: { blue: 0, red: 0 },
    // CTF: kdo nese vlajku ('player' | index bota | null)
    redFlagCarrier: null,
    blueFlagCarrier: null,
    // KOTH: naakumulované držení hráče (sekundy) a stav zóny
    holdProgress: 0,
    zoneContested: false,
    zoneOccupant: null, // 'player' | 'enemy' | null
    finished: false,
  };
}
