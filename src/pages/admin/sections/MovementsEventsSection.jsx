import { useState } from 'react';
import { BODY_GESTURES, FACE_GESTURES, getAutoGestureInterval, setAutoGestureInterval } from '@/game/gestures.js';
import { SLASH_TRAJECTORIES } from '@/game/weaponsConfig.js';
import { AVAILABLE_EVENTS, AVAILABLE_ACTIONS, getEventRules, initEventRules } from '@/game/eventRules.js';
import { setOverride, replaceSection } from '@/admin/overrides.js';
import { Card, FieldRow, NumberField, TextField, SelectField, Toggle, AdminButton } from '@/pages/admin/ui.jsx';

// Pohybové sety (gesta, trajektorie sečných zbraní) a onEvent pravidla —
// navázání vlastních akcí na herní události bez zásahu do kódu.
export default function MovementsEventsSection() {
  const [gestures, setGestures] = useState(() => [...BODY_GESTURES, ...FACE_GESTURES]);
  const [rules, setRules] = useState(() => getEventRules());
  const [autoInterval, setAutoInterval] = useState(getAutoGestureInterval());

  const updateGesture = (id, duration) => {
    setOverride('gestures', { [id]: { duration } });
    setGestures((prev) => prev.map((g) => (g.id === id ? { ...g, duration } : g)));
  };

  const saveRules = (next) => {
    setRules(next);
    replaceSection('eventRules', next);
    initEventRules();
  };

  const addRule = () => {
    saveRules([
      ...rules,
      {
        id: `rule_${Date.now()}`,
        event: 'enemy-killed',
        action: 'message',
        params: { text: '⚡ Vlastní událost' },
        enabled: true,
      },
    ]);
  };

  const updateRule = (id, patch) => {
    saveRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id) => saveRules(rules.filter((r) => r.id !== id));

  return (
    <>
      <Card title="Pohybové sety — gesta a mimika" subtitle="Délky animací; spouští se klávesou G/V, automaticky nebo přes onEvent pravidla">
        <div className="grid sm:grid-cols-2 gap-x-8">
          {gestures.map((gesture) => (
            <FieldRow key={gesture.id} label={gesture.name} hint={`id: ${gesture.id}`}>
              <div className="flex items-center gap-2">
                <NumberField
                  value={gesture.duration}
                  step={0.1}
                  min={0.3}
                  max={5}
                  width="w-20"
                  onChange={(v) => updateGesture(gesture.id, v)}
                />
                <span className="text-[10px] text-white/40">s</span>
              </div>
            </FieldRow>
          ))}
        </div>
        <FieldRow label="Interval automatických gest" hint="0 = vypnuto">
          <div className="flex items-center gap-2">
            <NumberField
              value={autoInterval}
              min={0}
              max={120}
              width="w-20"
              onChange={(v) => {
                setAutoInterval(v);
                setAutoGestureInterval(v);
              }}
            />
            <span className="text-[10px] text-white/40">s</span>
          </div>
        </FieldRow>
      </Card>

      <Card
        title="Trajektorie sečných zbraní"
        subtitle="Přehled pohybových setů čepele (úprava bodů v weaponsConfig.js; výběr počtem stisků střelby)"
      >
        {SLASH_TRAJECTORIES.map((trajectory) => (
          <FieldRow key={trajectory.id} label={`${trajectory.id}. ${trajectory.name}`} hint={trajectory.desc}>
            <span className="text-[10px] text-white/40">
              {trajectory.points.length} bodů • {trajectory.duration}s • cíl: {trajectory.zone}
            </span>
          </FieldRow>
        ))}
      </Card>

      <Card
        title="onEvent pravidla"
        subtitle="Vlastní funkce navázané na herní události (uloží se a platí okamžitě)"
        actions={<AdminButton tone="primary" onClick={addRule}>＋ Přidat pravidlo</AdminButton>}
      >
        {rules.length === 0 && (
          <p className="text-xs text-white/40">Žádná pravidla. Přidej první — např. „při zabití bota přehraj gesto".</p>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center gap-2 py-2 border-b border-white/5 last:border-0">
            <Toggle value={rule.enabled} onChange={(v) => updateRule(rule.id, { enabled: v })} />
            <span className="text-[10px] text-white/40">při</span>
            <SelectField
              value={rule.event}
              width="w-40"
              options={AVAILABLE_EVENTS}
              onChange={(v) => updateRule(rule.id, { event: v })}
            />
            <span className="text-[10px] text-white/40">→</span>
            <SelectField
              value={rule.action}
              width="w-48"
              options={AVAILABLE_ACTIONS}
              onChange={(v) => updateRule(rule.id, { action: v })}
            />
            {rule.action === 'message' && (
              <TextField
                value={rule.params?.text}
                width="w-44"
                placeholder="text zprávy"
                onChange={(v) => updateRule(rule.id, { params: { ...rule.params, text: v } })}
              />
            )}
            {rule.action === 'gesture' && (
              <SelectField
                value={rule.params?.gestureId || ''}
                width="w-36"
                options={[['', 'náhodné'], ...[...BODY_GESTURES, ...FACE_GESTURES].map((g) => [g.id, g.name])]}
                onChange={(v) => updateRule(rule.id, { params: { ...rule.params, gestureId: v } })}
              />
            )}
            <AdminButton tone="danger" onClick={() => removeRule(rule.id)}>✕</AdminButton>
          </div>
        ))}
      </Card>
    </>
  );
}
