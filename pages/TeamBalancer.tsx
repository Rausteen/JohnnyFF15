import React, { useEffect, useState } from 'react';
import {
  Users,
  Shuffle,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  Swords,
  Trophy,
  Target,
  Crosshair,
  Crown
} from 'lucide-react';
import { useGameStore } from '../services/gameStore';
import { useCreditsStore } from '../services/creditsStore';
import { calculateMultiplePlayerSkillRatings, getSkillTier } from '../services/playerStatsService';
import { balanceTeams } from '../services/teamBalancerService';
import { updatePlayerRank } from '../services/playersService';
import {
  PlayerWithSkill,
  BalancedTeamsResult,
  PlayerRole,
  ROLE_LABELS,
  ROLE_ICONS,
  RANK_LABELS,
  RANK_COLORS,
  RANK_TIERS,
  RankTier,
  RankDivision
} from '../types';

// Admin users
const ADMIN_USERS = ['Rausteen'];

const TeamBalancer = () => {
  const { trackedPlayers, loadTrackedPlayers } = useGameStore();
  const { profile } = useCreditsStore();

  const [playersWithSkill, setPlayersWithSkill] = useState<PlayerWithSkill[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [balancedTeams, setBalancedTeams] = useState<BalancedTeamsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin rank editing
  const isAdmin = profile && ADMIN_USERS.includes(profile.pseudo);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editRankTier, setEditRankTier] = useState<RankTier | ''>('');
  const [editRankDivision, setEditRankDivision] = useState<RankDivision>('IV');
  const [savingRank, setSavingRank] = useState(false);

  // Load players and calculate skill ratings
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadTrackedPlayers();
      } catch (err) {
        setError('Erreur lors du chargement des joueurs');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadTrackedPlayers]);

  // Calculate skill ratings when players are loaded
  useEffect(() => {
    const calculateSkills = async () => {
      if (trackedPlayers.length === 0) return;

      setCalculating(true);
      try {
        const withSkill = await calculateMultiplePlayerSkillRatings(trackedPlayers);
        setPlayersWithSkill(withSkill);
      } catch (err) {
        console.error('Error calculating skills:', err);
      } finally {
        setCalculating(false);
      }
    };
    calculateSkills();
  }, [trackedPlayers]);

  // Toggle player selection (no max limit)
  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
    // Reset teams when selection changes
    setBalancedTeams(null);
  };

  // Select all active players
  const selectAll = () => {
    const activePlayers = playersWithSkill.filter(p => p.isActive);
    const newSelected = new Set<string>();
    activePlayers.forEach(p => newSelected.add(p.id));
    setSelectedPlayers(newSelected);
    setBalancedTeams(null);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedPlayers(new Set());
    setBalancedTeams(null);
  };

  // Generate balanced teams
  const generateTeams = () => {
    if (selectedPlayers.size < 2) {
      setError('Il faut au moins 2 joueurs pour equilibrer les equipes');
      return;
    }

    setError(null);
    const selected = playersWithSkill.filter(p => selectedPlayers.has(p.id));
    const result = balanceTeams(selected);
    setBalancedTeams(result);
  };

  // Re-roll teams
  const rerollTeams = () => {
    if (selectedPlayers.size < 2) return;
    const selected = playersWithSkill.filter(p => selectedPlayers.has(p.id));
    const result = balanceTeams(selected);
    setBalancedTeams(result);
  };

  // Save manual rank (admin only)
  const handleSaveRank = async () => {
    if (!editingPlayerId || !editRankTier) return;

    setSavingRank(true);
    try {
      const success = await updatePlayerRank(editingPlayerId, editRankTier, editRankDivision);
      if (success) {
        // Update local state
        setPlayersWithSkill(prev => prev.map(p =>
          p.id === editingPlayerId
            ? { ...p, soloTier: editRankTier, soloDivision: editRankDivision }
            : p
        ));
        setEditingPlayerId(null);
        setEditRankTier('');
        setEditRankDivision('IV');
      }
    } catch (err) {
      console.error('Error saving rank:', err);
    } finally {
      setSavingRank(false);
    }
  };

  // Open rank editor for a player
  const openRankEditor = (player: PlayerWithSkill) => {
    setEditingPlayerId(player.id);
    setEditRankTier(player.soloTier || '');
    setEditRankDivision(player.soloDivision || 'IV');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-zinc-400">Chargement des joueurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <Swords className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-black text-white">Team Balancer</h1>
        </div>
        <p className="text-zinc-400">Selectionne au moins 2 joueurs pour generer des equipes equilibrees</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Player Selection */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Joueurs ({selectedPlayers.size})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                Tout
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {calculating ? (
            <div className="flex items-center justify-center py-8 gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Calcul des skill ratings...
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {playersWithSkill.map(player => (
                <PlayerSelectCard
                  key={player.id}
                  player={player}
                  isSelected={selectedPlayers.has(player.id)}
                  onToggle={() => togglePlayer(player.id)}
                  disabled={false}
                  isAdmin={isAdmin || false}
                  onEditRank={() => openRankEditor(player)}
                />
              ))}

              {playersWithSkill.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  Aucun joueur trouve. Ajoute des joueurs dans l'admin.
                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <button
              onClick={generateTeams}
              disabled={selectedPlayers.size < 2}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                selectedPlayers.size >= 2
                  ? 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Shuffle className="w-5 h-5" />
              Generer les equipes ({Math.ceil(selectedPlayers.size / 2)}v{Math.floor(selectedPlayers.size / 2)})
            </button>
          </div>
        </div>

        {/* Teams Display */}
        <div className="space-y-6">
          {balancedTeams ? (
            <>
              {/* Team Stats */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-3xl font-black text-blue-400">
                      {balancedTeams.team1.totalSkill}
                    </div>
                    <div className="text-sm text-zinc-500">Skill Total</div>
                  </div>
                  <div className="px-6">
                    <div className="text-lg font-bold text-zinc-400">VS</div>
                    <div className={`text-sm ${
                      balancedTeams.skillDifference <= 10 ? 'text-green-400' :
                      balancedTeams.skillDifference <= 25 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      diff: {balancedTeams.skillDifference}
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-3xl font-black text-red-400">
                      {balancedTeams.team2.totalSkill}
                    </div>
                    <div className="text-sm text-zinc-500">Skill Total</div>
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-2 gap-4">
                <TeamCard team={balancedTeams.team1} teamName="Team 1" color="blue" />
                <TeamCard team={balancedTeams.team2} teamName="Team 2" color="red" />
              </div>

              {/* Re-roll Button */}
              <button
                onClick={rerollTeams}
                className="w-full py-3 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Re-roll les equipes
              </button>
            </>
          ) : (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-12 text-center">
              <Swords className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-500 mb-2">Pas encore d'equipes</h3>
              <p className="text-zinc-600">
                Selectionne au moins 2 joueurs et clique sur "Generer les equipes"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rank Editor Modal (Admin only) */}
      {editingPlayerId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditingPlayerId(null)}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-white">Definir le rang</h3>
            </div>

            <p className="text-zinc-400 text-sm mb-4">
              {playersWithSkill.find(p => p.id === editingPlayerId)?.displayName}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Tier</label>
                <select
                  value={editRankTier}
                  onChange={e => setEditRankTier(e.target.value as RankTier | '')}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="">Pas de rang</option>
                  {RANK_TIERS.map(tier => (
                    <option key={tier} value={tier}>{RANK_LABELS[tier]}</option>
                  ))}
                </select>
              </div>

              {editRankTier && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(editRankTier) && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Division</label>
                  <select
                    value={editRankDivision}
                    onChange={e => setEditRankDivision(e.target.value as RankDivision)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="IV">IV</option>
                    <option value="III">III</option>
                    <option value="II">II</option>
                    <option value="I">I</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingPlayerId(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRank}
                  disabled={savingRank}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingRank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Player Selection Card
const PlayerSelectCard: React.FC<{
  player: PlayerWithSkill;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
  isAdmin: boolean;
  onEditRank: () => void;
}> = ({ player, isSelected, onToggle, disabled, isAdmin, onEditRank }) => {
  const tier = getSkillTier(player.skillRating.odverall);

  return (
    <div className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 ${
      isSelected
        ? 'bg-primary/20 border-primary'
        : disabled
        ? 'bg-zinc-800/50 border-zinc-800 opacity-50'
        : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-600'
    }`}>
      {/* Selection button */}
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'border-primary bg-primary' : 'border-zinc-600'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </button>

      {/* Player info */}
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`flex-1 text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{player.displayName}</span>
          {player.soloTier ? (
            <span className={`text-xs font-medium ${RANK_COLORS[player.soloTier]}`}>
              {RANK_LABELS[player.soloTier]} {player.soloDivision || ''}
            </span>
          ) : isAdmin ? (
            <button
              onClick={(e) => { e.stopPropagation(); onEditRank(); }}
              className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
            >
              + Rank
            </button>
          ) : (
            <span className="text-xs text-zinc-500">Unranked</span>
          )}
          {!player.isActive && (
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">inactif</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {player.primaryRole && (
            <span>{ROLE_ICONS[player.primaryRole]} {ROLE_LABELS[player.primaryRole]}</span>
          )}
          {player.secondaryRole && (
            <span className="text-zinc-600">/ {ROLE_ICONS[player.secondaryRole]}</span>
          )}
          {!player.primaryRole && !player.secondaryRole && (
            <span className="text-zinc-600">Pas de role defini</span>
          )}
        </div>
      </button>

      {/* Skill rating */}
      <div className="text-right">
        <div className={`text-lg font-black ${tier.color}`}>
          {tier.label}
        </div>
        <div className="text-xs text-zinc-500">
          {player.skillRating.odverall} pts
        </div>
      </div>

      {/* Stats preview */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 border-l border-zinc-700 pl-3">
        <div className="flex items-center gap-1" title="Win Rate">
          <Trophy className="w-3 h-3" />
          {player.skillRating.winRate}%
        </div>
        <div className="flex items-center gap-1" title="KDA">
          <Target className="w-3 h-3" />
          {player.skillRating.avgKDA}
        </div>
        <div className="flex items-center gap-1" title="Kill Participation">
          <Users className="w-3 h-3" />
          {player.skillRating.avgKillParticipation}%
        </div>
        <div className="flex items-center gap-1" title="Games">
          <Crosshair className="w-3 h-3" />
          {player.skillRating.gamesPlayed}
        </div>
      </div>

      {/* Admin edit rank button (for players with rank) */}
      {isAdmin && player.soloTier && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditRank(); }}
          className="p-1.5 rounded-lg bg-zinc-700/50 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-colors"
          title="Modifier le rang"
        >
          <Crown className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// Team Display Card
const TeamCard: React.FC<{
  team: { players: Array<{ player: PlayerWithSkill; assignedRole?: PlayerRole }>; totalSkill: number };
  teamName: string;
  color: 'blue' | 'red';
}> = ({ team, teamName, color }) => {
  const colorClasses = color === 'blue'
    ? 'border-blue-500/30 bg-blue-500/5'
    : 'border-red-500/30 bg-red-500/5';

  const headerClasses = color === 'blue'
    ? 'text-blue-400'
    : 'text-red-400';

  return (
    <div className={`rounded-2xl border ${colorClasses} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${color === 'blue' ? 'border-blue-500/20' : 'border-red-500/20'}`}>
        <h3 className={`font-bold ${headerClasses}`}>{teamName} ({team.players.length})</h3>
      </div>
      <div className="p-2 space-y-1">
        {team.players.map(({ player }) => {
          const tier = getSkillTier(player.skillRating.odverall);
          const s = player.skillRating;

          return (
            <div
              key={player.id}
              className="p-2 rounded-lg bg-zinc-800/50"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 font-medium text-white text-sm truncate">
                  {player.displayName}
                </span>
                {player.soloTier && (
                  <span className={`text-[10px] ${RANK_COLORS[player.soloTier]}`} title={`${RANK_LABELS[player.soloTier]} ${player.soloDivision || ''}`}>
                    {player.soloTier.slice(0, 3)}{player.soloDivision ? player.soloDivision : ''}
                  </span>
                )}
                <span className={`text-xs font-bold ${tier.color}`}>
                  {player.skillRating.odverall}
                </span>
              </div>
              {s.gamesPlayed > 0 && (
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                  <span title="Win Rate">{s.winRate}%W</span>
                  <span title="KDA">{s.avgKDA}KDA</span>
                  <span title="Kill Participation">{s.avgKillParticipation}%KP</span>
                  <span title="Team Damage %">{s.avgTeamDamagePct}%DMG</span>
                  <span title="Games">{s.gamesPlayed}g</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamBalancer;
