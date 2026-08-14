import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Color, Fog } from 'three';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, PerformanceMonitor } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { bus } from '@/game/events.js';
import { KEYBOARD_MAP } from '@/game/keybindings.js';
import { resolveQuality } from '@/game/quality.js';
import { getActiveMap } from '@/game/lobby.js';
import GameScene from '@/components/game/GameScene.jsx';

// Canvas s fyzikou — pauzuje simulaci při game-over a ztrátě fokusu.
// Kvalita: high = bloom + vinětace + plné DPR, low = bez efektů, nižší DPR.
// PerformanceMonitor adaptivně snižuje DPR при poklesu FPS.
export default function GameCanvas({ onReady }) {
  const [paused, setPaused] = useState(false);
  const quality = useMemo(() => resolveQuality(), []);
  const map = useMemo(() => getActiveMap(), []);
  const [dpr, setDpr] = useState(quality === 'high' ? 1.5 : 1);

  useEffect(() => {
    const pauseOnGameOver = () => setPaused(true);
    const resumeOnRestart = () => setPaused(false);
    const resumeOnStart = () => setPaused(false);
    bus.on('game-over', pauseOnGameOver);
    bus.on('restart-game', resumeOnRestart);
    bus.on('start-game', resumeOnStart);

    const onVisibilityChange = () => setPaused(document.hidden);
    const onBlur = () => setPaused(true);
    const onFocus = () => setPaused(false);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      bus.off('game-over', pauseOnGameOver);
      bus.off('restart-game', resumeOnRestart);
      bus.off('start-game', resumeOnStart);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <Canvas
        shadows={quality === 'high' ? 'soft' : true}
        dpr={dpr}
        camera={{ fov: 75, near: 0.05, far: 200, position: [0, 1.5, 10] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={(state) => {
          state.scene.background = new Color(map.palette.sky);
          state.scene.fog = new Fog(map.palette.fog, 15, 55);
          // teplejší filmová expozice (ACES tone mapping je výchozí)
          state.gl.toneMappingExposure = 1.12;
          if (onReady) onReady(state);
          bus.emit('current-scene-ready', state);
        }}
      >
        {/* adaptivní DPR: při poklesu výkonu sniž, při rezervě vrať */}
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(quality === 'high' ? 1.5 : 1.25)}
        />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]} paused={paused}>
            <GameScene />
          </Physics>
        </Suspense>
        {quality === 'high' && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.35} luminanceThreshold={0.65} luminanceSmoothing={0.3} mipmapBlur />
            <Vignette eskil={false} offset={0.25} darkness={0.55} />
          </EffectComposer>
        )}
      </Canvas>
    </KeyboardControls>
  );
}
