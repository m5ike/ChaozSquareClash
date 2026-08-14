import React, { Suspense, useEffect, useState } from 'react';
import { Color, Fog } from 'three';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { bus } from '@/game/events.js';
import { COLORS } from '@/game/constants.js';
import { KEYBOARD_MAP } from '@/game/keybindings.js';
import GameScene from '@/components/game/GameScene.jsx';

// Canvas s fyzikou — pauzuje simulaci při game-over a když okno ztratí fokus.
export default function GameCanvas({ onReady }) {
  const [paused, setPaused] = useState(false);

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
        shadows="soft"
        dpr={[1, 2]}
        camera={{ fov: 75, near: 0.05, far: 200, position: [0, 1.5, 10] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={(state) => {
          state.scene.background = new Color(COLORS.sky);
          state.scene.fog = new Fog(COLORS.fog, 15, 55);
          // teplejší filmová expozice (ACES tone mapping je výchozí)
          state.gl.toneMappingExposure = 1.12;
          if (onReady) onReady(state);
          bus.emit('current-scene-ready', state);
        }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]} paused={paused}>
            <GameScene />
          </Physics>
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}
