import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Share2, X, Trophy, Skull, Coins, Target, Loader2 } from 'lucide-react';
import { Bet, BetStatus } from '../types';

interface ShareableBetCardProps {
  bet: Bet;
  onClose: () => void;
}

const ShareableBetCard: React.FC<ShareableBetCardProps> = ({ bet, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const isWon = bet.status === BetStatus.WON;
  const isCombo = !!bet.comboId;
  const profit = isWon ? bet.potentialPayout - bet.amount : -bet.amount;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `johnnyff15-${isWon ? 'win' : 'lose'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], 'johnnyff15-bet.png', { type: 'image/png' });
            await navigator.share({
              title: `JohnnyFF15 - ${isWon ? 'GAGNÉ' : 'PERDU'}!`,
              text: `J'ai ${isWon ? 'gagné' : 'perdu'} ${Math.abs(profit)} JC sur JohnnyFF15!`,
              files: [file],
            });
          } catch (e) {
            // Fallback to download
            handleDownload();
          }
        } else {
          // Fallback to download
          handleDownload();
        }
        setDownloading(false);
      });
    } catch (err) {
      console.error('Error sharing:', err);
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative max-w-md w-full">
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
          className={`relative overflow-hidden rounded-3xl ${
            isWon
              ? 'bg-gradient-to-br from-green-900 via-green-950 to-black'
              : 'bg-gradient-to-br from-red-900 via-red-950 to-black'
          }`}
          style={{ padding: '2px' }}
        >
          <div className={`rounded-3xl p-6 ${
            isWon
              ? 'bg-gradient-to-br from-green-900/90 via-zinc-900 to-black'
              : 'bg-gradient-to-br from-red-900/90 via-zinc-900 to-black'
          }`}>
            {/* Header with result */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isWon ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isWon ? (
                    <Trophy className="w-8 h-8 text-green-400" />
                  ) : (
                    <Skull className="w-8 h-8 text-red-400" />
                  )}
                </div>
                <div>
                  <div className={`text-2xl font-black ${isWon ? 'text-green-400' : 'text-red-400'}`}>
                    {isWon ? 'GAGNÉ!' : 'PERDU'}
                  </div>
                  <div className="text-zinc-500 text-sm">
                    {isCombo ? 'Pari Combiné' : 'Pari Simple'}
                  </div>
                </div>
              </div>

              {/* JohnnyFF15 Logo */}
              <div className="text-right">
                <div className="text-gold font-black text-xl">JohnnyFF15</div>
                <div className="text-zinc-500 text-xs">Le Casino du Feed</div>
              </div>
            </div>

            {/* Bet details */}
            <div className="bg-black/40 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-zinc-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-white font-bold text-lg">{bet.propTitle}</div>
                  {bet.resolvedStat && (
                    <div className={`text-sm mt-1 ${isWon ? 'text-green-400' : 'text-red-400'}`}>
                      {bet.resolvedStat}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-black/40 rounded-xl p-3 text-center">
                <div className="text-zinc-500 text-xs mb-1">Mise</div>
                <div className="text-white font-bold">{bet.amount} JC</div>
              </div>
              <div className="bg-black/40 rounded-xl p-3 text-center">
                <div className="text-zinc-500 text-xs mb-1">Cote</div>
                <div className="text-gold font-bold">x{bet.odds.toFixed(2)}</div>
              </div>
              <div className={`rounded-xl p-3 text-center ${
                isWon ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <div className="text-zinc-500 text-xs mb-1">{isWon ? 'Gains' : 'Pertes'}</div>
                <div className={`font-bold ${isWon ? 'text-green-400' : 'text-red-400'}`}>
                  {isWon ? '+' : ''}{profit} JC
                </div>
              </div>
            </div>

            {/* Champion if available */}
            {bet.championName && (
              <div className="flex items-center justify-center gap-2 mb-4 text-zinc-400">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${bet.championName}.png`}
                  alt={bet.championName}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span>Johnny en {bet.championName}</span>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-zinc-600 text-xs">
              johnnyff15.fr • Parie sur le feed de Johnny
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Download className="w-5 h-5" />
                Télécharger
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            disabled={downloading}
            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
              isWon
                ? 'bg-green-500 hover:bg-green-400 text-black'
                : 'bg-red-500 hover:bg-red-400 text-white'
            }`}
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                Partager
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareableBetCard;
