import React, { useEffect, useState, useRef } from 'react';
import { Eye, Users, Grid3X3, Trophy, RefreshCw } from 'lucide-react';
import { getTeamsProgress } from '../../services/gridrush/gridrushService';

interface TeamProgress {
  teamId: string; teamName: string; players: string[];
  currentGridIndex: number; wordsFoundPerGrid: number[][];
  status: string; finishedAt: string | null;
}

interface Props {
  gameId: string;
  gridWordCounts: number[];
  startedAt: string | null;
}

const diffLabels = ['Facile', 'Moyenne', 'Difficile'];
const diffColors = ['text-emerald-400', 'text-amber-400', 'text-red-400'];
const diffBg = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500'];

function fmtTime(s: number) { return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; }

const AdminSpectator: React.FC<Props> = ({ gameId, gridWordCounts, startedAt }) => {
  const [teams, setTeams] = useState<TeamProgress[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProgress = async () => {
    const data = await getTeamsProgress(gameId);
    setTeams(data);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    fetchProgress();
    intervalRef.current = setInterval(fetchProgress, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [gameId]);

  const totalPossible = gridWordCounts.reduce((s, c) => s + c, 0);

  // Sort: finished first, then by grid progress
  const sorted = [...teams].sort((a, b) => {
    if (a.status === 'finished' && b.status !== 'finished') return -1;
    if (b.status === 'finished' && a.status !== 'finished') return 1;
    if (a.currentGridIndex !== b.currentGridIndex) return b.currentGridIndex - a.currentGridIndex;
    const aTotal = a.wordsFoundPerGrid.reduce((s, wf) => s + wf.length, 0);
    const bTotal = b.wordsFoundPerGrid.reduce((s, wf) => s + wf.length, 0);
    return bTotal - aTotal;
  });

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-lg transition-all"
      >
        <Eye className="w-4 h-4" />
        Spectateur
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 max-h-[70vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-violet-500/30 rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-sm text-white">Suivi des équipes</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchProgress} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Rafraîchir">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-bold">
            —
          </button>
        </div>
      </div>

      {/* Teams */}
      <div className="p-3 space-y-3">
        {sorted.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">Aucune équipe</p>
        )}

        {sorted.map((team, idx) => {
          const totalWords = team.wordsFoundPerGrid.reduce((s, wf) => s + wf.length, 0);
          const overallPct = totalPossible > 0 ? Math.round((totalWords / totalPossible) * 100) : 0;
          const isFinished = team.status === 'finished';

          return (
            <div key={team.teamId} className={`rounded-xl p-3 border ${
              isFinished
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-zinc-800/50 border-zinc-700/50'
            }`}>
              {/* Team header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`font-black text-sm ${idx === 0 && isFinished ? 'text-yellow-400' : 'text-zinc-400'}`}>#{idx + 1}</span>
                  {idx === 0 && isFinished && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                  <span className="font-bold text-sm text-white truncate max-w-[120px]">{team.teamName}</span>
                </div>
                {isFinished ? (
                  <span className="text-xs font-bold text-emerald-400 uppercase">Terminé</span>
                ) : (
                  <span className="text-xs font-mono text-zinc-500">{overallPct}%</span>
                )}
              </div>

              {/* Players */}
              <div className="flex items-center gap-1 mb-2 text-[10px] text-zinc-500">
                <Users className="w-3 h-3" />
                {team.players.join(', ') || 'Aucun joueur'}
              </div>

              {/* Grid progress */}
              <div className="space-y-1">
                {gridWordCounts.map((wordCount, gi) => {
                  const found = team.wordsFoundPerGrid[gi]?.length || 0;
                  const pct = wordCount > 0 ? Math.round((found / wordCount) * 100) : 0;
                  const isCurrent = gi === team.currentGridIndex && !isFinished;
                  return (
                    <div key={gi} className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold w-10 ${isCurrent ? diffColors[gi] : 'text-zinc-600'}`}>
                        {diffLabels[gi]}
                      </span>
                      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isCurrent ? diffBg[gi] : pct === 100 ? diffBg[gi] + ' opacity-60' : 'bg-zinc-600'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 w-7 text-right">{found}/{wordCount}</span>
                    </div>
                  );
                })}
              </div>

              {/* Current grid indicator */}
              {!isFinished && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                  <Grid3X3 className="w-3 h-3 text-zinc-500" />
                  <span className={diffColors[team.currentGridIndex]}>
                    Grille {team.currentGridIndex + 1}/3 — {diffLabels[team.currentGridIndex]}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="px-3 pb-2 text-center">
          <span className="text-[10px] text-zinc-600">
            Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR')} • auto 5s
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminSpectator;
