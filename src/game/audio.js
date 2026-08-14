// Zvukový systém hry „Náměstí Chaosu" — čistě procedurální Web Audio API,
// žádné zvukové soubory. Vše se syntetizuje z oscilátorů a šumových bufferů.
// AudioContext vzniká líně až po prvním uživatelském gestu (autoplay policy),
// mute se drží v localStorage a řeší se přes master gain (kontext běží dál).

import { bus } from '@/game/events.js';
import { gameState } from '@/game/state.js';

const MUTE_KEY = 'chaos_audio_muted';
const MASTER_VOLUME = 0.9; // trocha rezervy pod 1.0
const AMBIENT_VOLUME = 0.05; // tichý pad v pozadí

const STEP_POLL_MS = 120; // jak často kontrolujeme pozici hráče
const STEP_MIN_DIST = 0.25; // menší posun za tick = stojí, žádný krok
const STEP_FAST_DIST = 0.8; // větší posun = sprint, rychlejší kadence
const STEP_GAP_MS = 280; // běžná kadence kroků
const STEP_FAST_GAP_MS = 200; // kadence při sprintu

// Prostředí bez Web Audio (SSR, testy) — jen si zjistíme konstruktor, nic netvoříme.
const AudioContextClass =
  typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined;

// ---------------------------------------------------------------------------
// Stav modulu
// ---------------------------------------------------------------------------
let ctx = null; // AudioContext (líně po gestu)
let masterGain = null; // hlavní hlasitost + mute
let noiseBuffer = null; // sdílený buffer bílého šumu
let initialized = false;
let gestureBound = false;

let ambientNodes = null; // živé uzly padu
let ambientWanted = false; // ambient je žádaný (i když kontext ještě není)
let ambientStarted = false; // ambient už byl někdy spuštěn (první výstřel ho startuje jen jednou)

let stepTimer = null; // interval polleru kroků
let lastStepPos = null; // poslední známá pozice hráče { x, z }
let lastStepAt = 0; // čas posledního přehraného kroku (ms)
let stepHigh = false; // střídání dvou výšek kroku

let prevHealth = null; // pro detekci poklesu zdraví (zranění)

// ---------------------------------------------------------------------------
// Mute (persistence v localStorage)
// ---------------------------------------------------------------------------
function loadMuted() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false; // soukromý režim apod.
  }
}

let muted = loadMuted();

export function setMuted(value) {
  muted = !!value;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* úložiště není k dispozici — mute platí aspoň pro session */
  }
  if (ctx && masterGain) {
    // Mute = ztlumený master gain; AudioContext běží dál, odmutování je okamžité.
    masterGain.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.015);
  }
}

export function getMuted() {
  return muted;
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

// ---------------------------------------------------------------------------
// AudioContext — líné vytvoření po prvním gestu
// ---------------------------------------------------------------------------
function ensureContext() {
  if (!AudioContextClass) return;
  if (!ctx) {
    try {
      ctx = new AudioContextClass();
    } catch {
      return; // prostředí bez zvuku — hra poběží potichu
    }
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (ambientWanted) buildAmbient();
}

function onFirstGesture() {
  unbindGesture();
  ensureContext();
}

function bindGesture() {
  if (gestureBound || typeof window === 'undefined') return;
  gestureBound = true;
  window.addEventListener('pointerdown', onFirstGesture, { passive: true });
  window.addEventListener('keydown', onFirstGesture);
}

function unbindGesture() {
  if (!gestureBound) return;
  gestureBound = false;
  window.removeEventListener('pointerdown', onFirstGesture);
  window.removeEventListener('keydown', onFirstGesture);
}

// ---------------------------------------------------------------------------
// Syntézní primitivy
// ---------------------------------------------------------------------------
function getNoiseBuffer() {
  if (!noiseBuffer) {
    const length = ctx.sampleRate; // 1 s bílého šumu, delší zvuky loopují
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function cleanupOnEnd(source, nodes) {
  source.onended = () => {
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        /* už odpojeno */
      }
    }
  };
}

// Krátký tón s obálkou a volitelným sklouznutím frekvence (glideTo).
function tone({ delay = 0, dur = 0.1, type = 'square', freq = 440, glideTo = null, vol = 0.2, attack = 0.004 }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(freq, 1), t0);
  if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(vol, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env);
  env.connect(masterGain);
  cleanupOnEnd(osc, [osc, env]);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Šumový úder přes bikvadový filtr s obálkou (základ perkusí a „vzduchu").
function noise({ delay = 0, dur = 0.15, vol = 0.2, filter = 'lowpass', freq = 1000, glideTo = null, q = 1, attack = 0.002 }) {
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = filter;
  flt.frequency.setValueAtTime(Math.max(freq, 10), t0);
  if (glideTo != null) flt.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 10), t0 + dur);
  flt.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(vol, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt);
  flt.connect(env);
  env.connect(masterGain);
  cleanupOnEnd(src, [src, flt, env]);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ---------------------------------------------------------------------------
// Katalog SFX — retro syntéza
// ---------------------------------------------------------------------------
const SFX = {
  // Výstřely podle typu zbraně ----------------------------------------------
  // Projektil — krátké „pew": pila s rychlým sklouznutím výšky dolů.
  shootProjectile() {
    tone({ type: 'sawtooth', freq: 950, glideTo: 160, dur: 0.13, vol: 0.22 });
    tone({ type: 'square', freq: 1900, glideTo: 320, dur: 0.08, vol: 0.08 });
  },
  // Brokovnice — úder šumu do klesajícího lowpassu + basové tělo.
  shootSpread() {
    noise({ filter: 'lowpass', freq: 2800, glideTo: 320, dur: 0.26, vol: 0.32 });
    tone({ type: 'square', freq: 150, glideTo: 55, dur: 0.16, vol: 0.14 });
  },
  // Hozená zbraň — „whoosh": pásmový šum se stoupavým sweepem.
  shootThrown() {
    noise({ filter: 'bandpass', freq: 320, glideTo: 1600, q: 1.4, dur: 0.3, vol: 0.18, attack: 0.05 });
  },
  // Bližák — švih: krátký pásmový šum s klesajícím středem.
  shootMelee() {
    noise({ filter: 'bandpass', freq: 2300, glideTo: 650, q: 2.2, dur: 0.1, vol: 0.2, attack: 0.008 });
  },

  // Zásahy a smrti ----------------------------------------------------------
  // Zásah nepřítele — tlumené „thock".
  hit() {
    noise({ filter: 'lowpass', freq: 520, dur: 0.055, vol: 0.24 });
    tone({ type: 'triangle', freq: 170, glideTo: 75, dur: 0.09, vol: 0.18 });
  },
  // Kritický zásah — vyšší úder + kovové zazvonění (nesouladná dvojice tónů).
  crit() {
    noise({ filter: 'bandpass', freq: 1300, q: 1.5, dur: 0.06, vol: 0.22 });
    tone({ type: 'sine', freq: 1244, dur: 0.28, vol: 0.1, attack: 0.002 });
    tone({ type: 'sine', freq: 1967, dur: 0.24, vol: 0.07, attack: 0.002 });
  },
  // Zabití nepřítele — sestupný „zap" a tichý pád.
  kill() {
    tone({ type: 'sawtooth', freq: 1100, glideTo: 90, dur: 0.24, vol: 0.24 });
    noise({ delay: 0.16, filter: 'lowpass', freq: 260, dur: 0.12, vol: 0.12 });
  },
  // Smrt hráče — hluboký boom + dlouhý klesající sweep.
  playerDeath() {
    noise({ filter: 'lowpass', freq: 420, glideTo: 70, dur: 0.7, vol: 0.28 });
    tone({ type: 'sine', freq: 210, glideTo: 38, dur: 0.9, vol: 0.3 });
  },
  // Respawn — stoupavý sweep s jiskrou navrchu.
  respawn() {
    tone({ type: 'triangle', freq: 190, glideTo: 900, dur: 0.42, vol: 0.2, attack: 0.02 });
    tone({ delay: 0.3, type: 'sine', freq: 900, glideTo: 1750, dur: 0.22, vol: 0.09 });
  },
  // Zranění hráče (pokles zdraví) — krátké temné žuchnutí.
  hurt() {
    tone({ type: 'triangle', freq: 230, glideTo: 85, dur: 0.12, vol: 0.2 });
  },

  // Schopnosti a průběh hry -------------------------------------------------
  // Aktivace schopnosti — rychlé arpeggio tří tónů (C–E–G).
  power() {
    [523, 659, 784].forEach((freq, i) => tone({ delay: i * 0.07, type: 'square', freq, dur: 0.09, vol: 0.2 }));
  },
  // Výhra — fanfára: vzestupný rozklad C dur zakončený drženým akordem (~1.5 s).
  win() {
    const run = [523.25, 659.25, 783.99, 1046.5];
    run.forEach((freq, i) => tone({ delay: i * 0.16, type: 'square', freq, dur: 0.2, vol: 0.22 }));
    run.forEach((freq) => tone({ delay: 0.68, type: 'triangle', freq, dur: 0.85, vol: 0.1, attack: 0.02 }));
  },
  // Prohra — smutný dvoutónový motiv, druhý tón lehce podjíždí dolů.
  lose() {
    tone({ type: 'triangle', freq: 330, dur: 0.32, vol: 0.24, attack: 0.02 });
    tone({ delay: 0.36, type: 'triangle', freq: 262, glideTo: 233, dur: 0.6, vol: 0.24, attack: 0.02 });
  },

  // Drobnosti ---------------------------------------------------------------
  // Krok — tichý filtrovaný tick, střídavě dvě výšky.
  step() {
    stepHigh = !stepHigh;
    noise({ filter: 'lowpass', freq: stepHigh ? 900 : 620, dur: 0.045, vol: 0.06, attack: 0.001 });
  },
  // Přepnutí zbraně — mechanické cvaknutí.
  weaponSwitch() {
    tone({ type: 'square', freq: 1800, glideTo: 900, dur: 0.03, vol: 0.12, attack: 0.001 });
    noise({ delay: 0.03, filter: 'highpass', freq: 2500, dur: 0.025, vol: 0.08, attack: 0.001 });
  },
  // Kliknutí v UI — krátký neutrální tick.
  uiClick() {
    tone({ type: 'square', freq: 1200, dur: 0.035, vol: 0.15, attack: 0.001 });
  },
  // Sebrání předmětu — dvojité stoupavé pípnutí (událost nemusí nikdy přijít).
  pickup() {
    tone({ type: 'sine', freq: 880, dur: 0.07, vol: 0.18 });
    tone({ delay: 0.08, type: 'sine', freq: 1318, dur: 0.09, vol: 0.18 });
  },
};

// Ruční přehrání SFX podle jména (např. playSfx('uiClick')).
// Před prvním gestem (bez AudioContextu) je to tiché no-op.
export function playSfx(name) {
  if (!ctx || !masterGain) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  SFX[name]?.();
}

// ---------------------------------------------------------------------------
// Ambient — tichý syntezátorový pad (2 rozladěné pily + LFO na lowpass)
// ---------------------------------------------------------------------------
function buildAmbient() {
  if (!ctx || !masterGain || ambientNodes) return;
  const t0 = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc1.frequency.value = 110; // A2
  osc2.frequency.value = 110;
  osc1.detune.value = -6; // lehké rozladění proti sobě = plovoucí chvění
  osc2.detune.value = 6;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  filter.Q.value = 1.2;

  const lfo = ctx.createOscillator(); // pomalé vlnění barvy padu
  lfo.type = 'sine';
  lfo.frequency.value = 0.07;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 140;
  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(AMBIENT_VOLUME, t0 + 2); // pozvolný nástup

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc1.start(t0);
  osc2.start(t0);
  lfo.start(t0);

  ambientNodes = { osc1, osc2, lfo, lfoDepth, filter, gain };
}

function teardownAmbient() {
  if (!ambientNodes) return;
  const nodes = ambientNodes;
  ambientNodes = null;
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime;
    nodes.gain.gain.cancelScheduledValues(t0);
    nodes.gain.gain.setValueAtTime(Math.max(nodes.gain.gain.value, 0.0001), t0);
    nodes.gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); // krátký fade-out
    nodes.osc1.onended = () => {
      for (const node of Object.values(nodes)) {
        try {
          node.disconnect();
        } catch {
          /* už odpojeno */
        }
      }
    };
    nodes.osc1.stop(t0 + 0.45);
    nodes.osc2.stop(t0 + 0.45);
    nodes.lfo.stop(t0 + 0.45);
  } catch {
    /* uzly už mohly být zastavené (např. zavřený kontext) */
  }
}

// Spustí ambient; bez AudioContextu se jen poznamená a spustí po prvním gestu.
// Záměrně se NEzastavuje na 'game-over' ani 'player-died' — běží dál,
// konec jen přes stopAmbient()/disposeAudio().
export function startAmbient() {
  ambientWanted = true;
  ambientStarted = true;
  buildAmbient();
}

export function stopAmbient() {
  ambientWanted = false;
  teardownAmbient();
}

// ---------------------------------------------------------------------------
// Kroky — žádná bus událost neexistuje, sledujeme gameState.playerPos pollerem
// ---------------------------------------------------------------------------
function pollSteps() {
  const pos = gameState?.playerPos;
  if (!pos) return;
  const prev = lastStepPos;
  lastStepPos = { x: pos.x, z: pos.z };
  if (!prev || !ctx || gameState.phase !== 'playing') return;

  // Horizontální posun od minulého ticku (skok na místě není krok).
  const dist = Math.hypot(pos.x - prev.x, pos.z - prev.z);
  if (dist <= STEP_MIN_DIST) return;

  const now = Date.now();
  const gap = dist > STEP_FAST_DIST ? STEP_FAST_GAP_MS : STEP_GAP_MS; // sprint = svižnější kadence
  if (now - lastStepAt < gap) return;
  lastStepAt = now;
  playSfx('step');
}

// Reset sledovaných hodnot (po respawnu/restartu pozice skáče — žádný falešný krok).
function resetTrackers() {
  const pos = gameState?.playerPos;
  lastStepPos = pos ? { x: pos.x, z: pos.z } : null;
  lastStepAt = 0;
  prevHealth = typeof gameState?.playerHealth === 'number' ? gameState.playerHealth : null;
}

// ---------------------------------------------------------------------------
// Napojení na herní události
// ---------------------------------------------------------------------------
function onWeaponFired(weapon) {
  if (!ambientStarted) startAmbient(); // první výstřel spustí ambient (pokud ho nespustil start-game)
  const type = weapon?.type;
  if (type === 'spread') playSfx('shootSpread');
  else if (type === 'thrown') playSfx('shootThrown');
  else if (type === 'melee') playSfx('shootMelee');
  else playSfx('shootProjectile'); // výchozí — 'projectile' i neznámý payload
}

function onHitEnemy(info) {
  playSfx(info?.crit ? 'crit' : 'hit');
}

function onHealthChanged(health) {
  if (typeof health !== 'number') return;
  const prev = prevHealth;
  prevHealth = health;
  // Pokles = zranění; pád na nulu už ozvučí 'player-died'.
  if (prev != null && health < prev && health > 0) playSfx('hurt');
}

function onPlayerRespawned() {
  resetTrackers();
  playSfx('respawn');
}

function onGameOver(result) {
  playSfx(result?.won ? 'win' : 'lose');
}

function onStartGame() {
  resetTrackers();
  startAmbient();
}

const BUS_HANDLERS = {
  'weapon-fired': onWeaponFired,
  'hit-enemy': onHitEnemy,
  'enemy-killed': () => playSfx('kill'),
  'player-died': () => playSfx('playerDeath'),
  'player-respawned': onPlayerRespawned,
  'power-activated': () => playSfx('power'),
  'health-changed': onHealthChanged,
  'weapon-switched': () => playSfx('weaponSwitch'),
  'game-over': onGameOver,
  'start-game': onStartGame,
  'restart-game': resetTrackers,
  'pickup-collected': () => playSfx('pickup'), // událost nemusí existovat — jen připraveno
};

// ---------------------------------------------------------------------------
// Životní cyklus
// ---------------------------------------------------------------------------

// Idempotentní inicializace: bus listenery, jednorázový gesture listener
// (pointerdown/keydown → vytvoření AudioContextu) a poller kroků.
export function initAudio() {
  if (initialized) return;
  initialized = true;
  bindGesture();
  for (const [event, handler] of Object.entries(BUS_HANDLERS)) bus.on(event, handler);
  resetTrackers();
  if (typeof window !== 'undefined' && !stepTimer) {
    stepTimer = setInterval(pollSteps, STEP_POLL_MS);
  }
}

// Odpojí všechno: listenery, poller, ambient i AudioContext.
export function disposeAudio() {
  if (stepTimer) {
    clearInterval(stepTimer);
    stepTimer = null;
  }
  unbindGesture();
  for (const [event, handler] of Object.entries(BUS_HANDLERS)) bus.off(event, handler);
  stopAmbient();
  ambientStarted = false;
  if (ctx) {
    try {
      ctx.close().catch(() => {});
    } catch {
      /* už zavřený */
    }
  }
  ctx = null;
  masterGain = null;
  noiseBuffer = null;
  initialized = false;
}
