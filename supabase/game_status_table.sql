-- Table pour stocker l'état de game de Johnny (partagé entre tous les utilisateurs)
-- Cela évite que chaque utilisateur fasse des requêtes API Riot

CREATE TABLE IF NOT EXISTS game_status (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Une seule ligne
  is_in_game BOOLEAN NOT NULL DEFAULT false,
  game_id TEXT, -- Format: PLATFORM_GAMEID (ex: EUW1_1234567890)
  game_data JSONB, -- CurrentGameInfo de Riot API
  game_start_time BIGINT,
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checker_id TEXT, -- ID du navigateur qui a fait le dernier check
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer la ligne initiale
INSERT INTO game_status (id, is_in_game)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Tout le monde peut lire
ALTER TABLE game_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game status"
  ON game_status FOR SELECT
  USING (true);

-- RLS: Seuls les utilisateurs authentifiés peuvent mettre à jour
CREATE POLICY "Authenticated users can update game status"
  ON game_status FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Index pour les requêtes temps réel
CREATE INDEX IF NOT EXISTS idx_game_status_updated_at ON game_status(updated_at);

-- Activer les notifications temps réel pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE game_status;
