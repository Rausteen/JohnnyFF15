import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface Bet {
  created_at: string;
  amount: number;
  potential_payout: number;
  status: 'WON' | 'LOST';
}

interface BalancePoint {
  date: string;
  balance: number;
}

interface Props {
  userId: string;
  initialBalance?: number;
}

const PlayerBalanceGraph: React.FC<Props> = ({ userId, initialBalance = 10000 }) => {
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchBets = async () => {
      setLoading(true);
      try {
        const { data: bets, error } = await supabase
          .from('bets')
          .select('created_at, amount, potential_payout, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        let balance = initialBalance;
        const data: BalancePoint[] = (bets || []).map((b: any) => {
          if (b.status === 'WON') balance += b.potential_payout;
          else if (b.status === 'LOST') balance -= b.amount;

          return { date: new Date(b.created_at).toLocaleString(), balance };
        });

        setBalanceData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, [userId, initialBalance]);

  if (loading) return <p className="text-white text-sm">Chargement du graphique...</p>;
  if (balanceData.length === 0) return <p className="text-white text-sm">Aucun pari pour ce joueur</p>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={balanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" tick={{ fill: 'white', fontSize: 12 }} />
          <YAxis tick={{ fill: 'white', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none', color: 'white' }} />
          <Line type="monotone" dataKey="balance" stroke="#00ff99" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PlayerBalanceGraph;
