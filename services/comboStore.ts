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

interface ComboState {
  selections: ComboSelection[];

  // Computed
  totalOdds: () => number;

  // Actions
  addToCombo: (prop: Prop, adjustedOdds: number, playerPuuid?: string, playerName?: string, gameId?: string) => void;
  removeFromCombo: (propId: string) => void;
  clearCombo: () => void;
  isInCombo: (propId: string) => boolean;
}

export const useComboStore = create<ComboState>((set, get) => ({
  selections: [],

  totalOdds: () => {
    const { selections } = get();
    if (selections.length === 0) return 0;
    // Décroissance des cotes: 10% de réduction par pari supplémentaire
    // 1er pari: 100%, 2ème: 90%, 3ème: 81%, 4ème: 72.9%
    return selections.reduce((acc, sel, index) => {
      const discountFactor = Math.pow(0.9, index);
      return acc * sel.adjustedOdds * discountFactor;
    }, 1);
  },

  addToCombo: (prop: Prop, adjustedOdds: number, playerPuuid?: string, playerName?: string, gameId?: string) => {
    const { selections, isInCombo } = get();

    // Max 4 selections in a combo (anti-abuse measure)
    if (selections.length >= 4) return;

    // Don't add duplicates
    if (isInCombo(prop.id)) return;

    set({
      selections: [...selections, { prop, adjustedOdds, addedAt: Date.now(), playerPuuid, playerName, gameId }]
    });
  },

  removeFromCombo: (propId: string) => {
    set((state) => ({
      selections: state.selections.filter(s => s.prop.id !== propId)
    }));
  },

  clearCombo: () => {
    set({ selections: [] });
  },

  isInCombo: (propId: string) => {
    const { selections } = get();
    return selections.some(s => s.prop.id === propId);
  }
}));
