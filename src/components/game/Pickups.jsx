import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { bus } from '@/game/events.js';
import { gameState } from '@/game/state.js';
import { PICKUP_SPOTS } from '@/data/mapLayout.js';

// Kolik zdraví lékárnička doplní.
const HEAL_AMOUNT = 35;
// Za kolik sekund se sebraná lékárnička objeví znovu.
const RESPAWN_TIME = 12;
// Druhá mocnina sběrné vzdálenosti (poloměr 1 m).
const PICKUP_RADIUS_SQ = 1;

// Lékárničky — rotující zelené kříže na pevných místech mapy.
export default function Pickups() {
  const crossRefs = useRef([]);
  const active = useRef(PICKUP_SPOTS.map(() => true));
  const respawnTimers = useRef(PICKUP_SPOTS.map(() => 0));
  const time = useRef(0);

  useEffect(() => {
    const onRestart = () => {
      active.current = PICKUP_SPOTS.map(() => true);
      respawnTimers.current = PICKUP_SPOTS.map(() => 0);
      for (let i = 0; i < PICKUP_SPOTS.length; i++) {
        if (crossRefs.current[i]) crossRefs.current[i].visible = true;
      }
    };
    bus.on('restart-game', onRestart);
    return () => bus.off('restart-game', onRestart);
  }, []);

  useFrame((_, delta) => {
    if (gameState.phase !== 'playing') return;
    time.current += delta * 2;
    for (let i = 0; i < PICKUP_SPOTS.length; i++) {
      const [spotX, , spotZ] = PICKUP_SPOTS[i];
      const cross = crossRefs.current[i];
      if (!active.current[i]) {
        // čekání na respawn
        respawnTimers.current[i] -= delta;
        if (respawnTimers.current[i] <= 0) {
          active.current[i] = true;
          if (cross) cross.visible = true;
        }
      } else {
        // pohupování a rotace
        if (cross) {
          cross.position.y = 0.5 + Math.sin(time.current + i) * 0.15;
          cross.rotation.y += delta * 1.5;
        }
        // sebrání hráčem
        const dx = gameState.playerPos.x - spotX;
        const dz = gameState.playerPos.z - spotZ;
        if (dx * dx + dz * dz < PICKUP_RADIUS_SQ) {
          active.current[i] = false;
          respawnTimers.current[i] = RESPAWN_TIME;
          if (cross) cross.visible = false;
          gameState.playerHealth = Math.min(gameState.playerMaxHealth, gameState.playerHealth + HEAL_AMOUNT);
          bus.emit('health-changed', gameState.playerHealth);
        }
      }
    }
  });

  return (
    <>
      {PICKUP_SPOTS.map((spot, i) => (
        <group key={i} position={spot}>
          <group
            ref={(el) => {
              crossRefs.current[i] = el;
            }}
            position={[0, 0.5, 0]}
          >
            <mesh>
              <boxGeometry args={[0.35, 0.1, 0.1]} />
              <meshStandardMaterial
                color="#22ff66"
                emissive="#22ff66"
                emissiveIntensity={0.8}
                transparent
                opacity={0.85}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[0.1, 0.35, 0.1]} />
              <meshStandardMaterial
                color="#22ff66"
                emissive="#22ff66"
                emissiveIntensity={0.8}
                transparent
                opacity={0.85}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[0.1, 0.1, 0.35]} />
              <meshStandardMaterial
                color="#22ff66"
                emissive="#22ff66"
                emissiveIntensity={0.8}
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>
          <pointLight position={[0, 0.5, 0]} intensity={2} distance={4} color="#22ff66" />
        </group>
      ))}
    </>
  );
}
