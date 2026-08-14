import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { bus } from '@/game/events.js';
import { getSelectedCharacter, input } from '@/game/state.js';
import WeaponModel from '@/components/game/WeaponModel.jsx';

const SKIN = '#e0b088';

// Zbraň v first-person pohledu s rukama postavy — kotví se ke kameře,
// houpe se při chůzi, animuje zpětný ráz a záblesk výstřelu.
export default function FPWeapon() {
  const { camera } = useThree();
  const groupRef = useRef();
  const recoil = useRef(0);
  const bobPhase = useRef(0);
  const bobAmount = useRef(0);
  const flashRef = useRef();
  const lightRef = useRef();
  const [, getKeys] = useKeyboardControls();
  const character = getSelectedCharacter();
  const weapon = character?.weapon;
  // rukávy v barvě obleku postavy (stejná logika jako u modelů botů)
  const sleeveColor = character?.cat === 'Politik' ? '#2b2b35' : character?.color || '#444450';

  useEffect(() => {
    const onWeaponFired = () => {
      recoil.current = 1;
      if (flashRef.current) flashRef.current._timer = 0.08;
    };
    bus.on('weapon-fired', onWeaponFired);
    return () => bus.off('weapon-fired', onWeaponFired);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !weapon) return;
    // intenzita chůze (klávesy i virtuální joystick) → plynulý náběh houpání
    const keys = getKeys();
    const keyboardMove =
      keys.forward || keys.backward || keys.left || keys.right ? 1 : 0;
    const touchMove = Math.min(1, Math.hypot(input.move.x, input.move.y));
    const moving = Math.max(keyboardMove, touchMove);
    bobAmount.current += (moving - bobAmount.current) * Math.min(1, delta * 8);
    bobPhase.current += delta * 9 * bobAmount.current;
    const bobX = Math.sin(bobPhase.current) * 0.012 * bobAmount.current;
    const bobY = -Math.abs(Math.sin(bobPhase.current)) * 0.014 * bobAmount.current;

    // ukotvení zbraně vpravo dole před kamerou
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.translateX(0.22 + bobX);
    groupRef.current.translateY(-0.22 + bobY);
    groupRef.current.translateZ(-0.45);
    // zpětný ráz
    recoil.current = Math.max(0, recoil.current - delta * 6);
    groupRef.current.translateZ(recoil.current * 0.08);
    groupRef.current.rotation.x += recoil.current * 0.1;
    // záblesk výstřelu
    if (flashRef.current) {
      if (flashRef.current._timer > 0) {
        flashRef.current._timer -= delta;
        flashRef.current.visible = true;
        flashRef.current.scale.setScalar(1 + Math.random() * 0.3);
      } else {
        flashRef.current.visible = false;
      }
    }
    if (lightRef.current) {
      lightRef.current.intensity = flashRef.current?._timer > 0 ? 5 : 0;
    }
  });

  if (!weapon) return null;
  return (
    <group ref={groupRef}>
      <WeaponModel weapon={weapon} />
      {/* pravá ruka — drží zbraň (rukáv + dlaň) */}
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
      {/* levá ruka — přidržuje zepředu */}
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
      <mesh ref={flashRef} position={[0, 0, -0.2]} visible={false}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#ffdd44" transparent opacity={0.9} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, -0.3]} intensity={0} distance={3} color="#ffcc44" />
    </group>
  );
}
