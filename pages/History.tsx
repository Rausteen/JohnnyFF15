import React from 'react';
import { useStore } from '../services/store';
import { Calendar, Skull, Clock, Trophy } from 'lucide-react';

const History = () => {
  const { history } = useStore();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Musée du Throw</h1>
        <p className="text-slate-400">Les grandes dates de l'histoire (tragique) de Johnny.</p>
      </div>

      <div className="relative border-l border-slate-800 ml-4 md:ml-8 space-y-12">
        {history.map((match) => (
          <div key={match.id} className="relative pl-8 md:pl-12">
            {/* Timeline dot */}
            <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-slate-950 
              ${match.stats.result === 'VICTORY' ? 'bg-green-500' : match.stats.result === 'DEFEAT' ? 'bg-red-500' : 'bg-slate-500'}
            `}></div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      {match.date}
                    </div>
                    <h3 className="text-xl font-bold text-white">{match.description}</h3>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase border
                    ${match.stats.result === 'VICTORY' ? 'bg-green-950/30 text-green-400 border-green-900/50' : 
                      match.stats.result === 'DEFEAT' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 
                      'bg-slate-800 text-slate-400 border-slate-700'}
                  `}>
                    {match.stats.result}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/50 rounded-lg mb-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Champion</div>
                    <div className="font-medium text-slate-200">{match.stats.champion}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">KDA</div>
                    <div className="font-mono font-bold text-white">{match.stats.kda}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">CS</div>
                    <div className="font-medium text-slate-200">{match.stats.cs}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Durée</div>
                    <div className="font-medium text-slate-200">{match.stats.duration}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-lg text-sm text-slate-400 italic">
                  <Skull className="w-5 h-5 text-slate-600 flex-shrink-0" />
                  "{match.stats.funFact}"
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;