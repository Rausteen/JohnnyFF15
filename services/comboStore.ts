import { create } from 'zustand';
import { Prop } from '../types';

export interface ComboSelection {
  prop: Prop;
  addedAt: number;
}

interface ComboState {
  selections: ComboSelection[];

  // Computed
  totalOdds: () => number;

  // Actions
  addToCombo: (prop: Prop) => void;
  removeFromCombo: (propId: string) => void;
  clearCombo: () => void;
  isInCombo: (propId: string) => boolean;
}

export const useComboStore = create<ComboState>((set, get) => ({
  selections: [],

  totalOdds: () => {
    const { selections } = get();
    if (selections.length === 0) return 0;
    return selections.reduce((acc, sel) => acc * sel.prop.odds, 1);
  },

  addToCombo: (prop: Prop) => {
    const { selections, isInCombo } = get();

    // Max 5 selections in a combo
    if (selections.length >= 5) return;

    // Don't add duplicates
    if (isInCombo(prop.id)) return;

    set({
      selections: [...selections, { prop, addedAt: Date.now() }]
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
