import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Copy, X, Trophy, Skull, Target, Loader2, Check, Clock, TrendingUp, TrendingDown } from 'lucide-react';
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

  const getAccentColor = () => {
    if (isWon) return '#22c55e';
    if (isLost) return '#ef4444';
    if (isMixed) return '#a855f7';
    return '#f59e0b';
  };

  const getStatusText = () => {
    if (isWon) return 'VICTOIRE';
    if (isLost) return 'DÉFAITE';
    if (isMixed) return 'MIXTE';
    return 'EN COURS';
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;

    setCopying(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 3,
        useCORS: true,
        logging: false,
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
          const link = document.createElement('a');
          link.download = `johnnyff15-${gameData.championName}-${Date.now()}.png`;
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

  const displayBets = gameData.bets;
  const accentColor = getAccentColor();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
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
          style={{
            background: '#0a0a0a',
            padding: '24px',
            borderRadius: '20px',
            border: `2px solid ${accentColor}40`,
            boxShadow: `0 0 60px ${accentColor}20`,
          }}
        >
          {/* Header - Logo & Champion */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#fbbf24',
              letterSpacing: '-0.5px',
              textShadow: '0 0 20px #f59e0b40',
            }}>
              JohnnyFF15
            </div>
            <div style={{
              fontSize: '13px',
              color: '#71717a',
              marginTop: '2px',
            }}>
              Johnny sur {gameData.championName}
            </div>
          </div>

          {/* Big Result */}
          <div style={{
            background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`,
            border: `1px solid ${accentColor}30`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}>
              {isWon && <Trophy style={{ width: '32px', height: '32px', color: accentColor }} />}
              {isLost && <Skull style={{ width: '32px', height: '32px', color: accentColor }} />}
              {isMixed && <Target style={{ width: '32px', height: '32px', color: accentColor }} />}
              {isPending && <Clock style={{ width: '32px', height: '32px', color: accentColor }} />}
              <span style={{
                fontSize: '24px',
                fontWeight: 900,
                color: accentColor,
                letterSpacing: '1px',
              }}>
                {getStatusText()}
              </span>
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 900,
              color: gameData.netResult >= 0 ? '#22c55e' : '#ef4444',
              fontFamily: 'monospace',
            }}>
              {gameData.netResult >= 0 ? '+' : ''}{gameData.netResult} JC
            </div>
            <div style={{
              fontSize: '12px',
              color: '#71717a',
              marginTop: '4px',
            }}>
              Misé: {gameData.totalWagered} JC
            </div>
          </div>

          {/* Bets List */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '11px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
              fontWeight: 600,
            }}>
              {displayBets.length} pari{displayBets.length > 1 ? 's' : ''}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {displayBets.slice(0, 6).map((bet) => {
                const betWon = bet.status === BetStatus.WON;
                const betLost = bet.status === BetStatus.LOST;
                const betColor = betWon ? '#22c55e' : betLost ? '#ef4444' : '#71717a';

                return (
                  <div
                    key={bet.id}
                    style={{
                      background: betWon ? '#22c55e10' : betLost ? '#ef444410' : '#27272a',
                      border: `1px solid ${betWon ? '#22c55e20' : betLost ? '#ef444420' : '#3f3f46'}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ffffff',
                          lineHeight: '1.3',
                          marginBottom: '4px',
                        }}>
                          {bet.propTitle.replace(/^\[COMBO \d+\/\d+\] /, '')}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '11px',
                          color: '#71717a',
                        }}>
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>x{bet.odds.toFixed(1)}</span>
                          {bet.resolvedStat && (
                            <>
                              <span>•</span>
                              <span style={{ color: betColor }}>{bet.resolvedStat}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: betColor,
                        whiteSpace: 'nowrap',
                      }}>
                        {betWon ? `+${bet.potentialPayout}` : betLost ? `-${bet.amount}` : '...'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {displayBets.length > 6 && (
              <div style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#71717a',
                marginTop: '8px',
              }}>
                +{displayBets.length - 6} autres paris
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#52525b',
            paddingTop: '12px',
            borderTop: '1px solid #27272a',
          }}>
            johnnyff15.fr • Le Casino du Feed
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          disabled={copying}
          className={`w-full mt-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-white hover:bg-zinc-200 text-black'
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
