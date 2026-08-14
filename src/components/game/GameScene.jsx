import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { bus } from '@/game/events.js';
import { resetGameState } from '@/game/state.js';
import CityMap from '@/components/game/CityMap.jsx';
import Player from '@/components/game/Player.jsx';
import Bots from '@/components/game/Bots.jsx';
import Projectiles from '@/components/game/Projectiles.jsx';
import Pickups from '@/components/game/Pickups.jsx';
import Particles from '@/components/game/Particles.jsx';
import HitEffects from '@/components/game/HitEffects.jsx';
import FPWeapon from '@/components/game/FPWeapon.jsx';
import Ambience from '@/components/game/Ambience.jsx';

// Kompozice 3D scény: obloha, osvětlení (slunce + výplňová světla)
// a všechny herní subsystémy.
export default function GameScene() {
  // Dev-only: zpřístupnění R3F stavu pro ladění (ruční advance ve skrytém tabu)
  const getThreeState = useThree((state) => state.get);
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3fGet = getThreeState;
  }, [getThreeState]);

  // Restart hry resetuje sdílený herní stav
  useEffect(() => {
    const handleRestart = () => {
      resetGameState();
    };
    bus.on('restart-game', handleRestart);
    return () => bus.off('restart-game', handleRestart);
  }, []);

  return (
    <>
      <Sky sunPosition={[20, 30, 10]} turbidity={6} rayleigh={1.2} />
      {/* Hlavní slunce se stíny přes celé náměstí */}
      <directionalLight
        position={[15, 25, 8]}
        intensity={2.2}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0005}
      />
      <ambientLight intensity={0.22} color="#506080" />
      <hemisphereLight args={['#6090c0', '#403020', 0.55]} />
      {/* Studené protisvětlo */}
      <directionalLight position={[-10, 8, -5]} intensity={0.35} color="#4060a0" />
      <Ambience />
      <Particles />
      <HitEffects />
      <CityMap />
      <Bots />
      <Pickups />
      <Projectiles />
      <Player />
      <FPWeapon />
    </>
  );
}
