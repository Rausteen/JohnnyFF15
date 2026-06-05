-- ==========================================
-- GridRush - Supabase Database Schema
-- ==========================================

CREATE TABLE IF NOT EXISTS gridrush_grids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  rows INTEGER NOT NULL,
  cols INTEGER NOT NULL,
  words JSONB NOT NULL,
  mystery_cells JSONB NOT NULL,
  mystery_word TEXT NOT NULL,
  mystery_clue TEXT NOT NULL,
  mystery_hint_5 TEXT NOT NULL,
  mystery_hint_8 TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gridrush_grid_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  easy_grid_id UUID NOT NULL REFERENCES gridrush_grids(id) ON DELETE CASCADE,
  medium_grid_id UUID NOT NULL REFERENCES gridrush_grids(id) ON DELETE CASCADE,
  hard_grid_id UUID NOT NULL REFERENCES gridrush_grids(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gridrush_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_code TEXT NOT NULL UNIQUE,
  grid_set_id TEXT NOT NULL DEFAULT 'default-set',
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'finished')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  winner_team_id UUID,
  timer_duration INTEGER NOT NULL DEFAULT 1200,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gridrush_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES gridrush_games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_grid_index INTEGER NOT NULL DEFAULT 0,
  words_found JSONB NOT NULL DEFAULT '[[], [], []]',
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gridrush_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES gridrush_teams(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES gridrush_games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gridrush_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES gridrush_games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES gridrush_teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gridrush_games_code ON gridrush_games(game_code);
CREATE INDEX IF NOT EXISTS idx_gridrush_teams_game ON gridrush_teams(game_id);
CREATE INDEX IF NOT EXISTS idx_gridrush_players_team ON gridrush_players(team_id);
CREATE INDEX IF NOT EXISTS idx_gridrush_players_game ON gridrush_players(game_id);
CREATE INDEX IF NOT EXISTS idx_gridrush_chat_team ON gridrush_chat_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_gridrush_chat_game ON gridrush_chat_messages(game_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_games;
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_players;
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_chat_messages;

-- RLS
ALTER TABLE gridrush_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_grid_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for gridrush_grids" ON gridrush_grids FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gridrush_grid_sets" ON gridrush_grid_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gridrush_games" ON gridrush_games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gridrush_teams" ON gridrush_teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gridrush_players" ON gridrush_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gridrush_chat_messages" ON gridrush_chat_messages FOR ALL USING (true) WITH CHECK (true);
