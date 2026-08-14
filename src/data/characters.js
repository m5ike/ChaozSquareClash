// 55 hratelných postav — české osobnosti (parodie).
// Každá má zbraň (projectile | thrown | spread | melee), brnění, speciální schopnost a staty.
export const CHARACTERS = [
  {
    id: "babis",
    name: "Andrej Babiš",
    nickname: "Čápi hrabě",
    cat: "Politik",
    weapon: {
      name: "Kalkulačka",
      type: "projectile",
      damage: 15,
      speed: 20,
      cooldown: 0.5,
      color: "#e74c3c",
      size: 0.15
    },
    armor: {
      name: "Čapí hnízdo",
      defense: 0.75
    },
    power: {
      name: "Čapí schéma",
      desc: "Odčerpá 20 HP všem soupeřům",
      cd: 20
    },
    stats: {
      health: 120,
      speed: 5,
      dmgMult: 1
    },
    color: "#e74c3c",
    portrait: "/assets/portraits/babis.png"
  },
  {
    id: "zeman",
    name: "Miloš Zeman",
    nickname: "Pán Lány",
    cat: "Politik",
    weapon: {
      name: "Placačka rumu",
      type: "thrown",
      damage: 25,
      speed: 12,
      cooldown: 0.8,
      color: "#f39c12",
      size: 0.2
    },
    armor: {
      name: "Nafukovací člun",
      defense: 0.8
    },
    power: {
      name: "Becherovka",
      desc: "Nezranitelnost na 3s",
      cd: 18
    },
    stats: {
      health: 100,
      speed: 4,
      dmgMult: 1.1
    },
    color: "#f39c12",
    portrait: "/assets/portraits/zeman.png"
  },
  {
    id: "klaus",
    name: "Václav Klaus",
    nickname: "Olověný prezident",
    cat: "Politik",
    weapon: {
      name: "Ústava",
      type: "projectile",
      damage: 20,
      speed: 15,
      cooldown: 0.6,
      color: "#34495e",
      size: 0.18
    },
    armor: {
      name: "Olověné kalhoty",
      defense: 0.6
    },
    power: {
      name: "Veto",
      desc: "Zruší jeden útok soupeře",
      cd: 15
    },
    stats: {
      health: 130,
      speed: 4,
      dmgMult: 1
    },
    color: "#34495e",
    portrait: "/assets/portraits/klaus.png"
  },
  {
    id: "havel",
    name: "Václav Havel",
    nickname: "Srdcař",
    cat: "Politik",
    weapon: {
      name: "Srdcařská dýmka",
      type: "spread",
      damage: 8,
      cooldown: 0.4,
      color: "#1abc9c",
      size: 0.1,
      count: 5,
      spread: 0.3
    },
    armor: {
      name: "Sametové sako",
      defense: 0.8
    },
    power: {
      name: "Pravda a láska",
      desc: "Vyléčí se na 30% HP",
      cd: 15
    },
    stats: {
      health: 90,
      speed: 6,
      dmgMult: 0.9
    },
    color: "#1abc9c",
    portrait: "/assets/portraits/havel.png"
  },
  {
    id: "fiala",
    name: "Petr Fiala",
    nickname: "Profesor",
    cat: "Politik",
    weapon: {
      name: "Akademická dýmka",
      type: "spread",
      damage: 7,
      cooldown: 0.3,
      color: "#2c3e50",
      size: 0.1,
      count: 4,
      spread: 0.25
    },
    armor: {
      name: "Talár",
      defense: 0.85
    },
    power: {
      name: "Kabinet",
      desc: "Svolá ministry kteří střílejí za něj",
      cd: 25
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#2c3e50",
    portrait: "/assets/portraits/fiala.png"
  },
  {
    id: "pavel",
    name: "Petr Pavel",
    nickname: "Generál",
    cat: "Politik",
    weapon: {
      name: "Armádní dýka",
      type: "melee",
      damage: 30,
      cooldown: 0.6,
      color: "#3498db",
      range: 2.5
    },
    armor: {
      name: "Generálská čepice",
      defense: 0.7
    },
    power: {
      name: "Dělostřelecký úder",
      desc: "Meteoritový úder na oblast",
      cd: 22
    },
    stats: {
      health: 110,
      speed: 6,
      dmgMult: 1.1
    },
    color: "#3498db",
    portrait: "/assets/portraits/pavel.png"
  },
  {
    id: "schwarzenberg",
    name: "Karel Schwarzenberg",
    nickname: "Kníže",
    cat: "Politik",
    weapon: {
      name: "Monokl laser",
      type: "projectile",
      damage: 18,
      speed: 25,
      cooldown: 0.4,
      color: "#9b59b6",
      size: 0.1
    },
    armor: {
      name: "Erb",
      defense: 0.7
    },
    power: {
      name: "Šlechtický původ",
      desc: "Teleport na libovolné místo",
      cd: 15
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1.2
    },
    color: "#9b59b6",
    portrait: "/assets/portraits/schwarzenberg.png"
  },
  {
    id: "kalousek",
    name: "Miroslav Kalousek",
    nickname: "Bílý klobouk",
    cat: "Politik",
    weapon: {
      name: "Rozpočtová sekera",
      type: "melee",
      damage: 25,
      cooldown: 0.5,
      color: "#e67e22",
      range: 2.2
    },
    armor: {
      name: "Bílý klobouk",
      defense: 0.75
    },
    power: {
      name: "Škrtání",
      desc: "Sníží HP všech soupeřů o 10%",
      cd: 20
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#e67e22",
    portrait: "/assets/portraits/kalousek.png"
  },
  {
    id: "okamura",
    name: "Tomio Okamura",
    nickname: "Samurai",
    cat: "Politik",
    weapon: {
      name: "Sushi nůž",
      type: "melee",
      damage: 28,
      cooldown: 0.5,
      color: "#e74c3c",
      range: 2.5
    },
    armor: {
      name: "Japonská hůlka",
      defense: 0.8
    },
    power: {
      name: "Migrace",
      desc: "Vyhostí soupeře z mapy na 5s",
      cd: 18
    },
    stats: {
      health: 90,
      speed: 7,
      dmgMult: 1.1
    },
    color: "#e74c3c",
    portrait: "/assets/portraits/okamura.png"
  },
  {
    id: "drahos",
    name: "Jiří Drahoš",
    nickname: "Doktor",
    cat: "Politik",
    weapon: {
      name: "Laboratorní baňka",
      type: "projectile",
      damage: 14,
      speed: 18,
      cooldown: 0.4,
      color: "#16a085",
      size: 0.14
    },
    armor: {
      name: "Laboratorní plášť",
      defense: 0.85
    },
    power: {
      name: "Experiment",
      desc: "Chemický mrak zraňující v oblasti",
      cd: 20
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#16a085",
    portrait: "/assets/portraits/drahos.png"
  },
  {
    id: "hamacek",
    name: "Jan Hamáček",
    nickname: "Hasič",
    cat: "Politik",
    weapon: {
      name: "Hasičská hadice",
      type: "spread",
      damage: 6,
      cooldown: 0.2,
      color: "#e74c3c",
      size: 0.1,
      count: 6,
      spread: 0.3
    },
    armor: {
      name: "Hasičská přilba",
      defense: 0.75
    },
    power: {
      name: "Hasičský zásah",
      desc: "Uhasí všechny efekty na mapě",
      cd: 15
    },
    stats: {
      health: 110,
      speed: 5,
      dmgMult: 0.9
    },
    color: "#e74c3c",
    portrait: "/assets/portraits/hamacek.png"
  },
  {
    id: "bartos",
    name: "Ivan Bartoš",
    nickname: "Kapitán",
    cat: "Politik",
    weapon: {
      name: "Laptop",
      type: "projectile",
      damage: 12,
      speed: 20,
      cooldown: 0.3,
      color: "#2c3e50",
      size: 0.15
    },
    armor: {
      name: "Pirátská vlajka",
      defense: 0.8
    },
    power: {
      name: "Open Source",
      desc: "Kopíruje zbraň soupeře na 10s",
      cd: 20
    },
    stats: {
      health: 90,
      speed: 6,
      dmgMult: 1
    },
    color: "#2c3e50",
    portrait: "/assets/portraits/bartos.png"
  },
  {
    id: "pekarova",
    name: "Markéta Pekarová Adamová",
    nickname: "Předsedkyně",
    cat: "Politik",
    weapon: {
      name: "EU směrnice",
      type: "projectile",
      damage: 16,
      speed: 16,
      cooldown: 0.5,
      color: "#8e44ad",
      size: 0.16
    },
    armor: {
      name: "TOPAS štít",
      defense: 0.75
    },
    power: {
      name: "Recese",
      desc: "Paralýza všech na 2s",
      cd: 18
    },
    stats: {
      health: 95,
      speed: 6,
      dmgMult: 1
    },
    color: "#8e44ad",
    portrait: "/assets/portraits/pekarova.png"
  },
  {
    id: "vystrcil",
    name: "Miloš Vystrčil",
    nickname: "Senátor",
    cat: "Politik",
    weapon: {
      name: "Tchajwanský praporek",
      type: "projectile",
      damage: 13,
      speed: 22,
      cooldown: 0.35,
      color: "#c0392b",
      size: 0.12
    },
    armor: {
      name: "Senátorský klobouk",
      defense: 0.8
    },
    power: {
      name: "Navštívit Tchaj-wan",
      desc: "Teleport na druhou stranu mapy",
      cd: 12
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#c0392b",
    portrait: null
  },
  {
    id: "belobradek",
    name: "Pavel Bělobrádek",
    nickname: "Rodina",
    cat: "Politik",
    weapon: {
      name: "Křesťanský kříž",
      type: "projectile",
      damage: 14,
      speed: 18,
      cooldown: 0.45,
      color: "#27ae60",
      size: 0.14
    },
    armor: {
      name: "Lidovecký štít",
      defense: 0.8
    },
    power: {
      name: "Rodina",
      desc: "Povolá 2 pomocníky",
      cd: 25
    },
    stats: {
      health: 105,
      speed: 4,
      dmgMult: 1
    },
    color: "#27ae60",
    portrait: null
  },
  {
    id: "jourova",
    name: "Věra Jourová",
    nickname: "EU komisařka",
    cat: "Politik",
    weapon: {
      name: "EU trest",
      type: "projectile",
      damage: 17,
      speed: 18,
      cooldown: 0.5,
      color: "#2980b9",
      size: 0.14
    },
    armor: {
      name: "Euroštít",
      defense: 0.75
    },
    power: {
      name: "Sankce",
      desc: "Sníží sílu zbraně soupeře o 50%",
      cd: 20
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#2980b9",
    portrait: null
  },
  {
    id: "vondra",
    name: "Alexandr Vondra",
    nickname: "Generál NATO",
    cat: "Politik",
    weapon: {
      name: "NATO štít",
      type: "thrown",
      damage: 22,
      speed: 14,
      cooldown: 0.7,
      color: "#2c3e50",
      size: 0.2
    },
    armor: {
      name: "Vojenská čepice",
      defense: 0.7
    },
    power: {
      name: "Vojenský pakt",
      desc: "Přivolá 3 posily",
      cd: 25
    },
    stats: {
      health: 115,
      speed: 4,
      dmgMult: 1.1
    },
    color: "#2c3e50",
    portrait: "/assets/portraits/vondra.png"
  },
  {
    id: "grebenicek",
    name: "Miroslav Grebeníček",
    nickname: "Soudruh",
    cat: "Politik",
    weapon: {
      name: "Stranický lístek",
      type: "spread",
      damage: 7,
      cooldown: 0.3,
      color: "#c0392b",
      size: 0.1,
      count: 5,
      spread: 0.25
    },
    armor: {
      name: "Rudá hvězda",
      defense: 0.75
    },
    power: {
      name: "Revoluce",
      desc: "Převrat změní barvy zbraní",
      cd: 20
    },
    stats: {
      health: 110,
      speed: 4,
      dmgMult: 1
    },
    color: "#c0392b",
    portrait: null
  },
  {
    id: "slachta",
    name: "Robert Šlachta",
    nickname: "Detektiv",
    cat: "Politik",
    weapon: {
      name: "Skupinový lístek",
      type: "projectile",
      damage: 16,
      speed: 20,
      cooldown: 0.4,
      color: "#34495e",
      size: 0.13
    },
    armor: {
      name: "Ochranná vesta",
      defense: 0.65
    },
    power: {
      name: "Zásah",
      desc: "Omráčí soupeře na 3s",
      cd: 18
    },
    stats: {
      health: 105,
      speed: 6,
      dmgMult: 1
    },
    color: "#34495e",
    portrait: "/assets/portraits/slachta.png"
  },
  {
    id: "skromach",
    name: "Zdeněk Škromach",
    nickname: "Odborář",
    cat: "Politik",
    weapon: {
      name: "Transparent",
      type: "melee",
      damage: 18,
      cooldown: 0.4,
      color: "#e67e22",
      range: 2
    },
    armor: {
      name: "Montérky",
      defense: 0.8
    },
    power: {
      name: "Stávka",
      desc: "Paralyzuje oblast na 5s",
      cd: 22
    },
    stats: {
      health: 120,
      speed: 4,
      dmgMult: 1
    },
    color: "#e67e22",
    portrait: null
  },
  {
    id: "zaoralek",
    name: "Lubomír Zaorálek",
    nickname: "Diplomat",
    cat: "Politik",
    weapon: {
      name: "Diplomatický lístek",
      type: "projectile",
      damage: 13,
      speed: 16,
      cooldown: 0.4,
      color: "#2c3e50",
      size: 0.13
    },
    armor: {
      name: "Oblek",
      defense: 0.85
    },
    power: {
      name: "Diplomacie",
      desc: "Soupeř nemůže útočit 5s",
      cd: 20
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#2c3e50",
    portrait: null
  },
  {
    id: "hynek",
    name: "Jiří Hynek",
    nickname: "Vesmírný maršál",
    cat: "Politik",
    weapon: {
      name: "Vesmírná raketa",
      type: "projectile",
      damage: 20,
      speed: 28,
      cooldown: 0.5,
      color: "#8e44ad",
      size: 0.12
    },
    armor: {
      name: "Hvězdný štít",
      defense: 0.7
    },
    power: {
      name: "Vesmír",
      desc: "Meteoritový úder z oblohy",
      cd: 22
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1.2
    },
    color: "#8e44ad",
    portrait: null
  },
  {
    id: "jagr",
    name: "Jaromír Jágr",
    nickname: "Kladivo",
    cat: "Sport",
    weapon: {
      name: "Hokejka",
      type: "melee",
      damage: 35,
      cooldown: 0.7,
      color: "#f39c12",
      range: 2.8
    },
    armor: {
      name: "Dres #68",
      defense: 0.8
    },
    power: {
      name: "Kladivo z chodu",
      desc: "Nezastavitelný útok 5s",
      cd: 25
    },
    stats: {
      health: 100,
      speed: 6,
      dmgMult: 1.3
    },
    color: "#f39c12",
    portrait: "/assets/portraits/jagr.png"
  },
  {
    id: "cech",
    name: "Petr Čech",
    nickname: "Brankář",
    cat: "Sport",
    weapon: {
      name: "Hokejová maska",
      type: "thrown",
      damage: 20,
      speed: 15,
      cooldown: 0.6,
      color: "#2c3e50",
      size: 0.18
    },
    armor: {
      name: "Brankářské rukavice",
      defense: 0.65
    },
    power: {
      name: "Přeběr",
      desc: "Chytí a vrátí projektíl soupeře",
      cd: 15
    },
    stats: {
      health: 130,
      speed: 4,
      dmgMult: 1
    },
    color: "#2c3e50",
    portrait: "/assets/portraits/cech.png"
  },
  {
    id: "sablikova",
    name: "Martina Sáblíková",
    nickname: "Rychlobruslařka",
    cat: "Sport",
    weapon: {
      name: "Brusle",
      type: "melee",
      damage: 18,
      cooldown: 0.3,
      color: "#2980b9",
      range: 2
    },
    armor: {
      name: "Zlatá medaile",
      defense: 0.8
    },
    power: {
      name: "Rychlobrusla",
      desc: "2x rychlost na 5s",
      cd: 15
    },
    stats: {
      health: 85,
      speed: 8,
      dmgMult: 1
    },
    color: "#2980b9",
    portrait: "/assets/portraits/sablikova.png"
  },
  {
    id: "nedved",
    name: "Pavel Nedvěd",
    nickname: "Česká římská",
    cat: "Sport",
    weapon: {
      name: "Fotbalový míč",
      type: "projectile",
      damage: 16,
      speed: 22,
      cooldown: 0.4,
      color: "#f1c40f",
      size: 0.14
    },
    armor: {
      name: "Zlatý míč",
      defense: 0.75
    },
    power: {
      name: "Bicykl",
      desc: "Otočka přes soupeře způsobí zranění",
      cd: 18
    },
    stats: {
      health: 95,
      speed: 7,
      dmgMult: 1.1
    },
    color: "#f1c40f",
    portrait: "/assets/portraits/nedved.png"
  },
  {
    id: "ledecka",
    name: "Ester Ledecká",
    nickname: "Sněhurka",
    cat: "Sport",
    weapon: {
      name: "Snowboard",
      type: "melee",
      damage: 22,
      cooldown: 0.5,
      color: "#e74c3c",
      range: 2.5
    },
    armor: {
      name: "Sněžný štít",
      defense: 0.8
    },
    power: {
      name: "Smýk",
      desc: "Smýkavý útok zasáhne všechny v cestě",
      cd: 18
    },
    stats: {
      health: 90,
      speed: 7,
      dmgMult: 1.1
    },
    color: "#e74c3c",
    portrait: "/assets/portraits/ledecka.png"
  },
  {
    id: "berdych",
    name: "Tomáš Berdych",
    nickname: "Esíčko",
    cat: "Sport",
    weapon: {
      name: "Tenisová raketa",
      type: "projectile",
      damage: 18,
      speed: 25,
      cooldown: 0.35,
      color: "#27ae60",
      size: 0.13
    },
    armor: {
      name: "Wimbledonská trofej",
      defense: 0.8
    },
    power: {
      name: "Esíčko",
      desc: "Okamžitý rychlý úder",
      cd: 12
    },
    stats: {
      health: 95,
      speed: 6,
      dmgMult: 1.1
    },
    color: "#27ae60",
    portrait: "/assets/portraits/berdych.png"
  },
  {
    id: "spotakova",
    name: "Barbora Špotáková",
    nickname: "Oštěpařka",
    cat: "Sport",
    weapon: {
      name: "Oštěp",
      type: "thrown",
      damage: 30,
      speed: 18,
      cooldown: 0.8,
      color: "#e67e22",
      size: 0.22
    },
    armor: {
      name: "Atletický štít",
      defense: 0.8
    },
    power: {
      name: "Hod",
      desc: "Vrhne oštěp přes celou mapu",
      cd: 20
    },
    stats: {
      health: 90,
      speed: 5,
      dmgMult: 1.2
    },
    color: "#e67e22",
    portrait: null
  },
  {
    id: "gott",
    name: "Karel Gott",
    nickname: "Slavík",
    cat: "Hudba",
    weapon: {
      name: "Mikrofon",
      type: "spread",
      damage: 9,
      cooldown: 0.3,
      color: "#f1c40f",
      size: 0.1,
      count: 5,
      spread: 0.2
    },
    armor: {
      name: "Zlatý slavík",
      defense: 0.8
    },
    power: {
      name: "Malá mořská víla",
      desc: "Uspí všechny soupeře na 3s",
      cd: 25
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#f1c40f",
    portrait: "/assets/portraits/gott.png"
  },
  {
    id: "bila",
    name: "Lucie Bílá",
    nickname: "Cesta do ráje",
    cat: "Hudba",
    weapon: {
      name: "Hlasová vlna",
      type: "spread",
      damage: 10,
      cooldown: 0.4,
      color: "#e91e63",
      size: 0.12,
      count: 6,
      spread: 0.3
    },
    armor: {
      name: "Mega kostým",
      defense: 0.75
    },
    power: {
      name: "Pohádková síla",
      desc: "Vyléčí se + dočasné brnění",
      cd: 20
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1.1
    },
    color: "#e91e63",
    portrait: "/assets/portraits/bila.png"
  },
  {
    id: "david",
    name: "Michal David",
    nickname: "Discoprince",
    cat: "Hudba",
    weapon: {
      name: "Diskokoule",
      type: "projectile",
      damage: 14,
      speed: 18,
      cooldown: 0.4,
      color: "#9b59b6",
      size: 0.16
    },
    armor: {
      name: "Sluneční brýle",
      defense: 0.8
    },
    power: {
      name: "Discopád",
      desc: "Taneční kouzlo zmátne soupeře",
      cd: 18
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#9b59b6",
    portrait: "/assets/portraits/david.png"
  },
  {
    id: "mares",
    name: "Leoš Mareš",
    nickname: "Moderátor",
    cat: "Hudba",
    weapon: {
      name: "Mikrofon",
      type: "projectile",
      damage: 13,
      speed: 20,
      cooldown: 0.35,
      color: "#3498db",
      size: 0.13
    },
    armor: {
      name: "Tričko s nápisem",
      defense: 0.85
    },
    power: {
      name: "Moderátor",
      desc: "Zmrazí čas na 2s",
      cd: 20
    },
    stats: {
      health: 95,
      speed: 6,
      dmgMult: 1
    },
    color: "#3498db",
    portrait: "/assets/portraits/mares.png"
  },
  {
    id: "ben",
    name: "Ben Cristovao",
    nickname: "Breakdown",
    cat: "Hudba",
    weapon: {
      name: "Beat",
      type: "projectile",
      damage: 16,
      speed: 22,
      cooldown: 0.3,
      color: "#e67e22",
      size: 0.12
    },
    armor: {
      name: "Cap",
      defense: 0.85
    },
    power: {
      name: "Rytmus",
      desc: "Rytmický útok v oblasti",
      cd: 15
    },
    stats: {
      health: 90,
      speed: 7,
      dmgMult: 1.1
    },
    color: "#e67e22",
    portrait: "/assets/portraits/ben.png"
  },
  {
    id: "pokac",
    name: "Pokáč",
    nickname: "Písničkář",
    cat: "Hudba",
    weapon: {
      name: "Kytara",
      type: "spread",
      damage: 7,
      cooldown: 0.3,
      color: "#27ae60",
      size: 0.1,
      count: 5,
      spread: 0.25
    },
    armor: {
      name: "Slam",
      defense: 0.85
    },
    power: {
      name: "Píseň",
      desc: "Léčí spojence a zraňuje soupeře",
      cd: 18
    },
    stats: {
      health: 90,
      speed: 5,
      dmgMult: 1
    },
    color: "#27ae60",
    portrait: "/assets/portraits/pokac.png"
  },
  {
    id: "reznik",
    name: "Řezník",
    nickname: "Underground",
    cat: "Hudba",
    weapon: {
      name: "Ulice",
      type: "melee",
      damage: 28,
      cooldown: 0.5,
      color: "#2c3e50",
      range: 2.5
    },
    armor: {
      name: "Maska",
      defense: 0.75
    },
    power: {
      name: "Underground",
      desc: "Neviditelnost na 10s",
      cd: 25
    },
    stats: {
      health: 85,
      speed: 7,
      dmgMult: 1.2
    },
    color: "#2c3e50",
    portrait: null
  },
  {
    id: "klus",
    name: "Tomáš Klus",
    nickname: "Baladik",
    cat: "Hudba",
    weapon: {
      name: "Kytara",
      type: "projectile",
      damage: 14,
      speed: 18,
      cooldown: 0.4,
      color: "#16a085",
      size: 0.13
    },
    armor: {
      name: "Notový záznam",
      defense: 0.85
    },
    power: {
      name: "Balada",
      desc: "Zpomalí všechny soupeře",
      cd: 18
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1
    },
    color: "#16a085",
    portrait: "/assets/portraits/klus.png"
  },
  {
    id: "eben",
    name: "Marek Eben",
    nickname: "Tazatel",
    cat: "TV",
    weapon: {
      name: "Kvízová karta",
      type: "projectile",
      damage: 15,
      speed: 18,
      cooldown: 0.4,
      color: "#2c3e50",
      size: 0.13
    },
    armor: {
      name: "Černý oblek",
      defense: 0.8
    },
    power: {
      name: "Otázka",
      desc: "Paralyzuje soupeře otázkou na 2s",
      cd: 15
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#2c3e50",
    portrait: "/assets/portraits/eben.png"
  },
  {
    id: "brzobohaty",
    name: "Ondřej Brzobohatý",
    nickname: "Influencer",
    cat: "TV",
    weapon: {
      name: "Selfie tyč",
      type: "melee",
      damage: 16,
      cooldown: 0.4,
      color: "#3498db",
      range: 2.5
    },
    armor: {
      name: "Influencer brýle",
      defense: 0.85
    },
    power: {
      name: "Sponzor",
      desc: "Dočasné brnění od sponzora",
      cd: 18
    },
    stats: {
      health: 90,
      speed: 6,
      dmgMult: 1
    },
    color: "#3498db",
    portrait: "/assets/portraits/brzobohaty.png"
  },
  {
    id: "polivka",
    name: "Bolek Polívka",
    nickname: "Improvizátor",
    cat: "TV",
    weapon: {
      name: "Herecká maska",
      type: "thrown",
      damage: 18,
      speed: 14,
      cooldown: 0.6,
      color: "#e67e22",
      size: 0.18
    },
    armor: {
      name: "Sedlský kroj",
      defense: 0.8
    },
    power: {
      name: "Improvizace",
      desc: "Náhodně změní svou zbraň",
      cd: 15
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#e67e22",
    portrait: "/assets/portraits/polivka.png"
  },
  {
    id: "cerny",
    name: "David Černý",
    nickname: "Provokatér",
    cat: "TV",
    weapon: {
      name: "Giant Baby",
      type: "thrown",
      damage: 25,
      speed: 12,
      cooldown: 0.7,
      color: "#e74c3c",
      size: 0.25
    },
    armor: {
      name: "Plastika",
      defense: 0.8
    },
    power: {
      name: "Kontroverze",
      desc: "Vytvoří kontroverzní objekt který exploduje",
      cd: 20
    },
    stats: {
      health: 90,
      speed: 6,
      dmgMult: 1.2
    },
    color: "#e74c3c",
    portrait: "/assets/portraits/cerny.png"
  },
  {
    id: "janeckova",
    name: "Ester Janečková",
    nickname: "Pohádka",
    cat: "TV",
    weapon: {
      name: "Pohádková hůlka",
      type: "spread",
      damage: 8,
      cooldown: 0.3,
      color: "#e91e63",
      size: 0.1,
      count: 4,
      spread: 0.2
    },
    armor: {
      name: "Uvítací úsměv",
      defense: 0.85
    },
    power: {
      name: "Pořad",
      desc: "Vyzve soupeře na souboj 1v1",
      cd: 20
    },
    stats: {
      health: 90,
      speed: 5,
      dmgMult: 1
    },
    color: "#e91e63",
    portrait: "/assets/portraits/janeckova.png"
  },
  {
    id: "stropnicky",
    name: "Martin Stropnický",
    nickname: "Herec",
    cat: "TV",
    weapon: {
      name: "Herecká maska",
      type: "projectile",
      damage: 14,
      speed: 18,
      cooldown: 0.4,
      color: "#8e44ad",
      size: 0.13
    },
    armor: {
      name: "Filmový pás",
      defense: 0.8
    },
    power: {
      name: "Herec",
      desc: "Neviditelnost na 3s",
      cd: 18
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1
    },
    color: "#8e44ad",
    portrait: null
  },
  {
    id: "prachar",
    name: "Jakub Prachař",
    nickname: "Zprávy",
    cat: "TV",
    weapon: {
      name: "Zpravodajský papír",
      type: "projectile",
      damage: 15,
      speed: 20,
      cooldown: 0.4,
      color: "#2c3e50",
      size: 0.13
    },
    armor: {
      name: "Novinářská čepice",
      defense: 0.85
    },
    power: {
      name: "Breaking news",
      desc: "Zastaví všechny soupeře na 2s",
      cd: 18
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1
    },
    color: "#2c3e50",
    portrait: "/assets/portraits/prachar.png"
  },
  {
    id: "sverak",
    name: "Zdeněk Svěrák",
    nickname: "Krteček",
    cat: "TV",
    weapon: {
      name: "Tříška",
      type: "spread",
      damage: 7,
      cooldown: 0.3,
      color: "#27ae60",
      size: 0.1,
      count: 5,
      spread: 0.25
    },
    armor: {
      name: "Cykloprstová rukavice",
      defense: 0.8
    },
    power: {
      name: "Křesťo",
      desc: "Léčivé představení vyléčí na 25%",
      cd: 18
    },
    stats: {
      health: 100,
      speed: 4,
      dmgMult: 1
    },
    color: "#27ae60",
    portrait: "/assets/portraits/sverak.png"
  },
  {
    id: "gogoman",
    name: "GoGoMan",
    nickname: "Streamuju",
    cat: "Net",
    weapon: {
      name: "Klávesnice",
      type: "projectile",
      damage: 13,
      speed: 20,
      cooldown: 0.3,
      color: "#e74c3c",
      size: 0.13
    },
    armor: {
      name: "RGB podsvícení",
      defense: 0.85
    },
    power: {
      name: "Stream",
      desc: "Vysílání láká diváky a zraňuje",
      cd: 18
    },
    stats: {
      health: 90,
      speed: 6,
      dmgMult: 1
    },
    color: "#e74c3c",
    portrait: "/assets/portraits/gogoman.png"
  },
  {
    id: "tary",
    name: "Tary",
    nickname: "Taras",
    cat: "Net",
    weapon: {
      name: "Gamepad",
      type: "projectile",
      damage: 15,
      speed: 22,
      cooldown: 0.35,
      color: "#9b59b6",
      size: 0.13
    },
    armor: {
      name: "YouTube Play tlačítko",
      defense: 0.8
    },
    power: {
      name: "Gameplay",
      desc: "Kopíruje pohyb soupeře na 5s",
      cd: 20
    },
    stats: {
      health: 95,
      speed: 6,
      dmgMult: 1
    },
    color: "#9b59b6",
    portrait: "/assets/portraits/tary.png"
  },
  {
    id: "ment",
    name: "MenT",
    nickname: "Macák",
    cat: "Net",
    weapon: {
      name: "Městečko",
      type: "thrown",
      damage: 22,
      speed: 14,
      cooldown: 0.6,
      color: "#f39c12",
      size: 0.2
    },
    armor: {
      name: "Lego štít",
      defense: 0.8
    },
    power: {
      name: "Stavba",
      desc: "Postaví barikádu za ochranu",
      cd: 20
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#f39c12",
    portrait: "/assets/portraits/ment.png"
  },
  {
    id: "agraelas",
    name: "Agraelus",
    nickname: "Mág",
    cat: "Net",
    weapon: {
      name: "Kouzelná hůlka",
      type: "projectile",
      damage: 17,
      speed: 24,
      cooldown: 0.35,
      color: "#8e44ad",
      size: 0.12
    },
    armor: {
      name: "Gaming headset",
      defense: 0.8
    },
    power: {
      name: "Kouzlo",
      desc: "Magický štít blokuje veškeré zranění 3s",
      cd: 18
    },
    stats: {
      health: 85,
      speed: 6,
      dmgMult: 1.2
    },
    color: "#8e44ad",
    portrait: "/assets/portraits/agraelas.png"
  },
  {
    id: "kazma",
    name: "Kazma",
    nickname: "Challenger",
    cat: "Net",
    weapon: {
      name: "Challenge",
      type: "projectile",
      damage: 16,
      speed: 18,
      cooldown: 0.4,
      color: "#e67e22",
      size: 0.14
    },
    armor: {
      name: "Pravda štít",
      defense: 0.85
    },
    power: {
      name: "Výzva",
      desc: "Vyzve soupeře na minihru, prohrál bere dvojnásobné poškození",
      cd: 20
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1.1
    },
    color: "#e67e22",
    portrait: "/assets/portraits/kazma.png"
  },
  {
    id: "sabatova",
    name: "Anna Šabatová",
    nickname: "Ombudsman",
    cat: "Jiné",
    weapon: {
      name: "Ombudsmanská listina",
      type: "projectile",
      damage: 12,
      speed: 16,
      cooldown: 0.4,
      color: "#2980b9",
      size: 0.14
    },
    armor: {
      name: "Lidskoprávní štít",
      defense: 0.8
    },
    power: {
      name: "Ombudsman",
      desc: "Obhájí práva a vyléčí na 20%",
      cd: 18
    },
    stats: {
      health: 95,
      speed: 5,
      dmgMult: 1
    },
    color: "#2980b9",
    portrait: null
  },
  {
    id: "dhavlova",
    name: "Dagmar Havlová",
    nickname: "Herečka",
    cat: "Jiné",
    weapon: {
      name: "Herecký štít",
      type: "spread",
      damage: 8,
      cooldown: 0.3,
      color: "#e91e63",
      size: 0.1,
      count: 4,
      spread: 0.2
    },
    armor: {
      name: "Lázeňský úsměv",
      defense: 0.85
    },
    power: {
      name: "Lázně",
      desc: "Plné vyléčení (jednou za zápas)",
      cd: 60
    },
    stats: {
      health: 90,
      speed: 5,
      dmgMult: 1
    },
    color: "#e91e63",
    portrait: null
  },
  {
    id: "tyl",
    name: "Josef Kajetán Tyl",
    nickname: "Buditel",
    cat: "Jiné",
    weapon: {
      name: "Divadelní program",
      type: "projectile",
      damage: 14,
      speed: 18,
      cooldown: 0.4,
      color: "#c0392b",
      size: 0.13
    },
    armor: {
      name: "Vlastenecký kroj",
      defense: 0.8
    },
    power: {
      name: "Divadlo",
      desc: "Představení zmátne soupeře na 3s",
      cd: 18
    },
    stats: {
      health: 100,
      speed: 5,
      dmgMult: 1
    },
    color: "#c0392b",
    portrait: null
  },
  {
    id: "nemcova",
    name: "Božena Němcová",
    nickname: "Babička",
    cat: "Jiné",
    weapon: {
      name: "Kniha Babička",
      type: "thrown",
      damage: 20,
      speed: 14,
      cooldown: 0.6,
      color: "#16a085",
      size: 0.2
    },
    armor: {
      name: "Vůl",
      defense: 0.75
    },
    power: {
      name: "Babička",
      desc: "Povolá babičku jako štít",
      cd: 20
    },
    stats: {
      health: 95,
      speed: 4,
      dmgMult: 1.1
    },
    color: "#16a085",
    portrait: null
  },
  {
    id: "capek",
    name: "Karel Čapek",
    nickname: "Vynálezce",
    cat: "Jiné",
    weapon: {
      name: "Robot",
      type: "thrown",
      damage: 24,
      speed: 16,
      cooldown: 0.7,
      color: "#34495e",
      size: 0.22
    },
    armor: {
      name: "Psí životy",
      defense: 0.8
    },
    power: {
      name: "Robot",
      desc: "Povolá bojového robota na 10s",
      cd: 25
    },
    stats: {
      health: 90,
      speed: 5,
      dmgMult: 1.2
    },
    color: "#34495e",
    portrait: null
  }
];

export function getCharacterById(id) {
  return CHARACTERS.find((ch) => ch.id === id) || null;
}
