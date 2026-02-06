// Case Opening System - Loot Tables and Drop Rates

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface LootItem {
  id: string;
  type: 'jc' | 'badge' | 'title' | 'border' | 'ticket';
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
    id: 'basic',
    name: 'Caisse Basique',
    description: 'Pour les débutants. Petits gains mais accessible.',
    price: 2000,
    image: '📦',
    color: 'from-zinc-600 to-zinc-800',
    glowColor: 'shadow-zinc-500/30',
    lootTable: [
      // JC Rewards (75%)
      { id: 'basic_jc_500', type: 'jc', name: '500 JC', jcAmount: 500, rarity: 'common', dropRate: 35 },
      { id: 'basic_jc_1000', type: 'jc', name: '1 000 JC', jcAmount: 1000, rarity: 'common', dropRate: 20 },
      { id: 'basic_jc_1500', type: 'jc', name: '1 500 JC', jcAmount: 1500, rarity: 'uncommon', dropRate: 12 },
      { id: 'basic_jc_2500', type: 'jc', name: '2 500 JC', jcAmount: 2500, rarity: 'uncommon', dropRate: 8 },
      // Cosmetics (22%)
      { ...CASE_BADGES[0], dropRate: 8 }, // Dés Chanceux
      { ...CASE_BADGES[1], dropRate: 7 }, // Trèfle
      { ...CASE_BADGES[2], dropRate: 4 }, // Machine à Sous
      { ...CASE_BADGES[4], dropRate: 2 }, // Diamant Brut
      { ...CASE_TITLES[0], dropRate: 1 }, // Le Chanceux
      // Big wins (3%)
      { id: 'basic_jc_5000', type: 'jc', name: '5 000 JC', jcAmount: 5000, rarity: 'rare', dropRate: 2.5 },
      { id: 'basic_jc_10000', type: 'jc', name: '10 000 JC', jcAmount: 10000, rarity: 'epic', dropRate: 0.5 },
    ],
  },
  {
    id: 'premium',
    name: 'Caisse Premium',
    description: 'Meilleures chances pour les cosmétiques rares.',
    price: 10000,
    image: '🎁',
    color: 'from-blue-600 to-blue-900',
    glowColor: 'shadow-blue-500/30',
    lootTable: [
      // JC Rewards (60%)
      { id: 'premium_jc_2000', type: 'jc', name: '2 000 JC', jcAmount: 2000, rarity: 'common', dropRate: 25 },
      { id: 'premium_jc_5000', type: 'jc', name: '5 000 JC', jcAmount: 5000, rarity: 'common', dropRate: 15 },
      { id: 'premium_jc_8000', type: 'jc', name: '8 000 JC', jcAmount: 8000, rarity: 'uncommon', dropRate: 10 },
      { id: 'premium_jc_12000', type: 'jc', name: '12 000 JC', jcAmount: 12000, rarity: 'uncommon', dropRate: 6 },
      { id: 'premium_jc_20000', type: 'jc', name: '20 000 JC', jcAmount: 20000, rarity: 'rare', dropRate: 4 },
      // Cosmetics (35%)
      { ...CASE_BADGES[2], dropRate: 8 }, // Machine à Sous
      { ...CASE_BADGES[3], dropRate: 6 }, // Liasse
      { ...CASE_BADGES[4], dropRate: 5 }, // Diamant Brut
      { ...CASE_BADGES[5], dropRate: 4 }, // To The Moon
      { ...CASE_BADGES[6], dropRate: 3 }, // En Feu
      { ...CASE_TITLES[0], dropRate: 3 }, // Le Chanceux
      { ...CASE_TITLES[1], dropRate: 2 }, // Parieur Fou
      { ...CASE_TITLES[2], dropRate: 2 }, // Whale Officiel
      { ...CASE_BORDERS[0], dropRate: 1.5 }, // Néon
      { ...CASE_BADGES[8], dropRate: 0.5 }, // Couronne Divine
      // Big wins (5%)
      { id: 'premium_jc_35000', type: 'jc', name: '35 000 JC', jcAmount: 35000, rarity: 'epic', dropRate: 3 },
      { id: 'premium_jc_50000', type: 'jc', name: '50 000 JC', jcAmount: 50000, rarity: 'legendary', dropRate: 1.5 },
      { ...CASE_BORDERS[2], dropRate: 0.5 }, // Arc-en-ciel
    ],
  },
  {
    id: 'legendary',
    name: 'Caisse Légendaire',
    description: 'Items épiques et légendaires. Gros potentiel.',
    price: 50000,
    image: '👑',
    color: 'from-amber-500 to-amber-800',
    glowColor: 'shadow-gold/50',
    lootTable: [
      // JC Rewards (55%)
      { id: 'legend_jc_10000', type: 'jc', name: '10 000 JC', jcAmount: 10000, rarity: 'common', dropRate: 20 },
      { id: 'legend_jc_25000', type: 'jc', name: '25 000 JC', jcAmount: 25000, rarity: 'common', dropRate: 12 },
      { id: 'legend_jc_40000', type: 'jc', name: '40 000 JC', jcAmount: 40000, rarity: 'uncommon', dropRate: 10 },
      { id: 'legend_jc_60000', type: 'jc', name: '60 000 JC', jcAmount: 60000, rarity: 'uncommon', dropRate: 6 },
      { id: 'legend_jc_100000', type: 'jc', name: '100 000 JC', jcAmount: 100000, rarity: 'rare', dropRate: 4 },
      { id: 'legend_jc_150000', type: 'jc', name: '150 000 JC', jcAmount: 150000, rarity: 'epic', dropRate: 3 },
      // Cosmetics (40%)
      { ...CASE_BADGES[5], dropRate: 6 }, // To The Moon
      { ...CASE_BADGES[6], dropRate: 5 }, // En Feu
      { ...CASE_BADGES[7], dropRate: 5 }, // Étoile Filante
      { ...CASE_BADGES[8], dropRate: 4 }, // Couronne Divine
      { ...CASE_BADGES[9], dropRate: 3 }, // Orbe Mystique
      { ...CASE_TITLES[2], dropRate: 4 }, // Whale Officiel
      { ...CASE_TITLES[3], dropRate: 3 }, // RNG Manipulateur
      { ...CASE_TITLES[4], dropRate: 2 }, // Touché par la Grâce
      { ...CASE_BORDERS[0], dropRate: 3 }, // Néon
      { ...CASE_BORDERS[1], dropRate: 2.5 }, // Coucher de Soleil
      { ...CASE_BORDERS[2], dropRate: 1.5 }, // Arc-en-ciel
      { ...CASE_BORDERS[3], dropRate: 1 }, // Inferno
      // Jackpot (5%)
      { id: 'legend_jc_250000', type: 'jc', name: '250 000 JC', jcAmount: 250000, rarity: 'legendary', dropRate: 3 },
      { ...CASE_BADGES[10], dropRate: 1 }, // Crâne du Throw
      { ...CASE_BORDERS[5], dropRate: 1 }, // Cosmos
    ],
  },
  {
    id: 'mythic',
    name: 'Caisse Mythique',
    description: 'La caisse ultime. Jackpots et items mythiques.',
    price: 200000,
    image: '🔮',
    color: 'from-purple-600 via-pink-600 to-red-600',
    glowColor: 'shadow-purple-500/50',
    lootTable: [
      // JC Rewards (50%)
      { id: 'mythic_jc_20000', type: 'jc', name: '20 000 JC', jcAmount: 20000, rarity: 'common', dropRate: 15 },
      { id: 'mythic_jc_50000', type: 'jc', name: '50 000 JC', jcAmount: 50000, rarity: 'common', dropRate: 12 },
      { id: 'mythic_jc_75000', type: 'jc', name: '75 000 JC', jcAmount: 75000, rarity: 'uncommon', dropRate: 8 },
      { id: 'mythic_jc_100000', type: 'jc', name: '100 000 JC', jcAmount: 100000, rarity: 'uncommon', dropRate: 6 },
      { id: 'mythic_jc_150000', type: 'jc', name: '150 000 JC', jcAmount: 150000, rarity: 'rare', dropRate: 5 },
      { id: 'mythic_jc_250000', type: 'jc', name: '250 000 JC', jcAmount: 250000, rarity: 'rare', dropRate: 4 },
      // Epic+ Cosmetics (40%)
      { ...CASE_BADGES[6], dropRate: 4 }, // En Feu
      { ...CASE_BADGES[7], dropRate: 4 }, // Étoile Filante
      { ...CASE_BADGES[8], dropRate: 5 }, // Couronne Divine
      { ...CASE_BADGES[9], dropRate: 4 }, // Orbe Mystique
      { ...CASE_BADGES[10], dropRate: 3 }, // Crâne du Throw
      { ...CASE_BADGES[11], dropRate: 2 }, // Étoile Cosmique
      { ...CASE_TITLES[3], dropRate: 3 }, // RNG Manipulateur
      { ...CASE_TITLES[4], dropRate: 3 }, // Touché par la Grâce
      { ...CASE_TITLES[5], dropRate: 2 }, // Le Millionnaire
      { ...CASE_TITLES[6], dropRate: 1.5 }, // Maître du Casino
      { ...CASE_TITLES[7], dropRate: 1 }, // Dieu du Throw
      { ...CASE_BORDERS[2], dropRate: 2 }, // Arc-en-ciel
      { ...CASE_BORDERS[3], dropRate: 2 }, // Inferno
      { ...CASE_BORDERS[4], dropRate: 1.5 }, // Glacial
      { ...CASE_BORDERS[5], dropRate: 1.5 }, // Cosmos
      { ...CASE_BORDERS[6], dropRate: 0.5 }, // Divin
      // Jackpots (10%)
      { id: 'mythic_jc_500000', type: 'jc', name: '500 000 JC', jcAmount: 500000, rarity: 'legendary', dropRate: 5 },
      { id: 'mythic_jc_1000000', type: 'jc', name: '1 000 000 JC', jcAmount: 1000000, rarity: 'legendary', dropRate: 3 },
      { id: 'mythic_jc_2000000', type: 'jc', name: '2 000 000 JC JACKPOT!', jcAmount: 2000000, rarity: 'mythic', dropRate: 1.5 },
      { id: 'mythic_ticket', type: 'ticket', name: 'Ticket Caisse Mythique', icon: '🎫', rarity: 'mythic', dropRate: 0.5 },
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

export function generateRouletteItems(caseData: Case, winningItem: LootItem, count: number = 50): LootItem[] {
  const items: LootItem[] = [];
  const winPosition = Math.floor(count * 0.75) + Math.floor(Math.random() * 5); // Win at ~75-80% through

  for (let i = 0; i < count; i++) {
    if (i === winPosition) {
      items.push(winningItem);
    } else {
      // Pick random item weighted by drop rate
      items.push(rollLoot(caseData));
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
