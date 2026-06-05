-- =====================================================
-- Migration: Fix johnny_matches primary key
-- Allows same match_id for different players (multi-player support)
-- =====================================================

-- Step 1: Drop the old primary key constraint
-- First we need to drop the primary key
ALTER TABLE public.johnny_matches DROP CONSTRAINT IF EXISTS johnny_matches_pkey;

-- Step 2: Create a new composite primary key (match_id + puuid)
-- This allows the same match to be stored for multiple players
ALTER TABLE public.johnny_matches ADD PRIMARY KEY (id, puuid);

-- Step 3: Ensure puuid is NOT NULL for new entries
-- (We can't add NOT NULL constraint because existing data might have nulls)
-- Instead, we'll set a default value for existing nulls
UPDATE public.johnny_matches
SET puuid = 'unknown'
WHERE puuid IS NULL;

-- Step 4: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_johnny_matches_id ON public.johnny_matches(id);
CREATE INDEX IF NOT EXISTS idx_johnny_matches_puuid ON public.johnny_matches(puuid);

-- Note: If you get an error about duplicate keys, run this first:
-- DELETE FROM public.johnny_matches a USING public.johnny_matches b
-- WHERE a.ctid < b.ctid AND a.id = b.id AND a.puuid = b.puuid;
