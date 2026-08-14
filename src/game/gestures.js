// Gesta a mimika postav. Tělesná gesta mění pózu 3D modelu, obličejová
// překreslují texturu obličeje. Spouští se klávesou (G = tělesné, V = mimika,
// cyklicky) nebo automaticky jednou za nastavený interval.
//
// Pozn.: místo gesta „heil" je implementováno „mávnutí" — hajlování je v ČR
// trestné (§ 404 TZ) a u parodií skutečných osob nepřipadá v úvahu.

export const BODY_GESTURES = [
  { id: 'wave', name: 'Mávnutí', duration: 1.2 },
  { id: 'fuckoff', name: 'Fuck off', duration: 1.4 },
  { id: 'thumbup', name: 'Palec nahoru', duration: 1.3 },
  { id: 'flip', name: 'Přemet', duration: 0.9 },
  { id: 'salto', name: 'Salto', duration: 0.9 },
  { id: 'drep', name: 'Dřep', duration: 1.6 },
  { id: 'plazeni', name: 'Plazení', duration: 2.2 },
];

export const FACE_GESTURES = [
  { id: 'wink', name: 'Mrknutí', duration: 0.9 },
  { id: 'frown', name: 'Zamračení', duration: 1.6 },
  { id: 'laugh', name: 'Smích', duration: 1.6 },
  { id: 'amlaugh', name: 'Americký smích', duration: 2.0 },
  { id: 'scream', name: 'Řev', duration: 1.4 },
  { id: 'cry', name: 'Pláč', duration: 2.0 },
];

export function getGestureById(id) {
  return BODY_GESTURES.find((g) => g.id === id) || FACE_GESTURES.find((g) => g.id === id) || null;
}

// Interval automatických gest (sekundy; 0 = vypnuto), persistovaný.
const AUTO_KEY = 'chaos_auto_gesture';

export function getAutoGestureInterval() {
  try {
    const v = parseInt(localStorage.getItem(AUTO_KEY) ?? '25', 10);
    return Number.isFinite(v) ? v : 25;
  } catch {
    return 25;
  }
}

export function setAutoGestureInterval(seconds) {
  try {
    localStorage.setItem(AUTO_KEY, String(seconds));
  } catch {
    /* noop */
  }
}

export function randomGesture() {
  const all = [...BODY_GESTURES, ...FACE_GESTURES];
  return all[(Math.random() * all.length) | 0];
}

// Spuštění gesta na sdíleném anim objektu (Bots/RemotePlayers/CharacterModel)
export function playGestureOnAnim(anim, gestureId) {
  const gesture = getGestureById(gestureId);
  if (!gesture || !anim) return;
  if (BODY_GESTURES.some((g) => g.id === gestureId)) {
    anim.gesture = { id: gestureId, t: 0, duration: gesture.duration };
  } else {
    anim.expression = { id: gestureId, t: 0, duration: gesture.duration };
  }
}
