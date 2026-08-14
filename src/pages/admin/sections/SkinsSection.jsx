import { useEffect, useRef, useState } from 'react';
import { WEAPON_SKINS, BODY_SKINS, ENV_SKINS, getWeaponSkinId, getBodySkinId, getEnvSkinId, setWeaponSkinId, setBodySkinId, setEnvSkinId } from '@/game/skins.js';
import { MAPS } from '@/data/maps/index.js';
import { useCobblestoneTexture } from '@/game/textures.js';
import { getFaceTexture } from '@/game/faces.js';
import { CHARACTERS } from '@/data/characters.js';
import { Card, FieldRow, SelectField, ColorField } from '@/pages/admin/ui.jsx';
import { saveCustomMap } from '@/admin/overrides.js';

// Náhled procedurální textury (canvas → obrázek)
function TexturePreview({ character }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const texture = getFaceTexture(character);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && texture?.image) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 96, 96);
      ctx.drawImage(texture.image, 0, 0, 96, 96);
    }
  }, [character]);
  return <canvas ref={canvasRef} width={96} height={96} className="rounded border border-white/15" />;
}

// Textury a skiny: aktivní skiny, palety map (živá editace barev), náhledy
// procedurálních textur obličejů.
export default function SkinsSection() {
  const [weaponSkin, setWeaponSkin] = useState(getWeaponSkinId());
  const [bodySkin, setBodySkin] = useState(getBodySkinId());
  const [envSkin, setEnvSkin] = useState(getEnvSkinId());
  const [mapId, setMapId] = useState(MAPS[0]?.id);
  const [, force] = useState(0);
  const map = MAPS.find((m) => m.id === mapId) || MAPS[0];

  const updatePaletteColor = (key, value) => {
    // uloží upravenou mapu jako custom variantu (přepíše původní ve výběru)
    const next = { ...map, palette: { ...map.palette, [key]: value } };
    saveCustomMap(next);
    force((n) => n + 1);
  };

  return (
    <>
      <Card title="Aktivní skiny" subtitle="Globální volby hráče (stejné jako v herním Nastavení)">
        <FieldRow label="Skin zbraní">
          <SelectField
            value={weaponSkin}
            options={WEAPON_SKINS.map((s) => [s.id, s.name])}
            onChange={(v) => {
              setWeaponSkinId(v);
              setWeaponSkin(v);
            }}
          />
        </FieldRow>
        <FieldRow label="Skin těla">
          <SelectField
            value={bodySkin}
            options={BODY_SKINS.map((s) => [s.id, s.name])}
            onChange={(v) => {
              setBodySkinId(v);
              setBodySkin(v);
            }}
          />
        </FieldRow>
        <FieldRow label="Skin prostředí">
          <SelectField
            value={envSkin}
            options={ENV_SKINS.map((s) => [s.id, s.name])}
            onChange={(v) => {
              setEnvSkinId(v);
              setEnvSkin(v);
            }}
          />
        </FieldRow>
      </Card>

      <Card
        title="Paleta mapy"
        subtitle="Živá editace barev prostředí — uloží se jako custom varianta mapy"
        actions={
          <SelectField
            value={mapId}
            width="w-40"
            options={MAPS.map((m) => [m.id, m.name.split(' — ')[0]])}
            onChange={setMapId}
          />
        }
      >
        <div className="grid sm:grid-cols-2 gap-x-8">
          {Object.entries(map?.palette || {}).map(([key, value]) => (
            <FieldRow key={key} label={key}>
              <ColorField value={value} onChange={(v) => updatePaletteColor(key, v)} />
            </FieldRow>
          ))}
        </div>
      </Card>

      <Card title="Náhled textur obličejů" subtitle="Procedurální textury (portrét / karikatura) prvních postav">
        <div className="flex flex-wrap gap-3">
          {CHARACTERS.slice(0, 10).map((character) => (
            <div key={character.id} className="text-center">
              <TexturePreview character={character} />
              <div className="text-[9px] text-white/40 mt-1 max-w-[96px] truncate">{character.name}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
