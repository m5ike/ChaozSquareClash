import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { ARENA } from '@/game/constants.js';
import { getActiveMap } from '@/game/lobby.js';
import { useCobblestoneTexture, useBuildingTextures } from '@/game/textures.js';

// Dominanta náměstí podle mapy
function Centerpiece({ type, palette }) {
  if (type === 'plagueColumn') {
    // Brno — morový sloup: sokl, dřík a zlatá koruna
    return (
      <>
        <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[2.2, 0.6, 2.2]} />
          <meshStandardMaterial color={palette.monument} />
        </mesh>
        <CuboidCollider args={[1.1, 0.3, 1.1]} position={[0, 0.3, 0]} />
        <mesh castShadow position={[0, 1.4, 0]}>
          <boxGeometry args={[1.2, 1.6, 1.2]} />
          <meshStandardMaterial color={palette.monument} />
        </mesh>
        <CuboidCollider args={[0.6, 0.8, 0.6]} position={[0, 1.4, 0]} />
        <mesh castShadow position={[0, 3.6, 0]}>
          <cylinderGeometry args={[0.22, 0.3, 3, 8]} />
          <meshStandardMaterial color={palette.monument} />
        </mesh>
        <mesh castShadow position={[0, 5.4, 0]}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshStandardMaterial color="#e8c34a" emissive="#a07818" emissiveIntensity={0.4} />
        </mesh>
      </>
    );
  }
  if (type === 'miningTower') {
    // Ostrava — těžní věž: ocelová konstrukce s kolem
    const leg = 0.18;
    return (
      <>
        {[
          [-1.2, -1.2],
          [1.2, -1.2],
          [-1.2, 1.2],
          [1.2, 1.2],
        ].map(([x, z], i) => (
          <mesh key={i} castShadow position={[x * 0.7, 3, z * 0.7]} rotation={[x * 0.12, 0, -z * 0.12]}>
            <boxGeometry args={[leg, 6, leg]} />
            <meshStandardMaterial color={palette.monument} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <CuboidCollider args={[1.1, 3, 1.1]} position={[0, 3, 0]} />
        <mesh castShadow position={[0, 6.2, 0]}>
          <boxGeometry args={[2.2, 0.8, 2.2]} />
          <meshStandardMaterial color={palette.monument} metalness={0.5} roughness={0.5} />
        </mesh>
        {/* těžní kolo */}
        <mesh castShadow position={[0, 7.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.8, 0.1, 6, 16]} />
          <meshStandardMaterial color="#c04020" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 7.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 1.7, 6]} />
          <meshStandardMaterial color="#c04020" />
        </mesh>
      </>
    );
  }
  // Praha (výchozí) — pomník + kašna
  return (
    <>
      <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[2, 0.5, 2]} />
        <meshStandardMaterial color={palette.monument} />
      </mesh>
      <CuboidCollider args={[1, 0.25, 1]} position={[0, 0.25, 0]} />
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.4, 8]} />
        <meshStandardMaterial color={palette.monument} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color={palette.monument} />
      </mesh>
      {/* kašna */}
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
    </>
  );
}

// Statická mapa náměstí — jeden fixed RigidBody, geometrie z aktivní mapy.
export default function CityMap() {
  const map = useMemo(() => getActiveMap(), []);
  const palette = map.palette;
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
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <CuboidCollider args={[ARENA.width / 2, 0.75, 0.25]} position={[0, 0.75, -15]} />
      <mesh position={[0, 0.75, 15]} castShadow receiveShadow>
        <boxGeometry args={[ARENA.width, 1.5, 0.5]} />
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <CuboidCollider args={[ARENA.width / 2, 0.75, 0.25]} position={[0, 0.75, 15]} />
      <mesh position={[-20, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.5, ARENA.depth]} />
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <CuboidCollider args={[0.25, 0.75, ARENA.depth / 2]} position={[-20, 0.75, 0]} />
      <mesh position={[20, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.5, ARENA.depth]} />
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <CuboidCollider args={[0.25, 0.75, ARENA.depth / 2]} position={[20, 0.75, 0]} />

      {/* budovy s fasádou a svítícími okny */}
      {map.buildings.map((building, i) => (
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
      {map.roofs.map((roof, i) => (
        <mesh key={`r${i}`} position={roof.pos} castShadow>
          <boxGeometry args={roof.size} />
          <meshStandardMaterial color={roof.color} roughness={0.9} />
        </mesh>
      ))}

      {/* překážky — bedny / stánky / kontejnery */}
      {map.obstacles.map((obstacle, i) => (
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
      {map.trees.map((tree, i) => (
        <group key={`t${i}`} position={tree.pos}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 2, 6]} />
            <meshStandardMaterial color={palette.trunk} />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshStandardMaterial color={palette.tree} />
          </mesh>
        </group>
      ))}

      {/* lavičky */}
      {map.benches.map((spot, i) => (
        <group key={`bn${i}`}>
          <mesh castShadow receiveShadow position={[spot[0], 0.3, spot[1]]}>
            <boxGeometry args={[1.5, 0.1, 0.4]} />
            <meshStandardMaterial color="#6a4a2a" />
          </mesh>
          <CuboidCollider args={[0.75, 0.05, 0.2]} position={[spot[0], 0.3, spot[1]]} />
        </group>
      ))}

      {/* pouliční lampy se světlem */}
      {map.lamps.map((spot, i) => (
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

      <Centerpiece type={map.centerpiece} palette={palette} />
    </RigidBody>
  );
}
