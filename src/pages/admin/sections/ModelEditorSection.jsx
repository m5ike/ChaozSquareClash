import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Card,
  FieldRow,
  NumberField,
  TextField,
  ColorField,
  SelectField,
  Toggle,
  AdminButton,
} from '@/pages/admin/ui.jsx';
import { saveCustomAsset, deleteCustomAsset, listCustomAssets } from '@/admin/overrides.js';
import { ToonMat } from '@/game/toon.jsx';

// ============================================================================
// EDITOR 3D MODELŮ — skladač primitiv (mini-Blockbench): model se skládá
// z dílů (box/koule/kapsle/válec/kužel), živý náhled vlevo rotuje na
// otočném podstavci a renderuje díly stejně jako CustomPartsModel ve hře.
// Uložený asset se registruje do katalogu → spawnuje se v živém městě.
// ============================================================================

const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const round3 = (v) => Math.round(num(v) * 1000) / 1000;

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

const SHAPE_OPTIONS = [
  ['box', 'Kvádr'],
  ['sphere', 'Koule'],
  ['capsule', 'Kapsle'],
  ['cylinder', 'Válec'],
  ['cone', 'Kužel'],
];
const SHAPE_LABEL = Object.fromEntries(SHAPE_OPTIONS);

// Parametry geometrie podle tvaru: [popisek, výchozí hodnota]
const SHAPE_ARGS = {
  box: [['Šířka', 0.4], ['Výška', 0.4], ['Hloubka', 0.4]],
  sphere: [['Poloměr', 0.3]],
  capsule: [['Poloměr', 0.15], ['Délka', 0.4]],
  cylinder: [['R horní', 0.2], ['R dolní', 0.2], ['Výška', 0.5]],
  cone: [['Poloměr', 0.25], ['Výška', 0.5]],
};

const GROUP_OPTIONS = [
  ['static', 'Statika'],
  ['vehicle', 'Vozidlo'],
  ['pedestrian', 'Chodec'],
  ['animal', 'Zvíře'],
];
const SURFACE_OPTIONS = [
  ['kdekoli', 'Kdekoli'],
  ['silnice', 'Silnice'],
  ['chodnik', 'Chodník'],
  ['koleje', 'Koleje'],
  ['stezka', 'Stezka'],
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
  ['osa', 'Osa'],
  ['vice_os', 'Více os'],
  ['kopiruj_hrace', 'Kopíruj hráče'],
  ['ai', 'AI'],
];

function makeNewAsset() {
  return {
    id: '',
    name: 'Nový model',
    group: 'static',
    health: 30,
    size: { w: 1, h: 1.2, d: 1 },
    protected: false,
    reward: true,
    surface: 'kdekoli',
    moveType: 'static',
    pathType: 'nahodna',
    speed: 0,
    variants: [],
    parts: [
      { shape: 'box', pos: [0, 0.35, 0], rot: [0, 0, 0], scale: [1, 1, 1], args: [0.8, 0.7, 0.8], color: '#b3342e' },
      { shape: 'sphere', pos: [0, 0.95, 0], rot: [0, 0, 0], scale: [1, 1, 1], args: [0.32], color: '#e0c23c' },
    ],
  };
}

function makeNewPart() {
  return { shape: 'box', pos: [0, 0.2, 0], rot: [0, 0, 0], scale: [1, 1, 1], args: [0.4, 0.4, 0.4], color: '#8a9aae' };
}

/* ---------- Živý 3D náhled ---------- */

// Render dílů — lokální kopie CustomPartsModel z AssetModel.jsx (stejné
// geometrie i fallbacky), navíc zvýraznění vybraného dílu emissive zelení.
function PartsPreview({ parts, selected }) {
  return (
    <group>
      {(parts || []).map((part, i) => {
        const args = part.args || [];
        const highlighted = i === selected;
        return (
          <mesh
            key={i}
            position={part.pos || [0, 0, 0]}
            rotation={part.rot || [0, 0, 0]}
            scale={part.scale || [1, 1, 1]}
            castShadow
          >
            {part.shape === 'sphere' && <sphereGeometry args={[args[0] ?? 0.3, 12, 10]} />}
            {part.shape === 'capsule' && (
              <capsuleGeometry args={[args[0] ?? 0.15, args[1] ?? 0.4, 4, 10]} />
            )}
            {part.shape === 'cylinder' && (
              <cylinderGeometry args={[args[0] ?? 0.2, args[1] ?? 0.2, args[2] ?? 0.5, 12]} />
            )}
            {part.shape === 'cone' && <coneGeometry args={[args[0] ?? 0.25, args[1] ?? 0.5, 12]} />}
            {(!part.shape || part.shape === 'box') && (
              <boxGeometry args={[args[0] ?? 0.4, args[1] ?? 0.4, args[2] ?? 0.4]} />
            )}
            <ToonMat
              color={part.color || '#cccccc'}
              emissive={highlighted ? '#10b981' : part.emissive || '#000000'}
              emissiveIntensity={highlighted ? 0.45 : part.emissive ? 0.6 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Pomalu rotující podstavec — model je přiškálovaný podle bounding size,
// aby se do náhledu vešel celý (vzor CharacterPreview).
function ModelTurntable({ parts, size, selected }) {
  const groupRef = useRef();
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.7;
  });
  const maxDim = Math.max(num(size?.w, 1), num(size?.h, 1), num(size?.d, 1), 0.4);
  const s = Math.min(2.2, 1.9 / maxDim);
  return (
    <group ref={groupRef} position={[0, -0.82, 0]}>
      <group scale={[s, s, s]}>
        <PartsPreview parts={parts} selected={selected} />
      </group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.15, 28]} />
        <meshStandardMaterial color="#1c2333" />
      </mesh>
    </group>
  );
}

function ModelPreview({ parts, size, selected }) {
  return (
    <Canvas
      dpr={1}
      camera={{ fov: 38, position: [0, 0.55, 3.4] }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.65} color="#8090b0" />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#ffd9a0" />
      <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#4060a0" />
      <ModelTurntable parts={parts} size={size} selected={selected} />
    </Canvas>
  );
}

/* ---------- Sdílené řádky inspektoru ---------- */

function VecRow({ label, hint, value, step, onChange }) {
  return (
    <FieldRow label={label} hint={hint}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <NumberField
            key={i}
            width="w-16"
            step={step}
            value={round3(value?.[i] ?? 0)}
            onChange={(v) => onChange(i, num(v))}
          />
        ))}
      </div>
    </FieldRow>
  );
}

// ============================================================================
// Komponenta
// ============================================================================

export default function ModelEditorSection() {
  const [asset, setAsset] = useState(() => makeNewAsset());
  const [isNew, setIsNew] = useState(true);
  const [selPart, setSelPart] = useState(0);
  const [status, setStatus] = useState('');
  const [tick, setTick] = useState(0);

  const saved = useMemo(() => listCustomAssets(), [tick]);
  const part = asset.parts[selPart];

  function updateAsset(mutator) {
    setAsset((prev) => {
      const next = clone(prev);
      mutator(next);
      return next;
    });
  }

  function updatePart(mutator) {
    if (!part) return;
    updateAsset((a) => {
      if (a.parts[selPart]) mutator(a.parts[selPart]);
    });
  }

  function loadAsset(def) {
    setAsset(clone(def));
    setIsNew(false);
    setSelPart(0);
    setStatus('');
  }

  function newAsset() {
    setAsset(makeNewAsset());
    setIsNew(true);
    setSelPart(0);
    setStatus('');
  }

  // --- Díly -----------------------------------------------------------------

  function addPart() {
    updateAsset((a) => a.parts.push(makeNewPart()));
    setSelPart(asset.parts.length); // délka před push = index nového dílu
  }

  function duplicatePart() {
    if (!part) return;
    updateAsset((a) => a.parts.push(clone(a.parts[selPart])));
    setSelPart(asset.parts.length);
  }

  function deletePart() {
    if (!part) return;
    updateAsset((a) => a.parts.splice(selPart, 1));
    setSelPart((i) => Math.max(0, i - 1));
  }

  // --- Uložení / smazání ----------------------------------------------------

  function handleSave() {
    const id = slugify(asset.id) || slugify(asset.name);
    if (!id) {
      setStatus('Zadej id nebo název modelu.');
      return;
    }
    if (asset.parts.length === 0) {
      setStatus('Model musí mít alespoň jeden díl.');
      return;
    }
    const def = {
      id,
      name: asset.name || id,
      group: asset.group,
      health: Math.max(1, num(asset.health, 30)),
      size: {
        w: Math.max(0.1, num(asset.size?.w, 1)),
        h: Math.max(0.1, num(asset.size?.h, 1)),
        d: Math.max(0.1, num(asset.size?.d, 1)),
      },
      protected: !!asset.protected,
      reward: !!asset.reward,
      surface: asset.surface,
      moveType: asset.moveType,
      pathType: asset.pathType,
      speed: Math.max(0, num(asset.speed, 0)),
      variants: [],
      parts: clone(asset.parts),
    };
    saveCustomAsset(def);
    setAsset(clone(def));
    setIsNew(false);
    setTick((t) => t + 1);
    setStatus(`Model „${id}" uložen a zaregistrován do katalogu.`);
  }

  function handleDelete() {
    if (!asset.id) return;
    deleteCustomAsset(asset.id);
    setTick((t) => t + 1);
    const rest = listCustomAssets();
    if (rest.length > 0) loadAsset(rest[0]);
    else newAsset();
    setStatus('Model smazán (z běžící hry zmizí po obnovení stránky).');
  }

  // --- Render ---------------------------------------------------------------

  return (
    <div>
      <Card
        title="Editor 3D modelů"
        subtitle={'Skladač primitiv s živým náhledem — custom assety se objeví ve spawnovacím poolu živého města (skupina dle pole „skupina").'}
        actions={
          <div className="flex items-center gap-2">
            <AdminButton onClick={newAsset}>Nový model</AdminButton>
            <AdminButton onClick={handleSave} tone="primary">Uložit</AdminButton>
            {!isNew && asset.id && (
              <AdminButton onClick={handleDelete} tone="danger">Smazat asset</AdminButton>
            )}
          </div>
        }
      >
        {status ? (
          <div className="text-[11px] text-emerald-300">{status}</div>
        ) : (
          <div className="text-[11px] text-white/40">
            Kotva modelu je u země (y = 0), čelo míří na +z. Bounding size určuje kolize a měřítko náhledu.
          </div>
        )}
      </Card>

      <div className="flex gap-4 items-start">
        {/* ---------------- Seznam custom assetů ---------------- */}
        <div className="w-56 flex-shrink-0">
          <Card title="Custom assety" subtitle={`${saved.length} uloženo`}>
            {saved.length === 0 && (
              <p className="text-[11px] text-white/40">Zatím žádné — ulož první model.</p>
            )}
            <div className="flex flex-col gap-1.5">
              {saved.map((def) => {
                const active = !isNew && def.id === asset.id;
                return (
                  <button
                    key={def.id}
                    onClick={() => loadAsset(def)}
                    className="text-left px-2.5 py-2 rounded-lg border text-xs"
                    style={{
                      background: active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: active ? '#10b981' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="font-bold">{def.name}</div>
                    <div className="text-[10px] text-white/40 font-mono">
                      {def.id} · {GROUP_OPTIONS.find(([g]) => g === def.group)?.[1] || def.group} · {def.parts?.length ?? 0} dílů
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ---------------- Živý náhled + vlastnosti assetu ---------------- */}
        <div className="flex-1 min-w-0">
          <Card title="Živý náhled" subtitle="Otočný podstavec — vybraný díl svítí zeleně.">
            <div className="rounded-lg border border-white/10" style={{ height: 340, background: '#0d1320' }}>
              <ModelPreview parts={asset.parts} size={asset.size} selected={selPart} />
            </div>
          </Card>

          <Card title="Vlastnosti assetu" subtitle="Chování a odolnost ve hře.">
            <FieldRow label="Id" hint="slug — jen při vytvoření">
              {isNew ? (
                <TextField value={asset.id} placeholder="napr_socha_lva"
                  onChange={(v) => updateAsset((a) => { a.id = slugify(v); })} />
              ) : (
                <span className="text-xs font-mono text-white/60">{asset.id}</span>
              )}
            </FieldRow>
            <FieldRow label="Název">
              <TextField value={asset.name} onChange={(v) => updateAsset((a) => { a.name = v; })} />
            </FieldRow>
            <FieldRow label="Skupina" hint="spawnovací pool">
              <SelectField value={asset.group} options={GROUP_OPTIONS}
                onChange={(v) => updateAsset((a) => { a.group = v; })} />
            </FieldRow>
            <FieldRow label="Zdraví (HP)">
              <NumberField width="w-20" min={1} value={asset.health}
                onChange={(v) => updateAsset((a) => { a.health = Math.max(1, num(v, 30)); })} />
            </FieldRow>
            <FieldRow label="Chráněný" hint="za zabití penalizace">
              <Toggle value={!!asset.protected}
                onChange={(v) => updateAsset((a) => { a.protected = v; if (v) a.reward = false; })} />
            </FieldRow>
            <FieldRow label="Odměna" hint="za zničení padá odměna">
              <Toggle value={!!asset.reward}
                onChange={(v) => updateAsset((a) => { a.reward = v; if (v) a.protected = false; })} />
            </FieldRow>
            <FieldRow label="Povrch">
              <SelectField value={asset.surface} options={SURFACE_OPTIONS}
                onChange={(v) => updateAsset((a) => { a.surface = v; })} />
            </FieldRow>
            <FieldRow label="Pohyb">
              <SelectField value={asset.moveType} options={MOVE_OPTIONS}
                onChange={(v) => updateAsset((a) => { a.moveType = v; })} />
            </FieldRow>
            <FieldRow label="Trasa">
              <SelectField value={asset.pathType} options={PATH_OPTIONS}
                onChange={(v) => updateAsset((a) => { a.pathType = v; })} />
            </FieldRow>
            <FieldRow label="Rychlost" hint="m/s">
              <NumberField width="w-20" min={0} step={0.1} value={asset.speed}
                onChange={(v) => updateAsset((a) => { a.speed = Math.max(0, num(v, 0)); })} />
            </FieldRow>
            <FieldRow label="Bounding š/v/h" hint="kolizní box (m)">
              <div className="flex gap-1">
                {['w', 'h', 'd'].map((k) => (
                  <NumberField key={k} width="w-16" min={0.1} step={0.05} value={round3(asset.size?.[k] ?? 1)}
                    onChange={(v) => updateAsset((a) => { a.size[k] = Math.max(0.1, num(v, 1)); })} />
                ))}
              </div>
            </FieldRow>
          </Card>
        </div>

        {/* ---------------- Díly + inspektor dílu ---------------- */}
        <div className="w-80 flex-shrink-0">
          <Card
            title="Díly"
            subtitle={`${asset.parts.length} primitiv`}
            actions={<AdminButton onClick={addPart} tone="primary">＋ Díl</AdminButton>}
          >
            <div className="flex flex-col gap-1 mb-1 max-h-44 overflow-y-auto">
              {asset.parts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelPart(i)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs text-left"
                  style={{
                    background: i === selPart ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                    borderColor: i === selPart ? '#10b981' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="inline-block w-3 h-3 rounded-sm border border-white/20" style={{ background: p.color || '#cccccc' }} />
                  <span className="font-bold">{i + 1}. {SHAPE_LABEL[p.shape] || 'Kvádr'}</span>
                  {p.emissive && <span className="text-[9px] text-amber-300">svítí</span>}
                </button>
              ))}
            </div>
          </Card>

          {part && (
            <Card
              title={`Díl #${selPart + 1} — ${SHAPE_LABEL[part.shape] || 'Kvádr'}`}
              actions={
                <div className="flex items-center gap-2">
                  <AdminButton onClick={duplicatePart}>Duplikovat</AdminButton>
                  <AdminButton onClick={deletePart} tone="danger">Smazat díl</AdminButton>
                </div>
              }
            >
              <FieldRow label="Tvar">
                <SelectField
                  value={part.shape || 'box'}
                  options={SHAPE_OPTIONS}
                  onChange={(v) => updatePart((p) => {
                    p.shape = v;
                    p.args = SHAPE_ARGS[v].map(([, def]) => def);
                  })}
                />
              </FieldRow>
              <VecRow label="Pozice" hint="x / y / z (m)" step={0.05} value={part.pos}
                onChange={(i, v) => updatePart((p) => { p.pos[i] = v; })} />
              <VecRow label="Rotace" hint="rad" step={0.1} value={part.rot}
                onChange={(i, v) => updatePart((p) => { p.rot[i] = v; })} />
              <VecRow label="Měřítko" step={0.05} value={part.scale}
                onChange={(i, v) => updatePart((p) => { p.scale[i] = v; })} />
              {(SHAPE_ARGS[part.shape] || SHAPE_ARGS.box).map(([label, def], i) => (
                <FieldRow key={`${part.shape}_${label}`} label={label}>
                  <NumberField width="w-20" step={0.05} min={0.01} value={round3(part.args?.[i] ?? def)}
                    onChange={(v) => updatePart((p) => {
                      if (!Array.isArray(p.args)) p.args = SHAPE_ARGS[p.shape || 'box'].map(([, d]) => d);
                      p.args[i] = Math.max(0.01, num(v, def));
                    })} />
                </FieldRow>
              ))}
              <FieldRow label="Barva">
                <ColorField value={part.color} onChange={(v) => updatePart((p) => { p.color = v; })} />
              </FieldRow>
              <FieldRow label="Svítí (emissive)">
                <Toggle value={!!part.emissive}
                  onChange={(v) => updatePart((p) => {
                    if (v) p.emissive = p.color || '#ffcc55';
                    else delete p.emissive;
                  })} />
              </FieldRow>
              {part.emissive && (
                <FieldRow label="Barva záře">
                  <ColorField value={part.emissive} onChange={(v) => updatePart((p) => { p.emissive = v; })} />
                </FieldRow>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
