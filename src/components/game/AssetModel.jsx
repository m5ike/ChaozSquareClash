import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ASSET_TYPES } from '@/data/assetsCatalog.js';

// Procedurální low-poly modely herních assetů — blokový retro styl
// (boxGeometry/cylinderGeometry + meshStandardMaterial, viz CharacterModel.jsx).
// Kotva každého modelu je u země (y = 0), čelo/směr jízdy míří na +z.
//
// Volitelný `animRef` je sdílený mutable objekt:
//   { current: { speed: 0..1, pose: null|'drep'|'klik'|'tanec'|'opily', wheelSpin: rad/s } }
// - lidé a zvířata houpou končetinami podle `speed` (protichůdný švih jako CharacterModel)
// - kola vozidel se točí úhlovou rychlostí `wheelSpin`
// - `pose` přepíná speciální pózy (dřepy, kliky, tanec, opilecké vrávorání)

const SKIN = '#e0b088';
const GLASS = '#26303c';
const DARK = '#22242a';

/* ---------- Pomocné stavební dílky ---------- */

function Box({ p = [0, 0, 0], r, s = [1, 1, 1], c = '#888888', cast = false }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
}

function Cyl({ p = [0, 0, 0], r, s = [0.5, 0.5, 1, 8], c = '#888888', cast = false }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r}>
      <cylinderGeometry args={s} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
}

// Nízkopolygonová koule (keře, koruny, hřívy) — flatShading pro hranatý retro vzhled
function Ball({ p = [0, 0, 0], radius = 0.5, sc, c = '#888888', cast = false }) {
  return (
    <mesh castShadow={cast} position={p} scale={sc}>
      <sphereGeometry args={[radius, 7, 5]} />
      <meshStandardMaterial color={c} flatShading />
    </mesh>
  );
}

/* ---------- Kola vozidel ---------- */

// Kolo naležato (válec podél osy X); točí se celá skupina kolem X podle wheelSpin
function Wheel({ p, radius = 0.32, width = 0.22, refFn }) {
  return (
    <group ref={refFn} position={p}>
      <Cyl r={[0, 0, Math.PI / 2]} s={[radius, radius, width, 10]} c="#1d1d22" cast />
      <Cyl r={[0, 0, Math.PI / 2]} s={[radius * 0.45, radius * 0.45, width + 0.04, 8]} c="#9298a2" />
    </group>
  );
}

// Sbírá refy kol a otáčí jimi úhlovou rychlostí animRef.current.wheelSpin (rad/s)
function useWheels(animRef) {
  const wheels = useRef([]);
  const spin = useRef(0);
  const addWheel = useRef((el) => {
    if (el && !wheels.current.includes(el)) wheels.current.push(el);
  }).current;
  useFrame((_, delta) => {
    spin.current += (animRef?.current?.wheelSpin || 0) * delta;
    for (const w of wheels.current) w.rotation.x = spin.current;
  });
  return addWheel;
}

/* ---------- Lidé — blokoví panáčci (zjednodušený CharacterModel) ---------- */

// Konfigurace rolí: barvy oblečení a doplňky
const PEOPLE = {
  dite: (v) => ({
    scale: 0.8, torso: v.triko || '#d9903a', sleeve: v.triko || '#d9903a',
    pants: '#3b5f8f', hair: '#5a3d20',
  }),
  pan: (v) => ({
    torso: v.oblek || '#3a3f4a', sleeve: v.oblek || '#3a3f4a',
    pants: '#2c3038', hair: '#33261a', tie: '#8f2f35',
  }),
  pani: (v) => ({
    torso: v.saty || '#a24a68', sleeve: v.saty || '#a24a68', skirt: v.saty || '#a24a68',
    pants: SKIN, shoe: '#4a2430', hair: '#4a2c14', longHair: true, bag: '#6b4a2b',
  }),
  hasic: () => ({
    torso: '#b3342e', sleeve: '#b3342e', pants: '#7d2621',
    hat: 'helma', hatColor: '#d8b83a', stripe: '#d8b83a',
  }),
  policajt: () => ({
    torso: '#25335c', sleeve: '#25335c', pants: '#1c2540',
    hat: 'cepice', hatColor: '#25335c',
  }),
  mestsky_policajt: () => ({
    torso: '#3d5f9e', sleeve: '#3d5f9e', pants: '#2c3f66',
    hat: 'cepice', hatColor: '#3d5f9e', vest: '#cbe345',
  }),
  zdravotnik: () => ({
    torso: '#eeeeea', sleeve: '#eeeeea', pants: '#2f7d4f',
    hair: '#3a2c1c', cross: '#2f7d4f',
  }),
};

function BlockyPerson({ conf: c, animRef }) {
  const rootRef = useRef();
  const legLRef = useRef();
  const legRRef = useRef();
  const armLRef = useRef();
  const armRRef = useRef();
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    const root = rootRef.current;
    const lL = legLRef.current;
    const lR = legRRef.current;
    const aL = armLRef.current;
    const aR = armRRef.current;
    if (!root || !lL || !lR || !aL || !aR) return;
    const anim = animRef?.current || {};
    const t = state.clock.elapsedTime;
    const speed = Math.max(0, Math.min(1, anim.speed || 0));

    // Výchozí postoj + protichůdný švih končetin podle rychlosti (viz CharacterModel)
    phase.current += delta * 8 * speed;
    const swing = Math.sin(phase.current) * 0.55 * speed;
    root.rotation.set(0, 0, 0);
    root.position.y = 0;
    lL.rotation.set(swing, 0, 0);
    lR.rotation.set(-swing, 0, 0);
    aL.rotation.set(-swing * 0.7, 0, 0);
    aR.rotation.set(swing * 0.7, 0, 0);

    if (anim.pose === 'drep') {
      // Dřepy: rytmické pokrčení nohou + snížení trupu, ruce předpažené
      const k = 0.5 + 0.5 * Math.sin(t * 3.2); // 0 = stoj, 1 = dřep
      lL.rotation.x = k * 1.15;
      lR.rotation.x = k * 1.15;
      root.position.y = -k * 0.3;
      aL.rotation.x = -1.35;
      aR.rotation.x = -1.35;
    } else if (anim.pose === 'klik') {
      // Kliky: tělo vodorovně nízko obličejem k zemi, ruce se rytmicky krčí
      const k = 0.5 + 0.5 * Math.sin(t * 3.5); // 1 = napnuté ruce (nahoře)
      root.rotation.x = 1.35;
      root.position.y = 0.12 + 0.2 * k;
      aL.rotation.x = -(Math.PI / 2) * (0.55 + 0.45 * k);
      aR.rotation.x = -(Math.PI / 2) * (0.55 + 0.45 * k);
      lL.rotation.x = 0;
      lR.rotation.x = 0;
    } else if (anim.pose === 'tanec') {
      // Tanec: poskoky, kývání trupu a ruce nad hlavou
      root.position.y = Math.abs(Math.sin(t * 6)) * 0.07;
      root.rotation.z = Math.sin(t * 3) * 0.09;
      aL.rotation.set(-2.4 + Math.sin(t * 6) * 0.5, 0, 0.35);
      aR.rotation.set(-2.4 - Math.sin(t * 6) * 0.5, 0, -0.35);
      lL.rotation.x = Math.sin(t * 6) * 0.25;
      lR.rotation.x = -Math.sin(t * 6) * 0.25;
    } else if (anim.pose === 'opily') {
      // Opilec: pomalé naklánění do stran, ruce mírně od těla, vratký krok
      root.rotation.z = Math.sin(t * 1.1) * 0.22;
      root.rotation.x = Math.sin(t * 0.7) * 0.08;
      aL.rotation.z = 0.4;
      aR.rotation.z = -0.4;
    }
  });

  return (
    <group ref={rootRef} scale={c.scale || 1}>
      {/* Nohy — pivot v kyčli */}
      <group ref={legLRef} position={[-0.12, 0.6, 0]}>
        <Box p={[0, -0.3, 0]} s={[0.17, 0.6, 0.17]} c={c.pants} cast />
        <Box p={[0, -0.57, 0.03]} s={[0.18, 0.08, 0.24]} c={c.shoe || '#241a12'} />
      </group>
      <group ref={legRRef} position={[0.12, 0.6, 0]}>
        <Box p={[0, -0.3, 0]} s={[0.17, 0.6, 0.17]} c={c.pants} cast />
        <Box p={[0, -0.57, 0.03]} s={[0.18, 0.08, 0.24]} c={c.shoe || '#241a12'} />
      </group>

      {/* Sukně (paní) */}
      {c.skirt && <Box p={[0, 0.56, 0]} s={[0.5, 0.26, 0.32]} c={c.skirt} cast />}

      {/* Trup + doplňky na hrudi */}
      <Box p={[0, 0.86, 0]} s={[0.46, 0.52, 0.26]} c={c.torso} cast />
      {c.tie && <Box p={[0, 0.9, 0.135]} s={[0.08, 0.3, 0.02]} c={c.tie} />}
      {c.stripe && <Box p={[0, 0.74, 0]} s={[0.47, 0.09, 0.27]} c={c.stripe} />}
      {c.vest && (
        <group>
          {/* reflexní vesta s pruhem */}
          <Box p={[0, 0.94, 0]} s={[0.48, 0.24, 0.28]} c={c.vest} />
          <Box p={[0, 0.94, 0]} s={[0.49, 0.07, 0.29]} c="#d8d8d8" />
        </group>
      )}
      {c.cross && (
        <group>
          {/* zdravotnický kříž */}
          <Box p={[0, 0.92, 0.135]} s={[0.06, 0.2, 0.02]} c={c.cross} />
          <Box p={[0, 0.92, 0.135]} s={[0.2, 0.06, 0.02]} c={c.cross} />
        </group>
      )}

      {/* Paže — pivot v rameni */}
      <group ref={armLRef} position={[-0.3, 1.08, 0]}>
        <Box p={[0, -0.22, 0]} s={[0.13, 0.44, 0.13]} c={c.sleeve} cast />
        <Box p={[0, -0.48, 0]} s={[0.12, 0.12, 0.12]} c={SKIN} />
        {c.bag && <Box p={[-0.02, -0.52, 0.13]} s={[0.16, 0.15, 0.08]} c={c.bag} />}
      </group>
      <group ref={armRRef} position={[0.3, 1.08, 0]}>
        <Box p={[0, -0.22, 0]} s={[0.13, 0.44, 0.13]} c={c.sleeve} cast />
        <Box p={[0, -0.48, 0]} s={[0.12, 0.12, 0.12]} c={SKIN} />
      </group>

      {/* Hlava — bez textury, jen barevný obličej s tečkami očí */}
      <Box p={[0, 1.29, 0]} s={[0.3, 0.3, 0.3]} c={SKIN} cast />
      <Box p={[-0.06, 1.32, 0.151]} s={[0.045, 0.045, 0.01]} c="#241f1a" />
      <Box p={[0.06, 1.32, 0.151]} s={[0.045, 0.045, 0.01]} c="#241f1a" />

      {/* Vlasy (deska nahoře + vzadu; dlouhé u paní) */}
      {c.hair && (
        <group>
          <Box p={[0, 1.43, 0]} s={[0.32, 0.08, 0.32]} c={c.hair} />
          <Box p={[0, c.longHair ? 1.24 : 1.3, -0.155]} s={[0.32, c.longHair ? 0.36 : 0.2, 0.05]} c={c.hair} />
        </group>
      )}

      {/* Pokrývky hlavy */}
      {c.hat === 'helma' && (
        <group position={[0, 1.46, 0]}>
          <Box s={[0.36, 0.14, 0.36]} c={c.hatColor} cast />
          <Box p={[0, -0.05, 0.2]} s={[0.36, 0.05, 0.1]} c={c.hatColor} /> {/* štítek */}
        </group>
      )}
      {c.hat === 'cepice' && (
        <group position={[0, 1.47, 0]}>
          <Cyl s={[0.17, 0.18, 0.09, 8]} c={c.hatColor} cast />
          <Box p={[0, -0.04, 0.19]} s={[0.24, 0.03, 0.12]} c={DARK} /> {/* kšilt */}
        </group>
      )}
    </group>
  );
}

/* ---------- Zvířata — čtyřnožci s klusem a vrtěním ocasu ---------- */

const ANIMALS = {
  pes: (v) => ({
    srst: v.srst || '#8a5a2e', srstB: v.srstB || '#6e4522',
    bw: 0.22, bh: 0.26, bl: 0.55, legH: 0.24, lt: 0.07, head: 0.2,
    muzzle: true, ears: 'svisle', obojek: '#c03030',
    tail: { len: 0.26, up: 0.85, t: 0.055 },
  }),
  kocka: (v) => ({
    srst: v.srst || '#26262b', srstB: v.srstB || '#3a3a40',
    bw: 0.16, bh: 0.18, bl: 0.42, legH: 0.18, lt: 0.05, head: 0.16,
    ears: 'spicate',
    tail: { len: 0.34, up: 0.25, t: 0.04 },
  }),
  lev: (v) => ({
    srst: v.srst || '#c98f3d', srstB: v.srstB || '#a8742e', hriva: v.hriva || '#7a4a1e',
    bw: 0.42, bh: 0.48, bl: 1.05, legH: 0.42, lt: 0.14, head: 0.32,
    muzzle: true, mane: true,
    tail: { len: 0.5, up: 1.2, t: 0.06, tuft: v.hriva || '#7a4a1e' },
  }),
  kun: (v) => ({
    srst: v.srst || '#7a4a28', srstB: v.srstB || '#5c3820', hriva: v.hriva || '#3a2a18',
    bw: 0.4, bh: 0.55, bl: 1.2, legH: 0.75, lt: 0.1, head: 0.2,
    horse: true,
    tail: { len: 0.55, hang: true, t: 0.1, c: v.hriva || '#3a2a18', up: 0 },
  }),
};

function BlockyAnimal({ conf: a, animRef }) {
  const rootRef = useRef();
  const legFL = useRef();
  const legFR = useRef();
  const legBL = useRef();
  const legBR = useRef();
  const tailRef = useRef();
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const anim = animRef?.current || {};
    const t = state.clock.elapsedTime;
    const speed = Math.max(0, Math.min(1, anim.speed || 0));

    // Klus — diagonální páry nohou švihají proti sobě
    phase.current += delta * 10 * speed;
    const swing = Math.sin(phase.current) * 0.6 * speed;
    if (legFL.current) legFL.current.rotation.x = swing;
    if (legBR.current) legBR.current.rotation.x = swing;
    if (legFR.current) legFR.current.rotation.x = -swing;
    if (legBL.current) legBL.current.rotation.x = -swing;

    // Vrtění ocasem — rychleji při pohybu
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * (3 + speed * 6)) * 0.35;

    // Pár póz zvládnou i zvířata
    root.rotation.set(0, 0, 0);
    root.position.y = 0;
    if (anim.pose === 'opily') {
      root.rotation.z = Math.sin(t * 1.2) * 0.18;
    } else if (anim.pose === 'tanec') {
      root.position.y = Math.abs(Math.sin(t * 6)) * 0.06;
    } else if (anim.pose === 'drep') {
      root.rotation.x = -0.3; // "sedni!" — zadek dolů
      root.position.y = 0.04;
    }
  });

  const bodyY = a.legH + a.bh / 2;
  return (
    <group ref={rootRef}>
      {/* Tělo */}
      <Box p={[0, bodyY, 0]} s={[a.bw, a.bh, a.bl]} c={a.srst} cast />

      {/* Nohy — pivot v kyčli/rameni */}
      {[[legFL, -1, 1], [legFR, 1, 1], [legBL, -1, -1], [legBR, 1, -1]].map(([ref, sx, sz], i) => (
        <group key={i} ref={ref} position={[sx * (a.bw / 2 - a.lt / 2), a.legH, sz * (a.bl / 2 - a.lt / 2)]}>
          <Box p={[0, -a.legH / 2, 0]} s={[a.lt, a.legH, a.lt]} c={a.srstB} cast />
        </group>
      ))}

      {a.horse ? (
        /* Kůň — dlouhý šikmý krk s hřívou a podlouhlá hlava */
        <group position={[0, a.legH + a.bh - 0.08, a.bl / 2 - 0.12]} rotation={[0.45, 0, 0]}>
          <Box p={[0, 0.32, 0]} s={[0.2, 0.72, 0.26]} c={a.srst} cast />
          <Box p={[0, 0.34, -0.16]} s={[0.07, 0.6, 0.09]} c={a.hriva} />
          <group position={[0, 0.66, 0.08]} rotation={[-0.45, 0, 0]}>
            <Box p={[0, 0, 0.14]} s={[0.2, 0.24, 0.5]} c={a.srst} cast />
            <Box p={[0, -0.04, 0.41]} s={[0.16, 0.17, 0.1]} c={a.srstB} />
            <Box p={[-0.105, 0.05, 0.12]} s={[0.02, 0.04, 0.04]} c="#1c1a16" />
            <Box p={[0.105, 0.05, 0.12]} s={[0.02, 0.04, 0.04]} c="#1c1a16" />
            <Box p={[-0.06, 0.17, -0.08]} s={[0.045, 0.14, 0.045]} c={a.srst} />
            <Box p={[0.06, 0.17, -0.08]} s={[0.045, 0.14, 0.045]} c={a.srst} />
          </group>
        </group>
      ) : (
        /* Hlava vpředu — oči, čumák, uši, případně hříva */
        <group position={[0, a.legH + a.bh + a.head * 0.3, a.bl / 2 + a.head * 0.3]}>
          {a.mane && <Ball p={[0, 0, -a.head * 0.2]} radius={a.head * 0.95} sc={[1, 1, 0.55]} c={a.hriva} cast />}
          <Box s={[a.head, a.head, a.head]} c={a.srst} cast />
          <Box p={[-a.head * 0.22, a.head * 0.08, a.head / 2 + 0.004]} s={[a.head * 0.14, a.head * 0.14, 0.01]} c="#1c1a16" />
          <Box p={[a.head * 0.22, a.head * 0.08, a.head / 2 + 0.004]} s={[a.head * 0.14, a.head * 0.14, 0.01]} c="#1c1a16" />
          {a.muzzle && <Box p={[0, -a.head * 0.18, a.head * 0.55]} s={[a.head * 0.5, a.head * 0.4, a.head * 0.5]} c={a.srstB} />}
          {a.ears === 'spicate' && (
            <group>
              <Cyl p={[-a.head * 0.28, a.head * 0.62, 0]} s={[0.004, a.head * 0.28, a.head * 0.45, 4]} c={a.srst} />
              <Cyl p={[a.head * 0.28, a.head * 0.62, 0]} s={[0.004, a.head * 0.28, a.head * 0.45, 4]} c={a.srst} />
            </group>
          )}
          {a.ears === 'svisle' && (
            <group>
              <Box p={[-(a.head / 2 + 0.02), a.head * 0.1, -a.head * 0.1]} s={[0.035, a.head * 0.55, a.head * 0.35]} c={a.srstB} />
              <Box p={[a.head / 2 + 0.02, a.head * 0.1, -a.head * 0.1]} s={[0.035, a.head * 0.55, a.head * 0.35]} c={a.srstB} />
            </group>
          )}
        </group>
      )}

      {/* Obojek (pes) */}
      {a.obojek && <Box p={[0, a.legH + a.bh - 0.02, a.bl / 2 - 0.04]} s={[a.bw + 0.03, 0.05, 0.1]} c={a.obojek} />}

      {/* Ocas — vztyčený, nebo visící (kůň); vrtí se v useFrame */}
      <group ref={tailRef} position={[0, a.legH + a.bh - 0.03, -a.bl / 2]} rotation={[a.tail.hang ? 0.35 : -a.tail.up, 0, 0]}>
        <Box p={[0, ((a.tail.hang ? -1 : 1) * a.tail.len) / 2, 0]} s={[a.tail.t, a.tail.len, a.tail.t]} c={a.tail.c || a.srstB} />
        {a.tail.tuft && <Box p={[0, a.tail.len, 0]} s={[0.09, 0.1, 0.09]} c={a.tail.tuft} />}
      </group>
    </group>
  );
}

/* ---------- Vozidla ---------- */

// Rozměry karoserií: délka, šířka, pozice náprav (wz) a poloměr kol (wr)
const CAR_SHAPES = {
  sedan: { len: 4.2, w: 1.7, wz: 1.35, wr: 0.32 },
  hatchback: { len: 3.6, w: 1.65, wz: 1.15, wr: 0.32 },
  kombi: { len: 4.4, w: 1.7, wz: 1.45, wr: 0.32 },
  dodavka: { len: 4.4, w: 1.8, wz: 1.5, wr: 0.34 },
  veteran: { len: 3.8, w: 1.5, wz: 1.25, wr: 0.34 },
};

function CarModel({ v, animRef }) {
  const addWheel = useWheels(animRef);
  const typ = v.typ || 'sedan';
  const barva = v.barva || '#b3342e';
  const sh = CAR_SHAPES[typ] || CAR_SHAPES.sedan;
  const hw = sh.w / 2;
  const hl = sh.len / 2;

  return (
    <group>
      {/* Karoserie + kabina + okna dle typu */}
      {typ === 'sedan' && (
        <group>
          <Box p={[0, 0.55, 0]} s={[1.7, 0.5, 4.2]} c={barva} cast />
          <Box p={[0, 1.03, -0.2]} s={[1.55, 0.5, 2.0]} c={barva} cast />
          <Box p={[0, 1.06, -0.2]} s={[1.57, 0.28, 1.6]} c={GLASS} />
          <Box p={[0, 1.06, -0.2]} s={[1.35, 0.3, 2.02]} c={GLASS} />
        </group>
      )}
      {typ === 'hatchback' && (
        <group>
          <Box p={[0, 0.55, 0]} s={[1.65, 0.5, 3.6]} c={barva} cast />
          <Box p={[0, 1.02, -0.35]} s={[1.5, 0.48, 1.9]} c={barva} cast />
          <Box p={[0, 1.05, -0.35]} s={[1.52, 0.26, 1.5]} c={GLASS} />
          <Box p={[0, 1.05, -0.35]} s={[1.3, 0.28, 1.92]} c={GLASS} />
        </group>
      )}
      {typ === 'kombi' && (
        <group>
          <Box p={[0, 0.55, 0]} s={[1.7, 0.5, 4.4]} c={barva} cast />
          <Box p={[0, 1.03, -0.55]} s={[1.55, 0.5, 2.7]} c={barva} cast />
          <Box p={[0, 1.06, -0.55]} s={[1.57, 0.28, 2.3]} c={GLASS} />
          <Box p={[0, 1.06, -0.55]} s={[1.35, 0.3, 2.72]} c={GLASS} />
        </group>
      )}
      {typ === 'dodavka' && (
        <group>
          <Box p={[0, 0.5, 0]} s={[1.8, 0.4, 4.4]} c={DARK} />
          <Box p={[0, 1.25, -0.15]} s={[1.8, 1.5, 4.1]} c={barva} cast />
          <Box p={[0, 1.55, 1.91]} s={[1.5, 0.5, 0.05]} c={GLASS} />
          <Box p={[0, 1.55, 1.5]} s={[1.82, 0.45, 0.7]} c={GLASS} />
        </group>
      )}
      {typ === 'veteran' && (
        <group>
          {/* stupačky, úzká karoserie, kapota a vysoká kabina */}
          <Box p={[0, 0.36, 0]} s={[1.5, 0.12, 3.2]} c={DARK} />
          <Box p={[0, 0.68, -0.35]} s={[1.15, 0.52, 2.6]} c={barva} cast />
          <Box p={[0, 0.64, 1.35]} s={[0.95, 0.44, 1.15]} c={barva} cast />
          <Box p={[0, 1.28, -0.75]} s={[1.2, 0.78, 1.25]} c={barva} cast />
          <Box p={[0, 1.34, -0.75]} s={[1.22, 0.42, 1.05]} c={GLASS} />
          <Box p={[0, 1.34, -0.75]} s={[1.04, 0.42, 1.27]} c={GLASS} />
          {/* blatníky */}
          <Box p={[-0.63, 0.58, 1.3]} s={[0.26, 0.18, 1.2]} c={DARK} />
          <Box p={[0.63, 0.58, 1.3]} s={[0.26, 0.18, 1.2]} c={DARK} />
          <Box p={[-0.63, 0.58, -1.2]} s={[0.26, 0.18, 1.0]} c={DARK} />
          <Box p={[0.63, 0.58, -1.2]} s={[0.26, 0.18, 1.0]} c={DARK} />
          {/* kulatá světla a mřížka chladiče */}
          <Cyl p={[-0.4, 0.82, 1.92]} r={[Math.PI / 2, 0, 0]} s={[0.1, 0.1, 0.1, 8]} c="#f2e6b0" />
          <Cyl p={[0.4, 0.82, 1.92]} r={[Math.PI / 2, 0, 0]} s={[0.1, 0.1, 0.1, 8]} c="#f2e6b0" />
          <Box p={[0, 0.62, 1.92]} s={[0.5, 0.34, 0.06]} c={DARK} />
        </group>
      )}

      {/* Nárazníky a hranatá světla (veterán má vlastní kulatá) */}
      {typ !== 'veteran' && (
        <group>
          <Box p={[0, 0.34, hl - 0.02]} s={[sh.w + 0.04, 0.14, 0.12]} c={DARK} />
          <Box p={[0, 0.34, -hl + 0.02]} s={[sh.w + 0.04, 0.14, 0.12]} c={DARK} />
          <Box p={[hw - 0.32, 0.6, hl + 0.01]} s={[0.3, 0.13, 0.06]} c="#ffe9a8" />
          <Box p={[-hw + 0.32, 0.6, hl + 0.01]} s={[0.3, 0.13, 0.06]} c="#ffe9a8" />
          <Box p={[hw - 0.32, 0.6, -hl - 0.01]} s={[0.3, 0.13, 0.06]} c="#b02020" />
          <Box p={[-hw + 0.32, 0.6, -hl - 0.01]} s={[0.3, 0.13, 0.06]} c="#b02020" />
        </group>
      )}

      {/* 4 kola */}
      {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz], i) => (
        <Wheel key={i} refFn={addWheel} p={[sx * (hw - 0.05), sh.wr, sz * sh.wz]} radius={sh.wr} />
      ))}
    </group>
  );
}

function BusModel({ v, animRef }) {
  const addWheel = useWheels(animRef);
  const barva = v.barva || '#b3342e';
  return (
    <group>
      <Box p={[0, 1.5, 0]} s={[2.3, 2.2, 9]} c={barva} cast />
      {/* pás oken kolem dokola + čelní a zadní sklo */}
      <Box p={[0, 2.05, 0]} s={[2.34, 0.6, 8.2]} c={GLASS} />
      <Box p={[0, 1.95, 4.51]} s={[1.9, 0.8, 0.04]} c={GLASS} />
      <Box p={[0, 1.95, -4.51]} s={[1.9, 0.6, 0.04]} c={GLASS} />
      {/* dveře na pravé straně */}
      <Box p={[1.16, 1.15, 2.6]} s={[0.05, 1.5, 0.85]} c={DARK} />
      <Box p={[1.16, 1.15, -0.6]} s={[0.05, 1.5, 0.85]} c={DARK} />
      {/* klimatizace na střeše */}
      <Box p={[0, 2.7, 0.5]} s={[1.5, 0.22, 2.6]} c="#c9c9c2" />
      {/* nárazníky a světla */}
      <Box p={[0, 0.5, 4.52]} s={[2.3, 0.3, 0.1]} c={DARK} />
      <Box p={[0, 0.5, -4.52]} s={[2.3, 0.3, 0.1]} c={DARK} />
      <Box p={[0.85, 0.8, 4.53]} s={[0.35, 0.16, 0.06]} c="#ffe9a8" />
      <Box p={[-0.85, 0.8, 4.53]} s={[0.35, 0.16, 0.06]} c="#ffe9a8" />
      <Box p={[0.85, 0.8, -4.53]} s={[0.35, 0.16, 0.06]} c="#b02020" />
      <Box p={[-0.85, 0.8, -4.53]} s={[0.35, 0.16, 0.06]} c="#b02020" />
      {/* 6 kol — přední náprava + zadní dvojnáprava */}
      {[3.1, -2.1, -3.2].map((z) =>
        [1, -1].map((sx) => (
          <Wheel key={`${z}-${sx}`} refFn={addWheel} p={[sx * 1.05, 0.4, z]} radius={0.4} width={0.26} />
        ))
      )}
    </group>
  );
}

function TramModel({ v, animRef }) {
  const addWheel = useWheels(animRef);
  const dolni = v.barva || '#b3342e';
  const horni = v.krem || '#efe6c8';
  return (
    <group>
      {/* dvoubarevná skříň: dole červená, nahoře krémová s pásem oken */}
      <Box p={[0, 0.95, 0]} s={[2.1, 1.1, 10.5]} c={dolni} cast />
      <Box p={[0, 2.0, 0]} s={[2.1, 1.0, 10.3]} c={horni} cast />
      <Box p={[0, 2.1, 0]} s={[2.14, 0.6, 9.2]} c={GLASS} />
      <Box p={[0, 2.0, 5.165]} s={[1.5, 0.7, 0.05]} c={GLASS} />
      <Box p={[0, 2.0, -5.165]} s={[1.5, 0.7, 0.05]} c={GLASS} />
      <Box p={[0, 2.58, 0]} s={[1.85, 0.16, 10.0]} c="#8a8f98" />
      {/* kryt podvozku */}
      <Box p={[0, 0.28, 0]} s={[1.8, 0.35, 9.6]} c={DARK} />
      {/* pantograf */}
      <group position={[0, 2.66, 1.6]}>
        <Box p={[0, 0.05, 0]} s={[0.9, 0.1, 0.9]} c={DARK} />
        <Box p={[0, 0.3, -0.16]} r={[0.55, 0, 0]} s={[0.05, 0.6, 0.05]} c="#3a3f46" />
        <Box p={[0, 0.3, 0.16]} r={[-0.55, 0, 0]} s={[0.05, 0.6, 0.05]} c="#3a3f46" />
        <Box p={[0, 0.58, 0]} s={[1.25, 0.05, 0.14]} c="#3a3f46" />
      </group>
      {/* světla */}
      <Box p={[0.6, 0.75, 5.26]} s={[0.25, 0.14, 0.05]} c="#ffe9a8" />
      <Box p={[-0.6, 0.75, 5.26]} s={[0.25, 0.14, 0.05]} c="#ffe9a8" />
      <Box p={[0.6, 0.75, -5.26]} s={[0.25, 0.14, 0.05]} c="#b02020" />
      <Box p={[-0.6, 0.75, -5.26]} s={[0.25, 0.14, 0.05]} c="#b02020" />
      {/* malá kola pod krytem */}
      {[[1, 3.4], [-1, 3.4], [1, -3.4], [-1, -3.4]].map(([sx, z], i) => (
        <Wheel key={i} refFn={addWheel} p={[sx * 0.8, 0.22, z]} radius={0.22} width={0.16} />
      ))}
    </group>
  );
}

/* ---------- Statika ---------- */

function StromModel({ v }) {
  const listy = v.listy || '#3e7c33';
  const kmen = v.kmen || '#6b4a2b';
  if (v.tvar === 'jehlicnaty') {
    // jehličnan — kmen + tři patra kuželů
    return (
      <group>
        <Cyl p={[0, 0.4, 0]} s={[0.13, 0.18, 0.8, 7]} c={kmen} cast />
        <Cyl p={[0, 1.15, 0]} s={[0.02, 0.85, 1.1, 7]} c={listy} cast />
        <Cyl p={[0, 1.95, 0]} s={[0.02, 0.65, 1.0, 7]} c={listy} cast />
        <Cyl p={[0, 2.65, 0]} s={[0.02, 0.45, 0.9, 7]} c={listy} />
      </group>
    );
  }
  if (v.tvar === 'kulaty') {
    // kulatá koruna z low-poly koule
    return (
      <group>
        <Cyl p={[0, 0.6, 0]} s={[0.14, 0.19, 1.2, 7]} c={kmen} cast />
        <Ball p={[0, 2.0, 0]} radius={1.0} sc={[1, 0.9, 1]} c={listy} cast />
      </group>
    );
  }
  // listnatý — hranatá koruna z krabic
  return (
    <group>
      <Cyl p={[0, 0.65, 0]} s={[0.15, 0.2, 1.3, 7]} c={kmen} cast />
      <Box p={[0, 1.9, 0]} s={[1.5, 1.1, 1.5]} c={listy} cast />
      <Box p={[0, 2.65, 0]} s={[1.0, 0.6, 1.0]} c={listy} cast />
      <Box p={[0.55, 1.6, 0.4]} s={[0.7, 0.6, 0.7]} c={listy} />
    </group>
  );
}

function KerModel({ v }) {
  const barva = v.barva || '#3e7c33';
  // nízká hrbolatá koule
  return (
    <group>
      <Ball p={[0, 0.35, 0]} radius={0.55} sc={[1, 0.62, 1]} c={barva} cast />
      <Ball p={[0.3, 0.3, 0.2]} radius={0.3} sc={[1, 0.7, 1]} c={barva} />
    </group>
  );
}

function KvetinaModel({ v }) {
  const barva = v.barva || '#d94a43';
  return (
    <group>
      {/* stonek s lístky a barevný květ */}
      <Cyl p={[0, 0.19, 0]} s={[0.02, 0.025, 0.38, 5]} c="#3e7c33" />
      <Box p={[-0.06, 0.14, 0]} r={[0, 0, 0.5]} s={[0.12, 0.03, 0.05]} c="#3e7c33" />
      <Box p={[0.06, 0.1, 0]} r={[0, 0, -0.5]} s={[0.12, 0.03, 0.05]} c="#3e7c33" />
      <Ball p={[0, 0.44, 0]} radius={0.1} c={barva} />
      <Ball p={[0, 0.51, 0]} radius={0.045} c="#e8d34a" />
    </group>
  );
}

function KvetinacModel({ v }) {
  const kvety = v.kvety || ['#d94a43', '#e0c23c', '#d94a43'];
  return (
    <group>
      {/* terakotový truhlík s hlínou a řádkou květů */}
      <Box p={[0, 0.17, 0]} s={[1.2, 0.3, 0.42]} c="#9c5236" cast />
      <Box p={[0, 0.33, 0]} s={[1.1, 0.05, 0.34]} c="#3d2b1c" />
      {kvety.map((barva, i) => (
        <group key={i} position={[-0.35 + i * 0.35, 0.35, 0]}>
          <Cyl p={[0, 0.1, 0]} s={[0.015, 0.02, 0.2, 5]} c="#3e7c33" />
          <Ball p={[0, 0.24, 0]} radius={0.07} c={barva} />
        </group>
      ))}
    </group>
  );
}

function BudkaModel({ v }) {
  if (v.typ === 'novinova') {
    // trafika — plná budka s okénkem, pultem a stříškou
    return (
      <group>
        <Box p={[0, 1.1, 0]} s={[1.1, 2.2, 1.1]} c={v.barva || '#5a6d7d'} cast />
        <Box p={[0, 1.4, 0.556]} s={[0.8, 0.5, 0.02]} c={GLASS} />
        <Box p={[0, 1.1, 0.58]} s={[0.9, 0.08, 0.18]} c="#6b4a2b" />
        <Box p={[-0.2, 1.17, 0.6]} s={[0.2, 0.05, 0.14]} c="#e8e4da" />
        <Box p={[0.15, 1.17, 0.6]} s={[0.2, 0.05, 0.14]} c="#d94a43" />
        <Box p={[0, 2.32, 0.1]} r={[0.1, 0, 0]} s={[1.25, 0.12, 1.45]} c="#3a3f46" cast />
      </group>
    );
  }
  // telefonní budka — oranžový rám + prosklené stěny
  const o = v.barva || '#e07818';
  return (
    <group>
      <Box p={[0, 0.09, 0]} s={[1.05, 0.18, 1.05]} c={o} />
      <Box p={[0, 1.25, 0]} s={[0.92, 2.14, 0.92]} c="#9fc7d8" />
      {[[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]].map(([x, z], i) => (
        <Box key={i} p={[x, 1.2, z]} s={[0.12, 2.1, 0.12]} c={o} cast />
      ))}
      <Box p={[0, 2.33, 0]} s={[1.15, 0.18, 1.15]} c={o} cast />
    </group>
  );
}

function StanekModel({ v }) {
  const plachta = v.plachta || '#b3342e';
  return (
    <group>
      {/* zadní a boční stěny */}
      <Box p={[0, 1.05, -0.85]} s={[2.4, 2.1, 0.12]} c="#8a6a42" cast />
      <Box p={[-1.14, 1.05, -0.3]} s={[0.12, 2.1, 1.2]} c="#8a6a42" />
      <Box p={[1.14, 1.05, -0.3]} s={[0.12, 2.1, 1.2]} c="#8a6a42" />
      {/* pult s přední deskou a zbožím */}
      <Box p={[0, 0.98, 0.55]} s={[2.4, 0.12, 0.55]} c="#6b4a2b" cast />
      <Box p={[0, 0.5, 0.76]} s={[2.4, 0.86, 0.1]} c={plachta} />
      <Box p={[-0.7, 1.1, 0.5]} s={[0.35, 0.14, 0.3]} c="#e0c23c" />
      <Box p={[0.1, 1.12, 0.55]} s={[0.3, 0.18, 0.26]} c="#3e7a3e" />
      <Box p={[0.75, 1.09, 0.5]} s={[0.28, 0.12, 0.28]} c="#d94a43" />
      {/* přední sloupky + střecha */}
      <Box p={[-1.1, 1.2, 0.78]} s={[0.1, 2.4, 0.1]} c="#6b4a2b" cast />
      <Box p={[1.1, 1.2, 0.78]} s={[0.1, 2.4, 0.1]} c="#6b4a2b" cast />
      <Box p={[0, 2.42, 0]} r={[0.06, 0, 0]} s={[2.6, 0.12, 2.0]} c="#6b4a2b" cast />
      {/* pruhovaná markýza */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} p={[-1.04 + i * 0.52, 2.26, 0.95]} r={[0.5, 0, 0]} s={[0.5, 0.45, 0.06]} c={i % 2 ? '#efe6c8' : plachta} />
      ))}
    </group>
  );
}

function BillboardModel({ v }) {
  const pruhy = v.pruhy || ['#d94a43', '#e0c23c', '#2e5fb3'];
  return (
    <group>
      {/* dvě nohy + deska s barevnými pruhy (abstraktní reklama) */}
      <Cyl p={[-1.2, 1.0, 0]} s={[0.09, 0.11, 2.0, 7]} c="#4a4f57" cast />
      <Cyl p={[1.2, 1.0, 0]} s={[0.09, 0.11, 2.0, 7]} c="#4a4f57" cast />
      <Box p={[0, 2.7, -0.05]} s={[3.9, 2.0, 0.1]} c="#3a3f46" cast />
      <Box p={[0, 2.7, 0.01]} s={[3.7, 1.8, 0.06]} c="#e8e4da" />
      {pruhy.map((barva, i) => (
        <Box key={i} p={[-1.15 + i * 1.15, 2.7, 0.05]} s={[1.05, 1.5, 0.04]} c={barva} />
      ))}
    </group>
  );
}

function KosModel({ v }) {
  const barva = v.barva || '#3e6b3e';
  return (
    <group>
      <Cyl p={[0, 0.42, 0]} s={[0.18, 0.15, 0.8, 8]} c={barva} cast />
      <Cyl p={[0, 0.84, 0]} s={[0.2, 0.18, 0.07, 8]} c={DARK} />
    </group>
  );
}

function PopelniceModel({ v }) {
  const barva = v.barva || '#33363c';
  return (
    <group>
      {/* kvádr s odklopným víkem, madlem a kolečky */}
      <Box p={[0, 0.12, 0.1]} s={[0.7, 0.1, 0.5]} c={DARK} />
      <Box p={[0, 0.6, 0]} s={[0.8, 0.9, 0.65]} c={barva} cast />
      <Box p={[0, 1.1, -0.03]} r={[0.08, 0, 0]} s={[0.84, 0.09, 0.72]} c={v.viko || DARK} />
      <Box p={[0, 1.13, 0.3]} s={[0.3, 0.04, 0.08]} c={DARK} />
      <Cyl p={[-0.28, 0.07, -0.24]} r={[0, 0, Math.PI / 2]} s={[0.07, 0.07, 0.06, 8]} c={DARK} />
      <Cyl p={[0.28, 0.07, -0.24]} r={[0, 0, Math.PI / 2]} s={[0.07, 0.07, 0.06, 8]} c={DARK} />
    </group>
  );
}

function SchrankaModel() {
  return (
    <group>
      {/* oranžová poštovní schránka na noze */}
      <Cyl p={[0, 0.35, 0]} s={[0.05, 0.06, 0.7, 7]} c="#3a3f46" cast />
      <Box p={[0, 0.9, 0]} s={[0.5, 0.55, 0.35]} c="#e07818" cast />
      <Box p={[0, 1.2, 0]} s={[0.54, 0.06, 0.39]} c="#c9660f" />
      <Box p={[0, 1.05, 0.178]} s={[0.3, 0.03, 0.01]} c={DARK} />
    </group>
  );
}

/* ---------- Hlavní komponenta ---------- */

export default function AssetModel({ type, variant = 0, animRef = null }) {
  const def = ASSET_TYPES[type];
  const vars = def?.variants || [];
  const n = Number.isFinite(variant) ? Math.floor(variant) : 0;
  const v = (vars.length ? vars[((n % vars.length) + vars.length) % vars.length] : null) || {};

  // Lidé a zvířata sdílejí parametrické komponenty
  if (PEOPLE[type]) return <BlockyPerson conf={PEOPLE[type](v)} animRef={animRef} />;
  if (ANIMALS[type]) return <BlockyAnimal conf={ANIMALS[type](v)} animRef={animRef} />;

  switch (type) {
    case 'strom': return <StromModel v={v} />;
    case 'ker': return <KerModel v={v} />;
    case 'kvetina': return <KvetinaModel v={v} />;
    case 'kvetinac': return <KvetinacModel v={v} />;
    case 'budka': return <BudkaModel v={v} />;
    case 'stanek': return <StanekModel v={v} />;
    case 'billboard': return <BillboardModel v={v} />;
    case 'kos': return <KosModel v={v} />;
    case 'popelnice': return <PopelniceModel v={v} />;
    case 'schranka': return <SchrankaModel />;
    case 'zaparkovane_auto':
    case 'auto': return <CarModel v={v} animRef={animRef} />;
    case 'autobus': return <BusModel v={v} animRef={animRef} />;
    case 'tramvaj': return <TramModel v={v} animRef={animRef} />;
    default:
      // Neznámý typ — šedý zástupný kvádr
      return <Box p={[0, 0.5, 0]} s={[1, 1, 1]} c="#888888" cast />;
  }
}
