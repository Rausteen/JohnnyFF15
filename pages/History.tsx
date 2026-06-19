import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Eye, Filter, Gamepad2, Loader2, Search, Shield, Skull, Swords, Target, Trophy, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMatchHistoryStore, formatDate, formatDuration, JohnnyMatch } from '../services/matchHistoryStore';
import { useGameStore } from '../services/gameStore';
import { getQueueName } from '../services/riotApi';

type ResultFilter = 'ALL' | 'WIN' | 'LOSS';

const QUEUES = [
  { id: 0, label: 'Toutes' },
  { id: 420, label: 'Solo/Duo' },
  { id: 440, label: 'Flex' },
];

const History = () => {
  const { matches, loading, error, loadMatches, loadConfig } = useMatchHistoryStore();
  const { trackedPlayers, isPolling, isAnyPlayerInGame } = useGameStore();
  const [selectedPlayer, setSelectedPlayer] = useState<string | 'ALL'>('ALL');
  const [selectedQueue, setSelectedQueue] = useState(0);
  const [selectedResult, setSelectedResult] = useState<ResultFilter>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      await loadMatches();
    };
    init();
  }, [loadConfig, loadMatches]);

  const players = useMemo(() => {
    const map = new Map<string, { puuid: string; name: string; id?: string }>();
    for (const match of matches) {
      if (!match.puuid || map.has(match.puuid)) continue;
      const tracked = trackedPlayers.find(p => p.puuid === match.puuid);
      map.set(match.puuid, {
        puuid: match.puuid,
        name: match.player_name || tracked?.displayName || 'Joueur inconnu',
        id: tracked?.id,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, trackedPlayers]);

  const filteredMatches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return matches.filter(match => {
      if (selectedPlayer !== 'ALL' && match.puuid !== selectedPlayer) return false;
      if (selectedQueue !== 0 && match.queue_id !== selectedQueue) return false;
      if (selectedResult === 'WIN' && !match.win) return false;
      if (selectedResult === 'LOSS' && match.win) return false;
      if (!needle) return true;
      const tracked = trackedPlayers.find(p => p.puuid === match.puuid);
      const haystack = `${match.player_name || tracked?.displayName || ''} ${match.champion_name} ${getQueueName(match.queue_id)}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [matches, search, selectedPlayer, selectedQueue, selectedResult, trackedPlayers]);

  const global = useMemo(() => summarize(filteredMatches), [filteredMatches]);
  const leaderboard = useMemo(() => buildLeaderboard(filteredMatches, trackedPlayers), [filteredMatches, trackedPlayers]);
  const highlights = useMemo(() => getHighlights(filteredMatches), [filteredMatches]);

  if (loading && matches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-zinc-400">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 text-sm font-bold mb-4">
              <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
              {isPolling ? 'Watcher actif' : 'Watcher inactif'}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white">Historique du squad</h1>
            <p className="text-zinc-400 mt-2">Toutes les games trackées, les perfs, les gros écarts et les games à revoir.</p>
          </div>
          {isAnyPlayerInGame() && (
            <div className="rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-green-300 font-bold">
              Une game est en cours, elle sera ajoutée au récap à la fin.
            </div>
          )}
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">Erreur: {error}</div>}
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <Metric label="Games" value={global.games.toString()} icon={<Gamepad2 />} />
        <Metric label="Winrate" value={`${global.winRate}%`} tone={global.winRate >= 50 ? 'good' : 'bad'} icon={<Trophy />} />
        <Metric label="KDA squad" value={global.kda.toFixed(2)} icon={<Swords />} />
        <Metric label="CS/min" value={global.csPerMin.toFixed(1)} icon={<Target />} />
        <Metric label="Dégâts moy." value={formatNumber(global.avgDamage)} icon={<Zap />} />
        <Metric label="Vision moy." value={global.avgVision.toFixed(1)} icon={<Eye />} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="flex items-center gap-2 mb-4 text-white font-black">
            <Filter className="w-5 h-5 text-cyan-400" />
            Filtres
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher joueur, champion, queue..."
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 py-2.5 pl-10 pr-3 text-white outline-none focus:border-cyan-500/60"
              />
            </div>
            <Segmented options={QUEUES} value={selectedQueue} onChange={setSelectedQueue} />
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
              {(['ALL', 'WIN', 'LOSS'] as ResultFilter[]).map(value => (
                <button
                  key={value}
                  onClick={() => setSelectedResult(value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold ${selectedResult === value ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  {value === 'ALL' ? 'Tous' : value === 'WIN' ? 'Wins' : 'Losses'}
                </button>
              ))}
            </div>
          </div>

          {players.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <PlayerChip active={selectedPlayer === 'ALL'} onClick={() => setSelectedPlayer('ALL')} label={`Tous (${matches.length})`} />
              {players.map(player => (
                <PlayerChip
                  key={player.puuid}
                  active={selectedPlayer === player.puuid}
                  onClick={() => setSelectedPlayer(player.puuid)}
                  label={player.name}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <h2 className="text-white font-black mb-4">Highlights</h2>
          <div className="space-y-3 text-sm">
            <Highlight label="MVP" value={highlights.best ? `${playerName(highlights.best, trackedPlayers)} · ${highlights.best.champion_name} (${formatKda(highlights.best)})` : 'Aucun'} tone="good" />
            <Highlight label="Plus gros dégâts" value={highlights.damage ? `${playerName(highlights.damage, trackedPlayers)} · ${formatNumber(highlights.damage.damage_dealt)}` : 'Aucun'} />
            <Highlight label="Game suspecte" value={highlights.suspect ? `${playerName(highlights.suspect, trackedPlayers)} · ${highlights.suspect.deaths} morts sur ${highlights.suspect.champion_name}` : 'Aucun'} tone="bad" />
          </div>
        </div>
      </section>

      {leaderboard.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 mb-6">
          <h2 className="text-white font-black mb-4">Classement sur la sélection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {leaderboard.slice(0, 6).map((entry, index) => (
              <Link
                key={entry.puuid}
                to={entry.playerId ? `/players/${entry.playerId}` : '/player-stats'}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:border-cyan-500/40 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-black">{placement(index)} {entry.name}</div>
                    <div className="text-xs text-zinc-500">{entry.games}G · {entry.wins}W/{entry.losses}L</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-black ${entry.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{entry.winRate}%</div>
                    <div className="text-xs text-zinc-500">KDA {entry.kda.toFixed(2)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <Skull className="w-14 h-14 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Aucune game trouvée</h3>
          <p className="text-zinc-400">Change les filtres ou vérifie que le watcher ajoute bien les fins de game.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {filteredMatches.map(match => (
            <MatchCard key={`${match.id}_${match.puuid}`} match={match} trackedPlayers={trackedPlayers} />
          ))}
        </section>
      )}
    </div>
  );
};

const MatchCard = ({ match, trackedPlayers }: { match: JohnnyMatch; trackedPlayers: any[] }) => {
  const name = playerName(match, trackedPlayers);
  const kdaRatio = (match.kills + match.assists) / Math.max(1, match.deaths);
  const csPerMin = match.cs / Math.max(1, match.game_duration / 60);
  const kp = match.kill_participation ?? ((match.kills + match.assists) / Math.max(1, match.team_kills) * 100);
  const verdict = getVerdict(match, kdaRatio);
  const tracked = trackedPlayers.find(p => p.puuid === match.puuid);

  return (
    <article className={`grid grid-cols-[5px_1fr] overflow-hidden rounded-xl border ${match.win ? 'border-blue-500/20 bg-blue-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
      <div className={match.win ? 'bg-blue-500' : 'bg-red-500'} />
      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={championImage(match.champion_name)}
              alt={match.champion_name}
              className="w-14 h-14 rounded-lg bg-zinc-800"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-black ${match.win ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>
                  {match.win ? 'VICTOIRE' : 'DÉFAITE'}
                </span>
                <span className="text-white font-black text-lg">{match.champion_name}</span>
                <span className="text-zinc-500">par</span>
                {tracked?.id ? (
                  <Link to={`/players/${tracked.id}`} className="text-cyan-300 hover:text-cyan-200 font-bold">{name}</Link>
                ) : (
                  <span className="text-cyan-300 font-bold">{name}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(match.game_creation)}
                <span>·</span>
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(match.game_duration)}
                <span>·</span>
                {getQueueName(match.queue_id)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 lg:min-w-[620px]">
            <Mini label="KDA" value={`${match.kills}/${match.deaths}/${match.assists}`} sub={kdaRatio.toFixed(2)} tone={kdaRatio >= 3 ? 'good' : match.deaths >= 10 ? 'bad' : undefined} />
            <Mini label="CS/min" value={csPerMin.toFixed(1)} sub={`${match.cs} CS`} />
            <Mini label="Dégâts" value={formatNumber(match.damage_dealt)} sub={`${Math.round(match.team_damage_pct || 0)}% team`} />
            <Mini label="Vision" value={match.vision_score.toString()} sub={`${match.wards_placed || 0} wards`} />
            <Mini label="KP" value={`${Math.round(kp)}%`} sub="participation" />
            <Mini label="Verdict" value={verdict} compact />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {match.is_top_damage_team && <Badge icon={<Zap />} text="Top dégâts team" tone="cyan" />}
          {match.is_top_damage_game && <Badge icon={<Trophy />} text="Top dégâts game" tone="gold" />}
          {match.first_blood_kill && <Badge icon={<Target />} text="First blood" tone="green" />}
          {match.first_blood_victim && <Badge icon={<Skull />} text="First blood victim" tone="red" />}
          {(match.penta_kills || 0) > 0 && <Badge icon={<Trophy />} text="Pentakill" tone="gold" />}
          {(match.solo_kills || 0) > 0 && <Badge icon={<Swords />} text={`${match.solo_kills} solo kill${match.solo_kills! > 1 ? 's' : ''}`} tone="green" />}
          {match.deaths >= 10 && <Badge icon={<Skull />} text="10+ morts" tone="red" />}
          {match.game_ended_surrender && <Badge icon={<Shield />} text="Surrender" tone="purple" />}
        </div>
      </div>
    </article>
  );
};

const Metric = ({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactElement; tone?: 'good' | 'bad' }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
    <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wide">
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      {label}
    </div>
    <div className={`mt-2 text-2xl font-mono font-black ${tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-white'}`}>{value}</div>
  </div>
);

const Segmented = ({ options, value, onChange }: { options: { id: number; label: string }[]; value: number; onChange: (value: number) => void }) => (
  <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
    {options.map(option => (
      <button
        key={option.id}
        onClick={() => onChange(option.id)}
        className={`px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap ${value === option.id ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const PlayerChip = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${active ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}
  >
    {label}
  </button>
);

const Highlight = ({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) => (
  <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
    <div className="text-xs text-zinc-500 font-bold">{label}</div>
    <div className={`mt-1 font-bold ${tone === 'good' ? 'text-green-300' : tone === 'bad' ? 'text-red-300' : 'text-white'}`}>{value}</div>
  </div>
);

const Mini = ({ label, value, sub, tone, compact }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad'; compact?: boolean }) => (
  <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 px-3 py-2 min-w-0">
    <div className={`font-mono font-black truncate ${compact ? 'text-sm' : 'text-base'} ${tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-white'}`}>{value}</div>
    <div className="text-xs text-zinc-500 truncate">{sub || label}</div>
  </div>
);

const Badge = ({ icon, text, tone }: { icon: React.ReactElement; text: string; tone: 'red' | 'green' | 'purple' | 'cyan' | 'gold' }) => {
  const colors = {
    red: 'bg-red-500/15 text-red-300 border-red-500/25',
    green: 'bg-green-500/15 text-green-300 border-green-500/25',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    gold: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${colors[tone]}`}>
      {React.cloneElement(icon, { className: 'w-3.5 h-3.5' })}
      {text}
    </span>
  );
};

function summarize(rows: JohnnyMatch[]) {
  const games = rows.length;
  const wins = rows.filter(m => m.win).length;
  const kills = rows.reduce((s, m) => s + m.kills, 0);
  const deaths = rows.reduce((s, m) => s + m.deaths, 0);
  const assists = rows.reduce((s, m) => s + m.assists, 0);
  const durationMin = rows.reduce((s, m) => s + m.game_duration, 0) / 60;
  return {
    games,
    wins,
    losses: games - wins,
    winRate: games ? Math.round((wins / games) * 100) : 0,
    kda: (kills + assists) / Math.max(1, deaths),
    csPerMin: rows.reduce((s, m) => s + m.cs, 0) / Math.max(1, durationMin),
    avgDamage: rows.reduce((s, m) => s + m.damage_dealt, 0) / Math.max(1, games),
    avgVision: rows.reduce((s, m) => s + m.vision_score, 0) / Math.max(1, games),
  };
}

function buildLeaderboard(rows: JohnnyMatch[], trackedPlayers: any[]) {
  const map = new Map<string, JohnnyMatch[]>();
  for (const row of rows) {
    const key = row.puuid || 'unknown';
    map.set(key, [...(map.get(key) || []), row]);
  }

  return [...map.entries()].map(([puuid, playerRows]) => {
    const summary = summarize(playerRows);
    const tracked = trackedPlayers.find(p => p.puuid === puuid);
    return {
      puuid,
      playerId: tracked?.id,
      name: playerRows[0]?.player_name || tracked?.displayName || 'Joueur inconnu',
      ...summary,
      score: summary.winRate + summary.kda * 10 + Math.min(20, summary.avgDamage / 1000) + Math.min(20, playerRows.length * 2),
    };
  }).sort((a, b) => b.score - a.score);
}

function getHighlights(rows: JohnnyMatch[]) {
  return {
    best: [...rows].sort((a, b) => scoreGame(b) - scoreGame(a))[0],
    damage: [...rows].sort((a, b) => b.damage_dealt - a.damage_dealt)[0],
    suspect: [...rows].sort((a, b) => suspectScore(b) - suspectScore(a))[0],
  };
}

function scoreGame(match: JohnnyMatch) {
  return (match.kills + match.assists) / Math.max(1, match.deaths) + (match.win ? 1.5 : 0) + match.damage_dealt / 25000;
}

function suspectScore(match: JohnnyMatch) {
  return match.deaths * 2 + (match.win ? 0 : 5) - ((match.kills + match.assists) / Math.max(1, match.deaths));
}

function playerName(match: JohnnyMatch, trackedPlayers: any[]) {
  return match.player_name || trackedPlayers.find(p => p.puuid === match.puuid)?.displayName || 'Joueur';
}

function getVerdict(match: JohnnyMatch, kdaRatio: number) {
  if (kdaRatio >= 5) return 'MVP';
  if (match.is_top_damage_team) return 'Top dmg';
  if (match.deaths >= 10) return 'Suspect';
  if (kdaRatio >= 3) return 'Clean';
  if (match.win) return 'Win';
  return 'Review';
}

function formatKda(match: JohnnyMatch) {
  return `${match.kills}/${match.deaths}/${match.assists}`;
}

function championImage(name: string) {
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${name.replace(/['\s.]/g, '')}.png`;
}

function formatNumber(num: number) {
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return Math.round(num).toString();
}

function placement(index: number) {
  return ['🥇', '🥈', '🥉'][index] || `#${index + 1}`;
}

export default History;
