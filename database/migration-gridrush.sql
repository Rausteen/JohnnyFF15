-- =====================================================
-- GRIDRUSH GAME TABLES
-- Run this in your Supabase SQL Editor (Database > SQL Editor)
-- =====================================================

-- Drop existing tables if they exist (clean setup)
DROP TABLE IF EXISTS gridrush_guesses CASCADE;
DROP TABLE IF EXISTS gridrush_team_members CASCADE;
DROP TABLE IF EXISTS gridrush_teams CASCADE;
DROP TABLE IF EXISTS gridrush_games CASCADE;

-- Games table
CREATE TABLE gridrush_games (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  join_code text UNIQUE NOT NULL,
  grid_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Teams in a game
CREATE TABLE gridrush_teams (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES gridrush_games ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#ef4444',
  created_at timestamptz DEFAULT now()
);

-- Team members
CREATE TABLE gridrush_team_members (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES gridrush_teams ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES gridrush_games ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pseudo text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Word guesses (which team found which word)
CREATE TABLE gridrush_guesses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES gridrush_games ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES gridrush_teams ON DELETE CASCADE,
  word_index integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('FACILE', 'MOYEN', 'DIFFICILE')),
  is_final_word boolean DEFAULT false,
  guessed_by uuid REFERENCES auth.users ON DELETE SET NULL,
  guessed_at timestamptz DEFAULT now(),
  UNIQUE(game_id, difficulty, word_index)
);

-- Indexes
CREATE INDEX idx_gridrush_games_join_code ON gridrush_games(join_code);
CREATE INDEX idx_gridrush_games_status ON gridrush_games(status);
CREATE INDEX idx_gridrush_teams_game ON gridrush_teams(game_id);
CREATE INDEX idx_gridrush_members_game ON gridrush_team_members(game_id);
CREATE INDEX idx_gridrush_members_user ON gridrush_team_members(user_id);
CREATE INDEX idx_gridrush_guesses_game ON gridrush_guesses(game_id);

-- Enable RLS
ALTER TABLE gridrush_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gridrush_guesses ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read, authenticated can write
CREATE POLICY "Anyone can view gridrush_games" ON gridrush_games FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert gridrush_games" ON gridrush_games FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update gridrush_games" ON gridrush_games FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete gridrush_games" ON gridrush_games FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view gridrush_teams" ON gridrush_teams FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert gridrush_teams" ON gridrush_teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update gridrush_teams" ON gridrush_teams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete gridrush_teams" ON gridrush_teams FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view gridrush_team_members" ON gridrush_team_members FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert gridrush_team_members" ON gridrush_team_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete gridrush_team_members" ON gridrush_team_members FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view gridrush_guesses" ON gridrush_guesses FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert gridrush_guesses" ON gridrush_guesses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime for live game updates
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_guesses;
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE gridrush_games;
