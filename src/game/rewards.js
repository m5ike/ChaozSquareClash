// Odměny za zničení assetů a penalizace za zabití chráněných (dítě, pes,
// zdravotník). Seznamy jsou konfigurace — uprav rozsahy/váhy podle chuti.
import { bus } from '@/game/events.js';
import { gameState, getSelectedCharacter } from '@/game/state.js';

// Časované efekty hráče — odpočítává Player, čtou Projectiles/Player/HUD.
export const playerEffects = {
  damageMultTimer: 0, // 2–4× damage
  damageMultValue: 1,
  immortalTimer: 0, // dočasná nesmrtelnost
  preciseTimer: 0, // precise shot — každý zásah je headshot
  noAimTimer: 0, // žádná střela nezasáhne cíl
  blurTimer: 0, // rozmazané vidění (HUD overlay)
  noGunTimer: 0, // nelze střílet
  freezeTimer: 0, // zmrazení pohybu (mapuje se na playerStunTimer)
  specialWeaponUntil: 0,
};

export function resetPlayerEffects() {
  for (const key of Object.keys(playerEffects)) {
    playerEffects[key] = key === 'damageMultValue' ? 1 : 0;
  }
}

const rand = (min, max) => min + Math.random() * (max - min);

// --- Odměny (id, popisek, váha, aplikace) ----------------------------------
export const REWARDS = [
  {
    id: 'heal',
    weight: 3,
    apply: () => {
      const pct = rand(0.1, 1.0);
      gameState.playerHealth = Math.min(
        gameState.playerMaxHealth,
        gameState.playerHealth + gameState.playerMaxHealth * pct
      );
      bus.emit('health-changed', gameState.playerHealth);
      return `❤️ +${Math.round(pct * 100)} % zdraví`;
    },
  },
  {
    id: 'armor',
    weight: 2,
    apply: () => {
      const points = Math.round(rand(10, 100));
      // dočasné brnění: posílí ochranu trupu na 30 s (max +0.5)
      playerEffects.bonusArmor = Math.min(0.5, points / 200);
      playerEffects.bonusArmorTimer = 30;
      return `🛡️ +${points} armor (30 s)`;
    },
  },
  {
    id: 'damage',
    weight: 2,
    apply: () => {
      playerEffects.damageMultValue = Math.round(rand(2, 4));
      playerEffects.damageMultTimer = 10;
      return `💥 ${playerEffects.damageMultValue}× damage (10 s)`;
    },
  },
  {
    id: 'immortal',
    weight: 1,
    apply: () => {
      playerEffects.immortalTimer = 8;
      gameState.playerInvincible = true;
      return '✨ Nesmrtelnost (8 s)';
    },
  },
  {
    id: 'precise',
    weight: 1,
    apply: () => {
      playerEffects.preciseTimer = 8;
      return '🎯 Precise shot — všechno headshoty (8 s)';
    },
  },
  {
    id: 'special',
    weight: 1,
    apply: () => {
      playerEffects.specialWeaponUntil = 15;
      bus.emit('special-weapon-granted');
      return '🔫 Zlatý mód zbraně (15 s)';
    },
  },
  {
    id: 'ammo2',
    weight: 2,
    apply: () => {
      bus.emit('grant-ammo', { slot: 1 });
      return '🔋 Náboje do zbraně 2';
    },
  },
  {
    id: 'ammo3',
    weight: 2,
    apply: () => {
      bus.emit('grant-ammo', { slot: 2 });
      return '🔋 Náboje do zbraně 3';
    },
  },
  {
    id: 'ammo4',
    weight: 2,
    apply: () => {
      bus.emit('grant-ammo', { slot: 3 });
      return '🔋 Náboje do samopalu';
    },
  },
  {
    id: 'ammo5',
    weight: 2,
    apply: () => {
      bus.emit('grant-ammo', { slot: 4 });
      return '🚀 Rakety do raketometu';
    },
  },
  {
    id: 'weapon6',
    weight: 1,
    apply: () => {
      if ((getSelectedCharacter()?.weapons?.length || 0) > 5) {
        bus.emit('grant-ammo', { slot: 5 });
        return '🔋 Náboje do Zlatého kanónu';
      }
      bus.emit('grant-weapon4');
      return '🥇 Zlatý kanón!';
    },
  },
];

// Bonus za zabití jiného hráče/bota: plná munice + zdraví + brnění
export function grantKillBonus() {
  const healthGain = Math.round(10 + Math.random() * 40);
  const armorGain = Math.round(10 + Math.random() * 40);
  gameState.playerHealth = Math.min(
    gameState.playerMaxHealth,
    gameState.playerHealth + healthGain
  );
  bus.emit('health-changed', gameState.playerHealth);
  playerEffects.bonusArmor = Math.min(0.5, (playerEffects.bonusArmor || 0) + armorGain / 200);
  playerEffects.bonusArmorTimer = 30;
  bus.emit('grant-ammo', { slot: 'all' });
  const label = `☠️ Kill! +${healthGain} HP, +${armorGain} armor, munice doplněna`;
  bus.emit('reward-granted', { label });
  return label;
}

// --- Penalizace ------------------------------------------------------------
export const PENALTIES = [
  {
    id: 'freeze',
    weight: 1,
    apply: () => {
      const s = rand(2, 10);
      playerEffects.freezeTimer = s;
      gameState.playerStunTimer = s;
      return `🧊 Freeze ${s.toFixed(0)} s`;
    },
  },
  {
    id: 'selfdamage',
    weight: 1,
    apply: () => {
      const pct = rand(0.1, 0.8);
      gameState.playerHealth -= gameState.playerMaxHealth * pct;
      bus.emit('health-changed', gameState.playerHealth);
      return `💔 Self damage −${Math.round(pct * 100)} %`;
    },
  },
  {
    id: 'noaim',
    weight: 1,
    apply: () => {
      const s = rand(2, 10);
      playerEffects.noAimTimer = s;
      return `🌀 No aim ${s.toFixed(0)} s`;
    },
  },
  {
    id: 'blur',
    weight: 1,
    apply: () => {
      const s = rand(2, 10);
      playerEffects.blurTimer = s;
      return `😵 Blurry vision ${s.toFixed(0)} s`;
    },
  },
  {
    id: 'nogun',
    weight: 1,
    apply: () => {
      const s = rand(2, 10);
      playerEffects.noGunTimer = s;
      return `🚫 No gun ${s.toFixed(0)} s`;
    },
  },
];

function weightedPick(list) {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of list) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

export function grantRandomReward() {
  const label = weightedPick(REWARDS).apply();
  bus.emit('reward-granted', { label });
  return label;
}

export function applyRandomPenalty() {
  const label = weightedPick(PENALTIES).apply();
  bus.emit('penalty-applied', { label });
  // penalizace může hráče i zabít
  if (gameState.playerHealth <= 0 && gameState.phase === 'playing') {
    gameState.phase = 'respawning';
    gameState.playerRespawnTimer = 5;
    gameState.deaths++;
    bus.emit('player-died', { killer: 'Vlastní svědomí' });
  }
  return label;
}

// Odpočet efektů — volá Player každý frame
export function tickPlayerEffects(delta) {
  for (const key of [
    'damageMultTimer',
    'preciseTimer',
    'noAimTimer',
    'blurTimer',
    'noGunTimer',
    'freezeTimer',
    'bonusArmorTimer',
    'specialWeaponUntil',
  ]) {
    if (playerEffects[key] > 0) playerEffects[key] -= delta;
  }
  if (playerEffects.immortalTimer > 0) {
    playerEffects.immortalTimer -= delta;
    if (playerEffects.immortalTimer <= 0 && gameState.powerActiveTimer <= 0) {
      gameState.playerInvincible = false;
    }
  }
  if (playerEffects.damageMultTimer <= 0) playerEffects.damageMultValue = 1;
  if (playerEffects.bonusArmorTimer <= 0) playerEffects.bonusArmor = 0;
}
