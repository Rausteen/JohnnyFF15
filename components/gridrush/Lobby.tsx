import React, { useState } from 'react';
import { Users, ArrowRight, Copy, Check, Crown, Shuffle } from 'lucide-react';
import type { GameSession } from '../../services/gridrush/gridrushTypes';

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
  isHost,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Flatten all players from all teams
  const allPlayers = game.teams.flatMap(t => t.players);
  const canStart = allPlayers.length >= 2;

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
          Partage ce code pour que les joueurs rejoignent
        </p>
      </div>

      {/* Players list */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Joueurs ({allPlayers.length})
        </h3>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <div className="space-y-1">
            {allPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50"
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

            {allPlayers.length < 2 && (
              <div className="px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-600 text-xs text-center">
                En attente de joueurs...
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/20">
          <Shuffle className="w-4 h-4 text-violet-400" />
          <p className="text-xs text-violet-300">
            Les équipes de 2 seront formées aléatoirement au lancement de la partie
          </p>
        </div>
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            canStart
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <ArrowRight className="w-5 h-5" />
          {canStart ? 'LANCER LA PARTIE !' : `En attente de joueurs (${allPlayers.length}/2 min)...`}
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
