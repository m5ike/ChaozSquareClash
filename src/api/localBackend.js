// Lokální backend — drop-in náhrada Base44 klienta v rozsahu, který hra používá.
// Data žijí v localStorage (klíč chaos_db_<Entita>), realtime mezi taby
// zajišťuje BroadcastChannel 'chaos-local-backend'. Bez sítě, bez přihlášení.

const DB_PREFIX = 'chaos_db_';
const USER_KEY = 'chaos_local_user';
const CHANNEL_NAME = 'chaos-local-backend';
const MAX_RECORDS = 1000; // strop velikosti tabulky (ořez při create)

const DEFAULT_USER = { id: 'local', full_name: 'Lokální hráč', role: 'user' };

// ---------------------------------------------------------------------------
// Úložiště: localStorage, nebo in-memory Mapa (SSR/testy, zakázané storage).
// Fallback drží stejné rozhraní getItem/setItem, takže zbytek kódu nerozlišuje.
// ---------------------------------------------------------------------------
function createStorage() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const probe = '__chaos_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // localStorage chybí nebo je zakázaný — spadneme do paměti
  }
  const mem = new Map();
  return {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => {
      mem.set(key, String(value));
    },
    removeItem: (key) => {
      mem.delete(key);
    },
  };
}

const storage = createStorage();

// Čtení tabulky entity — rozbitý JSON tiše resetuje na [].
function readTable(entity) {
  try {
    const raw = storage.getItem(DB_PREFIX + entity);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTable(entity, records) {
  try {
    storage.setItem(DB_PREFIX + entity, JSON.stringify(records));
  } catch {
    // plná kvóta apod. — zápis je best-effort
  }
}

function readUser() {
  try {
    const raw = storage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...DEFAULT_USER, ...parsed };
      }
    }
  } catch {
    // rozbitý profil → default
  }
  return { ...DEFAULT_USER };
}

function writeUser(user) {
  try {
    storage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // noop
  }
}

// ---------------------------------------------------------------------------
// Pomocné: id + řazení
// ---------------------------------------------------------------------------
function generateId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    // fallthrough na náhradu níže
  }
  return 'r_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

// Obecné porovnání: čísla numericky, jinak jako řetězce (ISO datum tak řadí správně).
function compareValues(a, b) {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

// sort = 'pole' vzestupně, '-pole' sestupně (např. '-created_date', '-score')
function applySort(records, sort) {
  if (!sort || typeof sort !== 'string') return records;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (!field) return records;
  const dir = desc ? -1 : 1;
  return [...records].sort((a, b) => dir * compareValues(a?.[field], b?.[field]));
}

// ---------------------------------------------------------------------------
// Klient se stejným tvarem jako Base44: { entities, auth, getConfig }
// ---------------------------------------------------------------------------
export function createLocalClient() {
  // odběratelé realtime eventů: název entity → Set callbacků
  const subscribers = new Map();

  // Kanál pro ostatní taby — v prostředí bez BroadcastChannel zůstane null
  // (realtime pak funguje jen uvnitř jednoho tabu, data přes storage sdílená jsou).
  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (msg) => {
        const { entity, event } = msg?.data || {};
        if (entity && event) notify(entity, event);
      };
      channel.unref?.(); // v Node nedrží event loop naživu; v prohlížeči no-op
    }
  } catch {
    channel = null;
  }

  // Doručení eventu lokálním odběratelům — asynchronně (mikrotask), aby se
  // nejdřív dokončila mutace a chyba v callbacku neshodila volajícího.
  function notify(entity, event) {
    const subs = subscribers.get(entity);
    if (!subs || subs.size === 0) return;
    for (const callback of [...subs]) {
      Promise.resolve().then(() => {
        try {
          callback(event);
        } catch {
          // chyba odběratele se ignoruje
        }
      });
    }
  }

  // Lokální mutace: notifikuj tento tab + rozešli do ostatních tabů.
  // (BroadcastChannel vlastní zprávy nedoručuje, takže nic nechodí dvakrát.)
  function emit(entity, event) {
    notify(entity, event);
    try {
      channel?.postMessage({ entity, event });
    } catch {
      // neserializovatelná data / zavřený kanál — broadcast je best-effort
    }
  }

  function createEntity(name) {
    return {
      async list(sort = '-created_date', limit = 100) {
        let records = applySort(readTable(name), sort);
        if (typeof limit === 'number' && limit > 0) records = records.slice(0, limit);
        return records;
      },

      // query = přesná shoda všech polí, např. { room_id: '...' }
      async filter(query = {}, sort, limit) {
        const pairs = Object.entries(query || {});
        let records = readTable(name).filter((r) => pairs.every(([k, v]) => r?.[k] === v));
        if (sort) records = applySort(records, sort);
        if (typeof limit === 'number' && limit > 0) records = records.slice(0, limit);
        return records;
      },

      async get(id) {
        const record = readTable(name).find((r) => r?.id === id);
        if (!record) throw new Error('Record not found');
        return record;
      },

      async create(data = {}) {
        const now = new Date().toISOString();
        const record = { ...data, id: generateId(), created_date: now, updated_date: now };
        const records = readTable(name);
        records.push(record);
        writeTable(name, records.slice(-MAX_RECORDS)); // drž jen posledních 1000
        emit(name, { type: 'create', id: record.id, data: record });
        return record;
      },

      async update(id, patch = {}) {
        const records = readTable(name);
        const index = records.findIndex((r) => r?.id === id);
        if (index === -1) throw new Error('Record not found');
        const record = { ...records[index], ...patch, id, updated_date: new Date().toISOString() };
        records[index] = record;
        writeTable(name, records);
        emit(name, { type: 'update', id, data: record });
        return record;
      },

      async delete(id) {
        const records = readTable(name);
        const index = records.findIndex((r) => r?.id === id);
        if (index === -1) return; // idempotentní — mazání neexistujícího nevadí
        const [removed] = records.splice(index, 1);
        writeTable(name, records);
        emit(name, { type: 'delete', id, data: removed });
      },

      // callback dostává { type: 'create'|'update'|'delete', id, data }
      // — z tohoto tabu i z ostatních tabů; vrací funkci pro odhlášení.
      subscribe(callback) {
        let set = subscribers.get(name);
        if (!set) {
          set = new Set();
          subscribers.set(name, set);
        }
        set.add(callback);
        return () => {
          set.delete(callback);
        };
      },
    };
  }

  // Dynamický přístup: base44.entities.CokolivNového funguje bez registrace.
  const entityCache = new Map();
  const entities = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        let entity = entityCache.get(prop);
        if (!entity) {
          entity = createEntity(prop);
          entityCache.set(prop, entity);
        }
        return entity;
      },
    }
  );

  // Lokální hráč je „přihlášen" vždy — me() nikdy nerejectne.
  const auth = {
    async me() {
      return readUser();
    },
    async updateMe(patch = {}) {
      const user = { ...readUser(), ...patch };
      writeUser(user);
      return user;
    },
    async logout() {
      // no-op — lokálně není odkud se odhlásit
    },
    async redirectToLogin() {
      // no-op — žádná přihlašovací stránka neexistuje
    },
  };

  return {
    entities,
    auth,
    getConfig() {
      return { serverUrl: 'local', appId: 'local', requiresAuth: false };
    },
  };
}
