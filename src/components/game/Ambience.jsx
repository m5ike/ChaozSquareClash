import { useMemo, useRef } from 'react';
import { CanvasTexture, NearestFilter, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { getActiveMap } from '@/game/lobby.js';

// Atmosférické prvky náměstí: driftující mraky, vlající české vlajky
// na střechách a tryskající voda v kašně. Čistě vizuální — žádné collidery.

// --- Mraky -----------------------------------------------------------------
const CLOUDS = [
  { pos: [-30, 24, -20], scale: [7, 1.6, 3.2], speed: 0.55 },
  { pos: [-8, 27, -32], scale: [9, 1.8, 4], speed: 0.4 },
  { pos: [14, 25, -12], scale: [6, 1.4, 3], speed: 0.65 },
  { pos: [28, 28, 8], scale: [10, 2, 4.5], speed: 0.35 },
  { pos: [-20, 26, 18], scale: [8, 1.7, 3.6], speed: 0.5 },
  { pos: [4, 29, 30], scale: [7.5, 1.5, 3], speed: 0.45 },
];

function Clouds() {
  const groupRefs = useRef([]);
  useFrame((_, delta) => {
    for (let i = 0; i < CLOUDS.length; i++) {
      const cloud = groupRefs.current[i];
      if (!cloud) continue;
      cloud.position.x += CLOUDS[i].speed * delta;
      if (cloud.position.x > 60) cloud.position.x = -60;
    }
  });
  return (
    <>
      {CLOUDS.map((cloud, i) => (
        <group
          key={i}
          ref={(g) => {
            groupRefs.current[i] = g;
          }}
          position={cloud.pos}
        >
          {/* dvojice překrytých kvádrů působí jako kupovitý mrak */}
          <mesh scale={cloud.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#f4f7fb" transparent opacity={0.85} fog={false} />
          </mesh>
          <mesh position={[cloud.scale[0] * 0.28, cloud.scale[1] * 0.4, 0]} scale={[cloud.scale[0] * 0.55, cloud.scale[1] * 0.9, cloud.scale[2] * 0.8]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} fog={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// --- České vlajky ----------------------------------------------------------
function useCzechFlagTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 96, 32);
    ctx.fillStyle = '#d7141a';
    ctx.fillRect(0, 32, 96, 32);
    ctx.fillStyle = '#11457e';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(48, 32);
    ctx.lineTo(0, 64);
    ctx.closePath();
    ctx.fill();
    const texture = new CanvasTexture(canvas);
    texture.magFilter = NearestFilter;
    return texture;
  }, []);
}

const FLAG_SPOTS = [
  { pos: [-5, 10.9, -13.6], rotY: 0 },
  { pos: [14, 13.3, -13.6], rotY: 0 },
  { pos: [5, 8.9, 13.6], rotY: Math.PI },
];

function Flag({ position, rotY, texture, phase }) {
  const geoRef = useRef();
  useFrame(({ clock }) => {
    const geo = geoRef.current;
    if (!geo) return;
    // vlnění: výchylka roste směrem od žerdi
    const positions = geo.attributes.position;
    const t = clock.elapsedTime * 5 + phase;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const along = x / 0.9 + 0.5; // 0 u žerdi → 1 na volném konci
      positions.setZ(i, Math.sin(x * 7 + t) * 0.07 * along);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* žerď */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 6]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      {/* prapor — kotvený levým okrajem k žerdi */}
      <mesh position={[0.47, 0.28, 0]} castShadow>
        <planeGeometry ref={geoRef} args={[0.9, 0.6, 8, 4]} />
        <meshStandardMaterial map={texture} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function Flags() {
  const texture = useCzechFlagTexture();
  return (
    <>
      {FLAG_SPOTS.map((spot, i) => (
        <Flag key={i} position={spot.pos} rotY={spot.rotY} texture={texture} phase={i * 1.7} />
      ))}
    </>
  );
}

// --- Kašna -----------------------------------------------------------------
const DROPLET_COUNT = 14;

function FountainSpray() {
  const dropletRefs = useRef([]);
  const params = useMemo(
    () =>
      Array.from({ length: DROPLET_COUNT }, (_, i) => ({
        angle: (i / DROPLET_COUNT) * Math.PI * 2,
        offset: (i * 0.37) % 1,
        radius: 0.55 + (i % 3) * 0.25,
      })),
    []
  );
  useFrame(({ clock }) => {
    for (let i = 0; i < DROPLET_COUNT; i++) {
      const droplet = dropletRefs.current[i];
      if (!droplet) continue;
      const p = params[i];
      const t = (clock.elapsedTime * 0.7 + p.offset) % 1;
      // parabolický oblouk od chrliče do nádrže
      droplet.position.set(
        Math.cos(p.angle) * p.radius * t,
        1.05 + 1.1 * t - 2.1 * t * t,
        6 + Math.sin(p.angle) * p.radius * t
      );
      const fade = 1 - t * 0.6;
      droplet.scale.setScalar(0.05 * fade + 0.02);
      droplet.material.opacity = 0.85 * fade;
    }
  });
  return (
    <>
      {/* vodní hladina v nádrži */}
      <mesh position={[0, 0.26, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.42, 16]} />
        <meshStandardMaterial color="#4a86c8" transparent opacity={0.75} />
      </mesh>
      {Array.from({ length: DROPLET_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            dropletRefs.current[i] = m;
          }}
        >
          <sphereGeometry args={[1, 5, 5]} />
          <meshBasicMaterial color="#8fc2f0" transparent opacity={0.8} />
        </mesh>
      ))}
    </>
  );
}

export default function Ambience() {
  const map = useMemo(() => getActiveMap(), []);
  return (
    <>
      <Clouds />
      <Flags />
      {/* tryskající voda jen tam, kde je kašna */}
      {map.centerpiece === 'fountain' && <FountainSpray />}
    </>
  );
}
