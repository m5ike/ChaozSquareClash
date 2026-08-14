// Skiny: zbraně (materiál FP zbraně), tělo (oblečení vlastní postavy)
// a prostředí (barevné ladění mapy). Výběr je v Nastavení, persistovaný
// v localStorage. Boti si nechávají výchozí vzhled podle kategorie.

export const WEAPON_SKINS = [
  { id: 'klasik', name: 'Klasik', props: null },
  { id: 'zlata', name: 'Zlatá', props: { color: '#e8c34a', metalness: 0.9, roughness: 0.25 } },
  { id: 'chrom', name: 'Chrom', props: { color: '#d8e0e8', metalness: 1, roughness: 0.12 } },
  {
    id: 'neon',
    name: 'Neon',
    props: { color: '#16323a', emissive: '#22ffcc', emissiveIntensity: 0.9, roughness: 0.4 },
  },
  { id: 'drevo', name: 'Dřevo', props: { color: '#8a5a2a', roughness: 0.95, metalness: 0 } },
];

export const BODY_SKINS = [
  { id: 'klasik', name: 'Klasik', outfit: null },
  {
    id: 'oblek',
    name: 'Černý oblek',
    outfit: { torso: '#23232b', sleeve: '#23232b', pants: '#17171d', accent: '#b02030', tie: true },
  },
  {
    id: 'teplaky',
    name: 'Retro tepláky',
    outfit: { torso: '#e04040', sleeve: '#ffffff', pants: '#3050c0', accent: '#ffffff' },
  },
  {
    id: 'zlaty',
    name: 'Zlatý ročník',
    outfit: { torso: '#e8c34a', sleeve: '#e8c34a', pants: '#8a6a1a', accent: '#ffffff' },
  },
];

export const ENV_SKINS = [
  { id: 'klasik', name: 'Klasik' },
  { id: 'noc', name: 'Noc' },
  { id: 'zima', name: 'Zima' },
  { id: 'retro', name: 'Retro sépie' },
];

const KEYS = { weapon: 'chaos_skin_weapon', body: 'chaos_skin_body', env: 'chaos_skin_env' };

function getSkinId(kind) {
  try {
    return localStorage.getItem(KEYS[kind]) || 'klasik';
  } catch {
    return 'klasik';
  }
}

function setSkinId(kind, id) {
  try {
    localStorage.setItem(KEYS[kind], id);
  } catch {
    /* noop */
  }
}

export const getWeaponSkinId = () => getSkinId('weapon');
export const getBodySkinId = () => getSkinId('body');
export const getEnvSkinId = () => getSkinId('env');
export const setWeaponSkinId = (id) => setSkinId('weapon', id);
export const setBodySkinId = (id) => setSkinId('body', id);
export const setEnvSkinId = (id) => setSkinId('env', id);

export function getWeaponSkinProps() {
  return WEAPON_SKINS.find((s) => s.id === getWeaponSkinId())?.props || null;
}

export function getBodySkinOutfit() {
  return BODY_SKINS.find((s) => s.id === getBodySkinId())?.outfit || null;
}

// --- Barevné transformace prostředí ----------------------------------------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// škálování jasu + přimíchání barvy (mix 0–1)
function tint(hex, scale = 1, mixColor = null, mix = 0) {
  let rgb = hexToRgb(hex).map((v) => v * scale);
  if (mixColor && mix > 0) {
    const m = hexToRgb(mixColor);
    rgb = rgb.map((v, i) => v * (1 - mix) + m[i] * mix);
  }
  return rgbToHex(rgb);
}

// Aplikace skinu prostředí na paletu mapy — vrací NOVOU paletu.
export function applyEnvSkin(palette) {
  const skin = getEnvSkinId();
  if (skin === 'noc') {
    const out = {};
    for (const [key, value] of Object.entries(palette)) out[key] = tint(value, 0.45, '#203050', 0.25);
    out.sky = '#101a30';
    out.fog = '#0c1424';
    return out;
  }
  if (skin === 'zima') {
    const out = {};
    for (const [key, value] of Object.entries(palette)) out[key] = tint(value, 1.05, '#e8f0fa', 0.35);
    out.sky = '#b8ccdf';
    out.fog = '#9fb4c8';
    out.tree = '#eef4fa'; // zasněžené koruny
    return out;
  }
  if (skin === 'retro') {
    const out = {};
    for (const [key, value] of Object.entries(palette)) {
      const [r, g, b] = hexToRgb(value);
      const gray = 0.3 * r + 0.59 * g + 0.11 * b;
      out[key] = rgbToHex([gray * 1.1, gray * 0.95, gray * 0.72]);
    }
    return out;
  }
  return palette;
}
