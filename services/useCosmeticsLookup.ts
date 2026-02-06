import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface SupabaseCosmetic {
  id: string;
  name: string;
  type: 'border' | 'background' | 'title';
  image_url?: string;
  preview_url?: string;
}

let cachedCosmetics: SupabaseCosmetic[] | null = null;

export function useCosmeticsLookup() {
  const [cosmetics, setCosmetics] = useState<SupabaseCosmetic[]>(cachedCosmetics || []);

  useEffect(() => {
    if (cachedCosmetics) return;
    supabase.from('cosmetics').select('*').then(({ data }) => {
      if (data) {
        cachedCosmetics = data;
        setCosmetics(data);
      }
    });
  }, []);

  const getCosmetic = (id: string | null | undefined): SupabaseCosmetic | undefined => {
    if (!id) return undefined;
    return cosmetics.find(c => c.id === id);
  };

  return { cosmetics, getCosmetic };
}
