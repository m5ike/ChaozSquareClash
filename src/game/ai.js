// AI pomůcky pro boty: steering s vyhýbáním překážkám, hledání krytu
// a výběr zbraně podle vzdálenosti. Pracuje nad AABB boxy aktivní mapy —
// žádné raycasty do fyziky, čistá geometrie (deterministické a levné).

// Předzpracování překážek mapy na AABB se zvětšením o poloměr bota
export function buildObstacleGrid(map, botRadius = 0.45) {
  const boxes = [];
  const add = (item) => {
    const [x, , z] = item.pos;
    const [w, , d] = item.size;
    boxes.push({
      minX: x - w / 2 - botRadius,
      maxX: x + w / 2 + botRadius,
      minZ: z - d / 2 - botRadius,
      maxZ: z + d / 2 + botRadius,
      cx: x,
      cz: z,
      halfW: w / 2,
      halfD: d / 2,
    });
  };
  for (const b of map.buildings) add(b);
  for (const o of map.obstacles) add(o);
  return boxes;
}

function insideBox(box, x, z) {
  return x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ;
}

// Nejbližší bod AABB k bodu (x, z)
function closestPointOnBox(box, x, z) {
  return {
    x: Math.max(box.minX, Math.min(box.maxX, x)),
    z: Math.max(box.minZ, Math.min(box.maxZ, z)),
  };
}

// Steering: směr k cíli + odpudivé síly blízkých překážek + úhyb před
// překážkou v dráze (lookahead). Vrací normalizovaný směr {x, z}.
export function computeSteering(pos, target, obstacles) {
  let desiredX = target.x - pos.x;
  let desiredZ = target.z - pos.z;
  const dist = Math.hypot(desiredX, desiredZ);
  if (dist < 0.001) return { x: 0, z: 0 };
  desiredX /= dist;
  desiredZ /= dist;

  let steerX = desiredX;
  let steerZ = desiredZ;

  // bod před botem — kontrola kolize v dráze
  const lookX = pos.x + desiredX * 1.4;
  const lookZ = pos.z + desiredZ * 1.4;

  for (const box of obstacles) {
    // rychlé vyřazení vzdálených boxů
    if (
      pos.x < box.minX - 3 ||
      pos.x > box.maxX + 3 ||
      pos.z < box.minZ - 3 ||
      pos.z > box.maxZ + 3
    )
      continue;

    // odpudivá síla od okraje překážky
    const closest = closestPointOnBox(box, pos.x, pos.z);
    const dx = pos.x - closest.x;
    const dz = pos.z - closest.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.001 && d < 1.6) {
      const push = (1 - d / 1.6) * 1.5;
      steerX += (dx / d) * push;
      steerZ += (dz / d) * push;
    }

    // lookahead uvnitř boxu → silný boční úhyb (kolmice od středu boxu)
    if (insideBox(box, lookX, lookZ)) {
      const sideX = -(box.cz - pos.z);
      const sideZ = box.cx - pos.x;
      const sideLen = Math.hypot(sideX, sideZ) || 1;
      // vyber stranu úhybu souhlasnou s žádaným směrem
      const dot = (sideX * desiredX + sideZ * desiredZ) / sideLen;
      const sign = dot >= 0 ? 1 : -1;
      steerX += (sideX / sideLen) * sign * 1.8;
      steerZ += (sideZ / sideLen) * sign * 1.8;
    }
  }

  const len = Math.hypot(steerX, steerZ) || 1;
  return { x: steerX / len, z: steerZ / len };
}

// Krycí bod: místo za překážkou z pohledu hrozby (threat), nejbližší k botovi.
export function findCoverSpot(pos, threat, obstacles) {
  let best = null;
  let bestDist = Infinity;
  for (const box of obstacles) {
    // jen nízké/střední překážky poblíž (budovy po obvodu neřešíme — příliš daleko)
    const dirX = box.cx - threat.x;
    const dirZ = box.cz - threat.z;
    const len = Math.hypot(dirX, dirZ);
    if (len < 0.5 || len > 30) continue;
    const spotX = box.cx + (dirX / len) * (Math.max(box.halfW, box.halfD) + 0.9);
    const spotZ = box.cz + (dirZ / len) * (Math.max(box.halfW, box.halfD) + 0.9);
    // krycí bod musí být uvnitř arény
    if (Math.abs(spotX) > 17 || Math.abs(spotZ) > 12.5) continue;
    const d = Math.hypot(spotX - pos.x, spotZ - pos.z);
    if (d < bestDist) {
      bestDist = d;
      best = { x: spotX, z: spotZ };
    }
  }
  return best;
}

// Výběr zbraně z loadoutu podle vzdálenosti k cíli:
// zblízka bližák, na střední brokovnice, na dálku projektil.
export function chooseWeaponIndex(dist) {
  if (dist < 3) return 0; // melee
  if (dist < 10) return 1; // spread
  return 2; // projectile
}
