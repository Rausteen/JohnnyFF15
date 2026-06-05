-- Fix pour permettre la mise à jour des crédits lors de la résolution des paris
-- Le problème: RLS bloque la mise à jour des crédits d'autres utilisateurs

-- Option 1: Créer une fonction Postgres qui bypass RLS pour les mises à jour de crédits
-- Cette fonction sera appelée depuis le service de résolution

CREATE OR REPLACE FUNCTION update_user_credits_on_bet_resolution(
  p_user_id UUID,
  p_won BOOLEAN,
  p_amount INTEGER,
  p_payout INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Important: exécute avec les privilèges du créateur (bypass RLS)
AS $$
DECLARE
  v_current_credits INTEGER;
  v_current_bets_won INTEGER;
  v_current_bets_lost INTEGER;
  v_current_jc_won INTEGER;
  v_current_jc_lost INTEGER;
BEGIN
  -- Récupérer les valeurs actuelles
  SELECT credits, bets_won, bets_lost, jc_won, jc_lost
  INTO v_current_credits, v_current_bets_won, v_current_bets_lost, v_current_jc_won, v_current_jc_lost
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'User % not found', p_user_id;
    RETURN FALSE;
  END IF;

  IF p_won THEN
    -- Pari gagné: ajouter le payout aux crédits
    UPDATE profiles
    SET
      credits = v_current_credits + p_payout,
      bets_won = COALESCE(v_current_bets_won, 0) + 1,
      jc_won = COALESCE(v_current_jc_won, 0) + (p_payout - p_amount)
    WHERE id = p_user_id;
  ELSE
    -- Pari perdu: juste mettre à jour les stats (crédits déjà déduits)
    UPDATE profiles
    SET
      bets_lost = COALESCE(v_current_bets_lost, 0) + 1,
      jc_lost = COALESCE(v_current_jc_lost, 0) + p_amount
    WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Donner les permissions d'exécuter cette fonction
GRANT EXECUTE ON FUNCTION update_user_credits_on_bet_resolution TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_credits_on_bet_resolution TO anon;
