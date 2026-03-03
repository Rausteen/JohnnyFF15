import React, { useEffect, useState } from 'react';
import { Trophy, Clock, X, Medal, Users, Grid3X3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTeamsProgress } from '../../services/gridrush/gridrushService';

interface FinishedTeam { teamId: string; teamName: string; timeMs: number; }

interface TeamProgress {
  teamId: string; teamName: string; players: string[];
  currentGridIndex: number; wordsFoundPerGrid: number[][];
  status: string; finishedAt: string | null;
}

interface Props {
  isWin: boolean;
  myTeamId: string;
  timeElapsed: number;
  finishedTeams: FinishedTeam[];
  gameId: string;
  gridWordCounts: number[];
}

function fmtTime(s: number) { return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; }

const diffLabels = ['Facile', 'Moyenne', 'Difficile'];
const diffColors = ['text-emerald-400', 'text-amber-400', 'text-red-400'];
const diffBg = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500'];

const GameOverScreen: React.FC<Props> = ({ isWin, myTeamId, timeElapsed, finishedTeams, gameId, gridWordCounts }) => {
  const navigate = useNavigate();
  const [teamsProgress, setTeamsProgress] = useState<TeamProgress[]>([]);

  useEffect(() => {
    getTeamsProgress(gameId).then(setTeamsProgress);
  }, [gameId]);

  const finishedMap = new Map(finishedTeams.map(t => [t.teamId, t]));

  // Build combined ranking: finished teams first (sorted by time), then unfinished (sorted by progress)
  const ranked = [...teamsProgress].sort((a, b) => {
    const aFinished = finishedMap.get(a.teamId);
    const bFinished = finishedMap.get(b.teamId);
    if (aFinished && bFinished) return aFinished.timeMs - bFinished.timeMs;
    if (aFinished) return -1;
    if (bFinished) return 1;
    // Both unfinished: compare by grid index then total words
    if (a.currentGridIndex !== b.currentGridIndex) return b.currentGridIndex - a.currentGridIndex;
    const aTotalWords = a.wordsFoundPerGrid.reduce((s, wf) => s + wf.length, 0);
    const bTotalWords = b.wordsFoundPerGrid.reduce((s, wf) => s + wf.length, 0);
    return bTotalWords - aTotalWords;
  });

  const myWin = finishedTeams.length > 0 && ranked.length > 0 && finishedMap.has(ranked[0].teamId) && ranked[0].teamId === myTeamId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-lg w-full text-center my-auto">
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

        {/* Full ranking */}
        {ranked.length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 text-center">Classement</h3>
            <div className="space-y-3">
              {ranked.map((team, i) => {
                const finished = finishedMap.get(team.teamId);
                const totalWords = team.wordsFoundPerGrid.reduce((s, wf) => s + wf.length, 0);
                const totalPossible = gridWordCounts.reduce((s, c) => s + c, 0);
                const isMe = team.teamId === myTeamId;
                const isFirst = i === 0 && !!finished;

                return (
                  <div key={team.teamId} className={`rounded-xl p-4 ${
                    isMe ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-zinc-800/50 border border-zinc-800'
                  }`}>
                    {/* Team header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-lg ${isFirst ? 'text-yellow-400' : 'text-zinc-500'}`}>#{i + 1}</span>
                        {isFirst && <Trophy className="w-4 h-4 text-yellow-400" />}
                        <span className="font-bold text-white">{team.teamName}</span>
                        {isMe && <span className="text-xs text-violet-400">(vous)</span>}
                      </div>
                      {finished ? (
                        <span className="font-mono text-sm text-emerald-400 font-bold">{fmtTime(Math.floor(finished.timeMs / 1000))}</span>
                      ) : (
                        <span className="text-xs text-zinc-500 uppercase">Non terminé</span>
                      )}
                    </div>

                    {/* Players */}
                    <div className="flex items-center gap-1 mb-3 text-xs text-zinc-500">
                      <Users className="w-3 h-3" />
                      {team.players.join(', ')}
                    </div>

                    {/* Grid progress bars */}
                    <div className="space-y-1.5">
                      {gridWordCounts.map((wordCount, gi) => {
                        const found = team.wordsFoundPerGrid[gi]?.length || 0;
                        const pct = wordCount > 0 ? Math.round((found / wordCount) * 100) : 0;
                        return (
                          <div key={gi} className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold w-14 ${diffColors[gi]}`}>{diffLabels[gi]}</span>
                            <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                              <div className={`h-full ${diffBg[gi]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{found}/{wordCount}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="mt-2 pt-2 border-t border-zinc-700/50 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Total mots trouvés</span>
                      <span className="font-mono font-bold text-white">{totalWords}/{totalPossible}</span>
                    </div>
                  </div>
                );
              })}
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
