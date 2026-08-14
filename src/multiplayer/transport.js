import { Vector3 } from 'three';
import { base44 } from '@/api/base44Client.js';
import { bus } from '@/game/events.js';
import { gameState, getSelectedCharacter } from '@/game/state.js';
import { getCharacterById } from '@/data/characters.js';
import { RESPAWN_SECONDS } from '@/game/constants.js';
import { setActiveSession, getActiveSession } from '@/game/lobby.js';

// Multiplayer přes Base44 realtime entity:
//   Room        — místnost (name, map_id, mode_id, status, host_key)
//   PlayerState — stav hráče v místnosti (pozice ~4×/s, zdraví, skóre)
//   HitEvent    — zásah: střelec ho nahlásí, poškození si autoritativně
//                 aplikuje zasažený klient (trust-the-victim model)
//
// Entity musí existovat ve schématu Base44 aplikace — viz README.
// probeMultiplayer() zjistí, jestli backend multiplayer podporuje.

const SYNC_INTERVAL_MS = 250; // 4 Hz broadcast pozice
const PEER_TIMEOUT_MS = 10000; // po 10 s bez zprávy peer mizí

function getPlayerKey() {
  const KEY = 'chaos_player_key';
  try {
    let key = localStorage.getItem(KEY);
    if (!key) {
      key = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(KEY, key);
    }
    return key;
  } catch {
    return 'p_' + Math.random().toString(36).slice(2, 10);
  }
}

export const playerKey = getPlayerKey();

// Zjistí, jestli backend má multiplayerové entity (Room 404 = nemá)
export async function probeMultiplayer() {
  try {
    await base44.entities.Room.list('-created_date', 1);
    return { available: true };
  } catch (error) {
    return {
      available: false,
      reason:
        error?.status === 404
          ? 'Backend nemá entity Room/PlayerState/HitEvent — přidej je v Base44 dashboardu (schéma v README).'
          : `Backend nedostupný: ${error?.message || 'neznámá chyba'}`,
    };
  }
}

export async function listRooms() {
  const rooms = await base44.entities.Room.list('-created_date', 25);
  const cutoff = Date.now() - 1000 * 60 * 30; // půl hodiny staré místnosti skryj
  return rooms.filter(
    (room) => room.status === 'open' && new Date(room.updated_date || room.created_date) > cutoff
  );
}

export async function createRoom(name, mapId) {
  const room = await base44.entities.Room.create({
    name: name || 'Náměstí',
    map_id: mapId,
    mode_id: 'dm',
    status: 'open',
    host_key: playerKey,
  });
  return joinRoom(room);
}

export async function joinRoom(room) {
  const character = getSelectedCharacter();
  const state = await base44.entities.PlayerState.create({
    room_id: room.id,
    player_key: playerKey,
    nickname: character?.nickname || character?.name || 'Hráč',
    character_id: character?.id || 'babis',
    x: 0,
    y: 1,
    z: 10,
    yaw: 0,
    health: character?.stats.health || 100,
    kills: 0,
    deaths: 0,
    alive: true,
    last_seen: new Date().toISOString(),
  });
  const session = {
    room,
    myStateId: state.id,
    playerKey,
    peers: new Map(), // player_key -> peer objekt (sdílený s gameState.remotePlayers)
    _timers: [],
    _unsubs: [],
    _listeners: [],
  };
  setActiveSession(session);
  return session;
}

// Převod záznamu PlayerState na peer objekt v gameState.remotePlayers
function upsertPeer(session, record) {
  if (record.room_id !== session.room.id || record.player_key === session.playerKey) return;
  let peer = session.peers.get(record.player_key);
  if (!peer) {
    peer = {
      key: record.player_key,
      stateId: record.id,
      nickname: record.nickname,
      character: getCharacterById(record.character_id),
      pos: new Vector3(record.x, record.y, record.z),
      targetPos: new Vector3(record.x, record.y, record.z),
      yaw: record.yaw || 0,
      targetYaw: record.yaw || 0,
      health: record.health,
      maxHealth: getCharacterById(record.character_id)?.stats.health || 100,
      kills: record.kills || 0,
      deaths: record.deaths || 0,
      alive: record.alive !== false,
      lastEventAt: Date.now(),
    };
    session.peers.set(record.player_key, peer);
    gameState.remotePlayers = [...session.peers.values()];
    bus.emit('mode-event', { text: `👋 ${peer.nickname} se připojil` });
  } else {
    peer.targetPos.set(record.x, record.y, record.z);
    peer.targetYaw = record.yaw || 0;
    const wasAlive = peer.alive;
    peer.health = record.health;
    peer.kills = record.kills || 0;
    peer.deaths = record.deaths || 0;
    peer.alive = record.alive !== false;
    peer.lastEventAt = Date.now();
    if (wasAlive && !peer.alive) {
      bus.emit('mode-event', { text: `💀 ${peer.nickname} padl` });
    }
  }
}

function removePeer(session, playerKeyToRemove) {
  const peer = session.peers.get(playerKeyToRemove);
  if (peer) {
    session.peers.delete(playerKeyToRemove);
    gameState.remotePlayers = [...session.peers.values()];
    bus.emit('mode-event', { text: `👋 ${peer.nickname} odešel` });
  }
}

// Spustí synchronizaci: broadcast vlastního stavu + odběr peerů a zásahů.
// Volá Play při mountu; vrací funkci pro úklid.
export function startSync(session) {
  // 1) realtime odběry
  const unsubPlayers = base44.entities.PlayerState.subscribe((event) => {
    if (event.type === 'delete') {
      for (const [key, peer] of session.peers) {
        if (peer.stateId === event.id) {
          removePeer(session, key);
          break;
        }
      }
      return;
    }
    if (event.data) upsertPeer(session, { ...event.data, id: event.id });
  });
  const unsubHits = base44.entities.HitEvent.subscribe((event) => {
    if (event.type === 'delete' || !event.data) return;
    const hit = event.data;
    if (hit.room_id !== session.room.id || hit.target_key !== session.playerKey) return;
    // autoritativní aplikace poškození na sebe
    if (gameState.phase !== 'playing' || gameState.playerInvincible) return;
    gameState.playerHealth -= hit.damage * gameState.playerArmor;
    bus.emit('health-changed', gameState.playerHealth);
    if (gameState.playerHealth <= 0) {
      gameState.phase = 'respawning';
      gameState.playerRespawnTimer = RESPAWN_SECONDS;
      gameState.deaths++;
      bus.emit('player-died', { killer: hit.shooter_name || 'Protihráč' });
    }
  });
  session._unsubs.push(unsubPlayers, unsubHits);

  // 2) hlášení mých zásahů (Projectiles detekuje kolizi s peerem)
  const onRemoteHit = (info) => {
    base44.entities.HitEvent.create({
      room_id: session.room.id,
      target_key: info.key,
      shooter_key: session.playerKey,
      shooter_name:
        getSelectedCharacter()?.nickname || getSelectedCharacter()?.name || 'Protihráč',
      damage: Math.round(info.damage),
      crit: !!info.crit,
    }).catch(() => {});
  };
  bus.on('remote-player-hit', onRemoteHit);
  session._listeners.push(['remote-player-hit', onRemoteHit]);

  // 3) pravidelný broadcast vlastního stavu + prořezání mrtvých peerů
  const syncTimer = setInterval(() => {
    base44.entities.PlayerState.update(session.myStateId, {
      x: +gameState.playerPos.x.toFixed(2),
      y: +gameState.playerPos.y.toFixed(2),
      z: +gameState.playerPos.z.toFixed(2),
      yaw: +gameState.playerYaw.toFixed(3),
      health: Math.round(gameState.playerHealth),
      kills: gameState.kills,
      deaths: gameState.deaths,
      alive: gameState.phase === 'playing',
      last_seen: new Date().toISOString(),
    }).catch(() => {});
    const now = Date.now();
    for (const [key, peer] of session.peers) {
      if (now - peer.lastEventAt > PEER_TIMEOUT_MS) removePeer(session, key);
    }
  }, SYNC_INTERVAL_MS);
  session._timers.push(syncTimer);

  // 4) úvodní načtení již připojených hráčů
  base44.entities.PlayerState.filter({ room_id: session.room.id })
    .then((records) => {
      for (const record of records) upsertPeer(session, record);
    })
    .catch(() => {});

  return () => stopSync(session);
}

export function stopSync(session) {
  for (const t of session._timers) clearInterval(t);
  for (const unsub of session._unsubs) {
    try {
      unsub?.();
    } catch {
      /* noop */
    }
  }
  for (const [event, fn] of session._listeners) bus.off(event, fn);
  session._timers = [];
  session._unsubs = [];
  session._listeners = [];
}

// Odchod z místnosti: úklid + smazání vlastního stavu (best-effort)
export async function leaveRoom() {
  const session = getActiveSession();
  if (!session) return;
  stopSync(session);
  gameState.remotePlayers = [];
  setActiveSession(null);
  try {
    await base44.entities.PlayerState.delete(session.myStateId);
  } catch {
    /* stav dožene PEER_TIMEOUT na ostatních klientech */
  }
  if (session.room.host_key === session.playerKey) {
    try {
      await base44.entities.Room.update(session.room.id, { status: 'closed' });
    } catch {
      /* noop */
    }
  }
}
