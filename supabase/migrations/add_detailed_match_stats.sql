-- Add detailed stats columns to johnny_matches for data-driven odds
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS double_kills INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS triple_kills INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS quadra_kills INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS penta_kills INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS solo_kills INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS first_blood_kill BOOLEAN DEFAULT false;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS kill_participation REAL DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS team_damage_pct REAL DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS damage_taken INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS wards_placed INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS wards_killed INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS solo_deaths INTEGER DEFAULT 0;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS is_top_damage_team BOOLEAN DEFAULT false;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS is_top_damage_game BOOLEAN DEFAULT false;
