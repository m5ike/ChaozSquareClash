import { auth } from '@/api/base44Client.js';

// Definice akcí klávesových zkratek — label/desc se zobrazují v Nastavení.
export const KEY_BINDING_DEFS = [
  {
    name: 'forward',
    label: 'Vpřed',
    desc: 'Pohyb dopředu',
    default: ['KeyW', 'ArrowUp'],
  },
  {
    name: 'backward',
    label: 'Vzad',
    desc: 'Pohyb dozadu',
    default: ['KeyS', 'ArrowDown'],
  },
  {
    name: 'left',
    label: 'Doleva',
    desc: 'Pohyb doleva',
    default: ['KeyA', 'ArrowLeft'],
  },
  {
    name: 'right',
    label: 'Doprava',
    desc: 'Pohyb doprava',
    default: ['KeyD', 'ArrowRight'],
  },
  {
    name: 'jump',
    label: 'Skok',
    desc: 'Výskok',
    default: ['Space'],
  },
  {
    name: 'sprint',
    label: 'Sprint',
    desc: 'Běh / zrychlení',
    default: ['ShiftLeft'],
  },
  {
    name: 'fire',
    label: 'Střelba',
    desc: 'Výstřel / útok',
    default: ['KeyF'],
  },
  {
    name: 'weapon1',
    label: 'Zbraň 1',
    desc: 'Bližák (melee)',
    default: ['Digit1'],
  },
  {
    name: 'weapon2',
    label: 'Zbraň 2',
    desc: 'Brokovnice',
    default: ['Digit2'],
  },
  {
    name: 'weapon3',
    label: 'Zbraň 3',
    desc: 'Dálka (projectile)',
    default: ['Digit3'],
  },
  {
    name: 'weapon4',
    label: 'Zbraň 4',
    desc: 'Samopal',
    default: ['Digit4'],
  },
  {
    name: 'weapon5',
    label: 'Zbraň 5',
    desc: 'Raketomet',
    default: ['Digit5'],
  },
  {
    name: 'weapon6',
    label: 'Zbraň 6',
    desc: 'Zlatý kanón (po sebrání)',
    default: ['Digit6'],
  },
  {
    name: 'reload',
    label: 'Přebít',
    desc: 'Výměna zásobníku',
    default: ['KeyR'],
  },
  {
    name: 'crouch',
    label: 'Dřep',
    desc: 'Přikrčení (pomalejší, nižší)',
    default: ['KeyC'],
  },
  {
    name: 'crawl',
    label: 'Plazení',
    desc: 'Plížení po zemi',
    default: ['KeyX'],
  },
  {
    name: 'gesture',
    label: 'Gesto',
    desc: 'Tělesné gesto (cyklí: mávnutí, fuck off, palec…)',
    default: ['KeyG'],
  },
  {
    name: 'gestureFace',
    label: 'Mimika',
    desc: 'Obličejové gesto (mrknutí, smích, řev…)',
    default: ['KeyV'],
  },
  {
    name: 'scoreboard',
    label: 'Scoreboard',
    desc: 'Tabulka výsledků',
    default: ['Tab'],
  },
];

// Aktuální mapa bindingů (lazy — naplní se při prvním čtení)
let currentBindings = null;

export function defaultBindings() {
  const bindings = {};
  for (const def of KEY_BINDING_DEFS) bindings[def.name] = [...def.default];
  return bindings;
}

export function getBindings() {
  if (!currentBindings) currentBindings = defaultBindings();
  return currentBindings;
}

export function setBindings(bindings) {
  currentBindings = { ...bindings };
}

// Mapa pro <KeyboardControls> z drei (jen pohybové akce + střelba)
export function buildKeyboardMap() {
  const bindings = getBindings();
  return [
    { name: 'forward', keys: bindings.forward || [] },
    { name: 'backward', keys: bindings.backward || [] },
    { name: 'left', keys: bindings.left || [] },
    { name: 'right', keys: bindings.right || [] },
    { name: 'jump', keys: bindings.jump || [] },
    { name: 'sprint', keys: bindings.sprint || [] },
    { name: 'fire', keys: bindings.fire || [] },
    { name: 'crouch', keys: bindings.crouch || [] },
    { name: 'crawl', keys: bindings.crawl || [] },
  ];
}

// Lidsky čitelný popisek klávesy z KeyboardEvent.code
export function formatKeyLabel(code) {
  if (!code) return '—';
  const special = {
    Space: 'Mezerník',
    ShiftLeft: 'L-Shift',
    ShiftRight: 'P-Shift',
    ControlLeft: 'L-Ctrl',
    ControlRight: 'P-Ctrl',
    Tab: 'Tab',
    Enter: 'Enter',
    Backspace: '⌫',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  if (special[code]) return special[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

// Načtení uložených bindingů z profilu uživatele (Base44) — best-effort.
export async function loadKeybindings() {
  try {
    const user = await auth.me();
    if (user != null && user.keybindings && typeof user.keybindings === 'object') {
      currentBindings = { ...defaultBindings(), ...user.keybindings };
    }
  } catch {
    // anonymní hráč — zůstávají výchozí
  }
}

// Uložení bindingů do profilu uživatele — best-effort.
export async function saveKeybindings(bindings) {
  setBindings(bindings);
  try {
    await auth.updateMe({ keybindings: bindings });
  } catch {
    // uložení na server není kritické
  }
}

export const KEYBOARD_MAP = buildKeyboardMap();
