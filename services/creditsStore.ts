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
  // Transfer tracking
  last_transfer_at: string | null;
  daily_transfer_total: number;
  daily_transfer_date: string | null;
}

// Transfer limits
const TRANSFER_MIN = 100;                    // Minimum 100 JC
const TRANSFER_MAX = 10000;                  // Maximum 10,000 JC per transaction
const TRANSFER_MAX_PERCENT = 0.5;            // Or max 50% of balance
const TRANSFER_DAILY_LIMIT = 50000;          // 50,000 JC per day
const TRANSFER_COOLDOWN_MS = 5 * 60 * 1000;  // 5 minutes between transfers
const TRANSFER_FEE_PERCENT = 0.05;           // 5% fee
const TRANSFER_MIN_BALANCE = 500;            // Keep at least 500 JC after transfer

interface CreditsState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadProfile: (userId: string) => Promise<void>;
  updateCredits: (amount: number) => Promise<boolean>;
  addCredits: (amount: number) => Promise<boolean>;
  subtractCredits: (amount: number) => Promise<boolean>;
  recordBetPlaced: () => Promise<boolean>;
  recordBetWon: (winnings: number) => Promise<boolean>;
  recordBetLost: (amount: number) => Promise<boolean>;
  claimDailyBonus: () => Promise<{ success: boolean; error?: string }>;
  canClaimDailyBonus: () => boolean;
  getTimeUntilNextBonus: () => { hours: number; minutes: number } | null;
  transferCredits: (recipientPseudo: string, amount: number) => Promise<{ success: boolean; error?: string; fee?: number }>;
  getTransferLimits: () => { min: number; max: number; dailyRemaining: number; cooldownRemaining: number | null; fee: number };
  clearProfile: () => void;
}

// Export constants for UI
export const TRANSFER_LIMITS = {
  MIN: TRANSFER_MIN,
  MAX: TRANSFER_MAX,
  MAX_PERCENT: TRANSFER_MAX_PERCENT,
  DAILY_LIMIT: TRANSFER_DAILY_LIMIT,
  COOLDOWN_MS: TRANSFER_COOLDOWN_MS,
  FEE_PERCENT: TRANSFER_FEE_PERCENT,
  MIN_BALANCE: TRANSFER_MIN_BALANCE
};

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

  // Record a bet being placed (increment total_bets only)
  // jc_lost is updated when bet is resolved, not when placed
  recordBetPlaced: async () => {
    const { profile } = get();
    if (!profile) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          total_bets: (profile.total_bets || 0) + 1
        })
        .eq('id', profile.id);

      if (error) throw error;

      set({
        profile: {
          ...profile,
          total_bets: (profile.total_bets || 0) + 1
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

  transferCredits: async (recipientPseudo: string, amount: number) => {
    const { profile } = get();
    if (!profile) return { success: false, error: 'Non connecte' };

    // Basic validations
    if (amount <= 0) return { success: false, error: 'Montant invalide' };
    if (profile.pseudo.toLowerCase() === recipientPseudo.toLowerCase()) {
      return { success: false, error: 'Tu ne peux pas te transferer des credits' };
    }

    // Minimum amount
    if (amount < TRANSFER_MIN) {
      return { success: false, error: `Minimum ${TRANSFER_MIN.toLocaleString('fr-FR')} JC` };
    }

    // Maximum per transaction (lesser of fixed max or 50% of balance)
    const maxAllowed = Math.min(TRANSFER_MAX, Math.floor(profile.credits * TRANSFER_MAX_PERCENT));
    if (amount > maxAllowed) {
      return { success: false, error: `Maximum ${maxAllowed.toLocaleString('fr-FR')} JC par transfert` };
    }

    // Calculate fee
    const fee = Math.ceil(amount * TRANSFER_FEE_PERCENT);
    const totalDeducted = amount + fee;

    // Check sufficient credits (including fee)
    if (profile.credits < totalDeducted) {
      return { success: false, error: `Credits insuffisants (${amount.toLocaleString('fr-FR')} + ${fee.toLocaleString('fr-FR')} frais)` };
    }

    // Check minimum balance after transfer
    if (profile.credits - totalDeducted < TRANSFER_MIN_BALANCE) {
      return { success: false, error: `Tu dois garder au moins ${TRANSFER_MIN_BALANCE.toLocaleString('fr-FR')} JC` };
    }

    // Check cooldown
    if (profile.last_transfer_at) {
      const lastTransfer = new Date(profile.last_transfer_at).getTime();
      const timeSince = Date.now() - lastTransfer;
      if (timeSince < TRANSFER_COOLDOWN_MS) {
        const remaining = Math.ceil((TRANSFER_COOLDOWN_MS - timeSince) / 60000);
        return { success: false, error: `Attends encore ${remaining} min avant le prochain transfert` };
      }
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    let dailyTotal = 0;
    if (profile.daily_transfer_date === today) {
      dailyTotal = profile.daily_transfer_total || 0;
    }
    if (dailyTotal + amount > TRANSFER_DAILY_LIMIT) {
      const remaining = TRANSFER_DAILY_LIMIT - dailyTotal;
      return { success: false, error: `Limite quotidienne: encore ${remaining.toLocaleString('fr-FR')} JC disponibles` };
    }

    try {
      // Find recipient by pseudo
      const { data: recipient, error: findError } = await supabase
        .from('profiles')
        .select('id, pseudo, credits')
        .ilike('pseudo', recipientPseudo)
        .single();

      if (findError || !recipient) {
        return { success: false, error: 'Joueur non trouve' };
      }

      const now = new Date().toISOString();
      const newDailyTotal = (profile.daily_transfer_date === today ? dailyTotal : 0) + amount;

      // Subtract from sender (amount + fee) and update transfer tracking
      const { error: senderError } = await supabase
        .from('profiles')
        .update({
          credits: profile.credits - totalDeducted,
          last_transfer_at: now,
          daily_transfer_total: newDailyTotal,
          daily_transfer_date: today
        })
        .eq('id', profile.id);

      if (senderError) throw senderError;

      // Add to recipient (amount only, fee is burned)
      const { error: recipientError } = await supabase
        .from('profiles')
        .update({ credits: recipient.credits + amount })
        .eq('id', recipient.id);

      if (recipientError) {
        // Rollback sender's credits
        await supabase
          .from('profiles')
          .update({
            credits: profile.credits,
            last_transfer_at: profile.last_transfer_at,
            daily_transfer_total: profile.daily_transfer_total,
            daily_transfer_date: profile.daily_transfer_date
          })
          .eq('id', profile.id);
        throw recipientError;
      }

      // Update local state
      set({
        profile: {
          ...profile,
          credits: profile.credits - totalDeducted,
          last_transfer_at: now,
          daily_transfer_total: newDailyTotal,
          daily_transfer_date: today
        }
      });

      return { success: true, fee };
    } catch (error: any) {
      console.error('Error transferring credits:', error);
      return { success: false, error: error.message };
    }
  },

  getTransferLimits: () => {
    const { profile } = get();
    if (!profile) {
      return { min: TRANSFER_MIN, max: 0, dailyRemaining: 0, cooldownRemaining: null, fee: TRANSFER_FEE_PERCENT * 100 };
    }

    // Max per transaction
    const maxAllowed = Math.min(TRANSFER_MAX, Math.floor(profile.credits * TRANSFER_MAX_PERCENT));

    // Daily remaining
    const today = new Date().toISOString().split('T')[0];
    const dailyUsed = profile.daily_transfer_date === today ? (profile.daily_transfer_total || 0) : 0;
    const dailyRemaining = TRANSFER_DAILY_LIMIT - dailyUsed;

    // Cooldown remaining
    let cooldownRemaining: number | null = null;
    if (profile.last_transfer_at) {
      const lastTransfer = new Date(profile.last_transfer_at).getTime();
      const timeSince = Date.now() - lastTransfer;
      if (timeSince < TRANSFER_COOLDOWN_MS) {
        cooldownRemaining = Math.ceil((TRANSFER_COOLDOWN_MS - timeSince) / 1000);
      }
    }

    return {
      min: TRANSFER_MIN,
      max: Math.max(0, Math.min(maxAllowed, dailyRemaining)),
      dailyRemaining,
      cooldownRemaining,
      fee: TRANSFER_FEE_PERCENT * 100
    };
  },

  clearProfile: () => {
    set({ profile: null, loading: false, error: null });
  }
}));
