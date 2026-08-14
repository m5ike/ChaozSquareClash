// 3D model zbraně podle typu — sdílený pro first-person pohled i modely botů.
export default function WeaponModel({ weapon }) {
  const color = weapon.color;
  switch (weapon.type) {
    case 'projectile':
      // koule s malou muškou nahoře
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </group>
      );
    case 'spread':
      // kužel položený dopředu
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.22, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>
      );
    case 'melee':
      // rukojeť s čepelí
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.025, 0.04, 0.28, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.02]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </group>
      );
    case 'thrown':
      // vrhací kostka
      return (
        <mesh>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <meshLambertMaterial color={color} />
        </mesh>
      );
    default:
      return (
        <mesh>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>
      );
  }
}
