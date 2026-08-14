import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { bus } from '@/game/events.js';
import { gameState } from '@/game/state.js';

// Velikost poolu značek zásahu.
const HIT_POOL_SIZE = 12;
// Pool letících jisker (částice s gravitací).
const SPARK_POOL_SIZE = 28;
const SPARK_COLORS = ['#ffdd55', '#ff8833', '#ff5522'];

// Efekty zásahů: záblesk před kamerou při výstřelu, oranžové "jádro" zásahu
// a výtrysk jisker s gravitací (při kritickém zásahu výraznější).
export default function HitEffects() {
  const { camera } = useThree();
  const flashRef = useRef();
  const flashLightRef = useRef();
  const flashTimer = useRef(0);
  const markerRefs = useRef([]);
  const markerTimers = useRef(new Array(HIT_POOL_SIZE).fill(0));
  const sparkRefs = useRef([]);
  const sparksRef = useRef(
    Array.from({ length: SPARK_POOL_SIZE }, () => ({
      life: 0,
      maxLife: 0.4,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    }))
  );

  useEffect(() => {
    const onWeaponFired = () => {
      flashTimer.current = 0.08;
    };
    const onHitEnemy = (event) => {
      const enemy = gameState.enemies[event.index];
      if (!enemy?.body) return;
      const pos = enemy.body.translation();
      // najdi volnou značku v poolu
      for (let i = 0; i < HIT_POOL_SIZE; i++) {
        if (markerTimers.current[i] <= 0) {
          markerTimers.current[i] = 0.25;
          const marker = markerRefs.current[i];
          if (marker) {
            marker.visible = true;
            marker.position.set(pos.x, pos.y + 0.5, pos.z);
            marker.scale.setScalar(0.1);
          }
          break;
        }
      }
      // výtrysk jisker — kritický zásah jich má víc a rychlejších
      let toSpawn = event.crit ? 10 : 6;
      for (let i = 0; i < SPARK_POOL_SIZE && toSpawn > 0; i++) {
        const spark = sparksRef.current[i];
        if (spark.life > 0) continue;
        toSpawn--;
        spark.maxLife = 0.3 + Math.random() * 0.2;
        spark.life = spark.maxLife;
        spark.x = pos.x;
        spark.y = pos.y + 0.5;
        spark.z = pos.z;
        const angle = Math.random() * Math.PI * 2;
        const speed = (event.crit ? 3 : 2) + Math.random() * 2;
        spark.vx = Math.cos(angle) * speed * 0.7;
        spark.vy = 1.5 + Math.random() * 2.5;
        spark.vz = Math.sin(angle) * speed * 0.7;
        const mesh = sparkRefs.current[i];
        if (mesh) {
          mesh.visible = true;
          mesh.material.color.set(
            SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0]
          );
        }
      }
    };
    bus.on('weapon-fired', onWeaponFired);
    bus.on('hit-enemy', onHitEnemy);
    return () => {
      bus.off('weapon-fired', onWeaponFired);
      bus.off('hit-enemy', onHitEnemy);
    };
  }, []);

  useFrame((_, delta) => {
    // záblesk výstřelu před kamerou
    if (flashTimer.current > 0) {
      flashTimer.current -= delta;
      if (flashRef.current) {
        flashRef.current.visible = true;
        flashRef.current.position.copy(camera.position);
        flashRef.current.quaternion.copy(camera.quaternion);
        flashRef.current.translateZ(-0.5);
      }
      if (flashLightRef.current) {
        flashLightRef.current.position.copy(camera.position);
        flashLightRef.current.intensity = 8;
      }
    } else {
      if (flashRef.current) flashRef.current.visible = false;
      if (flashLightRef.current) flashLightRef.current.intensity = 0;
    }
    // rozpínající se a mizející značky zásahů
    for (let i = 0; i < HIT_POOL_SIZE; i++) {
      if (markerTimers.current[i] > 0) {
        markerTimers.current[i] -= delta;
        const marker = markerRefs.current[i];
        if (marker) {
          const life = Math.max(0, markerTimers.current[i] / 0.25);
          marker.scale.setScalar(0.1 + (1 - life) * 0.4);
          marker.material.opacity = life * 0.8;
        }
        if (markerTimers.current[i] <= 0 && marker) marker.visible = false;
      }
    }
    // let jisker — gravitace, útlum a zmenšování
    for (let i = 0; i < SPARK_POOL_SIZE; i++) {
      const spark = sparksRef.current[i];
      if (spark.life <= 0) continue;
      spark.life -= delta;
      const mesh = sparkRefs.current[i];
      if (spark.life <= 0) {
        if (mesh) mesh.visible = false;
        continue;
      }
      spark.vy -= 12 * delta;
      spark.x += spark.vx * delta;
      spark.y += spark.vy * delta;
      spark.z += spark.vz * delta;
      if (mesh) {
        const life = spark.life / spark.maxLife;
        mesh.position.set(spark.x, spark.y, spark.z);
        mesh.scale.setScalar(0.5 + life * 0.6);
        mesh.material.opacity = life;
      }
    }
  });

  return (
    <>
      <mesh ref={flashRef} visible={false}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffdd44" transparent opacity={0.9} />
      </mesh>
      <pointLight ref={flashLightRef} intensity={0} distance={6} color="#ffcc44" />
      {Array.from({ length: HIT_POOL_SIZE }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            markerRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
        </mesh>
      ))}
      {Array.from({ length: SPARK_POOL_SIZE }).map((_, i) => (
        <mesh
          key={`spark-${i}`}
          ref={(el) => {
            sparkRefs.current[i] = el;
          }}
          visible={false}
        >
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color="#ffdd55" transparent opacity={1} />
        </mesh>
      ))}
    </>
  );
}
