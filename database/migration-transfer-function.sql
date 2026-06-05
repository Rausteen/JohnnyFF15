-- Migration: Create atomic transfer function
-- This ensures credits are transferred safely without race conditions

-- Create function for atomic credit transfer
CREATE OR REPLACE FUNCTION transfer_credits(
  sender_id UUID,
  recipient_id UUID,
  transfer_amount INTEGER,
  fee_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_credits INTEGER;
  recipient_credits INTEGER;
  total_deducted INTEGER;
  result JSON;
BEGIN
  -- Lock both rows to prevent race conditions
  SELECT credits INTO sender_credits
  FROM profiles
  WHERE id = sender_id
  FOR UPDATE;

  SELECT credits INTO recipient_credits
  FROM profiles
  WHERE id = recipient_id
  FOR UPDATE;

  -- Calculate total to deduct
  total_deducted := transfer_amount + fee_amount;

  -- Verify sender has enough credits
  IF sender_credits < total_deducted THEN
    RETURN json_build_object('success', false, 'error', 'Credits insuffisants');
  END IF;

  -- Deduct from sender
  UPDATE profiles
  SET credits = credits - total_deducted
  WHERE id = sender_id;

  -- Add to recipient (fee is burned)
  UPDATE profiles
  SET credits = credits + transfer_amount
  WHERE id = recipient_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION transfer_credits TO authenticated;
