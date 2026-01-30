-- Migration: Add transfer tracking columns to profiles
-- Run this in your Supabase SQL Editor

-- Add columns for transfer tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_transfer_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_transfer_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_transfer_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.last_transfer_at IS 'Timestamp of last credit transfer (for cooldown)';
COMMENT ON COLUMN public.profiles.daily_transfer_total IS 'Total JC transferred today';
COMMENT ON COLUMN public.profiles.daily_transfer_date IS 'Date of daily_transfer_total tracking';
