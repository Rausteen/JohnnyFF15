-- Add user_id column to tracked_players to link a player to a Supabase user
-- This prevents users from betting on themselves

-- Add the column (nullable to support unlinked players)
ALTER TABLE public.tracked_players
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracked_players_user_id ON public.tracked_players(user_id);

-- Add a unique constraint so one user can only be linked to one player
-- (comment out if you want to allow multiple players per user)
-- ALTER TABLE public.tracked_players ADD CONSTRAINT unique_user_id UNIQUE (user_id);

COMMENT ON COLUMN public.tracked_players.user_id IS 'Links this tracked player to a Supabase user account. Used to prevent self-betting.';
