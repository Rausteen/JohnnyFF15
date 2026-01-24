import { create } from 'zustand';
import { supabase } from './supabase';

interface UserProfile {
  id: string;
  pseudo: string;
  credits: number;
  last_daily_bonus: string | null;
  total_bets: number;
  bets_won: number;
  bets_lost: number;
  jc_won: number;
  jc_lost: number;
  created_at: string;
}

interface CreditsState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadProfile: (userId: string) => Promise<void>;
  updateCredits: (amount: number) => Promise<boolean>;
  addCredits: (amount: number) => Promise<boolean>;
  subtractCredits: (amount: number) => Promise<boolean>;
  recordBetPlaced: (amount: number) => Promise<boolean>;
  recordBetWon: (winnings: number) => Promise<boolean>;
  recordBetLost: (amount: number) => Promise<boolean>;
  claimDailyBonus: () => Promise<{ success: boolean; error?: string }>;
  canClaimDailyBonus: () => boolean;
  getTimeUntilNextBonus: () => { hours: number; minutes: number } | null;
  clearProfile: () => void;
}

const DAILY_BONUS_AMOUNT = 1000;
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export const useCreditsStore = create<CreditsState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  loadProfile: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, it might be a new user - wait for trigger
        if (error.code === 'PGRST116') {
          // Profile not found, try to create it
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                pseudo: userData.user.user_metadata?.pseudo || userData.user.email?.split('@')[0] || 'Joueur',
                credits: 10000,
                last_daily_bonus: null
              })
              .select()
              .single();

            if (!insertError && newProfile) {
              set({ profile: newProfile as UserProfile, loading: false });
              return;
            }
          }
        }
        throw error;
      }

      set({ profile: data as UserProfile, loading: false });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      set({ error: error.message, loading: false });
    }
  },

  updateCredits: async (newAmount: number) => {
    const { profile } = get();
    if (!profile) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newAmount })
        .eq('id', profile.id);

      if (error) throw error;

      set({ profile: { ...profile, credits: newAmount } });
      return true;
    } catch (error: any) {
      console.error('Error updating credits:', error);
      set({ error: error.message });
      return false;
    }
  },

  addCredits: async (amount: number) => {
    const { profile, updateCredits } = get();
    if (!profile) return false;
    return updateCredits(profile.credits + amount);
  },

  subtractCredits: async (amount: number) => {
    const { profile, updateCredits } = get();
    if (!profile || profile.credits < amount) return false;
    return updateCredits(profile.credits - amount);
  },

  // Record a bet being placed (increment total_bets)
  recordBetPlaced: async (amount: number) => {
    const { profile } = get();
    if (!profile) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          total_bets: (profile.total_bets || 0) + 1,
          jc_lost: (profile.jc_lost || 0) + amount
        })
        .eq('id', profile.id);

      if (error) throw error;

      set({
        profile: {
          ...profile,
          total_bets: (profile.total_bets || 0) + 1,
          jc_lost: (profile.jc_lost || 0) + amount
        }
      });
      return true;
    } catch (error: any) {
      console.error('Error recording bet:', error);
      return false;
    }
  },

  // Record a winning bet (add winnings to jc_won and increment bets_won)
  recordBetWon: async (winnings: number) => {
    const { profile } = get();
    if (!profile) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bets_won: (profile.bets_won || 0) + 1,
          jc_won: (profile.jc_won || 0) + winnings
        })
        .eq('id', profile.id);

      if (error) throw error;

      set({
        profile: {
          ...profile,
          bets_won: (profile.bets_won || 0) + 1,
          jc_won: (profile.jc_won || 0) + winnings
        }
      });
      return true;
    } catch (error: any) {
      console.error('Error recording win:', error);
      return false;
    }
  },

  // Record a losing bet (increment bets_lost)
  recordBetLost: async (amount: number) => {
    const { profile } = get();
    if (!profile) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bets_lost: (profile.bets_lost || 0) + 1
        })
        .eq('id', profile.id);

      if (error) throw error;

      set({
        profile: {
          ...profile,
          bets_lost: (profile.bets_lost || 0) + 1
        }
      });
      return true;
    } catch (error: any) {
      console.error('Error recording loss:', error);
      return false;
    }
  },

  canClaimDailyBonus: () => {
    const { profile } = get();
    if (!profile) return false;
    if (!profile.last_daily_bonus) return true;

    const lastBonus = new Date(profile.last_daily_bonus).getTime();
    const now = Date.now();
    return now - lastBonus >= DAILY_BONUS_COOLDOWN_MS;
  },

  getTimeUntilNextBonus: () => {
    const { profile } = get();
    if (!profile || !profile.last_daily_bonus) return null;

    const lastBonus = new Date(profile.last_daily_bonus).getTime();
    const nextBonus = lastBonus + DAILY_BONUS_COOLDOWN_MS;
    const now = Date.now();
    const remaining = nextBonus - now;

    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return { hours, minutes };
  },

  claimDailyBonus: async () => {
    const { profile, canClaimDailyBonus } = get();
    if (!profile) return { success: false, error: 'Non connecté' };
    if (!canClaimDailyBonus()) return { success: false, error: 'Bonus déjà réclamé aujourd\'hui' };

    try {
      const newCredits = profile.credits + DAILY_BONUS_AMOUNT;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update({
          credits: newCredits,
          last_daily_bonus: now
        })
        .eq('id', profile.id);

      if (error) throw error;

      set({
        profile: {
          ...profile,
          credits: newCredits,
          last_daily_bonus: now
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error claiming daily bonus:', error);
      return { success: false, error: error.message };
    }
  },

  clearProfile: () => {
    set({ profile: null, loading: false, error: null });
  }
}));
