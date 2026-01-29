-- =====================================================
-- Script pour nettoyer player_game_status
-- ET restreindre les écritures au service role seulement
-- Exécute ce script dans l'éditeur SQL de Supabase
-- =====================================================

-- =====================================================
-- ÉTAPE 1: VOIR CE QUI EST DANS player_game_status
-- =====================================================
SELECT * FROM public.player_game_status;

-- =====================================================
-- ÉTAPE 2: SUPPRIMER TOUTES LES ENTRÉES
-- (On nettoie tout, le game-watcher recréera les bonnes)
-- =====================================================
TRUNCATE TABLE public.player_game_status;

-- =====================================================
-- ÉTAPE 3: VÉRIFICATION (doit retourner 0)
-- =====================================================
SELECT COUNT(*) as remaining_count FROM public.player_game_status;

-- =====================================================
-- ÉTAPE 4: RESTREINDRE LES POLITIQUES RLS
-- Seul le service role peut écrire, pas les utilisateurs authentifiés
-- Cela empêche le frontend de recréer les entrées
-- =====================================================

-- Supprimer les anciennes politiques qui permettaient aux utilisateurs d'écrire
DROP POLICY IF EXISTS "Authenticated users can insert player game status" ON public.player_game_status;
DROP POLICY IF EXISTS "Authenticated users can update player game status" ON public.player_game_status;

-- Supprimer aussi les nouvelles politiques si elles existent déjà (pour éviter les doublons)
DROP POLICY IF EXISTS "Only service role can insert player game status" ON public.player_game_status;
DROP POLICY IF EXISTS "Only service role can update player game status" ON public.player_game_status;
DROP POLICY IF EXISTS "Only service role can delete player game status" ON public.player_game_status;

-- Créer des politiques qui n'autorisent QUE le service role (utilisé par game-watcher)
-- Note: Le service role bypass RLS par défaut, donc on crée des politiques restrictives
-- qui bloquent les utilisateurs normaux (authenticated)

-- Politique pour INSERT: bloque les utilisateurs normaux
CREATE POLICY "Only service role can insert player game status" ON public.player_game_status
  FOR INSERT WITH CHECK (false);

-- Politique pour UPDATE: bloque les utilisateurs normaux
CREATE POLICY "Only service role can update player game status" ON public.player_game_status
  FOR UPDATE USING (false);

-- Politique pour DELETE: bloque les utilisateurs normaux
CREATE POLICY "Only service role can delete player game status" ON public.player_game_status
  FOR DELETE USING (false);

-- =====================================================
-- ÉTAPE 5: VÉRIFICATION DES POLITIQUES
-- =====================================================
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'player_game_status';

-- =====================================================
-- NOTE IMPORTANTE:
-- Après avoir exécuté ce script:
-- 1. player_game_status est vidée
-- 2. Le frontend ne peut plus écrire dans cette table
-- 3. Seul game-watcher (service role) peut écrire
-- 4. Les entrées ne reviendront plus automatiquement!
-- =====================================================
