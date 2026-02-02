// Dynamic odds calculation based on player skill rating
import { Prop, PlayerSkillRating } from '../types';

// Prop type classification
// POSITIVE: higher skill = more likely to achieve = lower odds
// NEGATIVE: higher skill = less likely to happen = higher odds
// NEUTRAL: odds don't change based on skill

type PropType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

const PROP_TYPES: Record<string, PropType> = {
  // NEGATIVE props (bad things happening - skilled players less likely)
  'early3': 'NEGATIVE',    // 5 morts ou plus
  'gp1': 'NEGATIVE',       // CS de la honte (<4/min)
  'kda1': 'NEGATIVE',      // 10 morts ou plus
  'kda3': 'NEGATIVE',      // KDA < 0.5
  'gp4': 'NEGATIVE',       // Moins de 8k degats
  'gp6': 'NEGATIVE',       // Participation < 25%
  'early1': 'NEGATIVE',    // First Blood victime
  'kda4': 'NEGATIVE',      // 0 Kill toute la game
  'kda5': 'NEGATIVE',      // 0 Assist toute la game
  'out1': 'NEGATIVE',      // FF avant 20 min
  'gp5': 'NEGATIVE',       // Moins d'or que le support
  'kda2': 'NEGATIVE',      // Le 0/15 Legendaire
  'sp1': 'NEGATIVE',       // Le Perfect Int

  // POSITIVE props (good things - skilled players more likely)
  'early6': 'POSITIVE',    // 4 morts ou moins
  'gp7': 'POSITIVE',       // CS > 9.5/min
  'kda6': 'POSITIVE',      // KDA >= 1
  'kda9': 'POSITIVE',      // KDA >= 2
  'kda7': 'POSITIVE',      // Double kill ou plus
  'kda8': 'POSITIVE',      // Triple kill ou plus
  'early5': 'POSITIVE',    // First Blood kill
  'sp2': 'POSITIVE',       // Le Miracle KDA (KDA > 3.0)
  'sp3': 'POSITIVE',       // Le Carry Mystique (top damage)
  'sk1': 'POSITIVE',       // 3 Solo Kills ou plus
  'sk2': 'POSITIVE',       // 5 Solo Kills ou plus
  'sk3': 'NEGATIVE',       // 0 Solo Kill
  'sd1': 'POSITIVE',       // 0 Solo Death
  'sd2': 'NEGATIVE',       // 3+ Solo Deaths
  'sd3': 'NEGATIVE',       // 5+ Solo Deaths

  // NEUTRAL props (don't change based on skill)
  'out2': 'NEUTRAL',       // Defaite - pure win/loss
  'out3': 'NEUTRAL',       // VICTOIRE - pure win/loss
  'sp6': 'NEUTRAL',        // Le Pentakill - reste mythique pour tous
};

// ============================================
// FLEX MODE ODDS OVERRIDES
// ============================================
// Hardcoded odds for Flex queue (queueId 440)
// LOW = skill <= 30, HIGH = skill >= 70

interface FlexOddsOverride {
  low: number;   // Odds for low skill players (skill <= 30)
  high: number;  // Odds for high skill players (skill >= 70)
}

const FLEX_ODDS_OVERRIDES: Record<string, FlexOddsOverride> = {
  // Props with LOWER odds for skilled players
  'early6': { low: 4.00, high: 1.30 },   // 4 morts ou moins
  'early3': { low: 1.30, high: 1.10 },   // 5 morts ou plus
  'kda1': { low: 3.92, high: 2.20 },     // 10 morts ou plus
  'kda7': { low: 5.08, high: 1.50 },     // Double kill
  'sp3': { low: 100.00, high: 2.70 },    // Carry Mystique
  'kda9': { low: 3.63, high: 1.38 },     // KDA >= 2
  'sp2': { low: 8.00, high: 3.00 },      // KDA > 3 (Miracle)

  // Props with HIGHER odds for skilled players
  'gp4': { low: 2.00, high: 20.00 },     // Moins de 8k dégâts
  'gp1': { low: 2.20, high: 20.00 },     // CS de la honte
  'kda3': { low: 1.65, high: 10.00 },    // KDA < 0.5
  'gp6': { low: 1.50, high: 3.63 },      // Participation < 25%
  'gp5': { low: 2.20, high: 10.00 },     // Moins d'or que support

  // Solo kills props
  'sk1': { low: 5.00, high: 1.80 },      // 3 Solo Kills ou plus
  'sk2': { low: 12.00, high: 3.30 },     // 5 Solo Kills ou plus
  'sk3': { low: 1.40, high: 4.00 },      // 0 Solo Kill

  // Solo deaths props (Timeline API)
  'sd1': { low: 4.50, high: 1.60 },      // 0 Solo Death
  'sd2': { low: 1.60, high: 5.00 },      // 3+ Solo Deaths
  'sd3': { low: 3.00, high: 12.00 },     // 5+ Solo Deaths
};

// Limits for adjusted odds
const MIN_ODDS = 1.10;
const MAX_ODDS = 15.0;

// Average skill rating (center point)
const AVERAGE_SKILL = 50;

// How much skill affects odds (0.5 = 50% max adjustment)
const SKILL_IMPACT = 0.5;

/**
 * Calculate skill modifier based on player skill rating
 * Returns a multiplier that adjusts base odds
 *
 * For POSITIVE props (good outcomes):
 *   - High skill (80) -> modifier ~0.7 (lower odds, more likely)
 *   - Average skill (50) -> modifier 1.0 (no change)
 *   - Low skill (20) -> modifier ~1.3 (higher odds, less likely)
 *
 * For NEGATIVE props (bad outcomes):
 *   - High skill (80) -> modifier ~1.3 (higher odds, less likely)
 *   - Average skill (50) -> modifier 1.0 (no change)
 *   - Low skill (20) -> modifier ~0.7 (lower odds, more likely)
 */
function calculateSkillModifier(skillRating: number, propType: PropType): number {
  if (propType === 'NEUTRAL') return 1.0;

  // Calculate how far from average (normalized to -1 to +1 range)
  const deviation = (skillRating - AVERAGE_SKILL) / AVERAGE_SKILL;

  // Apply skill impact (max change of SKILL_IMPACT in either direction)
  const adjustment = deviation * SKILL_IMPACT;

  if (propType === 'POSITIVE') {
    // High skill = lower odds (easier to achieve)
    return 1 - adjustment;
  } else {
    // High skill = higher odds (harder to fail)
    return 1 + adjustment;
  }
}

/**
 * Get Flex mode odds if applicable
 * Returns null if not in Flex mode or no override exists
 */
function getFlexOdds(propId: string, skillRating: number): number | null {
  const override = FLEX_ODDS_OVERRIDES[propId];
  if (!override) return null;

  // LOW skill threshold (skill <= 30)
  if (skillRating <= 30) {
    return override.low;
  }

  // HIGH skill threshold (skill >= 70)
  if (skillRating >= 70) {
    return override.high;
  }

  // MID skill - interpolate between low and high
  // At skill 30, use low odds; at skill 70, use high odds
  const ratio = (skillRating - 30) / 40; // 0 at 30, 1 at 70
  const interpolated = override.low + (override.high - override.low) * ratio;
  return Math.round(interpolated * 100) / 100;
}

/**
 * Get adjusted odds for a prop based on player skill
 * @param prop - The prop to calculate odds for
 * @param skillRating - Player's skill rating (optional)
 * @param queueId - Queue ID (440 = Flex, 420 = Solo/Duo)
 */
export function getAdjustedOdds(
  prop: Prop,
  skillRating?: PlayerSkillRating | null,
  queueId?: number
): { adjustedOdds: number; modifier: number; propType: PropType } {
  const propType = PROP_TYPES[prop.id] || 'NEUTRAL';

  // If no skill rating, return base odds
  if (!skillRating) {
    return { adjustedOdds: prop.odds, modifier: 1.0, propType };
  }

  // Check for Flex mode (queueId 440) with hardcoded overrides
  if (queueId === 440) {
    const flexOdds = getFlexOdds(prop.id, skillRating.odverall);
    if (flexOdds !== null) {
      const modifier = flexOdds / prop.odds;
      return { adjustedOdds: flexOdds, modifier, propType };
    }
  }

  // Standard odds calculation for Solo/Duo and non-overridden props
  const modifier = calculateSkillModifier(skillRating.odverall, propType);
  let adjustedOdds = prop.odds * modifier;

  // Clamp to min/max only for non-NEUTRAL props
  if (propType !== 'NEUTRAL') {
    adjustedOdds = Math.max(MIN_ODDS, Math.min(MAX_ODDS, adjustedOdds));
  }

  // Round to 2 decimal places
  adjustedOdds = Math.round(adjustedOdds * 100) / 100;

  return { adjustedOdds, modifier, propType };
}

/**
 * Get display info for odds adjustment
 */
export function getOddsAdjustmentInfo(
  baseOdds: number,
  adjustedOdds: number,
  propType: PropType
): { percentChange: number; direction: 'up' | 'down' | 'none'; reason: string } {
  const percentChange = Math.round(((adjustedOdds - baseOdds) / baseOdds) * 100);

  if (Math.abs(percentChange) < 1) {
    return { percentChange: 0, direction: 'none', reason: '' };
  }

  const direction = adjustedOdds > baseOdds ? 'up' : 'down';

  let reason = '';
  if (propType === 'POSITIVE') {
    reason = direction === 'down' ? 'Joueur fort' : 'Joueur faible';
  } else if (propType === 'NEGATIVE') {
    reason = direction === 'up' ? 'Joueur fort' : 'Joueur faible';
  }

  return { percentChange: Math.abs(percentChange), direction, reason };
}
