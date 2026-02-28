-- Case drops history table
CREATE TABLE IF NOT EXISTS case_drops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo TEXT NOT NULL,
  reward_kind TEXT NOT NULL CHECK (reward_kind IN ('cosmetic', 'irl', 'coins')),
  reward_name TEXT NOT NULL,
  reward_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for recent drops query
CREATE INDEX IF NOT EXISTS idx_case_drops_created_at ON case_drops (created_at DESC);

-- RLS
ALTER TABLE case_drops ENABLE ROW LEVEL SECURITY;

-- Everyone can read drops (for the public feed)
CREATE POLICY "Anyone can read case_drops"
  ON case_drops FOR SELECT
  USING (true);

-- Authenticated users can insert their own drops
CREATE POLICY "Users can insert own drops"
  ON case_drops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can delete (for season reset)
CREATE POLICY "Service role can delete drops"
  ON case_drops FOR DELETE
  USING (true);
