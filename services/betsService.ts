// Service to manage bets in Supabase (shared across all users)
import { supabase } from './supabase';
import { Bet, BetStatus } from '../types';

export interface SupabaseBet {
  id: string;
  user_id: string;
  prop_id: string;
  prop_title: string;
  amount: number;
  odds: number;
  potential_payout: number;
  status: string;
  match_id: string;
  timestamp: number;
  combo_id: string | null;
  combo_index: number | null;
  combo_total: number | null;
  champion_name: string | null;
  resolved_stat: string | null;
  created_at: string;
}

// Convert Supabase bet to local bet format
export function supabaseBetToLocal(sb: SupabaseBet): Bet {
  return {
    id: sb.id,
    propId: sb.prop_id,
    propTitle: sb.prop_title,
    amount: sb.amount,
    odds: sb.odds,
    potentialPayout: sb.potential_payout,
    status: sb.status as BetStatus,
    matchId: sb.match_id,
    timestamp: sb.timestamp,
    comboId: sb.combo_id || undefined,
    comboIndex: sb.combo_index || undefined,
    comboTotal: sb.combo_total || undefined,
    userId: sb.user_id,
    championName: sb.champion_name || undefined,
    resolvedStat: sb.resolved_stat || undefined
  };
}

// Convert local bet to Supabase format
export function localBetToSupabase(bet: Bet): Omit<SupabaseBet, 'created_at'> {
  return {
    id: bet.id,
    user_id: bet.userId || '',
    prop_id: bet.propId,
    prop_title: bet.propTitle,
    amount: bet.amount,
    odds: bet.odds,
    potential_payout: bet.potentialPayout,
    status: bet.status,
    match_id: bet.matchId,
    timestamp: bet.timestamp,
    combo_id: bet.comboId || null,
    combo_index: bet.comboIndex || null,
    combo_total: bet.comboTotal || null,
    champion_name: bet.championName || null,
    resolved_stat: bet.resolvedStat || null
  };
}

// Save a bet to Supabase
export async function saveBetToSupabase(bet: Bet): Promise<boolean> {
  try {
    const supabaseBet = localBetToSupabase(bet);
    const { error } = await supabase
      .from('bets')
      .upsert([supabaseBet], { onConflict: 'id' });

    if (error) {
      console.error('Error saving bet to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving bet:', err);
    return false;
  }
}

// Get all pending bets from Supabase (for admin)
export async function getAllPendingBets(): Promise<Bet[]> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'PENDING')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching pending bets:', error);
      return [];
    }

    return (data || []).map(supabaseBetToLocal);
  } catch (err) {
    console.error('Error fetching bets:', err);
    return [];
  }
}

// Get all bets for a specific user
export async function getUserBets(userId: string): Promise<Bet[]> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching user bets:', error);
      return [];
    }

    return (data || []).map(supabaseBetToLocal);
  } catch (err) {
    console.error('Error fetching user bets:', err);
    return [];
  }
}

// Update bet status in Supabase
export async function updateBetStatus(
  betId: string,
  status: BetStatus,
  resolvedStat?: string
): Promise<boolean> {
  try {
    const updateData: { status: string; resolved_stat?: string } = { status };
    if (resolvedStat) {
      updateData.resolved_stat = resolvedStat;
    }

    const { error } = await supabase
      .from('bets')
      .update(updateData)
      .eq('id', betId);

    if (error) {
      console.error('Error updating bet status:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating bet:', err);
    return false;
  }
}

// Get a specific bet by ID
export async function getBetById(betId: string): Promise<Bet | null> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (error || !data) {
      return null;
    }

    return supabaseBetToLocal(data);
  } catch (err) {
    console.error('Error fetching bet:', err);
    return null;
  }
}

// Delete a bet from Supabase
export async function deleteBetFromSupabase(betId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', betId);

    if (error) {
      console.error('Error deleting bet:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting bet:', err);
    return false;
  }
}

// Delete all bets for a specific user (for account reset)
export async function deleteUserBets(userId: string): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    // First, count how many bets this user has
    const { data: existingBets, error: countError } = await supabase
      .from('bets')
      .select('id')
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting user bets:', countError);
      return { success: false, deleted: 0, error: countError.message };
    }

    const betCount = existingBets?.length || 0;
    console.log(`Found ${betCount} bets for user ${userId}`);

    if (betCount === 0) {
      return { success: true, deleted: 0 };
    }

    // Delete all bets for this user
    const { error: deleteError } = await supabase
      .from('bets')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting user bets:', deleteError);
      return { success: false, deleted: 0, error: deleteError.message };
    }

    // Verify deletion worked
    const { data: remainingBets, error: verifyError } = await supabase
      .from('bets')
      .select('id')
      .eq('user_id', userId);

    if (verifyError) {
      console.error('Error verifying bet deletion:', verifyError);
      return { success: false, deleted: 0, error: verifyError.message };
    }

    const remaining = remainingBets?.length || 0;
    if (remaining > 0) {
      console.error(`RLS blocked deletion: ${remaining} bets still remain`);
      return {
        success: false,
        deleted: betCount - remaining,
        error: `Permissions insuffisantes: ${remaining} paris n'ont pas pu être supprimés. Vérifiez les politiques admin dans Supabase.`
      };
    }

    console.log(`Successfully deleted ${betCount} bets for user ${userId}`);
    return { success: true, deleted: betCount };
  } catch (err: any) {
    console.error('Error deleting user bets:', err);
    return { success: false, deleted: 0, error: err.message };
  }
}

// Get pending bets for a specific user
export async function getUserPendingBets(userId: string): Promise<Bet[]> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching user pending bets:', error);
      return [];
    }

    return (data || []).map(supabaseBetToLocal);
  } catch (err) {
    console.error('Error fetching user pending bets:', err);
    return [];
  }
}

// Get all bets (for public history - all users can see all bets)
export async function getAllBets(): Promise<Bet[]> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching all bets:', error);
      return [];
    }

    return (data || []).map(supabaseBetToLocal);
  } catch (err) {
    console.error('Error fetching all bets:', err);
    return [];
  }
}

// Get bets for a specific user (for public profile view)
export async function getBetsByUserId(userId: string): Promise<Bet[]> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching user bets:', error);
      return [];
    }

    return (data || []).map(supabaseBetToLocal);
  } catch (err) {
    console.error('Error fetching user bets:', err);
    return [];
  }
}

// Migrate local bets to Supabase (for old bets before Supabase integration)
// This should be called when a user loads their bets
// IMPORTANT: Skips bets that were placed before an account reset
export async function migrateLocalBetsToSupabase(localBets: Bet[], userId: string): Promise<number> {
  if (!localBets || localBets.length === 0) return 0;

  // Filter bets for this user
  const userBets = localBets.filter(b => b.userId === userId);
  if (userBets.length === 0) return 0;

  try {
    // Check if the account has been reset - get reset_at timestamp
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('reset_at')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile for migration:', profileError);
      return 0;
    }

    // If account was reset, filter out bets placed before the reset
    let betsToConsider = userBets;
    if (profile?.reset_at) {
      const resetTimestamp = new Date(profile.reset_at).getTime();
      betsToConsider = userBets.filter(b => b.timestamp > resetTimestamp);
      console.log(`Account was reset at ${profile.reset_at}, filtering bets. ${userBets.length} -> ${betsToConsider.length} bets`);

      if (betsToConsider.length === 0) {
        console.log('All local bets are from before account reset, skipping migration');
        return 0;
      }
    }

    // Get existing bet IDs from Supabase
    const { data: existingBets, error: fetchError } = await supabase
      .from('bets')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching existing bets:', fetchError);
      return 0;
    }

    const existingIds = new Set((existingBets || []).map(b => b.id));

    // Find bets that don't exist in Supabase (from betsToConsider, not userBets)
    const betsToMigrate = betsToConsider.filter(b => !existingIds.has(b.id));

    if (betsToMigrate.length === 0) {
      console.log('No bets to migrate');
      return 0;
    }

    console.log(`Migrating ${betsToMigrate.length} local bets to Supabase...`);

    // Convert to Supabase format and insert
    const supabaseBets = betsToMigrate.map(localBetToSupabase);

    const { error: insertError } = await supabase
      .from('bets')
      .upsert(supabaseBets, { onConflict: 'id' });

    if (insertError) {
      console.error('Error migrating bets:', insertError);
      return 0;
    }

    console.log(`Successfully migrated ${betsToMigrate.length} bets to Supabase`);
    return betsToMigrate.length;
  } catch (err) {
    console.error('Error in migrateLocalBetsToSupabase:', err);
    return 0;
  }
}
