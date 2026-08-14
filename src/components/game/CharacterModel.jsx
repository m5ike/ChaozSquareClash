import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getFaceTexture, getExpressionTexture } from '@/game/faces.js';
import { getProtection } from '@/game/hitZones.js';
import { ToonMat } from '@/game/toon.jsx';
import WeaponModel from '@/components/game/WeaponModel.jsx';

// Kloubový low-poly humanoid ve stylu retro Quake/Minecraft.
// Kořen modelu je v úrovni chodidel (y = 0), výška ~1.45 m.
// Animace řídí sdílený objekt `animRef.current`:
//   speed (0..1 chůze), attackTimer (odpočet útoku), dead (pád),
//   deadTime (interní čas pádu), flashTimer (záblesk zásahu).

// Oblečení podle kategorie postavy — barva postavy zůstává hlavním poznávacím znakem.
function outfitFor(character) {
  const color = character?.color || '#cc4444';
  switch (character?.cat) {
    case 'Politik':
      return { torso: '#2b2b35', sleeve: '#2b2b35', pants: '#23232b', accent: color, tie: true };
    case 'Sport':
      return { torso: color, sleeve: '#f4f4f4', pants: '#eeeeee', accent: '#ffffff', headband: true };
    case 'Hudba':
      return { torso: color, sleeve: color, pants: '#222228', accent: '#111111', hat: true };
    case 'TV':
      return { torso: '#4a3a5a', sleeve: '#4a3a5a', pants: '#33303a', accent: color, tie: true };
    case 'Net':
      return { torso: '#44506a', sleeve: '#44506a', pants: '#333a44', accent: color, hood: true };
    default:
      return { torso: color, sleeve: color, pants: '#3a3a3a', accent: '#d8d8d8' };
  }
}

const SKIN = '#e0b088';
const SHOE = '#241a12';

export default function CharacterModel({ character, animRef, team = null, outfitOverride = null, weaponSkin = null }) {
  const rootRef = useRef(); // pivot pádu (u chodidel)
  const armLRef = useRef();
  const armRRef = useRef();
  const legLRef = useRef();
  const legRRef = useRef();
  const fingerRef = useRef(); // prostředníček (gesto fuck off)
  const thumbRef = useRef(); // palec (thumb-up)
  const faceMatRef = useRef(); // materiál obličeje (mimika)
  const walkPhase = useRef(Math.random() * Math.PI * 2);
  const materialsRef = useRef([]);

  const outfit = useMemo(
    () => ({ ...outfitFor(character), ...(outfitOverride || {}) }),
    [character, outfitOverride]
  );
  // postava s helmou (přilba/maska/čepice…) ji nosí i vizuálně — chrání hlavu
  const hasHelmet = useMemo(() => getProtection(character).helmetProtect > 0, [character]);
  const faceTexture = useMemo(() => getFaceTexture(character), [character]);

  // Posbírej materiály jednou — kvůli bílému emissive záblesku při zásahu
  useEffect(() => {
    const mats = [];
    rootRef.current?.traverse((obj) => {
      if (obj.isMesh && obj.material?.emissive) mats.push(obj.material);
    });
    materialsRef.current = mats;
  }, []);

  useFrame((_, delta) => {
    const anim = animRef?.current;
    const root = rootRef.current;
    if (!anim || !root) return;

    if (anim.dead) {
      // Ragdoll: pád řídí fyzika (RigidBody), model jen zamrzne v póze.
      // Jinak skriptovaný pád dozadu kolem chodidel (ease-in) s mírným zabořením.
      if (!anim.ragdoll) {
        anim.deadTime = (anim.deadTime || 0) + delta;
        const t = Math.min(1, anim.deadTime / 0.5);
        root.rotation.x = (-Math.PI / 2) * t * t;
        root.position.y = -0.06 * t;
      }
    } else {
      anim.deadTime = 0;
      root.rotation.x = 0;
      root.position.y = 0;

      // Chůze — protichůdný švih nohou a paží, fáze běží jen při pohybu
      const moving = anim.speed || 0;
      walkPhase.current += delta * 8 * moving;
      const swing = Math.sin(walkPhase.current) * 0.55 * moving;
      if (legLRef.current) legLRef.current.rotation.x = swing;
      if (legRRef.current) legRRef.current.rotation.x = -swing;
      if (armLRef.current) armLRef.current.rotation.x = -swing * 0.7;

      // Pravá ruka: útok (rychlé zvednutí vpřed) má přednost před švihem
      if (armRRef.current) {
        if (anim.attackTimer > 0) {
          anim.attackTimer -= delta;
          const progress = 1 - Math.max(0, anim.attackTimer) / 0.35;
          armRRef.current.rotation.x = -1.7 * Math.sin(progress * Math.PI);
        } else {
          armRRef.current.rotation.x = swing * 0.7;
        }
      }

      // Animace výměny zbraně — krátké máchnutí paží dolů
      if (anim.weaponSwap > 0) {
        anim.weaponSwap -= delta;
        if (armRRef.current) armRRef.current.rotation.x = 0.9 * Math.sin((anim.weaponSwap / 0.4) * Math.PI);
      }

      // --- Tělesná gesta (přepisují pózu končetin/akrobacie) ---
      const gesture = anim.gesture;
      if (gesture) {
        gesture.t += delta;
        const progress = Math.min(1, gesture.t / gesture.duration);
        if (gesture.id === 'wave' && armRRef.current) {
          armRRef.current.rotation.x = -2.7;
          armRRef.current.rotation.z = Math.sin(gesture.t * 10) * 0.35;
        } else if (gesture.id === 'fuckoff' && armRRef.current) {
          armRRef.current.rotation.x = -1.55;
          armRRef.current.rotation.z = 0;
        } else if (gesture.id === 'thumbup' && armRRef.current) {
          armRRef.current.rotation.x = -1.2;
        } else if (gesture.id === 'flip' || gesture.id === 'salto') {
          // přemet vpřed / salto vzad — celá postava se otočí kolem osy X s výskokem
          const dir = gesture.id === 'flip' ? 1 : -1;
          root.rotation.x = dir * progress * Math.PI * 2;
          root.position.y = Math.sin(progress * Math.PI) * 0.55;
        } else if (gesture.id === 'drep') {
          const k = Math.sin(progress * Math.PI);
          root.position.y = -0.3 * k;
          if (legLRef.current) legLRef.current.rotation.x = 1.5 * k;
          if (legRRef.current) legRRef.current.rotation.x = 1.5 * k;
        } else if (gesture.id === 'plazeni') {
          root.rotation.x = -1.35;
          root.position.y = -0.32;
          const crawl = Math.sin(gesture.t * 8) * 0.5;
          if (armLRef.current) armLRef.current.rotation.x = -2.4 + crawl * 0.4;
          if (armRRef.current) armRRef.current.rotation.x = -2.4 - crawl * 0.4;
          if (legLRef.current) legLRef.current.rotation.x = crawl;
          if (legRRef.current) legRRef.current.rotation.x = -crawl;
        }
        if (gesture.t >= gesture.duration) anim.gesture = null;
      }
      if (fingerRef.current) fingerRef.current.visible = gesture?.id === 'fuckoff';
      if (thumbRef.current) thumbRef.current.visible = gesture?.id === 'thumbup';
    }

    // --- Mimika: dočasná výměna textury obličeje ---
    if (faceMatRef.current) {
      const expression = anim.expression;
      if (expression) {
        expression.t += delta;
        const tex = getExpressionTexture(character, expression.id);
        if (tex && faceMatRef.current.map !== tex) {
          faceMatRef.current.map = tex;
          faceMatRef.current.needsUpdate = true;
        }
        if (expression.t >= expression.duration) anim.expression = null;
      } else if (faceTexture && faceMatRef.current.map !== faceTexture) {
        faceMatRef.current.map = faceTexture;
        faceMatRef.current.needsUpdate = true;
      }
    }

    // Záblesk zásahu — krátce rozsvítí všechny materiály do běla
    const flash = Math.max(0, (anim.flashTimer || 0) / 0.15);
    if (anim.flashTimer > 0) anim.flashTimer -= delta;
    for (const mat of materialsRef.current) {
      mat.emissive.setRGB(flash, flash, flash);
    }
  });

  const weapon = character?.weapon;

  return (
    <group ref={rootRef}>
      {/* Nohy — pivot v kyčli */}
      <group ref={legLRef} position={[-0.12, 0.6, 0]}>
        <mesh castShadow position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.075, 0.42, 4, 10]} />
          <ToonMat color={outfit.pants} />
        </mesh>
        <mesh castShadow position={[0, -0.57, 0.05]} scale={[1, 0.62, 1.5]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <ToonMat color={SHOE} />
        </mesh>
      </group>
      <group ref={legRRef} position={[0.12, 0.6, 0]}>
        <mesh castShadow position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.075, 0.42, 4, 10]} />
          <ToonMat color={outfit.pants} />
        </mesh>
        <mesh castShadow position={[0, -0.57, 0.05]} scale={[1, 0.62, 1.5]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <ToonMat color={SHOE} />
        </mesh>
      </group>

      {/* Trup — kreslený hruškovitý tvar */}
      <mesh castShadow position={[0, 0.86, 0]} scale={[1, 1.15, 0.82]}>
        <sphereGeometry args={[0.26, 14, 12]} />
        <ToonMat color={outfit.torso} />
      </mesh>
      {/* bříško/hrudní světlejší plocha */}
      <mesh position={[0, 0.84, 0.13]} scale={[0.75, 1, 0.5]}>
        <sphereGeometry args={[0.19, 12, 10]} />
        <ToonMat color={outfit.accent || '#f2f2f2'} />
      </mesh>
      {/* Kravata / akcent na hrudi */}
      {outfit.tie && (
        <mesh position={[0, 0.92, 0.21]} rotation={[0.15, 0, 0]}>
          <coneGeometry args={[0.05, 0.26, 4]} />
          <ToonMat color={outfit.accent} />
        </mesh>
      )}

      {/* Paže — pivot v rameni; pravá drží zbraň */}
      <group ref={armLRef} position={[-0.3, 1.08, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.06, 0.34, 4, 10]} />
          <ToonMat color={outfit.sleeve} />
        </mesh>
        {/* týmová páska (TDM/CTF) */}
        {team && (
          <mesh position={[0, -0.1, 0]}>
            <torusGeometry args={[0.075, 0.03, 6, 12]} />
            <ToonMat color={team === 'red' ? '#e02020' : '#2060e0'} />
          </mesh>
        )}
        <mesh castShadow position={[0, -0.48, 0]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <ToonMat color={SKIN} />
        </mesh>
      </group>
      <group ref={armRRef} position={[0.3, 1.08, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.06, 0.34, 4, 10]} />
          <ToonMat color={outfit.sleeve} />
        </mesh>
        <mesh castShadow position={[0, -0.48, 0]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <ToonMat color={SKIN} />
        </mesh>
        {/* prostředníček / palec — viditelné jen během gesta */}
        <mesh ref={fingerRef} position={[0, -0.6, 0]} visible={false}>
          <capsuleGeometry args={[0.022, 0.09, 3, 8]} />
          <ToonMat color={SKIN} />
        </mesh>
        <mesh ref={thumbRef} position={[-0.08, -0.5, 0]} rotation={[0, 0, 0.5]} visible={false}>
          <capsuleGeometry args={[0.025, 0.08, 3, 8]} />
          <ToonMat color={SKIN} />
        </mesh>
        {/* Zbraň postavy v pravé ruce */}
        {weapon && (
          <group position={[0.02, -0.5, 0.12]} rotation={[Math.PI / 2, 0, 0]} scale={0.85}>
            <WeaponModel weapon={weapon} skin={weaponSkin} />
          </group>
        )}
      </group>

      {/* Hlava — obličej z portrétu na předni straně (+z); větší = kreslenější */}
      <mesh position={[-0.19, 1.31, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <ToonMat color={SKIN} />
      </mesh>
      <mesh position={[0.19, 1.31, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <ToonMat color={SKIN} />
      </mesh>
      <mesh castShadow position={[0, 1.31, 0]} scale={1.18}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial attach="material-0" color={SKIN} />
        <meshStandardMaterial attach="material-1" color={SKIN} />
        <meshStandardMaterial attach="material-2" color="#2a1e16" />
        <meshStandardMaterial attach="material-3" color={SKIN} />
        <meshStandardMaterial ref={faceMatRef} attach="material-4" map={faceTexture} color="#ffffff" />
        <meshStandardMaterial attach="material-5" color="#2a1e16" />
      </mesh>

      {/* Helma — vizuální ochrana hlavy (viz tabulka poranění) */}
      {hasHelmet && (
        <group position={[0, 1.38, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.34, 0.14, 0.34]} />
            <meshStandardMaterial color="#4a5058" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.06, 0.16]}>
            <boxGeometry args={[0.34, 0.06, 0.03]} />
            <meshStandardMaterial color="#3a4046" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      )}

      {/* Doplňky podle kategorie */}
      {outfit.headband && (
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[0.33, 0.05, 0.33]} />
          <meshStandardMaterial color={character?.color || '#ffffff'} />
        </mesh>
      )}
      {outfit.hat && (
        <group position={[0, 1.47, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.17, 0.17, 0.1, 8]} />
            <meshStandardMaterial color="#1c1c22" />
          </mesh>
          <mesh position={[0, -0.045, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.02, 8]} />
            <meshStandardMaterial color="#1c1c22" />
          </mesh>
        </group>
      )}
      {outfit.hood && (
        <mesh position={[0, 1.33, -0.09]}>
          <boxGeometry args={[0.36, 0.3, 0.2]} />
          <meshStandardMaterial color={outfit.torso} />
        </mesh>
      )}
    </group>
  );
}
