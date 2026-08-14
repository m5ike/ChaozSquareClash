import { useMemo, useReducer, useState } from 'react';
import { ASSET_TYPES, ASSET_GROUPS } from '@/data/assetsCatalog.js';
import { setOverride, resetSection } from '@/admin/overrides.js';
import {
  Card,
  FieldRow,
  NumberField,
  TextField,
  SelectField,
  Toggle,
  AdminButton,
} from '@/pages/admin/ui.jsx';

// „Assety & šablony" — katalog typů assetů (statika, vozidla, chodci, zvířata)
// s inspektorem vlastností a rychlými šablonami. Ukládá se do sekce 'assets'
// jako {typeId: patch}; šablonové parametry se ukládají také (hra je zatím
// číst nemusí — připraveno do budoucna).

const GROUP_LABELS = {
  static: 'Statické objekty',
  vehicle: 'Vozidla',
  pedestrian: 'Chodci',
  animal: 'Zvířata',
};

const SURFACE_OPTIONS = [
  ['silnice', 'Silnice'],
  ['chodnik', 'Chodník'],
  ['koleje', 'Koleje'],
  ['stezka', 'Stezka'],
  ['kdekoli', 'Kdekoli'],
];

const MOVE_OPTIONS = [
  ['static', 'Statický'],
  ['jizda', 'Jízda'],
  ['rychla_jizda', 'Rychlá jízda'],
  ['chuze', 'Chůze'],
  ['beh', 'Běh'],
  ['tanec', 'Tanec'],
  ['opilecka_chuze', 'Opilecká chůze'],
  ['drepy', 'Dřepy'],
  ['kliky', 'Kliky'],
];

const PATH_OPTIONS = [
  ['nahodna', 'Náhodná'],
  ['osa', 'Jedna osa'],
  ['vice_os', 'Více os'],
  ['kopiruj_hrace', 'Kopíruj hráče'],
  ['ai', 'AI'],
];

// Šablony typů — doporučené hodnoty; kliknutí je předvyplní a hned uloží.
const TEMPLATES = [
  {
    id: 'static',
    label: 'Statický objekt',
    patch: {
      moveType: 'static', pathType: 'nahodna', speed: 0, health: 50,
      protected: false, reward: true, invulnerable: false,
      maxArmor: 0, minDamageCoef: 1, maxDamageCoef: 1, predefinedMovements: '',
    },
  },
  {
    id: 'vehicle',
    label: 'Vozidlo',
    patch: {
      surface: 'silnice', moveType: 'jizda', pathType: 'osa', speed: 7, health: 100,
      protected: false, reward: true, invulnerable: false,
      maxArmor: 25, minDamageCoef: 0.8, maxDamageCoef: 1.2,
      predefinedMovements: 'jizda,rychla_jizda',
    },
  },
  {
    id: 'pedestrian',
    label: 'Chodec',
    patch: {
      surface: 'chodnik', moveType: 'chuze', pathType: 'nahodna', speed: 1.4, health: 35,
      protected: false, reward: true, invulnerable: false,
      maxArmor: 0, minDamageCoef: 0.9, maxDamageCoef: 1.5,
      predefinedMovements: 'chuze,beh,tanec,opilecka_chuze,drepy,kliky',
    },
  },
  {
    id: 'animal',
    label: 'Zvíře',
    patch: {
      surface: 'kdekoli', moveType: 'chuze', pathType: 'nahodna', speed: 2, health: 25,
      protected: false, reward: true, invulnerable: false,
      maxArmor: 0, minDamageCoef: 1, maxDamageCoef: 1.5, predefinedMovements: 'chuze,beh',
    },
  },
  {
    id: 'invulnerable',
    label: 'Nezničitelný',
    patch: {
      health: 999999, invulnerable: true, protected: false, reward: false,
      minDamageCoef: 0, maxDamageCoef: 0,
    },
  },
];

export default function AssetsSection() {
  const [, bump] = useReducer((x) => x + 1, 0);
  const [selectedId, setSelectedId] = useState(Object.keys(ASSET_TYPES)[0]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);

  const def = ASSET_TYPES[selectedId];

  const save = (patch) => {
    setOverride('assets', { [selectedId]: patch });
    bump();
  };
  const num = (build) => (value) => {
    if (Number.isNaN(value)) return;
    save(build(value));
  };

  const applyTemplate = (template) => {
    setOverride('assets', { [selectedId]: template.patch });
    bump();
    setMessage(`Šablona „${template.label}" aplikována na typ „${def?.name || selectedId}" a uložena.`);
  };

  const handleReset = () => {
    resetSection('assets');
    bump();
    setMessage('Sekce „Assety" vrácena na výchozí — plný návrat se projeví po obnovení stránky (F5).');
  };

  // Seznam vlevo: skupiny → typy, filtrované vyhledáváním
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(ASSET_GROUPS)
      .map(([groupId, ids]) => [
        groupId,
        ids.filter((id) => {
          if (!q) return true;
          const type = ASSET_TYPES[id];
          return id.toLowerCase().includes(q) || (type?.name || '').toLowerCase().includes(q);
        }),
      ])
      .filter(([, ids]) => ids.length > 0);
  }, [query]);

  return (
    <>
      <Card
        title="Šablony typů"
        subtitle="Předvyplní inspektor vybraného typu doporučenými hodnotami a hned je uloží"
        actions={<AdminButton onClick={handleReset}>↩ Výchozí</AdminButton>}
      >
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <AdminButton key={template.id} onClick={() => applyTemplate(template)}>
              {template.label}
            </AdminButton>
          ))}
        </div>
        {message && <div className="mt-2 text-xs text-amber-300">{message}</div>}
      </Card>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Levý panel — seznam typů */}
        <div className="w-full md:w-64 flex-shrink-0">
          <Card title="Typy assetů" subtitle={`${Object.keys(ASSET_TYPES).length} typů v katalogu`}>
            <TextField width="w-full" value={query} onChange={setQuery} placeholder="Hledat typ…" />
            <div className="mt-2 max-h-[520px] overflow-y-auto pr-1">
              {groups.map(([groupId, ids]) => (
                <div key={groupId} className="mb-2">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-wide px-1 py-1">
                    {GROUP_LABELS[groupId] || groupId}
                  </div>
                  {ids.map((id) => {
                    const type = ASSET_TYPES[id];
                    const active = id === selectedId;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedId(id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs mb-0.5 border ${
                          active ? 'border-emerald-400/60' : 'border-transparent hover:border-white/15'
                        }`}
                        style={{ background: active ? 'rgba(16,185,129,0.15)' : 'transparent' }}
                      >
                        <span className="font-bold">{type.name}</span>
                        {type.protected && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle"
                            style={{ background: '#f59e0b' }}
                            title="Chráněný — za zabití penalizace"
                          />
                        )}
                        <span className="block text-[10px] text-white/35">{id}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {groups.length === 0 && (
                <div className="text-[11px] text-white/40 px-1 py-2">Nic nenalezeno.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Pravý panel — inspektor vybraného typu */}
        <div className="flex-1 min-w-0 w-full">
          {def ? (
            <Card
              title={def.name}
              subtitle={`id: ${selectedId} — skupina: ${GROUP_LABELS[def.group] || def.group}`}
            >
              <FieldRow label="Název" hint="Zobrazované jméno typu">
                <TextField value={def.name} onChange={(v) => save({ name: v })} />
              </FieldRow>
              <FieldRow label="Zdraví (HP)" hint="0 nebo velmi vysoké číslo = prakticky nezničitelné">
                <NumberField value={def.health} min={0} step={5} onChange={num((v) => ({ health: v }))} />
              </FieldRow>
              <FieldRow label="Chráněný" hint="Za zabití padá penalizace a nepadá odměna">
                <Toggle value={!!def.protected} onChange={(v) => save({ protected: v })} />
              </FieldRow>
              <FieldRow label="Odměna" hint="Za zničení padá náhodná odměna">
                <Toggle value={!!def.reward} onChange={(v) => save({ reward: v })} />
              </FieldRow>
              <FieldRow label="Povrch" hint="Po čem se pohybuje / kde stojí">
                <SelectField value={def.surface} options={SURFACE_OPTIONS} onChange={(v) => save({ surface: v })} />
              </FieldRow>
              <FieldRow label="Typ pohybu" hint="Animace/chování při pohybu">
                <SelectField value={def.moveType} options={MOVE_OPTIONS} onChange={(v) => save({ moveType: v })} />
              </FieldRow>
              <FieldRow label="Typ cesty" hint="U statiky jen způsob rozmístění">
                <SelectField value={def.pathType} options={PATH_OPTIONS} onChange={(v) => save({ pathType: v })} />
              </FieldRow>
              <FieldRow label="Rychlost" hint="Jednotky za sekundu (0 = stojí)">
                <NumberField value={def.speed} min={0} max={30} step={0.1} onChange={num((v) => ({ speed: v }))} />
              </FieldRow>
              <FieldRow label="Rozměry š × v × h" hint="Přibližný bounding box (m)">
                <div className="flex items-center gap-1.5">
                  <NumberField width="w-16" value={def.size?.w} min={0.05} step={0.05} onChange={num((v) => ({ size: { w: v } }))} />
                  <NumberField width="w-16" value={def.size?.h} min={0.05} step={0.05} onChange={num((v) => ({ size: { h: v } }))} />
                  <NumberField width="w-16" value={def.size?.d} min={0.05} step={0.05} onChange={num((v) => ({ size: { d: v } }))} />
                </div>
              </FieldRow>

              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-wide">
                  Šablonové parametry (do budoucna)
                </div>
                <div className="text-[10px] text-white/35 mb-1.5">
                  Ukládají se do overrides — hra je zatím číst nemusí.
                </div>
                <FieldRow label="Max. brnění" hint="Brnění objektu (0 = žádné)">
                  <NumberField value={def.maxArmor ?? 0} min={0} step={5} onChange={num((v) => ({ maxArmor: v }))} />
                </FieldRow>
                <FieldRow label="Min. koeficient poškození" hint="Náhodný násobek přijatého poškození (0–2)">
                  <NumberField value={def.minDamageCoef ?? 1} min={0} max={2} step={0.05} onChange={num((v) => ({ minDamageCoef: v }))} />
                </FieldRow>
                <FieldRow label="Max. koeficient poškození" hint="Horní mez náhodného násobku (0–2)">
                  <NumberField value={def.maxDamageCoef ?? 1} min={0} max={2} step={0.05} onChange={num((v) => ({ maxDamageCoef: v }))} />
                </FieldRow>
                <FieldRow label="Nezničitelný" hint="Objekt nepůjde zničit vůbec">
                  <Toggle value={!!def.invulnerable} onChange={(v) => save({ invulnerable: v })} />
                </FieldRow>
                <FieldRow label="Zásobník (magSize)" hint="Pro budoucí střílející objekty">
                  <NumberField value={def.magSize ?? 0} min={0} step={1} onChange={num((v) => ({ magSize: v }))} />
                </FieldRow>
                <FieldRow label="Zásobníky" hint="Počet zásobníků střílejícího objektu">
                  <NumberField value={def.magazines ?? 0} min={0} step={1} onChange={num((v) => ({ magazines: v }))} />
                </FieldRow>
                <FieldRow label="Kadence (ms)" hint="Pauza mezi výstřely v milisekundách">
                  <NumberField value={def.fireCooldownMs ?? 0} min={0} step={10} onChange={num((v) => ({ fireCooldownMs: v }))} />
                </FieldRow>
                <FieldRow label="Přebití (ms)" hint="Délka výměny zásobníku v milisekundách">
                  <NumberField value={def.reloadCooldownMs ?? 0} min={0} step={100} onChange={num((v) => ({ reloadCooldownMs: v }))} />
                </FieldRow>
                <FieldRow label="Předdefinované pohyby" hint="Čárkami oddělený seznam (např. chuze,beh,tanec)">
                  <TextField
                    value={def.predefinedMovements ?? ''}
                    placeholder="chuze,beh,…"
                    onChange={(v) => save({ predefinedMovements: v })}
                  />
                </FieldRow>
              </div>
            </Card>
          ) : (
            <Card title="Žádný typ" subtitle="Vyber typ assetu v seznamu vlevo">
              <p className="text-xs text-white/50">Vybraný typ v katalogu neexistuje.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
