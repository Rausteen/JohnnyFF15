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
  player_puuid: string | null;
  player_name: string | null;
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
    resolvedStat: sb.resolved_stat || undefined,
    playerPuuid: sb.player_puuid || undefined,
    playerName: sb.player_name || undefined
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
    resolved_stat: bet.resolvedStat || null,
    player_puuid: bet.playerPuuid || null,
    player_name: bet.playerName || null
  };
}

// Save a bet to Supabase
export async function saveBetToSupabase(bet: Bet): Promise<boolean> {
  try {
    const supabaseBet = localBetToSupabase(bet);

    // Debug: Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Saving bet - Session exists:', !!session, 'User ID:', session?.user?.id, 'Bet user_id:', supabaseBet.user_id);

    if (!session) {
      console.error('Cannot save bet: User not authenticated');
      return false;
    }

    if (session.user.id !== supabaseBet.user_id) {
      console.error('User ID mismatch! Session:', session.user.id, 'Bet:', supabaseBet.user_id);
    }

    const { data, error } = await supabase
      .from('bets')
      .insert([supabaseBet])
      .select();

    if (error) {
      console.error('Error saving bet to Supabase:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Bet data:', JSON.stringify(supabaseBet, null, 2));
      return false;
    }

    console.log('Bet saved successfully:', data);
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

// Extended bet type with user pseudo
export interface BetWithPseudo extends Bet {
  userPseudo?: string;
}

// Get all pending bets with user pseudos (for public view)
export async function getAllPendingBetsWithPseudos(): Promise<BetWithPseudo[]> {
  try {
    // Get all pending bets
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'PENDING')
      .order('timestamp', { ascending: false });

    if (betsError) {
      console.error('Error fetching pending bets:', betsError);
      return [];
    }

    if (!bets || bets.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(bets.map(b => b.user_id).filter(Boolean))];

    // Fetch user pseudos
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, pseudo')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user ID to pseudo
    const pseudoMap = new Map<string, string>();
    (profiles || []).forEach(p => {
      pseudoMap.set(p.id, p.pseudo);
    });

    // Convert bets and add pseudos
    return bets.map(sb => ({
      ...supabaseBetToLocal(sb),
      userPseudo: pseudoMap.get(sb.user_id) || 'Inconnu'
    }));
  } catch (err) {
    console.error('Error fetching pending bets with pseudos:', err);
    return [];
  }
}

