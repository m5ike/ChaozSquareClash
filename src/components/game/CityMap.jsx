import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { ARENA, COLORS } from '@/game/constants.js';
import { BUILDINGS, ROOFS, OBSTACLES, TREES, BENCHES } from '@/data/mapLayout.js';
import { useCobblestoneTexture, useBuildingTextures } from '@/game/textures.js';

// Statická mapa náměstí — jeden fixed RigidBody s ručně umístěnými collidery.
export default function CityMap() {
  const cobblestone = useCobblestoneTexture();
  const { facade, windows } = useBuildingTextures();

  return (
    <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
      {/* podlaha s dlažbou */}
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[ARENA.width, 1, ARENA.depth]} />
        <meshStandardMaterial map={cobblestone} roughness={0.9} />
      </mesh>
      <CuboidCollider args={[ARENA.width / 2, 0.5, ARENA.depth / 2]} position={[0, -0.5, 0]} />

      {/* obvodové zídky arény */}
      <mesh position={[0, 0.75, -15]} castShadow receiveShadow>
        <boxGeometry args={[ARENA.width, 1.5, 0.5]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <CuboidCollider args={[ARENA.width / 2, 0.75, 0.25]} position={[0, 0.75, -15]} />
      <mesh position={[0, 0.75, 15]} castShadow receiveShadow>
        <boxGeometry args={[ARENA.width, 1.5, 0.5]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <CuboidCollider args={[ARENA.width / 2, 0.75, 0.25]} position={[0, 0.75, 15]} />
      <mesh position={[-20, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.5, ARENA.depth]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <CuboidCollider args={[0.25, 0.75, ARENA.depth / 2]} position={[-20, 0.75, 0]} />
      <mesh position={[20, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.5, ARENA.depth]} />
        <meshStandardMaterial color={COLORS.wall} />
      </mesh>
      <CuboidCollider args={[0.25, 0.75, ARENA.depth / 2]} position={[20, 0.75, 0]} />

      {/* budovy s fasádou a svítícími okny */}
      {BUILDINGS.map((building, i) => (
        <group key={`b${i}`}>
          <mesh castShadow receiveShadow position={building.pos}>
            <boxGeometry args={building.size} />
            <meshStandardMaterial
              map={facade}
              emissiveMap={windows}
              emissive="#ffcc44"
              emissiveIntensity={0.5}
              color={building.color}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>
          <CuboidCollider
            args={[building.size[0] / 2, building.size[1] / 2, building.size[2] / 2]}
            position={building.pos}
          />
        </group>
      ))}

      {/* střechy (bez colliderů) */}
      {ROOFS.map((roof, i) => (
        <mesh key={`r${i}`} position={roof.pos} castShadow>
          <boxGeometry args={roof.size} />
          <meshStandardMaterial color={roof.color} roughness={0.9} />
        </mesh>
      ))}

      {/* překážky — bedny a zídky */}
      {OBSTACLES.map((obstacle, i) => (
        <group key={`c${i}`}>
          <mesh castShadow receiveShadow position={obstacle.pos}>
            <boxGeometry args={obstacle.size} />
            <meshStandardMaterial color={obstacle.color} />
          </mesh>
          <CuboidCollider
            args={[obstacle.size[0] / 2, obstacle.size[1] / 2, obstacle.size[2] / 2]}
            position={obstacle.pos}
          />
        </group>
      ))}

      {/* stromy (bez colliderů) */}
      {TREES.map((tree, i) => (
        <group key={`t${i}`} position={tree.pos}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 2, 6]} />
            <meshStandardMaterial color={COLORS.trunk} />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshStandardMaterial color={COLORS.tree} />
          </mesh>
        </group>
      ))}

      {/* lavičky */}
      {BENCHES.map((spot, i) => (
        <group key={`bn${i}`}>
          <mesh castShadow receiveShadow position={[spot[0], 0.3, spot[1]]}>
            <boxGeometry args={[1.5, 0.1, 0.4]} />
            <meshStandardMaterial color="#6a4a2a" />
          </mesh>
          <CuboidCollider args={[0.75, 0.05, 0.2]} position={[spot[0], 0.3, spot[1]]} />
        </group>
      ))}

      {/* kašna (bez collideru) */}
      <group position={[0, 0, 6]}>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <cylinderGeometry args={[1.5, 1.8, 0.3, 12]} />
          <meshStandardMaterial color="#88a0bb" />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 0.6, 8]} />
          <meshStandardMaterial color="#aabbcc" />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#6090c0" emissive="#3070a0" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* pouliční lampy se světlem */}
      {[
        [-9, -9],
        [9, -9],
        [-9, 9],
        [9, 9],
      ].map((spot, i) => (
        <group key={`lmp${i}`} position={[spot[0], 0, spot[1]]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.1, 3, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#ffcc44" emissive="#ffcc44" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, 3.1, 0]} intensity={4} distance={10} color="#ffcc44" />
        </group>
      ))}

      {/* pomník uprostřed náměstí */}
      <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[2, 0.5, 2]} />
        <meshStandardMaterial color={COLORS.monument} />
      </mesh>
      <CuboidCollider args={[1, 0.25, 1]} position={[0, 0.25, 0]} />
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.4, 8]} />
        <meshStandardMaterial color={COLORS.monument} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color={COLORS.monument} />
      </mesh>
    </RigidBody>
  );
}
