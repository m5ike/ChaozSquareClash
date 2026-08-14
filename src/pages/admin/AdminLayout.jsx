import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSection from '@/pages/admin/sections/DashboardSection.jsx';
import GameParamsSection from '@/pages/admin/sections/GameParamsSection.jsx';
import WeaponsSection from '@/pages/admin/sections/WeaponsSection.jsx';
import AssetsSection from '@/pages/admin/sections/AssetsSection.jsx';
import CharactersSection from '@/pages/admin/sections/CharactersSection.jsx';
import ModelEditorSection from '@/pages/admin/sections/ModelEditorSection.jsx';
import MovementsEventsSection from '@/pages/admin/sections/MovementsEventsSection.jsx';
import SkinsSection from '@/pages/admin/sections/SkinsSection.jsx';
import MapEditorSection from '@/pages/admin/sections/MapEditorSection.jsx';

// Administrace hry — profesionální editor po vzoru herních nástrojů:
// postranní navigace sekcí, obsahová plocha s inspektory vlastností.
// Změny se ukládají do admin overrides (localStorage) a aplikují se
// okamžitě na živé konfigurační objekty hry.
const SECTIONS = [
  { id: 'prehled', icon: '📊', label: 'Přehled', component: DashboardSection },
  { id: 'parametry', icon: '🎛️', label: 'Herní parametry', component: GameParamsSection },
  { id: 'zbrane', icon: '🔫', label: 'Zbraně', component: WeaponsSection },
  { id: 'assety', icon: '📦', label: 'Assety & šablony', component: AssetsSection },
  { id: 'postavy', icon: '👤', label: 'Postavy & avataři', component: CharactersSection },
  { id: 'modely', icon: '🧊', label: 'Editor 3D modelů', component: ModelEditorSection },
  { id: 'pohyby', icon: '🏃', label: 'Pohyby & události', component: MovementsEventsSection },
  { id: 'vzhled', icon: '🎨', label: 'Textury & skiny', component: SkinsSection },
  { id: 'mapy', icon: '🗺️', label: 'Editor map', component: MapEditorSection },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState('prehled');
  const active = SECTIONS.find((s) => s.id === activeId) || SECTIONS[0];
  const ActiveComponent = active.component;

  return (
    <div className="min-h-screen w-full text-white flex" style={{ background: '#0d1117' }}>
      {/* Postranní navigace */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r border-white/10"
        style={{ background: '#111722' }}
      >
        <div className="px-4 py-4 border-b border-white/10">
          <h1 className="text-sm font-black tracking-widest text-white/90">🛠 ADMINISTRACE</h1>
          <p className="text-[10px] text-white/40 mt-0.5">Náměstí Chaosu — editor hry</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveId(section.id)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                activeId === section.id
                  ? 'text-white font-bold border-r-2 border-emerald-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              style={{ background: activeId === section.id ? 'rgba(52,211,153,0.08)' : 'transparent' }}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1.5">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 rounded-lg text-xs font-bold border border-white/15 text-white/70 hover:bg-white/10"
          >
            ← Zpět do hry
          </button>
          <p className="text-[9px] text-white/25 text-center">
            Změny se ukládají lokálně a aplikují ihned
          </p>
        </div>
      </aside>

      {/* Obsah sekce */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b border-white/10 sticky top-0 z-10" style={{ background: '#0d1117ee', backdropFilter: 'blur(6px)' }}>
          <h2 className="text-lg font-bold">
            {active.icon} {active.label}
          </h2>
        </div>
        <div className="p-6">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
