-- Fix RLS policies for bets table
-- Run this in Supabase SQL Editor if bets are not being saved

-- First, drop all existing policies on bets table
DROP POLICY IF EXISTS "Users can read own bets" ON bets;
DROP POLICY IF EXISTS "Users can insert own bets" ON bets;
DROP POLICY IF EXISTS "Users can delete own bets" ON bets;
DROP POLICY IF EXISTS "Authenticated users can read all bets" ON bets;
DROP POLICY IF EXISTS "Service can update bets" ON bets;
DROP POLICY IF EXISTS "Anyone can view bets" ON bets;

-- Ensure RLS is enabled
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all bets (public bet history)
CREATE POLICY "Anyone can view bets" ON bets
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert their own bets
-- The user_id must match the authenticated user's ID
CREATE POLICY "Users can insert own bets" ON bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own pending bets (for cancellation within 1 minute)
CREATE POLICY "Users can delete own bets" ON bets
  FOR DELETE USING (auth.uid() = user_id AND status = 'PENDING');

-- Policy: Allow updates to bets (for bet resolution by game-watcher)
-- This is permissive because the game-watcher runs server-side
CREATE POLICY "Anyone can update bets" ON bets
  FOR UPDATE USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bets';
