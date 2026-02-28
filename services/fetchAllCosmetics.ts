import { supabase } from './supabase';

export interface SupabaseCosmetic {
  id: string;
  name: string;
  type: 'border' | 'background' | 'title';
  image_url?: string;
  preview_url?: string;
}

/**
 * Fetch ALL cosmetics from Supabase, paginating in batches of 1000
 * to bypass the PostgREST default row limit.
 */
export async function fetchAllCosmetics(): Promise<SupabaseCosmetic[]> {
  const PAGE_SIZE = 1000;
  const all: SupabaseCosmetic[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('cosmetics')
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching cosmetics page:', error);
      break;
    }

    if (!data || data.length === 0) break;

    all.push(...data);

    if (data.length < PAGE_SIZE) break; // last page
    from += PAGE_SIZE;
  }

  return all;
}
