import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { bus } from '@/game/events.js';
import { gameState } from '@/game/state.js';
import { getModeById } from '@/game/modes.js';
import { getArena } from '@/game/lobby.js';

// Systémy herních módů: logika + minimalistické vizuály.
// gameState.mode vytváří GameScene při mountu/restartu (createModeState).

// ---------- Týmový deathmatch ----------
function TDMWatcher() {
  useFrame(() => {
    const mode = gameState.mode;
    if (!mode || mode.id !== 'tdm' || mode.finished) return;
    const target = getModeById('tdm').teamTarget;
    if (mode.teamScores.blue >= target) {
      mode.finished = true;
      bus.emit('game-over', { won: true, reason: `Modří vyhráli ${mode.teamScores.blue}:${mode.teamScores.red}!` });
    } else if (mode.teamScores.red >= target) {
      mode.finished = true;
      bus.emit('game-over', { won: false, reason: `Červení vyhráli ${mode.teamScores.red}:${mode.teamScores.blue}.` });
    }
  });
  return null;
}

// ---------- Král náměstí ----------
const ZONE_CENTER = { x: 0, z: 3 };
const ZONE_RADIUS = 4;

function KOTHSystem() {
  const ringRef = useRef();

  useFrame((state, delta) => {
    const mode = gameState.mode;
    if (!mode || mode.id !== 'koth' || mode.finished) return;
    const holdSeconds = getModeById('koth').holdSeconds;

    const pdx = gameState.playerPos.x - ZONE_CENTER.x;
    const pdz = gameState.playerPos.z - ZONE_CENTER.z;
    const playerIn =
      gameState.phase === 'playing' && Math.hypot(pdx, pdz) < ZONE_RADIUS;

    let enemyIn = false;
    for (const enemy of gameState.enemies) {
      if (!enemy?.alive || !enemy.body || enemy.team !== 'red') continue;
      const p = enemy.body.translation();
      if (Math.hypot(p.x - ZONE_CENTER.x, p.z - ZONE_CENTER.z) < ZONE_RADIUS) {
        enemyIn = true;
        break;
      }
    }

    mode.zoneContested = playerIn && enemyIn;
    mode.zoneOccupant = playerIn ? (enemyIn ? 'contested' : 'player') : enemyIn ? 'enemy' : null;

    if (playerIn && !enemyIn) mode.holdProgress += delta;
    else if (!playerIn && enemyIn) mode.holdProgress = Math.max(0, mode.holdProgress - delta * 0.75);

    if (mode.holdProgress >= holdSeconds) {
      mode.finished = true;
      bus.emit('game-over', { won: true, reason: '👑 Ovládl jsi náměstí!' });
    }

    // vizuál: barva prstence podle stavu + jemné pulzování
    if (ringRef.current) {
      const color =
        mode.zoneOccupant === 'player'
          ? '#3b82f6'
          : mode.zoneOccupant === 'contested'
            ? '#f59e0b'
            : mode.zoneOccupant === 'enemy'
              ? '#ef4444'
              : '#e2e8f0';
      ringRef.current.material.color.set(color);
      ringRef.current.material.opacity =
        0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    }
  });

  return (
    <group position={[ZONE_CENTER.x, 0.06, ZONE_CENTER.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ZONE_RADIUS - 0.35, ZONE_RADIUS, 48]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ZONE_RADIUS - 0.35, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

// ---------- Ukořistit vlajku ----------
// Základny na okrajích arény (sever/jih), dopočítávají se z aktivní mapy
function getBases() {
  const arena = getArena();
  return {
    RED_BASE: { x: 0, z: -(arena.depth / 2 - 3) },
    BLUE_BASE: { x: 0, z: arena.depth / 2 - 3 },
  };
}

function FlagVisual({ color, groupRef }) {
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.8, 6]} />
        <meshStandardMaterial color="#999999" />
      </mesh>
      <mesh position={[0.32, 1.5, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color={color} side={2} />
      </mesh>
    </group>
  );
}

function CTFSystem() {
  const redFlagRef = useRef();
  const blueFlagRef = useRef();
  const { RED_BASE, BLUE_BASE } = getBases();

  // Smrt hráče s vlajkou → vlajka se vrací na základnu
  useEffect(() => {
    const onPlayerDied = () => {
      const mode = gameState.mode;
      if (mode?.id === 'ctf' && mode.redFlagCarrier === 'player') {
        mode.redFlagCarrier = null;
        bus.emit('mode-event', { text: '🚩 Červená vlajka se vrací na základnu' });
      }
    };
    bus.on('player-died', onPlayerDied);
    return () => bus.off('player-died', onPlayerDied);
  }, []);

  useFrame(() => {
    const mode = gameState.mode;
    if (!mode || mode.id !== 'ctf' || mode.finished) return;
    const captures = getModeById('ctf').captures;

    // pozice vlajek podle nosičů
    let redX = RED_BASE.x;
    let redZ = RED_BASE.z;
    if (mode.redFlagCarrier === 'player') {
      redX = gameState.playerPos.x;
      redZ = gameState.playerPos.z;
    }
    let blueX = BLUE_BASE.x;
    let blueZ = BLUE_BASE.z;
    if (mode.blueFlagCarrier !== null) {
      const carrier = gameState.enemies[mode.blueFlagCarrier];
      if (carrier?.alive && carrier.body) {
        const p = carrier.body.translation();
        blueX = p.x;
        blueZ = p.z;
      } else {
        // nosič zemřel → vlajka zpět
        mode.blueFlagCarrier = null;
        bus.emit('mode-event', { text: '🚩 Modrá vlajka se vrací na základnu' });
      }
    }
    if (redFlagRef.current) redFlagRef.current.position.set(redX, 0, redZ);
    if (blueFlagRef.current) blueFlagRef.current.position.set(blueX, 0, blueZ);

    if (gameState.phase !== 'playing') return;

    // hráč sebere červenou vlajku
    if (mode.redFlagCarrier === null) {
      if (Math.hypot(gameState.playerPos.x - redX, gameState.playerPos.z - redZ) < 1.3) {
        mode.redFlagCarrier = 'player';
        bus.emit('mode-event', { text: '🚩 Neseš červenou vlajku! Dones ji k modré základně.' });
      }
    }
    // hráč donese vlajku domů
    if (mode.redFlagCarrier === 'player') {
      if (Math.hypot(gameState.playerPos.x - BLUE_BASE.x, gameState.playerPos.z - BLUE_BASE.z) < 2) {
        mode.redFlagCarrier = null;
        mode.captures.blue++;
        bus.emit('mode-event', { text: `🏁 Zanesení! ${mode.captures.blue}/${captures}` });
        if (mode.captures.blue >= captures) {
          mode.finished = true;
          bus.emit('game-over', { won: true, reason: '🏁 Ukořistil jsi všechny vlajky!' });
        }
      }
    }
    // červený útočník sebere modrou vlajku
    if (mode.blueFlagCarrier === null) {
      for (const enemy of gameState.enemies) {
        if (!enemy?.alive || !enemy.body || enemy.team !== 'red') continue;
        const p = enemy.body.translation();
        if (Math.hypot(p.x - blueX, p.z - blueZ) < 1.3) {
          mode.blueFlagCarrier = enemy.id;
          bus.emit('mode-event', {
            text: `🚩 ${enemy.character?.nickname || 'Bot'} ukradl modrou vlajku!`,
          });
          break;
        }
      }
    } else {
      // nosič doběhl na červenou základnu
      const carrier = gameState.enemies[mode.blueFlagCarrier];
      if (carrier?.alive && carrier.body) {
        const p = carrier.body.translation();
        if (Math.hypot(p.x - RED_BASE.x, p.z - RED_BASE.z) < 2) {
          mode.blueFlagCarrier = null;
          mode.captures.red++;
          bus.emit('mode-event', { text: `🏴 Červení zanesli! ${mode.captures.red}/${captures}` });
          if (mode.captures.red >= captures) {
            mode.finished = true;
            bus.emit('game-over', { won: false, reason: '🏴 Červení ukořistili všechny vlajky.' });
          }
        }
      }
    }
  });

  return (
    <>
      {/* základny */}
      <mesh position={[RED_BASE.x, 0.03, RED_BASE.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.25} />
      </mesh>
      <mesh position={[BLUE_BASE.x, 0.03, BLUE_BASE.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.25} />
      </mesh>
      <FlagVisual color="#ef4444" groupRef={redFlagRef} />
      <FlagVisual color="#3b82f6" groupRef={blueFlagRef} />
    </>
  );
}

// Zastřešující komponenta — podle aktivního módu zapne příslušný systém
export default function ModeSystems() {
  const modeId = gameState.mode?.id || 'dm';
  if (modeId === 'tdm') return <TDMWatcher />;
  if (modeId === 'koth') return <KOTHSystem />;
  if (modeId === 'ctf') return <CTFSystem />;
  return null;
}
