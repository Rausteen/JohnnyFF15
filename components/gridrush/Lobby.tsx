import React, { useState } from 'react';
import { Users, Plus, ArrowRight, Copy, Check, Crown, Gamepad2 } from 'lucide-react';
import type { GameSession, Team } from '../../services/gridrush/gridrushTypes';

interface LobbyProps {
  game: GameSession;
  myPlayerId: string;
  myTeamId: string;
  isHost: boolean;
  onStartGame: () => void;
  onJoinTeam: (teamId: string) => void;
  onCreateTeam: (teamName: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({
  game,
  myPlayerId,
  myTeamId,
  isHost,
  onStartGame,
  onJoinTeam,
  onCreateTeam,
}) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    onCreateTeam(newTeamName.trim());
    setNewTeamName('');
  };

  const allTeamsReady = game.teams.length >= 2 && game.teams.every(t => t.players.length === 2);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Game code */}
      <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-6 mb-6 text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Code de la partie</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-black tracking-[0.3em] text-white font-mono">
            {game.gameCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            title="Copier le code"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Copy className="w-5 h-5 text-zinc-400" />
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Partage ce code pour que les autres équipes rejoignent
        </p>
      </div>

      {/* Teams */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Équipes ({game.teams.length})
        </h3>

        {game.teams.map((team) => (
          <div
            key={team.id}
            className={`bg-zinc-900/60 border rounded-xl p-4 transition-all ${
              team.id === myTeamId
                ? 'border-violet-500/50 bg-violet-500/5'
                : 'border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-white">{team.name}</span>
                {team.id === myTeamId && (
                  <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                    TON ÉQUIPE
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500">{team.players.length}/2</span>
            </div>

            <div className="space-y-1">
              {team.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50"
                >
                  {player.isHost && <Crown className="w-3 h-3 text-yellow-400" />}
                  <span className="text-sm text-zinc-300">
                    {player.name}
                    {player.id === myPlayerId && (
                      <span className="text-zinc-600 ml-1">(toi)</span>
                    )}
                  </span>
                </div>
              ))}

              {team.players.length < 2 && team.id !== myTeamId && (
                <button
                  onClick={() => onJoinTeam(team.id)}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-violet-500/50 hover:text-violet-400 transition-colors text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Rejoindre
                </button>
              )}

              {team.players.length < 2 && team.id === myTeamId && (
                <div className="px-3 py-1.5 rounded-lg border border-dashed border-zinc-700 text-zinc-600 text-xs text-center">
                  En attente d'un coéquipier...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create new team */}
      <div className="bg-zinc-900/40 border border-dashed border-zinc-700 rounded-xl p-4 mb-6">
        <p className="text-xs text-zinc-500 mb-2">Créer une nouvelle équipe</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Nom de l'équipe"
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 outline-none focus:border-violet-500/50"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          />
          <button
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim()}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <button
          onClick={onStartGame}
          disabled={!allTeamsReady}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            allTeamsReady
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
          {allTeamsReady ? 'LANCER LA PARTIE !' : 'En attente des équipes...'}
        </button>
      )}

      {!isHost && (
        <div className="text-center py-4 text-zinc-500 text-sm">
          En attente que l'hôte lance la partie...
        </div>
      )}
    </div>
  );
};

export default Lobby;
