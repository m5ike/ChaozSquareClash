import { useReducer, useState } from 'react';
import { PLAYER, BOT, TUNING } from '@/game/constants.js';
import { MODES } from '@/game/modes.js';
import { REWARDS, PENALTIES } from '@/game/rewards.js';
import { setOverride, resetSection } from '@/admin/overrides.js';
import { Card, FieldRow, NumberField, AdminButton } from '@/pages/admin/ui.jsx';

// „Herní parametry" — ladění hráče, botů, obecných pravidel, cílů herních módů
// a vah odměn/penalizací. Každá změna se okamžitě ukládá přes setOverride
// (deep-merge do localStorage + aplikace na živou konfiguraci).

const REWARD_LABELS = {
  heal: 'Doplnění zdraví',
  armor: 'Dočasné brnění (30 s)',
  damage: 'Násobek damage (2–4×)',
  immortal: 'Nesmrtelnost (8 s)',
  precise: 'Precise shot — headshoty',
  special: 'Zlatý mód zbraně (15 s)',
  ammo2: 'Náboje — brokovnice',
  ammo3: 'Náboje — dálka',
  ammo4: 'Náboje — samopal',
  ammo5: 'Rakety — raketomet',
  weapon6: 'Zlatý kanón',
};

const PENALTY_LABELS = {
  freeze: 'Zmrazení pohybu',
  selfdamage: 'Self damage',
  noaim: 'No aim — střely míjí',
  blur: 'Rozmazané vidění',
  nogun: 'Zákaz střelby',
};

export default function GameParamsSection() {
  const [, bump] = useReducer((x) => x + 1, 0);
  const [message, setMessage] = useState(null);

  const save = (section, patch) => {
    setOverride(section, patch);
    bump();
  };

  // NumberField vrací parseFloat — prázdné/rozepsané pole (NaN) neukládáme
  const num = (section, build) => (value) => {
    if (Number.isNaN(value)) return;
    save(section, build(value));
  };

  const handleReset = (section, label) => {
    resetSection(section);
    bump();
    setMessage(
      `Sekce „${label}" vrácena na výchozí hodnoty — plný návrat se projeví po obnovení stránky (F5).`
    );
  };

  const resetButton = (section, label) => (
    <AdminButton onClick={() => handleReset(section, label)}>↩ Výchozí</AdminButton>
  );

  const mode = (id) => MODES.find((m) => m.id === id) || {};

  return (
    <>
      {message && (
        <div
          className="mb-4 px-4 py-2.5 rounded-xl border border-amber-400/30 text-xs text-amber-200"
          style={{ background: 'rgba(217,119,6,0.12)' }}
        >
          {message}
        </div>
      )}

      <Card
        title="Hráč"
        subtitle="Fyzika kapsle hráče, kamera a zdraví (tuning.player)"
        actions={resetButton('tuning', 'Herní ladění — hráč, boti i obecné')}
      >
        <div className="grid sm:grid-cols-2 gap-x-8">
          <FieldRow label="Maximální zdraví" hint="Výchozí HP hráče při spawnu">
            <NumberField value={PLAYER.maxHealth} min={10} step={5} onChange={num('tuning', (v) => ({ player: { maxHealth: v } }))} />
          </FieldRow>
          <FieldRow label="Síla výskoku" hint="Impuls skoku; vyšší = výš">
            <NumberField value={PLAYER.jumpForce} min={1} max={20} step={0.5} onChange={num('tuning', (v) => ({ player: { jumpForce: v } }))} />
          </FieldRow>
          <FieldRow label="Výška očí" hint="Pozice kamery nad středem kapsle (m)">
            <NumberField value={PLAYER.eyeHeight} min={0} max={2} step={0.05} onChange={num('tuning', (v) => ({ player: { eyeHeight: v } }))} />
          </FieldRow>
          <FieldRow label="Polovina výšky" hint="Půlka výšky kolizní kapsle (m)">
            <NumberField value={PLAYER.halfHeight} min={0.1} max={2} step={0.05} onChange={num('tuning', (v) => ({ player: { halfHeight: v } }))} />
          </FieldRow>
          <FieldRow label="Poloměr" hint="Poloměr kolizní kapsle (m)">
            <NumberField value={PLAYER.radius} min={0.1} max={1} step={0.05} onChange={num('tuning', (v) => ({ player: { radius: v } }))} />
          </FieldRow>
        </div>
      </Card>

      <Card
        title="Boti"
        subtitle="Výchozí parametry protivníků (tuning.bot)"
        actions={resetButton('tuning', 'Herní ladění — hráč, boti i obecné')}
      >
        <div className="grid sm:grid-cols-2 gap-x-8">
          <FieldRow label="Počet botů" hint="Kolik botů se spawne do zápasu">
            <NumberField value={BOT.count} min={0} max={20} step={1} onChange={num('tuning', (v) => ({ bot: { count: v } }))} />
          </FieldRow>
          <FieldRow label="Zdraví" hint="HP jednoho bota">
            <NumberField value={BOT.health} min={1} step={5} onChange={num('tuning', (v) => ({ bot: { health: v } }))} />
          </FieldRow>
          <FieldRow label="Poškození" hint="Damage útoku bota">
            <NumberField value={BOT.damage} min={0} step={1} onChange={num('tuning', (v) => ({ bot: { damage: v } }))} />
          </FieldRow>
          <FieldRow label="Rychlost" hint="Pohyb bota (j/s)">
            <NumberField value={BOT.speed} min={0} max={15} step={0.5} onChange={num('tuning', (v) => ({ bot: { speed: v } }))} />
          </FieldRow>
          <FieldRow label="Dosah útoku" hint="Vzdálenost útoku zblízka (m)">
            <NumberField value={BOT.attackRange} min={0.5} max={10} step={0.5} onChange={num('tuning', (v) => ({ bot: { attackRange: v } }))} />
          </FieldRow>
          <FieldRow label="Cooldown útoku" hint="Pauza mezi útoky bota (s)">
            <NumberField value={BOT.attackCooldown} min={0.1} max={10} step={0.1} onChange={num('tuning', (v) => ({ bot: { attackCooldown: v } }))} />
          </FieldRow>
          <FieldRow label="Respawn" hint="Oživení bota po smrti (s)">
            <NumberField value={BOT.respawnTime} min={0} max={60} step={1} onChange={num('tuning', (v) => ({ bot: { respawnTime: v } }))} />
          </FieldRow>
        </div>
      </Card>

      <Card
        title="Obecné"
        subtitle="Pravidla zápasu a projektily (tuning.general)"
        actions={resetButton('tuning', 'Herní ladění — hráč, boti i obecné')}
      >
        <div className="grid sm:grid-cols-2 gap-x-8">
          <FieldRow label="Cílové skóre" hint="Deathmatch — počet bodů pro výhru">
            <NumberField value={TUNING.winScore} min={1} step={5} onChange={num('tuning', (v) => ({ general: { winScore: v } }))} />
          </FieldRow>
          <FieldRow label="Respawn hráče" hint="Čekání po smrti hráče (s)">
            <NumberField value={TUNING.respawnSeconds} min={0} max={60} step={1} onChange={num('tuning', (v) => ({ general: { respawnSeconds: v } }))} />
          </FieldRow>
          <FieldRow label="Životnost projektilu" hint="Za jak dlouho střela zmizí (s)">
            <NumberField value={TUNING.projectileTtl} min={0.5} max={30} step={0.5} onChange={num('tuning', (v) => ({ general: { projectileTtl: v } }))} />
          </FieldRow>
        </div>
      </Card>

      <Card
        title="Herní módy"
        subtitle="Cíle jednotlivých módů (modes)"
        actions={resetButton('modes', 'Herní módy')}
      >
        <FieldRow label="Týmový DM — cílové body" hint="Tým vyhrává dosažením tohoto skóre">
          <NumberField value={mode('tdm').teamTarget} min={1} step={5} onChange={num('modes', (v) => ({ tdm: { teamTarget: v } }))} />
        </FieldRow>
        <FieldRow label="Ukořistit vlajku — zanesení" hint="Počet donesených vlajek pro výhru">
          <NumberField value={mode('ctf').captures} min={1} max={20} step={1} onChange={num('modes', (v) => ({ ctf: { captures: v } }))} />
        </FieldRow>
        <FieldRow label="Král náměstí — držení zóny" hint="Celkové sekundy držení zóny pro výhru">
          <NumberField value={mode('koth').holdSeconds} min={5} step={5} onChange={num('modes', (v) => ({ koth: { holdSeconds: v } }))} />
        </FieldRow>
      </Card>

      <Card
        title="Odměny & penalizace"
        subtitle="Váhy náhodného losu — vyšší váha = častější výskyt, 0 = prakticky vypnuto (rewards)"
        actions={resetButton('rewards', 'Odměny & penalizace')}
      >
        <div className="grid md:grid-cols-2 gap-x-8">
          <div>
            <div className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">
              Odměny (za zničení assetů)
            </div>
            {REWARDS.map((reward) => (
              <FieldRow key={reward.id} label={REWARD_LABELS[reward.id] || reward.id} hint={`id: ${reward.id}`}>
                <NumberField
                  width="w-20"
                  value={reward.weight}
                  min={0}
                  step={1}
                  onChange={num('rewards', (v) => ({ rewards: { [reward.id]: { weight: v } } }))}
                />
              </FieldRow>
            ))}
          </div>
          <div>
            <div className="text-[11px] font-bold text-rose-300/80 uppercase tracking-wide mb-1">
              Penalizace (za chráněné cíle)
            </div>
            {PENALTIES.map((penalty) => (
              <FieldRow key={penalty.id} label={PENALTY_LABELS[penalty.id] || penalty.id} hint={`id: ${penalty.id}`}>
                <NumberField
                  width="w-20"
                  value={penalty.weight}
                  min={0}
                  step={1}
                  onChange={num('rewards', (v) => ({ penalties: { [penalty.id]: { weight: v } } }))}
                />
              </FieldRow>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
