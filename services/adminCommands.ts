/**
 * Admin Commands Service
 *
 * Sends commands to the game-watcher script via Supabase.
 * The game-watcher processes these commands and updates the results.
 */

import { supabase } from './supabase';

export interface CommandResult {
  success: boolean;
  message: string;
  matches?: unknown[];
}

interface AdminCommand {
  id: string;
  command: string;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result: CommandResult | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Send a command to the game-watcher
 */
export async function sendCommand(
  command: string,
  params: Record<string, unknown> = {}
): Promise<{ commandId: string } | null> {
  const { data, error } = await supabase
    .from('admin_commands')
    .insert([{ command, params, status: 'pending' }])
    .select('id')
    .single();

  if (error) {
    console.error('Error sending command:', error);
    return null;
  }

  return { commandId: data.id };
}

/**
 * Wait for a command to complete (with timeout)
 */
export async function waitForCommand(
  commandId: string,
  timeoutMs: number = 60000,
  pollIntervalMs: number = 1000
): Promise<CommandResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await supabase
      .from('admin_commands')
      .select('*')
      .eq('id', commandId)
      .single();

    if (error) {
      console.error('Error polling command:', error);
      return { success: false, message: 'Erreur lors de la vérification' };
    }

    const cmd = data as AdminCommand;

    if (cmd.status === 'completed') {
      return cmd.result || { success: true, message: 'Commande exécutée' };
    }

    if (cmd.status === 'error') {
      return cmd.result || { success: false, message: 'Erreur lors de l\'exécution' };
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  return { success: false, message: 'Timeout - le script game-watcher est peut-être arrêté' };
}

/**
 * Send a command and wait for result
 */
export async function executeCommand(
  command: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 60000
): Promise<CommandResult> {
  const result = await sendCommand(command, params);

  if (!result) {
    return { success: false, message: 'Erreur lors de l\'envoi de la commande' };
  }

  return waitForCommand(result.commandId, timeoutMs);
}

/**
 * Sync last game for all players
 */
export async function syncLastGame(): Promise<CommandResult> {
  return executeCommand('sync_last_game');
}

/**
 * Check all players status
 */
export async function checkPlayersStatus(): Promise<CommandResult> {
  return executeCommand('check_status');
}

/**
 * Get PUUID for a player
 */
export async function getPuuid(
  gameName: string,
  tagLine: string,
  region: string
): Promise<CommandResult & { puuid?: string }> {
  return executeCommand('get_puuid', { gameName, tagLine, region }, 30000) as Promise<CommandResult & { puuid?: string }>;
}

/**
 * Get match data by match ID
 */
export async function getMatch(
  matchId: string,
  region: string
): Promise<CommandResult & { matchData?: unknown }> {
  return executeCommand('get_match', { matchId, region }, 30000) as Promise<CommandResult & { matchData?: unknown }>;
}

/**
 * Sync ranks for all players
 */
export async function syncRanks(): Promise<CommandResult & { updated?: number }> {
  return executeCommand('sync_ranks', {}, 120000) as Promise<CommandResult & { updated?: number }>;
}

/**
 * Sync games for a specific player (20 last games)
 */
export async function syncPlayerGames(playerId: string): Promise<CommandResult> {
  return executeCommand('sync_player_games', { playerId }, 120000);
}
