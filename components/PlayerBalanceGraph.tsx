import React, { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from '../services/supabase';

// Lazy load Recharts — ~150KB only loaded when this component renders
const LazyChart = lazy(() =>
  import('recharts').then(mod => ({
    default: () => {
      // This is a trick: we can't use hooks inside lazy, so we render a wrapper
      return null;
    }
  }))
);

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

// Actual chart component loaded only when recharts is available
let RechartsComponents: typeof import('recharts') | null = null;

const ChartRenderer: React.FC<{ data: BalancePoint[] }> = ({ data }) => {
  const [loaded, setLoaded] = useState(!!RechartsComponents);

  useEffect(() => {
    if (RechartsComponents) return;
    import('recharts').then(mod => {
      RechartsComponents = mod;
      setLoaded(true);
    });
  }, []);

  if (!loaded || !RechartsComponents) {
    return <p className="text-zinc-400 text-sm">Chargement du graphique...</p>;
  }

  const { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } = RechartsComponents;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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

  return <ChartRenderer data={balanceData} />;
};

export default PlayerBalanceGraph;
