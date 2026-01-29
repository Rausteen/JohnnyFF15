-- =====================================================
-- Script pour nettoyer les entrées orphelines dans player_game_status
-- ET restreindre les écritures au service role seulement (pas le frontend)
-- Exécute ce script dans l'éditeur SQL de Supabase
-- =====================================================

-- =====================================================
-- ÉTAPE 1: VOIR LES ENTRÉES ORPHELINES
-- =====================================================
SELECT
  pgs.player_id,
  pgs.is_in_game,
  pgs.game_id,
  pgs.last_checker_id,
  pgs.last_check_at,
  pgs.updated_at
FROM public.player_game_status pgs
LEFT JOIN public.tracked_players tp ON pgs.player_id = tp.id
WHERE tp.id IS NULL;

-- =====================================================
-- ÉTAPE 2: SUPPRIMER TOUTES LES ENTRÉES ORPHELINES
-- =====================================================
DELETE FROM public.player_game_status pgs
WHERE NOT EXISTS (
  SELECT 1 FROM public.tracked_players tp WHERE tp.id = pgs.player_id
);

-- =====================================================
-- ÉTAPE 3: VÉRIFICATION (doit retourner 0)
-- =====================================================
SELECT COUNT(*) as orphan_count
FROM public.player_game_status pgs
LEFT JOIN public.tracked_players tp ON pgs.player_id = tp.id
WHERE tp.id IS NULL;

-- =====================================================
-- ÉTAPE 4: RESTREINDRE LES POLITIQUES RLS
-- Seul le service role peut écrire, pas les utilisateurs authentifiés
-- Cela empêche le frontend de recréer les entrées
-- =====================================================

-- Supprimer les anciennes politiques qui permettaient aux utilisateurs d'écrire
DROP POLICY IF EXISTS "Authenticated users can insert player game status" ON public.player_game_status;
DROP POLICY IF EXISTS "Authenticated users can update player game status" ON public.player_game_status;

-- Créer des politiques qui n'autorisent QUE le service role (utilisé par game-watcher)
-- Note: Le service role bypass RLS par défaut, donc on crée des politiques restrictives
-- qui bloquent les utilisateurs normaux

-- Politique pour INSERT: seulement via service role (les utilisateurs normaux ne peuvent pas insérer)
CREATE POLICY "Only service role can insert player game status" ON public.player_game_status
  FOR INSERT WITH CHECK (false);  -- Bloque tout le monde sauf service role

-- Politique pour UPDATE: seulement via service role
CREATE POLICY "Only service role can update player game status" ON public.player_game_status
  FOR UPDATE USING (false);  -- Bloque tout le monde sauf service role

-- Politique pour DELETE: seulement via service role
CREATE POLICY "Only service role can delete player game status" ON public.player_game_status
  FOR DELETE USING (false);  -- Bloque tout le monde sauf service role

-- =====================================================
-- ÉTAPE 5: VÉRIFICATION FINALE
-- =====================================================
SELECT
  pgs.player_id,
  tp.display_name,
  pgs.is_in_game,
  pgs.last_checker_id,
  pgs.last_check_at
FROM public.player_game_status pgs
LEFT JOIN public.tracked_players tp ON pgs.player_id = tp.id;

-- =====================================================
-- NOTE IMPORTANTE:
-- Après avoir exécuté ce script, le frontend ne pourra plus
-- écrire dans player_game_status. Seul le game-watcher script
-- (qui utilise le service role) pourra écrire.
-- =====================================================
