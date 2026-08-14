// 3D model zbraně podle typu — sdílený pro first-person pohled i modely botů.
// `skin` (volitelný) přepisuje materiál: {color, metalness, roughness, emissive, emissiveIntensity}.
function WeaponMaterial({ baseColor, skin }) {
  return (
    <meshStandardMaterial
      color={skin?.color || baseColor}
      metalness={skin?.metalness ?? 0.1}
      roughness={skin?.roughness ?? 0.7}
      emissive={skin?.emissive || '#000000'}
      emissiveIntensity={skin?.emissiveIntensity ?? 0}
    />
  );
}

// Čepele sečných zbraní podle typu (rukojeť míří dolů, čepel nahoru osou Y)
function SlashBlade({ slashType, length, color, skin }) {
  const bladeColor = skin?.color || color;
  if (slashType === 'sekera') {
    return (
      <group>
        <mesh position={[0, length * 0.35, 0]}>
          <cylinderGeometry args={[0.022, 0.03, length, 6]} />
          <WeaponMaterial baseColor="#6a4a2a" skin={null} />
        </mesh>
        {/* hlava sekery — klín */}
        <mesh position={[0.07, length * 0.78, 0]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.16, 0.14, 0.03]} />
          <WeaponMaterial baseColor={bladeColor} skin={skin} />
        </mesh>
      </group>
    );
  }
  if (slashType === 'nuz') {
    return (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.12, 6]} />
          <WeaponMaterial baseColor="#3a2a1a" skin={null} />
        </mesh>
        <mesh position={[0, 0.12 + length * 0.4, 0]}>
          <boxGeometry args={[0.035, length * 0.8, 0.012]} />
          <WeaponMaterial baseColor={bladeColor} skin={skin} />
        </mesh>
      </group>
    );
  }
  if (slashType === 'katana') {
    return (
      <group>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.018, 0.022, 0.2, 6]} />
          <WeaponMaterial baseColor="#1a1a22" skin={null} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.015, 8]} />
          <WeaponMaterial baseColor="#8a7a3a" skin={null} />
        </mesh>
        {/* lehce prohnutá čepel ze dvou segmentů */}
        <mesh position={[0, 0.18 + length * 0.28, 0.005]} rotation={[0.06, 0, 0]}>
          <boxGeometry args={[0.03, length * 0.55, 0.01]} />
          <WeaponMaterial baseColor={bladeColor} skin={skin} />
        </mesh>
        <mesh position={[0, 0.18 + length * 0.75, 0.02]} rotation={[0.14, 0, 0]}>
          <boxGeometry args={[0.028, length * 0.45, 0.009]} />
          <WeaponMaterial baseColor={bladeColor} skin={skin} />
        </mesh>
      </group>
    );
  }
  // meč (výchozí)
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.02, 0.026, 0.16, 6]} />
        <WeaponMaterial baseColor="#3a2a1a" skin={null} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.14, 0.025, 0.025]} />
        <WeaponMaterial baseColor="#8a8a92" skin={null} />
      </mesh>
      <mesh position={[0, 0.18 + length * 0.5, 0]}>
        <boxGeometry args={[0.045, length, 0.014]} />
        <WeaponMaterial baseColor={bladeColor} skin={skin} />
      </mesh>
    </group>
  );
}

export default function WeaponModel({ weapon, skin = null }) {
  const color = weapon.color;
  // Samopal — kompaktní tělo, zásobník, hlaveň s tlumičem
  if (weapon.model === 'samopal') {
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.06, 0.09, 0.3]} />
          <WeaponMaterial baseColor={skin?.color || '#3a3f47'} skin={skin} />
        </mesh>
        <mesh position={[0, -0.1, 0.04]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.045, 0.14, 0.05]} />
          <WeaponMaterial baseColor="#2a2e34" skin={null} />
        </mesh>
        <mesh position={[0, 0.005, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 8]} />
          <WeaponMaterial baseColor="#22262c" skin={skin} />
        </mesh>
        <mesh position={[0, 0.065, 0.02]}>
          <boxGeometry args={[0.03, 0.03, 0.12]} />
          <WeaponMaterial baseColor="#22262c" skin={null} />
        </mesh>
      </group>
    );
  }
  // Raketomet — tlustá roura s raketou uvnitř
  if (weapon.model === 'raketomet') {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.55, 12]} />
          <WeaponMaterial baseColor={skin?.color || '#5a6a3a'} skin={skin} />
        </mesh>
        <mesh position={[0, 0, -0.31]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.075, 0.06, 12]} />
          <WeaponMaterial baseColor="#3e4a28" skin={null} />
        </mesh>
        {/* špička rakety vykukující z roury */}
        <mesh position={[0, 0, -0.36]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.055, 0.12, 10]} />
          <WeaponMaterial baseColor="#c03828" skin={null} />
        </mesh>
        <mesh position={[0, -0.09, 0.1]}>
          <boxGeometry args={[0.04, 0.1, 0.05]} />
          <WeaponMaterial baseColor="#3e4a28" skin={null} />
        </mesh>
      </group>
    );
  }
  if (weapon.slash) {
    const length = 0.35 + weapon.slash.lengthPct * 0.6;
    return (
      <SlashBlade slashType={weapon.slash.slashType} length={length} color={color} skin={skin} />
    );
  }
  switch (weapon.type) {
    case 'projectile':
      // koule s malou muškou nahoře
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.1, 8, 8]} />
            <WeaponMaterial baseColor={color} skin={skin} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <WeaponMaterial baseColor={color} skin={skin} />
          </mesh>
        </group>
      );
    case 'spread':
      // kužel položený dopředu
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.22, 6]} />
          <WeaponMaterial baseColor={color} skin={skin} />
        </mesh>
      );
    case 'melee':
      // rukojeť s čepelí (fallback bez slash konfigurace)
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.025, 0.04, 0.28, 6]} />
            <WeaponMaterial baseColor={color} skin={skin} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.02]} />
            <WeaponMaterial baseColor={color} skin={skin} />
          </mesh>
        </group>
      );
    case 'thrown':
      // vrhací kostka
      return (
        <mesh>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <WeaponMaterial baseColor={color} skin={skin} />
        </mesh>
      );
    default:
      return (
        <mesh>
          <sphereGeometry args={[0.1, 6, 6]} />
          <WeaponMaterial baseColor={color} skin={skin} />
        </mesh>
      );
  }
}
