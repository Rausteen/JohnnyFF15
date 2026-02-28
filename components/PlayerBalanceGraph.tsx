import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface BalancePoint {
  date: string;
  balance: number;
  source?: string;
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

  const { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } = RechartsComponents;

  const startBalance = data.length > 0 ? data[0].balance : 10000;
  const endBalance = data.length > 0 ? data[data.length - 1].balance : 10000;
  const isPositive = endBalance >= startBalance;
  const strokeColor = isPositive ? '#22c55e' : '#ef4444';
  const fillColor = isPositive ? '#22c55e' : '#ef4444';

  const sourceLabels: Record<string, string> = {
    bet_placed: 'Pari placé',
    bet_won: 'Pari gagné',
    bet_lost: 'Pari perdu',
    daily_bonus: 'Bonus quotidien',
    transfer_in: 'Transfert reçu',
    transfer_out: 'Transfert envoyé',
    case_purchase: 'Achat de caisse',
    case_coins_won: 'Coins gagnés (caisse)',
    admin_add: 'Ajout admin',
    season_reset: 'Reset de saison',
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" tick={{ fill: '#999', fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#999', fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', color: 'white' }}
            formatter={(value: number, _name: string, props: any) => {
              const src = props.payload?.source;
              const label = src ? sourceLabels[src] || src : 'Solde';
              return [`${value.toLocaleString('fr-FR')} JC`, label];
            }}
          />
          <Area type="monotone" dataKey="balance" stroke={strokeColor} strokeWidth={2} fill="url(#balanceGradient)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const PlayerBalanceGraph: React.FC<Props> = ({ userId, initialBalance = 10000 }) => {
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Try snapshots first (new system)
        const { data: snapshots, error: snapError } = await supabase
          .from('balance_snapshots')
          .select('balance, source, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(500);

        if (!snapError && snapshots && snapshots.length > 0) {
          const data: BalancePoint[] = snapshots.map((s: any) => ({
            date: new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            balance: s.balance,
            source: s.source,
          }));
          setBalanceData(data);
          return;
        }

        // Fallback: reconstruct from bets (legacy)
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
          return {
            date: new Date(b.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            balance,
          };
        });

        setBalanceData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, initialBalance]);

  if (loading) return <p className="text-white text-sm">Chargement du graphique...</p>;
  if (balanceData.length === 0) return <p className="text-zinc-500 text-sm">Aucune donnée pour ce joueur</p>;

  return <ChartRenderer data={balanceData} />;
};

export default PlayerBalanceGraph;
