import { create } from 'zustand';
import { supabase } from './supabase';
import { GridData, Difficulty, DIFFICULTIES, normalizeAnswer, DEFAULT_GRID } from './gridRushData';

// --- Types ---

export interface GridRushTeamMember {
  id: string;
  team_id: string;
  game_id: string;
  user_id: string;
  pseudo: string;
  joined_at: string;
}

export interface GridRushTeam {
  id: string;
  game_id: string;
  name: string;
  color: string;
  created_at: string;
  members: GridRushTeamMember[];
}

export interface GridRushGuess {
  id: string;
  game_id: string;
  team_id: string;
  word_index: number;
  difficulty: string;
  is_final_word: boolean;
  guessed_by: string;
  guessed_at: string;
}

export interface GridRushGame {
  id: string;
  created_by: string;
  status: 'waiting' | 'playing' | 'finished';
  join_code: string;
  grid_data: GridData;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface GuessResult {
  found: boolean;
  word?: string;
  difficulty?: string;
  points?: number;
  isFinalWord?: boolean;
  error?: string;
}

interface GridRushState {
  game: GridRushGame | null;
  teams: GridRushTeam[];
  guesses: GridRushGuess[];
  myTeamId: string | null;
  loading: boolean;
  error: string | null;

  createGame: (userId: string) => Promise<string | null>;
  loadGame: (joinCode: string) => Promise<boolean>;
  refreshGame: () => Promise<void>;
  createTeam: (name: string, color: string) => Promise<boolean>;
  joinTeam: (teamId: string, userId: string, pseudo: string) => Promise<boolean>;
  leaveTeam: (userId: string) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  endGame: () => Promise<boolean>;
  submitGuess: (guess: string, userId: string) => Promise<GuessResult>;
  subscribeToGame: (gameId: string) => () => void;
  getTeamScore: (teamId: string) => number;
  getFoundWordsCount: (difficulty: Difficulty) => number;
  isFinalWordUnlocked: (difficulty: Difficulty) => boolean;
  isHintUnlocked: (difficulty: Difficulty) => boolean;
  isWordFound: (difficulty: Difficulty, wordIndex: number) => GridRushGuess | undefined;
  isFinalWordFound: (difficulty: Difficulty) => GridRushGuess | undefined;
  deleteGame: (gameId: string) => Promise<boolean>;
  reset: () => void;
}

// Generate a random 6-char alphanumeric join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const useGridRushStore = create<GridRushState>((set, get) => ({
  game: null,
  teams: [],
  guesses: [],
  myTeamId: null,
  loading: false,
  error: null,

  createGame: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const joinCode = generateJoinCode();
      const { data, error } = await supabase
        .from('gridrush_games')
        .insert({
          created_by: userId,
          status: 'waiting',
          join_code: joinCode,
          grid_data: DEFAULT_GRID,
        })
        .select()
        .single();

      if (error) throw error;
      set({ game: data as GridRushGame, loading: false });
      return joinCode;
    } catch (error: any) {
      console.error('Error creating GridRush game:', error);
      set({ error: error.message, loading: false });
      return null;
    }
  },

  loadGame: async (joinCode: string) => {
    set({ loading: true, error: null });
    try {
      // Load game
      const { data: gameData, error: gameError } = await supabase
        .from('gridrush_games')
        .select('*')
        .eq('join_code', joinCode)
        .single();

      if (gameError) throw gameError;
      if (!gameData) throw new Error('Partie introuvable');

      const game = gameData as GridRushGame;

      // Load teams with members
      const { data: teamsData, error: teamsError } = await supabase
        .from('gridrush_teams')
        .select('*')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true });

      if (teamsError) throw teamsError;

      const { data: membersData, error: membersError } = await supabase
        .from('gridrush_team_members')
        .select('*')
        .eq('game_id', game.id);

      if (membersError) throw membersError;

      // Load guesses
      const { data: guessesData, error: guessesError } = await supabase
        .from('gridrush_guesses')
        .select('*')
        .eq('game_id', game.id)
        .order('guessed_at', { ascending: true });

      if (guessesError) throw guessesError;

      // Assemble teams with their members
      const teams: GridRushTeam[] = (teamsData || []).map((t: any) => ({
        ...t,
        members: (membersData || []).filter((m: any) => m.team_id === t.id),
      }));

      // Find my team
      const { data: { user } } = await supabase.auth.getUser();
      let myTeamId: string | null = null;
      if (user) {
        const myMembership = (membersData || []).find((m: any) => m.user_id === user.id);
        if (myMembership) myTeamId = myMembership.team_id;
      }

      set({
        game,
        teams,
        guesses: (guessesData || []) as GridRushGuess[],
        myTeamId,
        loading: false,
      });

      return true;
    } catch (error: any) {
      console.error('Error loading GridRush game:', error);
      set({ error: error.message, loading: false });
      return false;
    }
  },

  refreshGame: async () => {
    const { game } = get();
    if (!game) return;
    await get().loadGame(game.join_code);
  },

  createTeam: async (name: string, color: string) => {
    const { game } = get();
    if (!game) return false;

    try {
      const { data, error } = await supabase
        .from('gridrush_teams')
        .insert({
          game_id: game.id,
          name,
          color,
        })
        .select()
        .single();

      if (error) throw error;

      const newTeam: GridRushTeam = { ...data, members: [] };
      set({ teams: [...get().teams, newTeam] });
      return true;
    } catch (error: any) {
      console.error('Error creating team:', error);
      set({ error: error.message });
      return false;
    }
  },

  joinTeam: async (teamId: string, userId: string, pseudo: string) => {
    const { game } = get();
    if (!game) return false;

    try {
      // Leave current team first if any
      await get().leaveTeam(userId);

      const { data, error } = await supabase
        .from('gridrush_team_members')
        .insert({
          team_id: teamId,
          game_id: game.id,
          user_id: userId,
          pseudo,
        })
        .select()
        .single();

      if (error) throw error;

      const member = data as GridRushTeamMember;
      const teams = get().teams.map((t) =>
        t.id === teamId ? { ...t, members: [...t.members, member] } : t
      );

      set({ teams, myTeamId: teamId });
      return true;
    } catch (error: any) {
      console.error('Error joining team:', error);
      set({ error: error.message });
      return false;
    }
  },

  leaveTeam: async (userId: string) => {
    const { game } = get();
    if (!game) return false;

    try {
      const { error } = await supabase
        .from('gridrush_team_members')
        .delete()
        .eq('game_id', game.id)
        .eq('user_id', userId);

      if (error) throw error;

      const teams = get().teams.map((t) => ({
        ...t,
        members: t.members.filter((m) => m.user_id !== userId),
      }));

      set({ teams, myTeamId: null });
      return true;
    } catch (error: any) {
      console.error('Error leaving team:', error);
      return false;
    }
  },

  startGame: async () => {
    const { game } = get();
    if (!game) return false;

    try {
      const { error } = await supabase
        .from('gridrush_games')
        .update({ status: 'playing', started_at: new Date().toISOString() })
        .eq('id', game.id);

      if (error) throw error;

      set({ game: { ...game, status: 'playing', started_at: new Date().toISOString() } });
      return true;
    } catch (error: any) {
      console.error('Error starting game:', error);
      set({ error: error.message });
      return false;
    }
  },

  endGame: async () => {
    const { game } = get();
    if (!game) return false;

    try {
      const { error } = await supabase
        .from('gridrush_games')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', game.id);

      if (error) throw error;

      set({ game: { ...game, status: 'finished', finished_at: new Date().toISOString() } });
      return true;
    } catch (error: any) {
      console.error('Error ending game:', error);
      set({ error: error.message });
      return false;
    }
  },

  submitGuess: async (guess: string, userId: string) => {
    const { game, guesses, myTeamId } = get();
    if (!game) return { found: false, error: 'Pas de partie en cours' };
    if (!myTeamId) return { found: false, error: "Tu n'es dans aucune équipe" };
    if (game.status !== 'playing') return { found: false, error: 'La partie n\'a pas commencé' };

    const normalizedGuess = normalizeAnswer(guess);
    if (!normalizedGuess) return { found: false, error: 'Réponse vide' };

    const gridData = game.grid_data;

    // Check each difficulty
    for (const diff of DIFFICULTIES) {
      const category = gridData[diff];

      // Check regular words
      for (let i = 0; i < category.words.length; i++) {
        const word = category.words[i];
        const normalizedAnswer = normalizeAnswer(word.answer);

        if (normalizedGuess === normalizedAnswer) {
          // Check if already found
          const alreadyFound = guesses.find(
            (g) => g.difficulty === diff && g.word_index === i && !g.is_final_word
          );
          if (alreadyFound) continue; // Already found, keep checking other words

          // Insert guess
          try {
            const { data, error } = await supabase
              .from('gridrush_guesses')
              .insert({
                game_id: game.id,
                team_id: myTeamId,
                word_index: i,
                difficulty: diff,
                is_final_word: false,
                guessed_by: userId,
              })
              .select()
              .single();

            if (error) {
              // Unique constraint violation = someone else found it first
              if (error.code === '23505') {
                return { found: false, error: 'Déjà trouvé par une autre équipe !' };
              }
              throw error;
            }

            // Update local state
            set({ guesses: [...get().guesses, data as GridRushGuess] });

            return {
              found: true,
              word: word.answer,
              difficulty: diff,
              points: category.pointsPerWord,
              isFinalWord: false,
            };
          } catch (error: any) {
            return { found: false, error: error.message };
          }
        }
      }

      // Check final word (only if unlocked: 5+ words found in this category)
      const foundInCategory = get().getFoundWordsCount(diff);
      if (foundInCategory >= 5) {
        const normalizedFinal = normalizeAnswer(category.finalWord.answer);
        if (normalizedGuess === normalizedFinal) {
          // Check if already found
          const alreadyFound = guesses.find(
            (g) => g.difficulty === diff && g.is_final_word
          );
          if (alreadyFound) continue;

          try {
            const { data, error } = await supabase
              .from('gridrush_guesses')
              .insert({
                game_id: game.id,
                team_id: myTeamId,
                word_index: -1, // -1 = final word
                difficulty: diff,
                is_final_word: true,
                guessed_by: userId,
              })
              .select()
              .single();

            if (error) {
              if (error.code === '23505') {
                return { found: false, error: 'Déjà trouvé par une autre équipe !' };
              }
              throw error;
            }

            set({ guesses: [...get().guesses, data as GridRushGuess] });

            return {
              found: true,
              word: category.finalWord.answer,
              difficulty: diff,
              points: category.finalWordPoints,
              isFinalWord: true,
            };
          } catch (error: any) {
            return { found: false, error: error.message };
          }
        }
      }
    }

    return { found: false };
  },

  subscribeToGame: (gameId: string) => {
    const channel = supabase
      .channel('gridrush-' + gameId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gridrush_guesses', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const newGuess = payload.new as GridRushGuess;
          const { guesses } = get();
          // Avoid duplicates
          if (!guesses.find((g) => g.id === newGuess.id)) {
            set({ guesses: [...guesses, newGuess] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gridrush_games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as GridRushGame;
            set({ game: { ...get().game!, ...updated } });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gridrush_teams', filter: `game_id=eq.${gameId}` },
        () => {
          // Reload teams to get full data
          get().refreshGame();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gridrush_team_members', filter: `game_id=eq.${gameId}` },
        () => {
          // Reload to get updated member lists
          get().refreshGame();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  getTeamScore: (teamId: string) => {
    const { game, guesses } = get();
    if (!game) return 0;

    let score = 0;
    const teamGuesses = guesses.filter((g) => g.team_id === teamId);

    for (const guess of teamGuesses) {
      const diff = guess.difficulty as Difficulty;
      const category = game.grid_data[diff];
      if (!category) continue;

      if (guess.is_final_word) {
        score += category.finalWordPoints;
      } else {
        score += category.pointsPerWord;
      }
    }

    return score;
  },

  getFoundWordsCount: (difficulty: Difficulty) => {
    const { guesses } = get();
    return guesses.filter((g) => g.difficulty === difficulty && !g.is_final_word).length;
  },

  isFinalWordUnlocked: (difficulty: Difficulty) => {
    return get().getFoundWordsCount(difficulty) >= 5;
  },

  isHintUnlocked: (difficulty: Difficulty) => {
    return get().getFoundWordsCount(difficulty) >= 8;
  },

  isWordFound: (difficulty: Difficulty, wordIndex: number) => {
    const { guesses } = get();
    return guesses.find((g) => g.difficulty === difficulty && g.word_index === wordIndex && !g.is_final_word);
  },

  isFinalWordFound: (difficulty: Difficulty) => {
    const { guesses } = get();
    return guesses.find((g) => g.difficulty === difficulty && g.is_final_word);
  },

  deleteGame: async (gameId: string) => {
    try {
      const { error } = await supabase
        .from('gridrush_games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;
      set({ game: null, teams: [], guesses: [], myTeamId: null });
      return true;
    } catch (error: any) {
      console.error('Error deleting game:', error);
      return false;
    }
  },

  reset: () => {
    set({ game: null, teams: [], guesses: [], myTeamId: null, loading: false, error: null });
  },
}));
