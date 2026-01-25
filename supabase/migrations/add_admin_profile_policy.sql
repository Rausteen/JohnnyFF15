-- Add RLS policy to allow admin (Rausteen) to update any profile
-- Run this in your Supabase SQL Editor

-- First, let's add an is_admin column to profiles (if it doesn't exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set Rausteen as admin (update with the correct user ID or pseudo)
UPDATE profiles SET is_admin = TRUE WHERE pseudo = 'Rausteen';

-- Drop existing update policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Also ensure admins can delete bets for any user
DROP POLICY IF EXISTS "Admins can delete any bets" ON bets;
CREATE POLICY "Admins can delete any bets" ON bets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Ensure admins can update any bets (for resolution)
DROP POLICY IF EXISTS "Admins can update any bets" ON bets;
CREATE POLICY "Admins can update any bets" ON bets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
