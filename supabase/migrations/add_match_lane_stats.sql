-- Lane matchup + ranked context per match (used by the Discord game-end recap and the weekly summary)
-- team_position: TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY (from Riot match-v5)
-- lane_gold_diff: player gold - lane opponent gold at the end of the game (null if no opponent found)
-- lp_change: LP delta measured by the game watcher after the game (null if unknown / rank changed tier)
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS team_position TEXT;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS lane_gold_diff INTEGER;
ALTER TABLE johnny_matches ADD COLUMN IF NOT EXISTS lp_change INTEGER;
