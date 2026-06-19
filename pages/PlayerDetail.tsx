import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Crown, Eye, Flame, Gamepad2, Medal, Shield, Skull, Swords, Target, TrendingDown, TrendingUp, Trophy, Zap } from 'lucide-react';
import { useGameStore } from '../services/gameStore';
import { supabase } from '../services/supabase';
import { getChampionName, getQueueName } from '../services/riotApi';
import { RANK_COLORS, RANK_LABELS, TrackedPlayer } from '../types';

interface MatchRow {
  id: string;
  game_creation: number;
  game_duration: number;
  queue_id: number;
  champion_id: number;
  champion_name: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision_score: number;
  gold_earned: number;
  damage_dealt: number;
  damage_taken?: number | null;
  kill_participation?: number | null;
  team_damage_pct?: number | null;
  team_kills?: number | null;
  double_kills?: number | null;
  triple_kills?: number | null;
  quadra_kills?: number | null;
  penta_kills?: number | null;
  solo_kills?: number | null;
  solo_deaths?: number | null;
  first_blood_kill?: boolean | null;
  first_blood_victim?: boolean | null;
  is_top_damage_team?: boolean | null;
  is_top_damage_game?: boolean | null;
  win: boolean;
}

interface ChampionAggregate {
  name: string;
  id: number;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
  damage: number;
}

const QUEUES = [
  { id: 0, label: 'Toutes' },
  { id: 420, label: 'Solo/Duo' },
  { id: 440, label: 'Flex' },
];

const PlayerDetail = () => {
  const { playerId } = useParams();
  const { trackedPlayers, playerStates, loadTrackedPlayers } = useGameStore();
  const [queueId, setQueueId] = useState(0);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackedPlayers();
  }, [loadTrackedPlayers]);

  const player = useMemo(() => (
    trackedPlayers.find(p => p.id === playerId || p.puuid === playerId) || null
  ), [trackedPlayers, playerId]);

  useEffect(() => {
    if (!player?.puuid) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('johnny_matches')
        .select('*')
        .eq('puuid', player.puuid)
        .order('game_creation', { ascending: false })
        .limit(80);

      if (queueId !== 0) query = query.eq('queue_id', queueId);

      const { data, error } = await query;
      if (error) {
        console.error('Error loading player detail:', error);
        setMatches([]);
      } else {
        setMatches((data || []) as MatchRow[]);
      }
      setLoading(false);
    };
    load();
  }, [player?.puuid, queueId]);

  if (!player) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <BackLink />
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
          <h1 className="text-2xl font-black text-white mb-2">Joueur introuvable</h1>
          <p className="text-zinc-400">Le joueur n'est pas encore chargé ou n'existe pas.</p>
        </div>
      </div>
    );
  }

  const gameState = player.puuid ? playerStates.get(player.puuid) : undefined;
  const liveGame = gameState?.currentGame;
  const championId = liveGame?.participants?.find(p => p.puuid === player.puuid)?.championId;
  const liveChampion = championId ? getChampionName(championId) : null;
  const summary = summarize(matches);
  const champions = summarizeChampions(matches);
  const recent = matches.slice(0, 10);
  const records = getRecords(matches);
  const badges = getBadges(summary, records, matches);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <BackLink />

        <header className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
          <div className="bg-gradient-to-r from-cyan-500/20 via-zinc-900 to-red-500/10 p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black text-white ${gameState?.isInGame ? 'bg-green-500' : 'bg-zinc-800'}`}>
                  {player.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-4xl md:text-5xl font-black text-white">{player.displayName}</h1>
                    {gameState?.isInGame && <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm font-black">LIVE</span>}
                  </div>
                  <div className="text-zinc-400 mt-1">{player.gameName}#{player.tagLine}</div>
                  <RankLine player={player} />
                </div>
              </div>

              {gameState?.isInGame && liveGame && (
                <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-4 min-w-[260px]">
                  <div className="text-green-300 font-black flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-5 h-5" />
                    En game
                  </div>
                  <div className="text-white font-bold">{getQueueName(liveGame.gameQueueConfigId)}</div>
                  <div className="text-zinc-400 text-sm">
                    {liveChampion || 'Champion inconnu'} · {Math.floor((Date.now() - liveGame.gameStartTime) / 60000)} min
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto">
          {QUEUES.map(q => (
            <button
              key={q.id}
              onClick={() => setQueueId(q.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${queueId === q.id ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400">Chargement du profil...</div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-10 text-center text-zinc-400">
            Aucune game trouvée pour ce filtre.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
            <aside className="space-y-5">
              <Panel title="Résumé">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Games" value={summary.games.toString()} />
                  <Metric label="Winrate" value={`${summary.winRate}%`} tone={summary.winRate >= 50 ? 'good' : 'bad'} />
                  <Metric label="KDA" value={summary.kda.toFixed(2)} />
                  <Metric label="KP" value={`${summary.avgKP.toFixed(0)}%`} />
                  <Metric label="CS/min" value={summary.avgCsPerMin.toFixed(1)} />
                  <Metric label="Dégâts" value={formatNumber(summary.avgDamage)} />
                  <Metric label="Vision" value={summary.avgVision.toFixed(1)} />
                  <Metric label="Gold" value={formatNumber(summary.avgGold)} />
                </div>
              </Panel>

              <Panel title="Badges">
                <div className="flex flex-wrap gap-2">
                  {badges.map(b => (
                    <span key={b} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-200">{b}</span>
                  ))}
                </div>
              </Panel>

              <Panel title="Records">
                <div className="space-y-2 text-sm">
                  <Record icon={<Swords />} label="Kills" value={records.kills} />
                  <Record icon={<Skull />} label="Morts" value={records.deaths} />
                  <Record icon={<Zap />} label="Dégâts" value={formatNumber(records.damage)} />
                  <Record icon={<Eye />} label="Vision" value={records.vision} />
                  <Record icon={<Trophy />} label="Meilleur KDA" value={records.kda.toFixed(2)} />
                </div>
              </Panel>
            </aside>

            <main className="space-y-5">
              <Panel title="Forme récente">
                <div className="flex gap-2 mb-4">
                  {recent.map(m => (
                    <div key={m.id} className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-black ${m.win ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                      {m.win ? 'W' : 'L'}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric label="Dernières 10" value={`${recent.filter(m => m.win).length}W ${recent.filter(m => !m.win).length}L`} />
                  <Metric label="KDA récent" value={summarize(recent).kda.toFixed(2)} />
                  <Metric label="Top dégâts team" value={`${matches.filter(m => m.is_top_damage_team).length}x`} />
                  <Metric label="First blood" value={`${matches.filter(m => m.first_blood_kill).length}x`} />
                </div>
              </Panel>

              <Panel title="Champions">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {champions.slice(0, 10).map(champ => (
                    <ChampionRow key={champ.name} champ={champ} />
                  ))}
                </div>
              </Panel>

              <Panel title="Historique récent">
                <div className="space-y-2">
                  {matches.slice(0, 20).map(match => (
                    <MatchLine key={`${match.id}-${match.champion_name}`} match={match} />
                  ))}
                </div>
              </Panel>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

const BackLink = () => (
  <Link to="/player-stats" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white">
    <ArrowLeft className="w-4 h-4" />
    Retour aux joueurs
  </Link>
);

const RankLine = ({ player }: { player: TrackedPlayer }) => {
  if (!player.soloTier) return <div className="mt-3 text-zinc-500 font-bold">Unranked</div>;
  const color = RANK_COLORS[player.soloTier] || 'text-zinc-300';
  return (
    <div className={`mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-900/80 border border-zinc-700 px-3 py-2 font-black ${color}`}>
      <Crown className="w-4 h-4" />
      {RANK_LABELS[player.soloTier]} {player.soloDivision || ''} <span className="text-zinc-400 font-bold">{player.soloLp ?? 0} LP</span>
    </div>
  );
};

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
    <h2 className="text-white font-black mb-4">{title}</h2>
    {children}
  </section>
);

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) => (
  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
    <div className="text-xs text-zinc-500 font-bold">{label}</div>
    <div className={`mt-1 font-mono text-xl font-black ${tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-white'}`}>{value}</div>
  </div>
);

const Record = ({ icon, label, value }: { icon: React.ReactElement; label: string; value: string | number }) => (
  <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2">
    <span className="flex items-center gap-2 text-zinc-400">{React.cloneElement(icon, { className: 'w-4 h-4' })}{label}</span>
    <span className="font-mono font-black text-white">{value}</span>
  </div>
);

const ChampionRow = ({ champ }: { champ: ChampionAggregate }) => {
  const wr = Math.round((champ.wins / champ.games) * 100);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <img src={championImage(champ.name)} alt={champ.name} className="w-12 h-12 rounded-lg" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      <div className="min-w-0 flex-1">
        <div className="text-white font-black truncate">{champ.name}</div>
        <div className="text-xs text-zinc-500">{avg(champ.kills, champ.games)}/{avg(champ.deaths, champ.games)}/{avg(champ.assists, champ.games)} · {champ.csPerMin.toFixed(1)} CS/min</div>
      </div>
      <div className="text-right">
        <div className={`font-mono font-black ${wr >= 50 ? 'text-green-400' : 'text-red-400'}`}>{wr}%</div>
        <div className="text-xs text-zinc-500">{champ.games} games</div>
      </div>
    </div>
  );
};

const MatchLine = ({ match }: { match: MatchRow }) => {
  const kda = (match.kills + match.assists) / Math.max(1, match.deaths);
  const csPerMin = match.cs / Math.max(1, match.game_duration / 60);
  return (
    <div className={`grid grid-cols-[4px_1fr] overflow-hidden rounded-lg border ${match.win ? 'border-blue-500/20 bg-blue-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
      <div className={match.win ? 'bg-blue-500' : 'bg-red-500'} />
      <div className="p-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
        <div className="flex items-center gap-3 min-w-[220px]">
          <img src={championImage(match.champion_name)} alt={match.champion_name} className="w-11 h-11 rounded-lg" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div className="text-white font-black">{match.champion_name}</div>
            <div className="text-xs text-zinc-500">{getQueueName(match.queue_id)} · {formatDuration(match.game_duration)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 flex-1 text-sm">
          <Mini label={match.win ? 'Victoire' : 'Défaite'} value={new Date(match.game_creation).toLocaleDateString('fr-FR')} tone={match.win ? 'good' : 'bad'} />
          <Mini label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} />
          <Mini label="Ratio" value={kda.toFixed(2)} />
          <Mini label="CS/min" value={csPerMin.toFixed(1)} />
          <Mini label="Dégâts" value={formatNumber(match.damage_dealt)} />
          <Mini label="KP" value={`${Math.round(match.kill_participation || 0)}%`} />
        </div>
      </div>
    </div>
  );
};

const Mini = ({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) => (
  <div>
    <div className={`font-mono font-black ${tone === 'good' ? 'text-blue-300' : tone === 'bad' ? 'text-red-300' : 'text-white'}`}>{value}</div>
    <div className="text-xs text-zinc-500">{label}</div>
  </div>
);

function summarize(rows: MatchRow[]) {
  const games = rows.length || 1;
  const wins = rows.filter(r => r.win).length;
  const kills = rows.reduce((s, r) => s + r.kills, 0);
  const deaths = rows.reduce((s, r) => s + r.deaths, 0);
  const assists = rows.reduce((s, r) => s + r.assists, 0);
  const duration = rows.reduce((s, r) => s + r.game_duration, 0) / 60;
  return {
    games: rows.length,
    wins,
    losses: rows.length - wins,
    winRate: rows.length ? Math.round((wins / rows.length) * 100) : 0,
    kda: (kills + assists) / Math.max(1, deaths),
    avgCsPerMin: rows.reduce((s, r) => s + r.cs, 0) / Math.max(1, duration),
    avgDamage: rows.reduce((s, r) => s + r.damage_dealt, 0) / games,
    avgVision: rows.reduce((s, r) => s + r.vision_score, 0) / games,
    avgGold: rows.reduce((s, r) => s + r.gold_earned, 0) / games,
    avgKP: rows.reduce((s, r) => s + (r.kill_participation || 0), 0) / games,
  };
}

function summarizeChampions(rows: MatchRow[]): ChampionAggregate[] {
  const map = new Map<string, ChampionAggregate>();
  for (const row of rows) {
    const current = map.get(row.champion_name) || { name: row.champion_name, id: row.champion_id, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, csPerMin: 0, damage: 0 };
    current.games += 1;
    current.wins += row.win ? 1 : 0;
    current.kills += row.kills;
    current.deaths += row.deaths;
    current.assists += row.assists;
    current.csPerMin += row.cs / Math.max(1, row.game_duration / 60);
    current.damage += row.damage_dealt;
    map.set(row.champion_name, current);
  }
  return [...map.values()].map(c => ({ ...c, csPerMin: c.csPerMin / c.games, damage: c.damage / c.games })).sort((a, b) => b.games - a.games || b.wins - a.wins);
}

function getRecords(rows: MatchRow[]) {
  return {
    kills: Math.max(...rows.map(r => r.kills), 0),
    deaths: Math.max(...rows.map(r => r.deaths), 0),
    damage: Math.max(...rows.map(r => r.damage_dealt), 0),
    vision: Math.max(...rows.map(r => r.vision_score), 0),
    kda: Math.max(...rows.map(r => (r.kills + r.assists) / Math.max(1, r.deaths)), 0),
  };
}

function getBadges(summary: ReturnType<typeof summarize>, records: ReturnType<typeof getRecords>, rows: MatchRow[]) {
  const badges = [];
  if (summary.winRate >= 55) badges.push('Gagneur');
  if (summary.kda >= 3) badges.push('KDA player');
  if (summary.avgCsPerMin >= 7) badges.push('Farmeur');
  if (summary.avgKP >= 65) badges.push('Partout sur la map');
  if (records.deaths >= 10) badges.push('Game suspecte détectée');
  if (rows.some(r => (r.penta_kills || 0) > 0)) badges.push('Pentakill');
  if (rows.filter(r => r.is_top_damage_team).length >= 3) badges.push('Top dégâts régulier');
  return badges.length ? badges : ['Profil en cours de calibration'];
}

function championImage(name: string) {
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${name.replace(/['\s.]/g, '')}.png`;
}

function formatNumber(num: number) {
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return Math.round(num).toString();
}

function formatDuration(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function avg(total: number, count: number) {
  return (total / Math.max(1, count)).toFixed(1);
}

export default PlayerDetail;
