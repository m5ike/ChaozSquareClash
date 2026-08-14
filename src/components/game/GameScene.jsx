import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { bus } from '@/game/events.js';
import { gameState, resetGameState } from '@/game/state.js';
import { createModeState } from '@/game/modes.js';
import { getActiveMode, getActiveSession, getArena } from '@/game/lobby.js';
import { initAudio, startAmbient } from '@/game/audio.js';
import CityMap from '@/components/game/CityMap.jsx';
import Player from '@/components/game/Player.jsx';
import Bots from '@/components/game/Bots.jsx';
import RemotePlayers from '@/components/game/RemotePlayers.jsx';
import Projectiles from '@/components/game/Projectiles.jsx';
import Pickups from '@/components/game/Pickups.jsx';
import Particles from '@/components/game/Particles.jsx';
import HitEffects from '@/components/game/HitEffects.jsx';
import FPWeapon from '@/components/game/FPWeapon.jsx';
import Ambience from '@/components/game/Ambience.jsx';
import ModeSystems from '@/components/game/ModeSystems.jsx';
import MapDetail from '@/components/game/MapDetail.jsx';
import WorldAssets from '@/components/game/WorldAssets.jsx';

// Kompozice 3D scény: obloha, osvětlení a všechny herní subsystémy.
// V multiplayeru nahrazují boty vzdálení hráči.
export default function GameScene() {
  const session = getActiveSession();
  const arena = getArena();
  const shadowHalf = Math.max(30, arena.width / 2 + 6);

  // Stav herního módu musí existovat dřív, než se mountnou Bots (render-phase init)
  if (!gameState.mode) {
    gameState.mode = createModeState(session ? 'dm' : getActiveMode().id);
    gameState.pendingModeId = null;
  }

  // Dev-only: zpřístupnění R3F stavu pro ladění (ruční advance ve skrytém tabu)
  const getThreeState = useThree((state) => state.get);
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3fGet = getThreeState;
  }, [getThreeState]);

  // Zvuk: inicializace bus listenerů + ambient (AudioContext se odemkne prvním gestem)
  useEffect(() => {
    initAudio();
    startAmbient();
  }, []);

  // Restart hry resetuje sdílený herní stav + vytvoří čerstvý stav módu
  useEffect(() => {
    const handleRestart = () => {
      resetGameState();
      gameState.mode = createModeState(session ? 'dm' : getActiveMode().id);
      gameState.pendingModeId = null;
    };
    bus.on('restart-game', handleRestart);
    return () => bus.off('restart-game', handleRestart);
  }, [session]);

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
        shadow-camera-left={-shadowHalf}
        shadow-camera-right={shadowHalf}
        shadow-camera-top={shadowHalf}
        shadow-camera-bottom={-shadowHalf}
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
      <MapDetail />
      <WorldAssets />
      {session ? <RemotePlayers session={session} /> : <Bots />}
      <ModeSystems />
      <Pickups />
      <Projectiles />
      <Player />
      <FPWeapon />
    </>
  );
}
