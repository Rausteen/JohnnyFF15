import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllCosmetics, SupabaseCosmetic } from './fetchAllCosmetics';

export type { SupabaseCosmetic };

// Module-level singleton: single fetch, single Map, shared across all hook instances
let cachedCosmetics: SupabaseCosmetic[] | null = null;
let cosmeticsMap: Map<string, SupabaseCosmetic> | null = null;
let fetchPromise: Promise<SupabaseCosmetic[]> | null = null;

function ensureFetch(): Promise<SupabaseCosmetic[]> {
  if (cachedCosmetics) return Promise.resolve(cachedCosmetics);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetchAllCosmetics().then((data) => {
    cachedCosmetics = data;
    cosmeticsMap = new Map(data.map(c => [c.id, c]));
    return data;
  });

  return fetchPromise;
}

// Module-level lookup — O(1) via Map, no new function per render
function lookupCosmetic(id: string | null | undefined): SupabaseCosmetic | undefined {
  if (!id || !cosmeticsMap) return undefined;
  return cosmeticsMap.get(id);
}

export function useCosmeticsLookup() {
  const [ready, setReady] = useState(!!cachedCosmetics);

  useEffect(() => {
    if (cachedCosmetics) {
      setReady(true);
      return;
    }
    let cancelled = false;
    ensureFetch().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Stable reference — always points to the same module-level function
  const getCosmetic = useCallback(lookupCosmetic, [ready]);

  return { cosmetics: cachedCosmetics || [], getCosmetic };
}
