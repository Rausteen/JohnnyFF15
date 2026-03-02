import React from 'react';
import { Trophy, Clock, X, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FinishedTeam { teamId: string; teamName: string; timeMs: number; }
interface Props { isWin: boolean; myTeamId: string; timeElapsed: number; finishedTeams: FinishedTeam[]; }

function fmtTime(s: number) { return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; }

const GameOverScreen: React.FC<Props> = ({ isWin, myTeamId, timeElapsed, finishedTeams }) => {
  const navigate = useNavigate();
  const sorted = [...finishedTeams].sort((a, b) => a.timeMs - b.timeMs);
  const myWin = sorted.length > 0 && sorted[0].teamId === myTeamId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
          myWin ? 'bg-yellow-500/20 border-2 border-yellow-500/50' : isWin ? 'bg-emerald-500/20 border-2 border-emerald-500/50' : 'bg-red-500/20 border-2 border-red-500/50'
        }`}>
          {myWin ? <Trophy className="w-10 h-10 text-yellow-400" /> : isWin ? <Medal className="w-10 h-10 text-emerald-400" /> : <X className="w-10 h-10 text-red-400" />}
        </div>
        <h2 className={`text-2xl font-black mb-2 ${myWin ? 'text-yellow-400' : isWin ? 'text-emerald-400' : 'text-red-400'}`}>
          {myWin ? 'VICTOIRE !' : isWin ? 'TERMINÉ !' : 'TEMPS ÉCOULÉ'}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-6 text-zinc-300">
          <Clock className="w-4 h-4" /><span className="font-mono font-bold">{fmtTime(timeElapsed)}</span>
        </div>
        {sorted.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Classement</h3>
            <div className="space-y-2">
              {sorted.map((t, i) => (
                <div key={t.teamId} className={`flex items-center justify-between px-4 py-2 rounded-lg ${t.teamId === myTeamId ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-zinc-800/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${i === 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>#{i + 1}</span>
                    <span className="text-sm text-white">{t.teamName}{t.teamId === myTeamId && <span className="text-violet-400 ml-1">(vous)</span>}</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">{fmtTime(Math.floor(t.timeMs / 1000))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => navigate('/gridrush')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:brightness-110 text-white font-bold transition-all">
          Retour au lobby
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
