-- Migration: Add cosmetic shop fields to profiles
-- Run this in Supabase SQL Editor

-- Add cosmetic fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS owned_cosmetics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS equipped_badge TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS equipped_title TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS equipped_border TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.owned_cosmetics IS 'Array of owned cosmetic item IDs';
COMMENT ON COLUMN profiles.equipped_badge IS 'Currently equipped badge ID';
COMMENT ON COLUMN profiles.equipped_title IS 'Currently equipped title ID';
COMMENT ON COLUMN profiles.equipped_border IS 'Currently equipped border ID';

-- Create index for faster lookups (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_owned_cosmetics ON profiles USING GIN (owned_cosmetics);
