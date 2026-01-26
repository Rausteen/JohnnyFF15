// Service to manage tracked players in Supabase
import { supabase } from './supabase';
import { TrackedPlayer } from '../types';

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
    createdAt: sp.created_at
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

// Add a new tracked player
export async function addTrackedPlayer(player: {
  gameName: string;
  tagLine: string;
  puuid?: string;
  region: string;
  displayName: string;
}): Promise<TrackedPlayer | null> {
  try {
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

// Delete a tracked player
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

// Toggle player active status
export async function togglePlayerActive(playerId: string, isActive: boolean): Promise<boolean> {
  return updateTrackedPlayer(playerId, { isActive });
}
