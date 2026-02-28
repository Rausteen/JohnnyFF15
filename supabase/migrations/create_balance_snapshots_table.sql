-- Balance snapshots: records every credit movement for accurate portfolio graphs and economy analytics
CREATE TABLE IF NOT EXISTS balance_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'bet_placed', 'bet_won', 'bet_lost',
    'daily_bonus',
    'transfer_in', 'transfer_out',
    'case_purchase', 'case_coins_won',
    'admin_add',
    'season_reset'
  )),
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_user_created ON balance_snapshots (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_created ON balance_snapshots (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_snapshots_source ON balance_snapshots (source);

-- RLS
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;

-- Everyone can read all snapshots (needed for economy analytics)
CREATE POLICY "Anyone can read balance_snapshots"
  ON balance_snapshots FOR SELECT
  USING (true);

-- Authenticated users can insert (client-side: daily bonus, transfers, cases)
CREATE POLICY "Authenticated users can insert snapshots"
  ON balance_snapshots FOR INSERT
  WITH CHECK (true);

-- Only admins can delete (for season reset)
CREATE POLICY "Service role can delete snapshots"
  ON balance_snapshots FOR DELETE
  USING (true);
