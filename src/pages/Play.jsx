import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bus } from '@/game/events.js';
import { input, gameState, getSelectedCharacter } from '@/game/state.js';
import { RESPAWN_SECONDS, WIN_SCORE } from '@/game/constants.js';
import { getBindings, formatKeyLabel } from '@/game/keybindings.js';
import { MatchResult } from '@/api/base44Client.js';
import GameContainer from '@/components/game/GameContainer.jsx';
import OrientationWarning from '@/components/game/OrientationWarning.jsx';

// Herní stránka — 3D canvas + HUD, dotykové ovládání (joystick/gyro) a pointer lock na desktopu.
export default function Play() {
  const navigate = useNavigate();
  const character = getSelectedCharacter();
  const maxHealth = character?.stats.health || 100;

  const [health, setHealth] = useState(maxHealth);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('playing'); // 'playing' | 'respawning'
  const [gyroOn, setGyroOn] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sensitivity, setSensitivity] = useState(input.lookSensitivity);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [killfeed, setKillfeed] = useState([]);
  const [respawnTimer, setRespawnTimer] = useState(0);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [weaponIndex, setWeaponIndex] = useState(0);
  const [, forceScoreboardTick] = useState(0);
  const [powerCooldown, setPowerCooldown] = useState(0);
  const [powerActive, setPowerActive] = useState(false);
  const [hitMarker, setHitMarker] = useState(null); // {t, crit} — potvrzení zásahu u zaměřovače
  const [damageTick, setDamageTick] = useState(0); // časová značka poklesu zdraví (vinětace)
  const lastHealthRef = useRef(null);

  // Desktop = přesné polohovací zařízení (myš/trackpad)
  const isDesktopRef = useRef(typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches);
  // Levý virtuální joystick (pohyb)
  const moveStickRef = useRef({ active: false, id: null, cx: 0, cy: 0 });
  // Pravá dotyková plocha (rozhlížení + tap = výstřel)
  const lookTouchRef = useRef({ active: false, id: null, sx: 0, sy: 0, lx: 0, ly: 0, moved: false });
  const stickKnobRef = useRef(null);
  const stickBaseRef = useRef(null);
  const gyroRef = useRef({ lastBeta: null, lastGamma: null, handler: null });

  // Bez vybrané postavy zpět na výběr
  useEffect(() => {
    if (!character) navigate('/');
  }, [character, navigate]);

  // Úklid gyro handleru při odchodu ze stránky
  useEffect(
    () => () => {
      if (gyroRef.current.handler) {
        window.removeEventListener('deviceorientation', gyroRef.current.handler);
        gyroRef.current.handler = null;
      }
    },
    []
  );

  // Herní události → HUD stav
  useEffect(() => {
    const onHealthChanged = (value) => {
      // pokles zdraví → červená vinětace okrajů obrazovky
      if (lastHealthRef.current !== null && value < lastHealthRef.current - 0.01) {
        setDamageTick(Date.now());
      }
      lastHealthRef.current = value;
      setHealth(Math.max(0, value));
    };
    const onHitEnemy = (info) => setHitMarker({ t: Date.now(), crit: !!info?.crit });
    const onScoreChanged = (value) => setScore(value);
    const onEnemyKilled = (info) => {
      setKills((prev) => prev + 1);
      const critPrefix = info?.crit ? `💥 KRIT! ${info.part} ` : '';
      setKillfeed((feed) =>
        [`💀 ${critPrefix}${character?.nickname || 'Ty'} → ${info?.name || 'Bot'}`, ...feed].slice(0, 5)
      );
    };
    const onPlayerDied = (info) => {
      setPhase('respawning');
      setRespawnTimer(RESPAWN_SECONDS);
      setDeaths((prev) => prev + 1);
      setKillfeed((feed) =>
        [`💀 ${info?.killer || 'Bot'} → ${character?.nickname || 'Ty'}`, ...feed].slice(0, 5)
      );
      // Průběžné uložení výsledku zápasu (best-effort)
      MatchResult.create({
        character_id: character?.id || '',
        character_name: character?.name || '',
        score: gameState.score,
        kills: gameState.kills,
        deaths: gameState.deaths,
        is_bot: false,
      }).catch(() => {});
    };
    const onPlayerRespawned = () => {
      setPhase('playing');
      setHealth(maxHealth);
    };
    const onWeaponSwitched = (weapon) => {
      if (character?.weapons) {
        const index = character.weapons.indexOf(weapon);
        if (index >= 0) setWeaponIndex(index);
      }
    };
    bus.on('health-changed', onHealthChanged);
    bus.on('hit-enemy', onHitEnemy);
    bus.on('score-changed', onScoreChanged);
    bus.on('enemy-killed', onEnemyKilled);
    bus.on('player-died', onPlayerDied);
    bus.on('player-respawned', onPlayerRespawned);
    bus.on('weapon-switched', onWeaponSwitched);
    const onPowerActivated = (info) => {
      setPowerActive(true);
      setKillfeed((feed) => [`✨ ${info?.name || 'Schopnost'} aktivována!`, ...feed].slice(0, 5));
    };
    bus.on('power-activated', onPowerActivated);
    return () => {
      bus.off('health-changed', onHealthChanged);
      bus.off('hit-enemy', onHitEnemy);
      bus.off('score-changed', onScoreChanged);
      bus.off('enemy-killed', onEnemyKilled);
      bus.off('player-died', onPlayerDied);
      bus.off('player-respawned', onPlayerRespawned);
      bus.off('weapon-switched', onWeaponSwitched);
      bus.off('power-activated', onPowerActivated);
    };
  }, [character, maxHealth]);

  // Odpočet respawnu
  useEffect(() => {
    if (phase !== 'respawning') return;
    const interval = setInterval(() => setRespawnTimer((t) => Math.max(0, t - 0.1)), 100);
    return () => clearInterval(interval);
  }, [phase]);

  // Otevřený scoreboard se průběžně překresluje (čte živé skóre botů z gameState)
  useEffect(() => {
    if (!showScoreboard && phase !== 'respawning') return;
    const interval = setInterval(() => forceScoreboardTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [showScoreboard, phase]);

  // Polling cooldownu schopnosti z gameState
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerCooldown(Math.max(0, gameState.powerCooldown));
      setPowerActive(gameState.powerActiveTimer > 0);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Desktop: pointer lock, myš a klávesy mimo KeyboardControls (střelba, zbraně, scoreboard, schopnost)
  useEffect(() => {
    if (!isDesktopRef.current) return;
    const onPointerLockChange = () => setPointerLocked(!!document.pointerLockElement);
    const onMouseMove = (event) => {
      if (document.pointerLockElement) {
        input.look.dx += event.movementX * input.lookSensitivity;
        input.look.dy += event.movementY * input.lookSensitivity;
      }
    };
    const onMouseDown = (event) => {
      if (document.pointerLockElement && event.button === 0) {
        input.fire = true;
        input.firePressed = true;
      }
    };
    const onMouseUp = (event) => {
      if (event.button === 0) input.fire = false;
    };
    const onKeyDown = (event) => {
      const bindings = getBindings();
      if (bindings.fire?.includes(event.code)) {
        input.fire = true;
        input.firePressed = true;
      }
      if (bindings.weapon1?.includes(event.code)) input.weaponSwitch = 0;
      if (bindings.weapon2?.includes(event.code)) input.weaponSwitch = 1;
      if (bindings.weapon3?.includes(event.code)) input.weaponSwitch = 2;
      if (bindings.scoreboard?.includes(event.code)) {
        event.preventDefault();
        setShowScoreboard((prev) => !prev);
      }
      if (event.code === 'KeyQ') input.powerPressed = true;
    };
    const onKeyUp = (event) => {
      if (getBindings().fire?.includes(event.code)) input.fire = false;
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const restartGame = () => {
    setPhase('playing');
    setHealth(maxHealth);
    setScore(0);
    setKills(0);
    setDeaths(0);
    setKillfeed([]);
    setShowScoreboard(false);
    setPowerCooldown(0);
    setPowerActive(false);
    bus.emit('restart-game');
  };

  const changeSensitivity = (value) => {
    setSensitivity(value);
    input.lookSensitivity = value;
  };

  // --- Levý joystick (pohyb) ---
  const onMoveStickDown = (event) => {
    if (moveStickRef.current.active) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveStickRef.current = { active: true, id: event.pointerId, cx: event.clientX, cy: event.clientY };
    if (stickBaseRef.current) {
      stickBaseRef.current.style.left = `${event.clientX}px`;
      stickBaseRef.current.style.top = `${event.clientY}px`;
      stickBaseRef.current.style.display = 'block';
    }
    if (stickKnobRef.current) stickKnobRef.current.style.transform = 'translate(0, 0)';
  };

  const onMoveStickMove = (event) => {
    if (!moveStickRef.current.active || event.pointerId !== moveStickRef.current.id) return;
    const dx = event.clientX - moveStickRef.current.cx;
    const dy = event.clientY - moveStickRef.current.cy;
    const radius = 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, radius);
    input.move.x = dist > 0 ? (dx / dist) * clamped / radius : 0;
    input.move.y = dist > 0 ? -(dy / dist) * clamped / radius : 0;
    input.sprint = clamped / radius > 0.85;
    if (stickKnobRef.current) {
      stickKnobRef.current.style.transform = `translate(${dist > 0 ? (dx / dist) * clamped : 0}px, ${dist > 0 ? (dy / dist) * clamped : 0}px)`;
    }
  };

  const onMoveStickUp = (event) => {
    if (!moveStickRef.current.active || event.pointerId !== moveStickRef.current.id) return;
    moveStickRef.current = { active: false, id: null, cx: 0, cy: 0 };
    input.move.x = 0;
    input.move.y = 0;
    input.sprint = false;
    if (stickBaseRef.current) stickBaseRef.current.style.display = 'none';
  };

  // --- Pravá plocha (rozhlížení; tap bez pohybu = výstřel) ---
  const onLookDown = (event) => {
    if (lookTouchRef.current.active) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lookTouchRef.current = {
      active: true,
      id: event.pointerId,
      sx: event.clientX,
      sy: event.clientY,
      lx: event.clientX,
      ly: event.clientY,
      moved: false,
    };
  };

  const onLookMove = (event) => {
    if (!lookTouchRef.current.active || event.pointerId !== lookTouchRef.current.id) return;
    const dx = event.clientX - lookTouchRef.current.lx;
    const dy = event.clientY - lookTouchRef.current.ly;
    input.look.dx += dx * input.lookSensitivity;
    input.look.dy += dy * input.lookSensitivity;
    lookTouchRef.current.lx = event.clientX;
    lookTouchRef.current.ly = event.clientY;
    if (
      Math.abs(event.clientX - lookTouchRef.current.sx) > 10 ||
      Math.abs(event.clientY - lookTouchRef.current.sy) > 10
    ) {
      lookTouchRef.current.moved = true;
    }
  };

  const onLookUp = (event) => {
    if (!lookTouchRef.current.active || event.pointerId !== lookTouchRef.current.id) return;
    if (!lookTouchRef.current.moved) input.firePressed = true;
    lookTouchRef.current = { active: false, id: null, sx: 0, sy: 0, lx: 0, ly: 0, moved: false };
  };

  // --- Dotyková tlačítka ---
  const onFireDown = (event) => {
    event.preventDefault();
    input.fire = true;
    input.firePressed = true;
  };

  const onFireUp = (event) => {
    event.preventDefault();
    input.fire = false;
  };

  const onJumpDown = (event) => {
    event.preventDefault();
    input.jumpPressed = true;
  };

  // Gyroskopické rozhlížení (iOS vyžaduje explicitní povolení)
  const toggleGyro = async () => {
    if (gyroOn) {
      setGyroOn(false);
      input.gyroEnabled = false;
      if (gyroRef.current.handler) {
        window.removeEventListener('deviceorientation', gyroRef.current.handler);
        gyroRef.current.handler = null;
      }
      gyroRef.current.lastBeta = null;
      gyroRef.current.lastGamma = null;
      return;
    }
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function' &&
        (await DeviceOrientationEvent.requestPermission()) !== 'granted'
      ) {
        return;
      }
      const handler = (event) => {
        if (input.gyroEnabled) {
          if (gyroRef.current.lastBeta !== null) {
            input.look.dx += (event.gamma - gyroRef.current.lastGamma) * 0.015;
            input.look.dy += (event.beta - gyroRef.current.lastBeta) * 0.015;
          }
          gyroRef.current.lastBeta = event.beta;
          gyroRef.current.lastGamma = event.gamma;
        }
      };
      gyroRef.current.handler = handler;
      window.addEventListener('deviceorientation', handler);
      setGyroOn(true);
      input.gyroEnabled = true;
    } catch {
      // uživatel povolení odmítl
    }
  };

  // Řádky scoreboardu (hráč + boti) — phase/respawnTimer v deps záměrně vynucují přepočet
  const scoreboardRows = useMemo(() => {
    const playerRow = {
      name: character?.nickname || character?.name || 'Ty',
      kills,
      deaths,
      score,
      isPlayer: true,
    };
    const botRows = (gameState.botScores || []).map((bot) => ({
      name: bot.name,
      kills: bot.kills,
      deaths: bot.deaths,
      score: bot.score,
    }));
    return [playerRow, ...botRows].sort((a, b) => b.kills - a.kills || b.score - a.score);
  }, [kills, deaths, score, character, phase, respawnTimer]);

  const bindings = getBindings();

  if (!character) return null;

  const totalPlayers = 1 + (gameState.botScores?.length || 0);

  return (
    <main className="game-page">
      <OrientationWarning />
      <div
        className="game-frame"
        onClick={() => {
          if (isDesktopRef.current && phase === 'playing' && !document.pointerLockElement) {
            document.querySelector('#game-container canvas')?.requestPointerLock();
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <GameContainer />
        <div className="absolute inset-0 pointer-events-none select-none" style={{ touchAction: 'none' }}>
          {/* Dotykové zóny (jen mobil/tablet) */}
          {!isDesktopRef.current && (
            <>
              <div
                className="absolute right-0 top-0 bottom-0 pointer-events-auto"
                style={{ width: '55%', touchAction: 'none' }}
                onPointerDown={onLookDown}
                onPointerMove={onLookMove}
                onPointerUp={onLookUp}
                onPointerCancel={onLookUp}
              />
              <div
                className="absolute left-0 bottom-0 pointer-events-auto"
                style={{ width: '45%', height: '60%', touchAction: 'none' }}
                onPointerDown={onMoveStickDown}
                onPointerMove={onMoveStickMove}
                onPointerUp={onMoveStickUp}
                onPointerCancel={onMoveStickUp}
              />
            </>
          )}

          {/* Vizualizace joysticku */}
          <div
            ref={stickBaseRef}
            className="absolute w-32 h-32 rounded-full border-2 border-white/25 pointer-events-none"
            style={{ display: 'none', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              ref={stickKnobRef}
              className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full border-2 border-white/40"
              style={{ marginLeft: '-1.5rem', marginTop: '-1.5rem', background: 'rgba(255,255,255,0.3)' }}
            />
          </div>

          {/* Červená vinětace při zásahu hráče */}
          {damageTick > 0 && (
            <div key={damageTick} className="absolute inset-0 pointer-events-none damage-flash" />
          )}

          {/* Zaměřovač */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="relative w-6 h-6">
              <div className="absolute top-1/2 left-0 w-2 h-0.5 bg-white/70 -translate-y-1/2" />
              <div className="absolute top-1/2 right-0 w-2 h-0.5 bg-white/70 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 h-2 w-0.5 bg-white/70 -translate-x-1/2" />
              <div className="absolute left-1/2 bottom-0 h-2 w-0.5 bg-white/70 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-full" />
              {/* Hitmarker — diagonální X při potvrzeném zásahu (červený = krit) */}
              {hitMarker && (
                <div key={hitMarker.t} className="absolute inset-0 hitmarker">
                  {[45, -45, 135, -135].map((deg) => (
                    <div
                      key={deg}
                      className="absolute top-1/2 left-1/2 w-3.5 h-0.5"
                      style={{
                        backgroundColor: hitMarker.crit ? '#f87171' : '#ffffff',
                        transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(9px)`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Zdraví (vlevo nahoře) */}
          <div className="absolute top-3 left-3 pointer-events-none hud-t hud-l">
            <div className="text-white text-sm font-bold mb-1 drop-shadow">❤ {Math.ceil(health)}</div>
            <div
              className="w-32 h-3 rounded-full overflow-hidden border border-white/20"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${(health / maxHealth) * 100}%`,
                  backgroundColor:
                    health > maxHealth * 0.5 ? '#4ade80' : health > maxHealth * 0.25 ? '#fbbf24' : '#ef4444',
                }}
              />
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-white/30 text-[10px] hover:text-white/60 mt-1 pointer-events-auto"
            >
              ← Odejít
            </button>
          </div>

          {/* Skóre (nahoře uprostřed) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none flex gap-2 hud-t">
            <div className="text-white text-lg font-bold px-4 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)' }}>
              Skóre: {score}
            </div>
            <div
              className="text-white text-sm font-bold px-3 py-1 rounded-lg flex items-center gap-1"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <span className="text-green-400">{kills}</span>:<span className="text-red-400">{deaths}</span>
            </div>
            <div
              className="text-white/50 text-xs px-2 py-1 rounded-lg flex items-center"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {totalPlayers}/{WIN_SCORE}
            </div>
          </div>

          {/* Killfeed */}
          {killfeed.length > 0 && (
            <div className="absolute top-16 left-3 pointer-events-none space-y-1">
              {killfeed.map((line, index) => (
                <div
                  key={index}
                  className="text-xs text-white/70 px-2 py-0.5 rounded"
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Postava (vpravo nahoře) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto hud-t hud-r">
            <div className="text-right">
              <div className="text-white text-sm font-bold" style={{ color: character.color }}>
                {character.name}
              </div>
              <div className="text-white/50 text-xs">{character.weapon.name}</div>
              {character.power && (
                <div className="text-[10px] mt-0.5">
                  <button
                    onClick={() => {
                      input.powerPressed = true;
                    }}
                    disabled={powerCooldown > 0}
                    className={`font-bold ${powerCooldown > 0 ? 'text-white/30' : powerActive ? 'text-yellow-400' : 'text-yellow-400/80'}`}
                  >
                    ✨ {character.power.name}
                    {powerCooldown > 0 ? ` (${Math.ceil(powerCooldown)}s)` : powerActive ? ' — AKTIVNÍ' : ''}
                  </button>
                </div>
              )}
            </div>
            <div
              className="w-10 h-12 rounded-lg overflow-hidden flex-shrink-0"
              style={{ background: `linear-gradient(180deg, ${character.color}40, ${character.color}80)` }}
            >
              {character.portrait ? (
                <img
                  src={character.portrait}
                  alt={character.name}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🎭</div>
              )}
            </div>
          </div>

          {/* Nápověda ovládání */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="absolute right-3 top-16 w-8 h-8 rounded-lg border border-white/20 pointer-events-auto flex items-center justify-center text-white text-xs hover:bg-white/10"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            ?
          </button>
          {showHelp && (
            <div
              className="absolute right-3 top-28 p-3 rounded-lg pointer-events-auto text-xs text-white space-y-1 z-50 min-w-[200px]"
              style={{ background: 'rgba(0,0,0,0.9)' }}
            >
              <div className="font-bold mb-2 text-sm">Ovládání</div>
              {isDesktopRef.current ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      {formatKeyLabel(bindings.forward?.[0])}/{formatKeyLabel(bindings.left?.[0])}
                    </span>
                    <span>Pohyb</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Myš</span>
                    <span>Rozhlížení</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">{formatKeyLabel(bindings.fire?.[0])}</span>
                    <span>Střelba</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      {formatKeyLabel(bindings.weapon1?.[0])}/{formatKeyLabel(bindings.weapon2?.[0])}/{formatKeyLabel(bindings.weapon3?.[0])}
                    </span>
                    <span>Zbraně</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">{formatKeyLabel(bindings.scoreboard?.[0])}</span>
                    <span>Scoreboard</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">{formatKeyLabel(bindings.jump?.[0])}</span>
                    <span>Skok</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">{formatKeyLabel(bindings.sprint?.[0])}</span>
                    <span>Sprint</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Q</span>
                    <span>Schopnost</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-white/50">Levý panel</span>
                    <span>Pohyb</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Pravý panel</span>
                    <span>Rozhlížení</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Kleknutí vpravo</span>
                    <span>Střelba</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Max joystick</span>
                    <span>Sprint</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">🏆 tlačítko</span>
                    <span>Scoreboard</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Tlačítka 1-3</span>
                    <span>Zbraně</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">SKOK tlačítko</span>
                    <span>Skok</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">🎯 tlačítko</span>
                    <span>Gyroskop</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">✨ tlačítko</span>
                    <span>Schopnost</span>
                  </div>
                </>
              )}
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="text-white/50 mb-1">Citlivost: {Math.round(sensitivity * 1e4)}</div>
                <input
                  type="range"
                  min="0.0005"
                  max="0.008"
                  step="0.0005"
                  value={sensitivity}
                  onChange={(event) => changeSensitivity(parseFloat(event.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          )}

          {/* Ukazatel zbraní (dole uprostřed) */}
          {character.weapons && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none flex gap-2 hud-b">
              {character.weapons.map((weapon, index) => (
                <div
                  key={index}
                  className={`px-3 py-1 rounded-lg text-xs border ${weaponIndex === index ? 'border-white/60 bg-white/20 text-white' : 'border-white/10 text-white/40'}`}
                  style={{ background: weaponIndex === index ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }}
                >
                  {index + 1}. {weapon.name}
                </div>
              ))}
            </div>
          )}

          {/* Dotyková tlačítka (jen mobil/tablet) */}
          {!isDesktopRef.current && (
            <>
              <div className="absolute left-16 bottom-3 flex flex-col gap-1 pointer-events-auto hud-b">
                {character.weapons?.map((weapon, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      input.weaponSwitch = index;
                    }}
                    className={`w-10 h-10 rounded-lg border text-xs flex items-center justify-center ${weaponIndex === index ? 'border-white/60 bg-white/20 text-white' : 'border-white/10 text-white/40'}`}
                    style={{ background: weaponIndex === index ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <button
                className="absolute right-5 bottom-5 w-20 h-20 rounded-full border-2 border-red-400/50 pointer-events-auto active:scale-95 transition-all flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: 'rgba(220,38,38,0.6)',
                  touchAction: 'none',
                  marginBottom: 'env(safe-area-inset-bottom)',
                  marginRight: 'env(safe-area-inset-right)',
                }}
                onPointerDown={onFireDown}
                onPointerUp={onFireUp}
                onPointerCancel={onFireUp}
                onPointerLeave={onFireUp}
              >
                FIRE
              </button>
              <button
                className="absolute right-28 bottom-8 w-16 h-16 rounded-full border-2 border-blue-400/40 pointer-events-auto active:scale-95 transition-all flex items-center justify-center text-white font-bold text-xs"
                style={{ background: 'rgba(37,99,235,0.5)', touchAction: 'none' }}
                onPointerDown={onJumpDown}
              >
                SKOK
              </button>
              <button
                onClick={() => {
                  input.powerPressed = true;
                }}
                disabled={powerCooldown > 0}
                className={`absolute right-28 bottom-24 w-14 h-14 rounded-full border-2 pointer-events-auto active:scale-95 transition-all flex items-center justify-center text-white font-bold text-xs ${powerCooldown > 0 ? 'border-white/10 opacity-50' : 'border-yellow-400/60'}`}
                style={{ background: powerCooldown > 0 ? 'rgba(0,0,0,0.4)' : 'rgba(234,179,8,0.5)', touchAction: 'none' }}
              >
                {powerCooldown > 0 ? Math.ceil(powerCooldown) : '✨'}
              </button>
              <button
                onClick={toggleGyro}
                className={`absolute left-3 bottom-3 w-12 h-12 rounded-full border-2 pointer-events-auto flex items-center justify-center text-xs ${gyroOn ? 'border-green-400/50' : 'border-white/20'}`}
                style={{ background: gyroOn ? 'rgba(34,197,94,0.6)' : 'rgba(0,0,0,0.5)', color: 'white' }}
              >
                🎯
              </button>
              <button
                onClick={() => setShowScoreboard((prev) => !prev)}
                className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg border border-white/20 pointer-events-auto flex items-center gap-1 text-xs text-white"
                style={{ background: 'rgba(0,0,0,0.5)' }}
              >
                🏆
              </button>
            </>
          )}

          {/* Desktop: výzva ke kliknutí pro pointer lock */}
          {isDesktopRef.current && phase === 'playing' && !pointerLocked && (
            <div
              className="absolute inset-0 grid place-items-center pointer-events-auto cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <div className="text-center text-white">
                <div className="text-3xl font-bold mb-3">🖱️ Klikni pro hraní</div>
                <div className="text-sm text-white/60 leading-relaxed">
                  Myš = rozhlížení • {formatKeyLabel(bindings.fire?.[0])} = střelba
                  <br />
                  {formatKeyLabel(bindings.weapon1?.[0])}/{formatKeyLabel(bindings.weapon2?.[0])}/{formatKeyLabel(bindings.weapon3?.[0])} = zbraně • {formatKeyLabel(bindings.scoreboard?.[0])} = scoreboard • {formatKeyLabel(bindings.forward?.[0])}
                  {formatKeyLabel(bindings.left?.[0])} = pohyb
                </div>
              </div>
            </div>
          )}

          {/* Scoreboard / respawn overlay */}
          {(showScoreboard || phase === 'respawning') && (
            <div
              className="absolute inset-0 grid place-items-center pointer-events-auto"
              style={{ background: 'rgba(0,0,0,0.75)' }}
            >
              <div className="text-center">
                {phase === 'respawning' && (
                  <div className="text-4xl font-bold text-red-500 mb-6">Respawn za {Math.ceil(respawnTimer)}s</div>
                )}
                <div className="bg-black/60 rounded-lg p-4 min-w-[350px]">
                  <div className="text-white font-bold mb-3 text-sm">
                    🏆 Scoreboard{' '}
                    <span className="text-white/40">
                      ({totalPlayers}/{WIN_SCORE})
                    </span>
                  </div>
                  <table className="w-full text-sm text-white">
                    <thead>
                      <tr className="text-white/40 border-b border-white/10">
                        <th className="text-left pb-2">#</th>
                        <th className="text-left pb-2">Hráč</th>
                        <th className="text-right pb-2">K</th>
                        <th className="text-right pb-2">D</th>
                        <th className="text-right pb-2">Skóre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreboardRows.map((row, index) => (
                        <tr key={index} className={row.isPlayer ? 'text-yellow-400 font-bold' : ''}>
                          <td className="py-1">{index + 1}</td>
                          <td className="py-1">{row.name}</td>
                          <td className="text-right py-1 text-green-400">{row.kills}</td>
                          <td className="text-right py-1 text-red-400">{row.deaths}</td>
                          <td className="text-right py-1">{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {phase !== 'respawning' && (
                    <div className="flex gap-2 mt-4 justify-center">
                      <button
                        onClick={restartGame}
                        className="px-4 py-1.5 rounded-lg text-white text-xs font-bold"
                        style={{ background: '#16a34a' }}
                      >
                        Restart
                      </button>
                      <button
                        onClick={() => navigate('/leaderboard')}
                        className="px-4 py-1.5 rounded-lg text-white/60 text-xs"
                      >
                        🏆 Žebříček
                      </button>
                      <button onClick={() => navigate('/')} className="px-4 py-1.5 rounded-lg text-white/60 text-xs">
                        Odejít
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
