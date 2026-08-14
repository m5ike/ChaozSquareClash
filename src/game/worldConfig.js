// Konfigurace živého města (počty assetů, chránění NPC) — Nastavení ji
// ukládá do localStorage, výchozí hodnoty dodává mapa (assetDefaults)
// a katalog (DEFAULT_WORLD_CONFIG).
import { DEFAULT_WORLD_CONFIG } from '@/data/assetsCatalog.js';

const KEY = 'chaos_world_cfg';

export function getWorldConfig(map) {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    stored = {};
  }
  return { ...DEFAULT_WORLD_CONFIG, ...(map?.assetDefaults || {}), ...stored };
}

export function setWorldConfig(patch) {
  try {
    const current = JSON.parse(localStorage.getItem(KEY) || '{}');
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    /* noop */
  }
}
