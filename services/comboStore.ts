import { create } from 'zustand';
import { Prop } from '../types';

export interface ComboSelection {
  prop: Prop;
  adjustedOdds: number;  // Skill-adjusted odds at time of adding
  addedAt: number;
  playerPuuid?: string;  // The player this bet is for
  playerName?: string;   // Display name of the player
  gameId?: string;       // The game ID at time of adding
}

// ============================================
// CORRELATED PROPS - Cannot be combined
// ============================================

// Groups of props that imply each other (can't combine within same group)
const CORRELATED_GROUPS: string[][] = [
  // KDA hierarchy: if KDA > 3, then KDA ≥ 2 and KDA ≥ 1
  ['kda6', 'kda9', 'sp2'],  // KDA ≥ 1, KDA ≥ 2, KDA > 3

  // Death hierarchy: 15+ deaths implies 10+ and 5+
  ['early3', 'kda1', 'kda2'],  // 5+ morts, 10+ morts, 15+ morts

  // 0 kills conflicts with multi-kills
  ['kda4', 'kda7', 'kda8', 'sp6'],  // 0 kill, double, triple, penta

  // 0 deaths conflicts with death-based props
  ['early4', 'early3', 'kda1', 'kda2'],  // 0 mort, 5+ morts, 10+ morts, 15+ morts
];

// Check if two props conflict
function arePropsCorrelated(propId1: string, propId2: string): boolean {
  // Same prop
  if (propId1 === propId2) return true;

  // Check correlated groups
  for (const group of CORRELATED_GROUPS) {
    if (group.includes(propId1) && group.includes(propId2)) {
      return true;
    }
  }

  return false;
}

// Get human-readable reason for correlation
function getCorrelationReason(propId1: string, propId2: string): string | null {
  // KDA hierarchy
  if (['kda6', 'kda9', 'sp2'].includes(propId1) && ['kda6', 'kda9', 'sp2'].includes(propId2)) {
    return 'Ces paris KDA sont redondants';
  }

  // Death hierarchy
  if (['early3', 'kda1', 'kda2', 'early4'].some(p => p === propId1 || p === propId2) &&
      ['early3', 'kda1', 'kda2', 'early4'].some(p => p === propId1 || p === propId2)) {
    return 'Ces paris sur les morts sont incompatibles';
  }

  // Kill-related
  if (['kda4', 'kda7', 'kda8', 'sp6'].includes(propId1) && ['kda4', 'kda7', 'kda8', 'sp6'].includes(propId2)) {
    return 'Ces paris sur les kills sont incompatibles';
  }

  return null;
}

interface ComboState {
  selections: ComboSelection[];
  lastError: string | null;

  // Computed
  totalOdds: () => number;

  // Actions
  addToCombo: (prop: Prop, adjustedOdds: number, playerPuuid?: string, playerName?: string, gameId?: string) => boolean;
  removeFromCombo: (propId: string) => void;
  clearCombo: () => void;
  isInCombo: (propId: string) => boolean;
  canAddProp: (propId: string) => { canAdd: boolean; reason?: string };
  canAddPlayer: (playerPuuid?: string) => boolean;
  getComboPlayerPuuid: () => string | undefined;
  clearError: () => void;
}

export const useComboStore = create<ComboState>((set, get) => ({
  selections: [],
  lastError: null,

  totalOdds: () => {
    const { selections } = get();
    if (selections.length === 0) return 0;
    // Décroissance des cotes: 15% de réduction par pari supplémentaire
    // 1er pari: 100%, 2ème: 85%, 3ème: 72.25%, 4ème: 61.4%
    const raw = selections.reduce((acc, sel, index) => {
      const discountFactor = Math.pow(0.85, index);
      return acc * sel.adjustedOdds * discountFactor;
    }, 1);
    // Cap combo odds at x100
    return Math.min(raw, 100);
  },

  addToCombo: (prop: Prop, adjustedOdds: number, playerPuuid?: string, playerName?: string, gameId?: string) => {
    const { selections, isInCombo, canAddProp } = get();

    // Max 4 selections in a combo (anti-abuse measure)
    if (selections.length >= 4) {
      set({ lastError: 'Maximum 4 paris par combiné' });
      return false;
    }

    // Don't add duplicates
    if (isInCombo(prop.id)) {
      set({ lastError: 'Ce pari est déjà dans le combiné' });
      return false;
    }

    // Check for correlated props
    const { canAdd, reason } = canAddProp(prop.id);
    if (!canAdd) {
      set({ lastError: reason || 'Paris incompatibles' });
      return false;
    }

    // Don't allow combining bets from different players
    if (selections.length > 0 && playerPuuid) {
      const firstPlayerPuuid = selections[0].playerPuuid;
      if (firstPlayerPuuid && firstPlayerPuuid !== playerPuuid) {
        set({ lastError: 'Un combo doit concerner le même joueur' });
        return false;
      }
    }

    set({
      selections: [...selections, { prop, adjustedOdds, addedAt: Date.now(), playerPuuid, playerName, gameId }],
      lastError: null
    });
    return true;
  },

  removeFromCombo: (propId: string) => {
    set((state) => ({
      selections: state.selections.filter(s => s.prop.id !== propId),
      lastError: null
    }));
  },

  clearCombo: () => {
    set({ selections: [], lastError: null });
  },

  isInCombo: (propId: string) => {
    const { selections } = get();
    return selections.some(s => s.prop.id === propId);
  },

  canAddProp: (propId: string) => {
    const { selections } = get();

    // Check against all existing selections
    for (const sel of selections) {
      if (arePropsCorrelated(propId, sel.prop.id)) {
        const reason = getCorrelationReason(propId, sel.prop.id);
        return { canAdd: false, reason: reason || 'Paris corrélés non autorisés' };
      }
    }

    return { canAdd: true };
  },

  canAddPlayer: (playerPuuid?: string) => {
    const { selections } = get();
    // If no selections yet, any player can be added
    if (selections.length === 0) return true;
    // If no puuid provided, allow it
    if (!playerPuuid) return true;
    // Check if the first selection has the same player
    const firstPlayerPuuid = selections[0].playerPuuid;
    if (!firstPlayerPuuid) return true;
    return firstPlayerPuuid === playerPuuid;
  },

  getComboPlayerPuuid: () => {
    const { selections } = get();
    if (selections.length === 0) return undefined;
    return selections[0].playerPuuid;
  },

  clearError: () => {
    set({ lastError: null });
  }
}));
