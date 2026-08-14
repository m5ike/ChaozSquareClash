// ============================================================================
// CENTRÁLNÍ KONFIGURACE ZBRANÍ — všechno ladění zbraní na jednom místě.
// Jak upravovat, popisuje README („How-to: ladění zbraní").
//
// Parametry střelných zbraní (sloty 1 a 2 loadoutu):
//   accuracy        přesnost 0–1 (1 = žádná odchylka; snižuje rozptyl)
//   healthDamage    základní poškození zdraví (před zásahovou zónou)
//   armorPen        průraznost brnění 0–1 (kolik ochrany brnění/helmy ignoruje)
//   spread          základní rozptyl (radiány odchylky; brokovnice na broky)
//   pelletCount     počet broků na výstřel (jen spread)
//   magSize         max. výstřelů na zásobník
//   magazines       max. zásobníků (celkem nábojů = magSize × magazines)
//   fireCooldown    cooldown mezi jednotlivými střelami (s)
//   reloadCooldown  cooldown výměny zásobníku (s)
//   projectileSpeed rychlost projektilu (j/s)
//   behavior        'hitscan-like' | 'projectile' | 'lobbed' — chování střely
//
// Parametry sečných zbraní (slot 0 loadoutu):
//   slashType       'sekera' | 'mec' | 'nuz' | 'katana'
//   lengthPct       délka čepele v procentech výšky postavy (0–1)
//   damageMult      násobek základního damage postavy
//   swingCooldown   cooldown po švihu (s)
//   trajectories    počet dostupných trajektorií (1–4)
//   Trajektorii vybírá POČET STISKŮ klávesy střelby v okně 350 ms
//   (1× = trajektorie 1, 2× = trajektorie 2, …).
// ============================================================================

export const CHARACTER_HEIGHT = 1.45; // výška modelu postavy (m)

// Okno pro počítání stisků u sečných zbraní (ms)
export const SLASH_PRESS_WINDOW_MS = 350;

// --- Střelné zbraně (výchozí hodnoty slotů, škálují se zbraní postavy) -----
export const RANGED_DEFAULTS = {
  spread: {
    name: 'Brokovnice',
    accuracy: 0.72,
    armorPen: 0.1,
    spread: 0.25,
    pelletCount: 6,
    magSize: 6,
    magazines: 4,
    fireCooldown: 0.7,
    reloadCooldown: 1.6,
    projectileSpeed: 22,
    behavior: 'projectile',
    damageScale: 0.5, // healthDamage = damage postavy × damageScale
    size: 0.1,
  },
  projectile: {
    name: 'Dálka',
    accuracy: 0.9,
    armorPen: 0.2,
    spread: 0.03,
    pelletCount: 1,
    magSize: 12,
    magazines: 4,
    fireCooldown: 0.3,
    reloadCooldown: 1.2,
    projectileSpeed: 25,
    behavior: 'projectile',
    damageScale: 0.7,
    size: 0.12,
  },
};

// --- Sečné zbraně -----------------------------------------------------------
// Typ podle kategorie postavy; délka v procentech výšky postavy.
export const SLASH_TYPES = {
  sekera: { label: 'Sekera', lengthPct: 0.4, damageMult: 2.1, swingCooldown: 0.75, color: '#8a8f96' },
  mec: { label: 'Meč', lengthPct: 0.45, damageMult: 1.8, swingCooldown: 0.6, color: '#c8d0da' },
  nuz: { label: 'Nůž', lengthPct: 0.25, damageMult: 1.4, swingCooldown: 0.4, color: '#b8bec8' },
  katana: { label: 'Katana', lengthPct: 0.5, damageMult: 1.9, swingCooldown: 0.55, color: '#dde4ee' },
};

const CATEGORY_SLASH = {
  Politik: 'mec',
  Sport: 'sekera',
  Hudba: 'katana',
  TV: 'mec',
  Net: 'nuz',
  Jiné: 'sekera',
};

export function slashTypeForCharacter(character) {
  return CATEGORY_SLASH[character?.cat] || 'mec';
}

// --- Trajektorie sečných zbraní --------------------------------------------
// Body v normalizovaném prostoru před hráčem:
//   x: -1 (vlevo) … 1 (vpravo)
//   y:  0 (pas)  … 1 (hlava protivníka)
//   z:  0 (u těla) … 1 (plný dosah čepele)
// `zone` říká, kam útok míří (ovlivní zásahovou zónu poranění).
export const SLASH_TRAJECTORIES = [
  {
    id: 1,
    name: 'Rozmach zleva',
    desc: 'Z leva ve výšce těla doprava do výšky hlavy a zpátky',
    zone: 'sweep', // zasahuje tělo → hlavu podle průběhu
    points: [
      { x: -0.9, y: 0.3, z: 0.45 },
      { x: -0.3, y: 0.55, z: 0.85 },
      { x: 0.5, y: 0.85, z: 0.8 },
      { x: 0.9, y: 1.0, z: 0.5 },
      { x: 0.2, y: 0.7, z: 0.7 }, // …a zpátky
      { x: -0.6, y: 0.4, z: 0.5 },
    ],
    duration: 0.5,
  },
  {
    id: 2,
    name: 'Rozmach zprava',
    desc: 'Z prava ve výšce těla doleva do výšky hlavy a zpátky',
    zone: 'sweep',
    points: [
      { x: 0.9, y: 0.3, z: 0.45 },
      { x: 0.3, y: 0.55, z: 0.85 },
      { x: -0.5, y: 0.85, z: 0.8 },
      { x: -0.9, y: 1.0, z: 0.5 },
      { x: -0.2, y: 0.7, z: 0.7 },
      { x: 0.6, y: 0.4, z: 0.5 },
    ],
    duration: 0.5,
  },
  {
    id: 3,
    name: 'Bodnutí na hlavu',
    desc: 'Dlouhé bodnutí od pasu na hlavu protivníka',
    zone: 'head',
    points: [
      { x: 0.15, y: 0.1, z: 0.1 },
      { x: 0.05, y: 0.5, z: 0.55 },
      { x: 0, y: 1.0, z: 1.0 },
      { x: 0.05, y: 0.6, z: 0.4 },
    ],
    duration: 0.42,
  },
  {
    id: 4,
    name: 'Bodnutí na tělo',
    desc: 'Dlouhé bodnutí od pasu na tělo protivníka',
    zone: 'body',
    points: [
      { x: 0.15, y: 0.1, z: 0.1 },
      { x: 0.05, y: 0.35, z: 0.6 },
      { x: 0, y: 0.5, z: 1.0 },
      { x: 0.05, y: 0.35, z: 0.4 },
    ],
    duration: 0.42,
  },
];

// Interpolace bodu na trajektorii (Catmull-Rom po úsecích, t ∈ 0–1)
export function sampleTrajectory(trajectory, t) {
  const pts = trajectory.points;
  const segCount = pts.length - 1;
  const clamped = Math.max(0, Math.min(0.9999, t));
  const seg = Math.floor(clamped * segCount);
  const local = clamped * segCount - seg;
  const p0 = pts[Math.max(0, seg - 1)];
  const p1 = pts[seg];
  const p2 = pts[Math.min(segCount, seg + 1)];
  const p3 = pts[Math.min(segCount, seg + 2)];
  const cr = (a, b, c, d) =>
    0.5 *
    (2 * b +
      (-a + c) * local +
      (2 * a - 5 * b + 4 * c - d) * local * local +
      (-a + 3 * b - 3 * c + d) * local * local * local);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), z: cr(p0.z, p1.z, p2.z, p3.z) };
}

// --- Sestavení loadoutu postavy --------------------------------------------
// Slot 0: sečná zbraň (typ dle kategorie), sloty 1–2: brokovnice a dálka.
export function buildLoadout(character) {
  const baseWeapon = character?.weapon || { damage: 12, color: '#cccccc' };
  const baseDamage = baseWeapon.damage;
  const slashTypeId = slashTypeForCharacter(character);
  const slashDef = SLASH_TYPES[slashTypeId];
  return [
    {
      name: slashDef.label,
      type: 'melee',
      slash: {
        slashType: slashTypeId,
        lengthPct: slashDef.lengthPct,
        trajectories: SLASH_TRAJECTORIES.length,
        reach: CHARACTER_HEIGHT * slashDef.lengthPct + 0.9, // čepel + paže
      },
      damage: Math.round(baseDamage * slashDef.damageMult),
      cooldown: slashDef.swingCooldown,
      color: slashDef.color,
      range: CHARACTER_HEIGHT * slashDef.lengthPct + 0.9,
    },
    {
      ...RANGED_DEFAULTS.spread,
      type: 'spread',
      damage: Math.round(baseDamage * RANGED_DEFAULTS.spread.damageScale),
      cooldown: RANGED_DEFAULTS.spread.fireCooldown,
      count: RANGED_DEFAULTS.spread.pelletCount,
      speed: RANGED_DEFAULTS.spread.projectileSpeed,
      color: baseWeapon.color,
    },
    {
      ...RANGED_DEFAULTS.projectile,
      type: 'projectile',
      damage: Math.round(baseDamage * RANGED_DEFAULTS.projectile.damageScale),
      cooldown: RANGED_DEFAULTS.projectile.fireCooldown,
      speed: RANGED_DEFAULTS.projectile.projectileSpeed,
      color: baseWeapon.color,
    },
  ];
}

// Efektivní rozptyl po započtení přesnosti (accuracy 1 → skoro nula)
export function effectiveSpread(weapon) {
  const accuracy = weapon.accuracy ?? 0.85;
  return (weapon.spread ?? 0.05) * (1.15 - accuracy);
}
