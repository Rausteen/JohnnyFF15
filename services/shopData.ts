// ============================================
// COSMETIC SHOP DATA
// ============================================

export type CosmeticType = 'badge' | 'title' | 'border';

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type: CosmeticType;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon?: string; // Emoji or icon
  gradient?: string; // CSS gradient for borders
  unlockRequirement?: string; // Optional requirement description
}

// Badge items - Display next to username
export const BADGES: CosmeticItem[] = [
  {
    id: 'badge_feeder',
    name: 'Feeder Officiel',
    description: 'Tu assumes ton feed',
    type: 'badge',
    price: 5000,
    rarity: 'common',
    icon: '💀',
  },
  {
    id: 'badge_gambler',
    name: 'Flambeur',
    description: 'Tu aimes le risque',
    type: 'badge',
    price: 10000,
    rarity: 'common',
    icon: '🎰',
  },
  {
    id: 'badge_prophet',
    name: 'Prophète',
    description: 'Tes prédictions sont légendaires',
    type: 'badge',
    price: 25000,
    rarity: 'rare',
    icon: '🔮',
  },
  {
    id: 'badge_whale',
    name: 'Baleine',
    description: 'Tu fais tourner l\'économie',
    type: 'badge',
    price: 50000,
    rarity: 'rare',
    icon: '🐋',
  },
  {
    id: 'badge_diamond',
    name: 'Mains de Diamant',
    description: 'Tu ne panic sell jamais',
    type: 'badge',
    price: 75000,
    rarity: 'epic',
    icon: '💎',
  },
  {
    id: 'badge_fire',
    name: 'En Feu',
    description: 'Série de wins légendaire',
    type: 'badge',
    price: 100000,
    rarity: 'epic',
    icon: '🔥',
  },
  {
    id: 'badge_crown',
    name: 'Roi du Feed',
    description: 'Le boss ultime',
    type: 'badge',
    price: 200000,
    rarity: 'legendary',
    icon: '👑',
  },
  {
    id: 'badge_goat',
    name: 'G.O.A.T',
    description: 'Greatest Of All Time',
    type: 'badge',
    price: 500000,
    rarity: 'legendary',
    icon: '🐐',
  },
];

// Title items - Display under username
export const TITLES: CosmeticItem[] = [
  {
    id: 'title_noob',
    name: 'Le Noob',
    description: 'Titre pour les débutants',
    type: 'title',
    price: 2500,
    rarity: 'common',
  },
  {
    id: 'title_addict',
    name: 'Addict aux Paris',
    description: 'Tu ne peux plus t\'arrêter',
    type: 'title',
    price: 7500,
    rarity: 'common',
  },
  {
    id: 'title_analyst',
    name: 'Analyste Pro',
    description: 'Tu calcules tout',
    type: 'title',
    price: 15000,
    rarity: 'rare',
  },
  {
    id: 'title_shark',
    name: 'Requin',
    description: 'Tu sens le sang',
    type: 'title',
    price: 30000,
    rarity: 'rare',
  },
  {
    id: 'title_legend',
    name: 'Légende Vivante',
    description: 'On parle de toi',
    type: 'title',
    price: 60000,
    rarity: 'epic',
  },
  {
    id: 'title_casino',
    name: 'Proprio du Casino',
    description: 'C\'est toi le boss',
    type: 'title',
    price: 150000,
    rarity: 'legendary',
  },
];

// Border items - Profile card border
export const BORDERS: CosmeticItem[] = [
  {
    id: 'border_bronze',
    name: 'Bordure Bronze',
    description: 'Simple mais efficace',
    type: 'border',
    price: 5000,
    rarity: 'common',
    gradient: 'linear-gradient(135deg, #cd7f32, #8b4513)',
  },
  {
    id: 'border_silver',
    name: 'Bordure Argent',
    description: 'Un peu de classe',
    type: 'border',
    price: 15000,
    rarity: 'rare',
    gradient: 'linear-gradient(135deg, #c0c0c0, #808080)',
  },
  {
    id: 'border_gold',
    name: 'Bordure Or',
    description: 'Pour les winners',
    type: 'border',
    price: 40000,
    rarity: 'rare',
    gradient: 'linear-gradient(135deg, #ffd700, #ff8c00)',
  },
  {
    id: 'border_platinum',
    name: 'Bordure Platine',
    description: 'Elite du casino',
    type: 'border',
    price: 80000,
    rarity: 'epic',
    gradient: 'linear-gradient(135deg, #e5e4e2, #a0b2c6, #e5e4e2)',
  },
  {
    id: 'border_diamond',
    name: 'Bordure Diamant',
    description: 'Brillance absolue',
    type: 'border',
    price: 150000,
    rarity: 'epic',
    gradient: 'linear-gradient(135deg, #b9f2ff, #4169e1, #b9f2ff)',
  },
  {
    id: 'border_fire',
    name: 'Bordure Infernale',
    description: 'Tu brûles tout sur ton passage',
    type: 'border',
    price: 250000,
    rarity: 'legendary',
    gradient: 'linear-gradient(135deg, #ff4500, #ff0000, #ffd700)',
  },
  {
    id: 'border_rainbow',
    name: 'Bordure Arc-en-ciel',
    description: 'Toutes les couleurs',
    type: 'border',
    price: 400000,
    rarity: 'legendary',
    gradient: 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)',
  },
];

// All cosmetics combined
export const ALL_COSMETICS: CosmeticItem[] = [...BADGES, ...TITLES, ...BORDERS];

// Get cosmetic by ID
export function getCosmeticById(id: string): CosmeticItem | undefined {
  return ALL_COSMETICS.find(c => c.id === id);
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
