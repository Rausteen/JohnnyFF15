-- Migration: Player Ranks
-- Ajoute les rangs Solo/Duo aux joueurs trackés pour améliorer le skill rating

-- =====================================================
-- RANK COLUMNS
-- Stocke le rang Solo/Duo de chaque joueur
-- =====================================================

-- Add rank columns to tracked_players table
ALTER TABLE public.tracked_players
ADD COLUMN IF NOT EXISTS solo_tier text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS solo_division text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS solo_lp integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rank_updated_at timestamp with time zone DEFAULT NULL;

-- Valid tiers: 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'
-- Valid divisions: 'I', 'II', 'III', 'IV' (null for Master+)

-- Create an index for faster rank-based queries
CREATE INDEX IF NOT EXISTS idx_tracked_players_rank
ON public.tracked_players(solo_tier, solo_division);
