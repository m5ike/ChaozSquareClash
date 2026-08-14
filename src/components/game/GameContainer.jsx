import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { bus } from '@/game/events.js';
import GameCanvas from '@/components/game/GameCanvas.jsx';

// Obal herního plátna — přes ref zpřístupňuje R3F state (game) a aktivní scénu.
const GameContainer = memo(
  forwardRef(function GameContainer(props, ref) {
    const { className = '', currentActiveScene } = props;
    const gameRef = useRef(null);
    const sceneRef = useRef(null);
    const currentActiveSceneRef = useRef(currentActiveScene);

    useEffect(() => {
      currentActiveSceneRef.current = currentActiveScene;
    }, [currentActiveScene]);

    useImperativeHandle(
      ref,
      () => ({
        get game() {
          return gameRef.current;
        },
        get scene() {
          return sceneRef.current;
        },
      }),
      []
    );

    useLayoutEffect(() => {
      const onSceneReady = (scene) => {
        sceneRef.current = scene;
        if (typeof currentActiveSceneRef.current === 'function') {
          currentActiveSceneRef.current(scene);
        }
      };
      bus.on('current-scene-ready', onSceneReady);
      return () => {
        bus.off('current-scene-ready', onSceneReady);
      };
    }, []);

    return (
      <div id="game-container" className={['game-container', className].filter(Boolean).join(' ')}>
        <GameCanvas
          onReady={(game) => {
            gameRef.current = game;
          }}
        />
      </div>
    );
  })
);

export default GameContainer;
