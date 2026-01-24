import { useEffect } from 'react';
import { Calendar, Skull, Loader2, Eye, Swords, Target, Clock, Sparkles } from 'lucide-react';
import { useMatchHistoryStore, formatDuration, formatDate, generateFunFact, JohnnyMatch } from '../services/matchHistoryStore';
import { useGameStore } from '../services/gameStore';
import { getQueueName } from '../services/riotApi';

const History = () => {
  const { matches, loading, error, loadMatches, loadConfig } = useMatchHistoryStore();
  const { isPolling, isInGame } = useGameStore();

  // Load matches on mount
  useEffect(() => {
    const init = async () => {
      await loadConfig();
      await loadMatches();
    };
    init();
  }, [loadConfig, loadMatches]);

  if (loading && matches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-zinc-400">Chargement du Musée du Throw...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Musée du Throw</h1>
        <p className="text-zinc-400 mb-4">Les grandes dates de l'histoire (tragique) de Johnny.</p>

        {/* Auto-sync status */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm">
          {isPolling ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">Synchronisation automatique active</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
              <span className="text-zinc-500">Synchronisation inactive</span>
            </>
          )}
        </div>
        {isInGame && (
          <div className="mt-2 text-xs text-amber-400">
            Les nouvelles games seront ajoutées automatiquement à la fin de chaque partie.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            Erreur: {error}
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Skull className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Aucune game enregistrée</h3>
          <p className="text-zinc-400 mb-4">
            Les games s'ajoutent automatiquement quand Johnny finit une partie.
          </p>
          <p className="text-zinc-500 text-sm">
            Tu peux aussi synchroniser manuellement dans Admin si besoin.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-zinc-800 ml-4 md:ml-8 space-y-8">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
};

// Match Card Component
const MatchCard = ({ match }: { match: JohnnyMatch }) => {
  const kda = `${match.kills}/${match.deaths}/${match.assists}`;
  const kdaRatio = ((match.kills + match.assists) / Math.max(1, match.deaths)).toFixed(2);
  const csPerMin = (match.cs / (match.game_duration / 60)).toFixed(1);
  const killParticipation = Math.round((match.kills + match.assists) / Math.max(1, match.team_kills) * 100);
  const funFact = generateFunFact(match);

  return (
    <div className="relative pl-8 md:pl-12">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-zinc-950
        ${match.win ? 'bg-green-500' : 'bg-red-500'}
      `}></div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Calendar className="w-4 h-4" />
                {formatDate(match.game_creation)}
                <span className="text-zinc-700">•</span>
                <Clock className="w-4 h-4" />
                {formatDuration(match.game_duration)}
                <span className="text-zinc-700">•</span>
                <span>{getQueueName(match.queue_id)}</span>
              </div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {match.champion_name}
                {match.deaths >= 10 && <span className="text-red-400 text-sm">(int mode)</span>}
              </h3>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase border
              ${match.win ? 'bg-green-950/30 text-green-400 border-green-900/50' : 'bg-red-950/30 text-red-400 border-red-900/50'}
            `}>
              {match.win ? 'VICTOIRE' : 'DÉFAITE'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-zinc-950/50 rounded-lg mb-4">
            <StatBox label="KDA" value={kda} subValue={`${kdaRatio} ratio`} highlight={match.deaths >= 10} />
            <StatBox label="CS" value={match.cs.toString()} subValue={`${csPerMin}/min`} />
            <StatBox label="Vision" value={match.vision_score.toString()} highlight={match.vision_score < 5} />
            <StatBox label="Dégâts" value={formatNumber(match.damage_dealt)} />
            <StatBox label="Participation" value={`${killParticipation}%`} highlight={killParticipation < 20} />
          </div>

          {/* Fun fact */}
          <div className="flex items-start gap-3 p-4 bg-zinc-800/30 rounded-lg text-sm text-zinc-400 italic">
            <Skull className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
            "{funFact}"
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {match.first_blood_victim && (
              <Badge icon={<Target className="w-3 h-3" />} text="First Blood Victim" color="red" />
            )}
            {match.deaths >= 10 && (
              <Badge icon={<Skull className="w-3 h-3" />} text="10+ Deaths" color="red" />
            )}
            {match.vision_score === 0 && (
              <Badge icon={<Eye className="w-3 h-3" />} text="0 Vision" color="orange" />
            )}
            {match.game_ended_surrender && match.game_duration < 1200 && (
              <Badge icon={<Swords className="w-3 h-3" />} text="FF15" color="purple" />
            )}
            {match.win && (
              <Badge icon={<Swords className="w-3 h-3" />} text="Carry?" color="green" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Box Component
const StatBox = ({ label, value, subValue, highlight }: { label: string; value: string; subValue?: string; highlight?: boolean }) => (
  <div className="text-center">
    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</div>
    <div className={`font-mono font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</div>
    {subValue && <div className="text-xs text-zinc-600">{subValue}</div>}
  </div>
);

// Badge Component
const Badge = ({ icon, text, color }: { icon: React.ReactNode; text: string; color: 'red' | 'orange' | 'purple' | 'green' }) => {
  const colors = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${colors[color]}`}>
      {icon}
      {text}
    </span>
  );
};

// Helper: Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

export default History;
