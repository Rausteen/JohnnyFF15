import React from 'react';
import { useStore } from '../services/store';
import { MatchStatus } from '../types';
import { Power, Dices, RotateCcw, RefreshCw } from 'lucide-react';

const Admin = () => {
  const { gameState, toggleMatchStatus, simulateGameEnd, addFunds, syncGames, isSyncing } = useStore();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-red-950/10 border border-red-900/30 p-8 rounded-3xl">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-900/20 rounded-xl">
                <Power className="w-8 h-8 text-red-500" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-white">Salle de Contrôle du Destin</h1>
                <p className="text-red-400 text-sm">Attention : Grands pouvoirs, grandes responsabilités, tout ça.</p>
            </div>
        </div>

        <div className="space-y-6">
          {/* Game Status Toggle */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white mb-1">État de Johnny</h3>
              <p className="text-sm text-slate-500">
                {gameState.status === MatchStatus.LIVE ? "En train de feed" : "Dort devant son PC"}
              </p>
            </div>
            <button
              onClick={() => toggleMatchStatus(gameState.status === MatchStatus.LIVE ? MatchStatus.OFFLINE : MatchStatus.LIVE)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                gameState.status === MatchStatus.LIVE ? 'bg-red-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition transition-transform duration-200 ease-in-out ${
                  gameState.status === MatchStatus.LIVE ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Simulation */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
             <div className="mb-4">
                <h3 className="font-bold text-white mb-1">Résolution du match</h3>
                <p className="text-sm text-slate-500">Met fin à la game actuelle et calcule les paris.</p>
             </div>
             <button
                onClick={simulateGameEnd}
                disabled={gameState.status !== MatchStatus.LIVE}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
             >
                <Dices className="w-5 h-5" />
                Simuler la fin (Random)
             </button>
          </div>

          {/* Cheats */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
             <div className="mb-4">
                <h3 className="font-bold text-white mb-1">Code de triche</h3>
                <p className="text-sm text-slate-500">Besoin de crédits pour tester ?</p>
             </div>
             <button
                onClick={() => addFunds(1000)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
             >
                <RotateCcw className="w-4 h-4" />
                S'injecter 1000 crédits
             </button>
          </div>

          {/* Sync Games */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
             <div className="mb-4">
                <h3 className="font-bold text-white mb-1">Synchronisation des games</h3>
                <p className="text-sm text-slate-500">Récupère les 20 dernières games de chaque joueur.</p>
             </div>
             <button
                onClick={syncGames}
                disabled={isSyncing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
             >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synchronisation...' : 'Sync toutes les games'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;