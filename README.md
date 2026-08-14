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

## Herní rozšíření (nad rámec originálu)

- **Zvuk** ([src/game/audio.js](src/game/audio.js)) — čistě procedurální Web Audio:
  výstřely podle typu zbraně, zásahy/krity, smrt, respawn, schopnosti, kroky,
  fanfára výhry a syntezátorový ambient. Vypínač v Nastavení.
- **Tři mapy** ([src/data/maps/](src/data/maps)) — Praha (kašna + pomník),
  Brno (morový sloup, hustší uličky, stánky), Ostrava (těžní věž, kontejnery,
  industriální paleta). Výběr v lobby na úvodní obrazovce.
- **Herní módy** ([src/game/modes.js](src/game/modes.js) +
  [ModeSystems.jsx](src/components/game/ModeSystems.jsx)) — Deathmatch (40 bodů),
  Týmový DM (modří s parťáky proti červeným, 30 bodů), Ukořistit vlajku
  (3 zanesení), Král náměstí (držení zóny 45 s). Obrazovka konce zápasu
  s výsledky.
- **Chytřejší AI** ([src/game/ai.js](src/game/ai.js)) — steering s vyhýbáním
  překážkám, kryty a „obvazování" při nízkém zdraví, výběr zbraně podle
  vzdálenosti (bližák/brokovnice/dálka), používání schopností postav
  a souboje bot-vs-bot v týmových módech.
- **Ragdoll** — mrtvý bot se přepne na dynamické Rapier těleso a fyzikálně
  se skácí (impulz + rotace), po respawnu zpět na kinematické.
- **Postprocessing a výkon** — bloom + vinětace (jen ve vysoké kvalitě),
  přepínač kvality Auto/Vysoká/Nízká v Nastavení, adaptivní DPR podle FPS.
- **3D náhled postavy** — rotující model v detail panelu výběru postavy.
- **Statistiky** — žebříček má záložky Dnes / Síň slávy (Chaos rating
  `1000 + 2×skóre + 3×killy − 2×smrti`, série výher) / Vývoj (SVG graf).

## Backend v projektu (bez Base44)

Veškerá data běží **lokálně v projektu** — [src/api/localBackend.js](src/api/localBackend.js)
implementuje stejné API jako Base44 SDK (entities `list/filter/create/update/delete/get/subscribe`,
auth `me/updateMe`) nad localStorage; realtime funguje přes BroadcastChannel, takže
multiplayer běží **mezi taby stejného prohlížeče** bez jakéhokoli serveru.
Žebříček, nastavení, klávesy i místnosti jsou tedy plně offline.

Přepnutí zpět na Base44 backend (sdílený žebříček s nasazenou verzí):

```js
localStorage.setItem('chaos_backend', 'base44'); // + reload; 'local' vrátí zpět
```

nebo `VITE_BACKEND=base44 npm run build`.

## Tabulka poranění a přesnosti zásahů

Implementace: [src/game/hitZones.js](src/game/hitZones.js).

| Zóna     | Poškození (podíl zbraně) | Chrání   | Poznámka              |
|----------|--------------------------|----------|-----------------------|
| Obličej  | **100 %**                | helma    | 🎯 **HEADSHOT** banner |
| Hlava    | 80–99 %                  | helma    |                       |
| Srdce    | 80–90 %                  | brnění   | kritický zásah        |
| Ramena   | 5–30 %                   | brnění   |                       |
| Ruce     | 5–30 %                   | —        |                       |
| Nohy     | 5–30 %                   | —        |                       |
| Tělo     | 5–30 %                   | brnění   |                       |

- Zóna se určuje z **výšky dopadu** na kapsli postavy, **boční vzdálenosti** od osy
  těla a toho, zda zásah přišel **zepředu** (obličej a srdce jdou trefit jen frontálně —
  porovnává se směr střely s natočením postavy).
- **Helma vs. brnění**: předmět postavy, jehož název obsahuje *přilba, maska, čepice,
  klobouk, helma, kukla*, chrání hlavu a obličej (a je vidět na modelu); ostatní
  předměty chrání trup (srdce, ramena, tělo). Síla ochrany = `1 − defense` předmětu.
- **Průraznost** (`armorPen` 0–1 na zbrani) část ochrany ignoruje.
- Vzorec: `poškození = zbraň × náhodný podíl zóny × (1 − ochrana × (1 − armorPen))`.

## How-to: ladění zbraní

Všechno ladění je v **[src/game/weaponsConfig.js](src/game/weaponsConfig.js)** —
uprav hodnoty a ulož (dev server se sám obnoví).

**Střelné zbraně** (`RANGED_DEFAULTS.spread` = brokovnice, `.projectile` = dálková):

| Parametr | Význam |
|---|---|
| `accuracy` | přesnost 0–1; efektivní rozptyl = `spread × (1.15 − accuracy)` |
| `damageScale` | účinnost na zdraví (násobek damage postavy) |
| `armorPen` | účinnost proti brnění/helmě 0–1 (kolik ochrany ignoruje) |
| `spread` | základní rozptyl (radiány); u brokovnice kužel broků |
| `pelletCount` | broků na výstřel (jen brokovnice) |
| `magSize` | **max. výstřelů na zásobník** |
| `magazines` | **max. zásobníků** (celková munice = magSize × magazines) |
| `fireCooldown` | **cooldown mezi jednotlivými střelami** (s) |
| `reloadCooldown` | **cooldown výměny zásobníku** (s); přebíjení: klávesa **R** nebo automaticky při prázdném zásobníku |
| `projectileSpeed` | rychlost střely (j/s) |
| `behavior` | chování střely (`projectile` = letící projektil s kolizí) |

**Sečné zbraně** (`SLASH_TYPES` + `CATEGORY_SLASH` + `SLASH_TRAJECTORIES`):

| Parametr | Význam |
|---|---|
| typ | `sekera` \| `mec` \| `nuz` \| `katana` (přiřazení kategorií postav v `CATEGORY_SLASH`) |
| `lengthPct` | **délka čepele v procentech výšky postavy** (výška = 1.45 m); dosah = délka + paže |
| `damageMult` | násobek damage postavy |
| `swingCooldown` | cooldown po švihu (s) |
| počet trajektorií | `trajectories` (výchozí 4) |

**Trajektorie** — vybírá se **počtem stisků klávesy střelby** v okně 350 ms
(1× stisk = trajektorie 1, 2× = 2, …). Při švihu se vykreslí stopa čepele
i tečkovaná celá dráha. Čtyři základní trajektorie (`SLASH_TRAJECTORIES`):

1. **Rozmach zleva** — z leva ve výšce těla doprava do výšky hlavy a zpátky (zasahuje tělo→hlavu)
2. **Rozmach zprava** — zrcadlově z prava doleva a zpátky
3. **Bodnutí na hlavu** — dlouhé bodnutí od pasu na hlavu protivníka (obličej/hlava)
4. **Bodnutí na tělo** — dlouhé bodnutí od pasu na tělo protivníka (srdce/tělo)

Vlastní trajektorii přidáš novým objektem v `SLASH_TRAJECTORIES`: body `{x, y, z}`
v normalizovaném prostoru (x −1 vlevo…1 vpravo, y 0 pas…1 hlava, z 0 u těla…1 plný
dosah), `zone` (`'sweep' | 'head' | 'body'`) a `duration` v sekundách.

## Skiny

Výběr v **Nastavení → Skiny** ([src/game/skins.js](src/game/skins.js)):

- **Zbraně**: Klasik, Zlatá, Chrom, Neon (svítící), Dřevo — mění materiál FP zbraně,
  čepele i zbraně v náhledu postavy.
- **Tělo**: Klasik (podle kategorie), Černý oblek, Retro tepláky, Zlatý ročník —
  oblečení tvé postavy (náhled + ruce v FP pohledu); boti zůstávají ve svém.
- **Prostředí**: Klasik, Noc, Zima, Retro sépie — barevná transformace palety celé
  mapy včetně oblohy a mlhy.

Nový skin přidáš položkou v příslušném poli v `skins.js` (u zbraní jde o materiálové
vlastnosti `{color, metalness, roughness, emissive}`, u těla o `outfit` barvy,
u prostředí o transformaci palety v `applyEnvSkin`).

## Multiplayer

Online hra běží přes Base44 realtime subscriptions (WebSocket) — lobby
s místnostmi je pod tlačítkem „🌐 Online hra". Pozice se synchronizují ~4×/s
(interpolované), poškození si autoritativně aplikuje zasažený klient
(trust-the-victim přes `HitEvent`).

**Backend vyžaduje tři entity** — přidej je v Base44 dashboardu (Data → Add
entity), jinak lobby zobrazí upozornění a hra zůstane u botů:

```jsonc
// Room — místnost
{ "name": "string", "map_id": "string", "mode_id": "string",
  "status": "string", "host_key": "string" }

// PlayerState — stav hráče v místnosti
{ "room_id": "string", "player_key": "string", "nickname": "string",
  "character_id": "string", "x": "number", "y": "number", "z": "number",
  "yaw": "number", "health": "number", "kills": "number", "deaths": "number",
  "alive": "boolean", "last_seen": "string" }

// HitEvent — hlášení zásahu
{ "room_id": "string", "target_key": "string", "shooter_key": "string",
  "shooter_name": "string", "damage": "number", "crit": "boolean" }
```

Transport: [src/multiplayer/transport.js](src/multiplayer/transport.js),
vykreslování protihráčů: [RemotePlayers.jsx](src/components/game/RemotePlayers.jsx).
Online hra zatím podporuje mód Deathmatch.

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
