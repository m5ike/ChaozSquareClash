import { useReducer, useState } from 'react';
import {
  RANGED_DEFAULTS,
  SLASH_TYPES,
  SMG_WEAPON,
  ROCKET_WEAPON,
  SPECIAL_WEAPON,
} from '@/game/weaponsConfig.js';
import { setOverride, resetSection } from '@/admin/overrides.js';
import { Card, FieldRow, NumberField, AdminButton } from '@/pages/admin/ui.jsx';

// „Zbraně" — inspektor parametrů všech střelných zbraní (záložky) a sečných
// typů. Ukládá se do sekce overrides 'weapons' (ranged/slash/smg/rocket/special).

// Popisy polí střelných zbraní — label, česká nápověda, rozsahy.
// `mirror` = duplicitní klíč v configu (cooldown/speed u smg/rocket/special),
// který se musí přepsat spolu s hlavním, aby se změna reálně projevila.
const FIELDS = {
  accuracy: { label: 'Přesnost (accuracy)', hint: '0–1; vyšší = menší rozptyl střel', min: 0, max: 1, step: 0.01 },
  damageScale: { label: 'Násobek damage', hint: 'Poškození = damage postavy × tato hodnota', min: 0, max: 10, step: 0.05 },
  damage: { label: 'Poškození (damage)', hint: 'Pevné poškození na zásah', min: 0, step: 1 },
  armorPen: { label: 'Průraznost (armorPen)', hint: '0–1; kolik ochrany brnění ignoruje', min: 0, max: 1, step: 0.05 },
  spread: { label: 'Rozptyl (spread)', hint: 'Základní odchylka v radiánech', min: 0, max: 1, step: 0.005 },
  pelletCount: { label: 'Počet broků', hint: 'Projektilů na jeden výstřel', min: 1, max: 24, step: 1 },
  magSize: { label: 'Zásobník (magSize)', hint: 'Výstřelů na jeden zásobník', min: 1, step: 1 },
  magazines: { label: 'Zásobníky', hint: 'Celkem nábojů = zásobník × zásobníky', min: 1, max: 30, step: 1 },
  fireCooldown: { label: 'Kadence (fireCooldown)', hint: 'Pauza mezi výstřely (s)', min: 0, max: 10, step: 0.01, mirror: 'cooldown' },
  reloadCooldown: { label: 'Přebití (reloadCooldown)', hint: 'Délka výměny zásobníku (s)', min: 0, max: 15, step: 0.1 },
  projectileSpeed: { label: 'Rychlost střely', hint: 'Jednotky za sekundu', min: 1, max: 100, step: 1, mirror: 'speed' },
  splashRadius: { label: 'Poloměr exploze (splashRadius)', hint: 'Metry; poškození klesá se vzdáleností', min: 0, max: 15, step: 0.1 },
};

const RANGED_FIELD_LIST = [
  'accuracy',
  'damageScale',
  'armorPen',
  'spread',
  'pelletCount',
  'magSize',
  'magazines',
  'fireCooldown',
  'reloadCooldown',
  'projectileSpeed',
];

// Záložky střelných zbraní: odkud číst živé hodnoty a jak zabalit patch
const GUNS = [
  {
    id: 'spread',
    label: 'Brokovnice',
    subtitle: 'Slot 2 — rozptylová zbraň na broky (weapons.ranged.spread)',
    live: RANGED_DEFAULTS.spread,
    wrap: (patch) => ({ ranged: { spread: patch } }),
    fields: RANGED_FIELD_LIST,
  },
  {
    id: 'projectile',
    label: 'Dálka',
    subtitle: 'Slot 3 — přesná zbraň na dálku (weapons.ranged.projectile)',
    live: RANGED_DEFAULTS.projectile,
    wrap: (patch) => ({ ranged: { projectile: patch } }),
    fields: RANGED_FIELD_LIST,
  },
  {
    id: 'smg',
    label: 'Samopal',
    subtitle: 'Slot 4 — brutální kadence, dlouhé přebíjení (weapons.smg)',
    live: SMG_WEAPON,
    wrap: (patch) => ({ smg: patch }),
    fields: ['accuracy', 'damageScale', 'armorPen', 'spread', 'magSize', 'magazines', 'fireCooldown', 'reloadCooldown', 'projectileSpeed'],
  },
  {
    id: 'rocket',
    label: 'Raketomet',
    subtitle: 'Slot 5 — exploze s klesajícím poškozením (weapons.rocket)',
    live: ROCKET_WEAPON,
    wrap: (patch) => ({ rocket: patch }),
    fields: ['accuracy', 'damageScale', 'armorPen', 'spread', 'magSize', 'magazines', 'fireCooldown', 'reloadCooldown', 'projectileSpeed', 'splashRadius'],
  },
  {
    id: 'special',
    label: 'Zlatý kanón',
    subtitle: 'Slot 6 — odměna za zničení NPC (weapons.special)',
    live: SPECIAL_WEAPON,
    wrap: (patch) => ({ special: patch }),
    fields: ['accuracy', 'damage', 'armorPen', 'spread', 'magSize', 'magazines', 'fireCooldown', 'reloadCooldown', 'projectileSpeed'],
  },
];

const SLASH_FIELDS = [
  { key: 'lengthPct', label: 'Délka čepele', hint: 'Podíl výšky postavy (0–1)', min: 0, max: 1, step: 0.05 },
  { key: 'damageMult', label: 'Násobek damage', hint: 'Násobí základní damage postavy', min: 0, max: 10, step: 0.1 },
  { key: 'swingCooldown', label: 'Cooldown švihu', hint: 'Pauza po švihu (s)', min: 0, max: 5, step: 0.05 },
];

export default function WeaponsSection() {
  const [, bump] = useReducer((x) => x + 1, 0);
  const [tab, setTab] = useState('spread');
  const [message, setMessage] = useState(null);

  const save = (patch) => {
    setOverride('weapons', patch);
    bump();
  };

  const handleReset = () => {
    resetSection('weapons');
    bump();
    setMessage('Sekce „Zbraně" vrácena na výchozí — plný návrat se projeví po obnovení stránky (F5).');
  };

  const gun = GUNS.find((g) => g.id === tab) || GUNS[0];

  return (
    <>
      <Card
        title="Zbraně"
        subtitle="Centrální ladění střelných a sečných zbraní"
        actions={<AdminButton onClick={handleReset}>↩ Výchozí</AdminButton>}
      >
        <p className="text-xs text-white/60">
          Změny se projeví <b>v příští hře</b> — loadout postavy se generuje při startu zápasu.
          Vyšší accuracy = menší rozptyl; celkový počet nábojů = zásobník × zásobníky.
        </p>
        {message && <div className="mt-2 text-xs text-amber-300">{message}</div>}
      </Card>

      <div className="flex flex-wrap gap-2 mb-4">
        {GUNS.map((g) => (
          <AdminButton key={g.id} tone={g.id === tab ? 'primary' : 'default'} onClick={() => setTab(g.id)}>
            {g.label}
          </AdminButton>
        ))}
      </div>

      <Card title={gun.label} subtitle={gun.subtitle}>
        <div className="grid sm:grid-cols-2 gap-x-8">
          {gun.fields.map((key) => {
            const field = FIELDS[key];
            return (
              <FieldRow key={`${gun.id}-${key}`} label={field.label} hint={field.hint}>
                <NumberField
                  value={gun.live[key]}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(v) => {
                    if (Number.isNaN(v)) return;
                    const patch = { [key]: v };
                    // duplicitní klíče (cooldown/speed) drž v synchronu
                    if (field.mirror && field.mirror in gun.live) patch[field.mirror] = v;
                    save(gun.wrap(patch));
                  }}
                />
              </FieldRow>
            );
          })}
        </div>
      </Card>

      <Card
        title="Sečné typy"
        subtitle="Slot 1 — typ dle kategorie postavy; headshot nebo srdce = instant kill (weapons.slash)"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(SLASH_TYPES).map(([slashId, def]) => (
            <div key={slashId} className="rounded-lg border border-white/10 p-3" style={{ background: '#0d1117' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: def.color }} />
                <span className="text-xs font-bold">{def.label}</span>
                <span className="text-[10px] text-white/35">weapons.slash.{slashId}</span>
              </div>
              {SLASH_FIELDS.map((field) => (
                <FieldRow key={`${slashId}-${field.key}`} label={field.label} hint={field.hint}>
                  <NumberField
                    width="w-20"
                    value={def[field.key]}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    onChange={(v) => {
                      if (Number.isNaN(v)) return;
                      save({ slash: { [slashId]: { [field.key]: v } } });
                    }}
                  />
                </FieldRow>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
