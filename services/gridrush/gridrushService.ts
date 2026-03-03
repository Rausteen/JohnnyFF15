import { supabase } from '../supabase';
import type { GameSession, Team, Player, ChatMessage, CrosswordGridData, GridSet } from './gridrushTypes';
import { getDefaultGridSet } from './gridrushData';

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function saveGrid(grid: CrosswordGridData, createdBy: string): Promise<string | null> {
  const { data, error } = await supabase.from('gridrush_grids').insert({
    id: grid.id, name: grid.name, difficulty: grid.difficulty, rows: grid.rows, cols: grid.cols,
    words: grid.words, mystery_cells: grid.mysteryCells, mystery_word: grid.mysteryWord,
    mystery_clue: grid.mysteryClue, mystery_hint_5: grid.mysteryHint5, mystery_hint_8: grid.mysteryHint8,
    created_by: createdBy,
  }).select('id').single();
  if (error) { console.error('Error saving grid:', error); return null; }
  return data.id;
}

export async function loadGridSet(gridSetId: string): Promise<GridSet | null> {
  if (gridSetId === 'default-set') return getDefaultGridSet();
  const { data: setData, error } = await supabase.from('gridrush_grid_sets').select('*').eq('id', gridSetId).single();
  if (error || !setData) return null;
  const gridIds = [setData.easy_grid_id, setData.medium_grid_id, setData.hard_grid_id];
  const { data: grids } = await supabase.from('gridrush_grids').select('*').in('id', gridIds);
  if (!grids || grids.length < 3) return null;
  const mapGrid = (r: any): CrosswordGridData => ({
    id: r.id, name: r.name, difficulty: r.difficulty, rows: r.rows, cols: r.cols,
    words: r.words, mysteryCells: r.mystery_cells, mysteryWord: r.mystery_word,
    mysteryClue: r.mystery_clue, mysteryHint5: r.mystery_hint_5, mysteryHint8: r.mystery_hint_8,
  });
  const e = grids.find((g: any) => g.id === setData.easy_grid_id);
  const m = grids.find((g: any) => g.id === setData.medium_grid_id);
  const h = grids.find((g: any) => g.id === setData.hard_grid_id);
  if (!e || !m || !h) return null;
  return { id: setData.id, name: setData.name, grids: [mapGrid(e), mapGrid(m), mapGrid(h)], createdBy: setData.created_by, createdAt: setData.created_at };
}

export async function createGame(hostName: string, gridSetId: string, teamName: string, timerDuration = 1200) {
  const gameCode = generateGameCode();
  const gameId = generateId();
  const teamId = generateId();
  const playerId = generateId();

  const { error: ge } = await supabase.from('gridrush_games').insert({ id: gameId, game_code: gameCode, grid_set_id: gridSetId, host_id: playerId, status: 'lobby', timer_duration: timerDuration });
  if (ge) { console.error(ge); return null; }
  const { error: te } = await supabase.from('gridrush_teams').insert({ id: teamId, game_id: gameId, name: teamName, status: 'waiting', current_grid_index: 0, words_found: [[], [], []] });
  if (te) { console.error(te); return null; }
  const { error: pe } = await supabase.from('gridrush_players').insert({ id: playerId, team_id: teamId, game_id: gameId, name: hostName, is_host: true });
  if (pe) { console.error(pe); return null; }
  return { gameCode, gameId, teamId, playerId };
}

export async function joinGame(gameCode: string, playerName: string, teamId?: string, newTeamName?: string) {
  const { data: game, error: ge } = await supabase.from('gridrush_games').select('*').eq('game_code', gameCode.toUpperCase()).single();
  if (ge || !game || game.status !== 'lobby') return null;
  const playerId = generateId();
  let actualTeamId = teamId;

  if (!teamId && newTeamName) {
    const newTeamId = generateId();
    const { error } = await supabase.from('gridrush_teams').insert({ id: newTeamId, game_id: game.id, name: newTeamName, status: 'waiting', current_grid_index: 0, words_found: [[], [], []] });
    if (error) return null;
    actualTeamId = newTeamId;
  }
  if (!actualTeamId) return null;

  const { data: existing } = await supabase.from('gridrush_players').select('id').eq('team_id', actualTeamId);
  if (existing && existing.length >= 2) return null;

  const { error } = await supabase.from('gridrush_players').insert({ id: playerId, team_id: actualTeamId, game_id: game.id, name: playerName, is_host: false });
  if (error) return null;

  // Broadcast player_joined so lobby updates in realtime for everyone
  try {
    const ch = supabase.channel(`gridrush-lobby-${game.id}`);
    await new Promise<void>((resolve) => {
      ch.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
      // Timeout after 3s if subscription doesn't complete
      setTimeout(resolve, 3000);
    });
    ch.send({ type: 'broadcast', event: 'player_joined', payload: { player: { id: playerId, name: playerName, teamId: actualTeamId, isHost: false }, teamId: actualTeamId } });
    setTimeout(() => supabase.removeChannel(ch), 1000);
  } catch { /* best-effort */ }

  return { gameId: game.id, teamId: actualTeamId, playerId };
}

export async function getGameByCode(gameCode: string): Promise<GameSession | null> {
  const { data: game } = await supabase.from('gridrush_games').select('*').eq('game_code', gameCode.toUpperCase()).single();
  if (!game) return null;
  const { data: teams } = await supabase.from('gridrush_teams').select('*').eq('game_id', game.id);
  const { data: players } = await supabase.from('gridrush_players').select('*').eq('game_id', game.id);

  const mappedTeams: Team[] = (teams || []).map((t: any) => ({
    id: t.id, gameId: t.game_id, name: t.name,
    players: (players || []).filter((p: any) => p.team_id === t.id).map((p: any) => ({ id: p.id, name: p.name, teamId: p.team_id, isHost: p.is_host })),
    status: t.status, currentGridIndex: t.current_grid_index, wordsFoundPerGrid: t.words_found, finishedAt: t.finished_at,
  }));

  return { id: game.id, gameCode: game.game_code, gridSetId: game.grid_set_id, hostId: game.host_id, status: game.status, teams: mappedTeams, startedAt: game.started_at, finishedAt: game.finished_at, winnerTeamId: game.winner_team_id, timerDuration: game.timer_duration };
}

export async function startGame(gameId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('gridrush_games').update({ status: 'playing', started_at: now }).eq('id', gameId);
  if (error) return false;
  await supabase.from('gridrush_teams').update({ status: 'playing' }).eq('game_id', gameId);
  return true;
}

export async function updateTeamProgress(teamId: string, currentGridIndex: number, wordsFound: number[][]) {
  await supabase.from('gridrush_teams').update({ current_grid_index: currentGridIndex, words_found: wordsFound }).eq('id', teamId);
}

export async function finishTeam(teamId: string) {
  await supabase.from('gridrush_teams').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', teamId);
}

export async function finishGame(gameId: string, winnerTeamId?: string) {
  await supabase.from('gridrush_games').update({ status: 'finished', finished_at: new Date().toISOString(), winner_team_id: winnerTeamId || null }).eq('id', gameId);
}

export async function sendChatMessage(gameId: string, teamId: string, playerName: string, message: string) {
  await supabase.from('gridrush_chat_messages').insert({ game_id: gameId, team_id: teamId, player_name: playerName, message });
}

// --- Cleanup stale games ---

/** Mark all old lobby/playing games by this player as 'finished' so they don't interfere */
export async function cleanupStaleGames(playerName: string) {
  // Find all players with this name that are hosts
  const { data: hostPlayers } = await supabase.from('gridrush_players').select('game_id').eq('name', playerName).eq('is_host', true);
  if (!hostPlayers || hostPlayers.length === 0) return;

  const gameIds = hostPlayers.map(p => p.game_id);
  // Mark all lobby/playing games as finished
  const now = new Date().toISOString();
  await supabase.from('gridrush_games').update({ status: 'finished', finished_at: now }).in('id', gameIds).in('status', ['lobby', 'playing']);
  await supabase.from('gridrush_teams').update({ status: 'finished', finished_at: now }).in('game_id', gameIds).in('status', ['waiting', 'playing']);
}

// --- Grid management ---

export interface SavedGridSummary {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wordCount: number;
  createdBy: string;
  createdAt: string;
}

/** List all saved grids from the database */
export async function listSavedGrids(): Promise<SavedGridSummary[]> {
  const { data, error } = await supabase.from('gridrush_grids').select('id, name, difficulty, words, created_by, created_at').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((g: any) => ({
    id: g.id,
    name: g.name,
    difficulty: g.difficulty,
    wordCount: Array.isArray(g.words) ? g.words.length : 0,
    createdBy: g.created_by,
    createdAt: g.created_at,
  }));
}

/** Load a single grid from the database */
export async function loadGrid(gridId: string): Promise<CrosswordGridData | null> {
  const { data, error } = await supabase.from('gridrush_grids').select('*').eq('id', gridId).single();
  if (error || !data) return null;
  return {
    id: data.id, name: data.name, difficulty: data.difficulty, rows: data.rows, cols: data.cols,
    words: data.words, mysteryCells: data.mystery_cells, mysteryWord: data.mystery_word,
    mysteryClue: data.mystery_clue, mysteryHint5: data.mystery_hint_5, mysteryHint8: data.mystery_hint_8,
  };
}

/** Create a grid set and return its ID */
export async function createGridSet(name: string, easyGridId: string, mediumGridId: string, hardGridId: string, createdBy: string): Promise<string | null> {
  const id = generateId();
  const { error } = await supabase.from('gridrush_grid_sets').insert({
    id, name, easy_grid_id: easyGridId, medium_grid_id: mediumGridId, hard_grid_id: hardGridId, created_by: createdBy,
  });
  if (error) { console.error('Error creating grid set:', error); return null; }
  return id;
}

/** List all saved grid sets */
export async function listGridSets(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
  const { data, error } = await supabase.from('gridrush_grid_sets').select('id, name, created_at').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((s: any) => ({ id: s.id, name: s.name, createdAt: s.created_at }));
}

/** Delete a saved grid */
export async function deleteGrid(gridId: string): Promise<boolean> {
  const { error } = await supabase.from('gridrush_grids').delete().eq('id', gridId);
  return !error;
}

/** Get live progress for all teams in a game (for spectator/admin view) */
export async function getTeamsProgress(gameId: string): Promise<Array<{
  teamId: string; teamName: string; players: string[];
  currentGridIndex: number; wordsFoundPerGrid: number[][];
  status: string; finishedAt: string | null;
}>> {
  const { data: teams } = await supabase.from('gridrush_teams').select('*').eq('game_id', gameId);
  const { data: players } = await supabase.from('gridrush_players').select('*').eq('game_id', gameId);
  if (!teams) return [];
  return teams.map((t: any) => ({
    teamId: t.id,
    teamName: t.name,
    players: (players || []).filter((p: any) => p.team_id === t.id).map((p: any) => p.name),
    currentGridIndex: t.current_grid_index,
    wordsFoundPerGrid: t.words_found || [[], [], []],
    status: t.status,
    finishedAt: t.finished_at,
  }));
}
