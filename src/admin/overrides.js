// ============================================================================
// ADMINISTRAČNÍ OVERRIDES — centrální konfigurační vrstva celého projektu.
//
// Administrace (/admin) nezapisuje do zdrojových souborů: veškeré úpravy se
// ukládají jako overrides do localStorage a při startu aplikace se aplikují
// MUTACÍ živých konfiguračních objektů (weaponsConfig, assetsCatalog,
// characters, modes, rewards, gestures…). Custom mapy a custom assety se
// registrují do příslušných registrů. Export/import = celý projekt v JSON.
// ============================================================================
import { RANGED_DEFAULTS, SLASH_TYPES, SMG_WEAPON, ROCKET_WEAPON, SPECIAL_WEAPON } from '@/game/weaponsConfig.js';
import { PLAYER, BOT, TUNING } from '@/game/constants.js';
import { ASSET_TYPES, ASSET_GROUPS } from '@/data/assetsCatalog.js';
import { CHARACTERS } from '@/data/characters.js';
import { MODES } from '@/game/modes.js';
import { REWARDS, PENALTIES } from '@/game/rewards.js';
import { BODY_GESTURES, FACE_GESTURES } from '@/game/gestures.js';
import { registerCustomMaps } from '@/data/maps/index.js';

const KEY = 'chaos_admin_overrides';

// ---------------------------------------------------------------------------
export function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function saveOverrides(overrides) {
  try {
    localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch {
    /* plná kvóta — admin změny se neuloží, hra běží dál */
  }
}

// Hluboký merge patchů (pole se nahrazují celá)
function deepMerge(target, patch) {
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

// Zapíše patch do sekce overrides ('weapons' | 'tuning' | 'assets' | 'characters'
// | 'modes' | 'rewards' | 'gestures' | 'customAssets' | 'customMaps' | 'eventRules')
export function setOverride(section, patch) {
  const overrides = getOverrides();
  if (!overrides[section]) overrides[section] = {};
  deepMerge(overrides[section], patch);
  saveOverrides(overrides);
  applyAdminOverrides();
}

// Nahrazení celé sekce (pro pole — eventRules, customMaps…)
export function replaceSection(section, value) {
  const overrides = getOverrides();
  overrides[section] = value;
  saveOverrides(overrides);
  applyAdminOverrides();
}

export function resetSection(section) {
  const overrides = getOverrides();
  delete overrides[section];
  saveOverrides(overrides);
  // pozn.: mutace už aplikované na živé objekty vrátí až reload stránky
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

// --- Export / import celé konfigurace projektu -----------------------------
export function exportProject() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      overrides: getOverrides(),
    },
    null,
    2
  );
}

export function importProject(json) {
  const data = JSON.parse(json);
  if (!data || typeof data.overrides !== 'object') throw new Error('Neplatný soubor konfigurace');
  saveOverrides(data.overrides);
  applyAdminOverrides();
}

// ---------------------------------------------------------------------------
// Aplikace overrides na živé konfigurační objekty (mutace při startu i po změně)
// ---------------------------------------------------------------------------
export function applyAdminOverrides() {
  const o = getOverrides();

  // Zbraně: ranged sloty, sečné typy, speciální zbraně
  if (o.weapons) {
    if (o.weapons.ranged) deepMerge(RANGED_DEFAULTS, o.weapons.ranged);
    if (o.weapons.slash) deepMerge(SLASH_TYPES, o.weapons.slash);
    if (o.weapons.smg) deepMerge(SMG_WEAPON, o.weapons.smg);
    if (o.weapons.rocket) deepMerge(ROCKET_WEAPON, o.weapons.rocket);
    if (o.weapons.special) deepMerge(SPECIAL_WEAPON, o.weapons.special);
  }

  // Herní ladění: hráč, boti, obecné parametry
  if (o.tuning) {
    if (o.tuning.player) deepMerge(PLAYER, o.tuning.player);
    if (o.tuning.bot) deepMerge(BOT, o.tuning.bot);
    if (o.tuning.general) deepMerge(TUNING, o.tuning.general);
  }

  // Katalog assetů: úpravy typů podle id
  if (o.assets) {
    for (const [typeId, patch] of Object.entries(o.assets)) {
      if (ASSET_TYPES[typeId]) deepMerge(ASSET_TYPES[typeId], patch);
    }
  }

  // Custom assety (vytvořené v editoru modelů) — registrace do katalogu
  if (o.customAssets) {
    for (const [typeId, def] of Object.entries(o.customAssets)) {
      ASSET_TYPES[typeId] = def;
      const group = def.group || 'static';
      if (ASSET_GROUPS[group] && !ASSET_GROUPS[group].includes(typeId)) {
        ASSET_GROUPS[group].push(typeId);
      }
    }
  }

  // Postavy: staty/zbraně podle id
  if (o.characters) {
    for (const [id, patch] of Object.entries(o.characters)) {
      const character = CHARACTERS.find((c) => c.id === id);
      if (character) {
        deepMerge(character, patch);
        character.weapons = null; // loadout se přegeneruje
      }
    }
  }

  // Herní módy (cíle skóre apod.)
  if (o.modes) {
    for (const [id, patch] of Object.entries(o.modes)) {
      const mode = MODES.find((m) => m.id === id);
      if (mode) deepMerge(mode, patch);
    }
  }

  // Váhy odměn a penalizací
  if (o.rewards) {
    for (const [id, patch] of Object.entries(o.rewards.rewards || {})) {
      const reward = REWARDS.find((r) => r.id === id);
      if (reward) deepMerge(reward, patch);
    }
    for (const [id, patch] of Object.entries(o.rewards.penalties || {})) {
      const penalty = PENALTIES.find((p) => p.id === id);
      if (penalty) deepMerge(penalty, patch);
    }
  }

  // Gesta (délky trvání)
  if (o.gestures) {
    for (const [id, patch] of Object.entries(o.gestures)) {
      const gesture =
        BODY_GESTURES.find((g) => g.id === id) || FACE_GESTURES.find((g) => g.id === id);
      if (gesture) deepMerge(gesture, patch);
    }
  }

  // Custom mapy z map editoru → registr map (objeví se ve výběru v lobby)
  if (o.customMaps) {
    registerCustomMaps(Object.values(o.customMaps));
  }
}

// --- Custom mapy -----------------------------------------------------------
export function saveCustomMap(map) {
  const overrides = getOverrides();
  if (!overrides.customMaps) overrides.customMaps = {};
  overrides.customMaps[map.id] = map;
  saveOverrides(overrides);
  applyAdminOverrides();
}

export function deleteCustomMap(id) {
  const overrides = getOverrides();
  if (overrides.customMaps) delete overrides.customMaps[id];
  saveOverrides(overrides);
}

export function listCustomMaps() {
  return Object.values(getOverrides().customMaps || {});
}

// --- Custom assety (editor 3D modelů) --------------------------------------
export function saveCustomAsset(def) {
  const overrides = getOverrides();
  if (!overrides.customAssets) overrides.customAssets = {};
  overrides.customAssets[def.id] = def;
  saveOverrides(overrides);
  applyAdminOverrides();
}

export function deleteCustomAsset(id) {
  const overrides = getOverrides();
  if (overrides.customAssets) delete overrides.customAssets[id];
  saveOverrides(overrides);
}

export function listCustomAssets() {
  return Object.values(getOverrides().customAssets || {});
}
