import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export interface BalanceData {
  created_at: string;
  balance: number;
}

export const usePlayerBalance = (userId: string) => {
  const [data, setData] = useState<BalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const { data: bets, error } = await supabase
          .from('bets')
          .select('created_at, amount, potential_payout, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Calcul du portefeuille, départ à 10000 crédits
        let balance = 10000;
        const balanceData: BalanceData[] = (bets || []).map((b: any) => {
          // On considère les gains/pertes
          if (b.status === 'WON') balance += b.potential_payout;
          else if (b.status === 'LOST') balance -= b.amount;

          return { created_at: b.created_at, balance };
        });

        setData(balanceData);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [userId]);

  return { data, loading, error };
};
