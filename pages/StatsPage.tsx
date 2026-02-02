import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
interface Bet {
  created_at: string;
  amount: number;
  potential_payout: number;
  status: 'WON' | 'LOST';
}

interface PlayerOption {
  id: string;
  pseudo: string;
}

interface BalancePoint {
  date: string;
  balance: number;
}

const StatsPage = () => {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [bets, setBets] = useState<Bet[]>([]);
  const [balanceData, setBalanceData] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(false);

  const INITIAL_BALANCE = 10000; // Solde de départ

  // Récupérer tous les joueurs
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.from('profiles').select('id, pseudo');
      if (error) {
        console.error(error);
        return;
      }
      setPlayers(data || []);
      if (data && data.length > 0) setSelectedPlayer(data[0].id);
    };
    fetchPlayers();
  }, []);

  // Récupérer les bets du joueur sélectionné
  useEffect(() => {
    if (!selectedPlayer) return;

    const fetchBets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bets')
        .select('created_at, amount, potential_payout, status')
        .eq('user_id', selectedPlayer)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setBets(data || []);
      setLoading(false);
    };

    fetchBets();
  }, [selectedPlayer]);

  // Calculer le portefeuille cumulatif
  useEffect(() => {
    let balance = INITIAL_BALANCE;
    const data: BalancePoint[] = bets.map((b) => {
      if (b.status === 'WON') balance += b.potential_payout;
      else if (b.status === 'LOST') balance -= b.amount; // on retire seulement la mise perdue
      return { date: new Date(b.created_at).toLocaleString(), balance };
    });
    setBalanceData(data);
  }, [bets]);

  return (
    <>

      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Stats des joueurs</h1>

        {/* Select joueur */}
        <div className="mb-6">
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="p-2 rounded-md bg-zinc-800 text-white border border-white/20"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.pseudo}
              </option>
            ))}
          </select>
        </div>

        {/* Graphique */}
        {loading ? (
          <p className="text-white">Chargement...</p>
        ) : balanceData.length === 0 ? (
          <p className="text-white">Aucun pari trouvé pour ce joueur.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" tick={{ fill: 'white', fontSize: 12 }} />
              <YAxis tick={{ fill: 'white', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none', color: 'white' }} />
              <Line type="monotone" dataKey="balance" stroke="#00ff99" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
};

export default StatsPage;
