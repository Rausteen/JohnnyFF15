-- Add RLS policies for admin operations and public bet history
-- Run this in your Supabase SQL Editor

-- ============================================
-- PROFILES TABLE UPDATES
-- ============================================

-- Add is_admin column (for admin operations)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add reset_at column (to track account resets and prevent bet re-migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ DEFAULT NULL;

-- Set Rausteen as admin
UPDATE profiles SET is_admin = TRUE WHERE pseudo = 'Rausteen';

-- Drop existing update policies
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

-- ============================================
-- BETS TABLE - ADMIN POLICIES
-- ============================================

-- Admins can delete bets for any user
DROP POLICY IF EXISTS "Admins can delete any bets" ON bets;
CREATE POLICY "Admins can delete any bets" ON bets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- Admins can update any bets (for resolution)
DROP POLICY IF EXISTS "Admins can update any bets" ON bets;
CREATE POLICY "Admins can update any bets" ON bets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

-- ============================================
-- BETS TABLE - PUBLIC READ ACCESS
-- ============================================

-- Make all bets readable by all authenticated users (public bet history)
DROP POLICY IF EXISTS "Users can read own bets" ON bets;
DROP POLICY IF EXISTS "Authenticated users can read all bets" ON bets;
DROP POLICY IF EXISTS "Public bet history" ON bets;

CREATE POLICY "Public bet history" ON bets
  FOR SELECT USING (auth.role() = 'authenticated');
