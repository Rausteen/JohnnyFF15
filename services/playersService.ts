// Service to manage tracked players in Supabase
import { supabase } from './supabase';
import { TrackedPlayer, PlayerRole, RankTier, RankDivision } from '../types';

export interface SupabaseTrackedPlayer {
  id: string;
  game_name: string;
  tag_line: string;
  puuid: string | null;
  region: string;
  display_name: string;
  is_active: boolean;
  last_match_id: string | null;
  created_at: string;
  user_id: string | null; // Linked Supabase user ID
  primary_role: string | null; // Preferred primary role
  secondary_role: string | null; // Preferred secondary role
  // Rank Solo/Duo
  solo_tier: string | null;
  solo_division: string | null;
  solo_lp: number | null;
  rank_updated_at: string | null;
}

// Convert Supabase player to local format
export function supabasePlayerToLocal(sp: SupabaseTrackedPlayer): TrackedPlayer {
  return {
    id: sp.id,
    gameName: sp.game_name,
    tagLine: sp.tag_line,
    puuid: sp.puuid,
    region: sp.region,
    displayName: sp.display_name,
    isActive: sp.is_active,
    createdAt: sp.created_at,
    userId: sp.user_id,
    primaryRole: sp.primary_role as PlayerRole | null,
    secondaryRole: sp.secondary_role as PlayerRole | null,
    soloTier: sp.solo_tier as RankTier | null,
    soloDivision: sp.solo_division as RankDivision | null,
    soloLp: sp.solo_lp,
    rankUpdatedAt: sp.rank_updated_at
  };
}

// Get all tracked players
export async function getTrackedPlayers(): Promise<TrackedPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('tracked_players')
      .select('*')
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching tracked players:', error);
      return [];
    }

    return (data || []).map(supabasePlayerToLocal);
  } catch (err) {
    console.error('Error fetching tracked players:', err);
    return [];
  }
}

// Get active tracked players only
export async function getActiveTrackedPlayers(): Promise<TrackedPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('tracked_players')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching active players:', error);
      return [];
    }

    return (data || []).map(supabasePlayerToLocal);
  } catch (err) {
    console.error('Error fetching active players:', err);
    return [];
  }
}

// Get inactive tracked players only
export async function getInactiveTrackedPlayers(): Promise<TrackedPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('tracked_players')
      .select('*')
      .eq('is_active', false)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching inactive players:', error);
      return [];
    }

    return (data || []).map(supabasePlayerToLocal);
  } catch (err) {
    console.error('Error fetching inactive players:', err);
    return [];
  }
}

// Get a specific player by ID
export async function getTrackedPlayerById(playerId: string): Promise<TrackedPlayer | null> {
  try {
    const { data, error } = await supabase
      .from('tracked_players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error || !data) {
      return null;
    }

    return supabasePlayerToLocal(data);
  } catch (err) {
    console.error('Error fetching player:', err);
    return null;
  }
}

// Get a player by PUUID
export async function getTrackedPlayerByPuuid(puuid: string): Promise<TrackedPlayer | null> {
  try {
    const { data, error } = await supabase
      .from('tracked_players')
      .select('*')
      .eq('puuid', puuid)
      .single();

    if (error || !data) {
      return null;
    }

    return supabasePlayerToLocal(data);
  } catch (err) {
    console.error('Error fetching player by PUUID:', err);
    return null;
  }
}

// Add a new tracked player (or reactivate if already exists)
export async function addTrackedPlayer(player: {
  gameName: string;
  tagLine: string;
  puuid?: string;
  region: string;
  displayName: string;
}): Promise<TrackedPlayer | null> {
  try {
    // Check if player already exists (by PUUID or game_name + tag_line)
    let existingPlayer = null;

    if (player.puuid) {
      const { data } = await supabase
        .from('tracked_players')
        .select('*')
        .eq('puuid', player.puuid)
        .single();
      existingPlayer = data;
    }

    if (!existingPlayer) {
      const { data } = await supabase
        .from('tracked_players')
        .select('*')
        .eq('game_name', player.gameName)
        .eq('tag_line', player.tagLine)
        .single();
      existingPlayer = data;
    }

    // If player exists, reactivate and update
    if (existingPlayer) {
      const { data, error } = await supabase
        .from('tracked_players')
        .update({
          game_name: player.gameName,
          tag_line: player.tagLine,
          puuid: player.puuid || existingPlayer.puuid,
          region: player.region,
          display_name: player.displayName,
          is_active: true
        })
        .eq('id', existingPlayer.id)
        .select()
        .single();

      if (error) {
        console.error('Error reactivating player:', error);
        return null;
      }
      console.log('Player reactivated:', player.displayName);
      return supabasePlayerToLocal(data);
    }

    // Otherwise, create new player
    const { data, error } = await supabase
      .from('tracked_players')
      .insert([{
        game_name: player.gameName,
        tag_line: player.tagLine,
        puuid: player.puuid || null,
        region: player.region,
        display_name: player.displayName,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding tracked player:', error);
      return null;
    }

    return supabasePlayerToLocal(data);
  } catch (err) {
    console.error('Error adding tracked player:', err);
    return null;
  }
}

// Update a tracked player
export async function updateTrackedPlayer(
  playerId: string,
  updates: Partial<{
    gameName: string;
    tagLine: string;
    puuid: string | null;
    region: string;
    displayName: string;
    isActive: boolean;
    lastMatchId: string | null;
    userId: string | null;
    primaryRole: PlayerRole | null;
    secondaryRole: PlayerRole | null;
  }>
): Promise<boolean> {
  try {
    const dbUpdates: Partial<SupabaseTrackedPlayer> = {};
    if (updates.gameName !== undefined) dbUpdates.game_name = updates.gameName;
    if (updates.tagLine !== undefined) dbUpdates.tag_line = updates.tagLine;
    if (updates.puuid !== undefined) dbUpdates.puuid = updates.puuid;
    if (updates.region !== undefined) dbUpdates.region = updates.region;
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.lastMatchId !== undefined) dbUpdates.last_match_id = updates.lastMatchId;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (updates.primaryRole !== undefined) dbUpdates.primary_role = updates.primaryRole;
    if (updates.secondaryRole !== undefined) dbUpdates.secondary_role = updates.secondaryRole;

    const { error } = await supabase
      .from('tracked_players')
      .update(dbUpdates)
      .eq('id', playerId);

    if (error) {
      console.error('Error updating tracked player:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating tracked player:', err);
    return false;
  }
}

// Delete a tracked player (soft delete - just removes from tracked_players)
export async function deleteTrackedPlayer(playerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tracked_players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('Error deleting tracked player:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting tracked player:', err);
    return false;
  }
}

// PERMANENTLY delete a tracked player from ALL tables
// This ensures the player cannot be recreated by migrations or other processes
export async function permanentlyDeleteTrackedPlayer(playerId: string): Promise<{ success: boolean; message: string }> {
  try {
    // First get the player info
    const { data: player, error: fetchError } = await supabase
      .from('tracked_players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (fetchError || !player) {
      return { success: false, message: 'Joueur non trouvé' };
    }

    // 1. Delete from player_game_status (cascade should handle this, but let's be sure)
    const { error: statusError } = await supabase
      .from('player_game_status')
      .delete()
      .eq('player_id', playerId);

    if (statusError) {
      console.warn('Error deleting player_game_status:', statusError);
    }

    // 2. Delete from tracked_players
    const { error: playerError } = await supabase
      .from('tracked_players')
      .delete()
      .eq('id', playerId);

    if (playerError) {
      console.error('Error deleting tracked player:', playerError);
      return { success: false, message: 'Erreur lors de la suppression du joueur' };
    }

    // 3. If this player matches johnny_config, clear it to prevent re-migration
    if (player.display_name === 'Johnny' || player.game_name) {
      const { error: configError } = await supabase
        .from('johnny_config')
        .update({
          riot_id: null,
          puuid: null,
          last_match_id: null
        })
        .eq('id', 1);

      if (configError) {
        console.warn('Error clearing johnny_config:', configError);
        // Not critical, continue
      }
    }

    console.log(`Permanently deleted player: ${player.display_name} (${player.game_name}#${player.tag_line})`);
    return { success: true, message: `${player.display_name} supprimé définitivement` };
  } catch (err) {
    console.error('Error permanently deleting player:', err);
    return { success: false, message: 'Erreur inattendue lors de la suppression' };
  }
}

// Delete ALL tracked players permanently
export async function deleteAllTrackedPlayers(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    // 1. Delete all player_game_status entries
    const { error: statusError } = await supabase
      .from('player_game_status')
      .delete()
      .neq('player_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (statusError) {
      console.warn('Error deleting all player_game_status:', statusError);
    }

    // 2. Count players before deletion
    const { count } = await supabase
      .from('tracked_players')
      .select('*', { count: 'exact', head: true });

    // 3. Delete all tracked_players
    const { error: playerError } = await supabase
      .from('tracked_players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (playerError) {
      console.error('Error deleting all tracked players:', playerError);
      return { success: false, message: 'Erreur lors de la suppression', count: 0 };
    }

    // 4. Clear johnny_config to prevent re-migration
    const { error: configError } = await supabase
      .from('johnny_config')
      .update({
        riot_id: null,
        puuid: null,
        last_match_id: null
      })
      .eq('id', 1);

    if (configError) {
      console.warn('Error clearing johnny_config:', configError);
    }

    console.log(`Permanently deleted ALL ${count || 0} tracked players`);
    return { success: true, message: `${count || 0} joueur(s) supprimé(s) définitivement`, count: count || 0 };
  } catch (err) {
    console.error('Error deleting all tracked players:', err);
    return { success: false, message: 'Erreur inattendue', count: 0 };
  }
}

// Toggle player active status
export async function togglePlayerActive(playerId: string, isActive: boolean): Promise<boolean> {
  return updateTrackedPlayer(playerId, { isActive });
}

// Link a Supabase user to a tracked player
export async function linkUserToPlayer(playerId: string, userId: string): Promise<boolean> {
  return updateTrackedPlayer(playerId, { userId });
}

// Unlink a user from a tracked player
export async function unlinkUserFromPlayer(playerId: string): Promise<boolean> {
  return updateTrackedPlayer(playerId, { userId: null });
}

// Check if a user is the tracked player (for self-betting prevention)
export function isUserThePlayer(player: TrackedPlayer | undefined, userId: string | undefined): boolean {
  if (!player || !userId) return false;
  return player.userId === userId;
}

// Update player roles
export async function updatePlayerRoles(
  playerId: string,
  primaryRole: PlayerRole | null,
  secondaryRole: PlayerRole | null
): Promise<boolean> {
  return updateTrackedPlayer(playerId, { primaryRole, secondaryRole });
}
