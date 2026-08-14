// Registr map hry „Náměstí Chaosu".
import praha from './praha.js';
import brno from './brno.js';
import ostrava from './ostrava.js';

export const MAPS = [praha, brno, ostrava];

export const DEFAULT_MAP_ID = 'praha';

// Vrátí mapu podle id, při neznámém id spadne zpět na Prahu.
export function getMapById(id) {
  return MAPS.find((m) => m.id === id) ?? praha;
}
