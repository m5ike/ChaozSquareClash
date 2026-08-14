import { useRef, useMemo, useState } from 'react';
import { CanvasTexture, NearestFilter } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { gameState } from '@/game/state.js';
import CharacterModel from '@/components/game/CharacterModel.jsx';

// Jmenovka hráče jako canvas textura (cache podle textu)
const labelCache = {};
function getNameTexture(nickname) {
  if (labelCache[nickname]) return labelCache[nickname];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, 256, 48);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nickname.slice(0, 18), 128, 25);
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  labelCache[nickname] = texture;
  return texture;
}

// Jeden vzdálený hráč: interpolovaný pohyb, model postavy, jmenovka a lišta zdraví
function RemotePlayer({ peer }) {
  const groupRef = useRef();
  const yawRef = useRef();
  const labelRef = useRef();
  const barFillRef = useRef();
  const { camera } = useThree();
  const anim = useMemo(() => ({ current: { speed: 0, attackTimer: 0, dead: false, deadTime: 0, flashTimer: 0 } }), []);
  const nameTexture = useMemo(() => getNameTexture(peer.nickname || 'Hráč'), [peer.nickname]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    // interpolace pozice (broadcast je 4 Hz, vyhlazujeme lerpo­váním)
    const before = group.position.clone();
    group.position.lerp(peer.targetPos, Math.min(1, delta * 8));
    peer.pos.copy(group.position);
    // rychlost pohybu → animace chůze
    const moved = group.position.distanceTo(before) / Math.max(delta, 0.001);
    anim.current.speed = Math.min(1, moved / 3);
    anim.current.dead = !peer.alive;
    // plynulé dotočení modelu
    if (yawRef.current) {
      let diff = peer.targetYaw - yawRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yawRef.current.rotation.y += diff * Math.min(1, delta * 10);
    }
    // billboarding jmenovky a lišty zdraví
    if (labelRef.current) labelRef.current.quaternion.copy(camera.quaternion);
    if (barFillRef.current) {
      barFillRef.current.quaternion.copy(camera.quaternion);
      const ratio = Math.max(0, peer.health / peer.maxHealth);
      barFillRef.current.scale.x = ratio;
    }
    group.visible = peer.alive;
  });

  return (
    <group ref={groupRef} position={[peer.pos.x, peer.pos.y, peer.pos.z]}>
      <group position={[0, -0.7, 0]}>
        <group ref={yawRef}>
          <CharacterModel character={peer.character} animRef={anim} />
        </group>
      </group>
      <mesh ref={labelRef} position={[0, 1.15, 0]}>
        <planeGeometry args={[1.3, 0.24]} />
        <meshBasicMaterial map={nameTexture} transparent />
      </mesh>
      <mesh ref={barFillRef} position={[0, 0.95, 0]}>
        <planeGeometry args={[0.6, 0.06]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
    </group>
  );
}

// Vzdálení hráči v multiplayerové místnosti (nahrazují boty)
export default function RemotePlayers() {
  const [, force] = useState(0);
  const countRef = useRef(0);

  // re-render při změně počtu peerů (pole se vyměňuje v transportu)
  useFrame(() => {
    if (gameState.remotePlayers.length !== countRef.current) {
      countRef.current = gameState.remotePlayers.length;
      force((n) => n + 1);
    }
  });

  return (
    <>
      {gameState.remotePlayers.map((peer) => (
        <RemotePlayer key={peer.key} peer={peer} />
      ))}
    </>
  );
}
