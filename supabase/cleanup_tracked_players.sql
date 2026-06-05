-- Script pour supprimer définitivement tous les joueurs et empêcher leur recréation
-- Exécute ce script dans l'éditeur SQL de Supabase

-- 1. Supprimer tous les statuts de jeu
DELETE FROM public.player_game_status;

-- 2. Supprimer tous les joueurs suivis
DELETE FROM public.tracked_players;

-- 3. Vider johnny_config pour empêcher la re-migration
UPDATE public.johnny_config
SET riot_id = NULL, puuid = NULL, last_match_id = NULL
WHERE id = 1;

-- 4. Alternative: Supprimer complètement johnny_config si tu n'en as plus besoin
-- DROP TABLE IF EXISTS public.johnny_config;

-- 5. Vérification - Ces requêtes doivent retourner 0 lignes
SELECT COUNT(*) as tracked_players_count FROM public.tracked_players;
SELECT COUNT(*) as player_game_status_count FROM public.player_game_status;
SELECT riot_id, puuid FROM public.johnny_config WHERE id = 1;

-- Note: Si les joueurs reviennent encore après avoir exécuté ce script,
-- le problème vient peut-être d'une autre source (trigger, cron job, etc.)
-- Dans ce cas, exécute cette requête pour voir les triggers actifs:
-- SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';
