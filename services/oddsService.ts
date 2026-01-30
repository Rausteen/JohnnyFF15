// Dynamic odds calculation based on player skill rating
import { Prop, PlayerSkillRating } from '../types';

// Prop type classification
// POSITIVE: higher skill = more likely to achieve = lower odds
// NEGATIVE: higher skill = less likely to happen = higher odds
// NEUTRAL: odds don't change based on skill

type PropType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

const PROP_TYPES: Record<string, PropType> = {
  // NEGATIVE props (bad things happening - skilled players less likely)
  'out2': 'NEGATIVE',      // Defaite
  'early3': 'NEGATIVE',    // 5 morts ou plus
  'gp1': 'NEGATIVE',       // CS de la honte (<4/min)
  'kda1': 'NEGATIVE',      // 10 morts ou plus
  'kda3': 'NEGATIVE',      // KDA < 0.5
  'gp4': 'NEGATIVE',       // Moins de 8k degats
  'gp6': 'NEGATIVE',       // Participation < 15%
  'early1': 'NEGATIVE',    // First Blood victime
  'kda4': 'NEGATIVE',      // 0 Kill toute la game
  'kda5': 'NEGATIVE',      // 0 Assist toute la game
  'out1': 'NEGATIVE',      // FF avant 20 min
  'gp5': 'NEGATIVE',       // Moins d'or que le support
  'kda2': 'NEGATIVE',      // Le 0/15 Legendaire
  'sp1': 'NEGATIVE',       // Le Perfect Int
  'sp5': 'NEGATIVE',       // L'Invisible

  // POSITIVE props (good things - skilled players more likely)
  'gp7': 'POSITIVE',       // CS > 9.5/min
  'kda6': 'POSITIVE',      // KDA >= 1
  'kda9': 'POSITIVE',      // KDA >= 2
  'kda7': 'POSITIVE',      // Double kill ou plus
  'kda8': 'POSITIVE',      // Triple kill ou plus
  'early5': 'POSITIVE',    // First Blood kill
  'sp2': 'POSITIVE',       // Le Miracle KDA (KDA > 3.0)
  'sp3': 'POSITIVE',       // Le Carry Mystique (top damage)

  // NEUTRAL props (don't change based on skill)
  'out2': 'NEUTRAL',       // Defaite - pure win/loss
  'out3': 'NEUTRAL',       // VICTOIRE - pure win/loss
  'sp6': 'NEUTRAL',        // Le Pentakill - reste mythique pour tous
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
 * Get adjusted odds for a prop based on player skill
 */
export function getAdjustedOdds(
  prop: Prop,
  skillRating?: PlayerSkillRating | null
): { adjustedOdds: number; modifier: number; propType: PropType } {
  const propType = PROP_TYPES[prop.id] || 'NEUTRAL';

  // If no skill rating, return base odds
  if (!skillRating) {
    return { adjustedOdds: prop.odds, modifier: 1.0, propType };
  }

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

/**
 * Get prop type for a given prop ID
 */
export function getPropType(propId: string): PropType {
  return PROP_TYPES[propId] || 'NEUTRAL';
}
