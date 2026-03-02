import React from 'react';
import { Check, Play } from 'lucide-react';

const labels = ['FACILE', 'MOYEN', 'DIFFICILE'];
const colors = [
  { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500' },
  { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
  { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
];

interface Props { currentGridIndex: number; totalGrids: number; wordsFoundPerGrid: number[][]; }

const GridProgress: React.FC<Props> = ({ currentGridIndex, totalGrids, wordsFoundPerGrid }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: totalGrids }).map((_, i) => {
      const done = i < currentGridIndex;
      const curr = i === currentGridIndex;
      const c = colors[i];
      const wf = wordsFoundPerGrid[i]?.length || 0;
      return (
        <React.Fragment key={i}>
          {i > 0 && <div className={`w-6 h-0.5 ${done ? c.bg : 'bg-zinc-700'}`} />}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            done ? `${c.bg}/20 ${c.text} border ${c.border}/40`
              : curr ? `bg-zinc-800 text-white border ${c.border}/60 ring-1 ring-offset-1 ring-offset-zinc-950`
              : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
          }`}>
            {done ? <Check className="w-3.5 h-3.5" /> : curr ? <Play className="w-3 h-3 fill-current" /> : null}
            <span>{labels[i]}</span>
            {curr && <span className="text-zinc-400 ml-1">{wf}/10</span>}
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

export default GridProgress;
