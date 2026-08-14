import React, { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, BallCollider } from '@react-three/rapier';
import { bus } from '@/game/events.js';
import { input, gameState, getSelectedCharacter, classifyPower } from '@/game/state.js';
import { PLAYER, BOT } from '@/game/constants.js';
import { randomHitZone } from '@/game/hitZones.js';

// First-person ovladač hráče: dynamická kapsle v Rapieru, kamera (yaw/pitch
// z myši/dotyku/gyra přes input.look), pohyb, skok, střelba, schopnosti a respawn.
export default function Player() {
  const bodyRef = useRef();
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls();
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const groundedRef = useRef(false);
  const fireCooldownRef = useRef(0);
  const weaponIndexRef = useRef(0);
  const shakeRef = useRef(0); // otřes kamery po zásahu
  const prevHealthRef = useRef(null); // pro detekci poklesu zdraví
  const timeRef = useRef(0);
  const character = getSelectedCharacter();
  const maxHealth = character?.stats.health || 100;
  const armorDefense = character?.armor?.defense || 1;

  // Propsání statů vybrané postavy do sdíleného stavu
  useEffect(() => {
    gameState.playerHealth = maxHealth;
    gameState.playerMaxHealth = maxHealth;
    gameState.playerArmor = armorDefense;
    bus.emit('health-changed', gameState.playerHealth);
  }, [maxHealth, armorDefense]);

  // Restart hry — návrat na start a reset lokálních refů
  useEffect(() => {
    const handleRestart = () => {
      weaponIndexRef.current = 0;
      if (bodyRef.current) {
        bodyRef.current.setTranslation({ x: 0, y: 2, z: 10 }, true);
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      yawRef.current = 0;
      pitchRef.current = 0;
      groundedRef.current = false;
      fireCooldownRef.current = 0;
      gameState.playerHealth = maxHealth;
      bus.emit('health-changed', gameState.playerHealth);
    };
    bus.on('restart-game', handleRestart);
    return () => bus.off('restart-game', handleRestart);
  }, [maxHealth]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body || !character) return;
    timeRef.current += delta;

    // Otřes kamery při poklesu zdraví (zásah čímkoli)
    if (prevHealthRef.current === null) prevHealthRef.current = gameState.playerHealth;
    if (gameState.playerHealth < prevHealthRef.current - 0.01) {
      shakeRef.current = 0.3;
    }
    prevHealthRef.current = gameState.playerHealth;
    if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - delta);

    // Odpočet respawnu — po vypršení návrat do hry na startovní pozici
    if (gameState.phase === 'respawning') {
      gameState.playerRespawnTimer -= delta;
      if (gameState.playerRespawnTimer <= 0) {
        gameState.playerHealth = maxHealth;
        gameState.phase = 'playing';
        body.setTranslation({ x: 0, y: 2, z: 10 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        yawRef.current = 0;
        pitchRef.current = 0;
        bus.emit('health-changed', gameState.playerHealth);
        bus.emit('player-respawned');
      }
      return;
    }
    if (gameState.phase !== 'playing') return;

    // Přepnutí zbraně (1/2/3 nebo tlačítka na mobilu)
    if (
      input.weaponSwitch >= 0 &&
      character.weapons &&
      input.weaponSwitch < character.weapons.length
    ) {
      weaponIndexRef.current = input.weaponSwitch;
      bus.emit('weapon-switched', character.weapons[weaponIndexRef.current]);
    }
    input.weaponSwitch = -1;

    // Časovače schopností a omráčení
    if (gameState.powerCooldown > 0) gameState.powerCooldown -= delta;
    if (gameState.powerActiveTimer > 0) {
      gameState.powerActiveTimer -= delta;
      if (gameState.powerActiveTimer <= 0) {
        gameState.playerInvincible = false;
        gameState.playerSpeedBoost = false;
        gameState.playerDamageBoost = false;
        gameState.powerType = null;
      }
    }
    if (gameState.enemyStunTimer > 0) gameState.enemyStunTimer -= delta;

    // Aktivace speciální schopnosti postavy
    if (input.powerPressed && gameState.powerCooldown <= 0 && character?.power) {
      const powerType = classifyPower(character);
      gameState.powerCooldown = character.power.cd || 20;
      gameState.powerType = powerType;
      switch (powerType) {
        case 'damage_all':
          for (const enemy of gameState.enemies) {
            if (!enemy?.alive) continue;
            if (enemy.team === 'blue') continue; // schopnost nezraňuje spoluhráče
            if (enemy.invincibleTimer > 0) continue;
            const damage = 25 * character.stats.dmgMult;
            enemy.health -= damage;
            bus.emit('hit-enemy', {
              index: enemy.id,
              damage,
              crit: false,
              part: 'schopnost',
            });
            if (enemy.health <= 0) {
              enemy.alive = false;
              enemy.respawnTimer = BOT.respawnTime;
              gameState.score++;
              gameState.kills++;
              if (gameState.botScores[enemy.id]) gameState.botScores[enemy.id].deaths++;
              bus.emit('score-changed', gameState.score);
              bus.emit('enemy-killed', {
                index: enemy.id,
                name: enemy.character?.name,
                crit: false,
                part: 'schopnost',
              });
            }
          }
          break;
        case 'invincible':
        case 'shield':
          gameState.playerInvincible = true;
          gameState.powerActiveTimer = 3;
          break;
        case 'heal':
          gameState.playerHealth = Math.min(
            gameState.playerMaxHealth,
            gameState.playerHealth + gameState.playerMaxHealth * 0.35
          );
          bus.emit('health-changed', gameState.playerHealth);
          break;
        case 'speed':
          gameState.playerSpeedBoost = true;
          gameState.powerActiveTimer = 5;
          break;
        case 'damage_boost':
          gameState.playerDamageBoost = true;
          gameState.powerActiveTimer = 5;
          break;
        case 'stun_all':
          gameState.enemyStunTimer = 3;
          break;
        case 'teleport':
          body.setTranslation(
            {
              x: (Math.random() - 0.5) * 30,
              y: 2,
              z: (Math.random() - 0.5) * 20,
            },
            true
          );
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          break;
      }
      bus.emit('power-activated', { type: powerType, name: character.power.name });
    }
    input.powerPressed = false;

    // Otáčení kamery — deltas z myši/dotyku/gyra, pitch omezený těsně pod ±90°
    yawRef.current -= input.look.dx;
    pitchRef.current -= input.look.dy;
    pitchRef.current = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, pitchRef.current)
    );
    input.look.dx = 0;
    input.look.dy = 0;

    // Omráčení hráče (schopnost bota) — pohyb je zablokovaný, rozhlížení ne
    if (gameState.playerStunTimer > 0) gameState.playerStunTimer -= delta;

    // Vstup pohybu: klávesnice + virtuální joystick, normalizace diagonály
    const keys = getKeys();
    let forward = 0;
    let strafe = 0;
    if (keys.forward) forward += 1;
    if (keys.backward) forward -= 1;
    if (keys.right) strafe += 1;
    if (keys.left) strafe -= 1;
    forward += input.move.y;
    strafe += input.move.x;
    const inputLen = Math.sqrt(forward * forward + strafe * strafe);
    if (inputLen > 1) {
      forward /= inputLen;
      strafe /= inputLen;
    }

    // Směrové vektory podle yaw (dopředu a doprava v rovině XZ)
    const yaw = yawRef.current;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const baseSpeed = character.stats.speed;
    const sprintSpeed = input.sprint || keys.sprint ? baseSpeed * 1.5 : baseSpeed;
    const speed = gameState.playerSpeedBoost ? sprintSpeed * 1.8 : sprintSpeed;
    const vel = body.linvel();
    const stunned = gameState.playerStunTimer > 0;
    const velX = stunned ? 0 : (strafe * rightX + forward * forwardX) * speed;
    const velZ = stunned ? 0 : (strafe * rightZ + forward * forwardZ) * speed;
    body.setLinvel({ x: velX, y: vel.y, z: velZ }, true);

    // Skok jen s kontaktem se zemí (senzor u nohou)
    if (input.jumpPressed && groundedRef.current) {
      body.setLinvel({ x: velX, y: PLAYER.jumpForce, z: velZ }, true);
    }
    input.jumpPressed = false;

    const pos = body.translation();
    // Pád mimo mapu — vrať na start
    if (pos.y < -5) {
      body.setTranslation({ x: 0, y: 2, z: 10 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    camera.position.set(pos.x, pos.y + PLAYER.eyeHeight, pos.z);
    // otřes: tlumený kmit v pitchi a rollu
    const shakeStrength = shakeRef.current / 0.3;
    const shakePitch = Math.sin(timeRef.current * 45) * 0.035 * shakeStrength;
    const shakeRoll = Math.cos(timeRef.current * 38) * 0.025 * shakeStrength;
    camera.rotation.set(
      pitchRef.current + shakePitch,
      yawRef.current,
      shakeRoll,
      'YXZ'
    );
    gameState.playerPos.set(pos.x, pos.y, pos.z);
    gameState.playerYaw = yawRef.current;
    gameState.playerPitch = pitchRef.current;

    // Střelba — drženým fire i jednorázovým firePressed, s cooldownem zbraně
    fireCooldownRef.current -= delta;
    if ((input.fire || input.firePressed) && fireCooldownRef.current <= 0) {
      const weapon = character.weapons?.[weaponIndexRef.current] || character.weapon;
      fireCooldownRef.current = weapon.cooldown;
      input.firePressed = false;
      const dir = new Vector3();
      camera.getWorldDirection(dir);
      const origin = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
      const damage =
        weapon.damage * character.stats.dmgMult * (gameState.playerDamageBoost ? 2 : 1);
      switch (weapon.type) {
        case 'projectile':
        case 'thrown':
          gameState.fireProjectile?.(
            origin,
            { x: dir.x, y: dir.y, z: dir.z },
            { ...weapon, damage }
          );
          break;
        case 'spread':
          // Brokovnice — svazek projektilů s náhodným rozptylem
          for (let i = 0; i < (weapon.count || 5); i++) {
            const spreadDir = { x: dir.x, y: dir.y, z: dir.z };
            spreadDir.x += (Math.random() - 0.5) * (weapon.spread || 0.25);
            spreadDir.y += (Math.random() - 0.5) * (weapon.spread || 0.25);
            spreadDir.z += (Math.random() - 0.5) * (weapon.spread || 0.25);
            const len = Math.sqrt(
              spreadDir.x * spreadDir.x + spreadDir.y * spreadDir.y + spreadDir.z * spreadDir.z
            );
            gameState.fireProjectile?.(
              origin,
              { x: spreadDir.x / len, y: spreadDir.y / len, z: spreadDir.z / len },
              { ...weapon, damage }
            );
          }
          break;
        case 'melee':
          meleeAttack(origin, { x: dir.x, y: dir.y, z: dir.z }, { ...weapon, damage });
          break;
      }
      bus.emit('weapon-fired', weapon);
    }
    if (fireCooldownRef.current <= 0) input.firePressed = false;
  });

  // Úder zblízka — zasáhne nepřátelské boty v dosahu zbraně v kuželu před hráčem
  function meleeAttack(origin, dir, weapon) {
    for (let i = 0; i < gameState.enemies.length; i++) {
      const enemy = gameState.enemies[i];
      if (!enemy?.alive || !enemy.body) continue;
      if (enemy.team === 'blue') continue; // spoluhráče v týmových módech nebij
      if (enemy.invincibleTimer > 0) continue;
      const enemyPos = enemy.body.translation();
      const dx = enemyPos.x - origin.x;
      const dy = enemyPos.y - origin.y;
      const dz = enemyPos.z - origin.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= weapon.range && (dx * dir.x + dy * dir.y + dz * dir.z) / (dist || 1) > 0.3) {
        const zone = randomHitZone();
        const defense = enemy.armor?.defense || 1;
        enemy.health -= weapon.damage * defense * zone.mult;
        bus.emit('hit-enemy', {
          index: i,
          damage: weapon.damage * zone.mult,
          crit: zone.crit,
          part: zone.part,
        });
        if (enemy.health <= 0) {
          enemy.alive = false;
          enemy.respawnTimer = BOT.respawnTime;
          gameState.score++;
          gameState.kills++;
          if (gameState.botScores[i]) gameState.botScores[i].deaths++;
          if (gameState.mode?.id === 'tdm') gameState.mode.teamScores.blue++;
          bus.emit('score-changed', gameState.score);
          bus.emit('enemy-killed', {
            index: i,
            name: enemy.character?.name,
            crit: zone.crit,
            part: zone.part,
          });
        }
      }
    }
  }

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      lockRotations
      canSleep={false}
      colliders={false}
      name="player"
      position={[0, 2, 10]}
    >
      <CapsuleCollider args={[PLAYER.halfHeight, PLAYER.radius]} />
      {/* Senzor u nohou pro detekci země (= -(halfHeight + radius + 0.02)) */}
      <BallCollider
        args={[0.1]}
        position={[0, -0.8200000000000001, 0]}
        sensor
        onIntersectionEnter={() => {
          groundedRef.current = true;
        }}
        onIntersectionExit={() => {
          groundedRef.current = false;
        }}
      />
    </RigidBody>
  );
}
