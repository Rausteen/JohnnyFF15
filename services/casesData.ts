// Case Opening System — Challenger Case
// Cosmetics are loaded from Supabase (table: cosmetics)
// Each opening gives ONE reward: either an item OR coins (never both)

// ============================================
// TYPES
// ============================================

export interface CosmeticItem {
  id: string;
  name: string;
  type: 'border' | 'background' | 'title';
  image_url?: string;
  preview_url?: string;
}

export interface CaseReward {
  kind: 'cosmetic' | 'irl' | 'coins';
  // Cosmetic fields
  cosmetic?: CosmeticItem;
  // IRL fields
  irlName?: string;
  irlIcon?: string;
  // Coins fields
  coinsAmount?: number;
}

// ============================================
// CHALLENGER CASE CONFIG
// ============================================

export const CHALLENGER_CASE = {
  id: 'challenger',
  name: 'Challenger Case',
  description: 'Gratuit — Découvre les cosmétiques!',
  price: 0,
  image: '⚔️',
  color: 'from-orange-500 via-red-600 to-purple-700',
  glowColor: 'shadow-orange-500/50',
};

// ============================================
// DROP RATES
// ============================================

// Global split: 100% items, 0% coins (temporaire — coins désactivés)
export const ITEM_POOL_RATE = 100;
export const COINS_POOL_RATE = 0;

// Within item pool (65%):
// - 100 RP LoL: 0.10% of total → 0.10/65 of item pool
// - Cosmetics: 64.90% of total → 64.90/65 of item pool
export const IRL_ITEMS = [
  { id: 'irl_rp_100', name: '100 RP LoL', icon: '🏆', globalRate: 0.10 },
];

// Coins distribution (internal, sums to 100%)
export const COIN_TIERS = [
  { amount: 3000, label: '+3 000 JC', rate: 40 },
  { amount: 6000, label: '+6 000 JC', rate: 28 },
  { amount: 10000, label: '+10 000 JC', rate: 20 },
  { amount: 20000, label: '+20 000 JC', rate: 10 },
  { amount: 100000, label: '+100 000 JC', rate: 2 },
];

// ============================================
// ROLL FUNCTIONS
// ============================================

/**
 * Roll the Challenger Case.
 * 1) Roll global: item (65%) vs coins (35%)
 * 2) If item: roll IRL vs cosmetic, then pick one
 * 3) If coins: roll coin tier
 */
export function rollCase(cosmetics: CosmeticItem[]): CaseReward {
  const globalRoll = Math.random() * 100;

  if (globalRoll < COINS_POOL_RATE) {
    // ---- COINS (35%) ----
    return { kind: 'coins', coinsAmount: rollCoinTier() };
  }

  // ---- ITEMS (65%) ----
  // Check IRL first
  const irlTotalRate = IRL_ITEMS.reduce((sum, i) => sum + i.globalRate, 0);
  const cosmeticsGlobalRate = ITEM_POOL_RATE - irlTotalRate; // 64.90

  // Within the 65% item pool, what did we roll?
  // We already know we're in the item pool. Re-roll within it.
  const itemRoll = Math.random() * ITEM_POOL_RATE;

  let cumulative = 0;
  for (const irl of IRL_ITEMS) {
    cumulative += irl.globalRate;
    if (itemRoll < cumulative) {
      return { kind: 'irl', irlName: irl.name, irlIcon: irl.icon };
    }
  }

  // Cosmetic — uniform pick
  if (cosmetics.length === 0) {
    // No cosmetics available yet, fallback to IRL placeholder
    return { kind: 'irl', irlName: 'Aucun cosmétique disponible', irlIcon: '❓' };
  }

  const idx = Math.floor(Math.random() * cosmetics.length);
  return { kind: 'cosmetic', cosmetic: cosmetics[idx] };
}

function rollCoinTier(): number {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const tier of COIN_TIERS) {
    cumulative += tier.rate;
    if (roll < cumulative) return tier.amount;
  }
  return COIN_TIERS[0].amount;
}

/**
 * Generate roulette display items (mix of cosmetics, IRL, and coin placeholders)
 */
export function generateRouletteItems(
  cosmetics: CosmeticItem[],
  winningReward: CaseReward,
  count: number = 50
): CaseReward[] {
  const items: CaseReward[] = [];
  const winPosition = Math.floor(count * 0.75) + Math.floor(Math.random() * 5);

  for (let i = 0; i < count; i++) {
    if (i === winPosition) {
      items.push(winningReward);
    } else {
      // Random filler matching the global distribution
      items.push(randomFillerReward(cosmetics));
    }
  }

  return items;
}

function randomFillerReward(cosmetics: CosmeticItem[]): CaseReward {
  if (cosmetics.length > 0) {
    const idx = Math.floor(Math.random() * cosmetics.length);
    return { kind: 'cosmetic', cosmetic: cosmetics[idx] };
  }
  return { kind: 'irl', irlName: '?', irlIcon: '🎁' };
}
