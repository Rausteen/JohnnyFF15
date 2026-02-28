-- Cosmetics table: stores all cosmetic items (borders, backgrounds, titles)
-- Loaded by the Challenger Case system at runtime

CREATE TABLE IF NOT EXISTS cosmetics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('border', 'background', 'title')),
  image_url TEXT,
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;

-- Everyone can read cosmetics
CREATE POLICY "cosmetics_read_all" ON cosmetics
  FOR SELECT USING (true);

-- Only service role / admin can insert/update/delete
-- (managed via Supabase dashboard or service key)
