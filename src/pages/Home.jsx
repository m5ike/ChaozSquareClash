import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/api/base44Client.js';
import { CHARACTERS } from '@/data/characters.js';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/data/categories.js';
import { MAPS } from '@/data/maps/index.js';
import { MODES } from '@/game/modes.js';
import { setSelectedCharacter, gameState } from '@/game/state.js';
import { loadKeybindings } from '@/game/keybindings.js';
import { loadGameSettings } from '@/game/settings.js';
import {
  getSelectedMapId,
  setSelectedMapId,
  getSelectedModeId,
  setSelectedModeId,
  setActiveSession,
} from '@/game/lobby.js';
import { probeMultiplayer, listRooms, createRoom, joinRoom } from '@/multiplayer/transport.js';
import OrientationWarning from '@/components/game/OrientationWarning.jsx';
import CharacterPreview from '@/components/CharacterPreview.jsx';
import { getCaricatureDataUrl } from '@/game/caricatures.js';

// Ukazatel jedné statistiky postavy (HP / SPD / DMG)
function StatBar({ label, value, max, color }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

// Úvodní obrazovka — výběr postavy
export default function Home() {
  const navigate = useNavigate();
  const [selectedChar, setSelectedChar] = useState(null);
  const [category, setCategory] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mapId, setMapId] = useState(getSelectedMapId());
  const [modeId, setModeId] = useState(getSelectedModeId());
  const [showOnline, setShowOnline] = useState(false);
  const [mpStatus, setMpStatus] = useState(null); // null = nezjištěno, {available, reason}
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [mpBusy, setMpBusy] = useState(false);

  useEffect(() => {
    // zkratky z profilu uživatele + herní nastavení z úložiště
    loadKeybindings();
    loadGameSettings();
    // single player výchozí — session se nastavuje až připojením do místnosti
    setActiveSession(null);
    gameState.remotePlayers = [];
    gameState.mode = null;
  }, []);

  const pickMap = (id) => {
    setMapId(id);
    setSelectedMapId(id);
  };

  const pickMode = (id) => {
    setModeId(id);
    setSelectedModeId(id);
  };

  // Otevření online panelu: ověř podporu backendu a načti místnosti
  const openOnline = async () => {
    setShowOnline(true);
    if (mpStatus?.available) {
      refreshRooms();
      return;
    }
    const status = await probeMultiplayer();
    setMpStatus(status);
    if (status.available) refreshRooms();
  };

  const refreshRooms = async () => {
    try {
      setRooms(await listRooms());
    } catch {
      setRooms([]);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedChar || mpBusy) return;
    setMpBusy(true);
    try {
      setSelectedCharacter(selectedChar);
      await createRoom(roomName || `Náměstí ${selectedChar.nickname}`, mapId);
      navigate('/play');
    } catch {
      setMpBusy(false);
    }
  };

  const handleJoinRoom = async (room) => {
    if (!selectedChar || mpBusy) return;
    setMpBusy(true);
    try {
      setSelectedCharacter(selectedChar);
      setSelectedMapId(room.map_id || 'praha');
      await joinRoom(room);
      navigate('/play');
    } catch {
      setMpBusy(false);
    }
  };

  const filteredCharacters = useMemo(
    () => (category === 'all' ? CHARACTERS : CHARACTERS.filter((ch) => ch.cat === category)),
    [category]
  );

  const handlePlay = () => {
    if (selectedChar) {
      setSelectedCharacter(selectedChar);
      navigate('/play');
    }
  };

  const handleRandom = () => {
    const ch = CHARACTERS[(Math.random() * CHARACTERS.length) | 0];
    setSelectedChar(ch);
  };

  const handleDeleteAccount = async () => {
    try {
      await auth.logout();
    } catch {}
    window.location.href = '/login';
  };

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      <OrientationWarning />

      {/* Horní lišta */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">ČESKÝ QUAKE</h1>
          <p className="text-xs text-white/50">Deathmatch — Vyber si postavu</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            🛠 Admin
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            ⚙ Nastavení
          </button>
          <button
            onClick={handleRandom}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            🎲 Náhodně
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-400/30 text-red-400/70 hover:bg-red-500/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            🗑 Účet
          </button>
          <button
            onClick={handlePlay}
            disabled={!selectedChar}
            className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedChar ? 'hover:scale-105' : 'opacity-40 cursor-not-allowed'}`}
            style={{ background: selectedChar ? '#16a34a' : 'rgba(255,255,255,0.1)' }}
          >
            ▶ HRÁT
          </button>
        </div>
      </div>

      {/* Filtr kategorií */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <button
          onClick={() => setCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${category === 'all' ? 'text-white' : 'text-white/50'}`}
          style={{ background: category === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent' }}
        >
          Všichni ({CHARACTERS.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = CHARACTERS.filter((ch) => ch.cat === key).length;
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${category === key ? 'text-white' : 'text-white/50'}`}
              style={{
                background: category === key ? CATEGORY_COLORS[key] + '40' : 'transparent',
                border: category === key ? `1px solid ${CATEGORY_COLORS[key]}` : '1px solid transparent',
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lobby — výběr mapy, módu a online hra */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs"
        style={{ background: 'rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 font-bold uppercase tracking-wide text-[10px]">Mapa</span>
          {MAPS.map((map) => (
            <button
              key={map.id}
              onClick={() => pickMap(map.id)}
              title={map.desc}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap border transition-all ${
                mapId === map.id ? 'text-white' : 'text-white/50 border-transparent'
              }`}
              style={{
                background: mapId === map.id ? map.palette.sky + '50' : 'rgba(255,255,255,0.05)',
                borderColor: mapId === map.id ? map.palette.sky : 'transparent',
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ background: map.palette.buildingA }}
              />
              {map.name.split(' — ')[0]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/40 font-bold uppercase tracking-wide text-[10px]">Mód</span>
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => pickMode(mode.id)}
              title={mode.desc}
              className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap border transition-all ${
                modeId === mode.id
                  ? 'text-white border-green-500'
                  : 'text-white/50 border-transparent'
              }`}
              style={{
                background: modeId === mode.id ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.05)',
              }}
            >
              {mode.icon} {mode.name}
            </button>
          ))}
        </div>
        <button
          onClick={openOnline}
          className="px-2.5 py-1 rounded-full font-bold border border-blue-400/40 text-blue-300 hover:bg-blue-500/10"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          🌐 Online hra
        </button>
      </div>

      {/* Mřížka postav */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-3">
        {filteredCharacters.map((ch) => {
          const isSelected = selectedChar?.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChar(ch)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
              style={{
                borderColor: isSelected ? ch.color : 'rgba(255,255,255,0.1)',
                background: isSelected ? ch.color + '20' : 'rgba(0,0,0,0.3)',
              }}
            >
              <div
                className="aspect-[3/4] flex items-end justify-center overflow-hidden"
                style={{ background: `linear-gradient(180deg, ${ch.color}30 0%, ${ch.color}60 100%)` }}
              >
                <img
                  src={ch.portrait || getCaricatureDataUrl(ch) || ''}
                  alt={ch.name}
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="px-1 py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <div className="text-xs font-bold truncate">{ch.name}</div>
                <div className="text-[10px] text-white/50 truncate">{ch.weapon.name}</div>
              </div>
              <div
                className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: CATEGORY_COLORS[ch.cat], color: 'white' }}
              >
                {ch.cat}
              </div>
              {isSelected && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  <div className="text-2xl">✅</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail vybrané postavy */}
      {selectedChar && (
        <div
          className="sticky bottom-0 px-4 py-3"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            {/* Rotující 3D model postavy */}
            <div
              className="w-24 h-28 rounded-lg overflow-hidden flex-shrink-0"
              style={{ background: `linear-gradient(180deg, ${selectedChar.color}25, ${selectedChar.color}55)` }}
            >
              <CharacterPreview key={selectedChar.id} character={selectedChar} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold" style={{ color: selectedChar.color }}>
                {selectedChar.name}
              </h3>
              <p className="text-xs text-white/50 mb-2">„{selectedChar.nickname}"</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-white/40">Zbraň</div>
                  <div className="font-bold">{selectedChar.weapon.name}</div>
                  <div className="text-white/40">DMG {selectedChar.weapon.damage}</div>
                </div>
                <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-white/40">Brnění</div>
                  <div className="font-bold">{selectedChar.armor.name}</div>
                  <div className="text-white/40">DEF {Math.round((1 - selectedChar.armor.defense) * 100)}%</div>
                </div>
                <div className="rounded-lg px-2 py-1" style={{ background: selectedChar.color + '20' }}>
                  <div className="text-white/40">Super-power</div>
                  <div className="font-bold text-xs">{selectedChar.power.name}</div>
                  <div className="text-white/40">{selectedChar.power.cd}s</div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-24 space-y-1">
              <StatBar label="HP" value={selectedChar.stats.health} max={140} color="#e74c3c" />
              <StatBar label="SPD" value={selectedChar.stats.speed} max={8} color="#3498db" />
              <StatBar label="DMG" value={selectedChar.stats.dmgMult} max={1.3} color="#f39c12" />
            </div>
          </div>
        </div>
      )}

      {/* Online hra — místnosti */}
      {showOnline && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowOnline(false)}
        >
          <div
            className="bg-zinc-900 rounded-xl p-5 w-full max-w-md mx-4 text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">🌐 Online hra</h2>
              <button onClick={() => setShowOnline(false)} className="text-white/40 hover:text-white">
                ✕
              </button>
            </div>

            {mpStatus === null && <p className="text-sm text-white/50">Zjišťuji podporu backendu…</p>}

            {mpStatus && !mpStatus.available && (
              <div className="text-sm text-white/70 space-y-2">
                <p>⚠️ {mpStatus.reason}</p>
                <p className="text-white/40 text-xs">
                  Multiplayer potřebuje entity <b>Room</b>, <b>PlayerState</b> a <b>HitEvent</b> — jejich
                  JSON schéma najdeš v README projektu. Po přidání v Base44 dashboardu bude online hra
                  fungovat okamžitě.
                </p>
              </div>
            )}

            {mpStatus?.available && (
              <>
                {!selectedChar && (
                  <p className="text-xs text-yellow-400/80 mb-2">Nejdřív si vyber postavu.</p>
                )}
                <div className="flex gap-2 mb-4">
                  <input
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    placeholder="Název místnosti"
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 border border-white/15 outline-none focus:border-white/40"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    onClick={handleCreateRoom}
                    disabled={!selectedChar || mpBusy}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${selectedChar && !mpBusy ? '' : 'opacity-40 cursor-not-allowed'}`}
                    style={{ background: '#16a34a' }}
                  >
                    {mpBusy ? '…' : 'Vytvořit'}
                  </button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-white/40 font-bold uppercase tracking-wide">
                    Otevřené místnosti
                  </div>
                  <button onClick={refreshRooms} className="text-xs text-white/40 hover:text-white">
                    ↻ Obnovit
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {rooms.length === 0 && (
                    <p className="text-sm text-white/40">Žádná otevřená místnost. Založ první!</p>
                  )}
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{room.name}</div>
                        <div className="text-[10px] text-white/40">
                          {MAPS.find((m) => m.id === room.map_id)?.name || room.map_id} • Deathmatch
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room)}
                        disabled={!selectedChar || mpBusy}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 ${selectedChar && !mpBusy ? '' : 'opacity-40 cursor-not-allowed'}`}
                        style={{ background: '#2563eb' }}
                      >
                        Připojit
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/30 mt-3">
                  Pozice se synchronizují ~4× za sekundu přes Base44 realtime — počítej s mírnou
                  latencí. Online hra běží v módu Deathmatch.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Potvrzení smazání účtu */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[100] grid place-items-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm mx-4 text-white">
            <h2 className="text-lg font-bold mb-2">Smazat účet?</h2>
            <p className="text-sm text-white/60 mb-4">
              Tato akce tě odhlásí a zažádá o smazání tvého účtu. Akce je nevratná.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ background: '#dc2626' }}
              >
                Smazat účet
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
