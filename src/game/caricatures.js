// ============================================================================
// caricatures.js — procedurální pixel-art karikatury postav bez portrétu
// ----------------------------------------------------------------------------
// Kreslí „bustu" 192×256 px: jednobarevné gradientní pozadí (z character.color),
// ramena s oblečením, tenký krk a hlavně OBŘÍ hlavu (~60 % výšky) s nadsázkou:
// velký nos, výrazné obočí, charakteristický doplněk. Vše hrubým 4px zrnem.
//
// API:
//   CARICATURE_FEATURES         — deklarativní rysy per id (snadné ladění)
//   drawCaricature(ch, canvas)  — nakreslí bustu do dodaného canvasu 192×256
//   getCaricatureDataUrl(ch)    — PNG data URL s cache per id
//   getCaricatureFaceCanvas(ch) — 48×48 canvas jen s obličejem (textura 3D hlavy)
//
// Bez DOM (SSR) funkce vracejí null; import modulu nikdy nespadne.
// ============================================================================

// --- Základní rozměry -------------------------------------------------------
const SIRKA = 192;            // šířka busty v px
const VYSKA = 256;            // výška busty v px
const ZRNO = 4;               // velikost jednoho „pixelu" (buňky mřížky)
const MRIZ_W = SIRKA / ZRNO;  // 48 buněk na šířku
const MRIZ_H = VYSKA / ZRNO;  // 64 buněk na výšku

// --- Paleta pleti a společné barvy -----------------------------------------
const PLET = '#e8c1a0';        // základní pleť
const PLET_SVETLA = '#f3d6b8'; // odlesk čela a tváří
const PLET_STIN = '#d2a47d';   // stín (pravá strana, pod bradou)
const PLET_TMAVA = '#b08055';  // obrys hlavy / uší
const OBRYS = '#57351f';       // tmavý obrys pro kontrast s pozadím
const BELMO = '#f8f4ec';       // bělmo očí
const ZORNICE = '#2b2320';     // zornice, výchozí linky
const RET = '#b06a52';         // přirozené rty
const RTENKA = '#c2183c';      // výrazná rtěnka
const ZUBY = '#f5efe2';        // zuby v úsměvu
const ZLATA = '#e7b52a';       // špendlíky, hvězdy, řetězy
const CERVENA = '#c0392b';     // vlajky, hvězda, transparent

// Rozvržení hlavy v mřížce (busta 48×64). Hlava je schválně přerostlá.
const HLAVA_TOP = 6;   // horní okraj obličeje (nad ním vlasy/čepice)
const HLAVA_VYSKA = 33;// výška obličeje → brada na y=39
const STRED_X = 24;    // svislá osa busty

// Výřez hlavy pro 48×48 texturu obličeje (buňky mřížky busty)
const VYREZ = { x: 4, y: 0, w: 40, h: 40 };

// ============================================================================
// RYSY KARIKATUR — tady se ladí vzhled. Klíče odpovídají character.id.
// hairStyle: short|combover|balding|bob|ponytail|wavy|partMiddle|partSide|
//            slick|romantic|hoodCap|militaryCap
// brows: flat|angry|raised|sad|bushy|thought   glasses: round|square|sunglasses|chain
// mouth: smile|grin|frown|neutral|smirk|lips   clothing: viz OBLECENI níže
// props: pořadí = pořadí kreslení (viz DOPLNKY)
// ============================================================================
export const CARICATURE_FEATURES = {
  // Miloš Vystrčil — Senátor: brýle, šedé vlasy, oblek, tchajwanská vlaječka
  vystrcil: {
    faceShape: 'oval', faceWidth: 28,
    hairStyle: 'short', hairColor: '#b7b9ba',
    brows: 'flat', eyes: 'normal', glasses: 'square',
    noseSize: 2, mouth: 'smile', wrinkles: true,
    clothing: 'suit', clothingColor: '#27364f', shirtColor: '#f2efe8',
    tie: 'tie', tieColor: '#2e6bb0',
    props: ['taiwanFlag', 'lapelTaiwan'],
  },
  // Pavel Bělobrádek — Rodina: kulatá tvář, brýle, křížek na klopě
  belobradek: {
    faceShape: 'wide', faceWidth: 32,
    hairStyle: 'short', hairColor: '#2e2620',
    brows: 'raised', eyes: 'normal', glasses: 'round',
    noseSize: 2, mouth: 'smile', blush: true,
    clothing: 'suit', clothingColor: '#31404f', shirtColor: '#f2efe8',
    tie: 'tie', tieColor: '#e7b52a',
    props: ['lapelCross'],
  },
  // Věra Jourová — EU komisařka: blond mikádo, rtěnka, modrý kostýmek, hvězdičky
  jourova: {
    faceShape: 'oval', faceWidth: 28,
    hairStyle: 'bob', hairColor: '#e8c96b', bangs: false,
    brows: 'raised', eyes: 'normal', lashes: true,
    noseSize: 1, mouth: 'lips', lipstick: true, earrings: 'gold',
    clothing: 'blazer', clothingColor: '#1f4fa0', shirtColor: '#f4f2ee',
    props: ['euStars'],
  },
  // Miroslav Grebeníček — Soudruh: přísné obočí, patka, rudá kravata, hvězdička
  grebenicek: {
    faceShape: 'long', faceWidth: 26,
    hairStyle: 'combover', hairColor: '#9aa0a2',
    brows: 'angry', eyes: 'squint',
    noseSize: 2, mouth: 'frown', wrinkles: true,
    clothing: 'suit', clothingColor: '#4a4f55', shirtColor: '#eceae2',
    tie: 'tie', tieColor: '#b1201f',
    props: ['lapelStar'],
  },
  // Zdeněk Škromach — Odborář: kulatá tvář, knír, plandavá košile, transparent
  skromach: {
    faceShape: 'wide', faceWidth: 34,
    hairStyle: 'balding', hairColor: '#8d8478',
    brows: 'bushy', eyes: 'normal',
    noseSize: 3, noseBulb: true, mouth: 'smile', mustache: 'walrus',
    blush: true,
    clothing: 'shirt', clothingColor: '#9fc3e0',
    props: ['banner'],
  },
  // Lubomír Zaorálek — Diplomat: vysoké čelo, zamyšlené obočí, motýlek, lístek
  zaoralek: {
    faceShape: 'long', faceWidth: 26,
    hairStyle: 'balding', hairColor: '#8a8074',
    brows: 'thought', eyes: 'tired',
    noseSize: 2, mouth: 'neutral', wrinkles: true,
    clothing: 'suit', clothingColor: '#3a3f47', shirtColor: '#f2efe8',
    tie: 'bowtie', tieColor: '#7a2634',
    props: ['diplomatNote'],
  },
  // Jiří Hynek — Vesmírný maršál: brigadýrka s hvězdou, epolety, raketka
  hynek: {
    faceShape: 'square', faceWidth: 30,
    hairStyle: 'militaryCap', hairColor: '#5a4c3c', capColor: '#31452f',
    brows: 'bushy', eyes: 'normal', glasses: 'square',
    noseSize: 2, mouth: 'neutral',
    clothing: 'uniform', clothingColor: '#3f5a3c',
    props: ['rocket'],
  },
  // Barbora Špotáková — Oštěpařka: culík, tílko, oštěp, odhodlaný úsměv
  spotakova: {
    faceShape: 'oval', faceWidth: 28,
    hairStyle: 'ponytail', hairColor: '#b9853f',
    brows: 'flat', eyes: 'normal', lashes: true,
    noseSize: 1, mouth: 'grin', blush: true, freckles: true,
    clothing: 'tank', clothingColor: '#c8332a',
    props: ['javelin'],
  },
  // Řezník — Underground: kšiltovka + kapuce, tmavé brýle, řetěz, graffiti
  reznik: {
    faceShape: 'oval', faceWidth: 28, skin: '#dcc2a6',
    hairStyle: 'hoodCap', hairColor: '#17181c', capColor: '#101114',
    brows: 'angry', eyes: 'normal', glasses: 'sunglasses',
    noseSize: 2, mouth: 'frown', stubble: true, bgDark: true,
    clothing: 'hoodie', clothingColor: '#23262b',
    props: ['graffiti'],
  },
  // Martin Stropnický — Herec: elegantní šediny, lícní kosti, půlka tváře maska
  stropnicky: {
    faceShape: 'oval', faceWidth: 28,
    hairStyle: 'slick', hairColor: '#c9cdd0',
    brows: 'raised', eyes: 'normal', cheekbones: true,
    noseSize: 2, mouth: 'smirk',
    clothing: 'suit', clothingColor: '#2f3a45', shirtColor: '#f2efe8',
    tie: 'tie', tieColor: '#5a2b46', pocketSquare: true,
    props: ['theaterMask'],
  },
  // Anna Šabatová — Ombudsman: šedé mikádo, laskavý úsměv, brýle na řetízku
  sabatova: {
    faceShape: 'round', faceWidth: 30,
    hairStyle: 'bob', hairColor: '#c3c6c9', bangs: true,
    brows: 'flat', eyes: 'normal', glasses: 'chain',
    noseSize: 1, mouth: 'smile', blush: true, wrinkles: true,
    clothing: 'cardigan', clothingColor: '#7a4a6e', shirtColor: '#efece4',
    props: ['scroll'],
  },
  // Dagmar Havlová — Herečka: vlnité tmavé vlasy, výrazné rty, perly, vějíř
  dhavlova: {
    faceShape: 'oval', faceWidth: 28,
    hairStyle: 'wavy', hairColor: '#3a2721',
    brows: 'raised', eyes: 'normal', lashes: true,
    noseSize: 1, mouth: 'lips', lipstick: true, earrings: 'pearl',
    clothing: 'gown', clothingColor: '#7a1f3d',
    props: ['fan'],
  },
  // Josef Kajetán Tyl — Buditel: KOTLETY, vysoký límec s vázankou, 19. století
  tyl: {
    faceShape: 'long', faceWidth: 26,
    hairStyle: 'romantic', hairColor: '#3b2b1d', sideburns: true,
    brows: 'raised', eyes: 'normal',
    noseSize: 2, mouth: 'smile',
    clothing: 'coat19', clothingColor: '#4a3b28',
    props: ['program'],
  },
  // Božena Němcová — Babička: pěšinka uprostřed, krajkový límec, kniha
  nemcova: {
    faceShape: 'oval', faceWidth: 28,
    hairStyle: 'partMiddle', hairColor: '#241c16',
    brows: 'sad', eyes: 'normal', lashes: true,
    noseSize: 1, mouth: 'smile', earrings: 'gold',
    clothing: 'dress19', clothingColor: '#3d3a45',
    props: ['book'],
  },
  // Karel Čapek — Vynálezce: pěšinka na boku, vysoké čelo, robůtek u ramene
  capek: {
    faceShape: 'long', faceWidth: 26,
    hairStyle: 'partSide', hairColor: '#2f241c',
    brows: 'thought', eyes: 'normal', gaze: [1, -1],
    noseSize: 2, mouth: 'neutral',
    clothing: 'tweed', clothingColor: '#6b5a41', shirtColor: '#f2efe8',
    tie: 'tie', tieColor: '#3a3f34',
    props: ['robot'],
  },
};

// Záchranné rysy pro neznámá id — ať funkce nikdy nespadnou na chybějícím klíči
const VYCHOZI_RYSY = {
  faceShape: 'oval', faceWidth: 28,
  hairStyle: 'short', hairColor: '#3a2a20',
  brows: 'flat', eyes: 'normal',
  noseSize: 2, mouth: 'neutral',
  clothing: 'suit', clothingColor: '#3a4250', shirtColor: '#f2efe8',
  tie: 'tie', tieColor: '#7a3040',
  props: [],
};

// ============================================================================
// Deterministický šum — seed = součet charCode id (stabilní výsledek per id)
// ============================================================================
function seedZId(id) {
  let s = 0;
  const text = String(id || 'anon');
  for (let i = 0; i < text.length; i++) s += text.charCodeAt(i);
  return s;
}

// Mulberry32 — malý rychlý PRNG, stačí na drobné asymetrie a pihy
function vytvorRng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Barevné pomůcky (hex ↔ rgb, míchání, zesvětlení/ztmavení)
// ============================================================================
function hexNaRgb(hex) {
  let h = String(hex || '#888888').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return { r: 136, g: 136, b: 136 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbNaHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

// Smíchá dvě barvy; t=0 → a, t=1 → b
function michej(a, b, t) {
  const ca = hexNaRgb(a); const cb = hexNaRgb(b);
  return rgbNaHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

const zesvetli = (barva, t) => michej(barva, '#ffffff', t);
const ztmav = (barva, t) => michej(barva, '#000000', t);

// ============================================================================
// „Kreslíř" — plotter mapující buňky mřížky na pixely canvasu.
// Jediné primitivum je rect(); všechno ostatní se skládá z obdélníků,
// takže výsledek drží hrubé pixel-art zrno.
// ============================================================================
function vytvorKreslire(ctx, meritko, posunX, posunY) {
  return {
    rect(x, y, w, h, barva) {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = barva;
      ctx.fillRect(
        Math.round((x + posunX) * meritko), Math.round((y + posunY) * meritko),
        Math.round(w * meritko), Math.round(h * meritko)
      );
    },
  };
}

// Schodovitá čára mezi dvěma buňkami (oštěp, žerď, řetízek…)
function cara(p, x0, y0, x1, y1, tloustka, barva) {
  const dx = x1 - x0; const dy = y1 - y0;
  const kroku = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= kroku; i++) {
    const x = Math.round(x0 + (dx * i) / kroku);
    const y = Math.round(y0 + (dy * i) / kroku);
    p.rect(x, y, tloustka, tloustka, barva);
  }
}

// Hvězdička z křížku buněk (EU, generálská, stranická) — žádná extremistika,
// jen malý pěticípý náznak: střed + 4 paprsky + rohové tečky
function hvezdicka(p, x, y, barva, velka) {
  if (velka) {
    // velká verze s tmavým lemem — čitelná i na světlých vlasech a pozadí
    const obrys = ztmav(barva, 0.55);
    p.rect(x - 1, y - 3, 3, 7, obrys);
    p.rect(x - 3, y - 1, 7, 3, obrys);
    p.rect(x, y - 2, 1, 5, barva);
    p.rect(x - 2, y, 5, 1, barva);
    p.rect(x - 1, y - 1, 3, 3, barva);
    p.rect(x, y - 1, 1, 1, zesvetli(barva, 0.4)); // jiskra
  } else {
    p.rect(x, y - 1, 1, 3, barva);
    p.rect(x - 1, y, 3, 1, barva);
  }
}

// ============================================================================
// Rozvržení hlavy — společné souřadnice rysů (v buňkách mřížky busty)
// ============================================================================
function rozlozeni(f) {
  const fw = f.faceWidth || 28;          // šířka obličeje
  const fh = HLAVA_VYSKA;                // výška obličeje
  const fx = STRED_X - Math.floor(fw / 2);
  const top = HLAVA_TOP;
  return {
    fw, fh, fx, top, cx: STRED_X,
    brada: top + fh,       // spodní hrana brady
    obociY: top + 9,       // linka obočí
    okoY: top + 12,        // horní hrana očí
    nosY: top + 15,        // kořen nosu
    ustaY: top + 26,       // linka úst
    uchoY: top + 14,       // horní hrana uší
  };
}

// Zaoblená silueta obličeje ze tří pásů; roz>0 kreslí zvětšený obrys
function tvarObliceje(p, r, tvar, roz, barva) {
  const x = r.fx - roz; const y = r.top - roz;
  const w = r.fw + roz * 2; const h = r.fh + roz * 2;
  p.rect(x + 4, y, w - 8, h, barva);          // střední pás (čelo → brada)
  p.rect(x + 1, y + 2, w - 2, h - 6, barva);  // široký pás tváří
  p.rect(x, y + 4, w, h - 11, barva);         // nejširší pás (spánky/uši)
  if (tvar === 'round' || tvar === 'wide') {
    // buclaté tváře přetékají do stran, brada zůstává široká
    p.rect(x - 1, y + 12, 1, 12, barva);
    p.rect(x + w, y + 12, 1, 12, barva);
    p.rect(x + 2, y + h - 4, w - 4, 3, barva);
  }
  if (tvar === 'wide') {
    // laloky u čelisti (podsaditá tvář)
    p.rect(x - 1, y + h - 12, 2, 8, barva);
    p.rect(x + w - 1, y + h - 12, 2, 8, barva);
  }
  if (tvar === 'square') {
    // hranatá čelist do plné šířky
    p.rect(x + 1, y + h - 5, w - 2, 4, barva);
  }
  if (tvar === 'long') {
    // protažená brada dolů
    p.rect(x + 6, y + h, w - 12, 1 + roz, barva);
  }
}

// --- Oči, obočí, nos, ústa --------------------------------------------------
function kresliOci(p, r, f, rng) {
  const { cx, okoY } = r;
  const gaze = f.gaze || [0, 0];
  const gx = Math.max(-1, Math.min(1, gaze[0]));
  const gy = Math.max(-1, Math.min(1, gaze[1]));
  const vyska = f.eyes === 'squint' ? 2 : f.eyes === 'wide' ? 5 : f.eyes === 'tired' ? 3 : 4;
  const yOff = f.eyes === 'tired' || f.eyes === 'squint' ? 1 : 0;
  for (const strana of [-1, 1]) {
    const ex = strana < 0 ? cx - 10 : cx + 5; // levé/pravé bělmo, šířka 5
    p.rect(ex, okoY + yOff, 5, vyska, BELMO);
    // zornice s odleskem — drobný náhodný posun ať oči nejsou strojové
    const px = ex + 1 + (gx > 0 ? 2 : gx < 0 ? 0 : 1) + (rng() < 0.2 ? 1 : 0);
    const py = okoY + yOff + Math.max(0, Math.min(vyska - 2, 1 + gy));
    p.rect(px, py, 2, Math.min(2, vyska), ZORNICE);
    p.rect(px, py, 1, 1, '#8a94a0');
    if (f.eyes === 'tired') p.rect(ex, okoY + yOff + vyska, 5, 1, PLET_STIN); // váčky
    if (f.eyes === 'squint') p.rect(ex, okoY, 5, 1, PLET_TMAVA);              // přivřené víčko
    if (f.lashes) {
      p.rect(ex + (strana < 0 ? -1 : 5), okoY + yOff - 1, 1, 1, ZORNICE);     // řasy
      p.rect(ex + (strana < 0 ? 0 : 4), okoY + yOff - 1, 1, 1, ZORNICE);
    }
  }
}

function kresliOboci(p, r, f, rng) {
  const { cx, obociY } = r;
  const barva = ztmav(f.hairColor || '#3a2a20', 0.35);
  const kresli = (strana, styl) => {
    const s = strana; // -1 levé, +1 pravé
    const x = (dx, y, w, h) => p.rect(s < 0 ? cx - dx - w : cx + dx, y, w, h, barva);
    if (styl === 'flat') x(4, obociY, 7, 2);
    else if (styl === 'angry') { x(7, obociY - 1, 4, 2); x(4, obociY, 3, 2); x(4, obociY + 1, 2, 1); }
    else if (styl === 'sad') { x(7, obociY + 1, 4, 2); x(4, obociY, 3, 2); }
    else if (styl === 'raised') { x(9, obociY, 2, 2); x(5, obociY - 1, 5, 2); x(4, obociY, 2, 2); }
    else if (styl === 'bushy') {
      x(3, obociY - 1, 8, 3);
      for (let i = 0; i < 3; i++) x(4 + Math.floor(rng() * 6), obociY - 2, 1, 1); // rozčepýřené chlupy
    }
  };
  if (f.brows === 'thought') { kresli(-1, 'raised'); kresli(1, 'flat'); } // zamyšlená asymetrie
  else { kresli(-1, f.brows); kresli(1, f.brows); }
}

// Velký karikaturní nos — čím větší číslo, tím větší legrace
function kresliNos(p, r, f) {
  const { cx, okoY } = r;
  const velikost = f.noseSize || 2;
  const w = velikost === 1 ? 6 : velikost === 2 ? 8 : 10;
  const h = velikost === 1 ? 8 : velikost === 2 ? 9 : 10;
  const x = cx - Math.floor(w / 2); const y = okoY + 2;
  const svetla = michej(f.skin || PLET, PLET_SVETLA, 0.7);
  p.rect(x, y, w, h, svetla);                          // tělo nosu
  p.rect(x + w - 2, y + 1, 2, h - 1, PLET_STIN);       // stín vpravo
  p.rect(x + 1, y + h - 1, w - 1, 1, PLET_STIN);       // stín dole
  p.rect(x + w - 1, y + 2, 1, h - 2, PLET_TMAVA);      // obrys vpravo
  p.rect(x + 2, y + h, w - 3, 1, PLET_TMAVA);          // obrys dole
  if (f.noseBulb) {
    // bambulovitá špička přes celou šířku (Škromachovský klasik)
    p.rect(x - 1, y + h - 4, w + 2, 4, svetla);
    p.rect(x - 1, y + h - 4, 1, 4, PLET_STIN);
    p.rect(x + w, y + h - 4, 1, 4, PLET_TMAVA);
    p.rect(x, y + h, w, 1, PLET_TMAVA);
  }
  p.rect(x + 1, y + h - 2, 1, 1, PLET_TMAVA);          // nozdry
  p.rect(x + w - 3, y + h - 2, 1, 1, PLET_TMAVA);
  p.rect(x + 1, y + 1, 2, 2, PLET_SVETLA);             // odlesk
}

function kresliUsta(p, r, f) {
  const { cx, ustaY } = r;
  const linka = '#7a4030';
  const styl = f.mouth || 'neutral';
  if (styl === 'smile') {
    p.rect(cx - 5, ustaY + 1, 10, 1, linka);
    p.rect(cx - 6, ustaY, 1, 1, linka); p.rect(cx + 5, ustaY, 1, 1, linka); // koutky nahoru
    p.rect(cx - 3, ustaY + 2, 6, 1, RET);                                   // spodní ret
  } else if (styl === 'grin') {
    p.rect(cx - 6, ustaY - 1, 12, 1, linka);
    p.rect(cx - 6, ustaY, 12, 3, ZUBY);                                     // odhodlané zuby
    p.rect(cx - 6, ustaY + 3, 12, 1, linka);
    p.rect(cx - 7, ustaY - 1, 1, 2, linka); p.rect(cx + 6, ustaY - 1, 1, 2, linka);
    p.rect(cx - 2, ustaY, 1, 3, '#d8cfbc'); p.rect(cx + 2, ustaY, 1, 3, '#d8cfbc'); // spáry zubů
  } else if (styl === 'frown') {
    p.rect(cx - 5, ustaY, 10, 1, linka);
    p.rect(cx - 6, ustaY + 1, 1, 1, linka); p.rect(cx + 5, ustaY + 1, 1, 1, linka); // koutky dolů
  } else if (styl === 'smirk') {
    p.rect(cx - 3, ustaY + 1, 8, 1, linka);
    p.rect(cx + 5, ustaY, 1, 1, linka);                                     // jeden koutek nahoru
  } else if (styl === 'lips') {
    const barva = f.lipstick ? RTENKA : RET;
    p.rect(cx - 5, ustaY - 1, 10, 4, barva);                                // plné rty
    p.rect(cx - 6, ustaY, 1, 2, barva); p.rect(cx + 5, ustaY, 1, 2, barva);
    p.rect(cx - 5, ustaY + 1, 10, 1, ztmav(barva, 0.35));                   // linie mezi rty
    p.rect(cx - 3, ustaY - 1, 2, 1, zesvetli(barva, 0.3));                  // odlesk
  } else if (styl === 'open') {
    p.rect(cx - 3, ustaY - 1, 6, 4, ZORNICE);
    p.rect(cx - 2, ustaY + 1, 4, 2, '#7a2020');
  } else {
    p.rect(cx - 4, ustaY, 8, 1, linka);                                     // neutrální čárka
  }
}

// Mrožovitý knír překrývající horní ret
function kresliKnir(p, r, f) {
  if (!f.mustache) return;
  const { cx, ustaY } = r;
  const barva = ztmav(f.hairColor || '#5a4a3a', 0.15);
  if (f.mustache === 'walrus') {
    p.rect(cx - 8, ustaY - 3, 16, 3, barva);
    p.rect(cx - 9, ustaY - 2, 2, 4, barva); p.rect(cx + 7, ustaY - 2, 2, 4, barva); // svěšené konce
    p.rect(cx - 6, ustaY, 3, 1, barva); p.rect(cx + 3, ustaY, 3, 1, barva);         // rozevlátý spodek
    p.rect(cx - 4, ustaY - 3, 8, 1, zesvetli(barva, 0.2));                          // odlesk
  } else {
    p.rect(cx - 5, ustaY - 2, 10, 1, barva); // tenká linka
  }
}

// --- Brýle ------------------------------------------------------------------
function kresliBryle(p, r, f) {
  if (!f.glasses) return;
  const { cx, okoY, fx, fw } = r;
  const kov = '#3a3f45';
  for (const s of [-1, 1]) {
    const ex = s < 0 ? cx - 11 : cx + 4; // rámeček 7×6 kolem oka
    if (f.glasses === 'sunglasses') {
      p.rect(ex, okoY - 1, 7, 6, '#15161a');
      p.rect(ex + 1, okoY - 2, 5, 1, '#15161a'); p.rect(ex + 1, okoY + 5, 5, 1, '#15161a');
      p.rect(ex + 1, okoY, 2, 2, '#3d4550'); // odlesk skla
    } else {
      const kulate = f.glasses !== 'square';
      p.rect(ex + (kulate ? 1 : 0), okoY - 2, kulate ? 5 : 7, 1, kov); // horní
      p.rect(ex + (kulate ? 1 : 0), okoY + 4, kulate ? 5 : 7, 1, kov); // dolní
      p.rect(ex, okoY - (kulate ? 1 : 2), 1, kulate ? 5 : 7, kov);     // levý
      p.rect(ex + 6, okoY - (kulate ? 1 : 2), 1, kulate ? 5 : 7, kov); // pravý
    }
  }
  p.rect(cx - 4, okoY - 1, 8, 1, kov);                    // můstek přes nos
  p.rect(fx - 2, okoY, 2, 1, kov); p.rect(fx + fw, okoY, 2, 1, kov); // nožičky k uším
  if (f.glasses === 'chain') {
    // řetízek brýlí padající podél tváří (ombudsmanská klasika)
    for (let i = 0; i < 6; i++) {
      p.rect(fx - 3 - (i > 2 ? 1 : 0), okoY + 5 + i * 3, 1, 1, ZLATA);
      p.rect(fx + fw + 2 + (i > 2 ? 1 : 0), okoY + 5 + i * 3, 1, 1, ZLATA);
    }
  }
}

// --- Uši a náušnice ---------------------------------------------------------
function kresliUsi(p, r, f) {
  const zakryte = ['bob', 'wavy', 'partMiddle', 'hoodCap'].includes(f.hairStyle);
  if (zakryte) return;
  const { fx, fw, uchoY } = r;
  const plet = f.skin || PLET;
  p.rect(fx - 3, uchoY, 3, 6, PLET_TMAVA);        // obrys — velké karikaturní uši
  p.rect(fx + fw, uchoY, 3, 6, PLET_TMAVA);
  p.rect(fx - 2, uchoY, 2, 5, plet);
  p.rect(fx + fw, uchoY, 2, 5, plet);
  p.rect(fx - 2, uchoY + 2, 1, 2, PLET_STIN);     // ušní důlek
  p.rect(fx + fw + 1, uchoY + 2, 1, 2, PLET_STIN);
}

function kresliNausnice(p, r, f) {
  if (!f.earrings) return;
  const { fx, fw, uchoY } = r;
  const barva = f.earrings === 'pearl' ? BELMO : ZLATA;
  p.rect(fx - 2, uchoY + 7, 2, 2, barva);
  p.rect(fx + fw, uchoY + 7, 2, 2, barva);
  p.rect(fx - 1, uchoY + 8, 1, 1, ztmav(barva, 0.3));
  p.rect(fx + fw + 1, uchoY + 8, 1, 1, ztmav(barva, 0.3));
}

// --- Drobnokresba: vrásky, pihy, strniště, ruměnec, lícní kosti -------------
function kresliDetailyPleti(p, r, f, rng) {
  const { cx, fx, fw, top, ustaY, nosY, brada } = r;
  const plet = f.skin || PLET;
  // deterministický šum pleti — pár teček, ať tvář není sterilní
  for (let i = 0; i < 12; i++) {
    const x = fx + 2 + Math.floor(rng() * (fw - 4));
    const y = top + 2 + Math.floor(rng() * (r.fh - 4));
    p.rect(x, y, 1, 1, michej(plet, rng() < 0.5 ? PLET_STIN : PLET_SVETLA, 0.4));
  }
  if (f.wrinkles) {
    p.rect(cx - 5, top + 3, 10, 1, PLET_STIN);            // čelo
    p.rect(cx - 4, top + 5, 8, 1, michej(plet, PLET_STIN, 0.6));
    p.rect(fx + 3, r.okoY + 5, 2, 1, PLET_STIN);          // kouty očí
    p.rect(fx + fw - 5, r.okoY + 5, 2, 1, PLET_STIN);
    p.rect(cx - 7, ustaY - 3, 1, 3, PLET_STIN);           // nosoretní rýhy
    p.rect(cx + 6, ustaY - 3, 1, 3, PLET_STIN);
  }
  if (f.cheekbones) {
    p.rect(fx + 3, ustaY - 7, 3, 1, PLET_STIN);           // herecké lícní kosti
    p.rect(fx + fw - 6, ustaY - 7, 3, 1, PLET_STIN);
  }
  if (f.blush) {
    const ruz = michej(plet, '#e2606a', 0.45);
    p.rect(fx + 3, ustaY - 6, 3, 2, ruz);
    p.rect(fx + fw - 6, ustaY - 6, 3, 2, ruz);
  }
  if (f.freckles) {
    for (let i = 0; i < 6; i++) {
      const x = cx - 7 + Math.floor(rng() * 14);
      const y = nosY + 4 + Math.floor(rng() * 3);
      p.rect(x, y, 1, 1, '#c4885c');
    }
  }
  if (f.stubble) {
    for (let i = 0; i < 16; i++) {
      const x = fx + 3 + Math.floor(rng() * (fw - 6));
      const y = ustaY - 1 + Math.floor(rng() * (brada - ustaY));
      if (Math.abs(x - cx) < 7 && y < ustaY + 3) continue; // nekreslit přes ústa
      p.rect(x, y, 1, 1, '#8a7460');
    }
  }
}

// ============================================================================
// Účesy a pokrývky hlavy. „Za" vrstva se kreslí před obličejem (kadeře kolem),
// „před" vrstva po rysech (ofiny, čepice), aby překryla čelo.
// ============================================================================
function kresliVlasyZa(p, r, f, rng) {
  const { fx, fw, top, brada, uchoY } = r;
  const barva = f.hairColor || '#3a2a20';
  const tmava = ztmav(barva, 0.3);
  if (f.hairStyle === 'bob') {
    // mikádo — záclonky podél tváří až k čelisti
    p.rect(fx - 4, top - 1, 5, brada - top - 4, tmava);
    p.rect(fx + fw - 1, top - 1, 5, brada - top - 4, tmava);
    p.rect(fx - 3, top - 1, 4, brada - top - 5, barva);
    p.rect(fx + fw - 1, top - 1, 4, brada - top - 5, barva);
  } else if (f.hairStyle === 'wavy') {
    // velkoobjemová vlnitá hříva (herečka!)
    p.rect(fx - 6, top - 3, fw + 12, 7, tmava);
    p.rect(fx - 6, top, 6, 28, tmava);
    p.rect(fx + fw, top, 6, 28, tmava);
    p.rect(fx - 5, top - 2, fw + 10, 6, barva);
    p.rect(fx - 5, top, 5, 26, barva);
    p.rect(fx + fw, top, 5, 26, barva);
    for (let i = 0; i < 7; i++) {
      // zvlněný vnější okraj + lesklé prameny
      const y = top + 2 + i * 4;
      p.rect(fx - 6 - (i % 2), y, 1, 3, barva);
      p.rect(fx + fw + 5 + (i % 2), y, 1, 3, barva);
      p.rect(fx - 4 + (i % 2), top + 3 + i * 3, 1, 2, zesvetli(barva, 0.25));
      p.rect(fx + fw + 2 - (i % 2), top + 4 + i * 3, 1, 2, zesvetli(barva, 0.25));
    }
    p.rect(fx - 5, top + 26, 4, 2, tmava);   // koncové kudrny
    p.rect(fx + fw + 1, top + 26, 4, 2, tmava);
  } else if (f.hairStyle === 'partMiddle') {
    // hladké kadeře sčesané přes uši (portrét 19. století)
    p.rect(fx - 3, top, 4, uchoY - top + 8, tmava);
    p.rect(fx + fw - 1, top, 4, uchoY - top + 8, tmava);
    p.rect(fx - 2, top, 3, uchoY - top + 7, barva);
    p.rect(fx + fw - 1, top, 3, uchoY - top + 7, barva);
  } else if (f.hairStyle === 'ponytail') {
    // culík švihnutý doleva za hlavou
    p.rect(fx - 5, top - 3, 4, 4, barva);
    p.rect(fx - 7, top - 1, 4, 7, barva);
    p.rect(fx - 8, top + 5, 3, 6, barva);
    p.rect(fx - 7, top + 10, 2, 4, ztmav(barva, 0.2)); // švih špičky
    p.rect(fx - 4, top - 2, 1, 3, tmava);              // gumička
  } else if (f.hairStyle === 'hoodCap') {
    // kapuce rámující celou hlavu až na ramena
    const kapuce = '#2b2e35';
    p.rect(fx - 5, top - 6, fw + 10, 5, kapuce);
    p.rect(fx - 5, top - 3, 5, brada - top + 5, kapuce);
    p.rect(fx + fw, top - 3, 5, brada - top + 5, kapuce);
    p.rect(fx - 4, top - 2, 3, brada - top + 3, '#191b20'); // vnitřní stín
    p.rect(fx + fw + 1, top - 2, 3, brada - top + 3, '#191b20');
  }
}

function kresliVlasyPred(p, r, f, rng) {
  const { fx, fw, top, cx, uchoY } = r;
  const barva = f.hairColor || '#3a2a20';
  const tmava = ztmav(barva, 0.3);
  const lesk = zesvetli(barva, 0.2);
  const styl = f.hairStyle;
  if (styl === 'short') {
    p.rect(fx - 1, top - 3, fw + 2, 2, tmava);          // tmavší podklad = obrys
    p.rect(fx - 1, top - 2, fw + 2, 3, barva);
    p.rect(fx + 1, top - 3, fw - 2, 1, barva);
    p.rect(fx - 2, top, 2, 7, barva);                   // spánky
    p.rect(fx + fw, top, 2, 7, barva);
    for (let i = 0; i < 6; i++) p.rect(fx + 1 + i * Math.floor(fw / 6), top + 1, 2, 1, barva); // zubatá linka
    p.rect(fx + 3, top - 2, 6, 1, lesk);
  } else if (styl === 'combover') {
    // patka sčesaná z boku, ustupující kouty
    p.rect(fx - 1, top - 3, fw + 2, 2, tmava);
    p.rect(fx - 1, top - 2, fw + 2, 3, barva);
    p.rect(fx - 1, top + 1, 8, 1, barva);               // patka níž na jedné straně
    p.rect(fx + fw - 8, top - 1, 6, 2, f.skin || PLET); // ustupující kout
    p.rect(fx - 2, top, 2, 6, barva);
    p.rect(fx + fw, top + 1, 2, 5, barva);
    p.rect(fx + 1, top - 2, 10, 1, lesk);               // ulíznutý pramen
  } else if (styl === 'balding') {
    // pleš s věnečkem — čelo se leskne jak úřední razítko
    p.rect(fx - 2, uchoY - 7, 3, 10, barva);
    p.rect(fx + fw - 1, uchoY - 7, 3, 10, barva);
    p.rect(fx - 2, uchoY - 7, 3, 1, tmava);
    p.rect(fx + fw - 1, uchoY - 7, 3, 1, tmava);
    for (let i = 0; i < 3; i++) p.rect(fx + 4 + i * 8 + Math.floor(rng() * 3), top - 1, 2, 1, barva); // poslední vlásky
    p.rect(fx + 5, top + 1, fw - 10, 1, PLET_SVETLA);
    p.rect(cx - 3, top + 1, 2, 1, '#fdf6ea');           // odlesk pleši
  } else if (styl === 'bob') {
    p.rect(fx - 4, top - 4, fw + 8, 2, tmava);
    p.rect(fx - 4, top - 3, fw + 8, 3, barva);
    if (f.bangs) {
      p.rect(fx - 2, top - 1, fw + 4, 3, barva);        // rovná ofina
      for (let i = 0; i < 7; i++) p.rect(fx + i * Math.floor(fw / 6), top + 2, 2, 1, barva);
    } else {
      p.rect(fx - 2, top - 1, 10, 2, barva);            // ofina na stranu
      p.rect(fx + 4, top + 1, 5, 1, barva);
    }
    p.rect(fx + 2, top - 3, 8, 1, lesk);
  } else if (styl === 'ponytail') {
    p.rect(fx - 1, top - 4, fw + 2, 2, tmava);
    p.rect(fx + 1, top - 5, fw - 2, 1, tmava);
    p.rect(fx - 1, top - 3, fw + 2, 3, barva);          // hladce staženo dozadu
    p.rect(fx + 1, top - 4, fw - 2, 1, barva);
    p.rect(fx - 2, top - 1, 2, 8, barva);
    p.rect(fx + fw, top - 1, 2, 8, barva);
    p.rect(fx + 3, top - 3, fw - 6, 1, lesk);
    p.rect(fx - 1, top, fw + 2, 1, '#f4f1e8');          // sportovní čelenka
  } else if (styl === 'wavy') {
    p.rect(fx - 2, top - 3, fw + 4, 3, barva);
    p.rect(fx - 1, top, 4, 4, barva);                   // rámující lokny
    p.rect(fx + fw - 3, top, 4, 4, barva);
    p.rect(fx + 3, top - 2, 7, 1, lesk);
  } else if (styl === 'partMiddle') {
    p.rect(fx - 1, top - 3, fw + 2, 2, tmava);
    p.rect(fx - 1, top - 2, fw + 2, 3, barva);
    p.rect(cx, top - 2, 1, 3, michej(barva, PLET, 0.45)); // pěšinka uprostřed
    p.rect(fx + 2, top - 2, 6, 1, lesk); p.rect(cx + 3, top - 2, 6, 1, lesk);
  } else if (styl === 'partSide') {
    // vysoké čelo génia — vlasová linka posazená vysoko
    p.rect(fx - 1, top - 4, fw + 2, 2, tmava);
    p.rect(fx - 1, top - 3, fw + 2, 2, barva);
    p.rect(cx - 7, top - 3, 1, 2, michej(barva, PLET, 0.45)); // pěšinka na boku
    p.rect(cx - 6, top - 1, fw / 2 + 4, 1, barva);      // sčesáno na stranu
    p.rect(fx - 2, top - 1, 2, 5, barva);
    p.rect(fx + fw, top - 1, 2, 5, barva);
    p.rect(cx - 4, top - 3, 8, 1, lesk);
    p.rect(fx + 4, top + 1, fw - 8, 1, PLET_SVETLA);    // lesk vysokého čela
  } else if (styl === 'slick') {
    p.rect(fx - 1, top - 4, fw + 2, 2, tmava);
    p.rect(fx - 1, top - 3, fw + 2, 3, barva);
    p.rect(fx + 4, top - 5, 8, 1, barva);               // elegantní vlna
    p.rect(cx - 6, top - 3, 1, 3, michej(barva, PLET, 0.4)); // pěšinka
    p.rect(fx - 2, top - 1, 2, 8, barva);
    p.rect(fx + fw, top - 1, 2, 8, barva);
    p.rect(fx + 6, top - 3, 9, 1, '#eef1f3');           // stříbrný lesk
  } else if (styl === 'romantic') {
    // obrozenecké rozevláté kadeře
    p.rect(fx - 2, top - 4, fw + 4, 2, tmava);
    p.rect(fx - 2, top - 3, fw + 4, 4, barva);
    for (let i = 0; i < 6; i++) p.rect(fx + i * Math.floor(fw / 5) - 1, top - 5 + (i % 2), 2, 2, barva); // kudrliny
    p.rect(fx - 3, top - 1, 3, 8, barva);
    p.rect(fx + fw, top - 1, 3, 8, barva);
    p.rect(fx + 3, top - 3, 6, 1, lesk);
  } else if (styl === 'hoodCap') {
    // kšiltovka pod kapucí
    const cep = f.capColor || '#101114';
    p.rect(fx - 1, top - 4, fw + 2, 5, cep);
    p.rect(fx - 3, top + 1, fw + 6, 2, ztmav(cep, 0.1)); // kšilt
    p.rect(fx - 3, top + 1, fw + 6, 1, '#2e3138');
    p.rect(fx, top + 3, fw, 1, michej(f.skin || PLET, '#000000', 0.4)); // stín kšiltu na čele
    p.rect(cx, top - 4, 1, 1, '#3a3f45');               // knoflík
  } else if (styl === 'militaryCap') {
    // generálská brigadýrka — talíř širší než hlava
    const cep = f.capColor || '#31452f';
    p.rect(fx - 4, top - 7, fw + 8, 2, ztmav(cep, 0.35));
    p.rect(fx - 4, top - 6, fw + 8, 3, cep);
    p.rect(fx - 2, top - 3, fw + 4, 3, ztmav(cep, 0.35)); // dýnko/pásek
    p.rect(fx - 2, top - 1, fw + 4, 1, ZLATA);            // zlatá šňůra
    p.rect(fx + 2, top, fw - 4, 2, '#15161a');            // lakovaný kšilt
    hvezdicka(p, cx, top - 5, ZLATA, true);               // maršálská hvězda
    p.rect(fx - 1, top + 2, 2, 4, f.hairColor || '#5a4c3c'); // vlasy pod čepicí
    p.rect(fx + fw - 1, top + 2, 2, 4, f.hairColor || '#5a4c3c');
  }
  if (f.sideburns) {
    // KOTLETY — pýcha národního obrození
    const kb = f.hairColor || '#3b2b1d';
    p.rect(fx, uchoY - 6, 3, 13, kb);
    p.rect(fx + fw - 3, uchoY - 6, 3, 13, kb);
    for (let i = 0; i < 5; i++) {
      p.rect(fx + 3, uchoY - 4 + i * 2, 1, 1, kb);      // rozježený vnitřní okraj
      p.rect(fx + fw - 4, uchoY - 4 + i * 2, 1, 1, kb);
    }
    p.rect(fx, uchoY + 5, 4, 2, kb);                     // rozšířené konce u čelisti
    p.rect(fx + fw - 4, uchoY + 5, 4, 2, kb);
  }
}

// ============================================================================
// Kompletní hlava — sdílí ji busta i 48×48 textura obličeje (stejný seed →
// stejná tvář). Pořadí vrstev je důležité!
// ============================================================================
function kresliHlavu(p, r, f, rng) {
  const plet = f.skin || PLET;
  kresliVlasyZa(p, r, f, rng);
  kresliUsi(p, r, f);
  tvarObliceje(p, r, f.faceShape, 1, OBRYS);            // komiksový obrys
  tvarObliceje(p, r, f.faceShape, 0, plet);             // pleť
  // měkké stínování: světlé čelo, stín na pravé tváři a pod bradou
  p.rect(r.fx + 4, r.top + 2, r.fw - 8, 2, michej(plet, PLET_SVETLA, 0.7));
  p.rect(r.fx + r.fw - 3, r.top + 6, 2, r.fh - 12, michej(plet, PLET_STIN, 0.55));
  p.rect(r.fx + 5, r.brada - 2, r.fw - 10, 2, michej(plet, PLET_STIN, 0.5));
  p.rect(r.fx + 4, r.okoY + 6, 2, 2, michej(plet, PLET_SVETLA, 0.6)); // jiskra na tváři
  kresliDetailyPleti(p, r, f, rng);
  kresliOboci(p, r, f, rng);
  kresliOci(p, r, f, rng);
  kresliNos(p, r, f);
  kresliUsta(p, r, f);
  kresliKnir(p, r, f);
  kresliVlasyPred(p, r, f, rng);
  kresliBryle(p, r, f);
  kresliNausnice(p, r, f);
  kresliDoplnky(p, r, f, 'hlava', rng, null);           // např. divadelní maska
}

// Tenký krk — pod obří hlavou působí komicky křehce
function kresliKrk(p, r, f) {
  const plet = f.skin || PLET;
  p.rect(r.cx - 4, r.brada - 5, 8, 14, PLET_TMAVA);     // obrys
  p.rect(r.cx - 3, r.brada - 5, 6, 14, michej(plet, PLET_STIN, 0.5));
  p.rect(r.cx - 3, r.brada, 6, 2, michej(plet, PLET_STIN, 0.9)); // stín pod bradou
}

// ============================================================================
// Ramena a oblečení. Úzká ramena pod balvanem hlavy = správný poměr karikatury.
// ============================================================================
function zakladRamen(p, barva, roz) {
  p.rect(14 - roz, 46 - roz, 20 + roz * 2, 5, barva);
  p.rect(9 - roz, 49 - roz, 30 + roz * 2, 5, barva);
  p.rect(5 - roz, 52 - roz, 38 + roz * 2, 12 + roz, barva);
  p.rect(2 - roz, 56 - roz, 44 + roz * 2, 8 + roz, barva);
}

function kresliObleceni(p, r, f, rng) {
  const c = f.clothingColor || '#3a4250';
  const kosile = f.shirtColor || '#f2efe8';
  const styl = f.clothing || 'suit';
  const plet = f.skin || PLET;

  if (styl === 'tank' || styl === 'gown') {
    // holá ramena (sportovkyně / večerní róba)
    zakladRamen(p, ztmav(plet, 0.45), 1);
    zakladRamen(p, plet, 0);
    p.rect(6, 54, 2, 8, PLET_STIN); p.rect(40, 54, 2, 8, PLET_STIN); // obrys paží
  } else {
    zakladRamen(p, ztmav(c, 0.4), 1);
    zakladRamen(p, c, 0);
  }

  if (styl === 'suit' || styl === 'blazer' || styl === 'tweed') {
    p.rect(20, 46, 8, 18, kosile);                       // košile
    const klopa = ztmav(c, 0.25);
    p.rect(18, 47, 2, 4, klopa); p.rect(17, 51, 2, 5, klopa); p.rect(16, 56, 2, 8, klopa); // klopy
    p.rect(28, 47, 2, 4, klopa); p.rect(29, 51, 2, 5, klopa); p.rect(30, 56, 2, 8, klopa);
    p.rect(19, 46, 3, 3, michej(kosile, '#000000', 0.12)); // límeček
    p.rect(26, 46, 3, 3, michej(kosile, '#000000', 0.12));
    if (f.tie === 'tie') {
      const sirka = styl === 'tweed' ? 3 : 4;            // Čapkova úzká kravata
      p.rect(24 - Math.ceil(sirka / 2), 48, sirka, 3, ztmav(f.tieColor, 0.2)); // uzel
      p.rect(24 - Math.ceil(sirka / 2), 51, sirka, 10, f.tieColor);
      p.rect(24 - 1, 61, 2, 2, ztmav(f.tieColor, 0.15)); // špička
    } else if (f.tie === 'bowtie') {
      p.rect(18, 48, 5, 4, f.tieColor); p.rect(25, 48, 5, 4, f.tieColor); // motýlek
      p.rect(23, 49, 2, 2, ztmav(f.tieColor, 0.3));
      p.rect(19, 49, 1, 1, zesvetli(f.tieColor, 0.25)); p.rect(26, 49, 1, 1, zesvetli(f.tieColor, 0.25));
    }
    if (f.pocketSquare) p.rect(33, 54, 3, 2, '#f4f1e8'); // kapesníček šviháka
    if (styl === 'tweed') {
      for (let i = 0; i < 14; i++) {
        // tvídová textura náhodnými tečkami
        const x = 4 + Math.floor(rng() * 40); const y = 50 + Math.floor(rng() * 13);
        if (x > 19 && x < 29) continue;
        p.rect(x, y, 1, 1, michej(c, rng() < 0.5 ? '#000000' : '#ffffff', 0.18));
      }
    }
    if (styl === 'blazer') {
      p.rect(21, 46, 6, 9, kosile);                      // rozhalenka
      p.rect(17, 50, 2, 2, ZLATA);                       // brož
      p.rect(24, 56, 1, 1, ZLATA); p.rect(24, 60, 1, 1, ZLATA); // knoflíky
    }
  } else if (styl === 'uniform') {
    p.rect(23, 47, 2, 17, ztmav(c, 0.3));                // léga
    p.rect(21, 50, 1, 1, ZLATA); p.rect(21, 55, 1, 1, ZLATA); p.rect(21, 60, 1, 1, ZLATA);
    p.rect(26, 50, 1, 1, ZLATA); p.rect(26, 55, 1, 1, ZLATA); p.rect(26, 60, 1, 1, ZLATA);
    p.rect(19, 46, 4, 2, '#7a1f1f'); p.rect(25, 46, 4, 2, '#7a1f1f'); // výložky
    // epolety s třásněmi — maršál jak z operety
    p.rect(3, 51, 10, 3, ZLATA); p.rect(35, 51, 10, 3, ZLATA);
    p.rect(3, 51, 10, 1, zesvetli(ZLATA, 0.3)); p.rect(35, 51, 10, 1, zesvetli(ZLATA, 0.3));
    for (let i = 0; i < 5; i++) { p.rect(3 + i * 2, 54, 1, 2, ZLATA); p.rect(35 + i * 2, 54, 1, 2, ZLATA); }
    hvezdicka(p, 7, 52, ztmav(c, 0.4), false); hvezdicka(p, 40, 52, ztmav(c, 0.4), false);
  } else if (styl === 'shirt') {
    // plandavá odborářská košile s kšandami
    p.rect(17, 46, 5, 4, zesvetli(c, 0.18)); p.rect(26, 46, 5, 4, zesvetli(c, 0.18)); // rozhalený límec
    p.rect(21, 46, 6, 3, plet);                          // rozhalenka až na hruď
    p.rect(22, 49, 4, 2, plet);
    for (let i = 0; i < 4; i++) p.rect(8 + Math.floor(rng() * 14) + (i % 2) * 16, 53 + i * 3, 5, 1, ztmav(c, 0.18)); // pomačkání
    p.rect(12, 48, 3, 16, '#a03028'); p.rect(33, 48, 3, 16, '#a03028'); // kšandy
    p.rect(13, 57, 1, 1, ZLATA); p.rect(34, 57, 1, 1, ZLATA);           // přezky
  } else if (styl === 'hoodie') {
    p.rect(14, 45, 20, 3, zesvetli(c, 0.15));            // lem kapuce
    p.rect(12, 47, 24, 2, zesvetli(c, 0.08));
    p.rect(21, 50, 1, 6, '#cfd2d8'); p.rect(26, 50, 1, 6, '#cfd2d8'); // šňůrky
    p.rect(21, 56, 1, 1, '#8a8f96'); p.rect(26, 56, 1, 1, '#8a8f96');
    // masivní zlatý řetěz s medailonem
    const retez = [[15, 50], [18, 52], [21, 54], [24, 55], [27, 54], [30, 52], [33, 50]];
    for (const [x, y] of retez) { p.rect(x, y, 2, 2, ZLATA); p.rect(x + 1, y + 1, 1, 1, ztmav(ZLATA, 0.35)); }
    p.rect(22, 57, 4, 4, ZLATA); p.rect(23, 58, 2, 2, ztmav(ZLATA, 0.4)); // medailon
  } else if (styl === 'cardigan') {
    p.rect(20, 46, 8, 9, kosile);                        // halenka
    p.rect(18, 46, 3, 2, kosile); p.rect(27, 46, 3, 2, kosile); // kulatý límeček
    p.rect(23, 52, 2, 12, ztmav(c, 0.2));                // zapínání
    p.rect(23, 54, 1, 1, ZLATA); p.rect(23, 58, 1, 1, ZLATA); p.rect(23, 61, 1, 1, ZLATA);
    p.rect(17, 49, 2, 2, '#c87e2a');                     // jantarová brož
  } else if (styl === 'tank') {
    // sportovní tílko přes holá atletická ramena
    p.rect(15, 46, 4, 3, c); p.rect(29, 46, 4, 3, c);  // ramínka
    p.rect(14, 48, 20, 16, c);
    p.rect(14, 48, 1, 16, ztmav(c, 0.25)); p.rect(33, 48, 1, 16, ztmav(c, 0.25));
    p.rect(14, 52, 20, 1, '#f2f2f2');                  // závodní pruh
    p.rect(14, 53, 20, 1, ztmav(c, 0.15));
  } else if (styl === 'gown') {
    // večerní šaty od poloviny ramen + perlový náhrdelník
    p.rect(5, 55, 38, 9, ztmav(c, 0.35));
    p.rect(6, 56, 36, 8, c); p.rect(2, 58, 44, 6, c);
    p.rect(14, 54, 20, 2, c);                            // výstřih
    p.rect(14, 54, 20, 1, zesvetli(c, 0.2));
    const perly = [[16, 47], [19, 49], [22, 50], [25, 50], [28, 49], [31, 47]];
    for (const [x, y] of perly) { p.rect(x, y, 2, 2, BELMO); p.rect(x + 1, y + 1, 1, 1, '#c9c2b4'); }
  } else if (styl === 'dress19') {
    // krajkový límec přes ramena (dvě vrstvy obloučků) + kamej
    p.rect(15, 46, 18, 3, '#f4f1e8');
    for (let i = 0; i < 6; i++) p.rect(15 + i * 3, 49, 2, 1, '#f4f1e8');
    p.rect(12, 50, 24, 2, '#efeadd');
    for (let i = 0; i < 8; i++) p.rect(12 + i * 3, 52, 2, 1, '#efeadd');
    for (let i = 0; i < 5; i++) p.rect(14 + Math.floor(rng() * 20), 47 + Math.floor(rng() * 4), 1, 1, '#d8d2c2'); // dírkování krajky
    p.rect(22, 46, 3, 4, '#d8c9b8'); p.rect(23, 47, 1, 2, '#8a4a3a'); // kamejová brož
  } else if (styl === 'coat19') {
    // vysoký škrobený límec + černá vázanka (dandy 19. století)
    const klopa = ztmav(c, 0.25);
    p.rect(16, 48, 3, 16, klopa); p.rect(29, 48, 3, 16, klopa);
    p.rect(16, 42, 4, 7, '#f4f1e8'); p.rect(28, 42, 4, 7, '#f4f1e8'); // špičky límce u tváří
    p.rect(17, 41, 3, 2, '#f4f1e8'); p.rect(28, 41, 3, 2, '#f4f1e8');
    p.rect(19, 47, 10, 4, '#1e1c1a');                    // vázanka omotaná kolem krku
    p.rect(22, 48, 4, 2, '#3a3634');                     // uzel
  }
}

// ============================================================================
// Doplňky (props). faze: 'pozadi' (za postavou), 'popredi' (před postavou),
// 'hlava' (součást hlavy → dostane se i do 48×48 textury obličeje).
// Žádné texty, žádná extremistická symbolika — jen čitelné rekvizity.
// ============================================================================
const DOPLNKY = {
  // Tchajwanská vlaječka na žerdi v levém horním rohu (rudá, modrý roh, slunce)
  taiwanFlag: { faze: 'pozadi', kresli(p) {
    p.rect(1, 2, 1, 26, '#8a8f96');                    // žerď
    p.rect(1, 1, 1, 1, ZLATA);
    p.rect(2, 2, 9, 6, CERVENA);
    p.rect(2, 8, 9, 1, ztmav(CERVENA, 0.3));
    p.rect(2, 2, 4, 3, '#1f3d8c');                     // modrý kanton
    p.rect(3, 3, 2, 1, BELMO);                         // bílé slunce
  } },
  // Miniaturní vlaječka na klopě
  lapelTaiwan: { faze: 'popredi', kresli(p) {
    p.rect(16, 50, 4, 3, CERVENA);
    p.rect(16, 50, 2, 2, '#1f3d8c');
  } },
  // Zlatý křížek na klopě
  lapelCross: { faze: 'popredi', kresli(p) {
    p.rect(17, 49, 1, 4, ZLATA);
    p.rect(16, 50, 3, 1, ZLATA);
    p.rect(17, 52, 1, 1, ztmav(ZLATA, 0.3));
  } },
  // Malá rudá hvězdička na klopě (historická zkratka, decentně malá)
  lapelStar: { faze: 'popredi', kresli(p) {
    hvezdicka(p, 17, 50, CERVENA, false);
  } },
  // Věneček zlatých hvězdiček EU kolem hlavy
  euStars: { faze: 'popredi', kresli(p, r) {
    const { cx, top } = r;
    const pozice = [[-17, 5], [-13, -3], [-6, -7], [2, -8], [10, -5], [16, 2]];
    for (const [dx, dy] of pozice) hvezdicka(p, cx + dx, top + dy, ZLATA, true);
  } },
  // Odborářský transparent nad hlavou — bílá vlnovka místo hesla (žádný text!)
  banner: { faze: 'pozadi', kresli(p) {
    p.rect(44, 7, 1, 39, '#7a5a34');                   // žerď za ramenem
    p.rect(43, 6, 3, 1, '#7a5a34');
    p.rect(30, 0, 15, 7, CERVENA);
    p.rect(30, 6, 15, 1, ztmav(CERVENA, 0.3));
    for (let i = 0; i < 11; i++) p.rect(32 + i, 2 + (i % 2), 1, 1, BELMO); // heslo-vlnovka
    p.rect(31, 7, 2, 1, CERVENA); p.rect(36, 7, 2, 1, CERVENA); p.rect(41, 7, 2, 1, CERVENA); // cípy
  } },
  // Diplomatický lístek s pečetí u kapsy
  diplomatNote: { faze: 'popredi', kresli(p) {
    p.rect(29, 52, 9, 6, '#e8e2d2');
    p.rect(29, 52, 9, 1, '#f4f1e8');
    p.rect(30, 53, 1, 1, '#c9bfa8'); p.rect(31, 54, 1, 1, '#c9bfa8'); p.rect(32, 55, 1, 1, '#c9bfa8'); // klopa obálky
    p.rect(33, 55, 1, 1, '#c9bfa8'); p.rect(34, 54, 1, 1, '#c9bfa8'); p.rect(35, 53, 1, 1, '#c9bfa8');
    p.rect(32, 55, 2, 2, CERVENA);                     // vosková pečeť
  } },
  // Raketka letící u ramene (vesmírné ambice)
  rocket: { faze: 'popredi', kresli(p) {
    p.rect(39, 41, 4, 10, '#dfe3e8');
    p.rect(42, 41, 1, 10, '#aab2bc');                  // stín trupu
    p.rect(40, 39, 2, 2, CERVENA);                     // špička
    p.rect(40, 43, 2, 2, '#2e6bb0');                   // okénko
    p.rect(38, 49, 1, 3, CERVENA); p.rect(43, 49, 1, 3, CERVENA); // křidélka
    p.rect(40, 51, 2, 2, '#e8912a'); p.rect(40, 53, 2, 1, '#f2c14e'); // plamen
    p.rect(41, 54, 1, 1, '#f8e39a');
  } },
  // Oštěp šikmo přes rameno, hrot vzhůru
  javelin: { faze: 'popredi', kresli(p) {
    cara(p, 33, 63, 43, 13, 1, '#9aa0a6');
    p.rect(43, 11, 1, 2, '#6a7076'); p.rect(42, 13, 1, 1, '#6a7076'); // hrot
    p.rect(44, 10, 1, 1, '#6a7076');
    p.rect(38, 37, 2, 1, '#c94f3d'); p.rect(37, 40, 2, 1, '#c94f3d'); // vinutí úchopu
  } },
  // Graffiti v pozadí — svislé sprejové tagy u okrajů (kapuce zabírá střed),
  // abstraktní klikyháky beze slov
  graffiti: { faze: 'pozadi', kresli(p, r, f, rng) {
    const tagy = [
      { x: 1, y: 4, barva: '#e055a0' },
      { x: 44, y: 2, barva: '#4fd05a' },
      { x: 1, y: 24, barva: '#e8b93a' },
      { x: 44, y: 22, barva: '#4aa6ff' },
    ];
    for (const t of tagy) {
      let x = t.x;
      for (let i = 0; i < 10; i++) {
        x += rng() < 0.5 ? -1 : 1;                     // klikatá čára padající dolů
        if (x < 0) x = 0; if (x > 46) x = 46;
        p.rect(x, t.y + i, 2, 1, t.barva);
      }
      p.rect(t.x + 1, t.y + 10, 1, 3 + Math.floor(rng() * 3), t.barva); // stékající barva
      p.rect(t.x, t.y - 1, 3, 1, zesvetli(t.barva, 0.3));               // sprejový začátek
    }
  } },
  // Divadelní maska přes pravou polovinu tváře (kreslí se do hlavy!)
  theaterMask: { faze: 'hlava', kresli(p, r) {
    const { cx, top, fx, fw, okoY, obociY, ustaY } = r;
    const bila = '#f2ede4';
    const hw = fx + fw - cx + 1;
    p.rect(cx, top + 4, hw - 2, ustaY - top - 2, bila);   // tělo masky
    p.rect(cx, top + 6, hw, ustaY - top - 6, bila);       // zaoblení k uchu
    p.rect(cx, top + 4, 1, ustaY - top - 2, '#d8d2c4');   // stín u hrany
    p.rect(cx + 2, top + 3, hw - 6, 1, bila);             // horní obloučk
    p.rect(cx + 4, okoY, 6, 4, '#23232b');                // oční otvor
    p.rect(cx + 4, obociY, 7, 1, '#d8d2c4');              // reliéf obočí
    p.rect(cx + 3, ustaY - 3, 5, 1, '#d8d2c4');           // náznak úsměvu masky
    p.rect(cx + 5, ustaY + 1, hw - 6, 1, bila);           // bradka masky
    p.rect(fx + fw - 1, okoY + 1, 4, 1, '#3a3038');       // stužka k uchu
  } },
  // Ombudsmanská listina — svitek s pečetí
  scroll: { faze: 'popredi', kresli(p) {
    p.rect(37, 46, 6, 13, '#e8d9b8');
    p.rect(36, 45, 8, 2, '#d3bf96'); p.rect(36, 58, 8, 2, '#d3bf96'); // role
    p.rect(36, 45, 8, 1, '#c4ad82'); p.rect(36, 59, 8, 1, '#c4ad82');
    p.rect(42, 47, 1, 11, '#d3bf96');                  // stín okraje
    p.rect(39, 51, 2, 2, CERVENA);                     // pečeť
  } },
  // Divadelní vějíř u ramene — plná skládaná výseč
  fan: { faze: 'popredi', kresli(p) {
    for (let y = 44; y <= 56; y++) {
      // klín rozevřený vlevo nahoru, sbíhá se k pivotu (40, 57)
      const t = (y - 44) / 13;
      const xL = Math.round(31 + 9 * t);
      const xR = Math.round(46 - 6 * t);
      p.rect(xL, y, xR - xL + 1, 1, '#d8a53c');
    }
    cara(p, 40, 56, 33, 45, 1, '#a8324a');             // skládané žebrování
    cara(p, 40, 56, 39, 44, 1, '#a8324a');
    cara(p, 40, 56, 45, 46, 1, '#a8324a');
    p.rect(31, 44, 16, 1, '#8a2438');                  // vnější lem
    p.rect(39, 56, 3, 3, '#5a3a26');                   // pivot v „ruce"
  } },
  // Kniha Babička u ramene (bez nápisu, jen rámeček)
  book: { faze: 'popredi', kresli(p) {
    p.rect(36, 47, 9, 13, '#2f5e3f');
    p.rect(36, 47, 2, 13, ztmav('#2f5e3f', 0.35));     // hřbet
    p.rect(44, 48, 1, 11, '#f4f1e8');                  // stránky
    p.rect(39, 49, 5, 9, zesvetli('#2f5e3f', 0.18));   // slepý rámeček desek
    p.rect(40, 50, 3, 7, '#2f5e3f');
    p.rect(41, 52, 1, 3, ZLATA);                       // zlacený ornament
  } },
  // Divadelní program — přeložený papír s abstraktními řádky
  program: { faze: 'popredi', kresli(p) {
    p.rect(36, 47, 7, 11, '#efe6cc');
    p.rect(36, 47, 7, 1, '#f6efdb');
    p.rect(42, 47, 1, 2, '#d3c5a2');                   // ohnutý růžek
    p.rect(38, 50, 4, 1, '#c9bfa8'); p.rect(38, 53, 4, 1, '#c9bfa8'); // ozdobné linky (ne písmo)
    p.rect(38, 55, 2, 1, '#a8324a');                   // divadelní pečeť
  } },
  // Plechový robůtek u ramene (autor slova robot!)
  robot: { faze: 'popredi', kresli(p) {
    p.rect(40, 40, 1, 2, '#8a8f96'); p.rect(40, 39, 1, 1, CERVENA); // anténka
    p.rect(37, 42, 7, 5, '#b9c0c8');                   // hlava
    p.rect(37, 42, 7, 1, '#d5dae0');
    p.rect(38, 44, 2, 2, '#4fd05a'); p.rect(41, 44, 2, 2, '#4fd05a'); // svítící oči
    p.rect(38, 46, 5, 1, '#6a7076');                   // mřížka úst
    p.rect(36, 48, 9, 9, '#9aa2ac');                   // tělo
    p.rect(36, 48, 9, 1, '#c2c9d1');
    p.rect(38, 50, 5, 4, '#6a7076'); p.rect(39, 51, 2, 2, CERVENA); // panel s kontrolkou
    p.rect(42, 52, 1, 1, '#e8b93a');
    p.rect(36, 48, 1, 1, '#5a6068'); p.rect(44, 48, 1, 1, '#5a6068'); // nýty
    p.rect(36, 56, 1, 1, '#5a6068'); p.rect(44, 56, 1, 1, '#5a6068');
    p.rect(35, 49, 1, 5, '#8a8f96'); p.rect(45, 49, 1, 5, '#8a8f96'); // paže
  } },
};

function kresliDoplnky(p, r, f, faze, rng, barvaPostavy) {
  for (const nazev of f.props || []) {
    const d = DOPLNKY[nazev];
    if (d && d.faze === faze) d.kresli(p, r, f, rng, barvaPostavy);
  }
}

// ============================================================================
// Pozadí — pruhovaný vertikální gradient z barvy postavy (hrubé pásy, ať drží
// pixel-art zrno). bgDark ztmaví scénu (underground!).
// ============================================================================
function kresliPozadi(p, barvaPostavy, f) {
  const horni = f.bgDark ? michej(barvaPostavy, '#15161c', 0.55) : zesvetli(barvaPostavy, 0.38);
  const dolni = f.bgDark ? '#0c0d12' : ztmav(barvaPostavy, 0.45);
  const pasu = 11;
  for (let i = 0; i < pasu; i++) {
    p.rect(0, i * 6, MRIZ_W, 6, michej(horni, dolni, i / (pasu - 1)));
  }
}

// ============================================================================
// VEŘEJNÉ API
// ============================================================================

// Poskládá rysy: neznámé id dostane generickou tvář, ať nikdy nespadneme
function rysyProPostavu(character) {
  return { ...VYCHOZI_RYSY, ...(CARICATURE_FEATURES[character?.id] || {}) };
}

/**
 * Nakreslí karikaturu do dodaného canvasu (vynutí 192×256).
 * Vrací canvas, nebo null bez DOM / s nepoužitelným canvasem.
 */
export function drawCaricature(character, canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = SIRKA;
  canvas.height = VYSKA;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const f = rysyProPostavu(character);
  const seed = seedZId(character?.id);
  const barva = character?.color || '#5a6a8a';
  const p = vytvorKreslire(ctx, ZRNO, 0, 0);
  const r = rozlozeni(f);

  kresliPozadi(p, barva, f);
  kresliDoplnky(p, r, f, 'pozadi', vytvorRng(seed ^ 0xbeef), barva);
  kresliKrk(p, r, f);
  kresliObleceni(p, r, f, vytvorRng(seed ^ 0xcafe));
  kresliHlavu(p, r, f, vytvorRng(seed));               // stejný seed jako textura obličeje
  kresliDoplnky(p, r, f, 'popredi', vytvorRng(seed ^ 0xd00d), barva);
  return canvas;
}

// Cache: id → PNG data URL (kresba je deterministická, stačí jednou)
const cacheDataUrl = new Map();

/**
 * Vrátí PNG data URL karikatury (cache per id). Bez DOM vrací null.
 */
export function getCaricatureDataUrl(character) {
  if (typeof document === 'undefined') return null;
  const id = character?.id || 'anon';
  const hotova = cacheDataUrl.get(id);
  if (hotova) return hotova;
  const canvas = document.createElement('canvas');
  if (!drawCaricature(character, canvas)) return null;
  const url = canvas.toDataURL('image/png');
  cacheDataUrl.set(id, url);
  return url;
}

// Cache: id → 48×48 canvas s obličejem (textura pro 3D model)
const cacheObliceju = new Map();

/**
 * Vrátí 48×48 canvas jen s obličejem (pleť, oči, obočí, nos, ústa, vlasy,
 * brýle dle FEATURES) — stejná tvář jako na bustě díky stejnému seedu.
 * Bez DOM vrací null.
 */
export function getCaricatureFaceCanvas(character) {
  if (typeof document === 'undefined') return null;
  const id = character?.id || 'anon';
  const hotovy = cacheObliceju.get(id);
  if (hotovy) return hotovy;

  const f = rysyProPostavu(character);
  const seed = seedZId(character?.id);
  const barva = character?.color || '#5a6a8a';
  const r = rozlozeni(f);

  // 1) hlava v plném rozlišení do pomocného canvasu (jen výřez VYREZ)
  const pomocny = document.createElement('canvas');
  pomocny.width = VYREZ.w * ZRNO;
  pomocny.height = VYREZ.h * ZRNO;
  const pctx = pomocny.getContext('2d');
  if (!pctx) return null;
  pctx.imageSmoothingEnabled = false;
  const p = vytvorKreslire(pctx, ZRNO, -VYREZ.x, -VYREZ.y);
  p.rect(VYREZ.x, VYREZ.y, VYREZ.w, VYREZ.h, f.bgDark ? '#101116' : ztmav(barva, 0.4)); // rohy za vlasy
  kresliKrk(p, r, f);
  kresliHlavu(p, r, f, vytvorRng(seed));

  // 2) hrubé zmenšení na 48×48 (nearest neighbour — zrno zůstane ostré)
  const vysledek = document.createElement('canvas');
  vysledek.width = 48;
  vysledek.height = 48;
  const vctx = vysledek.getContext('2d');
  if (!vctx) return null;
  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(pomocny, 0, 0, pomocny.width, pomocny.height, 0, 0, 48, 48);

  cacheObliceju.set(id, vysledek);
  return vysledek;
}
