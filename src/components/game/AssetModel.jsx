import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ASSET_TYPES } from '@/data/assetsCatalog.js';
import { ToonMat } from '@/game/toon.jsx';

// Procedurální modely herních assetů — KRESLENÝ animákový styl (cel-shading).
// Zaoblené tvary (koule, kapsle, kužely, torusy), karikaturní proporce:
// velké hlavy, velké oči, rukavicovité ruce, boubelatá auta, obláčkové stromy.
// Materiál všude <ToonMat> (MeshToonMaterial se čtyřstupňovým gradientem).
//
// Kotva každého modelu je u země (y = 0), čelo/směr jízdy míří na +z.
//
// Volitelný `animRef` je sdílený mutable objekt:
//   { current: { speed: 0..1, pose: null|'drep'|'klik'|'tanec'|'opily', wheelSpin: rad/s } }
// - lidé a zvířata houpou končetinami podle `speed` (protichůdný švih / klus)
// - kola vozidel integrují rotaci úhlovou rychlostí `wheelSpin`
// - `pose` přepíná speciální pózy (dřepy, kliky, tanec, opilecké vrávorání)
// - výchozí postoj se resetuje každý snímek

const SKIN = '#f2c49a'; // kreslená pleť
const GLASS = '#aadcef'; // světle modrá kreslená skla
const DARK = '#2b2e36';
const WHITE = '#f7f5ee';
const PUPIL = '#221f1d';

/* ---------- Pomocné zaoblené stavební dílky (vše s ToonMat) ---------- */

function Sph({ p = [0, 0, 0], r, sc, radius = 0.5, c = '#888888', cast = false, e, ei }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r} scale={sc}>
      <sphereGeometry args={[radius, 16, 12]} />
      <ToonMat color={c} emissive={e} emissiveIntensity={ei} />
    </mesh>
  );
}

// Kapsle — osa podél Y; `len` je délka válcové části (celkem len + 2*radius)
function Caps({ p = [0, 0, 0], r, sc, radius = 0.1, len = 0.3, c = '#888888', cast = false }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r} scale={sc}>
      <capsuleGeometry args={[radius, len, 6, 14]} />
      <ToonMat color={c} />
    </mesh>
  );
}

function Cyl({ p = [0, 0, 0], r, sc, args = [0.5, 0.5, 1, 16], c = '#888888', cast = false, e, ei }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r} scale={sc}>
      <cylinderGeometry args={args} />
      <ToonMat color={c} emissive={e} emissiveIntensity={ei} />
    </mesh>
  );
}

function Cone({ p = [0, 0, 0], r, sc, args = [0.5, 1, 16], c = '#888888', cast = false }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r} scale={sc}>
      <coneGeometry args={args} />
      <ToonMat color={c} />
    </mesh>
  );
}

function Tor({ p = [0, 0, 0], r, sc, args = [0.5, 0.15, 12, 24], c = '#888888', cast = false }) {
  return (
    <mesh castShadow={cast} position={p} rotation={r} scale={sc}>
      <torusGeometry args={args} />
      <ToonMat color={c} />
    </mesh>
  );
}

// Velké kreslené oko — bílá koule + černá zornička (hledí na +z)
function Eye({ p = [0, 0, 0], radius = 0.07 }) {
  return (
    <group position={p}>
      <Sph radius={radius} c={WHITE} />
      <Sph p={[0, 0, radius * 0.72]} radius={radius * 0.42} c={PUPIL} />
    </group>
  );
}

/* ---------- Kola vozidel ---------- */

// Kreslené kolo s bílým bokem naležato (osa podél X); točí se celá skupina kolem X
function Wheel({ p, radius = 0.36, width = 0.24, refFn }) {
  return (
    <group ref={refFn} position={p}>
      <Cyl r={[0, 0, Math.PI / 2]} args={[radius, radius, width, 16]} c="#22252a" cast />
      {/* bílý bok pneumatiky + náboj */}
      <Cyl r={[0, 0, Math.PI / 2]} args={[radius * 0.68, radius * 0.68, width + 0.04, 16]} c={WHITE} />
      <Cyl r={[0, 0, Math.PI / 2]} args={[radius * 0.3, radius * 0.3, width + 0.08, 12]} c="#cfd4da" />
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

/* ---------- Lidé — kreslení panáčci s velkou hlavou ---------- */

// Konfigurace rolí: barvy oblečení a doplňky (velikosti řeší CartoonPerson)
const PEOPLE = {
  dite: (v) => ({
    scale: 0.72, headScale: 1.25, torso: v.triko || '#e0913a', pants: '#4a6fd0',
    hair: '#6b4222', shoe: '#e04848',
  }),
  pan: (v) => ({
    torso: v.oblek || '#3a3f4a', pants: '#2c3038', hair: '#33261a',
    tie: '#e05555', shoe: '#2a2118',
  }),
  pani: (v) => ({
    torso: v.saty || '#c25578', skirt: v.saty || '#c25578', pants: SKIN,
    shoe: '#7d2f4a', hair: '#5c3618', longHair: true, bag: '#8a5c33',
  }),
  hasic: () => ({
    torso: '#e0442f', pants: '#9c2f24', hat: 'helma', hatColor: '#f2c53d',
    stripe: '#f2c53d', shoe: '#2a2118',
  }),
  policajt: () => ({
    torso: '#2c3f7d', pants: '#22305f', hat: 'cepice', hatColor: '#2c3f7d', shoe: '#1e222c',
  }),
  mestsky_policajt: () => ({
    torso: '#4a6fd0', pants: '#32488a', hat: 'cepice', hatColor: '#4a6fd0',
    vest: '#d6ef4a', shoe: '#1e222c',
  }),
  zdravotnik: () => ({
    torso: '#f4f4ee', pants: '#3aa060', hair: '#3a2c1c', cross: '#3aa060', shoe: '#f4f4ee',
  }),
};

function CartoonPerson({ conf: c, animRef }) {
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

    // Reset výchozího postoje + protichůdný švih končetin podle rychlosti
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
      root.position.y = -k * 0.26;
      aL.rotation.x = -1.35;
      aR.rotation.x = -1.35;
    } else if (anim.pose === 'klik') {
      // Kliky: tělo vodorovně obličejem k zemi, ruce se rytmicky krčí
      const k = 0.5 + 0.5 * Math.sin(t * 3.5); // 1 = napnuté ruce (nahoře)
      root.rotation.x = 1.35;
      root.position.y = 0.26 + 0.2 * k;
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
      // Opilec: pomalé naklánění do stran, ruce mírně od těla
      root.rotation.z = Math.sin(t * 1.1) * 0.22;
      root.rotation.x = Math.sin(t * 0.7) * 0.08;
      aL.rotation.z = 0.4;
      aR.rotation.z = -0.4;
    }
  });

  const hipY = 0.52;
  return (
    <group ref={rootRef} scale={c.scale || 1}>
      {/* Nohy — tenké kapsle s obřími botami, pivot v kyčli */}
      {[[legLRef, -1], [legRRef, 1]].map(([ref, sx]) => (
        <group key={sx} ref={ref} position={[sx * 0.11, hipY, 0]}>
          <Caps p={[0, -0.24, 0]} radius={0.05} len={0.3} c={c.pants} cast />
          {/* velká bota — zploštělá kapsle vystrčená dopředu */}
          <Caps p={[0, -0.47, 0.06]} r={[Math.PI / 2, 0, 0]} sc={[1.1, 1, 0.6]} radius={0.085} len={0.16} c={c.shoe || '#3a2a1c'} cast />
        </group>
      ))}

      {/* Sukně (paní) — kužel přes boky */}
      {c.skirt && <Cone p={[0, 0.54, 0]} args={[0.3, 0.4, 16]} c={c.skirt} cast />}

      {/* Trup — hruškovitá zploštělá koule */}
      <Sph p={[0, 0.78, 0]} sc={[1, 1.15, 0.88]} radius={0.24} c={c.torso} cast />

      {/* Doplňky na hrudi */}
      {c.tie && (
        <group>
          {/* kravata — uzel + kužel špičkou dolů */}
          <Sph p={[0, 1.0, 0.185]} radius={0.045} c={c.tie} />
          <Cone p={[0, 0.87, 0.19]} r={[Math.PI, 0, 0]} sc={[1, 1, 0.5]} args={[0.055, 0.24, 10]} c={c.tie} />
        </group>
      )}
      {c.stripe && <Tor p={[0, 0.72, 0]} r={[Math.PI / 2, 0, 0]} args={[0.235, 0.04, 10, 22]} c={c.stripe} />}
      {c.vest && (
        <group>
          {/* reflexní vesta — zářivá slupka s bílým pruhem */}
          <Sph p={[0, 0.84, 0]} sc={[1.02, 0.82, 0.9]} radius={0.245} c={c.vest} />
          <Tor p={[0, 0.84, 0]} r={[Math.PI / 2, 0, 0]} args={[0.245, 0.028, 8, 22]} c={WHITE} />
        </group>
      )}
      {c.cross && (
        <group>
          {/* zdravotnický kříž z kapslí */}
          <Caps p={[0, 0.9, 0.2]} radius={0.032} len={0.1} c={c.cross} />
          <Caps p={[0, 0.9, 0.2]} r={[0, 0, Math.PI / 2]} radius={0.032} len={0.1} c={c.cross} />
        </group>
      )}

      {/* Paže — tenké kapsle s velkýma bílýma rukavicema, pivot v rameni */}
      {[[armLRef, -1], [armRRef, 1]].map(([ref, sx]) => (
        <group key={sx} ref={ref} position={[sx * 0.27, 0.98, 0]}>
          <Caps p={[0, -0.17, 0]} radius={0.042} len={0.24} c={c.torso} cast />
          <Sph p={[0, -0.38, 0]} radius={0.085} c={WHITE} cast />
          {c.bag && sx < 0 && <Sph p={[0, -0.45, 0.08]} sc={[1, 0.85, 0.6]} radius={0.11} c={c.bag} />}
        </group>
      ))}

      {/* Hlava — obří koule (~40 % výšky), velké oči, nos bambule, úsměv */}
      <group position={[0, 1.28, 0]} scale={c.headScale || 1}>
        <Sph radius={0.3} c={SKIN} cast />
        <Eye p={[-0.105, 0.05, 0.24]} radius={0.08} />
        <Eye p={[0.105, 0.05, 0.24]} radius={0.08} />
        <Sph p={[0, -0.04, 0.3]} radius={0.06} c="#eba36e" />
        <Tor p={[0, -0.12, 0.235]} r={[0.35, 0, Math.PI]} args={[0.08, 0.014, 8, 12, Math.PI]} c="#8a4a3a" />

        {/* Vlasy — čupřina z koulí; dlouhé vlasy s drdolem u paní */}
        {c.hair && (
          <group>
            <Sph p={[0, 0.09, -0.03]} sc={[1, 0.72, 1]} radius={0.315} c={c.hair} />
            {c.longHair && (
              <group>
                <Sph p={[0, -0.1, -0.2]} sc={[0.95, 1.15, 0.6]} radius={0.28} c={c.hair} />
                <Sph p={[0, 0.31, -0.06]} radius={0.12} c={c.hair} />
              </group>
            )}
          </group>
        )}

        {/* Hasičská helma — kopule s krempou a hřebínkem */}
        {c.hat === 'helma' && (
          <group>
            <Sph p={[0, 0.12, 0]} sc={[1, 0.72, 1]} radius={0.34} c={c.hatColor} cast />
            <Tor p={[0, -0.01, 0]} r={[Math.PI / 2, 0, 0]} args={[0.315, 0.05, 10, 20]} c={c.hatColor} />
            <Caps p={[0, 0.32, 0]} r={[Math.PI / 2, 0, 0]} sc={[0.7, 1, 1]} radius={0.05} len={0.26} c={c.hatColor} />
          </group>
        )}
        {/* Policejní čepice — placka s kšiltem a odznakem */}
        {c.hat === 'cepice' && (
          <group>
            <Sph p={[0, 0.12, 0]} sc={[1, 0.6, 1]} radius={0.315} c={c.hatColor} cast />
            <Sph p={[0, 0.06, 0.29]} sc={[1.1, 0.2, 1.1]} radius={0.16} c={DARK} />
            <Sph p={[0, 0.17, 0.28]} radius={0.045} c="#e8c94a" />
          </group>
        )}
      </group>
    </group>
  );
}

/* ---------- Zvířata — kreslení čtyřnožci s klusem a vrtěním ocasu ---------- */

// Kostra: bodyR/bodyLen/bodyY = kapsle těla, legR/legY = nohy, head = pozice hlavy
const ANIMALS = {
  pes: (v) => ({
    druh: 'pes', srst: v.srst || '#a06432', srstB: v.srstB || '#7d4d26',
    bodyR: 0.14, bodyLen: 0.3, bodyY: 0.34, legR: 0.04, legY: 0.28,
    head: { r: 0.2, y: 0.56, z: 0.3 }, obojek: '#e04848',
  }),
  kocka: (v) => ({
    druh: 'kocka', srst: v.srst || '#2c2c32', srstB: v.srstB || '#44444c',
    bodyR: 0.1, bodyLen: 0.26, bodyY: 0.26, legR: 0.032, legY: 0.21,
    head: { r: 0.16, y: 0.44, z: 0.25 },
  }),
  lev: (v) => ({
    druh: 'lev', srst: v.srst || '#d99c44', srstB: '#e8cf9c', hriva: v.hriva || '#8a5222',
    bodyR: 0.18, bodyLen: 0.4, bodyY: 0.45, legR: 0.055, legY: 0.36,
    head: { r: 0.24, y: 0.88, z: 0.4 },
  }),
  kun: (v) => ({
    druh: 'kun', srst: v.srst || '#8a5530', srstB: v.srstB || '#6b421f', hriva: v.hriva || '#3a2a18',
    bodyR: 0.25, bodyLen: 0.55, bodyY: 0.93, legR: 0.055, legY: 0.72,
    head: { r: 0.17 },
  }),
};

function CartoonAnimal({ conf: a, animRef }) {
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

    // Reset + pár póz zvládnou i zvířata
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

  const legLen = Math.max(0.02, a.legY - 2 * a.legR);
  const legX = a.bodyR * 0.62;
  const legZ = a.bodyLen / 2 + a.bodyR * 0.2;
  const h = a.head;

  return (
    <group ref={rootRef}>
      {/* Tělo — buclatá kapsle podél osy z */}
      <Caps p={[0, a.bodyY, 0]} r={[Math.PI / 2, 0, 0]} radius={a.bodyR} len={a.bodyLen} c={a.srst} cast />

      {/* Nohy — kapsle s tlapkami, pivot v kyčli/rameni */}
      {[[legFL, -1, 1], [legFR, 1, 1], [legBL, -1, -1], [legBR, 1, -1]].map(([ref, sx, sz], i) => (
        <group key={i} ref={ref} position={[sx * legX, a.legY, sz * legZ]}>
          <Caps p={[0, -a.legY / 2, 0]} radius={a.legR} len={legLen} c={a.srstB} cast />
          <Sph p={[0, -a.legY + a.legR, a.legR * 0.5]} sc={[1.1, 0.8, 1.2]} radius={a.legR * 1.3} c={a.srstB} />
        </group>
      ))}

      {/* Obojek (pes) */}
      {a.obojek && (
        <Tor p={[0, a.bodyY + 0.05, a.bodyLen / 2 + 0.02]} r={[Math.PI / 2 - 0.5, 0, 0]} args={[a.bodyR * 0.95, 0.03, 10, 20]} c={a.obojek} />
      )}

      {a.druh === 'pes' && (
        /* Pes — velká hlava, obří čumák-bambule, plandavé uši, komické obočí */
        <group position={[0, h.y, h.z]}>
          <Sph radius={h.r} c={a.srst} cast />
          <Sph p={[0, -0.055, 0.16]} sc={[1.15, 0.82, 1.1]} radius={0.115} c={a.srstB} />
          <Sph p={[0, -0.01, 0.27]} radius={0.05} c="#26221e" />
          <Eye p={[-0.085, 0.075, 0.15]} radius={0.068} />
          <Eye p={[0.085, 0.075, 0.15]} radius={0.068} />
          {/* obočí — tlusté čárky nad očima */}
          <Caps p={[-0.085, 0.17, 0.13]} r={[0, 0, Math.PI / 2 + 0.35]} radius={0.016} len={0.05} c="#3a2a18" />
          <Caps p={[0.085, 0.17, 0.13]} r={[0, 0, Math.PI / 2 - 0.35]} radius={0.016} len={0.05} c="#3a2a18" />
          {/* plandavé uši — zploštělé kapsle po stranách */}
          <Caps p={[-0.2, 0, -0.02]} r={[0, 0, 0.25]} sc={[1, 1, 0.45]} radius={0.05} len={0.13} c={a.srstB} cast />
          <Caps p={[0.2, 0, -0.02]} r={[0, 0, -0.25]} sc={[1, 1, 0.45]} radius={0.05} len={0.13} c={a.srstB} cast />
        </group>
      )}
      {a.druh === 'kocka' && (
        /* Kočka — obrovské oči, špičaté uši-kužely, růžový nosík */
        <group position={[0, h.y, h.z]}>
          <Sph radius={h.r} c={a.srst} cast />
          <Eye p={[-0.07, 0.045, 0.115]} radius={0.068} />
          <Eye p={[0.07, 0.045, 0.115]} radius={0.068} />
          <Sph p={[0, -0.06, 0.12]} sc={[1.3, 0.7, 1]} radius={0.07} c={a.srstB} />
          <Cone p={[0, -0.028, 0.17]} r={[Math.PI, 0, 0]} args={[0.024, 0.035, 8]} c="#e08a9c" />
          {/* uši — kužely s růžovým vnitřkem */}
          <Cone p={[-0.095, 0.155, 0]} r={[0, 0, 0.25]} args={[0.06, 0.14, 10]} c={a.srst} cast />
          <Cone p={[0.095, 0.155, 0]} r={[0, 0, -0.25]} args={[0.06, 0.14, 10]} c={a.srst} cast />
          <Cone p={[-0.09, 0.15, 0.025]} r={[0.15, 0, 0.25]} args={[0.03, 0.08, 8]} c="#e08a9c" />
          <Cone p={[0.09, 0.15, 0.025]} r={[0.15, 0, -0.25]} args={[0.03, 0.08, 8]} c="#e08a9c" />
        </group>
      )}
      {a.druh === 'lev' && (
        /* Lev — obří kulatá hříva z věnce koulí, komicky malé tělo */
        <group position={[0, h.y, h.z]}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const ang = (i / 8) * Math.PI * 2;
            return (
              <Sph key={i} p={[Math.cos(ang) * 0.33, Math.sin(ang) * 0.33, -0.07]} radius={0.17} c={a.hriva} cast />
            );
          })}
          <Sph radius={h.r} c={a.srst} cast />
          <Sph p={[0, -0.07, 0.19]} sc={[1.2, 0.85, 1]} radius={0.13} c={a.srstB} />
          <Sph p={[0, -0.02, 0.3]} radius={0.05} c="#3a2620" />
          <Eye p={[-0.095, 0.09, 0.19]} radius={0.07} />
          <Eye p={[0.095, 0.09, 0.19]} radius={0.07} />
          {/* ouška vykukují nad hřívou */}
          <Sph p={[-0.19, 0.26, 0]} radius={0.07} c={a.srst} />
          <Sph p={[0.19, 0.26, 0]} radius={0.07} c={a.srst} />
        </group>
      )}
      {a.druh === 'kun' && (
        /* Kůň — dlouhý zaoblený krk s hřívou, protáhlá tlama s VELKÝMI nozdrami */
        <group position={[0, a.bodyY + a.bodyR * 0.55, a.bodyLen / 2 + 0.05]} rotation={[0.62, 0, 0]}>
          <Caps p={[0, 0.2, 0]} radius={0.15} len={0.4} c={a.srst} cast />
          {/* hříva — řada koulí po zadní hraně krku */}
          <Sph p={[0, 0.05, -0.15]} radius={0.085} c={a.hriva} />
          <Sph p={[0, 0.22, -0.17]} radius={0.085} c={a.hriva} />
          <Sph p={[0, 0.39, -0.15]} radius={0.08} c={a.hriva} />
          <group position={[0, 0.48, 0.02]} rotation={[-0.45, 0, 0]}>
            <Sph sc={[0.95, 1, 1.1]} radius={h.r} c={a.srst} cast />
            {/* tlama dopředu-dolů + velké nozdry */}
            <Caps p={[0, -0.05, 0.16]} r={[Math.PI / 2, 0, 0]} sc={[1, 1, 0.9]} radius={0.105} len={0.14} c={a.srst} />
            <Sph p={[0, -0.06, 0.27]} sc={[1.05, 0.9, 0.7]} radius={0.1} c={a.srstB} />
            <Sph p={[-0.055, -0.035, 0.31]} radius={0.038} c="#2a211c" />
            <Sph p={[0.055, -0.035, 0.31]} radius={0.038} c="#2a211c" />
            <Eye p={[-0.1, 0.07, 0.1]} radius={0.055} />
            <Eye p={[0.1, 0.07, 0.1]} radius={0.055} />
            <Cone p={[-0.08, 0.19, -0.04]} r={[0.15, 0, 0.2]} args={[0.045, 0.13, 8]} c={a.srst} />
            <Cone p={[0.08, 0.19, -0.04]} r={[0.15, 0, -0.2]} args={[0.045, 0.13, 8]} c={a.srst} />
          </group>
        </group>
      )}

      {/* Ocas — vrtí se v useFrame (rotation.y) */}
      {a.druh === 'pes' && (
        <group ref={tailRef} position={[0, a.bodyY + a.bodyR * 0.5, -(a.bodyLen / 2 + a.bodyR * 0.6)]} rotation={[-0.9, 0, 0]}>
          <Caps p={[0, 0.1, 0]} radius={0.035} len={0.14} c={a.srstB} />
          <Sph p={[0, 0.21, 0]} radius={0.05} c={WHITE} />
        </group>
      )}
      {a.druh === 'kocka' && (
        /* dlouhý zvlněný ocas — řetízek kapslí do S */
        <group ref={tailRef} position={[0, a.bodyY + 0.04, -(a.bodyLen / 2 + 0.06)]} rotation={[-0.6, 0, 0]}>
          <Caps p={[0, 0.08, 0]} radius={0.028} len={0.12} c={a.srst} />
          <group position={[0, 0.16, 0]} rotation={[0.7, 0, 0]}>
            <Caps p={[0, 0.07, 0]} radius={0.026} len={0.1} c={a.srst} />
            <group position={[0, 0.14, 0]} rotation={[0.7, 0, 0]}>
              <Caps p={[0, 0.06, 0]} radius={0.024} len={0.08} c={a.srst} />
              <Sph p={[0, 0.12, 0]} radius={0.035} c={a.srstB} />
            </group>
          </group>
        </group>
      )}
      {a.druh === 'lev' && (
        <group ref={tailRef} position={[0, a.bodyY + a.bodyR * 0.4, -(a.bodyLen / 2 + a.bodyR * 0.7)]} rotation={[-0.5, 0, 0]}>
          <Caps p={[0, 0.16, 0]} radius={0.03} len={0.26} c={a.srst} />
          <Sph p={[0, 0.34, 0]} radius={0.08} c={a.hriva} />
        </group>
      )}
      {a.druh === 'kun' && (
        <group ref={tailRef} position={[0, a.bodyY + a.bodyR * 0.6, -(a.bodyLen / 2 + a.bodyR * 0.7)]} rotation={[0.45, 0, 0]}>
          <Caps p={[0, -0.18, 0]} radius={0.07} len={0.26} c={a.hriva} />
        </group>
      )}
    </group>
  );
}

/* ---------- Vozidla — boubelaté kreslené karoserie ---------- */

// Rozměry: délka, šířka, pozice náprav (wz) a poloměr velkých kol (wr)
const CAR_SHAPES = {
  sedan: { len: 4.2, w: 1.7, wz: 1.35, wr: 0.36 },
  hatchback: { len: 3.6, w: 1.65, wz: 1.15, wr: 0.36 },
  kombi: { len: 4.4, w: 1.7, wz: 1.45, wr: 0.36 },
  dodavka: { len: 4.4, w: 1.8, wz: 1.5, wr: 0.38 },
  veteran: { len: 3.8, w: 1.5, wz: 1.25, wr: 0.38 },
};

// Boubelatý blatník — půloblouk torusu klenoucí se nad kolem
function Fender({ p, wr, c }) {
  return <Tor p={p} r={[0, Math.PI / 2, 0]} args={[wr + 0.13, 0.11, 10, 18, Math.PI]} c={c} />;
}

// Kulaté reflektory (emissive) a koncová světla
function CarLights({ w, hl, y = 0.68 }) {
  const x = w / 2 - 0.35;
  return (
    <group>
      <Sph p={[-x, y, hl]} radius={0.13} c="#fff4c2" e="#ffdd77" ei={0.9} />
      <Sph p={[x, y, hl]} radius={0.13} c="#fff4c2" e="#ffdd77" ei={0.9} />
      <Sph p={[-x, y, -hl]} radius={0.09} c="#ff6655" e="#dd2222" ei={0.7} />
      <Sph p={[x, y, -hl]} radius={0.09} c="#ff6655" e="#dd2222" ei={0.7} />
    </group>
  );
}

function CartoonCar({ v, animRef }) {
  const addWheel = useWheels(animRef);
  const typ = v.typ || 'sedan';
  const barva = v.barva || '#e0442f';
  const sh = CAR_SHAPES[typ] || CAR_SHAPES.sedan;
  const hw = sh.w / 2;
  const hl = sh.len / 2;

  return (
    <group>
      {/* Karoserie + kabina dle typu — kapsle a zploštělé koule */}
      {typ === 'sedan' && (
        <group>
          <Caps p={[0, 0.6, 0]} r={[Math.PI / 2, 0, 0]} sc={[1.7, 1.05, 1]} radius={0.5} len={3.2} c={barva} cast />
          <Sph p={[0, 1.05, -0.25]} sc={[0.78, 0.55, 1.15]} radius={0.95} c={GLASS} cast />
          <Sph p={[0, 1.35, -0.25]} sc={[0.8, 0.28, 1.0]} radius={0.8} c={barva} />
        </group>
      )}
      {typ === 'hatchback' && (
        <group>
          <Caps p={[0, 0.6, 0]} r={[Math.PI / 2, 0, 0]} sc={[1.65, 1.05, 1]} radius={0.5} len={2.6} c={barva} cast />
          <Sph p={[0, 1.03, -0.3]} sc={[0.76, 0.55, 1.0]} radius={0.95} c={GLASS} cast />
          <Sph p={[0, 1.32, -0.3]} sc={[0.78, 0.28, 0.86]} radius={0.8} c={barva} />
        </group>
      )}
      {typ === 'kombi' && (
        <group>
          <Caps p={[0, 0.6, 0]} r={[Math.PI / 2, 0, 0]} sc={[1.7, 1.05, 1]} radius={0.5} len={3.4} c={barva} cast />
          <Sph p={[0, 1.05, -0.5]} sc={[0.78, 0.55, 1.45]} radius={0.95} c={GLASS} cast />
          <Sph p={[0, 1.35, -0.5]} sc={[0.8, 0.28, 1.3]} radius={0.8} c={barva} />
        </group>
      )}
      {typ === 'dodavka' && (
        <group>
          {/* buclatá dodávka — nízká kapsle + velký hrb nákladu */}
          <Caps p={[0, 0.66, 0]} r={[Math.PI / 2, 0, 0]} sc={[1.45, 1, 1]} radius={0.62} len={3.15} c={barva} cast />
          <Caps p={[0, 1.35, -0.35]} r={[Math.PI / 2, 0, 0]} sc={[1.5, 1, 1]} radius={0.58} len={2.2} c={barva} cast />
          <Sph p={[0, 1.32, 1.52]} sc={[1, 0.62, 0.35]} radius={0.72} c={GLASS} />
        </group>
      )}
      {typ === 'veteran' && (
        <group>
          {/* stupačky, úzká karoserie, kapota-kapsle a vysoká zakulacená kabina */}
          <Caps p={[-0.62, 0.42, 0]} r={[Math.PI / 2, 0, 0]} sc={[1, 0.5, 1]} radius={0.16} len={2.6} c={DARK} />
          <Caps p={[0.62, 0.42, 0]} r={[Math.PI / 2, 0, 0]} sc={[1, 0.5, 1]} radius={0.16} len={2.6} c={DARK} />
          <Caps p={[0, 0.62, -0.3]} r={[Math.PI / 2, 0, 0]} sc={[1.35, 0.95, 1]} radius={0.42} len={2.2} c={barva} cast />
          <Caps p={[0, 0.72, 1.3]} r={[Math.PI / 2, 0, 0]} sc={[1.2, 0.9, 1]} radius={0.34} len={0.9} c={barva} cast />
          <Sph p={[0, 1.28, -0.7]} sc={[0.72, 0.85, 0.7]} radius={0.95} c={barva} cast />
          <Sph p={[0, 1.32, -0.1]} sc={[0.58, 0.45, 0.25]} radius={0.9} c={GLASS} />
          {/* mřížka chladiče + kulatá světla na nožkách */}
          <Cyl p={[0, 0.68, 1.85]} r={[Math.PI / 2, 0, 0]} args={[0.3, 0.34, 0.12, 14]} c={DARK} />
          <Sph p={[-0.45, 0.98, 1.78]} radius={0.11} c="#fff4c2" e="#ffdd77" ei={0.9} />
          <Sph p={[0.45, 0.98, 1.78]} radius={0.11} c="#fff4c2" e="#ffdd77" ei={0.9} />
          <Cyl p={[-0.45, 0.88, 1.78]} args={[0.03, 0.03, 0.14, 8]} c={DARK} />
          <Cyl p={[0.45, 0.88, 1.78]} args={[0.03, 0.03, 0.14, 8]} c={DARK} />
        </group>
      )}

      {/* Nárazníky-kapsle a světla (veterán má vlastní světla nahoře) */}
      <Caps p={[0, 0.36, hl - 0.05]} r={[0, 0, Math.PI / 2]} radius={0.09} len={sh.w * 0.72} c="#dfe2e6" />
      <Caps p={[0, 0.36, -hl + 0.05]} r={[0, 0, Math.PI / 2]} radius={0.09} len={sh.w * 0.72} c="#dfe2e6" />
      {typ !== 'veteran' && <CarLights w={sh.w} hl={hl + 0.02} />}

      {/* Boubelaté blatníky + 4 velká kola s bílými boky */}
      {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz], i) => (
        <group key={i}>
          <Fender p={[sx * (hw - 0.06), sh.wr + 0.05, sz * sh.wz]} wr={sh.wr} c={barva} />
          <Wheel refFn={addWheel} p={[sx * (hw - 0.05), sh.wr, sz * sh.wz]} radius={sh.wr} />
        </group>
      ))}
    </group>
  );
}

function BusModel({ v, animRef }) {
  const addWheel = useWheels(animRef);
  const barva = v.barva || '#e0442f';
  return (
    <group>
      {/* buclatý trup — jedna velká kapsle */}
      <Caps p={[0, 1.45, 0]} r={[Math.PI / 2, 0, 0]} sc={[0.87, 1.02, 1]} radius={1.32} len={6.3} c={barva} cast />
      {/* velké čelní a zadní sklo */}
      <Sph p={[0, 1.85, 4.3]} sc={[1, 0.7, 0.3]} radius={0.95} c={GLASS} />
      <Sph p={[0, 1.85, -4.3]} sc={[1, 0.55, 0.3]} radius={0.95} c={GLASS} />
      {/* řada kulatých bočních oken */}
      {[-3.1, -1.55, 0, 1.55, 3.1].map((z) =>
        [-1, 1].map((sx) => (
          <Sph key={`${z}-${sx}`} p={[sx * 1.02, 2.05, z]} sc={[0.16, 0.85, 1]} radius={0.5} c={GLASS} />
        ))
      )}
      {/* dveře na pravé straně */}
      <Sph p={[1.04, 1.2, 2.4]} sc={[0.14, 1, 0.6]} radius={0.75} c={DARK} />
      <Sph p={[1.04, 1.2, -0.6]} sc={[0.14, 1, 0.6]} radius={0.75} c={DARK} />
      {/* klimatizace — bílý bochánek na střeše */}
      <Caps p={[0, 2.78, 0.4]} r={[Math.PI / 2, 0, 0]} sc={[1, 0.4, 1]} radius={0.55} len={1.8} c={WHITE} />
      {/* nárazníky a světla */}
      <Caps p={[0, 0.5, 4.42]} r={[0, 0, Math.PI / 2]} radius={0.12} len={1.6} c="#dfe2e6" />
      <Caps p={[0, 0.5, -4.42]} r={[0, 0, Math.PI / 2]} radius={0.12} len={1.6} c="#dfe2e6" />
      <Sph p={[-0.8, 0.85, 4.48]} radius={0.14} c="#fff4c2" e="#ffdd77" ei={0.9} />
      <Sph p={[0.8, 0.85, 4.48]} radius={0.14} c="#fff4c2" e="#ffdd77" ei={0.9} />
      <Sph p={[-0.8, 0.85, -4.48]} radius={0.1} c="#ff6655" e="#dd2222" ei={0.7} />
      <Sph p={[0.8, 0.85, -4.48]} radius={0.1} c="#ff6655" e="#dd2222" ei={0.7} />
      {/* 6 velkých kol — přední náprava + zadní dvojnáprava */}
      {[3.1, -2.1, -3.2].map((z) =>
        [1, -1].map((sx) => (
          <Wheel key={`${z}-${sx}`} refFn={addWheel} p={[sx * 1.0, 0.44, z]} radius={0.44} width={0.28} />
        ))
      )}
    </group>
  );
}

function TramModel({ v, animRef }) {
  const addWheel = useWheels(animRef);
  const dolni = v.barva || '#e0442f';
  const horni = v.krem || '#f5ecce';
  return (
    <group>
      {/* zaoblená skříň s buclatým čumákem — krémová kapsle + spodní barevný pás */}
      <Caps p={[0, 1.55, 0]} r={[Math.PI / 2, 0, 0]} sc={[1.03, 1.12, 1]} radius={1.02} len={8.4} c={horni} cast />
      <Caps p={[0, 1.02, 0]} r={[Math.PI / 2, 0, 0]} sc={[1.08, 0.55, 1]} radius={1.03} len={8.4} c={dolni} cast />
      {/* tmavý kryt podvozku */}
      <Caps p={[0, 0.42, 0]} r={[Math.PI / 2, 0, 0]} sc={[0.85, 0.35, 1]} radius={1.0} len={7.6} c={DARK} />
      {/* kulatá boční okna + velká čelní/zadní skla */}
      {[-3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9].map((z) =>
        [-1, 1].map((sx) => (
          <Sph key={`${z}-${sx}`} p={[sx * 1.0, 2.1, z]} sc={[0.16, 1, 1]} radius={0.44} c={GLASS} />
        ))
      )}
      <Sph p={[0, 2.0, 5.05]} sc={[0.75, 0.6, 0.3]} radius={1.0} c={GLASS} />
      <Sph p={[0, 2.0, -5.05]} sc={[0.75, 0.6, 0.3]} radius={1.0} c={GLASS} />
      {/* střecha */}
      <Caps p={[0, 2.62, 0]} r={[Math.PI / 2, 0, 0]} sc={[0.8, 0.3, 1]} radius={0.95} len={7.8} c="#9aa0aa" />
      {/* pantograf z tenkých válců */}
      <group position={[0, 2.8, 1.6]}>
        <Cyl p={[0, 0.04, 0]} args={[0.35, 0.42, 0.1, 14]} c={DARK} />
        <Cyl p={[0, 0.3, -0.14]} r={[0.55, 0, 0]} args={[0.03, 0.03, 0.55, 10]} c="#4a505a" />
        <Cyl p={[0, 0.3, 0.14]} r={[-0.55, 0, 0]} args={[0.03, 0.03, 0.55, 10]} c="#4a505a" />
        <Caps p={[0, 0.56, 0]} r={[0, 0, Math.PI / 2]} radius={0.035} len={1.1} c="#4a505a" />
      </group>
      {/* světla */}
      <Sph p={[-0.55, 0.85, 5.15]} radius={0.12} c="#fff4c2" e="#ffdd77" ei={0.9} />
      <Sph p={[0.55, 0.85, 5.15]} radius={0.12} c="#fff4c2" e="#ffdd77" ei={0.9} />
      <Sph p={[-0.55, 0.85, -5.15]} radius={0.09} c="#ff6655" e="#dd2222" ei={0.7} />
      <Sph p={[0.55, 0.85, -5.15]} radius={0.09} c="#ff6655" e="#dd2222" ei={0.7} />
      {/* malá kola schovaná pod krytem */}
      {[[1, 3.4], [-1, 3.4], [1, -3.4], [-1, -3.4]].map(([sx, z], i) => (
        <Wheel key={i} refFn={addWheel} p={[sx * 0.8, 0.24, z]} radius={0.24} width={0.16} />
      ))}
    </group>
  );
}

/* ---------- Statika — zaoblená kreslená ---------- */

function StromModel({ v }) {
  const listy = v.listy || '#4f9440';
  const kmen = v.kmen || '#7d5533';
  if (v.tvar === 'jehlicnaty') {
    // jehličnan — kmen + tři patra oblých kuželů se špičkou-kuličkou
    return (
      <group>
        <Cyl p={[0, 0.4, 0]} args={[0.13, 0.2, 0.8, 12]} c={kmen} cast />
        <Cone p={[0, 1.2, 0]} args={[0.85, 1.1, 16]} c={listy} cast />
        <Cone p={[0, 1.95, 0]} args={[0.65, 1.0, 16]} c={listy} cast />
        <Cone p={[0, 2.6, 0]} args={[0.45, 0.9, 16]} c={listy} />
        <Sph p={[0, 3.05, 0]} radius={0.1} c={listy} />
      </group>
    );
  }
  if (v.tvar === 'kulaty') {
    // kulatý strom — lízátko: kmen + jedna velká koule
    return (
      <group>
        <Cyl p={[0, 0.6, 0]} args={[0.14, 0.21, 1.2, 12]} c={kmen} cast />
        <Sph p={[0, 2.05, 0]} sc={[1, 0.95, 1]} radius={1.0} c={listy} cast />
        <Sph p={[0.55, 2.6, 0.3]} radius={0.35} c={listy} />
      </group>
    );
  }
  // listnatý — koruna-obláček z překrývajících se koulí
  return (
    <group>
      <Cyl p={[0, 0.65, 0]} args={[0.15, 0.23, 1.3, 12]} c={kmen} cast />
      <Sph p={[0, 2.2, 0]} radius={0.85} c={listy} cast />
      <Sph p={[0.55, 1.85, 0.3]} radius={0.6} c={listy} cast />
      <Sph p={[-0.5, 1.9, -0.25]} radius={0.58} c={listy} />
      <Sph p={[0.1, 2.75, -0.15]} radius={0.45} c={listy} />
    </group>
  );
}

function KerModel({ v }) {
  const barva = v.barva || '#4f9440';
  // hromádka měkkých koulí
  return (
    <group>
      <Sph p={[0, 0.32, 0]} sc={[1, 0.7, 1]} radius={0.52} c={barva} cast />
      <Sph p={[0.32, 0.28, 0.18]} sc={[1, 0.75, 1]} radius={0.32} c={barva} cast />
      <Sph p={[-0.3, 0.3, -0.12]} sc={[1, 0.8, 1]} radius={0.28} c={barva} />
    </group>
  );
}

// Kreslený květ — věneček okvětních koulí kolem středu (míří vzhůru)
function Kvet({ p = [0, 0, 0], barva, stred = '#f2d54a', r = 0.055 }) {
  return (
    <group position={p}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const ang = (i / 6) * Math.PI * 2;
        return (
          <Sph key={i} p={[Math.cos(ang) * r * 1.5, 0, Math.sin(ang) * r * 1.5]} sc={[1, 0.55, 1]} radius={r} c={barva} />
        );
      })}
      <Sph p={[0, 0.02, 0]} sc={[1, 0.7, 1]} radius={r * 0.8} c={stred} />
    </group>
  );
}

function KvetinaModel({ v }) {
  const barva = v.barva || '#e0524a';
  return (
    <group>
      {/* stonek s lístky-kapkami a věnečkem okvětních koulí */}
      <Cyl p={[0, 0.2, 0]} args={[0.018, 0.026, 0.4, 10]} c="#4f9440" />
      <Sph p={[-0.07, 0.15, 0]} r={[0, 0, 0.6]} sc={[1.6, 0.4, 0.7]} radius={0.05} c="#4f9440" />
      <Sph p={[0.07, 0.1, 0]} r={[0, 0, -0.6]} sc={[1.6, 0.4, 0.7]} radius={0.05} c="#4f9440" />
      <Kvet p={[0, 0.44, 0]} barva={barva} r={0.06} />
    </group>
  );
}

function KvetinacModel({ v }) {
  const kvety = v.kvety || ['#e0524a', '#f2d54a', '#e0524a'];
  return (
    <group>
      {/* zaoblený terakotový truhlík (kapsle naležato) s hlínou a řádkou květů */}
      <Caps p={[0, 0.2, 0]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.42]} radius={0.22} len={0.76} c="#b06040" cast />
      <Caps p={[0, 0.3, 0]} r={[0, 0, Math.PI / 2]} sc={[1, 0.9, 0.36]} radius={0.19} len={0.72} c="#46331f" />
      {kvety.map((barva, i) => (
        <group key={i} position={[-0.33 + i * 0.33, 0.33, 0]}>
          <Cyl p={[0, 0.1, 0]} args={[0.014, 0.02, 0.2, 8]} c="#4f9440" />
          <Kvet p={[0, 0.22, 0]} barva={barva} r={0.045} />
        </group>
      ))}
    </group>
  );
}

function BudkaModel({ v }) {
  if (v.typ === 'novinova') {
    // trafika — kulatý kiosek s kuželovou stříškou a okénkem s pultem
    const barva = v.barva || '#5a7d94';
    return (
      <group>
        <Cyl p={[0, 1.0, 0]} args={[0.55, 0.6, 2.0, 16]} c={barva} cast />
        <Sph p={[0, 1.45, 0.48]} sc={[1, 0.75, 0.35]} radius={0.42} c={GLASS} />
        {/* pult s novinami */}
        <Caps p={[0, 1.08, 0.56]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.6]} radius={0.09} len={0.7} c="#7d5533" />
        <Sph p={[-0.18, 1.16, 0.56]} sc={[1.6, 0.35, 1]} radius={0.09} c={WHITE} />
        <Sph p={[0.16, 1.16, 0.56]} sc={[1.6, 0.35, 1]} radius={0.09} c="#e0524a" />
        {/* kuželová stříška s kuličkou */}
        <Cone p={[0, 2.25, 0]} args={[0.78, 0.55, 16]} c="#3f4650" cast />
        <Sph p={[0, 2.58, 0]} radius={0.09} c="#f2c53d" />
      </group>
    );
  }
  // telefonní budka — oranžový válec se sklem a kopulí
  const o = v.barva || '#f28422';
  return (
    <group>
      <Cyl p={[0, 0.11, 0]} args={[0.55, 0.6, 0.22, 16]} c={o} cast />
      <Cyl p={[0, 1.2, 0]} args={[0.45, 0.45, 1.95, 16]} c={GLASS} />
      {/* rohové sloupky na kruhu */}
      {[0.25, 0.75, 1.25, 1.75].map((k) => (
        <Cyl key={k} p={[Math.cos(k * Math.PI) * 0.45, 1.2, Math.sin(k * Math.PI) * 0.45]} args={[0.05, 0.05, 2.0, 10]} c={o} cast />
      ))}
      <Tor p={[0, 2.2, 0]} r={[Math.PI / 2, 0, 0]} args={[0.48, 0.07, 10, 20]} c={o} />
      <Sph p={[0, 2.28, 0]} sc={[1, 0.55, 1]} radius={0.52} c={o} cast />
      <Sph p={[0, 2.48, 0]} radius={0.07} c={o} />
    </group>
  );
}

function StanekModel({ v }) {
  const plachta = v.plachta || '#e0442f';
  return (
    <group>
      {/* zadní stěna — zaoblená deska z kapsle */}
      <Caps p={[0, 1.0, -0.8]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.16]} radius={0.9} len={1.0} c="#9c7a4d" cast />
      {/* čtyři dřevěné sloupky */}
      {[[-1.05, 0.75], [1.05, 0.75], [-1.05, -0.75], [1.05, -0.75]].map(([x, z], i) => (
        <Cyl key={i} p={[x, 1.1, z]} args={[0.06, 0.07, 2.2, 12]} c="#7d5533" cast />
      ))}
      {/* pult (kapsle naležato) s přední plachtou a kopečky zboží */}
      <Caps p={[0, 0.95, 0.5]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.5]} radius={0.32} len={1.9} c="#8a6238" cast />
      <Caps p={[0, 0.45, 0.66]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.18]} radius={0.42} len={1.7} c={plachta} />
      <Sph p={[-0.6, 1.2, 0.45]} sc={[1.3, 0.7, 1]} radius={0.16} c="#f2d54a" />
      <Sph p={[0.05, 1.22, 0.5]} sc={[1.2, 0.8, 1]} radius={0.15} c="#4f9440" />
      <Sph p={[0.65, 1.2, 0.45]} radius={0.13} c="#e0524a" />
      {/* oblá stříška-bochánek + zubatý lem markýzy z půlkoulí */}
      <Caps p={[0, 2.42, 0]} r={[0, 0, Math.PI / 2]} sc={[1, 0.38, 1.15]} radius={0.72} len={1.9} c={plachta} cast />
      {[-1.0, -0.5, 0, 0.5, 1.0].map((x, i) => (
        <Sph key={i} p={[x, 2.32, 0.82]} radius={0.19} c={i % 2 ? WHITE : plachta} />
      ))}
    </group>
  );
}

function BillboardModel({ v }) {
  const pruhy = v.pruhy || ['#e0524a', '#f2d54a', '#3a6fd0'];
  return (
    <group>
      {/* dvě nohy-válce + deska se zaoblenými rohy (kapsle naležato) */}
      <Cyl p={[-1.2, 1.0, 0]} args={[0.09, 0.12, 2.0, 12]} c="#565c66" cast />
      <Cyl p={[1.2, 1.0, 0]} args={[0.09, 0.12, 2.0, 12]} c="#565c66" cast />
      <Caps p={[0, 2.7, -0.06]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.22]} radius={0.9} len={2.1} c="#3f4650" cast />
      <Caps p={[0, 2.7, 0.02]} r={[0, 0, Math.PI / 2]} sc={[0.92, 0.95, 0.18]} radius={0.9} len={2.1} c={WHITE} />
      {/* abstraktní reklama — tři různě velké barevné bubliny */}
      <Sph p={[-1.05, 2.65, 0.14]} sc={[1, 1, 0.25]} radius={0.62} c={pruhy[0]} />
      <Sph p={[0.35, 2.95, 0.14]} sc={[1, 1, 0.25]} radius={0.42} c={pruhy[1]} />
      <Sph p={[1.15, 2.35, 0.14]} sc={[1, 1, 0.25]} radius={0.3} c={pruhy[2]} />
      {/* lampička nad deskou */}
      <Cyl p={[0, 3.85, 0.1]} r={[0.5, 0, 0]} args={[0.03, 0.03, 0.5, 8]} c="#565c66" />
      <Sph p={[0, 3.95, 0.28]} radius={0.09} c="#fff4c2" e="#ffdd77" ei={0.8} />
    </group>
  );
}

function KosModel({ v }) {
  const barva = v.barva || '#4a8a4a';
  return (
    <group>
      {/* soudkovitý koš s obroučkou */}
      <Cyl p={[0, 0.42, 0]} args={[0.17, 0.14, 0.78, 14]} c={barva} cast />
      <Tor p={[0, 0.82, 0]} r={[Math.PI / 2, 0, 0]} args={[0.17, 0.045, 10, 18]} c={DARK} />
      <Tor p={[0, 0.16, 0]} r={[Math.PI / 2, 0, 0]} args={[0.155, 0.03, 8, 18]} c={DARK} />
    </group>
  );
}

function PopelniceModel({ v }) {
  const barva = v.barva || '#3f434c';
  return (
    <group>
      {/* baculatý sud s kopulovitým víkem, madlem a kolečky */}
      <Cyl p={[0, 0.6, 0]} args={[0.36, 0.3, 0.9, 16]} c={barva} cast />
      <Sph p={[0, 1.05, 0]} sc={[1, 0.42, 1]} radius={0.4} c={v.viko || DARK} cast />
      <Caps p={[0, 1.2, 0.16]} r={[0, 0, Math.PI / 2]} radius={0.035} len={0.22} c={DARK} />
      <Cyl p={[-0.2, 0.08, -0.22]} r={[0, 0, Math.PI / 2]} args={[0.08, 0.08, 0.06, 12]} c={DARK} />
      <Cyl p={[0.2, 0.08, -0.22]} r={[0, 0, Math.PI / 2]} args={[0.08, 0.08, 0.06, 12]} c={DARK} />
    </group>
  );
}

function SchrankaModel() {
  return (
    <group>
      {/* oranžová schránka — zaoblené tělíčko (kapsle) na nožce */}
      <Cyl p={[0, 0.35, 0]} args={[0.05, 0.07, 0.7, 12]} c="#3f4650" cast />
      <Caps p={[0, 0.92, 0]} sc={[1.05, 1, 0.72]} radius={0.24} len={0.28} c="#f28422" cast />
      {/* štěrbina na dopisy + cedulka */}
      <Caps p={[0, 1.02, 0.165]} r={[0, 0, Math.PI / 2]} sc={[1, 1, 0.5]} radius={0.025} len={0.22} c={DARK} />
      <Sph p={[0, 0.84, 0.17]} sc={[1.4, 0.8, 0.3]} radius={0.09} c={WHITE} />
    </group>
  );
}

/* ---------- Hlavní komponenta ---------- */


// Custom asset z editoru 3D modelů — seznam primitiv {shape, pos, rot, args, color, emissive}
function CustomPartsModel({ parts }) {
  return (
    <group>
      {(parts || []).map((part, i) => {
        const args = part.args || [];
        return (
          <mesh
            key={i}
            position={part.pos || [0, 0, 0]}
            rotation={part.rot || [0, 0, 0]}
            scale={part.scale || [1, 1, 1]}
            castShadow
          >
            {part.shape === 'sphere' && <sphereGeometry args={[args[0] ?? 0.3, 12, 10]} />}
            {part.shape === 'capsule' && (
              <capsuleGeometry args={[args[0] ?? 0.15, args[1] ?? 0.4, 4, 10]} />
            )}
            {part.shape === 'cylinder' && (
              <cylinderGeometry args={[args[0] ?? 0.2, args[1] ?? 0.2, args[2] ?? 0.5, 12]} />
            )}
            {part.shape === 'cone' && <coneGeometry args={[args[0] ?? 0.25, args[1] ?? 0.5, 12]} />}
            {(!part.shape || part.shape === 'box') && (
              <boxGeometry args={[args[0] ?? 0.4, args[1] ?? 0.4, args[2] ?? 0.4]} />
            )}
            <ToonMat
              color={part.color || '#cccccc'}
              emissive={part.emissive || '#000000'}
              emissiveIntensity={part.emissive ? 0.6 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function AssetModel({ type, variant = 0, animRef = null }) {
  // custom assety z administrace (definice dílů v katalogu)
  const customDef = ASSET_TYPES[type];
  if (customDef?.parts) return <CustomPartsModel parts={customDef.parts} />;

  const def = ASSET_TYPES[type];
  const vars = def?.variants || [];
  const n = Number.isFinite(variant) ? Math.floor(variant) : 0;
  const v = (vars.length ? vars[((n % vars.length) + vars.length) % vars.length] : null) || {};

  // Lidé a zvířata sdílejí parametrické kreslené komponenty
  if (PEOPLE[type]) return <CartoonPerson conf={PEOPLE[type](v)} animRef={animRef} />;
  if (ANIMALS[type]) return <CartoonAnimal conf={ANIMALS[type](v)} animRef={animRef} />;

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
    case 'auto': return <CartoonCar v={v} animRef={animRef} />;
    case 'autobus': return <BusModel v={v} animRef={animRef} />;
    case 'tramvaj': return <TramModel v={v} animRef={animRef} />;
    default:
      // Neznámý typ — šedá zástupná koule
      return <Sph p={[0, 0.5, 0]} radius={0.5} c="#9a9a9a" cast />;
  }
}
