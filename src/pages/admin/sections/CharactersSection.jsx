import { useMemo, useReducer, useState } from 'react';
import { CHARACTERS } from '@/data/characters.js';
import { getCaricatureDataUrl } from '@/game/caricatures.js';
import { setOverride, resetSection } from '@/admin/overrides.js';
import {
  Card,
  FieldRow,
  NumberField,
  TextField,
  ColorField,
  AdminButton,
} from '@/pages/admin/ui.jsx';

// „Postavy & avataři" — seznam všech hratelných postav s inspektorem statů,
// výbavy a schopnosti. Ukládá se do sekce 'characters' jako {id: patch};
// override zároveň zahodí vygenerovaný loadout, takže se změny projeví
// v příští hře.

const CAT_COLORS = {
  Politik: '#ef4444',
  Sport: '#22c55e',
  Hudba: '#a855f7',
  TV: '#3b82f6',
  Net: '#06b6d4',
  Jiné: '#f59e0b',
};

function CatBadge({ cat }) {
  const color = CAT_COLORS[cat] || '#9ca3af';
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
      style={{ background: `${color}26`, color }}
    >
      {cat}
    </span>
  );
}

// Portrét, nebo generovaná karikatura; při chybě načtení portrétu fallback.
function Avatar({ character, className }) {
  return (
    <img
      src={character.portrait || getCaricatureDataUrl(character)}
      alt={character.name}
      loading="lazy"
      className={`${className} rounded-lg object-cover border flex-shrink-0`}
      style={{
        imageRendering: 'pixelated',
        borderColor: character.color || 'rgba(255,255,255,0.15)',
        background: '#0d1117',
      }}
      onError={(e) => {
        if (e.currentTarget.dataset.fallback) return;
        e.currentTarget.dataset.fallback = '1';
        e.currentTarget.src = getCaricatureDataUrl(character);
      }}
    />
  );
}

export default function CharactersSection() {
  const [, bump] = useReducer((x) => x + 1, 0);
  const [selectedId, setSelectedId] = useState(CHARACTERS[0]?.id);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);

  const character = CHARACTERS.find((c) => c.id === selectedId);

  const save = (patch) => {
    setOverride('characters', { [selectedId]: patch });
    bump();
  };
  const num = (build) => (value) => {
    if (Number.isNaN(value)) return;
    save(build(value));
  };

  const handleReset = () => {
    resetSection('characters');
    bump();
    setMessage('Sekce „Postavy" vrácena na výchozí — plný návrat se projeví po obnovení stránky (F5).');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHARACTERS;
    return CHARACTERS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nickname || '').toLowerCase().includes(q) ||
        (c.cat || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <>
      <Card
        title="Postavy & avataři"
        subtitle={`${CHARACTERS.length} hratelných postav — staty, výbava, schopnosti a vzhled`}
        actions={<AdminButton onClick={handleReset}>↩ Výchozí</AdminButton>}
      >
        <p className="text-xs text-white/60">
          Změny se ukládají okamžitě, ve hře se projeví <b>v příští hře</b> — loadout postavy se
          generuje při startu zápasu.
        </p>
        {message && <div className="mt-2 text-xs text-amber-300">{message}</div>}
      </Card>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Levý panel — seznam postav */}
        <div className="w-full md:w-72 flex-shrink-0">
          <Card title="Postavy" subtitle={`Zobrazeno ${filtered.length} z ${CHARACTERS.length}`}>
            <TextField
              width="w-full"
              value={query}
              onChange={setQuery}
              placeholder="Hledat jméno, přezdívku, kategorii…"
            />
            <div className="mt-2 max-h-[560px] overflow-y-auto pr-1">
              {filtered.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg mb-0.5 border ${
                      active ? 'border-emerald-400/60' : 'border-transparent hover:border-white/15'
                    }`}
                    style={{ background: active ? 'rgba(16,185,129,0.15)' : 'transparent' }}
                  >
                    <Avatar character={c} className="w-8 h-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold truncate">{c.name}</span>
                      <span className="block text-[10px] text-white/35 truncate">{c.nickname}</span>
                    </span>
                    <CatBadge cat={c.cat} />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-[11px] text-white/40 px-1 py-2">Nic nenalezeno.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Pravý panel — inspektor vybrané postavy */}
        <div className="flex-1 min-w-0 w-full">
          {character ? (
            <>
              <Card
                title={character.name}
                subtitle={`„${character.nickname}" — id: ${character.id}`}
                actions={<CatBadge cat={character.cat} />}
              >
                <div className="flex gap-4 items-start">
                  <Avatar character={character} className="w-28 h-28" />
                  <div className="flex-1 min-w-0">
                    <FieldRow label="Jméno" hint="Zobrazované jméno postavy">
                      <TextField value={character.name} onChange={(v) => save({ name: v })} />
                    </FieldRow>
                    <FieldRow label="Přezdívka" hint="Podtitul na kartě postavy">
                      <TextField value={character.nickname} onChange={(v) => save({ nickname: v })} />
                    </FieldRow>
                    <FieldRow label="Barva" hint="Akcent postavy v UI a ve hře">
                      <ColorField value={character.color} onChange={(v) => save({ color: v })} />
                    </FieldRow>
                  </div>
                </div>
              </Card>

              <Card title="Staty" subtitle="Základní parametry postavy (stats)">
                <FieldRow label="Zdraví" hint="Maximální HP (10–300)">
                  <NumberField
                    value={character.stats?.health}
                    min={10}
                    max={300}
                    step={5}
                    onChange={num((v) => ({ stats: { health: v } }))}
                  />
                </FieldRow>
                <FieldRow label="Rychlost" hint="Rychlost pohybu (1–10)">
                  <NumberField
                    value={character.stats?.speed}
                    min={1}
                    max={10}
                    step={0.5}
                    onChange={num((v) => ({ stats: { speed: v } }))}
                  />
                </FieldRow>
                <FieldRow label="Násobek damage" hint="Násobí poškození všech zbraní (0.1–3)">
                  <NumberField
                    value={character.stats?.dmgMult}
                    min={0.1}
                    max={3}
                    step={0.05}
                    onChange={num((v) => ({ stats: { dmgMult: v } }))}
                  />
                </FieldRow>
              </Card>

              <Card title="Zbraň & brnění" subtitle="Základ, ze kterého se škáluje celý loadout">
                <FieldRow label="Název zbraně" hint="Charakteristická zbraň postavy">
                  <TextField
                    value={character.weapon?.name}
                    onChange={(v) => save({ weapon: { name: v } })}
                  />
                </FieldRow>
                <FieldRow label="Poškození zbraně" hint="Základní damage — škáluje sečné i střelné sloty">
                  <NumberField
                    value={character.weapon?.damage}
                    min={1}
                    max={100}
                    step={1}
                    onChange={num((v) => ({ weapon: { damage: v } }))}
                  />
                </FieldRow>
                <FieldRow
                  label="Název brnění"
                  hint="Název s přilba/maska/čepice/klobouk = helma (chrání hlavu)"
                >
                  <TextField
                    value={character.armor?.name}
                    onChange={(v) => save({ armor: { name: v } })}
                  />
                </FieldRow>
                <FieldRow label="Ochrana brnění" hint="0–1; nižší hodnota = víc chrání">
                  <NumberField
                    value={character.armor?.defense}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={num((v) => ({ armor: { defense: v } }))}
                  />
                </FieldRow>
              </Card>

              <Card title="Speciální schopnost" subtitle={character.power?.desc || 'Aktivní schopnost postavy'}>
                <FieldRow label="Název schopnosti" hint="Zobrazuje se v HUD">
                  <TextField
                    value={character.power?.name}
                    onChange={(v) => save({ power: { name: v } })}
                  />
                </FieldRow>
                <FieldRow label="Cooldown" hint="Pauza mezi použitími (s)">
                  <NumberField
                    value={character.power?.cd}
                    min={1}
                    max={120}
                    step={1}
                    onChange={num((v) => ({ power: { cd: v } }))}
                  />
                </FieldRow>
              </Card>
            </>
          ) : (
            <Card title="Žádná postava" subtitle="Vyber postavu v seznamu vlevo">
              <p className="text-xs text-white/50">Vybraná postava neexistuje.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
