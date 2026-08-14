// Výpočet zásahové zóny podle relativní výšky zásahu na těle (0 = nohy, 1 = hlava).
// Vrací multiplikátor poškození, název části těla a zda jde o kritický zásah.
export function hitZoneFromHeight(heightRatio, lateral = 999) {
  if (heightRatio >= 0.85) return { mult: 3, part: 'hlava', crit: true };
  if (heightRatio >= 0.75) return { mult: 2.5, part: 'krk', crit: false };
  if (heightRatio >= 0.5) {
    if (lateral < 0.15) return { mult: 3, part: 'srdce', crit: true };
    return { mult: 2, part: 'plíce', crit: false };
  }
  if (heightRatio >= 0.25) return { mult: 1.5, part: 'břicho', crit: false };
  return { mult: 0.7, part: 'končetina', crit: false };
}

// Náhodná zásahová zóna (pro bližák, kde nejde určit přesný bod zásahu).
export function randomHitZone() {
  const roll = Math.random();
  if (roll < 0.08) return { mult: 3, part: 'hlava', crit: true };
  if (roll < 0.15) return { mult: 3, part: 'srdce', crit: true };
  if (roll < 0.25) return { mult: 2.5, part: 'krk', crit: false };
  if (roll < 0.5) return { mult: 2, part: 'plíce', crit: false };
  if (roll < 0.7) return { mult: 1.5, part: 'břicho', crit: false };
  return { mult: 0.7, part: 'končetina', crit: false };
}
