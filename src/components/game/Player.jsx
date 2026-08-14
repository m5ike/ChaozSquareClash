import React, { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, BallCollider } from '@react-three/rapier';
import { bus } from '@/game/events.js';
import { input, gameState, getSelectedCharacter, classifyPower } from '@/game/state.js';
import { PLAYER, BOT } from '@/game/constants.js';
import {
  HIT_ZONES,
  resolveHitZone,
  computeHitDamage,
  getProtection,
} from '@/game/hitZones.js';
import {
  SLASH_TRAJECTORIES,
  SLASH_PRESS_WINDOW_MS,
  effectiveSpread,
} from '@/game/weaponsConfig.js';
import { playerEffects, tickPlayerEffects } from '@/game/rewards.js';
import { BODY_GESTURES, FACE_GESTURES, randomGesture, getAutoGestureInterval } from '@/game/gestures.js';

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
  const ammoRef = useRef({}); // stav zásobníků per slot: {mag, reserve}
  const reloadRef = useRef({ timer: 0, slot: -1 }); // probíhající přebíjení
  const slashRef = useRef({
    collecting: false,
    count: 0,
    deadline: 0,
    swinging: 0,
    duration: 0,
    trajIndex: 0,
    didDamage: true,
  });
  const gestureCycleRef = useRef({ body: 0, face: 0 });
  const autoGestureRef = useRef(getAutoGestureInterval());
  const character = getSelectedCharacter();
  const maxHealth = character?.stats.health || 100;
  const armorDefense = character?.armor?.defense || 1;

  // Naplnění zásobníků podle konfigurace zbraní
  function refillAmmo() {
    const weapons = character?.weapons || [];
    for (let i = 0; i < weapons.length; i++) {
      const w = weapons[i];
      if (w.magSize) {
        ammoRef.current[i] = { mag: w.magSize, reserve: w.magSize * ((w.magazines || 1) - 1) };
      }
    }
    reloadRef.current = { timer: 0, slot: -1 };
    emitAmmo();
  }

  function emitAmmo() {
    const idx = weaponIndexRef.current;
    const w = character?.weapons?.[idx];
    const ammo = ammoRef.current[idx];
    bus.emit('ammo-changed', {
      slot: idx,
      infinite: !w?.magSize,
      mag: ammo?.mag ?? 0,
      reserve: ammo?.reserve ?? 0,
    });
  }

  // Propsání statů vybrané postavy do sdíleného stavu
  useEffect(() => {
    gameState.playerHealth = maxHealth;
    gameState.playerMaxHealth = maxHealth;
    gameState.playerArmor = armorDefense;
    bus.emit('health-changed', gameState.playerHealth);
    refillAmmo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      refillAmmo();
      slashRef.current.collecting = false;
      slashRef.current.swinging = 0;
    };
    bus.on('restart-game', handleRestart);
    return () => bus.off('restart-game', handleRestart);
  }, [maxHealth]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body || !character) return;
    timeRef.current += delta;

    // Časované efekty odměn/penalizací (damage boost, no aim, freeze…)
    tickPlayerEffects(delta);

    // Automatická gesta jednou za nastavený interval (0 = vypnuto)
    const autoInterval = getAutoGestureInterval();
    if (autoInterval > 0 && gameState.phase === 'playing') {
      autoGestureRef.current -= delta;
      if (autoGestureRef.current <= 0) {
        autoGestureRef.current = autoInterval;
        bus.emit('player-gesture', { id: randomGesture().id, auto: true });
      }
    }

    // Gesta klávesou — cyklí seznamem
    if (input.gesturePressed) {
      input.gesturePressed = false;
      const g = BODY_GESTURES[gestureCycleRef.current.body % BODY_GESTURES.length];
      gestureCycleRef.current.body++;
      bus.emit('player-gesture', { id: g.id });
    }
    if (input.faceGesturePressed) {
      input.faceGesturePressed = false;
      const g = FACE_GESTURES[gestureCycleRef.current.face % FACE_GESTURES.length];
      gestureCycleRef.current.face++;
      bus.emit('player-gesture', { id: g.id });
    }

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
      reloadRef.current.timer = 0; // výměna zbraně ruší přebíjení
      slashRef.current.collecting = false;
      bus.emit('weapon-switched', character.weapons[weaponIndexRef.current]);
      emitAmmo();
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
    // stance: dřep zpomalí a sníží, plazení ještě víc
    const stance = keys.crawl ? 'crawl' : keys.crouch ? 'crouch' : 'stand';
    const stanceMult = stance === 'crawl' ? 0.25 : stance === 'crouch' ? 0.5 : 1;
    const speed = (gameState.playerSpeedBoost ? sprintSpeed * 1.8 : sprintSpeed) * stanceMult;
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

    const eyeHeight = stance === 'crawl' ? 0.08 : stance === 'crouch' ? 0.38 : PLAYER.eyeHeight;
    camera.position.set(pos.x, pos.y + eyeHeight, pos.z);
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

    // ---------------- Střelba, munice a sečné zbraně ----------------
    fireCooldownRef.current -= delta;
    const weaponIndex = weaponIndexRef.current;
    const weapon = character.weapons?.[weaponIndex] || character.weapon;
    const now = timeRef.current;

    // Průběh přebíjení
    if (reloadRef.current.timer > 0) {
      reloadRef.current.timer -= delta;
      if (reloadRef.current.timer <= 0) {
        const slot = reloadRef.current.slot;
        const w = character.weapons?.[slot];
        const ammo = ammoRef.current[slot];
        if (w?.magSize && ammo) {
          const take = Math.min(w.magSize - ammo.mag, ammo.reserve);
          ammo.mag += take;
          ammo.reserve -= take;
        }
        bus.emit('reload-finished');
        emitAmmo();
      }
    }

    // Ruční přebíjení (klávesa R)
    if (input.reloadPressed) {
      input.reloadPressed = false;
      const ammo = ammoRef.current[weaponIndex];
      if (
        weapon.magSize &&
        ammo &&
        ammo.mag < weapon.magSize &&
        ammo.reserve > 0 &&
        reloadRef.current.timer <= 0
      ) {
        startReload(weaponIndex, weapon);
      }
    }

    // Penalizace „no gun" — nelze útočit
    if (playerEffects.noGunTimer > 0) {
      input.firePressed = false;
      input.fire = false;
    }

    if (weapon.slash) {
      // --- Sečná zbraň: počet stisků v okně vybírá trajektorii ---
      const slash = slashRef.current;
      if (input.firePressed && slash.swinging <= 0 && fireCooldownRef.current <= 0) {
        if (!slash.collecting) {
          slash.collecting = true;
          slash.count = 1;
          slash.deadline = now + SLASH_PRESS_WINDOW_MS / 1000;
        } else {
          slash.count++;
        }
        bus.emit('slash-count', {
          count: Math.min(slash.count, weapon.slash.trajectories),
        });
        input.firePressed = false;
      }
      if (slash.collecting && now >= slash.deadline) {
        slash.collecting = false;
        const trajIndex = Math.min(slash.count, weapon.slash.trajectories) - 1;
        const trajectory = SLASH_TRAJECTORIES[trajIndex];
        slash.trajIndex = trajIndex;
        slash.duration = trajectory.duration;
        slash.swinging = trajectory.duration;
        slash.didDamage = false;
        fireCooldownRef.current = weapon.cooldown + trajectory.duration;
        bus.emit('slash-started', { trajectory: trajIndex, weapon, duration: trajectory.duration });
        bus.emit('weapon-fired', weapon);
      }
      if (slash.swinging > 0) {
        slash.swinging -= delta;
        // úder aplikujeme v polovině švihu
        if (!slash.didDamage && slash.swinging <= slash.duration * 0.5) {
          slash.didDamage = true;
          const dir = new Vector3();
          camera.getWorldDirection(dir);
          slashDamage(
            { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            { x: dir.x, y: dir.y, z: dir.z },
            weapon,
            SLASH_TRAJECTORIES[slash.trajIndex]
          );
        }
      }
      input.fire = false;
    } else if (
      (input.fire || input.firePressed) &&
      fireCooldownRef.current <= 0 &&
      reloadRef.current.timer <= 0
    ) {
      // --- Střelné zbraně s municí ---
      const ammo = ammoRef.current[weaponIndex];
      if (weapon.magSize && ammo && ammo.mag <= 0) {
        input.firePressed = false;
        if (ammo.reserve > 0) startReload(weaponIndex, weapon);
      } else {
        fireCooldownRef.current = weapon.cooldown;
        input.firePressed = false;
        const dir = new Vector3();
        camera.getWorldDirection(dir);
        const origin = {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        };
        const special = playerEffects.specialWeaponUntil > 0;
        const damage =
          weapon.damage *
          character.stats.dmgMult *
          (gameState.playerDamageBoost ? 2 : 1) *
          playerEffects.damageMultValue *
          (special ? 3 : 1);
        // no aim: střely letí úplně mimo
        const noAim = playerEffects.noAimTimer > 0;
        const spread = effectiveSpread(weapon) + (noAim ? 0.6 : 0);
        if (weapon.type === 'spread') {
          // Brokovnice — svazek broků s rozptylem podle přesnosti
          for (let i = 0; i < (weapon.count || 5); i++) {
            const spreadDir = {
              x: dir.x + (Math.random() - 0.5) * spread * 2,
              y: dir.y + (Math.random() - 0.5) * spread * 2,
              z: dir.z + (Math.random() - 0.5) * spread * 2,
            };
            const len = Math.hypot(spreadDir.x, spreadDir.y, spreadDir.z) || 1;
            gameState.fireProjectile?.(
              origin,
              { x: spreadDir.x / len, y: spreadDir.y / len, z: spreadDir.z / len },
              { ...weapon, damage, color: special ? '#ffd700' : weapon.color }
            );
          }
        } else {
          // Jednotlivý projektil — odchylka podle přesnosti
          const devDir = {
            x: dir.x + (Math.random() - 0.5) * spread,
            y: dir.y + (Math.random() - 0.5) * spread,
            z: dir.z + (Math.random() - 0.5) * spread,
          };
          const len = Math.hypot(devDir.x, devDir.y, devDir.z) || 1;
          gameState.fireProjectile?.(
            origin,
            { x: devDir.x / len, y: devDir.y / len, z: devDir.z / len },
            { ...weapon, damage, color: special ? '#ffd700' : weapon.color }
          );
        }
        if (weapon.magSize && ammo && !special) {
          ammo.mag--;
          emitAmmo();
          if (ammo.mag <= 0 && ammo.reserve > 0) startReload(weaponIndex, weapon);
        }
        bus.emit('weapon-fired', weapon);
      }
    }
    if (fireCooldownRef.current <= 0) input.firePressed = false;
  });

  // Start přebíjení zásobníku
  function startReload(slot, weapon) {
    reloadRef.current = { timer: weapon.reloadCooldown || 1.5, slot };
    bus.emit('reload-started', { duration: weapon.reloadCooldown || 1.5 });
  }

  // Sečný úder — zasáhne nepřátele v dosahu čepele; zóna poranění podle
  // trajektorie: bodnutí na hlavu → obličej/hlava, na tělo → srdce/tělo,
  // rozmach → pásmo tělo–hlava podle výšky průchodu čepele.
  function slashDamage(origin, dir, weapon, trajectory) {
    if (playerEffects.noAimTimer > 0) return; // no aim — rány jdou vedle
    const damage =
      weapon.damage *
      character.stats.dmgMult *
      (gameState.playerDamageBoost ? 2 : 1) *
      playerEffects.damageMultValue;
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
        // frontální zásah = útok proti natočení protivníka
        const facingYaw = enemy.facingYaw ?? 0;
        const frontal = dir.x * Math.sin(facingYaw) + dir.z * Math.cos(facingYaw) < -0.2;
        let zone;
        if (trajectory.zone === 'head') {
          zone = frontal ? HIT_ZONES.oblicej : HIT_ZONES.hlava;
        } else if (trajectory.zone === 'body') {
          zone = frontal && Math.random() < 0.3 ? HIT_ZONES.srdce : HIT_ZONES.telo;
        } else {
          // rozmach: čepel prochází pásmem tělo → hlava
          zone = resolveHitZone(0.45 + Math.random() * 0.5, 0.05 + Math.random() * 0.2, frontal);
        }
        const hit = computeHitDamage(damage, zone, getProtection(enemy.character), 0.1);
        enemy.health -= hit.damage;
        bus.emit('hit-enemy', {
          index: i,
          damage: hit.damage,
          crit: hit.crit,
          headshot: hit.headshot,
          part: hit.zone,
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
            crit: hit.crit,
            headshot: hit.headshot,
            part: hit.zone,
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
