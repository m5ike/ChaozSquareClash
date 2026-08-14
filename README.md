# Náměstí Chaosu

Bláznivá 3D střílečka z českého náměstí — retro grafika ve stylu Quake, 55 hratelných
postav podle českých osobností (parodie), bizarní zbraně a speciální schopnosti.
Hraje se proti botům, funguje na desktopu (klávesnice + myš s pointer lockem) i na
mobilu (dotykové joysticky, volitelně gyroskop).

Zdrojový kód byl zrekonstruován reverzním inženýrstvím z produkčního nasazení
`https://chaos-square-clashcz.base44.app` (Base44 aplikace).

## Spuštění

```bash
npm install
npm run dev
```

Produkční build: `npm run build`, náhled: `npm run preview`.

## Technologie

| Vrstva | Knihovna |
|---|---|
| UI | React 18 + Vite + Tailwind CSS |
| Routing | react-router-dom |
| Data / server | @base44/sdk (entita `MatchResult`, auth, uživatelská nastavení) |
| 3D | three.js + @react-three/fiber + @react-three/drei |
| Fyzika | @react-three/rapier (Rapier WASM) |
| Server state | @tanstack/react-query |

## Struktura projektu

```
├── index.html                    # vstupní HTML (PWA meta, manifest)
├── public/
│   ├── manifest.json             # PWA manifest
│   └── assets/
│       ├── logo.png              # ikona aplikace
│       └── portraits/*.png       # 40 portrétů postav (15 postav portrét nemá)
└── src/
    ├── main.jsx                  # bootstrap Reactu
    ├── App.jsx                   # AuthProvider + QueryClient + router (/,/play,/leaderboard,/settings)
    ├── index.css                 # Tailwind + theme proměnné + herní CSS (.game-page, HUD safe-area)
    ├── api/
    │   └── base44Client.js       # Base44 klient (appId), entita MatchResult, auth
    ├── lib/
    │   └── AuthContext.jsx       # přihlášení přes Base44, chybové stavy, logout
    ├── pages/
    │   ├── Home.jsx              # výběr postavy (kategorie, staty, zbraně, schopnosti)
    │   ├── Play.jsx              # herní stránka: HUD, dotykové ovládání, pauza, game over
    │   ├── Leaderboard.jsx       # žebříček z entity MatchResult (dnes / celkově)
    │   ├── Settings.jsx          # editor klávesových zkratek + nastavení botů + god mode
    │   └── NotFound.jsx          # 404
    ├── components/game/
    │   ├── GameContainer.jsx     # obal #game-container (forwardRef na scénu)
    │   ├── GameCanvas.jsx        # KeyboardControls + Canvas + Physics (+ pauza při blur)
    │   ├── GameScene.jsx         # Sky, světla, mlha + složení celé scény
    │   ├── CityMap.jsx           # náměstí: dlažba, budovy, střechy, překážky, stromy, lampy
    │   ├── CharacterModel.jsx    # kloubový 3D model postavy (obličej, oblečení, animace)
    │   ├── Ambience.jsx          # mraky, vlající české vlajky, tryskající kašna
    │   ├── Player.jsx            # first-person ovladač (pohyb, skok, střelba, gyro, respawn)
    │   ├── Bots.jsx              # AI boti s 3D modely (navigace, útoky, animace, respawn)
    │   ├── Projectiles.jsx       # pool 30 projektilů se stopami, kolize, zásahové zóny
    │   ├── Pickups.jsx           # lékárničky s respawnem
    │   ├── Particles.jsx         # atmosférické částice (250)
    │   ├── HitEffects.jsx        # efekty zásahů (jádro + jiskrové výbuchy s gravitací)
    │   ├── WeaponModel.jsx       # 3D model zbraně podle typu
    │   ├── FPWeapon.jsx          # zbraň v FP pohledu s rukama, houpáním a zpětným rázem
    │   └── OrientationWarning.jsx# výzva k otočení telefonu na šířku
    ├── game/
    │   ├── events.js             # EventBus + globální sběrnice (bus)
    │   ├── constants.js          # barvy, parametry hráče/botů, aréna, WIN_SCORE…
    │   ├── state.js              # mutable herní stav (mimo React), výběr postavy, powers
    │   ├── hitZones.js           # zásahové zóny (hlava/krk/srdce/…, multiplikátory)
    │   ├── keybindings.js        # definice akcí, ukládání zkratek, mapa pro KeyboardControls
    │   ├── settings.js           # nastavení hry (počet/život/síla botů) ↔ Base44 user
    │   ├── faces.js              # textury obličejů (výřez hlavy z portrétu / pixel-art)
    │   └── textures.js           # procedurální canvas textury (dlažba, fasády, okna)
    └── data/
        ├── characters.js         # 55 postav: zbraň, brnění, schopnost, staty, portrét
        ├── mapLayout.js          # rozmístění budov, překážek, spawnů, lékárniček
        └── categories.js         # kategorie postav (popisky + barvy)
```

## Herní mechaniky

- **Postavy** mají hlavní zbraň (typy: `projectile`, `thrown`, `spread`, `melee`),
  brnění (multiplikátor obrany), speciální schopnost s cooldownem a staty
  (zdraví, rychlost, damage multiplikátor).
- **Loadout** se generuje z hlavní zbraně: Bližák (1.8× dmg), Brokovnice (0.5× dmg,
  6 broků), Dálka (0.7× dmg). Přepínání klávesami 1–3 / kolečkem.
- **Zásahové zóny**: hlava 3×, krk 2.5×, srdce 3× (krit), plíce 2×, břicho 1.5×,
  končetiny 0.7×.
- **Schopnosti** se klasifikují z českého popisu na efekty: `invincible`, `heal`,
  `speed`, `shield`, `stun_all`, `damage_boost`, `teleport`, `damage_all`.
- **Výhra**: první na 40 bodů; smrt = respawn po 5 s.
- Výsledky zápasů se ukládají do Base44 entity `MatchResult` (žebříček).

## Vizuální upgrade (nad rámec originálu)

Původní hra zobrazovala boty jako ploché billboard sprity s portrétem. Upgrade přidává:

- **Skutečné 3D postavy** ([CharacterModel.jsx](src/components/game/CharacterModel.jsx)):
  kloubové low-poly modely ve stylu retro Quake — hlava s obličejem vyřízlým
  z portrétu postavy (pixel-art fallback pro postavy bez portrétu), oblečení
  podle kategorie (oblek s kravatou, dres s čelenkou, klobouk, kapuce…),
  zbraň postavy v pravé ruce, animace chůze/útoku, pád při smrti a bílý
  emissive záblesk při zásahu.
- **First-person ruce** — rukávy v barvě postavy drží zbraň, houpání při chůzi,
  zpětný ráz s náklonem.
- **Efekty**: stopy za projektily, jiskrové výbuchy zásahů s gravitací
  (kritické zásahy výraznější), otřes kamery při zranění, HUD hitmarker
  (bílý/červený ✕) a červená vinětace při poškození.
- **Prostředí** ([Ambience.jsx](src/components/game/Ambience.jsx)): driftující
  mraky, vlající české vlajky na střechách (vertex animace), tryskající voda
  v kašně s hladinou.
- **Rendering**: měkké stíny (PCFSoft), vyšší expozice ACES tone mappingu.

Dev poznámka: [main.jsx](src/main.jsx) obsahuje dev-only shim pro skryté taby
(headless/embedded prohlížeče) — Chrome v nich pozastavuje `requestAnimationFrame`
i `ResizeObserver`, bez shimu by se canvas nenamountoval. Do produkčního buildu
se nedostane.

## Poznámky k rekonstrukci

- Původní nasazení servíruje ještě `static/js/badge.js` („Edit with Base44" odznak) —
  to je platformní skript Base44, do rekonstrukce záměrně nezahrnut.
- Kompilovaný CSS bundle byl nahrazen standardním Tailwind pipeline (stejné třídy,
  stejné theme proměnné) + ručně přenesené vlastní styly.
- Vendor bundly (three.js, Rapier) jsou nahrazeny npm závislostmi; rozdělení chunků
  `three` / `physics` zachovává `vite.config.js` (manualChunks).
- `appId` v `src/api/base44Client.js` ukazuje na původní Base44 backend — hra tak
  sdílí žebříček a účty s nasazenou verzí. Pro vlastní backend změň `appId`.
