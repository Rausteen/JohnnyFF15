// ============================================
// COSMETIC UTILITIES (Shop removed — cosmetics now in Supabase)
// ============================================

export type CosmeticType = 'badge' | 'title' | 'border';

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type: CosmeticType;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon?: string;
  gradient?: string;
  animated?: boolean;
}

// All cosmetics removed — loaded from Supabase now
export const ALL_COSMETICS: CosmeticItem[] = [];

// Lookup cosmetic by ID (returns undefined until Supabase cosmetics are loaded)
export function getCosmeticById(_id: string): CosmeticItem | undefined {
  return undefined;
}

// Get rarity color
export function getRarityColor(rarity: CosmeticItem['rarity']): string {
  switch (rarity) {
    case 'common': return 'text-zinc-400';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';
    case 'legendary': return 'text-yellow-400';
  }
}

// Get rarity background
export function getRarityBg(rarity: CosmeticItem['rarity']): string {
  switch (rarity) {
    case 'common': return 'bg-zinc-500/20 border-zinc-500/30';
    case 'rare': return 'bg-blue-500/20 border-blue-500/30';
    case 'epic': return 'bg-purple-500/20 border-purple-500/30';
    case 'legendary': return 'bg-yellow-500/20 border-yellow-500/30';
  }
}

// Get rarity label
export function getRarityLabel(rarity: CosmeticItem['rarity']): string {
  switch (rarity) {
    case 'common': return 'Commun';
    case 'rare': return 'Rare';
    case 'epic': return 'Épique';
    case 'legendary': return 'Légendaire';
  }
}
