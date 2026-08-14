import React, { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { bus } from '@/game/events.js';
import { gameState } from '@/game/state.js';
import { BOT, PROJECTILE_POOL_SIZE, PROJECTILE_TTL, RESPAWN_SECONDS } from '@/game/constants.js';
import {
  resolveHitZone,
  randomZone,
  computeHitDamage,
  getProtection,
  randomHitZone,
} from '@/game/hitZones.js';
import { getSelectedCharacter } from '@/game/state.js';
import { playerEffects } from '@/game/rewards.js';

// Pool projektilů (hráč i boti): recyklované meshe, ruční pohyb a kolize
// koulí, zásahové zóny podle výšky dopadu, damage a skóre.
const lookTarget = new Vector3();

export default function Projectiles() {
  const meshesRef = useRef([]); // group na slot (pozice + orientace)
  const coresRef = useRef([]); // koule projektilu
  const trailsRef = useRef([]); // světelná stopa za projektilem
  const poolRef = useRef(
    Array.from({ length: PROJECTILE_POOL_SIZE }, () => ({
      active: false,
      spawnTime: 0,
      damage: 0,
      owner: 'player',
      shooterIndex: -1,
      x: 0,
      y: -100,
      z: 0,
      dx: 0,
      dy: 0,
      dz: 0,
      speed: 15,
    }))
  );

  // Zpřístupnění výstřelu přes sdílený stav (volá Player i Bots)
  useEffect(() => {
    gameState.fireProjectile = (origin, dir, weapon, owner = 'player') => {
      // najdi volný slot; když žádný není, recykluj nultý
      let slot = -1;
      for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
        if (!poolRef.current[i].active) {
          slot = i;
          break;
        }
      }
      if (slot === -1) slot = 0;
      const proj = poolRef.current[slot];
      proj.active = true;
      proj.spawnTime = performance.now() / 1000;
      proj.damage = weapon.damage;
      proj.owner = owner;
      proj.shooterIndex = weapon.enemyIndex ?? -1;
      proj.shooterTeam = owner === 'player' ? 'blue' : weapon.team || 'red';
      proj.armorPen = weapon.armorPen ?? 0;
      proj.x = origin.x;
      proj.y = origin.y;
      proj.z = origin.z;
      proj.dx = dir.x;
      proj.dy = dir.y;
      proj.dz = dir.z;
      proj.speed = weapon.speed || 15;
      const mesh = meshesRef.current[slot];
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(origin.x, origin.y, origin.z);
        // orientace skupiny po směru letu (kvůli stopě za projektilem)
        lookTarget.set(origin.x + dir.x, origin.y + dir.y, origin.z + dir.z);
        mesh.lookAt(lookTarget);
        const color = owner === 'enemy' ? '#ff3333' : weapon.color;
        const size = weapon.size || 0.12;
        const core = coresRef.current[slot];
        if (core) {
          core.material.color.set(color);
          core.material.emissive.set(color);
          core.material.emissiveIntensity = 0.6;
          core.scale.setScalar(size / 0.1);
        }
        const trail = trailsRef.current[slot];
        if (trail) trail.material.color.set(color);
      }
    };
    return () => {
      gameState.fireProjectile = null;
    };
  }, []);

  // Restart hry — deaktivace všech projektilů
  useEffect(() => {
    const handleRestart = () => {
      for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) deactivate(i);
    };
    bus.on('restart-game', handleRestart);
    return () => bus.off('restart-game', handleRestart);
  }, []);

  useFrame((_, delta) => {
    if (gameState.phase !== 'playing' && gameState.phase !== 'respawning') return;
    const now = performance.now() / 1000;
    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const proj = poolRef.current[i];
      if (!proj.active) continue;
      // vypršela životnost
      if (now - proj.spawnTime > PROJECTILE_TTL) {
        deactivate(i);
        continue;
      }
      const step = proj.speed * delta;
      proj.x += proj.dx * step;
      proj.y += proj.dy * step;
      proj.z += proj.dz * step;
      // mimo arénu (poloviny 40×30) nebo mimo výškové pásmo
      if (
        proj.x < -20 ||
        proj.x > 20 ||
        proj.z < -15 ||
        proj.z > 15 ||
        proj.y < 0.3 ||
        proj.y > 15
      ) {
        deactivate(i);
        continue;
      }
      const mesh = meshesRef.current[i];
      if (mesh) mesh.position.set(proj.x, proj.y, proj.z);

      if (proj.owner === 'player' || proj.owner === 'enemy') {
        // Kolize s boty — přeskoč spoluhráče stejného týmu a střelce samotného
        let consumed = false;
        for (let e = 0; e < gameState.enemies.length; e++) {
          const enemy = gameState.enemies[e];
          if (!enemy?.alive || !enemy.body) continue;
          if (enemy.team === proj.shooterTeam) continue;
          if (proj.owner === 'enemy' && proj.shooterIndex === e) continue;
          if (enemy.invincibleTimer > 0) continue;
          const pos = enemy.body.translation();
          const dx = proj.x - pos.x;
          const dy = proj.y - pos.y;
          const dz = proj.z - pos.z;
          if (dx * dx + dy * dy + dz * dz < 0.36) {
            // zásahová zóna podle výšky dopadu; obličej/srdce jen zepředu —
            // porovnáváme směr letu projektilu s natočením postavy
            const bodyHeight = BOT.halfHeight * 2 + BOT.radius * 2;
            const heightRatio = (proj.y - (pos.y - bodyHeight / 2)) / bodyHeight;
            const lateral = Math.sqrt(dx * dx + dz * dz);
            const facingYaw = enemy.facingYaw ?? 0;
            const frontal =
              proj.dx * Math.sin(facingYaw) + proj.dz * Math.cos(facingYaw) < -0.2;
            let zone = resolveHitZone(heightRatio, lateral, frontal);
            // precise shot: každý hráčův zásah je headshot do obličeje
            if (proj.owner === 'player' && playerEffects.preciseTimer > 0) {
              zone = { name: 'obličej', min: 1, max: 1, protectedBy: 'helmet', headshot: true };
            }
            const hit = computeHitDamage(
              proj.damage,
              zone,
              getProtection(enemy.character),
              proj.armorPen
            );
            enemy.health -= hit.damage;
            bus.emit('hit-enemy', {
              index: e,
              damage: hit.damage,
              crit: hit.crit,
              headshot: hit.headshot,
              part: hit.zone,
              byPlayer: proj.owner === 'player',
            });
            if (enemy.health <= 0) {
              enemy.alive = false;
              enemy.respawnTimer = BOT.respawnTime;
              if (gameState.botScores[e]) gameState.botScores[e].deaths++;
              if (proj.owner === 'player') {
                gameState.score++;
                gameState.kills++;
                if (gameState.mode?.id === 'tdm') gameState.mode.teamScores.blue++;
                bus.emit('score-changed', gameState.score);
                bus.emit('enemy-killed', {
                  index: e,
                  name: enemy.character?.name,
                  crit: hit.crit,
                  headshot: hit.headshot,
                  part: hit.zone,
                });
              } else {
                // bot zabil bota — skóre týmu střelce + killfeed
                const shooter = gameState.enemies[proj.shooterIndex];
                if (shooter && gameState.botScores[proj.shooterIndex]) {
                  gameState.botScores[proj.shooterIndex].kills++;
                }
                if (gameState.mode?.id === 'tdm' && shooter) {
                  gameState.mode.teamScores[shooter.team]++;
                }
                bus.emit('bot-killed-bot', {
                  killer: shooter?.character?.nickname || 'Bot',
                  victim: enemy.character?.nickname || 'Bot',
                });
              }
            }
            deactivate(i);
            consumed = true;
            break;
          }
        }
        if (consumed) continue;
        // Kolize se vzdálenými hráči (multiplayer) — jen projektily hráče;
        // poškození aplikuje autoritativně zasažený klient přes HitEvent.
        if (proj.owner === 'player' && gameState.remotePlayers.length) {
          for (const peer of gameState.remotePlayers) {
            if (!peer.alive) continue;
            const dx = proj.x - peer.pos.x;
            const dy = proj.y - (peer.pos.y + 0.5);
            const dz = proj.z - peer.pos.z;
            if (dx * dx + dy * dy + dz * dz < 0.36) {
              const zone = randomHitZone();
              bus.emit('remote-player-hit', {
                key: peer.key,
                damage: proj.damage * zone.mult,
                crit: zone.crit,
              });
              deactivate(i);
              consumed = true;
              break;
            }
          }
        }
        if (consumed) continue;
        // Kolize s assety živého města (stromy, auta, chodci…)
        if (gameState.worldAssets?.length && gameState.damageAsset) {
          for (const asset of gameState.worldAssets) {
            if (!asset.alive) continue;
            const size = asset.def.size || { w: 1, h: 1, d: 1 };
            const radius = Math.max(size.w, size.d) / 2 + 0.25;
            const ax = proj.x - asset.x;
            const ay = proj.y - size.h / 2;
            const az = proj.z - asset.z;
            if (ax * ax + az * az < radius * radius && Math.abs(ay) < size.h / 2 + 0.4) {
              gameState.damageAsset(asset, proj.damage, proj.owner === 'player');
              deactivate(i);
              consumed = true;
              break;
            }
          }
        }
        if (consumed) continue;
      }
      if (
        proj.owner === 'enemy' &&
        proj.shooterTeam !== 'blue' &&
        gameState.phase === 'playing' &&
        !gameState.playerInvincible &&
        !gameState.gameSettings?.godMode
      ) {
        // Kolize s hráčem (střed těla ~0.5 nad pozicí kapsle)
        const dx = proj.x - gameState.playerPos.x;
        const dy = proj.y - (gameState.playerPos.y + 0.5);
        const dz = proj.z - gameState.playerPos.z;
        if (dx * dx + dy * dy + dz * dz < 0.36) {
          // zásah hráče: zóna podle výšky dopadu na kapsli, ochrana brnění/helmy
          const playerHeight = 1.4;
          const heightRatio = Math.max(
            0,
            Math.min(1, (proj.y - (gameState.playerPos.y - 0.7)) / playerHeight)
          );
          const zone = resolveHitZone(heightRatio, Math.sqrt(dx * dx + dz * dz), Math.random() < 0.6);
          const protection = getProtection(getSelectedCharacter());
          protection.armorProtect = Math.min(
            0.9,
            protection.armorProtect + (playerEffects.bonusArmor || 0)
          );
          const hit = computeHitDamage(proj.damage, zone, protection, proj.armorPen);
          gameState.playerHealth -= hit.damage;
          bus.emit('health-changed', gameState.playerHealth);
          if (gameState.playerHealth <= 0) {
            gameState.phase = 'respawning';
            gameState.playerRespawnTimer = RESPAWN_SECONDS;
            gameState.deaths++;
            const killer =
              proj.shooterIndex >= 0 && gameState.botScores[proj.shooterIndex]
                ? gameState.botScores[proj.shooterIndex].name
                : 'Bot';
            if (proj.shooterIndex >= 0 && gameState.botScores[proj.shooterIndex]) {
              gameState.botScores[proj.shooterIndex].kills++;
            }
            if (gameState.mode?.id === 'tdm') gameState.mode.teamScores.red++;
            bus.emit('player-died', { killer });
          }
          deactivate(i);
        }
      }
    }
  });

  // Vrácení projektilu do poolu (schová mesh pod mapu)
  function deactivate(index) {
    const proj = poolRef.current[index];
    proj.active = false;
    if (meshesRef.current[index]) {
      meshesRef.current[index].visible = false;
      meshesRef.current[index].position.set(0, -100 - index, 0);
    }
  }

  return (
    <>
      {Array.from({ length: PROJECTILE_POOL_SIZE }).map((_, i) => (
        <group
          key={i}
          ref={(m) => {
            meshesRef.current[i] = m;
          }}
          visible={false}
          position={[0, -100 - i, 0]}
        >
          <mesh
            ref={(m) => {
              coresRef.current[i] = m;
            }}
          >
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
          </mesh>
          {/* stopa — protažený jehlan za projektilem (lokální -z je proti směru letu) */}
          <mesh
            ref={(m) => {
              trailsRef.current[i] = m;
            }}
            position={[0, 0, -0.32]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.05, 0.55, 5]} />
            <meshBasicMaterial color="#ffff00" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
    </>
  );
}
