import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { bus } from '@/game/events.js';
import { getSelectedCharacter, input } from '@/game/state.js';
import { SLASH_TRAJECTORIES, sampleTrajectory } from '@/game/weaponsConfig.js';
import { getWeaponSkinProps, getBodySkinOutfit } from '@/game/skins.js';
import WeaponModel from '@/components/game/WeaponModel.jsx';

const SKIN = '#e0b088';
const TRAIL_LENGTH = 14; // stopa čepele (poslední pozice špičky)
const GHOST_POINTS = 12; // tečkovaná celá dráha trajektorie

// Zbraň v first-person pohledu: aktivní zbraň hráče se skinem, houpání při
// chůzi, zpětný ráz, a u sečných zbraní animovaný švih po zvolené trajektorii
// s vykreslenou dráhou (stopa čepele + tečkovaná celá trajektorie).
export default function FPWeapon() {
  const { camera } = useThree();
  const groupRef = useRef();
  const bladeRef = useRef();
  const recoil = useRef(0);
  const bobPhase = useRef(0);
  const bobAmount = useRef(0);
  const flashRef = useRef();
  const lightRef = useRef();
  const trailRefs = useRef([]);
  const trailData = useRef([]); // lokální pozice špičky čepele (nejnovější první)
  const ghostRefs = useRef([]);
  const swingRef = useRef({ active: false, t: 0, duration: 0.5, trajectory: null });
  const [, getKeys] = useKeyboardControls();
  const character = getSelectedCharacter();
  const [activeWeapon, setActiveWeapon] = useState(character?.weapons?.[0] || character?.weapon);
  const weaponSkin = getWeaponSkinProps();
  const bodySkin = getBodySkinOutfit();
  // rukávy: skin těla má přednost, jinak barva podle kategorie
  const sleeveColor =
    bodySkin?.sleeve || (character?.cat === 'Politik' ? '#2b2b35' : character?.color || '#444450');

  useEffect(() => {
    const onWeaponFired = () => {
      recoil.current = 1;
      if (flashRef.current) flashRef.current._timer = 0.08;
    };
    const onWeaponSwitched = (weapon) => setActiveWeapon(weapon);
    const onRestart = () => setActiveWeapon(character?.weapons?.[0] || character?.weapon);
    const onSlashStarted = (info) => {
      const trajectory = SLASH_TRAJECTORIES[info.trajectory];
      swingRef.current = {
        active: true,
        t: 0,
        duration: info.duration || trajectory.duration,
        trajectory,
      };
      trailData.current = [];
      // tečkovaná celá dráha — spočítaná jednou při startu švihu
      for (let i = 0; i < GHOST_POINTS; i++) {
        const p = sampleTrajectory(trajectory, i / (GHOST_POINTS - 1));
        const ghost = ghostRefs.current[i];
        if (ghost) {
          ghost.position.set(p.x * 0.55, -0.32 + p.y * 0.45, -0.35 - p.z * 0.55);
          ghost.visible = true;
        }
      }
    };
    bus.on('weapon-fired', onWeaponFired);
    bus.on('weapon-switched', onWeaponSwitched);
    bus.on('restart-game', onRestart);
    bus.on('slash-started', onSlashStarted);
    return () => {
      bus.off('weapon-fired', onWeaponFired);
      bus.off('weapon-switched', onWeaponSwitched);
      bus.off('restart-game', onRestart);
      bus.off('slash-started', onSlashStarted);
    };
  }, [character]);

  useFrame((_, delta) => {
    if (!groupRef.current || !activeWeapon) return;
    // intenzita chůze → houpání
    const keys = getKeys();
    const keyboardMove = keys.forward || keys.backward || keys.left || keys.right ? 1 : 0;
    const touchMove = Math.min(1, Math.hypot(input.move.x, input.move.y));
    const moving = Math.max(keyboardMove, touchMove);
    bobAmount.current += (moving - bobAmount.current) * Math.min(1, delta * 8);
    bobPhase.current += delta * 9 * bobAmount.current;
    const bobX = Math.sin(bobPhase.current) * 0.012 * bobAmount.current;
    const bobY = -Math.abs(Math.sin(bobPhase.current)) * 0.014 * bobAmount.current;

    // ukotvení ke kameře
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.translateX(0.22 + bobX);
    groupRef.current.translateY(-0.22 + bobY);
    groupRef.current.translateZ(-0.45);
    recoil.current = Math.max(0, recoil.current - delta * 6);
    groupRef.current.translateZ(recoil.current * 0.08);
    groupRef.current.rotation.x += recoil.current * 0.1;

    // --- Švih sečné zbraně po trajektorii ---
    const swing = swingRef.current;
    const blade = bladeRef.current;
    if (blade) {
      if (swing.active && swing.trajectory) {
        swing.t += delta;
        const progress = Math.min(1, swing.t / swing.duration);
        const p = sampleTrajectory(swing.trajectory, progress);
        // mapování normalizované trajektorie do prostoru před kamerou
        // (relativně ke groupRef, který už je posunutý doprava dolů)
        blade.position.set(p.x * 0.55 - 0.22, -0.1 + p.y * 0.45, 0.1 - p.z * 0.55);
        blade.rotation.set(0.5 - p.y * 1.3, 0, -p.x * 0.9);
        // stopa špičky čepele
        trailData.current.unshift({
          x: blade.position.x,
          y: blade.position.y + 0.25,
          z: blade.position.z,
        });
        if (trailData.current.length > TRAIL_LENGTH) trailData.current.pop();
        if (progress >= 1) {
          swing.active = false;
          for (const ghost of ghostRefs.current) if (ghost) ghost.visible = false;
        }
      } else {
        // klidová poloha čepele (v pravé ruce, špičkou vzhůru)
        blade.position.set(0, -0.06, 0.02);
        blade.rotation.set(0.35, 0, -0.15);
        if (trailData.current.length) trailData.current.pop();
      }
    }
    // vykreslení stopy — dohasínající segmenty
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const seg = trailRefs.current[i];
      if (!seg) continue;
      const point = trailData.current[i];
      if (point) {
        seg.visible = true;
        seg.position.set(point.x, point.y, point.z);
        const life = 1 - i / TRAIL_LENGTH;
        seg.material.opacity = life * 0.55;
        seg.scale.setScalar(0.5 + life * 0.7);
      } else {
        seg.visible = false;
      }
    }

    // záblesk výstřelu (jen střelné zbraně)
    if (flashRef.current) {
      if (flashRef.current._timer > 0 && !activeWeapon.slash) {
        flashRef.current._timer -= delta;
        flashRef.current.visible = true;
        flashRef.current.scale.setScalar(1 + Math.random() * 0.3);
      } else {
        flashRef.current.visible = false;
      }
    }
    if (lightRef.current) {
      lightRef.current.intensity =
        flashRef.current?._timer > 0 && !activeWeapon.slash ? 5 : 0;
    }
  });

  if (!activeWeapon) return null;
  const isSlash = !!activeWeapon.slash;
  const trailColor = weaponSkin?.emissive || '#cfe6ff';

  return (
    <group ref={groupRef}>
      {/* střelné zbraně: statický model; sečné: čepel v animované skupině */}
      {!isSlash && <WeaponModel weapon={activeWeapon} skin={weaponSkin} />}
      {isSlash && (
        <group ref={bladeRef}>
          <WeaponModel weapon={activeWeapon} skin={weaponSkin} />
        </group>
      )}
      {/* pravá ruka */}
      <group position={[0.05, -0.08, 0.14]} rotation={[-0.9, 0.15, -0.1]}>
        <mesh>
          <boxGeometry args={[0.09, 0.3, 0.09]} />
          <meshStandardMaterial color={sleeveColor} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </group>
      {/* levá ruka */}
      <group position={[-0.16, -0.1, 0.02]} rotation={[-0.7, -0.4, 0.5]}>
        <mesh>
          <boxGeometry args={[0.09, 0.28, 0.09]} />
          <meshStandardMaterial color={sleeveColor} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </group>
      {/* stopa čepele */}
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
        <mesh
          key={`trail-${i}`}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.03, 5, 5]} />
          <meshBasicMaterial color={trailColor} transparent opacity={0.5} depthTest={false} />
        </mesh>
      ))}
      {/* tečkovaná celá dráha trajektorie během švihu */}
      {Array.from({ length: GHOST_POINTS }).map((_, i) => (
        <mesh
          key={`ghost-${i}`}
          ref={(el) => {
            ghostRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.012, 4, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthTest={false} />
        </mesh>
      ))}
      <mesh ref={flashRef} position={[0, 0, -0.2]} visible={false}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#ffdd44" transparent opacity={0.9} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, -0.3]} intensity={0} distance={3} color="#ffcc44" />
    </group>
  );
}
