import { TextureLoader, NearestFilter, SRGBColorSpace, Vector3 } from 'three';
import { PLAYER, BOT } from '@/game/constants.js';
import { CHARACTERS } from '@/data/characters.js';

// Vstupy — sdílený mutable stav plněný z klávesnice/dotyků, čtený v useFrame smyčkách.
export const input = {
  move: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  fire: false,
  firePressed: false,
  jumpPressed: false,
  reloadPressed: false,
  sprint: false,
  weaponSwitch: -1,
  powerPressed: false,
  gyroEnabled: false,
  lookSensitivity: 0.0025,
};

// Globální herní stav — mimo React (mění se každý frame), UI se synchronizuje přes bus.
export const gameState = {
  playerPos: new Vector3(0, 1, 10),
  playerHealth: PLAYER.maxHealth,
  playerMaxHealth: PLAYER.maxHealth,
  playerArmor: 1,
  playerYaw: 0,
  playerPitch: 0,
  playerRespawnTimer: 0,
  enemies: [],
  botScores: [],
  score: 0,
  kills: 0,
  deaths: 0,
  phase: 'playing',
  fireCooldown: 0,
  fireProjectile: null,
  powerCooldown: 0,
  powerActiveTimer: 0,
  powerType: null,
  enemyStunTimer: 0,
  playerStunTimer: 0,
  playerInvincible: false,
  playerSpeedBoost: false,
  playerDamageBoost: false,
  // runtime stav herního módu (plní createModeState při startu hry)
  mode: null,
  // vzdálení hráči v multiplayeru: [{key, nickname, character, pos: Vector3, yaw, health, alive}]
  remotePlayers: [],
  gameSettings: {
    godMode: false,
    botCount: 5,
    botHealth: 50,
    botDamage: 10,
    botSpeed: 4,
  },
};

export function resetGameState() {
  gameState.playerPos.set(0, 1, 10);
  gameState.playerHealth = PLAYER.maxHealth;
  gameState.playerMaxHealth = PLAYER.maxHealth;
  gameState.playerArmor = 1;
  gameState.playerYaw = 0;
  gameState.playerPitch = 0;
  gameState.playerRespawnTimer = 0;
  for (const enemy of gameState.enemies) {
    if (enemy) {
      enemy.alive = true;
      enemy.health = enemy.maxHealth;
      enemy.respawnTimer = 0;
      enemy.lastAttack = 0;
      enemy.lastShot = 0;
    }
  }
  for (const score of gameState.botScores) {
    if (score) {
      score.kills = 0;
      score.deaths = 0;
      score.score = 0;
    }
  }
  gameState.score = 0;
  gameState.kills = 0;
  gameState.deaths = 0;
  gameState.phase = 'playing';
  gameState.fireCooldown = 0;
  gameState.powerCooldown = 0;
  gameState.powerActiveTimer = 0;
  gameState.powerType = null;
  gameState.enemyStunTimer = 0;
  gameState.playerStunTimer = 0;
  gameState.playerInvincible = false;
  gameState.playerSpeedBoost = false;
  gameState.playerDamageBoost = false;
  if (gameState.mode) {
    const modeId = gameState.mode.id;
    gameState.mode = null;
    // nový stav módu si při restartu vytvoří GameScene (createModeState)
    gameState.pendingModeId = modeId;
  }
}

// Cache textur portrétů (pixelový vzhled — NearestFilter)
const textureLoader = new TextureLoader();
const portraitCache = {};

export function getPortraitTexture(url) {
  if (!url) return null;
  if (!portraitCache[url]) {
    const tex = textureLoader.load(url);
    tex.colorSpace = SRGBColorSpace;
    tex.magFilter = NearestFilter;
    portraitCache[url] = tex;
  }
  return portraitCache[url];
}

// Loadout 3 zbraní: sečná zbraň (podle kategorie), brokovnice, dálka.
// Kompletní ladění je v @/game/weaponsConfig.js.
import { buildLoadout } from '@/game/weaponsConfig.js';

export function buildWeaponLoadout(_, character) {
  return buildLoadout(character);
}

// Vybraná postava — nastavuje Home, čte hra. Loadout se dopočítává líně.
let selectedCharacter = null;

export function setSelectedCharacter(character) {
  selectedCharacter = character;
  if (character) character.weapons = null; // přegeneruj loadout (mohly se změnit skiny/config)
}

export function getSelectedCharacter() {
  if (!selectedCharacter) return null;
  if (!selectedCharacter.weapons) {
    selectedCharacter.weapons = buildLoadout(selectedCharacter);
  }
  return selectedCharacter;
}

// Náhodný výběr soupeřů (Fisher–Yates); preferPortraits upřednostní postavy s obrázkem.
export function pickRandomOpponents(count, excludeId, preferPortraits = false) {
  let pool = CHARACTERS.filter((ch) => ch.id !== excludeId);
  if (preferPortraits) {
    const withPortrait = pool.filter((ch) => ch.portrait);
    pool = withPortrait.length >= count ? withPortrait : pool;
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// Klasifikace speciální schopnosti podle českého popisu → typ efektu.
export function classifyPower(character) {
  const desc = (character?.power?.desc || '').toLowerCase();
  if (desc.includes('nezranit') || desc.includes('neviditeln')) return 'invincible';
  if (desc.includes('vyléč') || desc.includes('léč') || desc.includes('plné vyléč')) return 'heal';
  if (desc.includes('rychlost')) return 'speed';
  if (
    desc.includes('štít') ||
    desc.includes('brnění') ||
    desc.includes('zruší') ||
    desc.includes('nemůže útočit') ||
    desc.includes('chytí')
  )
    return 'shield';
  if (
    desc.includes('paralýz') ||
    desc.includes('usp') ||
    desc.includes('zastav') ||
    desc.includes('zmát') ||
    desc.includes('zpomal') ||
    desc.includes('zmrz')
  )
    return 'stun_all';
  if (desc.includes('dvojnásob') || desc.includes('nezastavitelný') || desc.includes('kopír'))
    return 'damage_boost';
  if (desc.includes('teleport')) return 'teleport';
  return 'damage_all';
}
