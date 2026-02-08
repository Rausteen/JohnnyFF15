import { supabase } from './supabase';

export type SnapshotSource =
  | 'bet_placed' | 'bet_won' | 'bet_lost'
  | 'daily_bonus'
  | 'transfer_in' | 'transfer_out'
  | 'case_purchase' | 'case_coins_won'
  | 'admin_add'
  | 'season_reset';

/**
 * Record a balance snapshot. Fire-and-forget — never blocks or fails the caller.
 */
export function recordSnapshot(
  userId: string,
  balance: number,
  delta: number,
  source: SnapshotSource,
  referenceId?: string
): void {
  supabase
    .from('balance_snapshots')
    .insert({ user_id: userId, balance, delta, source, reference_id: referenceId || null })
    .then(({ error }) => {
      if (error) console.warn('Snapshot insert failed:', error.message);
    });
}

/**
 * Record multiple snapshots at once (e.g. season reset for all users).
 */
export function recordSnapshotBatch(
  entries: { user_id: string; balance: number; delta: number; source: SnapshotSource; reference_id?: string }[]
): void {
  if (entries.length === 0) return;
  supabase
    .from('balance_snapshots')
    .insert(entries)
    .then(({ error }) => {
      if (error) console.warn('Snapshot batch insert failed:', error.message);
    });
}
