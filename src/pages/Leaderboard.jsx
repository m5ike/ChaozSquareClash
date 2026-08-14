import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchResult } from '@/api/base44Client.js';
import { CHARACTERS } from '@/data/characters.js';

// Žebříček se třemi záložkami:
//  • Dnes      — denní top 40 podle skóre (od půlnoci), medaile pro top 3
//  • Síň slávy — celkové statistiky postav + Chaos rating
//  • Vývoj     — kumulativní killy dneška po hodinách + top 5 postav dne
// Data se načítají jedním dotazem (500 nejnovějších záznamů) a sdílí je všechny záložky.

const ACCENT = '#f39c12';
const CARD_BG = 'rgba(255,255,255,0.05)';

const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((ch) => [ch.id, ch]));

const TABS = [
  { id: 'dnes', label: 'Dnes' },
  { id: 'sin', label: 'Síň slávy' },
  { id: 'vyvoj', label: 'Vývoj' },
];

const META = {
  dnes: { title: '🏆 Denní žebříček', sub: 'Resetuje se každý den • Top 40 hráčů' },
  sin: { title: '🏛️ Síň slávy', sub: 'Všechny zaznamenané zápasy • řazeno podle Chaos ratingu' },
  vyvoj: { title: '📈 Vývoj dne', sub: 'Kumulativní killy po hodinách • Top 5 postav dneška' },
};

function medal(index) {
  return index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);
}

function characterKey(record) {
  return record.character_id || record.character_name || 'neznamy';
}

function characterName(record) {
  return record.character_name || CHAR_BY_ID[record.character_id]?.name || 'Neznámý';
}

// Síň slávy — agregace přes všechny načtené záznamy jedné postavy.
// Chaos rating = 1000 + 2×Σskóre + 3×Σkills − 2×Σdeaths
// Série = nejdelší řada po sobě jdoucích zápasů (chronologicky) se skóre > 0.
function aggregateHall(records) {
  const chrono = [...records].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const map = new Map();
  for (const r of chrono) {
    const key = characterKey(r);
    let entry = map.get(key);
    if (!entry) {
      entry = {
        key,
        characterId: r.character_id,
        name: characterName(r),
        matches: 0,
        kills: 0,
        deaths: 0,
        scoreSum: 0,
        best: 0,
        streak: 0,
        curStreak: 0,
      };
      map.set(key, entry);
    }
    entry.matches += 1;
    entry.kills += r.kills || 0;
    entry.deaths += r.deaths || 0;
    entry.scoreSum += r.score || 0;
    entry.best = Math.max(entry.best, r.score || 0);
    if ((r.score || 0) > 0) {
      entry.curStreak += 1;
      entry.streak = Math.max(entry.streak, entry.curStreak);
    } else {
      entry.curStreak = 0;
    }
  }
  return [...map.values()]
    .map((e) => ({
      ...e,
      rating: Math.round(1000 + 2 * e.scoreSum + 3 * e.kills - 2 * e.deaths),
      kd: e.deaths === 0 ? e.kills : e.kills / e.deaths,
    }))
    .sort((a, b) => b.rating - a.rating);
}

// Kumulativní killy dneška po hodinách: cum[h] = killy do konce hodiny h−1.
function buildChart(todayRecords) {
  const buckets = Array(24).fill(0);
  for (const r of todayRecords) {
    buckets[new Date(r.created_date).getHours()] += r.kills || 0;
  }
  const cum = [0];
  for (let h = 1; h <= 24; h++) cum[h] = cum[h - 1] + buckets[h - 1];
  const endHour = Math.min(24, new Date().getHours() + 1);
  return { cum, endHour };
}

// Top 5 postav dneška podle killů (pro sloupcový přehled).
function topKillersToday(todayRecords) {
  const map = new Map();
  for (const r of todayRecords) {
    const key = characterKey(r);
    const entry = map.get(key) || { key, characterId: r.character_id, name: characterName(r), kills: 0 };
    entry.kills += r.kills || 0;
    map.set(key, entry);
  }
  return [...map.values()]
    .filter((e) => e.kills > 0)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);
}

// Inline SVG graf (bez knihovny): čára + vyplněná plocha kumulativních killů, osa x 0–24 h.
function TrendChart({ cum, endHour }) {
  const W = 720;
  const H = 240;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const yMax = Math.max(1, cum[cum.length - 1]);
  const x = (h) => padL + (h / 24) * iw;
  const y = (v) => padT + ih - (v / yMax) * ih;

  const points = [];
  for (let h = 0; h <= endHour; h++) points.push(`${x(h).toFixed(1)},${y(cum[h]).toFixed(1)}`);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');
  const area = `${line} L${x(endHour).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const hourTicks = [0, 6, 12, 18, 24];
  const yTicks = [...new Set([0, Math.round(yMax / 2), yMax])];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Graf kumulativních killů dnes po hodinách"
    >
      {hourTicks.map((h) => (
        <line key={h} x1={x(h)} y1={padT} x2={x(h)} y2={y(0)} stroke="rgba(255,255,255,0.07)" />
      ))}
      {yTicks.map((v) => (
        <line key={v} x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="rgba(255,255,255,0.1)" />
      ))}
      {hourTicks.map((h) => (
        <text key={h} x={x(h)} y={H - 10} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.4)">
          {h}h
        </text>
      ))}
      {yTicks.map((v) => (
        <text key={v} x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
          {v}
        </text>
      ))}
      <path d={area} fill={ACCENT} opacity="0.18" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(endHour)} cy={y(cum[endHour])} r="4" fill={ACCENT} />
    </svg>
  );
}

// Portrét postavy s fallbackem (barevné kolečko s iniciálou, když obrázek chybí).
function Portrait({ character, name }) {
  return (
    <div
      className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ background: character?.color || 'rgba(255,255,255,0.1)' }}
    >
      <span>{(name || '?').charAt(0)}</span>
      {character?.portrait && (
        <img
          src={character.portrait}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ emoji, children }) {
  return (
    <div className="text-center text-white/50 py-20">
      <div className="text-4xl mb-4">{emoji}</div>
      {children}
    </div>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dnes');

  useEffect(() => {
    // Jeden fetch pro všechny záložky — 500 nejnovějších výsledků.
    MatchResult.list('-created_date', 500)
      .then((all) => setRecords(Array.isArray(all) ? all : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { todayTop, hall, chart, topKillers, hasToday } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = records.filter((r) => new Date(r.created_date) >= todayStart);
    return {
      todayTop: [...today].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 40),
      hall: aggregateHall(records),
      chart: buildChart(today),
      topKillers: topKillersToday(today),
      hasToday: today.length > 0,
    };
  }, [records]);

  const maxKills = topKillers[0]?.kills || 1;

  return (
    <div
      className="min-h-screen w-full p-8"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{META[tab].title}</h1>
            <p className="text-white/40 text-xs mt-1">{META[tab].sub}</p>
          </div>
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">
            ← Zpět
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                tab === t.id ? '' : 'text-white/50 border-white/10 hover:text-white'
              }`}
              style={
                tab === t.id
                  ? { background: 'rgba(243,156,18,0.15)', borderColor: 'rgba(243,156,18,0.5)', color: ACCENT }
                  : { background: CARD_BG }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 text-white/50">
            <div
              className="w-10 h-10 rounded-full border-2 border-white/15 animate-spin mb-4"
              style={{ borderTopColor: ACCENT }}
            />
            Načítání…
          </div>
        ) : tab === 'dnes' ? (
          todayTop.length === 0 ? (
            <EmptyState emoji="🎮">Zatím žádné výsledky dnes. Buď první!</EmptyState>
          ) : (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/50">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Postava</th>
                    <th className="px-4 py-3 text-right">Skóre</th>
                    <th className="px-4 py-3 text-right">K</th>
                    <th className="px-4 py-3 text-right">D</th>
                    <th className="px-4 py-3 text-right">K/D</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTop.map((result, index) => (
                    <tr
                      key={result.id}
                      className={`text-white border-t border-white/5 ${index < 3 ? 'bg-white/5' : ''}`}
                    >
                      <td className="px-4 py-2 font-bold">{medal(index)}</td>
                      <td className="px-4 py-2 font-bold">
                        {result.character_name || 'Neznámý'}
                        {result.is_bot && <span className="ml-1 text-xs text-white/30">(bot)</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-yellow-400">{result.score}</td>
                      <td className="px-4 py-2 text-right text-green-400">{result.kills || 0}</td>
                      <td className="px-4 py-2 text-right text-red-400">{result.deaths || 0}</td>
                      <td className="px-4 py-2 text-right text-white/70">
                        {result.deaths ? ((result.kills || 0) / result.deaths).toFixed(1) : '∞'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'sin' ? (
          hall.length === 0 ? (
            <EmptyState emoji="🏛️">Zatím žádné výsledky. Síň slávy čeká na první hrdiny!</EmptyState>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 text-[11px] uppercase tracking-wider text-white/40">
                <div className="w-8">#</div>
                <div className="flex-1">Postava</div>
                <div className="w-14 text-right">Zápasy</div>
                <div className="w-14 text-right">K/D</div>
                <div className="w-14 text-right">Série</div>
                <div className="w-20 text-right">Rating</div>
              </div>
              {hall.map((entry, index) => {
                const ch = CHAR_BY_ID[entry.characterId];
                return (
                  <div
                    key={entry.key}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/10"
                    style={{ background: CARD_BG }}
                  >
                    <div className="w-8 font-bold text-white">{medal(index)}</div>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <Portrait character={ch} name={entry.name} />
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">{entry.name}</div>
                        <div className="text-xs text-white/40 truncate">
                          {ch?.nickname ? `${ch.nickname} · ` : ''}Rekord {entry.best}
                        </div>
                      </div>
                    </div>
                    <div className="w-14 text-right text-sm text-white/70">{entry.matches}</div>
                    <div className="w-14 text-right text-sm text-white/70">{entry.kd.toFixed(1)}</div>
                    <div className="w-14 text-right text-sm text-white/70">
                      {entry.streak >= 3 ? '🔥 ' : ''}
                      {entry.streak}
                    </div>
                    <div className="w-20 text-right font-bold text-yellow-400">
                      {entry.rating.toLocaleString('cs-CZ')}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : !hasToday ? (
          <EmptyState emoji="📈">Zatím žádné výsledky dnes. Graf se teprve nakreslí!</EmptyState>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-white/10 p-4" style={{ background: CARD_BG }}>
              <h2 className="text-white font-bold mb-1">Kumulativní killy dnes</h2>
              <p className="text-white/40 text-xs mb-3">Součet killů od půlnoci po hodinách</p>
              <TrendChart cum={chart.cum} endHour={chart.endHour} />
            </div>

            <div className="rounded-lg border border-white/10 p-4" style={{ background: CARD_BG }}>
              <h2 className="text-white font-bold mb-3">Top 5 postav dneška podle killů</h2>
              {topKillers.length === 0 ? (
                <p className="text-white/50 text-sm">Zatím žádné killy dnes.</p>
              ) : (
                <div className="space-y-2">
                  {topKillers.map((t) => {
                    const ch = CHAR_BY_ID[t.characterId];
                    const pct = Math.max(4, Math.round((t.kills / maxKills) * 100));
                    return (
                      <div key={t.key} className="flex items-center gap-3">
                        <div className="w-36 shrink-0 truncate text-sm font-bold text-white">{t.name}</div>
                        <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{ width: `${pct}%`, background: ch?.color || ACCENT }}
                          />
                        </div>
                        <div className="w-10 shrink-0 text-right text-sm text-white/70">{t.kills}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
