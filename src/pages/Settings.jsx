import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KEY_BINDING_DEFS, defaultBindings, getBindings, saveKeybindings, formatKeyLabel } from '@/game/keybindings.js';
import { DEFAULT_GAME_SETTINGS, loadGameSettings, saveGameSettings } from '@/game/settings.js';
import { gameState } from '@/game/state.js';
import { getQualitySetting, setQualitySetting } from '@/game/quality.js';
import { getMuted, setMuted } from '@/game/audio.js';
import { getWorldConfig, setWorldConfig } from '@/game/worldConfig.js';
import { getAutoGestureInterval, setAutoGestureInterval } from '@/game/gestures.js';
import {
  WEAPON_SKINS,
  BODY_SKINS,
  ENV_SKINS,
  getWeaponSkinId,
  setWeaponSkinId,
  getBodySkinId,
  setBodySkinId,
  getEnvSkinId,
  setEnvSkinId,
} from '@/game/skins.js';

// Nastavení — klávesové zkratky, boti a god mode
export default function Settings() {
  const navigate = useNavigate();
  const [bindings, setBindingsDraft] = useState(defaultBindings());
  const [listeningFor, setListeningFor] = useState(null);
  const [saved, setSaved] = useState(false);
  const [gameSettings, setGameSettings] = useState(DEFAULT_GAME_SETTINGS);
  const [quality, setQuality] = useState(getQualitySetting());
  const [soundOn, setSoundOn] = useState(!getMuted());
  const [weaponSkin, setWeaponSkin] = useState(getWeaponSkinId());
  const [bodySkin, setBodySkin] = useState(getBodySkinId());
  const [envSkin, setEnvSkin] = useState(getEnvSkinId());
  const [worldCfg, setWorldCfg] = useState(() => getWorldConfig(null));
  const [autoGesture, setAutoGesture] = useState(getAutoGestureInterval());

  const updateWorldCfg = (key, value) => {
    setWorldCfg((prev) => ({ ...prev, [key]: value }));
    setWorldConfig({ [key]: value });
  };

  useEffect(() => {
    setBindingsDraft({ ...getBindings() });
    loadGameSettings().then(() => setGameSettings({ ...gameState.gameSettings }));
  }, []);

  // Zachytávání stisknuté klávesy pro právě upravovanou akci
  useEffect(() => {
    if (!listeningFor) return;
    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningFor(null);
        return;
      }
      setBindingsDraft((prev) => {
        const next = { ...prev };
        // každá klávesa smí být jen na jedné akci — nejdřív ji všude odebereme
        for (const action of Object.keys(next)) next[action] = next[action].filter((code) => code !== e.code);
        next[listeningFor] = [e.code, ...next[listeningFor].slice(0, 1)];
        return next;
      });
      setListeningFor(null);
      setSaved(false);
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [listeningFor]);

  const handleSave = async () => {
    await saveKeybindings(bindings);
    await saveGameSettings(gameSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setBindingsDraft(defaultBindings());
    setSaved(false);
  };

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      {/* Horní lišta */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">⚙ NASTAVENÍ</h1>
          <p className="text-xs text-white/50">Ovládání a herní nastavení</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          ← Zpět
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {/* Klávesové zkratky */}
        {KEY_BINDING_DEFS.map((def) => (
          <div
            key={def.name}
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div>
              <div className="text-sm font-bold">{def.label}</div>
              <div className="text-xs text-white/40">{def.desc}</div>
            </div>
            <div className="flex gap-2 items-center">
              {(bindings[def.name] || []).map((code, index) => (
                <button
                  key={index}
                  onClick={() => setListeningFor(def.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold min-w-[70px] text-center transition-all ${listeningFor === def.name ? 'animate-pulse' : 'hover:scale-105'}`}
                  style={{
                    background: listeningFor === def.name ? '#16a34a' : 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {listeningFor === def.name ? 'Stiskni...' : formatKeyLabel(code)}
                </button>
              ))}
              {(bindings[def.name] || []).length < 2 && listeningFor !== def.name && (
                <button
                  onClick={() => setListeningFor(def.name)}
                  className="px-3 py-2 rounded-lg text-sm font-bold hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}
                >
                  +
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="pt-4 pb-2">
          <h2 className="text-sm font-bold text-white/80">🎨 Skiny</h2>
        </div>

        {[
          {
            label: 'Skin zbraní',
            desc: 'Materiál zbraně v ruce i v náhledu',
            options: WEAPON_SKINS,
            value: weaponSkin,
            set: (id) => {
              setWeaponSkinId(id);
              setWeaponSkin(id);
            },
          },
          {
            label: 'Skin těla',
            desc: 'Oblečení tvé postavy (boti zůstávají ve svém)',
            options: BODY_SKINS,
            value: bodySkin,
            set: (id) => {
              setBodySkinId(id);
              setBodySkin(id);
            },
          },
          {
            label: 'Skin prostředí',
            desc: 'Barevné ladění mapy — Noc, Zima, Retro sépie',
            options: ENV_SKINS,
            value: envSkin,
            set: (id) => {
              setEnvSkinId(id);
              setEnvSkin(id);
            },
          },
        ].map((row) => (
          <div key={row.label} className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="mb-2">
              <div className="text-sm font-bold">{row.label}</div>
              <div className="text-xs text-white/40">{row.desc}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {row.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => row.set(option.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    row.value === option.id
                      ? 'border-green-500 text-white'
                      : 'border-white/15 text-white/50'
                  }`}
                  style={{
                    background:
                      row.value === option.id ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 pb-2">
          <h2 className="text-sm font-bold text-white/80">🌆 Živé město</h2>
        </div>

        {[
          ['static', 'Statické assety', 'stromy, stánky, zaparkovaná auta, koše…', 0, 24],
          ['vehicle', 'Vozidla', 'auta, autobusy, tramvaje v pohybu', 0, 10],
          ['pedestrian', 'Chodci', 'páni, paní, děti, hasiči, policajti…', 0, 14],
          ['animal', 'Zvířata', 'psi, kočky, koně… i lev', 0, 8],
        ].map(([key, label, desc, min, max]) => (
          <div key={key} className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold">{label}</div>
                <div className="text-xs text-white/40">{desc}</div>
              </div>
              <div className="text-sm text-white/60">{worldCfg[key]}</div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step="1"
              value={worldCfg[key]}
              onChange={(e) => updateWorldCfg(key, parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        ))}

        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div>
            <div className="text-sm font-bold">Chráněná NPC</div>
            <div className="text-xs text-white/40">
              Dítě, pes a zdravotník — za jejich zabití přijde penalizace
            </div>
          </div>
          <button
            onClick={() => updateWorldCfg('protectedEnabled', !worldCfg.protectedEnabled)}
            className="relative w-12 h-6 rounded-full transition-all"
            style={{ background: worldCfg.protectedEnabled ? '#22c55e' : 'rgba(255,255,255,0.2)' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: worldCfg.protectedEnabled ? '26px' : '2px' }}
            />
          </button>
        </div>

        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-bold">Automatická gesta</div>
              <div className="text-xs text-white/40">
                Postava jednou za interval sama zagestikuje (0 = vypnuto); ručně: G / V
              </div>
            </div>
            <div className="text-sm text-white/60">
              {autoGesture === 0 ? 'vyp.' : `${autoGesture} s`}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={autoGesture}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setAutoGesture(v);
              setAutoGestureInterval(v);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        <div className="pt-4 pb-2">
          <h2 className="text-sm font-bold text-white/80">🎮 Nastavení hry</h2>
        </div>

        {/* Kvalita grafiky */}
        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-bold">Kvalita grafiky</div>
              <div className="text-xs text-white/40">
                Vysoká = bloom, vinětace a měkké stíny (projeví se v příští hře)
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              ['auto', 'Auto'],
              ['high', 'Vysoká'],
              ['low', 'Nízká'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setQualitySetting(value);
                  setQuality(value);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  quality === value ? 'border-green-500 text-white' : 'border-white/15 text-white/50'
                }`}
                style={{
                  background: quality === value ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.05)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Zvuk */}
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div>
            <div className="text-sm font-bold">Zvuky</div>
            <div className="text-xs text-white/40">Retro SFX a syntezátorový ambient</div>
          </div>
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setMuted(!next);
            }}
            className="relative w-12 h-6 rounded-full transition-all"
            style={{ background: soundOn ? '#22c55e' : 'rgba(255,255,255,0.2)' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: soundOn ? '26px' : '2px' }}
            />
          </button>
        </div>

        {/* God mode */}
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div>
            <div className="text-sm font-bold">Nesmrtelnost</div>
            <div className="text-xs text-white/40">Hráč nemůže zemřít</div>
          </div>
          <button
            onClick={() => setGameSettings((prev) => ({ ...prev, godMode: !prev.godMode }))}
            className="relative w-12 h-6 rounded-full transition-all"
            style={{ background: gameSettings.godMode ? '#22c55e' : 'rgba(255,255,255,0.2)' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: gameSettings.godMode ? '26px' : '2px' }}
            />
          </button>
        </div>

        {/* Počet botů */}
        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">Počet botů</div>
            <div className="text-sm text-white/60">{gameSettings.botCount}</div>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={gameSettings.botCount}
            onChange={(e) => setGameSettings((prev) => ({ ...prev, botCount: parseInt(e.target.value) }))}
            className="w-full accent-green-500"
          />
        </div>

        {/* Život botů */}
        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">Život botů</div>
            <div className="text-sm text-white/60">{gameSettings.botHealth} HP</div>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={gameSettings.botHealth}
            onChange={(e) => setGameSettings((prev) => ({ ...prev, botHealth: parseInt(e.target.value) }))}
            className="w-full accent-red-500"
          />
        </div>

        {/* Síla botů */}
        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">Síla botů</div>
            <div className="text-sm text-white/60">{gameSettings.botDamage} dmg</div>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={gameSettings.botDamage}
            onChange={(e) => setGameSettings((prev) => ({ ...prev, botDamage: parseInt(e.target.value) }))}
            className="w-full accent-orange-500"
          />
        </div>

        {/* Rychlost botů */}
        <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">Rychlost botů</div>
            <div className="text-sm text-white/60">{gameSettings.botSpeed}</div>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={gameSettings.botSpeed}
            onChange={(e) => setGameSettings((prev) => ({ ...prev, botSpeed: parseFloat(e.target.value) }))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: saved ? '#22c55e' : '#16a34a' }}
          >
            {saved ? '✓ Uloženo!' : 'Uložit nastavení'}
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-lg text-sm font-bold border border-white/20 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            Obnovit výchozí
          </button>
        </div>

        <p className="text-xs text-white/30 text-center pt-2">
          Klikni na klávesu a stiskni požadovanou klávesu. Esc zruší. Každá klávesa může být pouze na jedné akci.
        </p>
      </div>
    </div>
  );
}
