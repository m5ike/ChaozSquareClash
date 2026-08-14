import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import CharacterModel from '@/components/game/CharacterModel.jsx';

// Pomalu rotující podstavec s modelem — lehká chůze na místě, ať je vidět animace
function Turntable({ character }) {
  const groupRef = useRef();
  const anim = useMemo(
    () => ({ current: { speed: 0.35, attackTimer: 0, dead: false, deadTime: 0, flashTimer: 0 } }),
    []
  );
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.9;
  });
  return (
    <group ref={groupRef} position={[0, -0.72, 0]}>
      <CharacterModel character={character} animRef={anim} />
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, 24]} />
        <meshStandardMaterial color="#1c2333" />
      </mesh>
    </group>
  );
}

// Malý 3D náhled postavy do detail panelu na Home.
export default function CharacterPreview({ character }) {
  if (!character) return null;
  return (
    <Canvas
      dpr={1}
      camera={{ fov: 36, position: [0, 0.25, 2.9] }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.65} color="#8090b0" />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#ffd9a0" />
      <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#4060a0" />
      <Turntable character={character} />
    </Canvas>
  );
}
