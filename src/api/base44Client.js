import { createClient } from '@base44/sdk';
import { createLocalClient } from '@/api/localBackend.js';

// Volba backendu:
//   'local'  (výchozí) — vše běží v projektu: localStorage + BroadcastChannel,
//            žádná závislost na Base44; multiplayer funguje mezi taby prohlížeče.
//   'base44' — původní Base44 backend (sdílený žebříček/účty s nasazenou verzí).
// Přepnutí: localStorage.setItem('chaos_backend', 'base44') + reload,
// nebo VITE_BACKEND=base44 při buildu.
function resolveBackendKind() {
  try {
    const stored = localStorage.getItem('chaos_backend');
    if (stored === 'base44' || stored === 'local') return stored;
  } catch {
    /* noop */
  }
  return import.meta.env?.VITE_BACKEND === 'base44' ? 'base44' : 'local';
}

export const backendKind = resolveBackendKind();

export const base44 =
  backendKind === 'base44'
    ? createClient({
        appId: '6a58bee46d0d438f6d3bdc99',
        requiresAuth: false,
      })
    : createLocalClient();

// Entity: MatchResult (výsledky zápasů pro žebříček)
export const MatchResult = base44.entities.MatchResult;

// Auth helper (lokální profil / Base44 přihlašování)
export const auth = base44.auth;
