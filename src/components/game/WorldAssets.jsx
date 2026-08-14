import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { bus } from '@/game/events.js';
import { gameState } from '@/game/state.js';
import { getActiveMap } from '@/game/lobby.js';
import { ASSET_TYPES, ASSET_GROUPS } from '@/data/assetsCatalog.js';
import { getWorldConfig } from '@/game/worldConfig.js';
import { grantRandomReward, applyRandomPenalty } from '@/game/rewards.js';
import { buildObstacleGrid, computeSteering } from '@/game/ai.js';
import AssetModel from '@/components/game/AssetModel.jsx';

// Živé město: náhodně rozmístěné assety (statické, vozidla, chodci, zvířata)
// s pohybem podle podkladu a typu cesty, vlastním zdravím, odměnami za
// zničení, penalizacemi za chráněné NPC a respawnem do 10 sekund.

const rand = (min, max) => min + Math.random() * (max - min);

// Náhodný bod v obdélníku povrchu (s okrajem)
function pointInRect(rect, margin = 0.3) {
  return {
    x: rect.x + rand(-rect.w / 2 + margin, rect.w / 2 - margin),
    z: rect.z + rand(-rect.d / 2 + margin, rect.d / 2 - margin),
  };
}

// Obdélníky povrchu pro daný typ podkladu
function rectsForSurface(map, surface) {
  const s = map.surfaces || {};
  if (surface === 'silnice') return s.roads || [];
  if (surface === 'chodnik') return s.sidewalks || [];
  if (surface === 'koleje') return s.rails || [];
  if (surface === 'stezka') return s.paths || [];
  return [];
}

function insideObstacle(grid, x, z) {
  for (const box of grid) {
    if (x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ) return true;
  }
  return false;
}

// Volná pozice: na povrchu (nebo kdekoli v aréně) mimo překážky, střed,
// hráče a ostatní už umístěné assety (nastavitelná minimální vzdálenost).
function pickSpot(map, grid, surface, limit, placed = [], minDist = 2) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rects = rectsForSurface(map, surface);
    let p;
    let rect = null;
    if (rects.length) {
      rect = rects[(Math.random() * rects.length) | 0];
      p = pointInRect(rect);
    } else {
      p = { x: rand(-limit.x, limit.x), z: rand(-limit.z, limit.z) };
    }
    const nearCenter = Math.hypot(p.x, p.z) < 3.2 || Math.hypot(p.x, p.z - 6) < 2.8;
    const nearSpawn = Math.hypot(p.x, p.z - 10) < 2.5;
    if (nearCenter || nearSpawn || insideObstacle(grid, p.x, p.z)) continue;
    // minimální rozestup od už umístěných assetů
    let tooClose = false;
    for (const other of placed) {
      if (Math.hypot(other.x - p.x, other.z - p.z) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) return { ...p, rect };
  }
  return { x: rand(-limit.x * 0.8, limit.x * 0.8), z: rand(-limit.z * 0.8, limit.z * 0.8), rect: null };
}

// Parkovací stání z parkovišť mapy (řada pozic podél osy parkoviště)
function buildParkingStalls(map) {
  const stalls = [];
  for (const lot of map.parkingLots || []) {
    const along = lot.axis === 'z' ? lot.d : lot.w;
    const count = Math.max(1, Math.floor(along / 2.4));
    for (let i = 0; i < count; i++) {
      const offset = -along / 2 + 1.2 + i * 2.4;
      stalls.push({
        x: lot.axis === 'z' ? lot.x : lot.x + offset,
        z: lot.axis === 'z' ? lot.z + offset : lot.z,
        yaw: lot.axis === 'z' ? Math.PI / 2 : 0,
      });
    }
  }
  return stalls;
}

export default function WorldAssets() {
  const map = useMemo(() => getActiveMap(), []);
  const ARENA_LIMIT = useMemo(() => {
    const a = map.arena || { width: 40, depth: 30 };
    return { x: a.width / 2 - 2, z: a.depth / 2 - 2 };
  }, [map]);
  const grid = useMemo(() => buildObstacleGrid(map, 0.4), [map]);
  const config = useMemo(() => getWorldConfig(map), [map]);
  const groupRefs = useRef([]);
  const [, forceRender] = useState(0);

  // Sestavení instancí (jednou při mountu)
  const instances = useMemo(() => {
    const list = [];
    const parkingStalls = buildParkingStalls(map);
    const minDist = config.minSpawnDistance ?? 2;
    const addInstance = (typeId) => {
      const def = ASSET_TYPES[typeId];
      if (!def) return;
      if (def.protected && config.protectedEnabled === false) return;
      // zaparkovaná auta přednostně do volných parkovacích stání
      let spot = null;
      let stallYaw = null;
      if (typeId === 'zaparkovane_auto' && parkingStalls.length) {
        const free = parkingStalls.filter(
          (st) => !list.some((o) => Math.hypot(o.x - st.x, o.z - st.z) < 1.5)
        );
        if (free.length) {
          const st = free[(Math.random() * free.length) | 0];
          spot = { x: st.x, z: st.z, rect: null };
          stallYaw = st.yaw;
        }
      }
      if (!spot) spot = pickSpot(map, grid, def.surface, ARENA_LIMIT, list, minDist);
      const variant = def.variants?.length ? (Math.random() * def.variants.length) | 0 : 0;
      list.push({
        key: `${typeId}-${list.length}-${(Math.random() * 1e6) | 0}`,
        typeId,
        def,
        variant,
        x: spot.x,
        z: spot.z,
        yaw: stallYaw ?? rand(0, Math.PI * 2),
        home: { x: spot.x, z: spot.z },
        rect: spot.rect,
        laneAxis: spot.rect ? (spot.rect.w >= spot.rect.d ? 'x' : 'z') : 'x',
        dir: Math.random() < 0.5 ? 1 : -1,
        target: null,
        heading: rand(0, Math.PI * 2),
        idle: 0,
        health: def.health,
        alive: true,
        dyingT: -1,
        respawnAt: 0,
        anim: { current: { speed: 0, pose: null, wheelSpin: 0 } },
      });
    };
    // omezený počet online — počty ze společné konfigurace
    const groups = [
      ['static', config.static],
      ['vehicle', config.vehicle],
      ['pedestrian', config.pedestrian],
      ['animal', config.animal],
    ];
    for (const [group, count] of groups) {
      const pool = (ASSET_GROUPS[group] || []).filter(
        (id) => !(ASSET_TYPES[id]?.protected && config.protectedEnabled === false)
      );
      for (let i = 0; i < count && pool.length; i++) {
        addInstance(pool[(Math.random() * pool.length) | 0]);
      }
    }
    return list;
  }, [map, grid, config, ARENA_LIMIT]);

  // Zpřístupnění pro Projectiles (poškozování zásahy)
  useEffect(() => {
    gameState.worldAssets = instances;
    gameState.damageAsset = (instance, damage, byPlayer) => {
      if (!instance.alive) return;
      instance.health -= damage;
      if (instance.health <= 0) {
        instance.alive = false;
        instance.dyingT = 0;
        instance.respawnAt = performance.now() / 1000 + rand(4, 10); // respawn do 10 s
        bus.emit('asset-destroyed', { name: instance.def.name, protected: !!instance.def.protected });
        if (byPlayer) {
          if (instance.def.protected) {
            const label = applyRandomPenalty();
            bus.emit('mode-event', { text: `⚠️ Zabil jsi: ${instance.def.name} → ${label}` });
          } else if (instance.def.reward !== false) {
            const label = grantRandomReward();
            bus.emit('mode-event', { text: `📦 ${instance.def.name} zničeno → ${label}` });
          }
        }
      }
    };
    return () => {
      gameState.worldAssets = [];
      gameState.damageAsset = null;
    };
  }, [instances]);

  useFrame((state, delta) => {
    const now = performance.now() / 1000;
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const group = groupRefs.current[i];
      if (!group) continue;

      // Zničený asset: pád/zmenšení, pak skrytí a respawn
      if (!inst.alive) {
        if (inst.dyingT >= 0 && inst.dyingT < 0.45) {
          inst.dyingT += delta;
          group.rotation.z = Math.min(1.4, inst.dyingT * 4);
          group.position.y = -inst.dyingT * 0.8;
        } else {
          group.visible = false;
        }
        if (now >= inst.respawnAt) {
          // respawn jen když je místo volné (jiné assety + hráč)
          const minDist = config.minSpawnDistance ?? 2;
          const blocked =
            instances.some(
              (o) =>
                o !== inst && o.alive && Math.hypot(o.x - inst.home.x, o.z - inst.home.z) < minDist
            ) ||
            Math.hypot(gameState.playerPos.x - inst.home.x, gameState.playerPos.z - inst.home.z) <
              minDist + 0.5;
          if (blocked) {
            inst.respawnAt = now + 1; // zkus to za sekundu
          } else {
            inst.alive = true;
            inst.health = inst.def.health;
            inst.dyingT = -1;
            inst.x = inst.home.x;
            inst.z = inst.home.z;
            group.visible = true;
            group.rotation.z = 0;
            group.position.y = 0;
          }
        }
        continue;
      }

      const { def } = inst;
      if (def.moveType === 'static') {
        group.position.set(inst.x, 0, inst.z);
        group.rotation.y = inst.yaw;
        continue;
      }

      // rychlost dle typu pohybu
      let speed = def.speed || 1.5;
      let pose = null;
      switch (def.moveType) {
        case 'rychla_jizda':
          speed *= 2;
          break;
        case 'beh':
          speed *= 1.8;
          break;
        case 'tanec':
          speed = 0;
          pose = 'tanec';
          break;
        case 'opilecka_chuze':
          speed *= 0.5;
          pose = 'opily';
          break;
        case 'drepy':
          speed = 0;
          pose = 'drep';
          break;
        case 'kliky':
          speed = 0;
          pose = 'klik';
          break;
        default:
          break;
      }

      let vx = 0;
      let vz = 0;
      if (speed > 0) {
        switch (def.pathType) {
          case 'osa': {
            // sleduj podklad po jedné ose (tam a zpět v pásu povrchu)
            const rect = inst.rect;
            const axis = inst.laneAxis;
            const half = rect ? (axis === 'x' ? rect.w / 2 : rect.d / 2) - 0.6 : 10;
            const center = rect ? (axis === 'x' ? rect.x : rect.z) : 0;
            const posOnAxis = axis === 'x' ? inst.x : inst.z;
            if (posOnAxis > center + half) inst.dir = -1;
            if (posOnAxis < center - half) inst.dir = 1;
            if (axis === 'x') vx = inst.dir * speed;
            else vz = inst.dir * speed;
            break;
          }
          case 'vice_os': {
            // sleduj podklad po více osách — náhodné body v obdélnících povrchu
            if (!inst.target || Math.hypot(inst.target.x - inst.x, inst.target.z - inst.z) < 0.5) {
              const rects = rectsForSurface(map, def.surface);
              inst.target = rects.length
                ? pointInRect(rects[(Math.random() * rects.length) | 0])
                : { x: rand(-14, 14), z: rand(-10, 10) };
            }
            const d = Math.hypot(inst.target.x - inst.x, inst.target.z - inst.z) || 1;
            vx = ((inst.target.x - inst.x) / d) * speed;
            vz = ((inst.target.z - inst.z) / d) * speed;
            break;
          }
          case 'kopiruj_hrace': {
            // kopíruj pohyb hráče (zrcadlí jeho rychlost)
            if (!inst._lastPlayer) inst._lastPlayer = { x: gameState.playerPos.x, z: gameState.playerPos.z };
            vx = (gameState.playerPos.x - inst._lastPlayer.x) / Math.max(delta, 0.001);
            vz = (gameState.playerPos.z - inst._lastPlayer.z) / Math.max(delta, 0.001);
            inst._lastPlayer = { x: gameState.playerPos.x, z: gameState.playerPos.z };
            break;
          }
          case 'ai': {
            // AI: steering s vyhýbáním — sleduje hráče (lev loví!)
            const steer = computeSteering(
              { x: inst.x, z: inst.z },
              { x: gameState.playerPos.x, z: gameState.playerPos.z },
              grid
            );
            vx = steer.x * speed;
            vz = steer.z * speed;
            break;
          }
          case 'nahodna':
          default: {
            // náhodné bloumání s občasným zastavením
            inst.idle -= delta;
            if (inst.idle > 0) break;
            if (inst.idle > -3) {
              inst.heading += (Math.random() - 0.5) * delta * 2;
              if (def.moveType === 'opilecka_chuze') inst.heading += Math.sin(now * 2.2) * delta * 3;
              vx = Math.cos(inst.heading) * speed;
              vz = Math.sin(inst.heading) * speed;
            } else {
              inst.idle = rand(1, 4); // pauza
              inst.heading = rand(0, Math.PI * 2);
            }
            break;
          }
        }
      }

      // krok + udržení v aréně a mimo překážky
      let nx = inst.x + vx * delta;
      let nz = inst.z + vz * delta;
      nx = Math.max(-ARENA_LIMIT.x, Math.min(ARENA_LIMIT.x, nx));
      nz = Math.max(-ARENA_LIMIT.z, Math.min(ARENA_LIMIT.z, nz));
      if (insideObstacle(grid, nx, nz)) {
        inst.heading += Math.PI / 2;
        inst.dir *= -1;
        inst.target = null;
      } else {
        inst.x = nx;
        inst.z = nz;
      }

      const moving = Math.hypot(vx, vz);
      if (moving > 0.05) inst.yaw = Math.atan2(vx, vz);
      group.position.set(inst.x, 0, inst.z);
      group.rotation.y = inst.yaw;
      // opilecké kymácení celého těla
      group.rotation.z = def.moveType === 'opilecka_chuze' ? Math.sin(now * 2.2) * 0.12 : 0;

      const anim = inst.anim.current;
      anim.speed = Math.min(1, moving / 2);
      anim.pose = pose;
      anim.wheelSpin = moving * 2.2; // úhlová rychlost kol (rad/s)
    }

    // --- Odtlačení od hráče: žádný asset se nesmí prolnout s hráčem ------
    for (const inst of instances) {
      if (!inst.alive) continue;
      const size = inst.def.size || { w: 1, h: 1, d: 1 };
      const radius = Math.max(size.w, size.d) / 2 + 0.55;
      const dx = inst.x - gameState.playerPos.x;
      const dz = inst.z - gameState.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001 && dist < radius) {
        const push = radius - dist;
        inst.x += (dx / dist) * push;
        inst.z += (dz / dist) * push;
        inst.dir *= -1;
        inst.heading += Math.PI;
        inst.target = null;
      }
    }

    // --- Kolize assetů mezi sebou: menší se odrazí od většího -------------
    // „Hmotnost" ~ objem bounding boxu; statické assety se nehýbou nikdy.
    for (let a = 0; a < instances.length; a++) {
      const A = instances[a];
      if (!A.alive) continue;
      const sizeA = A.def.size || { w: 1, h: 1, d: 1 };
      const radiusA = Math.max(sizeA.w, sizeA.d) / 2;
      for (let b = a + 1; b < instances.length; b++) {
        const B = instances[b];
        if (!B.alive) continue;
        const sizeB = B.def.size || { w: 1, h: 1, d: 1 };
        const radiusB = Math.max(sizeB.w, sizeB.d) / 2;
        let dx = B.x - A.x;
        let dz = B.z - A.z;
        const dist = Math.hypot(dx, dz);
        const minDist = radiusA + radiusB;
        if (dist >= minDist || dist === 0) continue;
        // menší (lehčí) ustupuje; statika je nekonečně těžká
        const massA = A.def.moveType === 'static' ? Infinity : sizeA.w * sizeA.h * sizeA.d;
        const massB = B.def.moveType === 'static' ? Infinity : sizeB.w * sizeB.h * sizeB.d;
        if (massA === Infinity && massB === Infinity) continue;
        const lighter = massA <= massB ? A : B;
        const push = minDist - dist + 0.02;
        dx /= dist;
        dz /= dist;
        const sign = lighter === B ? 1 : -1;
        lighter.x += dx * push * sign;
        lighter.z += dz * push * sign;
        lighter.x = Math.max(-ARENA_LIMIT.x, Math.min(ARENA_LIMIT.x, lighter.x));
        lighter.z = Math.max(-ARENA_LIMIT.z, Math.min(ARENA_LIMIT.z, lighter.z));
        // odraz: otoč směr pohybu lehčího
        lighter.dir *= -1;
        lighter.heading += Math.PI + (Math.random() - 0.5) * 0.6;
        lighter.target = null;
        const g = groupRefs.current[instances.indexOf(lighter)];
        if (g) g.position.set(lighter.x, g.position.y, lighter.z);
      }
    }
  });

  return (
    <>
      {instances.map((inst, i) => (
        <group
          key={inst.key}
          ref={(g) => {
            groupRefs.current[i] = g;
          }}
          position={[inst.x, 0, inst.z]}
        >
          <AssetModel type={inst.typeId} variant={inst.variant} animRef={inst.anim} />
        </group>
      ))}
    </>
  );
}
