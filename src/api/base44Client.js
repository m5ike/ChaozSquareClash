import { createClient } from '@base44/sdk';

// Klient Base44 backendu — appId odpovídá původní aplikaci.
// requiresAuth: false → hra funguje i anonymně, přihlášení je volitelné.
export const base44 = createClient({
  appId: '6a58bee46d0d438f6d3bdc99',
  requiresAuth: false,
});

// Entity: MatchResult (výsledky zápasů pro žebříček)
export const MatchResult = base44.entities.MatchResult;

// Auth helper (Base44 vestavěné přihlašování)
export const auth = base44.auth;
