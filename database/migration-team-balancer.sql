-- Migration: Team Balancer - Player Roles
-- Ajoute les rôles préférés aux joueurs trackés pour l'équilibrage des équipes 5v5

-- =====================================================
-- PLAYER ROLES TABLE
-- Stocke les rôles préférés de chaque joueur
-- =====================================================

-- Add role columns directly to tracked_players table for simplicity
ALTER TABLE public.tracked_players
ADD COLUMN IF NOT EXISTS primary_role text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS secondary_role text DEFAULT NULL;

-- Valid roles: 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'

-- Create an index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_tracked_players_roles
ON public.tracked_players(primary_role, secondary_role);

-- =====================================================
-- CUSTOM GAMES HISTORY (Optional - for future skill refinement)
-- Stocke l'historique des 5v5 customs pour affiner les ratings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.custom_games (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid REFERENCES auth.users(id),

  -- Team compositions (array of player IDs)
  team1_players text[] NOT NULL, -- Array of tracked_player IDs
  team2_players text[] NOT NULL,

  -- Results (optional - can be filled in later)
  winner smallint DEFAULT NULL, -- 1 or 2

  -- Metadata
  notes text DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.custom_games ENABLE ROW LEVEL SECURITY;

-- Policies for custom_games
DROP POLICY IF EXISTS "Anyone can view custom games" ON public.custom_games;
CREATE POLICY "Anyone can view custom games" ON public.custom_games
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create custom games" ON public.custom_games;
CREATE POLICY "Authenticated users can create custom games" ON public.custom_games
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update custom games" ON public.custom_games;
CREATE POLICY "Authenticated users can update custom games" ON public.custom_games
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_games_created_at
ON public.custom_games(created_at DESC);
