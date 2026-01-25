-- Create bets table to store all bets from all users
CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_id TEXT NOT NULL,
  prop_title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  odds DECIMAL(5,2) NOT NULL,
  potential_payout INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  match_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  combo_id TEXT,
  combo_index INTEGER,
  combo_total INTEGER,
  champion_name TEXT,
  resolved_stat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_timestamp ON bets(timestamp DESC);

-- Enable RLS
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own bets
CREATE POLICY "Users can read own bets" ON bets
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own bets
CREATE POLICY "Users can insert own bets" ON bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bets (for cancellation)
CREATE POLICY "Users can delete own bets" ON bets
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Admin (Rausteen) can read all bets
-- Note: You'll need to create a function to check admin status
-- For now, we allow authenticated users to read all bets for admin purposes
CREATE POLICY "Authenticated users can read all bets" ON bets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Service role can update any bet (for resolution)
CREATE POLICY "Service can update bets" ON bets
  FOR UPDATE USING (true);
