// ============================================================================
// TABULKA PORANĚNÍ A PŘESNOSTI ZÁSAHŮ
//
// | Zóna     | Poškození (podíl zbraně) | Chrání    | Poznámka          |
// |----------|--------------------------|-----------|-------------------|
// | Obličej  | 100 %                    | helma     | HEADSHOT indikace |
// | Hlava    | 80–99 %                  | helma     |                   |
// | Srdce    | 80–90 %                  | brnění    | kritický zásah    |
// | Ramena   | 5–30 %                   | brnění    |                   |
// | Ruce     | 5–30 %                   | —         |                   |
// | Nohy     | 5–30 %                   | —         |                   |
// | Tělo     | 5–30 %                   | brnění    |                   |
//
// Do zásahu se počítá, zda má cíl brnění (chrání trup) nebo helmu (chrání
// hlavu a obličej). Helma se odvozuje z názvu předmětu postavy — přilby,
// masky, čepice a klobouky chrání hlavu; ostatní předměty jsou tělesné brnění.
// Průraznost zbraně (armorPen 0–1) část ochrany ignoruje.
// ============================================================================

export const HIT_ZONES = {
  oblicej: { name: 'obličej', min: 1.0, max: 1.0, protectedBy: 'helmet', headshot: true },
  hlava: { name: 'hlava', min: 0.8, max: 0.99, protectedBy: 'helmet', headshot: false },
  srdce: { name: 'srdce', min: 0.8, max: 0.9, protectedBy: 'armor', headshot: false, crit: true },
  ramena: { name: 'ramena', min: 0.05, max: 0.3, protectedBy: 'armor', headshot: false },
  ruce: { name: 'ruce', min: 0.05, max: 0.3, protectedBy: null, headshot: false },
  nohy: { name: 'nohy', min: 0.05, max: 0.3, protectedBy: null, headshot: false },
  telo: { name: 'tělo', min: 0.05, max: 0.3, protectedBy: 'armor', headshot: false },
};

// Klíčová slova předmětů, které fungují jako helma (chrání hlavu/obličej)
const HELMET_KEYWORDS = ['přilba', 'maska', 'čepice', 'klobouk', 'helma', 'kukla'];

// Odvození ochrany postavy z jejího předmětu:
//   armorProtect  0–1 — ochrana trupu (brnění)
//   helmetProtect 0–1 — ochrana hlavy/obličeje (helma)
export function getProtection(character) {
  const item = character?.armor;
  if (!item) return { armorProtect: 0, helmetProtect: 0 };
  const protect = Math.max(0, Math.min(0.9, 1 - (item.defense ?? 1)));
  const nameLower = (item.name || '').toLowerCase();
  const isHelmet = HELMET_KEYWORDS.some((kw) => nameLower.includes(kw));
  return isHelmet
    ? { armorProtect: 0, helmetProtect: protect }
    : { armorProtect: protect, helmetProtect: 0 };
}

// Určení zóny z geometrie zásahu na kapsli postavy:
//   heightRatio 0 (chodidla) … 1 (temeno)
//   lateral     vodorovná vzdálenost od osy těla (m)
//   frontal     true = zásah zepředu (jen zepředu jde trefit obličej/srdce)
export function resolveHitZone(heightRatio, lateral = 0, frontal = true) {
  if (heightRatio >= 0.86) {
    return frontal ? HIT_ZONES.oblicej : HIT_ZONES.hlava;
  }
  if (heightRatio >= 0.62) {
    // pásmo trupu
    if (frontal && lateral < 0.1 && heightRatio >= 0.72 && heightRatio <= 0.82) {
      return HIT_ZONES.srdce;
    }
    if (heightRatio >= 0.78 && lateral > 0.16) return HIT_ZONES.ramena;
    if (lateral > 0.24) return HIT_ZONES.ruce;
    return HIT_ZONES.telo;
  }
  if (heightRatio < 0.35) return HIT_ZONES.nohy;
  return lateral > 0.24 ? HIT_ZONES.ruce : HIT_ZONES.telo;
}

// Náhodná zóna (bez známé geometrie — bližák bota apod.); frontalChance
// určuje šanci, že útok přišel zepředu.
export function randomZone(frontalChance = 0.5) {
  const roll = Math.random();
  const frontal = Math.random() < frontalChance;
  if (roll < 0.06) return frontal ? HIT_ZONES.oblicej : HIT_ZONES.hlava;
  if (roll < 0.14) return HIT_ZONES.hlava;
  if (roll < 0.22) return frontal ? HIT_ZONES.srdce : HIT_ZONES.telo;
  if (roll < 0.34) return HIT_ZONES.ramena;
  if (roll < 0.5) return HIT_ZONES.ruce;
  if (roll < 0.68) return HIT_ZONES.nohy;
  return HIT_ZONES.telo;
}

// Výsledné poškození: náhodný podíl v pásmu zóny × základní damage,
// snížený o ochranu (brnění/helma) po odečtení průraznosti zbraně.
export function computeHitDamage(baseDamage, zone, protection = {}, armorPen = 0) {
  const fraction = zone.min + Math.random() * (zone.max - zone.min);
  let damage = baseDamage * fraction;
  let blocked = 0;
  if (zone.protectedBy === 'armor' && protection.armorProtect > 0) {
    blocked = protection.armorProtect * (1 - armorPen);
  } else if (zone.protectedBy === 'helmet' && protection.helmetProtect > 0) {
    blocked = protection.helmetProtect * (1 - armorPen);
  }
  damage *= 1 - Math.max(0, Math.min(0.95, blocked));
  return {
    damage,
    zone: zone.name,
    headshot: !!zone.headshot,
    crit: !!zone.crit || !!zone.headshot,
    fraction,
  };
}

// ---------------------------------------------------------------------------
// Zpětně kompatibilní obálky (starší volací místa: mult = podíl damage,
// part = název zóny, crit = headshot/kritický zásah).
// ---------------------------------------------------------------------------
export function hitZoneFromHeight(heightRatio, lateral = 999, frontal = true) {
  const zone = resolveHitZone(heightRatio, lateral === 999 ? 0 : lateral, frontal);
  const fraction = zone.min + Math.random() * (zone.max - zone.min);
  return { mult: fraction, part: zone.name, crit: !!zone.headshot || !!zone.crit, zone };
}

export function randomHitZone(frontalChance = 0.5) {
  const zone = randomZone(frontalChance);
  const fraction = zone.min + Math.random() * (zone.max - zone.min);
  return { mult: fraction, part: zone.name, crit: !!zone.headshot || !!zone.crit, zone };
}
