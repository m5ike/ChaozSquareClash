import { auth } from '@/api/base44Client.js';
import { gameState } from '@/game/state.js';

// Výchozí nastavení hry (obtížnost botů, god mode)
export const DEFAULT_GAME_SETTINGS = {
  godMode: false,
  botCount: 5,
  botHealth: 50,
  botDamage: 10,
  botSpeed: 4,
};

// Načtení nastavení z profilu uživatele (Base44) do gameState — best-effort.
export async function loadGameSettings() {
  try {
    const user = await auth.me();
    if (user != null && user.gameSettings && typeof user.gameSettings === 'object') {
      gameState.gameSettings = { ...DEFAULT_GAME_SETTINGS, ...user.gameSettings };
    }
  } catch {
    // anonymní hráč — zůstává výchozí nastavení
  }
}

// Uložení nastavení: hned promítne do gameState, na server best-effort.
export async function saveGameSettings(settings) {
  gameState.gameSettings = { ...gameState.gameSettings, ...settings };
  try {
    await auth.updateMe({ gameSettings: gameState.gameSettings });
  } catch {
    // uložení na server není kritické
  }
}
