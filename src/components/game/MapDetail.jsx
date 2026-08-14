import { useMemo } from 'react';
import { getActiveMap } from '@/game/lobby.js';

// Vizuální detail mapy — silnice, koleje, chodníky, pěšiny a přechody
// z map.surfaces. Čistě kosmetické: žádné collidery, jen tenké boxy nad
// dlažbou (podlaha CityMap má vršek na y=0).

const EMPTY = [];

// Pozice středů opakovaných prvků (čárkování, pražce…) podél délky `len`.
function spread(len, period, margin = 0) {
  const count = Math.max(0, Math.floor((len - margin) / period));
  const start = (-(count - 1) * period) / 2;
  return Array.from({ length: count }, (_, i) => start + i * period);
}

// Asfaltový pás + přerušovaná středová čára podél delší osy.
function Road({ x, z, w, d }) {
  const alongX = w >= d;
  const dashes = useMemo(() => spread(alongX ? w : d, 1.6, 0.9), [alongX, w, d]);
  return (
    <group position={[x, 0, z]}>
      <mesh receiveShadow position={[0, 0.011, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial color="#2e2e33" roughness={1} />
      </mesh>
      {dashes.map((off, i) => (
        <mesh key={i} receiveShadow position={alongX ? [off, 0.026, 0] : [0, 0.026, off]}>
          <boxGeometry args={alongX ? [0.7, 0.008, 0.12] : [0.12, 0.008, 0.7]} />
          <meshStandardMaterial color="#e8e8e2" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Štěrkové lože s pražci a dvěma ocelovými kolejnicemi podél delší osy.
function Rail({ x, z, w, d }) {
  const alongX = w >= d;
  const len = alongX ? w : d;
  const gauge = (alongX ? d : w) * 0.44; // vzdálenost os kolejnic
  const sleepers = useMemo(() => spread(len, 0.8, 0.3), [len]);
  return (
    <group position={[x, 0, z]}>
      <mesh receiveShadow position={[0, 0.015, 0]}>
        <boxGeometry args={[w, 0.03, d]} />
        <meshStandardMaterial color="#4a4238" roughness={1} />
      </mesh>
      {sleepers.map((off, i) => (
        <mesh key={`s${i}`} receiveShadow position={alongX ? [off, 0.033, 0] : [0, 0.033, off]}>
          <boxGeometry
            args={alongX ? [0.18, 0.01, d * 0.8] : [w * 0.8, 0.01, 0.18]}
          />
          <meshStandardMaterial color="#2c2620" roughness={0.95} />
        </mesh>
      ))}
      {[-gauge / 2, gauge / 2].map((off, i) => (
        <mesh key={`k${i}`} receiveShadow position={alongX ? [0, 0.042, off] : [off, 0.042, 0]}>
          <boxGeometry args={alongX ? [len, 0.016, 0.08] : [0.08, 0.016, len]} />
          <meshStandardMaterial color="#8a8f96" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// Dlážděný chodník s tmavším obrubníkem po obou delších stranách.
function Sidewalk({ x, z, w, d }) {
  const alongX = w >= d;
  const curbOff = (alongX ? d : w) / 2 - 0.06;
  return (
    <group position={[x, 0, z]}>
      <mesh receiveShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[w, 0.05, d]} />
        <meshStandardMaterial color="#9a938a" roughness={0.95} />
      </mesh>
      {[-curbOff, curbOff].map((off, i) => (
        <mesh key={i} receiveShadow position={alongX ? [0, 0.031, off] : [off, 0.031, 0]}>
          <boxGeometry args={alongX ? [w, 0.062, 0.12] : [0.12, 0.062, d]} />
          <meshStandardMaterial color="#6f6a63" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// Přechod pro chodce — bílé pruhy kolmo na osu `axis`.
function Crosswalk({ x, z, w, d, axis }) {
  const stripes = useMemo(
    () => spread((axis === 'x' ? w : d) + 0.35, 0.75),
    [axis, w, d],
  );
  return (
    <group position={[x, 0, z]}>
      {stripes.map((off, i) => (
        <mesh key={i} receiveShadow position={axis === 'x' ? [off, 0.03, 0] : [0, 0.03, off]}>
          <boxGeometry args={axis === 'x' ? [0.4, 0.01, d] : [w, 0.01, 0.4]} />
          <meshStandardMaterial color="#e8e8e2" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

export default function MapDetail() {
  const map = useMemo(() => getActiveMap(), []);
  const surfaces = map.surfaces;
  if (!surfaces) return null;
  const {
    roads = EMPTY,
    sidewalks = EMPTY,
    rails = EMPTY,
    paths = EMPTY,
    crosswalks = EMPTY,
  } = surfaces;

  return (
    <group>
      {roads.map((s, i) => (
        <Road key={`road${i}`} {...s} />
      ))}
      {rails.map((s, i) => (
        <Rail key={`rail${i}`} {...s} />
      ))}
      {sidewalks.map((s, i) => (
        <Sidewalk key={`sw${i}`} {...s} />
      ))}
      {paths.map((s, i) => (
        <mesh key={`path${i}`} receiveShadow position={[s.x, 0.0075, s.z]}>
          <boxGeometry args={[s.w, 0.015, s.d]} />
          <meshStandardMaterial color="#7a6a4e" roughness={1} />
        </mesh>
      ))}
      {crosswalks.map((s, i) => (
        <Crosswalk key={`cw${i}`} {...s} />
      ))}
      {/* parkoviště: asfalt + bílé čáry stání kolmo na osu */}
      {(map.parkingLots || []).map((lot, i) => {
        const along = lot.axis === 'z' ? lot.d : lot.w;
        const count = Math.max(1, Math.floor(along / 2.4));
        const lines = [];
        for (let k = 0; k <= count; k++) {
          const offset = -along / 2 + k * 2.4;
          lines.push(offset);
        }
        return (
          <group key={`lot${i}`} position={[lot.x, 0, lot.z]}>
            <mesh position={[0, 0.012, 0]} receiveShadow>
              <boxGeometry args={[lot.w, 0.02, lot.d]} />
              <meshStandardMaterial color="#34343a" roughness={1} />
            </mesh>
            {lines.map((offset, k) => (
              <mesh
                key={k}
                position={
                  lot.axis === 'z' ? [0, 0.028, offset] : [offset, 0.028, 0]
                }
              >
                <boxGeometry
                  args={
                    lot.axis === 'z'
                      ? [lot.w * 0.85, 0.008, 0.1]
                      : [0.1, 0.008, lot.d * 0.85]
                  }
                />
                <meshStandardMaterial color="#e8e8e8" />
              </mesh>
            ))}
          </group>
        );
      })}

    </group>
  );
}
