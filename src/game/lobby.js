// Lobby store — výběr mapy a herního módu (persistovaný) + aktivní
// multiplayerová session (jen po dobu běhu stránky).
import { getMapById, DEFAULT_MAP_ID } from '@/data/maps/index.js';
import { getModeById, DEFAULT_MODE_ID } from '@/game/modes.js';

const MAP_KEY = 'chaos_map';
const MODE_KEY = 'chaos_mode';

export function getSelectedMapId() {
  try {
    return localStorage.getItem(MAP_KEY) || DEFAULT_MAP_ID;
  } catch {
    return DEFAULT_MAP_ID;
  }
}

export function setSelectedMapId(id) {
  try {
    localStorage.setItem(MAP_KEY, id);
  } catch {
    /* noop */
  }
}

export function getSelectedModeId() {
  try {
    return localStorage.getItem(MODE_KEY) || DEFAULT_MODE_ID;
  } catch {
    return DEFAULT_MODE_ID;
  }
}

export function setSelectedModeId(id) {
  try {
    localStorage.setItem(MODE_KEY, id);
  } catch {
    /* noop */
  }
}

// Aktivní mapa/mód pro herní komponenty. Paleta prochází skinem prostředí
// (Noc/Zima/Retro), takže mapy i obloha mění ladění podle výběru v Nastavení.
import { applyEnvSkin } from '@/game/skins.js';

export function getActiveMap() {
  const map = getMapById(getSelectedMapId());
  return { ...map, palette: applyEnvSkin(map.palette) };
}

export function getActiveMode() {
  return getModeById(getSelectedModeId());
}

// Multiplayer session — nastavuje Home při připojení do místnosti,
// čte Play/GameScene. Null = single player s boty.
let activeSession = null;

export function setActiveSession(session) {
  activeSession = session;
}

export function getActiveSession() {
  return activeSession;
}
