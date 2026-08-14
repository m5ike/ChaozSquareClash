import { useMemo, useState } from 'react';
import { CHARACTERS } from '@/data/characters.js';
import { ASSET_TYPES } from '@/data/assetsCatalog.js';
import { MAPS } from '@/data/maps/index.js';
import { MODES } from '@/game/modes.js';
import {
  getOverrides,
  exportProject,
  importProject,
  resetAll,
  listCustomMaps,
  listCustomAssets,
} from '@/admin/overrides.js';
import { Card, AdminButton, FieldRow } from '@/pages/admin/ui.jsx';

// Přehled projektu + export/import celé konfigurace a reset overrides.
export default function DashboardSection() {
  const [message, setMessage] = useState(null);
  const overrides = getOverrides();
  const stats = useMemo(
    () => [
      ['Postavy', CHARACTERS.length],
      ['Typy assetů', Object.keys(ASSET_TYPES).length],
      ['Mapy', MAPS.length],
      ['Herní módy', MODES.length],
      ['Custom mapy', listCustomMaps().length],
      ['Custom assety', listCustomAssets().length],
      ['Upravené sekce', Object.keys(overrides).length],
    ],
    [overrides]
  );

  const handleExport = () => {
    const blob = new Blob([exportProject()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `namesti-chaosu-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('✅ Konfigurace exportována');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        importProject(text);
        setMessage('✅ Konfigurace importována a aplikována');
      } catch (error) {
        setMessage(`❌ Import selhal: ${error.message}`);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (!window.confirm('Opravdu smazat VŠECHNY administrátorské úpravy a vrátit výchozí konfiguraci?')) return;
    resetAll();
    setMessage('↩️ Overrides smazány — obnov stránku (F5) pro návrat k výchozím hodnotám');
  };

  return (
    <>
      <Card title="Stav projektu" subtitle="Rychlý přehled obsahu hry a rozsahu úprav">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg p-3 text-center border border-white/10" style={{ background: '#0d1117' }}>
              <div className="text-2xl font-black text-emerald-400">{value}</div>
              <div className="text-[10px] text-white/50 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Konfigurace projektu"
        subtitle="Export/import všech úprav (JSON) a návrat k výchozímu stavu"
      >
        <FieldRow label="Export celé konfigurace" hint="Stáhne JSON se všemi overrides, custom mapami a assety">
          <AdminButton tone="primary" onClick={handleExport}>⬇ Exportovat</AdminButton>
        </FieldRow>
        <FieldRow label="Import konfigurace" hint="Načte dřív exportovaný JSON a hned ho aplikuje">
          <AdminButton onClick={handleImport}>⬆ Importovat</AdminButton>
        </FieldRow>
        <FieldRow label="Reset všech úprav" hint="Smaže overrides; zdrojové výchozí hodnoty zůstávají">
          <AdminButton tone="danger" onClick={handleReset}>🗑 Reset</AdminButton>
        </FieldRow>
        {message && <div className="mt-3 text-xs text-white/70">{message}</div>}
      </Card>

      <Card title="Jak administrace funguje" subtitle="Poznámky pro správce">
        <ul className="text-xs text-white/60 space-y-1.5 list-disc list-inside">
          <li>Úpravy se ukládají do <b>admin overrides</b> (localStorage) a aplikují se okamžitě na běžící konfiguraci — zdrojový kód se nemění.</li>
          <li>Custom mapy z editoru se objeví ve výběru mapy v lobby; custom assety ve spawnovacím poolu živého města.</li>
          <li>Většina změn se projeví v příští hře (loadouty a mapy se čtou při startu zápasu).</li>
          <li>Export/import umožňuje přenést celou konfiguraci projektu mezi prohlížeči nebo ji verzovat.</li>
        </ul>
      </Card>
    </>
  );
}
