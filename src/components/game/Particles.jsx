import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Počet částic.
const PARTICLE_COUNT = 250;
// Rozměry oblasti, ve které částice poletují (šířka X, hloubka Z, výška Y).
const AREA_WIDTH = 50;
const AREA_DEPTH = 40;
const AREA_HEIGHT = 25;

// Atmosférické částice — šikmo padající proužky (déšť/prach) nad celou mapou.
// Každá částice je úsečka o dvou bodech (6 floatů), padá vlastní rychlostí
// a mírně driftuje do strany; pod zemí se recykluje zpět nahoru.
export default function Particles() {
  const geometryRef = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 6);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = (Math.random() - 0.5) * AREA_WIDTH;
      const py = Math.random() * AREA_HEIGHT;
      const pz = (Math.random() - 0.5) * AREA_DEPTH;
      arr[i * 6] = px;
      arr[i * 6 + 1] = py;
      arr[i * 6 + 2] = pz;
      arr[i * 6 + 3] = px;
      arr[i * 6 + 4] = py - 0.4;
      arr[i * 6 + 5] = pz;
    }
    return arr;
  }, []);

  const speeds = useMemo(() => Array.from({ length: PARTICLE_COUNT }, () => 12 + Math.random() * 8), []);

  useFrame((_, delta) => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const arr = geometry.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const fall = speeds[i] * delta;
      arr[i * 6 + 1] -= fall;
      arr[i * 6 + 4] -= fall;
      // boční drift (vítr)
      arr[i * 6] += delta * 1.5;
      arr[i * 6 + 3] += delta * 1.5;
      if (arr[i * 6 + 1] < 0) {
        // recyklace zpět nad mapu
        const ny = AREA_HEIGHT + Math.random() * 5;
        const nx = (Math.random() - 0.5) * AREA_WIDTH;
        const nz = (Math.random() - 0.5) * AREA_DEPTH;
        arr[i * 6] = nx;
        arr[i * 6 + 1] = ny;
        arr[i * 6 + 2] = nz;
        arr[i * 6 + 3] = nx;
        arr[i * 6 + 4] = ny - 0.4;
        arr[i * 6 + 5] = nz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#99aabb" transparent opacity={0.3} />
    </lineSegments>
  );
}
