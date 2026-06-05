-- Fix: Change grid_set_id from UUID to TEXT to support 'default-set' string
-- Run this on your existing Supabase database

ALTER TABLE gridrush_games DROP CONSTRAINT IF EXISTS gridrush_games_grid_set_id_fkey;
ALTER TABLE gridrush_games ALTER COLUMN grid_set_id TYPE TEXT;
ALTER TABLE gridrush_games ALTER COLUMN grid_set_id SET DEFAULT 'default-set';
