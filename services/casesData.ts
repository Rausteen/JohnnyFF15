// Case Opening System - Loot Tables and Drop Rates

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface LootItem {
  id: string;
  type: 'jc' | 'badge' | 'title' | 'border' | 'ticket' | 'irl';
  name: string;
  icon?: string;
  gradient?: string;
  jcAmount?: number;
  rarity: Rarity;
  dropRate: number; // Percentage (0-100)
  caseExclusive?: boolean;
}

export interface Case {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string; // Emoji for now
  color: string;
  glowColor: string;
  lootTable: LootItem[];
}

// Rarity colors and styles
export const RARITY_CONFIG: Record<Rarity, { color: string; bg: string; glow: string; label: string }> = {
  common: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', glow: 'shadow-zinc-500/30', label: 'Commun' },
  uncommon: { color: 'text-green-400', bg: 'bg-green-500/20', glow: 'shadow-green-500/30', label: 'Peu commun' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500/20', glow: 'shadow-blue-500/30', label: 'Rare' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-500/20', glow: 'shadow-purple-500/30', label: 'Épique' },
  legendary: { color: 'text-gold', bg: 'bg-gold/20', glow: 'shadow-gold/30', label: 'Légendaire' },
  mythic: { color: 'text-red-400', bg: 'bg-red-500/20', glow: 'shadow-red-500/30', label: 'Mythique' },
};

// ============================================
// CASE-EXCLUSIVE COSMETICS
// ============================================

export const CASE_BADGES: LootItem[] = [
  // Common
  { id: 'case_badge_dice', type: 'badge', name: 'Dés Chanceux', icon: '🎲', rarity: 'common', dropRate: 0, caseExclusive: true },
  { id: 'case_badge_clover', type: 'badge', name: 'Trèfle', icon: '🍀', rarity: 'common', dropRate: 0, caseExclusive: true },
  // Uncommon
  { id: 'case_badge_slot', type: 'badge', name: 'Machine à Sous', icon: '🎰', rarity: 'uncommon', dropRate: 0, caseExclusive: true },
  { id: 'case_badge_money', type: 'badge', name: 'Liasse', icon: '💵', rarity: 'uncommon', dropRate: 0, caseExclusive: true },
  // Rare
  { id: 'case_badge_diamond', type: 'badge', name: 'Diamant Brut', icon: '💎', rarity: 'rare', dropRate: 0, caseExclusive: true },
  { id: 'case_badge_rocket', type: 'badge', name: 'To The Moon', icon: '🚀', rarity: 'rare', dropRate: 0, caseExclusive: true },
  // Epic
  { id: 'case_badge_fire', type: 'badge', name: 'En Feu', icon: '🔥', rarity: 'epic', dropRate: 0, caseExclusive: true },
  { id: 'case_badge_star', type: 'badge', name: 'Étoile Filante', icon: '⭐', rarity: 'epic', dropRate: 0, caseExclusive: true },
  // Legendary
  { id: 'case_badge_crown', type: 'badge', name: 'Couronne Divine', icon: '👑', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  { id: 'case_badge_crystal', type: 'badge', name: 'Orbe Mystique', icon: '🔮', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  // Mythic
  { id: 'case_badge_skull', type: 'badge', name: 'Crâne du Throw', icon: '💀', rarity: 'mythic', dropRate: 0, caseExclusive: true },
  { id: 'case_badge_cosmic', type: 'badge', name: 'Étoile Cosmique', icon: '🌟', rarity: 'mythic', dropRate: 0, caseExclusive: true },
];

export const CASE_TITLES: LootItem[] = [
  // Rare
  { id: 'case_title_lucky', type: 'title', name: 'Le Chanceux', rarity: 'rare', dropRate: 0, caseExclusive: true },
  { id: 'case_title_gambler', type: 'title', name: 'Parieur Fou', rarity: 'rare', dropRate: 0, caseExclusive: true },
  // Epic
  { id: 'case_title_whale', type: 'title', name: 'Whale Officiel', rarity: 'epic', dropRate: 0, caseExclusive: true },
  { id: 'case_title_rng', type: 'title', name: 'RNG Manipulateur', rarity: 'epic', dropRate: 0, caseExclusive: true },
  // Legendary
  { id: 'case_title_blessed', type: 'title', name: 'Touché par la Grâce', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  { id: 'case_title_millionaire', type: 'title', name: 'Le Millionnaire', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  // Mythic
  { id: 'case_title_casino', type: 'title', name: 'Maître du Casino', rarity: 'mythic', dropRate: 0, caseExclusive: true },
  { id: 'case_title_god', type: 'title', name: 'Dieu du Throw', rarity: 'mythic', dropRate: 0, caseExclusive: true },
];

export const CASE_BORDERS: LootItem[] = [
  // Epic
  { id: 'case_border_neon', type: 'border', name: 'Néon', gradient: 'linear-gradient(135deg, #00ff88, #00ffff, #ff00ff)', rarity: 'epic', dropRate: 0, caseExclusive: true },
  { id: 'case_border_sunset', type: 'border', name: 'Coucher de Soleil', gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #ff9ff3)', rarity: 'epic', dropRate: 0, caseExclusive: true },
  // Legendary
  { id: 'case_border_rainbow', type: 'border', name: 'Arc-en-ciel', gradient: 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  { id: 'case_border_inferno', type: 'border', name: 'Inferno', gradient: 'linear-gradient(135deg, #ff4500, #ff6600, #ff0000, #8b0000)', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  { id: 'case_border_ice', type: 'border', name: 'Glacial', gradient: 'linear-gradient(135deg, #00ffff, #0080ff, #ffffff, #00bfff)', rarity: 'legendary', dropRate: 0, caseExclusive: true },
  // Mythic
  { id: 'case_border_cosmos', type: 'border', name: 'Cosmos', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e, #8b5cf6, #ec4899)', rarity: 'mythic', dropRate: 0, caseExclusive: true },
  { id: 'case_border_divine', type: 'border', name: 'Divin', gradient: 'linear-gradient(135deg, #ffd700, #fff8dc, #ffd700, #daa520, #ffd700)', rarity: 'mythic', dropRate: 0, caseExclusive: true },
];

// ============================================
// CASE DEFINITIONS
// ============================================

export const CASES: Case[] = [
  {
    id: 'challenger',
    name: 'Challenger Case',
    description: 'La caisse unique. Toutes les raretés, tous les cosmétiques, un seul prix.',
    price: 10000,
    image: '⚔️',
    color: 'from-orange-500 via-red-600 to-purple-700',
    glowColor: 'shadow-orange-500/50',
    lootTable: [
      // ==========================================
      // IRL Rewards (0.11%) — no pity
      // ==========================================
      { id: 'irl_steam_50', type: 'irl', name: 'Steam Game 50€', icon: '🎮', rarity: 'mythic', dropRate: 0.01 },
      { id: 'irl_rp_100', type: 'irl', name: '100 RP LoL', icon: '🏆', rarity: 'legendary', dropRate: 0.10 },

      // ==========================================
      // Bonus Coins (35.0%) — toujours EN PLUS d'un cosmétique
      // ==========================================
      { id: 'bonus_3000', type: 'jc', name: '+3 000 JC', jcAmount: 3000, rarity: 'common', dropRate: 14 },
      { id: 'bonus_6000', type: 'jc', name: '+6 000 JC', jcAmount: 6000, rarity: 'uncommon', dropRate: 10 },
      { id: 'bonus_10000', type: 'jc', name: '+10 000 JC', jcAmount: 10000, rarity: 'rare', dropRate: 7 },
      { id: 'bonus_20000', type: 'jc', name: '+20 000 JC', jcAmount: 20000, rarity: 'epic', dropRate: 3.5 },
      { id: 'bonus_100000', type: 'jc', name: '+100 000 JC', jcAmount: 100000, rarity: 'legendary', dropRate: 0.5 },

      // ==========================================
      // Cosmétiques (64.89%) — toujours au moins 1
      // ==========================================

      // Rare (28.0%)
      { ...CASE_BADGES[4], dropRate: 7 },   // Diamant Brut 💎
      { ...CASE_BADGES[5], dropRate: 7 },   // To The Moon 🚀
      { ...CASE_TITLES[0], dropRate: 7 },   // Le Chanceux
      { ...CASE_TITLES[1], dropRate: 7 },   // Parieur Fou

      // Epic (20.0%)
      { ...CASE_BADGES[6], dropRate: 4 },   // En Feu 🔥
      { ...CASE_BADGES[7], dropRate: 4 },   // Étoile Filante ⭐
      { ...CASE_TITLES[2], dropRate: 4 },   // Whale Officiel
      { ...CASE_TITLES[3], dropRate: 3 },   // RNG Manipulateur
      { ...CASE_BORDERS[0], dropRate: 3 },  // Néon
      { ...CASE_BORDERS[1], dropRate: 2 },  // Coucher de Soleil

      // Legendary (12.0%)
      { ...CASE_BADGES[8], dropRate: 2.5 },  // Couronne Divine 👑
      { ...CASE_BADGES[9], dropRate: 2.5 },  // Orbe Mystique 🔮
      { ...CASE_TITLES[4], dropRate: 2 },    // Touché par la Grâce
      { ...CASE_TITLES[5], dropRate: 1.5 },  // Le Millionnaire
      { ...CASE_BORDERS[2], dropRate: 1.5 }, // Arc-en-ciel
      { ...CASE_BORDERS[3], dropRate: 1 },   // Inferno
      { ...CASE_BORDERS[4], dropRate: 1 },   // Glacial

      // Mythic (4.89%)
      { ...CASE_BADGES[10], dropRate: 1.2 },  // Crâne du Throw 💀
      { ...CASE_BADGES[11], dropRate: 1 },    // Étoile Cosmique 🌟
      { ...CASE_TITLES[6], dropRate: 0.89 },  // Maître du Casino
      { ...CASE_TITLES[7], dropRate: 0.7 },   // Dieu du Throw
      { ...CASE_BORDERS[5], dropRate: 0.6 },  // Cosmos
      { ...CASE_BORDERS[6], dropRate: 0.5 },  // Divin
    ],
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getCaseById(caseId: string): Case | undefined {
  return CASES.find(c => c.id === caseId);
}

export function rollLoot(caseData: Case): LootItem {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const item of caseData.lootTable) {
    cumulative += item.dropRate;
    if (roll < cumulative) {
      return item;
    }
  }

  // Fallback to first item (should never happen if rates sum to 100)
  return caseData.lootTable[0];
}

// Roll a random cosmetic from the case's cosmetic entries (weighted by dropRate)
export function rollBonusCosmetic(caseData: Case): LootItem {
  const cosmetics = caseData.lootTable.filter(
    item => item.type === 'badge' || item.type === 'title' || item.type === 'border'
  );
  const totalRate = cosmetics.reduce((sum, item) => sum + item.dropRate, 0);
  const roll = Math.random() * totalRate;
  let cumulative = 0;
  for (const item of cosmetics) {
    cumulative += item.dropRate;
    if (roll < cumulative) return item;
  }
  return cosmetics[0];
}

export function generateRouletteItems(caseData: Case, winningCosmetic: LootItem, count: number = 50): LootItem[] {
  const items: LootItem[] = [];
  const winPosition = Math.floor(count * 0.75) + Math.floor(Math.random() * 5); // Win at ~75-80% through

  for (let i = 0; i < count; i++) {
    if (i === winPosition) {
      items.push(winningCosmetic);
    } else {
      // Only show cosmetics in the roulette
      items.push(rollBonusCosmetic(caseData));
    }
  }

  return items;
}

export function getCaseExclusiveCosmetic(itemId: string): LootItem | undefined {
  return [...CASE_BADGES, ...CASE_TITLES, ...CASE_BORDERS].find(item => item.id === itemId);
}

// Calculate expected value for a case
export function calculateExpectedValue(caseData: Case): number {
  let ev = 0;
  for (const item of caseData.lootTable) {
    if (item.type === 'jc' && item.jcAmount) {
      ev += (item.dropRate / 100) * item.jcAmount;
    }
    // Cosmetics add some value too (rough estimate)
    if (item.type !== 'jc') {
      const valueEstimate = item.rarity === 'common' ? 500 :
                           item.rarity === 'uncommon' ? 2000 :
                           item.rarity === 'rare' ? 5000 :
                           item.rarity === 'epic' ? 15000 :
                           item.rarity === 'legendary' ? 40000 : 100000;
      ev += (item.dropRate / 100) * valueEstimate;
    }
  }
  return Math.round(ev);
}
