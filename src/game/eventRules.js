// Konfigurovatelná onEvent pravidla — administrace umožňuje navázat na herní
// události vlastní akce (gesto, odměna, penalizace, zvuk, zpráva do killfeedu).
// Pravidla jsou data: {id, event, action, params, enabled} a ukládají se
// v admin overrides (sekce 'eventRules').
import { bus } from '@/game/events.js';
import { getOverrides } from '@/admin/overrides.js';
import { grantRandomReward, applyRandomPenalty, grantKillBonus } from '@/game/rewards.js';
import { randomGesture } from '@/game/gestures.js';
import { playSfx } from '@/game/audio.js';

// Události dostupné v administraci (název → popis)
export const AVAILABLE_EVENTS = [
  ['enemy-killed', 'Hráč zabil bota'],
  ['player-died', 'Hráč zemřel'],
  ['player-respawned', 'Hráč se respawnul'],
  ['hit-enemy', 'Zásah nepřítele'],
  ['asset-destroyed', 'Zničený asset města'],
  ['weapon-switched', 'Výměna zbraně'],
  ['reload-started', 'Začátek přebíjení'],
  ['power-activated', 'Aktivace schopnosti'],
  ['game-over', 'Konec zápasu'],
  ['explosion', 'Exploze rakety'],
  ['pickup-collected', 'Sebraná lékárnička'],
];

// Akce dostupné v administraci
export const AVAILABLE_ACTIONS = [
  ['message', 'Zpráva do killfeedu (params.text)'],
  ['gesture', 'Přehraj gesto hráče (params.gestureId nebo náhodné)'],
  ['reward', 'Dej náhodnou odměnu'],
  ['penalty', 'Aplikuj náhodnou penalizaci'],
  ['killBonus', 'Kill bonus (munice + HP + armor)'],
  ['sfx', 'Přehraj zvuk (params.sound — název SFX)'],
];

export function getEventRules() {
  const stored = getOverrides().eventRules;
  return Array.isArray(stored) ? stored : [];
}

function runAction(rule) {
  const params = rule.params || {};
  switch (rule.action) {
    case 'message':
      bus.emit('mode-event', { text: params.text || '⚡ Událost' });
      break;
    case 'gesture':
      bus.emit('player-gesture', { id: params.gestureId || randomGesture().id });
      break;
    case 'reward':
      grantRandomReward();
      break;
    case 'penalty':
      applyRandomPenalty();
      break;
    case 'killBonus':
      grantKillBonus();
      break;
    case 'sfx':
      try {
        playSfx(params.sound || 'uiClick');
      } catch {
        /* neznámý zvuk */
      }
      break;
    default:
      break;
  }
}

let activeListeners = [];

// (Re)inicializace — volá se při startu hry a po změně pravidel v administraci
export function initEventRules() {
  for (const [event, fn] of activeListeners) bus.off(event, fn);
  activeListeners = [];
  for (const rule of getEventRules()) {
    if (!rule?.enabled || !rule.event || !rule.action) continue;
    const fn = () => runAction(rule);
    bus.on(rule.event, fn);
    activeListeners.push([rule.event, fn]);
  }
}
