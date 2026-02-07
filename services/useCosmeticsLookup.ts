import { useState, useEffect } from 'react';
import { fetchAllCosmetics, SupabaseCosmetic } from './fetchAllCosmetics';

export type { SupabaseCosmetic };

let cachedCosmetics: SupabaseCosmetic[] | null = null;

export function useCosmeticsLookup() {
  const [cosmetics, setCosmetics] = useState<SupabaseCosmetic[]>(cachedCosmetics || []);

  useEffect(() => {
    if (cachedCosmetics) return;
    fetchAllCosmetics().then((data) => {
      cachedCosmetics = data;
      setCosmetics(data);
    });
  }, []);

  const getCosmetic = (id: string | null | undefined): SupabaseCosmetic | undefined => {
    if (!id) return undefined;
    return cosmetics.find(c => c.id === id);
  };

  return { cosmetics, getCosmetic };
}
