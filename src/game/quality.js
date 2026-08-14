// Nastavení kvality grafiky: 'auto' | 'high' | 'low'.
// auto = desktop (přesná myš) vysoká, dotyková zařízení nízká.
const STORAGE_KEY = 'chaos_quality';

export function getQualitySetting() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function setQualitySetting(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // private mode apod. — nastavení prostě nepřežije reload
  }
}

// Rozhodnutí pro aktuální zařízení
export function resolveQuality() {
  const setting = getQualitySetting();
  if (setting !== 'auto') return setting;
  const finePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
  return finePointer ? 'high' : 'low';
}
