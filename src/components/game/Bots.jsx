import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { bus } from '@/game/events.js';
import {
  gameState,
  getSelectedCharacter,
  pickRandomOpponents,
  buildWeaponLoadout,
  classifyPower,
} from '@/game/state.js';
import { BOT, RESPAWN_SECONDS } from '@/game/constants.js';
import { randomHitZone } from '@/game/hitZones.js';
import { buildObstacleGrid, computeSteering, findCoverSpot, chooseWeaponIndex } from '@/game/ai.js';
import { getActiveMap } from '@/game/lobby.js';
import CharacterModel from '@/components/game/CharacterModel.jsx';

// Rapier typy těles (číselné enum hodnoty RigidBodyType)
const BODY_DYNAMIC = 0;
const BODY_KINEMATIC_POSITION = 2;

// Jak dlouho zůstane ragdoll tělo viditelné, než se skryje (respawn je 5 s)
const CORPSE_VISIBLE_SECONDS = 2.8;

// AI boti v3: steering s vyhýbáním překážkám, kryty při nízkém zdraví,
// výběr zbraně podle vzdálenosti, schopnosti postav, týmy (TDM/CTF)
// a fyzikální ragdoll při smrti.
export default function Bots() {
  const bodiesRef = useRef([]);
  const visualsRef = useRef([]);
  const modelYawsRef = useRef([]);
  const healthFillsRef = useRef([]);
  const healthBarsRef = useRef([]);
  const animsRef = useRef([]);
  const rosterRef = useRef(null);
  const { camera } = useThree();

  const map = useMemo(() => getActiveMap(), []);
  const obstacleGrid = useMemo(() => buildObstacleGrid(map), [map]);
  const modeId = gameState.mode?.id || 'dm';
  const isTeamMode = modeId === 'tdm' || modeId === 'ctf';

  // Líná inicializace soupisky a stavu nepřátel
  if (!rosterRef.current) {
    const selected = getSelectedCharacter();
    const botCount = gameState.gameSettings?.botCount ?? BOT.count;
    const botHealth = gameState.gameSettings?.botHealth ?? BOT.health;
    rosterRef.current = pickRandomOpponents(botCount, selected?.id, true);
    gameState.botScores = rosterRef.current.map((ch, i) => ({
      name: ch?.nickname || ch?.name || `Bot ${i + 1}`,
      kills: 0,
      deaths: 0,
      score: 0,
    }));
    gameState.enemies = [];
    for (let i = 0; i < botCount; i++) {
      const ch = rosterRef.current[i];
      // V týmových módech: první polovina červení (nepřátelé), zbytek modří (parťáci)
      const team = isTeamMode ? (i < Math.ceil(botCount / 2) ? 'red' : 'blue') : 'red';
      gameState.enemies[i] = {
        id: i,
        health: ch?.stats.health || botHealth,
        maxHealth: ch?.stats.health || botHealth,
        alive: true,
        respawnTimer: 0,
        lastAttack: 0,
        lastShot: 0,
        body: null,
        character: ch,
        armor: ch?.armor,
        team,
        spawnPos: map.botSpawns[i] || [0, 1, -5],
        // AI stav
        loadout: ch ? buildWeaponLoadout(ch.weapon) : buildWeaponLoadout({ damage: 10, color: '#ff3333' }),
        coverSpot: null,
        coverUntil: 0,
        stunTimer: 0,
        // schopnost
        powerType: ch ? classifyPower(ch) : 'damage_all',
        powerCooldown: 8 + Math.random() * 14,
        invincibleTimer: 0,
        speedBoostTimer: 0,
        damageBoostTimer: 0,
        // ragdoll
        ragdolled: false,
      };
      animsRef.current[i] = {
        speed: 0,
        attackTimer: 0,
        dead: false,
        deadTime: 0,
        flashTimer: 0,
        ragdoll: false,
      };
    }
  }

  // Restart hry — oživení všech botů
  useEffect(() => {
    const handleRestart = () => {
      for (let i = 0; i < gameState.enemies.length; i++) {
        const enemy = gameState.enemies[i];
        const body = bodiesRef.current[i];
        if (enemy) {
          enemy.alive = true;
          enemy.health = enemy.maxHealth;
          enemy.respawnTimer = 0;
          enemy.lastAttack = 0;
          enemy.lastShot = 0;
          enemy.coverSpot = null;
          enemy.coverUntil = 0;
          enemy.stunTimer = 0;
          enemy.powerCooldown = 8 + Math.random() * 14;
          enemy.invincibleTimer = 0;
          enemy.speedBoostTimer = 0;
          enemy.damageBoostTimer = 0;
          if (body && enemy.ragdolled) restoreFromRagdoll(body);
          enemy.ragdolled = false;
        }
        if (body) {
          const spawn = enemy?.spawnPos || [0, 1, -5];
          body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
        }
        const visual = visualsRef.current[i];
        if (visual) visual.visible = true;
        const anim = animsRef.current[i];
        if (anim) {
          anim.dead = false;
          anim.deadTime = 0;
          anim.flashTimer = 0;
          anim.attackTimer = 0;
          anim.ragdoll = false;
        }
      }
    };
    bus.on('restart-game', handleRestart);
    return () => {
      bus.off('restart-game', handleRestart);
      gameState.enemies = [];
      gameState.botScores = [];
    };
  }, []);

  // Zásah bota — bílý záblesk modelu
  useEffect(() => {
    const handleHit = (hit) => {
      const anim = animsRef.current[hit.index];
      if (anim) anim.flashTimer = 0.15;
    };
    bus.on('hit-enemy', handleHit);
    return () => bus.off('hit-enemy', handleHit);
  }, []);

  // Přepnutí kinematického těla na dynamický ragdoll s odhozením
  function ragdollize(body, enemy) {
    body.setBodyType(BODY_DYNAMIC, true);
    body.setLinearDamping(0.4);
    body.setAngularDamping(0.6);
    // impulz směrem od hráče (přibližný směr posledního zásahu) + nahoru + rotace
    const pos = body.translation();
    let dx = pos.x - gameState.playerPos.x;
    let dz = pos.z - gameState.playerPos.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    body.applyImpulse({ x: dx * 3.5, y: 2.2, z: dz * 3.5 }, true);
    body.applyTorqueImpulse(
      {
        x: (Math.random() - 0.5) * 1.6,
        y: (Math.random() - 0.5) * 0.6,
        z: (Math.random() - 0.5) * 1.6,
      },
      true
    );
    enemy.ragdolled = true;
  }

  // Návrat ragdollu do kinematického režimu (před respawnem)
  function restoreFromRagdoll(body) {
    body.setBodyType(BODY_KINEMATIC_POSITION, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  }

  // Výběr cíle podle týmu a módu. Vrací {x, z, kind: 'player'|'bot', index?}
  function pickTarget(enemy, now) {
    const mode = gameState.mode;
    // CTF: modří honí červeného vlajkonoše; červený vlajkonoš míří domů
    if (mode?.id === 'ctf') {
      if (mode.blueFlagCarrier === enemy.id) {
        return { x: 0, z: -12, kind: 'base' }; // červená základna (sever)
      }
      if (enemy.team === 'blue' && mode.blueFlagCarrier !== null) {
        const carrier = gameState.enemies[mode.blueFlagCarrier];
        if (carrier?.alive && carrier.body) {
          const p = carrier.body.translation();
          return { x: p.x, z: p.z, kind: 'bot', index: carrier.id };
        }
      }
      if (enemy.team === 'red' && mode.blueFlagCarrier === null && enemy.id === firstAliveRed()) {
        // určený útočník jde pro modrou vlajku (jih)
        return { x: 0, z: 12, kind: 'flag' };
      }
    }
    // KOTH: když hráč drží zónu, červení ji kontestují
    if (mode?.id === 'koth' && enemy.team === 'red' && mode.zoneOccupant === 'player') {
      return { x: map.zoneCenter?.[0] ?? 0, z: map.zoneCenter?.[2] ?? 6, kind: 'zone' };
    }
    // standard: nejbližší protivník (hráč pro červené, červení boti pro modré)
    let best = null;
    let bestDist = Infinity;
    if (enemy.team === 'red' && gameState.phase === 'playing') {
      const d = Math.hypot(
        gameState.playerPos.x - (enemy.body?.translation().x ?? 0),
        gameState.playerPos.z - (enemy.body?.translation().z ?? 0)
      );
      best = { x: gameState.playerPos.x, z: gameState.playerPos.z, kind: 'player' };
      bestDist = d;
    }
    for (const other of gameState.enemies) {
      if (!other?.alive || !other.body || other.id === enemy.id) continue;
      if (other.team === enemy.team) continue;
      const p = other.body.translation();
      const my = enemy.body.translation();
      const d = Math.hypot(p.x - my.x, p.z - my.z);
      if (d < bestDist) {
        bestDist = d;
        best = { x: p.x, z: p.z, kind: 'bot', index: other.id };
      }
    }
    return best;
  }

  function firstAliveRed() {
    for (const e of gameState.enemies) {
      if (e?.alive && e.team === 'red') return e.id;
    }
    return -1;
  }

  // Poškození bota botem (melee/schopnost) — sdílená cesta se skóre a killfeedem
  function damageBot(victim, damage, attacker) {
    if (victim.invincibleTimer > 0) return;
    const defense = victim.armor?.defense || 1;
    victim.health -= damage * defense;
    bus.emit('hit-enemy', { index: victim.id, damage, crit: false, part: 'tělo' });
    if (victim.health <= 0 && victim.alive) {
      victim.alive = false;
      victim.respawnTimer = BOT.respawnTime;
      if (gameState.botScores[attacker.id]) gameState.botScores[attacker.id].kills++;
      if (gameState.botScores[victim.id]) gameState.botScores[victim.id].deaths++;
      if (gameState.mode && gameState.mode.id === 'tdm') {
        gameState.mode.teamScores[attacker.team]++;
      }
      bus.emit('bot-killed-bot', {
        killer: attacker.character?.nickname || 'Bot',
        victim: victim.character?.nickname || 'Bot',
      });
    }
  }

  // Aktivace schopnosti bota
  function useBotPower(enemy, now) {
    const character = enemy.character;
    if (!character?.power) return;
    enemy.powerCooldown = (character.power.cd || 20) * 1.5;
    const anim = animsRef.current[enemy.id];
    if (anim) anim.flashTimer = 0.3;
    bus.emit('mode-event', {
      text: `✨ ${character.nickname || character.name}: ${character.power.name}`,
    });
    switch (enemy.powerType) {
      case 'heal':
        enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * 0.35);
        break;
      case 'speed':
        enemy.speedBoostTimer = 5;
        break;
      case 'damage_boost':
        enemy.damageBoostTimer = 5;
        break;
      case 'invincible':
      case 'shield':
        enemy.invincibleTimer = 3;
        break;
      case 'stun_all':
        // omráčí všechny protivníky bota
        if (enemy.team === 'red') {
          gameState.playerStunTimer = 2;
          for (const o of gameState.enemies) {
            if (o?.alive && o.team === 'blue') o.stunTimer = 2;
          }
        } else {
          for (const o of gameState.enemies) {
            if (o?.alive && o.team === 'red') o.stunTimer = 2;
          }
        }
        break;
      case 'teleport': {
        const target = pickTarget(enemy, now);
        if (target && enemy.body) {
          const angle = Math.random() * Math.PI * 2;
          enemy.body.setTranslation(
            {
              x: Math.max(-16, Math.min(16, target.x + Math.cos(angle) * 4)),
              y: enemy.body.translation().y,
              z: Math.max(-12, Math.min(12, target.z + Math.sin(angle) * 4)),
            },
            true
          );
        }
        break;
      }
      case 'damage_all':
      default:
        // plošné poškození všech protivníků
        if (enemy.team === 'red' && gameState.phase === 'playing') {
          if (!gameState.gameSettings?.godMode && !gameState.playerInvincible) {
            gameState.playerHealth -= 15 * gameState.playerArmor;
            bus.emit('health-changed', gameState.playerHealth);
            checkPlayerDeath(enemy);
          }
        }
        for (const o of gameState.enemies) {
          if (o?.alive && o.team !== enemy.team) damageBot(o, 15, enemy);
        }
        break;
    }
  }

  // Smrt hráče způsobená botem (melee/schopnost)
  function checkPlayerDeath(enemy) {
    if (gameState.playerHealth <= 0 && gameState.phase === 'playing') {
      gameState.phase = 'respawning';
      gameState.playerRespawnTimer = RESPAWN_SECONDS;
      gameState.deaths++;
      if (gameState.botScores[enemy.id]) gameState.botScores[enemy.id].kills++;
      if (gameState.mode?.id === 'tdm') gameState.mode.teamScores.red++;
      bus.emit('player-died', { killer: enemy.character?.name });
    }
  }

  useFrame((_, delta) => {
    if (gameState.phase !== 'playing' && gameState.phase !== 'respawning') return;
    const now = performance.now() / 1000;
    for (let i = 0; i < gameState.enemies.length; i++) {
      const enemy = gameState.enemies[i];
      if (!enemy) continue;
      const body = bodiesRef.current[i];
      if (!body) continue;
      enemy.body = body;
      const anim = animsRef.current[i];

      // Billboard lišt zdraví
      const barBg = healthBarsRef.current[i];
      if (barBg) barBg.quaternion.copy(camera.quaternion);
      const barFill = healthFillsRef.current[i];
      if (barFill) barFill.quaternion.copy(camera.quaternion);

      // Mrtvý bot: ragdoll + odpočet respawnu
      if (!enemy.alive) {
        enemy.respawnTimer -= delta;
        if (anim) anim.dead = true;
        if (!enemy.ragdolled) {
          ragdollize(body, enemy);
          if (anim) anim.ragdoll = true;
        }
        if (barBg) barBg.visible = false;
        if (barFill) barFill.visible = false;
        const visual = visualsRef.current[i];
        const fallElapsed = BOT.respawnTime - enemy.respawnTimer;
        if (visual && fallElapsed > CORPSE_VISIBLE_SECONDS) visual.visible = false;
        if (enemy.respawnTimer <= 0) {
          enemy.alive = true;
          enemy.health = enemy.maxHealth;
          restoreFromRagdoll(body);
          enemy.ragdolled = false;
          const spawn = enemy.spawnPos;
          body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
          if (visual) visual.visible = true;
          if (anim) {
            anim.dead = false;
            anim.deadTime = 0;
            anim.ragdoll = false;
          }
          if (barBg) barBg.visible = true;
          if (barFill) barFill.visible = true;
        }
        continue;
      }

      // Časovače efektů bota
      if (enemy.stunTimer > 0) enemy.stunTimer -= delta;
      if (enemy.invincibleTimer > 0) enemy.invincibleTimer -= delta;
      if (enemy.speedBoostTimer > 0) enemy.speedBoostTimer -= delta;
      if (enemy.damageBoostTimer > 0) enemy.damageBoostTimer -= delta;
      if (enemy.powerCooldown > 0) enemy.powerCooldown -= delta;

      // Lišta zdraví
      if (barFill) {
        const ratio = Math.max(0, enemy.health / enemy.maxHealth);
        barFill.scale.x = ratio;
        barFill.position.x = -(0.6 * (1 - ratio)) / 2;
      }

      const pos = body.translation();
      const modelYaw = modelYawsRef.current[i];

      // Stun: hráčova schopnost omračuje jen červené, botí stun dle týmu
      if ((gameState.enemyStunTimer > 0 && enemy.team === 'red') || enemy.stunTimer > 0) {
        if (anim) anim.speed = 0;
        continue;
      }

      const target = pickTarget(enemy, now);
      if (!target) {
        if (anim) anim.speed = 0;
        continue;
      }

      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      let speed = enemy.character?.stats.speed || (gameState.gameSettings?.botSpeed ?? BOT.speed);
      if (enemy.speedBoostTimer > 0) speed *= 1.6;

      // Schopnost: použij, když je cooldown pryč a cíl rozumně blízko
      if (enemy.powerCooldown <= 0 && dist < 16) {
        useBotPower(enemy, now);
      }

      // Kryt při nízkém zdraví: doběhni za překážku a chvíli se "obvazuj"
      const lowHealth = enemy.health < enemy.maxHealth * 0.35;
      if (lowHealth && now > enemy.coverUntil && !enemy.coverSpot) {
        enemy.coverSpot = findCoverSpot(pos, target, obstacleGrid.slice(map.buildings.length));
        enemy.coverUntil = now + 5;
      }
      if (enemy.coverSpot) {
        const cd = Math.hypot(enemy.coverSpot.x - pos.x, enemy.coverSpot.z - pos.z);
        if (cd > 0.8) {
          const steer = computeSteering(pos, enemy.coverSpot, obstacleGrid);
          body.setNextKinematicTranslation({
            x: pos.x + steer.x * speed * delta,
            y: pos.y,
            z: pos.z + steer.z * speed * delta,
          });
          if (modelYaw) modelYaw.rotation.y = Math.atan2(steer.x, steer.z);
          if (anim) anim.speed = 1;
        } else {
          // v krytu: pomalé léčení, po vyléčení nebo vypršení zpět do boje
          enemy.health = Math.min(enemy.maxHealth, enemy.health + 4 * delta);
          if (anim) anim.speed = 0;
          if (enemy.health > enemy.maxHealth * 0.6 || now > enemy.coverUntil) {
            enemy.coverSpot = null;
          }
        }
        continue;
      }

      // Výběr zbraně podle vzdálenosti
      const weaponIndex = chooseWeaponIndex(dist);
      const weapon = enemy.loadout[weaponIndex];
      const dmgMult =
        (enemy.character?.stats.dmgMult || 1) * (enemy.damageBoostTimer > 0 ? 2 : 1);

      if (dist > BOT.attackRange) {
        // Pohyb: steering k cíli s vyhýbáním; drobné kličkování zachováno
        const wobble = Math.sin(now * 1.5 + i * 2) * 0.25;
        const steer = computeSteering(pos, target, obstacleGrid);
        const dirX = steer.x + -steer.z * wobble;
        const dirZ = steer.z + steer.x * wobble;
        body.setNextKinematicTranslation({
          x: pos.x + dirX * speed * delta,
          y: pos.y,
          z: pos.z + dirZ * speed * delta,
        });
        if (modelYaw) modelYaw.rotation.y = Math.atan2(dx / dist, dz / dist);
        if (anim) anim.speed = 1;

        // Střelba za pohybu: brokovnice na střední, projektil na dálku
        enemy.lastShot += delta;
        const cadence = weapon.cooldown * 2.2 + 0.8 + Math.random() * 0.4;
        const canSeeTarget = target.kind === 'player' || target.kind === 'bot';
        if (canSeeTarget && enemy.lastShot > cadence && dist < 20 && weapon.type !== 'melee') {
          enemy.lastShot = 0;
          if (anim) anim.attackTimer = 0.35;
          const origin = { x: pos.x, y: pos.y + 0.5, z: pos.z };
          const color = enemy.team === 'blue' ? '#4488ff' : '#ff3333';
          if (weapon.type === 'spread') {
            for (let p = 0; p < (weapon.count || 6); p++) {
              const angle = Math.atan2(dx, dz) + (Math.random() - 0.5) * (weapon.spread || 0.25) * 2;
              gameState.fireProjectile?.(
                origin,
                { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
                {
                  ...weapon,
                  damage: Math.round(weapon.damage * dmgMult),
                  color,
                  enemyIndex: i,
                  team: enemy.team,
                },
                'enemy'
              );
            }
          } else {
            gameState.fireProjectile?.(
              origin,
              { x: dx / dist, y: 0, z: dz / dist },
              {
                ...weapon,
                damage: Math.round(weapon.damage * dmgMult),
                color,
                enemyIndex: i,
                team: enemy.team,
              },
              'enemy'
            );
          }
        }
      } else {
        // Zblízka: bližák
        if (modelYaw && dist > 0.001) modelYaw.rotation.y = Math.atan2(dx / dist, dz / dist);
        if (anim) anim.speed = 0;
        if (now - enemy.lastAttack > BOT.attackCooldown) {
          enemy.lastAttack = now;
          if (anim) anim.attackTimer = 0.35;
          const meleeDamage = enemy.loadout[0].damage * dmgMult;
          if (target.kind === 'player') {
            const zone = randomHitZone();
            if (
              !gameState.gameSettings?.godMode &&
              !gameState.playerInvincible &&
              gameState.playerStunTimer <= 0
            ) {
              gameState.playerHealth -=
                (gameState.gameSettings?.botDamage ?? meleeDamage * 0.6) *
                gameState.playerArmor *
                zone.mult *
                0.5;
              bus.emit('health-changed', gameState.playerHealth);
            }
            checkPlayerDeath(enemy);
          } else if (target.kind === 'bot') {
            const victim = gameState.enemies[target.index];
            if (victim?.alive) damageBot(victim, meleeDamage * 0.6, enemy);
          }
        }
      }
    }
  });

  return (
    <>
      {Array.from({ length: rosterRef.current?.length || BOT.count }).map((_, i) => {
        const character = rosterRef.current[i];
        const enemy = gameState.enemies[i];
        const spawn = map.botSpawns[i] || [0, 1, -5];
        return (
          <RigidBody
            key={i}
            ref={(body) => {
              bodiesRef.current[i] = body;
            }}
            type="kinematicPosition"
            colliders={false}
            name={`enemy-${i}`}
            position={spawn}
          >
            <CapsuleCollider args={[BOT.halfHeight, BOT.radius]} />
            <group
              ref={(g) => {
                visualsRef.current[i] = g;
              }}
            >
              {/* Model postavy — kotva u chodidel */}
              <group position={[0, -spawn[1], 0]}>
                <group
                  ref={(g) => {
                    modelYawsRef.current[i] = g;
                  }}
                >
                  <CharacterModel
                    character={character}
                    animRef={{ current: animsRef.current[i] }}
                    team={isTeamMode ? enemy?.team : null}
                  />
                </group>
              </group>
              {/* Lišta zdraví */}
              <mesh
                ref={(m) => {
                  healthBarsRef.current[i] = m;
                }}
                position={[0, 0.75, 0]}
              >
                <planeGeometry args={[0.6, 0.08]} />
                <meshBasicMaterial color="#220000" transparent opacity={0.7} />
              </mesh>
              <mesh
                ref={(m) => {
                  healthFillsRef.current[i] = m;
                }}
                position={[0, 0.75, 0.01]}
              >
                <planeGeometry args={[0.6, 0.06]} />
                <meshBasicMaterial
                  color={isTeamMode && enemy?.team === 'blue' ? '#4488ff' : '#ff3333'}
                />
              </mesh>
            </group>
          </RigidBody>
        );
      })}
    </>
  );
}
