import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Copy, X, Trophy, Skull, Coins, Target, Loader2, Check, Clock } from 'lucide-react';
import { Bet, BetStatus } from '../types';

export interface GameShareData {
  matchId: string;
  championName: string;
  bets: Bet[];
  totalWagered: number;
  netResult: number;
  status: 'pending' | 'won' | 'lost' | 'mixed';
}

interface ShareableBetCardProps {
  gameData: GameShareData;
  onClose: () => void;
}

const ShareableBetCard: React.FC<ShareableBetCardProps> = ({ gameData, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWon = gameData.status === 'won';
  const isLost = gameData.status === 'lost';
  const isMixed = gameData.status === 'mixed';
  const isPending = gameData.status === 'pending';

  const getStatusColor = () => {
    if (isWon) return 'from-green-900 via-green-950 to-black';
    if (isLost) return 'from-red-900 via-red-950 to-black';
    if (isMixed) return 'from-purple-900 via-purple-950 to-black';
    return 'from-amber-900 via-amber-950 to-black';
  };

  const getStatusText = () => {
    if (isWon) return 'GAGNÉ!';
    if (isLost) return 'PERDU';
    if (isMixed) return 'MIXTE';
    return 'EN COURS';
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;

    setCopying(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#18181b',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCopying(false);
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          // Fallback: download if clipboard not supported
          const link = document.createElement('a');
          link.download = `johnnyff15-${gameData.status}-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        setCopying(false);
      });
    } catch (err) {
      console.error('Error generating image:', err);
      setCopying(false);
    }
  };

  // Get unique bets (for combos, only show unique props)
  const displayBets = gameData.bets.filter(bet => !bet.comboId || bet.comboIndex === 1 || bet.amount > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative max-w-md w-full" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* The shareable card */}
        <div
          ref={cardRef}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getStatusColor()}`}
          style={{ padding: '2px' }}
        >
          <div className="rounded-3xl p-5 bg-zinc-900/95">
            {/* Header with result */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  isWon ? 'bg-green-500/20' :
                  isLost ? 'bg-red-500/20' :
                  isMixed ? 'bg-purple-500/20' :
                  'bg-amber-500/20'
                }`}>
                  {isWon && <Trophy className="w-7 h-7 text-green-400" />}
                  {isLost && <Skull className="w-7 h-7 text-red-400" />}
                  {isMixed && <Target className="w-7 h-7 text-purple-400" />}
                  {isPending && <Clock className="w-7 h-7 text-amber-400" />}
                </div>
                <div>
                  <div className={`text-xl font-black ${
                    isWon ? 'text-green-400' :
                    isLost ? 'text-red-400' :
                    isMixed ? 'text-purple-400' :
                    'text-amber-400'
                  }`}>
                    {getStatusText()}
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {gameData.bets.length} pari{gameData.bets.length > 1 ? 's' : ''} • {gameData.championName}
                  </div>
                </div>
              </div>

              {/* JohnnyFF15 Logo */}
              <div className="text-right">
                <div className="text-gold font-black text-lg">JohnnyFF15</div>
                <div className="text-zinc-600 text-xs">Le Casino du Feed</div>
              </div>
            </div>

            {/* Bets list */}
            <div className="space-y-2 mb-4">
              {displayBets.slice(0, 5).map((bet, index) => (
                <div
                  key={bet.id}
                  className={`p-3 rounded-xl border ${
                    bet.status === BetStatus.WON
                      ? 'bg-green-500/10 border-green-500/20'
                      : bet.status === BetStatus.LOST
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-zinc-800/50 border-zinc-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">
                        {bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        <span>{bet.amount} JC</span>
                        <span>•</span>
                        <span className="text-gold">x{bet.odds.toFixed(1)}</span>
                        {bet.resolvedStat && (
                          <>
                            <span>•</span>
                            <span className={bet.status === BetStatus.WON ? 'text-green-400' : 'text-red-400'}>
                              {bet.resolvedStat}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${
                      bet.status === BetStatus.WON ? 'text-green-400' :
                      bet.status === BetStatus.LOST ? 'text-red-400' :
                      'text-zinc-400'
                    }`}>
                      {bet.status === BetStatus.WON ? `+${bet.potentialPayout}` :
                       bet.status === BetStatus.LOST ? `-${bet.amount}` :
                       '...'}
                    </div>
                  </div>
                </div>
              ))}
              {displayBets.length > 5 && (
                <div className="text-center text-zinc-500 text-xs">
                  +{displayBets.length - 5} autres paris
                </div>
              )}
            </div>

            {/* Total result */}
            <div className={`p-4 rounded-xl ${
              isWon ? 'bg-green-500/20' :
              isLost ? 'bg-red-500/20' :
              isMixed ? 'bg-purple-500/20' :
              'bg-zinc-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-zinc-400 text-xs">Résultat total</div>
                  <div className="text-zinc-500 text-xs">Misé: {gameData.totalWagered} JC</div>
                </div>
                <div className={`text-2xl font-black ${
                  gameData.netResult > 0 ? 'text-green-400' :
                  gameData.netResult < 0 ? 'text-red-400' :
                  'text-zinc-400'
                }`}>
                  {gameData.netResult > 0 ? '+' : ''}{gameData.netResult} JC
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-zinc-600 text-xs mt-4">
              johnnyff15.fr • Parie sur le feed de Johnny
            </div>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          disabled={copying}
          className={`w-full mt-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : isWon
              ? 'bg-green-500 hover:bg-green-400 text-black'
              : isLost
              ? 'bg-red-500 hover:bg-red-400 text-white'
              : 'bg-zinc-700 hover:bg-zinc-600 text-white'
          } disabled:opacity-50`}
        >
          {copying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : copied ? (
            <>
              <Check className="w-5 h-5" />
              Copié !
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copier l'image
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ShareableBetCard;
