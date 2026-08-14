import { useMemo, useRef, useState } from 'react';
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
import { saveCustomMap, deleteCustomMap, listCustomMaps } from '@/admin/overrides.js';
import { MAPS } from '@/data/maps/index.js';

// ============================================================================
// EDITOR MAP — 2D builder ve stylu Tiled: vrstvy mapy se kreslí a upravují
// na středovém plátně (1 px mřížka = 1 m světa), inspektor edituje vybraný
// prvek, uložení zapíše mapu jako override (custom mapa v lobby).
// ============================================================================

const CANVAS_W = 640;
const CANVAS_H = 480;

const clone = (o) => JSON.parse(JSON.stringify(o));
const snap = (v) => Math.round(v * 2) / 2;
const num = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const round3 = (v) => Math.round(num(v) * 1000) / 1000;

function slugify(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

// --- Popis vrstev -----------------------------------------------------------
// kind: 'rect' (pos/size objekt), 'strip' (plochý {x,z,w,d}), 'point'
// sub: pole leží v map.surfaces
const LAYER_META = {
  buildings: { label: 'Budova', kind: 'rect' },
  obstacles: { label: 'Překážka', kind: 'rect' },
  roads: { label: 'Silnice', kind: 'strip', sub: true },
  sidewalks: { label: 'Chodník', kind: 'strip', sub: true },
  rails: { label: 'Koleje', kind: 'strip', sub: true },
  paths: { label: 'Pěšina', kind: 'strip', sub: true },
  crosswalks: { label: 'Přechod', kind: 'strip', sub: true, axis: true },
  parkingLots: { label: 'Parkoviště', kind: 'strip', axis: true },
  trees: { label: 'Strom', kind: 'point' },
  benches: { label: 'Lavička', kind: 'point' },
  lamps: { label: 'Lampa', kind: 'point' },
  botSpawns: { label: 'Bot spawn', kind: 'point' },
  pickupSpots: { label: 'Pickup', kind: 'point' },
};

// Nástroje toolbaru → cílová vrstva
const TOOLS = [
  { id: 'select', label: 'Vybrat / posunout', layer: null },
  { id: 'building', label: 'Budova', layer: 'buildings', draw: true },
  { id: 'obstacle', label: 'Překážka', layer: 'obstacles', draw: true },
  { id: 'road', label: 'Silnice', layer: 'roads', draw: true },
  { id: 'sidewalk', label: 'Chodník', layer: 'sidewalks', draw: true },
  { id: 'rail', label: 'Koleje', layer: 'rails', draw: true },
  { id: 'path', label: 'Pěšina', layer: 'paths', draw: true },
  { id: 'crosswalk', label: 'Přechod', layer: 'crosswalks', draw: true },
  { id: 'parking', label: 'Parkoviště', layer: 'parkingLots', draw: true },
  { id: 'tree', label: 'Strom', layer: 'trees' },
  { id: 'bench', label: 'Lavička', layer: 'benches' },
  { id: 'lamp', label: 'Lampa', layer: 'lamps' },
  { id: 'spawn', label: 'Bot spawn', layer: 'botSpawns' },
  { id: 'pickup', label: 'Pickup', layer: 'pickupSpots' },
];

// Pořadí hit-testu — body mají přednost, pásy povrchů až naposled
const HIT_ORDER = [
  'trees', 'benches', 'lamps', 'botSpawns', 'pickupSpots',
  'obstacles', 'buildings', 'crosswalks', 'parkingLots', 'rails', 'paths', 'sidewalks', 'roads',
];

const STRIP_COLORS = {
  roads: '#343943',
  sidewalks: '#847e6e',
  rails: '#6a5544',
  paths: '#a08a5e',
  crosswalks: '#aeb4bc',
  parkingLots: '#40495a',
};

const DEFAULT_PALETTE = {
  sky: '#4a7ab8', fog: '#3a5a8a',
  buildingA: '#d4a86a', buildingB: '#c4856a', buildingC: '#a8b88a',
  buildingD: '#b8986a', buildingE: '#c8a878', buildingF: '#9ab8a0',
  monument: '#a8a8a8', wall: '#5a4a3a', crate: '#8a6a3a',
  tree: '#3a7a2a', trunk: '#4a2a1a', roof: '#7a2a1a',
};

const BUILDING_KEYS = ['buildingA', 'buildingB', 'buildingC', 'buildingD', 'buildingE', 'buildingF'];

// --- Přístup k datům vrstev -------------------------------------------------

function getArr(m, layer) {
  return LAYER_META[layer].sub ? m.surfaces[layer] : m[layer];
}

// Půdorysná geometrie prvku (pro render, hit-test i validaci)
function elemGeom(layer, el) {
  switch (layer) {
    case 'buildings':
    case 'obstacles':
      return { x: el.pos[0], z: el.pos[2], w: el.size[0], d: el.size[2] };
    case 'trees':
      return { x: el.pos[0], z: el.pos[2] };
    case 'benches':
    case 'lamps':
      return { x: el[0], z: el[1] };
    case 'botSpawns':
    case 'pickupSpots':
      return { x: el[0], z: el[2] };
    default:
      return { x: el.x, z: el.z, w: el.w, d: el.d };
  }
}

function moveElem(layer, el, x, z) {
  switch (layer) {
    case 'buildings':
    case 'obstacles':
    case 'trees':
      el.pos[0] = x;
      el.pos[2] = z;
      break;
    case 'benches':
    case 'lamps':
      el[0] = x;
      el[1] = z;
      break;
    case 'botSpawns':
    case 'pickupSpots':
      el[0] = x;
      el[2] = z;
      break;
    default:
      el.x = x;
      el.z = z;
  }
}

// --- Normalizace / generování map ------------------------------------------

// Pracovní kopie mapy: doplní chybějící pole, střechy zahodí (odvozují se).
function normalizeMap(src) {
  const m = clone(src);
  m.arena = m.arena || { width: 40, depth: 30 };
  m.palette = { ...DEFAULT_PALETTE, ...(m.palette || {}) };
  m.centerpiece = m.centerpiece || 'fountain';
  m.buildings = m.buildings || [];
  m.obstacles = m.obstacles || [];
  m.trees = m.trees || [];
  m.benches = m.benches || [];
  m.lamps = m.lamps || [];
  m.botSpawns = m.botSpawns || [];
  m.pickupSpots = m.pickupSpots || [];
  m.parkingLots = m.parkingLots || [];
  m.surfaces = m.surfaces || {};
  for (const key of ['roads', 'sidewalks', 'rails', 'paths', 'crosswalks']) {
    m.surfaces[key] = m.surfaces[key] || [];
  }
  m.assetDefaults = { static: 10, vehicle: 4, pedestrian: 8, animal: 5, ...(m.assetDefaults || {}) };
  delete m.roofs;
  return m;
}

// Střechy — stejné odvození jako v datech map (praha.js)
function buildRoofs(m) {
  return m.buildings.map((b) => ({
    pos: [b.pos[0], b.pos[1] + b.size[1] / 2 + 0.4, b.pos[2]],
    size: [b.size[0] + 0.4, 0.8, b.size[2] + 0.4],
    color: m.palette?.roof || DEFAULT_PALETTE.roof,
  }));
}

// Nová mapa — prázdná aréna s obvodovým rámem budov
function makeEmptyMap() {
  const width = 40;
  const depth = 30;
  const palette = { ...DEFAULT_PALETTE };
  const buildings = [];
  let ci = 0;
  const nextColor = () => palette[BUILDING_KEYS[ci++ % BUILDING_KEYS.length]];
  const hx = width / 2 - 1;
  const hz = depth / 2 - 1;
  for (let x = -width / 2 + 5; x <= width / 2 - 5 + 0.01; x += 10) {
    buildings.push({ pos: [snap(x), 4, -hz], size: [8, 8, 2], color: nextColor() });
    buildings.push({ pos: [snap(x), 4, hz], size: [8, 8, 2], color: nextColor() });
  }
  for (let z = -depth / 2 + 7; z <= depth / 2 - 7 + 0.01; z += 8) {
    buildings.push({ pos: [-hx, 4, snap(z)], size: [2, 8, 7], color: nextColor() });
    buildings.push({ pos: [hx, 4, snap(z)], size: [2, 8, 7], color: nextColor() });
  }
  return normalizeMap({
    id: '',
    name: 'Nová mapa',
    desc: '',
    palette,
    centerpiece: 'fountain',
    arena: { width, depth },
    buildings,
    obstacles: [],
    trees: [],
    benches: [],
    lamps: [],
    botSpawns: [[-10, 1, -10], [10, 1, -10], [-10, 1, 10], [10, 1, 10]],
    pickupSpots: [],
    surfaces: {},
    parkingLots: [],
  });
}

// --- Validace při uložení ---------------------------------------------------

function rectsOverlap(a, b, margin = 0.05) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 - margin &&
    Math.abs(a.z - b.z) < (a.d + b.d) / 2 - margin
  );
}

function validateMap(m) {
  const warnings = [];
  const hw = m.arena.width / 2;
  const hd = m.arena.depth / 2;
  for (const [layer, meta] of Object.entries(LAYER_META)) {
    getArr(m, layer).forEach((el, i) => {
      const g = elemGeom(layer, el);
      const ew = (g.w || 0) / 2;
      const ed = (g.d || 0) / 2;
      if (Math.abs(g.x) + ew > hw + 0.01 || Math.abs(g.z) + ed > hd + 0.01) {
        warnings.push(`${meta.label} #${i + 1} přesahuje arénu (${g.x}, ${g.z}).`);
      }
    });
  }
  const stripLayers = ['roads', 'sidewalks', 'rails', 'paths', 'crosswalks', 'parkingLots'];
  m.buildings.forEach((b, i) => {
    const bg = elemGeom('buildings', b);
    for (const layer of stripLayers) {
      getArr(m, layer).forEach((s, j) => {
        if (rectsOverlap(bg, elemGeom(layer, s))) {
          warnings.push(`Budova #${i + 1} se kříží s vrstvou ${LAYER_META[layer].label} #${j + 1}.`);
        }
      });
    }
  });
  return warnings;
}

// ============================================================================
// Komponenta
// ============================================================================

export default function MapEditorSection() {
  const [map, setMap] = useState(() => normalizeMap(MAPS[0]));
  const [tool, setTool] = useState('select');
  const [selection, setSelection] = useState(null); // { layer, index }
  const [drawRect, setDrawRect] = useState(null); // { x0, z0, x1, z1 }
  const [status, setStatus] = useState(null); // { text, warnings }
  const [customTick, setCustomTick] = useState(0);
  const dragRef = useRef(null);
  const svgRef = useRef(null);
  const fileRef = useRef(null);

  const customs = useMemo(() => listCustomMaps(), [customTick]);
  const customIds = useMemo(() => new Set(customs.map((c) => c.id)), [customs]);

  // Výběr map: výchozí registr + custom mapy (custom verze má přednost)
  const mapChoices = useMemo(() => {
    const byId = new Map();
    for (const m of MAPS) byId.set(m.id, m);
    for (const c of customs) byId.set(c.id, c);
    return [...byId.values()];
  }, [customs]);

  const scale = Math.min(CANVAS_W / (map.arena.width + 4), CANVAS_H / (map.arena.depth + 4));
  const toSX = (x) => CANVAS_W / 2 + x * scale;
  const toSZ = (z) => CANVAS_H / 2 + z * scale;

  const selectedEl =
    selection && getArr(map, selection.layer)[selection.index] !== undefined
      ? getArr(map, selection.layer)[selection.index]
      : null;

  // --- Mutace stavu ---------------------------------------------------------

  function updateMap(mutator) {
    setMap((prev) => {
      const next = clone(prev);
      mutator(next);
      return next;
    });
  }

  function updateSelected(mutator) {
    if (!selection) return;
    updateMap((m) => {
      const el = getArr(m, selection.layer)[selection.index];
      if (el !== undefined) mutator(el, m);
    });
  }

  function deleteSelected() {
    if (!selection) return;
    updateMap((m) => getArr(m, selection.layer).splice(selection.index, 1));
    setSelection(null);
  }

  function loadMap(source) {
    setMap(normalizeMap(source));
    setSelection(null);
    setDrawRect(null);
    setStatus(null);
  }

  // --- Souřadnice a hit-test ------------------------------------------------

  function evtWorld(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) * CANVAS_W) / rect.width;
    const sy = ((e.clientY - rect.top) * CANVAS_H) / rect.height;
    return { x: snap((sx - CANVAS_W / 2) / scale), z: snap((sy - CANVAS_H / 2) / scale) };
  }

  function hitTest(x, z) {
    for (const layer of HIT_ORDER) {
      const arr = getArr(map, layer);
      for (let i = arr.length - 1; i >= 0; i--) {
        const g = elemGeom(layer, arr[i]);
        if (LAYER_META[layer].kind === 'point') {
          if (Math.hypot(g.x - x, g.z - z) <= 0.9) return { layer, index: i };
        } else if (Math.abs(x - g.x) <= g.w / 2 && Math.abs(z - g.z) <= g.d / 2) {
          return { layer, index: i };
        }
      }
    }
    return null;
  }

  // --- Vytváření prvků ------------------------------------------------------

  function createPoint(toolId, x, z) {
    updateMap((m) => {
      if (toolId === 'tree') m.trees.push({ pos: [x, 0, z] });
      else if (toolId === 'bench') m.benches.push([x, z]);
      else if (toolId === 'lamp') m.lamps.push([x, z]);
      else if (toolId === 'spawn') m.botSpawns.push([x, 1, z]);
      else if (toolId === 'pickup') m.pickupSpots.push([x, 1, z]);
    });
    const layer = TOOLS.find((t) => t.id === toolId).layer;
    setSelection({ layer, index: getArr(map, layer).length }); // délka před push = nový index
  }

  function createRect(toolId, r) {
    const x = round3((r.x0 + r.x1) / 2);
    const z = round3((r.z0 + r.z1) / 2);
    const w = round3(Math.abs(r.x1 - r.x0));
    const d = round3(Math.abs(r.z1 - r.z0));
    if (w < 0.5 || d < 0.5) return;
    const layer = TOOLS.find((t) => t.id === toolId).layer;
    updateMap((m) => {
      if (toolId === 'building') {
        const color = m.palette[BUILDING_KEYS[m.buildings.length % BUILDING_KEYS.length]];
        m.buildings.push({ pos: [x, 4, z], size: [w, 8, d], color });
      } else if (toolId === 'obstacle') {
        m.obstacles.push({ pos: [x, 0.5, z], size: [w, 1, d], color: m.palette.crate });
      } else if (toolId === 'crosswalk') {
        m.surfaces.crosswalks.push({ x, z, w, d, axis: d >= w ? 'z' : 'x' });
      } else if (toolId === 'parking') {
        m.parkingLots.push({ x, z, w, d, axis: d > w ? 'z' : 'x' });
      } else {
        getArr(m, layer).push({ x, z, w, d });
      }
    });
    setSelection({ layer, index: getArr(map, layer).length });
  }

  // --- Myš na plátně --------------------------------------------------------

  function onMouseDown(e) {
    const { x, z } = evtWorld(e);
    const toolDef = TOOLS.find((t) => t.id === tool);
    if (tool === 'select') {
      const hit = hitTest(x, z);
      setSelection(hit);
      if (hit) {
        const g = elemGeom(hit.layer, getArr(map, hit.layer)[hit.index]);
        dragRef.current = { mode: 'move', ...hit, offX: g.x - x, offZ: g.z - z };
      }
    } else if (toolDef?.draw) {
      dragRef.current = { mode: 'draw', x0: x, z0: z };
      setDrawRect({ x0: x, z0: z, x1: x, z1: z });
    } else if (toolDef) {
      createPoint(tool, x, z);
    }
  }

  function onMouseMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, z } = evtWorld(e);
    if (drag.mode === 'draw') {
      setDrawRect({ x0: drag.x0, z0: drag.z0, x1: x, z1: z });
    } else if (drag.mode === 'move') {
      setMap((prev) => {
        const next = clone(prev);
        const el = getArr(next, drag.layer)[drag.index];
        if (el !== undefined) moveElem(drag.layer, el, snap(x + drag.offX), snap(z + drag.offZ));
        return next;
      });
    }
  }

  function onMouseUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === 'draw' && drawRect) createRect(tool, drawRect);
    setDrawRect(null);
  }

  // --- Uložit / smazat / export / import ------------------------------------

  function handleSave() {
    const id = (map.id || '').trim() || `custom_${slugify(map.name) || 'mapa'}`;
    const existed = customIds.has(id) || MAPS.some((m) => m.id === id);
    const out = clone(map);
    out.id = id;
    out.name = map.name || id;
    out.roofs = buildRoofs(out);
    const warnings = validateMap(out);
    saveCustomMap(out);
    setMap(normalizeMap(out));
    setCustomTick((t) => t + 1);
    setStatus({
      text: `Mapa uložena jako „${id}" — v lobby ${existed ? 'přepíše stávající výběr' : 'přibude do výběru'}.`,
      warnings,
    });
  }

  function handleDelete() {
    if (!customIds.has(map.id)) return;
    deleteCustomMap(map.id);
    setCustomTick((t) => t + 1);
    loadMap(MAPS[0]);
    setStatus({ text: 'Custom mapa smazána (původní výchozí data se plně vrátí po obnovení stránky).', warnings: [] });
  }

  function handleExport() {
    const out = clone(map);
    out.id = (map.id || '').trim() || `custom_${slugify(map.name) || 'mapa'}`;
    out.roofs = buildRoofs(out);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${out.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !Array.isArray(data.buildings)) {
          throw new Error('chybí pole buildings');
        }
        loadMap(data);
        setStatus({ text: `Mapa „${data.name || data.id || file.name}" načtena z JSON.`, warnings: [] });
      } catch (err) {
        setStatus({ text: `Import selhal: ${err.message}`, warnings: [] });
      }
    };
    reader.readAsText(file);
  }

  // --- Render plátna --------------------------------------------------------

  function renderStrip(layer, el, i) {
    const g = elemGeom(layer, el);
    const px = toSX(g.x - g.w / 2);
    const pz = toSZ(g.z - g.d / 2);
    const pw = g.w * scale;
    const pd = g.d * scale;
    const key = `${layer}_${i}`;
    const base = (
      <rect
        x={px} y={pz} width={pw} height={pd}
        fill={STRIP_COLORS[layer]}
        stroke={layer === 'parkingLots' ? '#c8d2e0' : 'none'}
        strokeWidth={layer === 'parkingLots' ? 1 : 0}
        strokeDasharray={layer === 'parkingLots' ? '4 3' : undefined}
      />
    );
    const extras = [];
    if (layer === 'rails') {
      const horiz = g.w >= g.d;
      for (const off of [-0.3, 0.3]) {
        extras.push(
          <line
            key={off}
            x1={horiz ? px : toSX(g.x + off)} y1={horiz ? toSZ(g.z + off) : pz}
            x2={horiz ? px + pw : toSX(g.x + off)} y2={horiz ? toSZ(g.z + off) : pz + pd}
            stroke="#3a2c20" strokeWidth={1.5}
          />
        );
      }
    }
    if (layer === 'crosswalks') {
      // zebra: pruhy se opakují podél osy chůze (axis)
      const alongX = el.axis === 'x';
      const span = alongX ? g.w : g.d;
      for (let off = -span / 2 + 0.4; off < span / 2 - 0.15; off += 0.8) {
        extras.push(
          <rect
            key={off}
            x={alongX ? toSX(g.x + off - 0.2) : px + 1}
            y={alongX ? pz + 1 : toSZ(g.z + off - 0.2)}
            width={alongX ? 0.4 * scale : pw - 2}
            height={alongX ? pd - 2 : 0.4 * scale}
            fill="#f0f2f4"
          />
        );
      }
    }
    return <g key={key}>{base}{extras}</g>;
  }

  const stripLayersRender = ['roads', 'sidewalks', 'rails', 'paths', 'crosswalks', 'parkingLots'];
  const gridLines = [];
  {
    const hw = map.arena.width / 2;
    const hd = map.arena.depth / 2;
    for (let x = -Math.floor(hw); x <= Math.floor(hw); x++) {
      gridLines.push(
        <line key={`gx${x}`} x1={toSX(x)} y1={toSZ(-hd)} x2={toSX(x)} y2={toSZ(hd)}
          stroke={x === 0 ? '#3d4d68' : x % 5 === 0 ? '#28344a' : '#1e2738'} strokeWidth={1} />
      );
    }
    for (let z = -Math.floor(hd); z <= Math.floor(hd); z++) {
      gridLines.push(
        <line key={`gz${z}`} x1={toSX(-hw)} y1={toSZ(z)} x2={toSX(hw)} y2={toSZ(z)}
          stroke={z === 0 ? '#3d4d68' : z % 5 === 0 ? '#28344a' : '#1e2738'} strokeWidth={1} />
      );
    }
  }

  const selGeom = selectedEl ? elemGeom(selection.layer, selectedEl) : null;
  const meta = selection ? LAYER_META[selection.layer] : null;

  return (
    <div>
      {/* ---------------- Horní lišta ---------------- */}
      <Card
        title="Editor map"
        subtitle="2D builder — vyber mapu jako předlohu, kresli vrstvy, ulož jako custom mapu do lobby."
        actions={
          <div className="flex items-center gap-2">
            <AdminButton onClick={() => loadMap(makeEmptyMap())}>Nová mapa</AdminButton>
            <AdminButton onClick={handleSave} tone="primary">Uložit</AdminButton>
            {customIds.has(map.id) && (
              <AdminButton onClick={handleDelete} tone="danger">Smazat custom</AdminButton>
            )}
            <AdminButton onClick={handleExport}>Export JSON</AdminButton>
            <AdminButton onClick={() => fileRef.current?.click()}>Import JSON</AdminButton>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
          </div>
        }
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-white/80">Předloha / mapa</span>
          <SelectField
            width="w-64"
            value={map.id}
            onChange={(id) => {
              const src = mapChoices.find((m) => m.id === id);
              if (src) loadMap(src);
            }}
            options={[
              ...(map.id === '' ? [['', '— nová mapa (neuloženo) —']] : []),
              ...mapChoices.map((m) => [m.id, `${m.name}${customIds.has(m.id) ? ' (custom)' : ''}`]),
            ]}
          />
          <span className="text-[10px] text-white/35">
            Načtení jiné mapy zahodí neuložené změny. Uložení výchozí mapy ji přepíše ve výběru v lobby, nová mapa dostane id custom_&lt;slug&gt;.
          </span>
        </div>
        {status && (
          <div className="mt-3 text-[11px]">
            <div className="text-emerald-300">{status.text}</div>
            {status.warnings?.length > 0 && (
              <ul className="mt-1 text-amber-300/90 list-disc list-inside">
                {status.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                {status.warnings.length > 8 && <li>… a dalších {status.warnings.length - 8} varování</li>}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div className="flex gap-4 items-start">
        {/* ---------------- Plátno + nástroje ---------------- */}
        <div className="flex-1 min-w-0">
          <Card title="Plátno" subtitle="Mřížka 1 m, souřadnice od středu arény. Krok přichytávání 0,5 m.">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                  style={{
                    background: tool === t.id ? '#10b981' : 'rgba(255,255,255,0.06)',
                    borderColor: tool === t.id ? '#10b981' : 'rgba(255,255,255,0.12)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div
              tabIndex={0}
              className="outline-none"
              onKeyDown={(e) => {
                if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
                  e.preventDefault();
                  deleteSelected();
                }
              }}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                className="w-full rounded-lg border border-white/10 select-none"
                style={{ background: '#101623', maxWidth: CANVAS_W, cursor: tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              >
                {/* podklad arény + mřížka */}
                <rect
                  x={toSX(-map.arena.width / 2)} y={toSZ(-map.arena.depth / 2)}
                  width={map.arena.width * scale} height={map.arena.depth * scale}
                  fill="#18202f" stroke="#46536e" strokeWidth={1.5}
                />
                {gridLines}

                {/* povrchy */}
                {stripLayersRender.map((layer) => getArr(map, layer).map((el, i) => renderStrip(layer, el, i)))}

                {/* volné zóny (střed + kašna + zadní zóna) — čárkovaně */}
                {[[0, 0, 4], [0, 6, 3], [0, 10, 3]].map(([zx, zz, zr], i) => (
                  <circle key={i} cx={toSX(zx)} cy={toSZ(zz)} r={zr * scale}
                    fill="none" stroke="#5eead4" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="5 4" />
                ))}

                {/* budovy (obchod = pruh markýzy) */}
                {map.buildings.map((b, i) => {
                  const g = elemGeom('buildings', b);
                  return (
                    <g key={`b${i}`}>
                      <rect x={toSX(g.x - g.w / 2)} y={toSZ(g.z - g.d / 2)} width={g.w * scale} height={g.d * scale}
                        fill={b.color} stroke="#151a24" strokeWidth={2} />
                      {b.shop && (
                        <rect x={toSX(g.x - g.w / 2) + 2} y={toSZ(g.z) - 0.18 * g.d * scale}
                          width={g.w * scale - 4} height={0.36 * g.d * scale}
                          fill={b.shop.awning || '#b3342e'} stroke={b.shop.sign || '#e0c23c'} strokeWidth={1.5} />
                      )}
                    </g>
                  );
                })}

                {/* překážky */}
                {map.obstacles.map((o, i) => {
                  const g = elemGeom('obstacles', o);
                  return (
                    <rect key={`o${i}`} x={toSX(g.x - g.w / 2)} y={toSZ(g.z - g.d / 2)}
                      width={g.w * scale} height={g.d * scale}
                      fill={o.color} stroke="#20242e" strokeWidth={1.2} />
                  );
                })}

                {/* stromy, lavičky, lampy, spawny, pickupy */}
                {map.trees.map((t, i) => (
                  <g key={`t${i}`}>
                    <circle cx={toSX(t.pos[0])} cy={toSZ(t.pos[2])} r={0.85 * scale} fill="#3a7a2a" stroke="#265218" strokeWidth={1.5} />
                    <circle cx={toSX(t.pos[0])} cy={toSZ(t.pos[2])} r={2} fill="#4a2a1a" />
                  </g>
                ))}
                {map.benches.map((b, i) => (
                  <rect key={`bn${i}`} x={toSX(b[0]) - 0.45 * scale} y={toSZ(b[1]) - 0.2 * scale}
                    width={0.9 * scale} height={0.4 * scale} fill="#8a6238" stroke="#4a3018" strokeWidth={1} rx={1.5} />
                ))}
                {map.lamps.map((l, i) => (
                  <circle key={`lp${i}`} cx={toSX(l[0])} cy={toSZ(l[1])} r={3.2} fill="#ffd24a" stroke="#8a6a10" strokeWidth={1} />
                ))}
                {map.botSpawns.map((s, i) => {
                  const cx = toSX(s[0]);
                  const cz = toSZ(s[2]);
                  return (
                    <g key={`sp${i}`} stroke="#f05050" strokeWidth={2}>
                      <line x1={cx - 4} y1={cz - 4} x2={cx + 4} y2={cz + 4} />
                      <line x1={cx - 4} y1={cz + 4} x2={cx + 4} y2={cz - 4} />
                    </g>
                  );
                })}
                {map.pickupSpots.map((p, i) => {
                  const cx = toSX(p[0]);
                  const cz = toSZ(p[2]);
                  return (
                    <g key={`pk${i}`} stroke="#34d399" strokeWidth={2.4}>
                      <line x1={cx - 4.5} y1={cz} x2={cx + 4.5} y2={cz} />
                      <line x1={cx} y1={cz - 4.5} x2={cx} y2={cz + 4.5} />
                    </g>
                  );
                })}

                {/* zvýraznění výběru */}
                {selGeom && (
                  meta.kind === 'point' ? (
                    <circle cx={toSX(selGeom.x)} cy={toSZ(selGeom.z)} r={0.9 * scale}
                      fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" />
                  ) : (
                    <rect
                      x={toSX(selGeom.x - selGeom.w / 2) - 2} y={toSZ(selGeom.z - selGeom.d / 2) - 2}
                      width={selGeom.w * scale + 4} height={selGeom.d * scale + 4}
                      fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="5 3"
                    />
                  )
                )}

                {/* náhled kresleného obdélníku */}
                {drawRect && (
                  <rect
                    x={toSX(Math.min(drawRect.x0, drawRect.x1))}
                    y={toSZ(Math.min(drawRect.z0, drawRect.z1))}
                    width={Math.abs(drawRect.x1 - drawRect.x0) * scale}
                    height={Math.abs(drawRect.z1 - drawRect.z0) * scale}
                    fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 3"
                  />
                )}
              </svg>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-white/40">
              {[
                ['#343943', 'silnice'], ['#847e6e', 'chodník'], ['#6a5544', 'koleje'], ['#a08a5e', 'pěšina'],
                ['#aeb4bc', 'přechod'], ['#40495a', 'parkoviště'], ['#3a7a2a', 'strom'], ['#ffd24a', 'lampa'],
                ['#f05050', 'bot spawn ×'], ['#34d399', 'pickup +'], ['#5eead4', 'volné zóny (čárkovaně)'],
              ].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* ---------------- Inspektor + vlastnosti mapy ---------------- */}
        <div className="w-80 flex-shrink-0">
          <Card
            title={selectedEl ? `Inspektor — ${meta.label} #${selection.index + 1}` : 'Inspektor'}
            subtitle={selectedEl ? 'Úprava vybraného prvku.' : 'Klikni na prvek nástrojem „Vybrat / posunout".'}
            actions={selectedEl && <AdminButton onClick={deleteSelected} tone="danger">Smazat</AdminButton>}
          >
            {!selectedEl && (
              <p className="text-[11px] text-white/40">
                Drag prvkem posouvá, klávesa Delete maže. Kreslicí nástroje táhnutím vytvoří obdélník, umisťovací kliknutím bod.
              </p>
            )}
            {selectedEl && (
              <div>
                <FieldRow label="Pozice X / Z">
                  <div className="flex gap-1">
                    <NumberField width="w-20" step={0.5} value={round3(selGeom.x)}
                      onChange={(v) => updateSelected((el) => moveElem(selection.layer, el, num(v), elemGeom(selection.layer, el).z))} />
                    <NumberField width="w-20" step={0.5} value={round3(selGeom.z)}
                      onChange={(v) => updateSelected((el) => moveElem(selection.layer, el, elemGeom(selection.layer, el).x, num(v)))} />
                  </div>
                </FieldRow>

                {meta.kind === 'rect' && (
                  <>
                    <FieldRow label="Šířka / hloubka" hint="půdorys (m)">
                      <div className="flex gap-1">
                        <NumberField width="w-20" step={0.5} min={0.5} value={round3(selectedEl.size[0])}
                          onChange={(v) => updateSelected((el) => { el.size[0] = Math.max(0.5, num(v, 0.5)); })} />
                        <NumberField width="w-20" step={0.5} min={0.5} value={round3(selectedEl.size[2])}
                          onChange={(v) => updateSelected((el) => { el.size[2] = Math.max(0.5, num(v, 0.5)); })} />
                      </div>
                    </FieldRow>
                    <FieldRow label="Výška" hint={selection.layer === 'buildings' ? 'y středu se dopočítá' : 'výška tělesa'}>
                      <NumberField width="w-20" step={0.5} min={0.5} value={round3(selectedEl.size[1])}
                        onChange={(v) => updateSelected((el) => {
                          el.size[1] = Math.max(0.5, num(v, 1));
                          if (selection.layer === 'buildings') el.pos[1] = el.size[1] / 2;
                        })} />
                    </FieldRow>
                    {selection.layer === 'obstacles' && (
                      <FieldRow label="Y uložení" hint="střed tělesa (stohování)">
                        <NumberField width="w-20" step={0.25} value={round3(selectedEl.pos[1])}
                          onChange={(v) => updateSelected((el) => { el.pos[1] = num(v, 0.5); })} />
                      </FieldRow>
                    )}
                    <FieldRow label="Barva">
                      <ColorField value={selectedEl.color} onChange={(v) => updateSelected((el) => { el.color = v; })} />
                    </FieldRow>
                    {selection.layer === 'buildings' && (
                      <>
                        <FieldRow label="Obchod" hint="markýza + vývěsní štít">
                          <Toggle value={!!selectedEl.shop}
                            onChange={(v) => updateSelected((el) => {
                              if (v) el.shop = { awning: '#b3342e', sign: '#e0c23c' };
                              else delete el.shop;
                            })} />
                        </FieldRow>
                        {selectedEl.shop && (
                          <>
                            <FieldRow label="Markýza">
                              <ColorField value={selectedEl.shop.awning} onChange={(v) => updateSelected((el) => { el.shop.awning = v; })} />
                            </FieldRow>
                            <FieldRow label="Štít">
                              <ColorField value={selectedEl.shop.sign} onChange={(v) => updateSelected((el) => { el.shop.sign = v; })} />
                            </FieldRow>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {meta.kind === 'strip' && (
                  <>
                    <FieldRow label="Šířka / hloubka" hint="rozměr pásu (m)">
                      <div className="flex gap-1">
                        <NumberField width="w-20" step={0.25} min={0.5} value={round3(selectedEl.w)}
                          onChange={(v) => updateSelected((el) => { el.w = Math.max(0.5, num(v, 1)); })} />
                        <NumberField width="w-20" step={0.25} min={0.5} value={round3(selectedEl.d)}
                          onChange={(v) => updateSelected((el) => { el.d = Math.max(0.5, num(v, 1)); })} />
                      </div>
                    </FieldRow>
                    {meta.axis && (
                      <FieldRow label="Osa" hint={selection.layer === 'crosswalks' ? 'směr chůze' : 'směr řady aut'}>
                        <SelectField width="w-24" value={selectedEl.axis}
                          options={[['x', 'osa X'], ['z', 'osa Z']]}
                          onChange={(v) => updateSelected((el) => { el.axis = v; })} />
                      </FieldRow>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          <Card title="Vlastnosti mapy">
            <FieldRow label="Název">
              <TextField value={map.name} onChange={(v) => updateMap((m) => { m.name = v; })} />
            </FieldRow>
            <FieldRow label="Popis">
              <TextField value={map.desc} onChange={(v) => updateMap((m) => { m.desc = v; })} />
            </FieldRow>
            <FieldRow label="Aréna š × h" hint="20–100 m">
              <div className="flex gap-1">
                <NumberField width="w-20" min={20} max={100} value={map.arena.width}
                  onChange={(v) => updateMap((m) => { m.arena.width = Math.min(100, Math.max(20, num(v, 40))); })} />
                <NumberField width="w-20" min={20} max={100} value={map.arena.depth}
                  onChange={(v) => updateMap((m) => { m.arena.depth = Math.min(100, Math.max(20, num(v, 30))); })} />
              </div>
            </FieldRow>
            <FieldRow label="Dominanta" hint="střed náměstí">
              <SelectField
                value={map.centerpiece}
                onChange={(v) => updateMap((m) => { m.centerpiece = v; })}
                options={[['fountain', 'Kašna'], ['plagueColumn', 'Morový sloup'], ['miningTower', 'Těžní věž']]}
              />
            </FieldRow>
            <div className="text-xs font-bold text-white/80 mt-2 mb-1">Výchozí počty assetů</div>
            {[['static', 'Statika'], ['vehicle', 'Vozidla'], ['pedestrian', 'Chodci'], ['animal', 'Zvířata']].map(([key, label]) => (
              <FieldRow key={key} label={label}>
                <NumberField width="w-20" min={0} max={40} value={map.assetDefaults[key]}
                  onChange={(v) => updateMap((m) => { m.assetDefaults[key] = Math.max(0, Math.round(num(v, 0))); })} />
              </FieldRow>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
