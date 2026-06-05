import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MOCK_PROPS } from './mockData';
import { Prop } from '../types';

interface PropsStoreState {
  customOdds: Record<string, number>; // propId -> custom odds

  // Actions
  setOdds: (propId: string, odds: number) => void;
  resetOdds: (propId: string) => void;
  resetAllOdds: () => void;
  getProps: () => Prop[];
}

export const usePropsStore = create<PropsStoreState>()(
  persist(
    (set, get) => ({
      customOdds: {},

      setOdds: (propId, odds) => {
        set((state) => ({
          customOdds: {
            ...state.customOdds,
            [propId]: odds
          }
        }));
      },

      resetOdds: (propId) => {
        set((state) => {
          const newOdds = { ...state.customOdds };
          delete newOdds[propId];
          return { customOdds: newOdds };
        });
      },

      resetAllOdds: () => {
        set({ customOdds: {} });
      },

      // Get props with custom odds applied
      getProps: () => {
        const { customOdds } = get();
        return MOCK_PROPS.map(prop => ({
          ...prop,
          odds: customOdds[prop.id] ?? prop.odds
        }));
      }
    }),
    {
      name: 'johnny-props-storage'
    }
  )
);
