// Barevná paleta města (retro Quake vibe)
export const COLORS = {
  sky: '#4a7ab8',
  fog: '#3a5a8a',
  buildingA: '#d4a86a',
  buildingB: '#c4856a',
  buildingC: '#a8b88a',
  buildingD: '#b8986a',
  buildingE: '#c8a878',
  buildingF: '#9ab8a0',
  monument: '#a8a8a8',
  wall: '#5a4a3a',
  crate: '#8a6a3a',
  tree: '#3a7a2a',
  trunk: '#4a2a1a',
  roof: '#7a2a1a',
};

// Fyzické parametry hráče (kapsle) a kamera
export const PLAYER = {
  halfHeight: 0.5,
  radius: 0.3,
  eyeHeight: 0.7,
  jumpForce: 7,
  maxHealth: 100,
};

// Výchozí parametry botů
export const BOT = {
  halfHeight: 0.4,
  radius: 0.3,
  speed: 4,
  health: 50,
  damage: 10,
  attackRange: 2,
  attackCooldown: 1,
  respawnTime: 5,
  count: 5,
};

// Velikost poolu projektilů
export const PROJECTILE_POOL_SIZE = 30;

// Životnost projektilu v sekundách
export const PROJECTILE_TTL = 3;

// Rozměry arény (náměstí)
export const ARENA = { width: 40, depth: 30 };

// Respawn hráče po smrti (sekundy)
export const RESPAWN_SECONDS = 5;

// Cílové skóre pro výhru (výchozí; za běhu čti TUNING.winScore)
export const WIN_SCORE = 40;

// Mutovatelné herní ladění — administrace (/admin) ho přepisuje za běhu.
export const TUNING = {
  winScore: WIN_SCORE,
  respawnSeconds: RESPAWN_SECONDS,
  projectilePoolSize: PROJECTILE_POOL_SIZE,
  projectileTtl: PROJECTILE_TTL,
};
