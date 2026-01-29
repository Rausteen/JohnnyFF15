-- =====================================================
-- Script pour bloquer un browser_id spécifique
-- et supprimer ses entrées existantes
-- =====================================================

-- ÉTAPE 1: Supprimer toutes les entrées créées par ce browser
DELETE FROM public.player_game_status
WHERE last_checker_id = 'browser_1769695103606_nu81kdxks';

-- ÉTAPE 2: Vérifier qu'elles sont supprimées
SELECT COUNT(*) as remaining_browser_entries
FROM public.player_game_status
WHERE last_checker_id LIKE 'browser_%';

-- ÉTAPE 3: Créer une politique qui bloque TOUS les browser_id
-- (pas seulement celui-ci, pour éviter le problème à l'avenir)

-- D'abord supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Block browser checkers" ON public.player_game_status;
DROP POLICY IF EXISTS "Only service role can insert player game status" ON public.player_game_status;
DROP POLICY IF EXISTS "Only service role can update player game status" ON public.player_game_status;

-- Politique INSERT: bloque si last_checker_id commence par 'browser_'
-- Note: false bloque TOUT pour les utilisateurs normaux (le service role bypass RLS)
CREATE POLICY "Only service role can insert player game status" ON public.player_game_status
  FOR INSERT WITH CHECK (false);

-- Politique UPDATE: bloque si last_checker_id commence par 'browser_'
CREATE POLICY "Only service role can update player game status" ON public.player_game_status
  FOR UPDATE USING (false);

-- ÉTAPE 4: Vérification finale
SELECT * FROM public.player_game_status;

-- =====================================================
-- RÉSULTAT ATTENDU:
-- - Les entrées browser_* sont supprimées
-- - Seul le game-watcher (service role) peut écrire
-- - Le frontend ne peut plus créer d'entrées
-- =====================================================
