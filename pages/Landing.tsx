import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Skull, Trophy, Zap, AlertTriangle, History, Sparkles, Users, Gamepad2, Wifi } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useGameStore } from '../services/gameStore';
import { getChampionName, getQueueName } from '../services/riotApi';

const Landing = () => {
  const { user } = useAuthStore();
  const { trackedPlayers, playerStates, isPolling, loadTrackedPlayers, startPolling, isAnyPlayerInGame, getPlayersInGame } = useGameStore();

  // Load config and start polling on mount
  useEffect(() => {
    const init = async () => {
      await loadTrackedPlayers();
    };
    init();
  }, []);

  useEffect(() => {
    if (trackedPlayers.length > 0 && !isPolling) {
      startPolling(30000);
    }
  }, [trackedPlayers.length, isPolling]);

  // Get players currently in game
  const playersInGameStates = getPlayersInGame();
  const firstPlayerInGame = playersInGameStates[0];
  const currentGame = firstPlayerInGame?.currentGame;
  const isInGame = isAnyPlayerInGame();

  // Find player info in the current game
  const playerInGame = firstPlayerInGame && currentGame?.participants.find(p => p.puuid === firstPlayerInGame.player.puuid);
  const gameTimeMinutes = currentGame ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60) : 0;

  return (
    <div className="flex flex-col">
      {/* LIVE GAME BANNER */}
      {isInGame && currentGame && (
        <div className="bg-gradient-to-r from-green-900/50 via-green-800/30 to-green-900/50 border-b border-green-500/30 py-4 relative z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Gamepad2 className="w-8 h-8 text-green-400" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-black text-lg">
                      {playersInGameStates.length === 1
                        ? `${firstPlayerInGame.player.displayName} EST EN GAME !`
                        : `${playersInGameStates.length} JOUEURS EN GAME !`}
                    </span>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LIVE</span>
                  </div>
                  <div className="text-green-300/70 text-sm">
                    {playerInGame && getChampionName(playerInGame.championId)} • {currentGame && getQueueName(currentGame.gameQueueConfigId)} • {gameTimeMinutes} min
                  </div>
                </div>
              </div>
              <Link
                to={user ? "/dashboard" : "/login"}
                className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {user ? "PARIER MAINTENANT" : "CONNEXION POUR PARIER"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Marquee Ticker */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-primary/20 backdrop-blur-sm overflow-hidden py-2.5 relative z-20">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8 text-sm font-mono">
          <span className="text-primary">⚠️ ALERTE : YASUO LOCKED IN</span>
          <span className="text-zinc-600">•</span>
          <span className="text-white">Xx_DarkSasuke_xX a perdu 500 crédits sur un dive niveau 3</span>
          <span className="text-zinc-600">•</span>
          <span className="text-gold">🏆 Saucisse_Man a gagné 1200 crédits grâce à un AFK</span>
          <span className="text-zinc-600">•</span>
          <span className="text-primary">JOHNNY TILT RATE: 99%</span>
          <span className="text-zinc-600">•</span>
          <span className="text-white">Le support a vendu ses items</span>
          <span className="text-zinc-600">•</span>
          <span className="text-accent">FF15 DANS 3... 2... 1...</span>
          <span className="text-zinc-600">•</span>
          <span className="text-primary">⚠️ ALERTE : YASUO LOCKED IN</span>
          <span className="text-zinc-600">•</span>
          <span className="text-white">Xx_DarkSasuke_xX a perdu 500 crédits sur un dive niveau 3</span>
          <span className="text-zinc-600">•</span>
          <span className="text-gold">🏆 Saucisse_Man a gagné 1200 crédits grâce à un AFK</span>
        </div>
      </div>

      {/* Hero Section Split */}
      <div className="container mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left: Text Content */}
        <div className="space-y-8 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 text-accent-300 text-sm font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
            </span>
            Saison 15 : Le Feed Ultime
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tighter text-white">
            PARIEZ SUR<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-accent animate-pulse-fast">
              LE DESASTRE
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Le seul site de paris où le talent ne compte pas. Misez sur la <span className="text-primary font-bold">toxicité</span>, le <span className="text-accent font-bold">feed intentionnel</span> et les <span className="text-gold font-bold">flashs dans le mur</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link
              to={user ? "/dashboard" : "/login"}
              className="w-full sm:w-auto group relative px-8 py-4 bg-gradient-to-r from-primary to-primary-glow rounded-xl font-black text-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden shadow-xl shadow-primary/30 text-white"
            >
              <span className="relative z-10 flex items-center gap-2">
                {user ? "COMMENCER LE PARI" : "CRÉER UN COMPTE"} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link to="/history" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-2">
              <History className="w-5 h-5" />
              Voir le carnage
            </Link>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-zinc-500 font-mono pt-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isPolling ? 'bg-green-500' : 'bg-zinc-500'}`}></div>
              {isPolling ? `Surveillance: ${trackedPlayers.length} joueur(s)` : 'Surveillance Off'}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isInGame ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isInGame ? `${playersInGameStates.length} EN GAME` : 'Hors game'}
            </div>
          </div>
        </div>

        {/* Right: Visual Graphic */}
        <div className="relative lg:h-[600px] flex items-center justify-center z-10">
            {/* Background blobs behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-accent/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-primary/25 rounded-full blur-[80px] translate-x-10 -translate-y-10"></div>

            {/* The Card */}
            <div className="relative w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-float transform rotate-2 hover:rotate-0 transition-transform duration-500">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/30">
                            J
                        </div>
                        <div>
                            <div className="font-bold text-white text-lg">Johnny</div>
                            <div className="text-xs text-primary font-mono uppercase tracking-wider">Mid / Feeder Pro</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-zinc-500 uppercase tracking-wide">KDA Actuel</div>
                        <div className="font-mono font-bold text-2xl text-red-500">0 / 12 / 1</div>
                    </div>
                </div>

                {/* Live Action */}
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-amber-900/30 to-red-900/20 rounded-xl p-4 border border-amber-500/20 flex items-center gap-4">
                        <AlertTriangle className="text-amber-500 w-8 h-8 shrink-0 animate-pulse" />
                        <div>
                            <div className="text-xs text-amber-500 font-bold uppercase mb-1 tracking-wider">Dernière action</div>
                            <div className="text-sm text-zinc-300">A flashé dans le mur pour KS le support.</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Probabilité FF15</span>
                            <span className="text-primary font-bold">98.2%</span>
                        </div>
                        <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary via-purple-500 to-accent w-[98%] animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-gold to-amber-400 text-black font-black text-sm px-5 py-2.5 rounded-full transform rotate-12 shadow-lg shadow-gold/30 border-2 border-white">
                    COTE x12.0
                </div>

                {/* Floating Skull */}
                <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-primary shadow-lg shadow-primary/20">
                    <Skull className="w-6 h-6 text-primary" />
                </div>
            </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 py-12 bg-gradient-to-r from-zinc-900/50 via-primary/5 to-zinc-900/50 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black text-gold mb-2">10K</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Crédits de départ</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black text-primary mb-2">99%</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Taux de Throw</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black text-accent mb-2">∞</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Potentiel de Rage</div>
            </div>
            <div className="p-6">
              <div className="text-4xl md:text-5xl font-black text-green-400 mb-2">1K</div>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">Bonus Quotidien</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-24 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">COMMENT PERDRE <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">AVEC STYLE</span></h2>
            <p className="text-zinc-400 text-lg">Le processus est simple, rapide et douloureux.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-primary/50 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-primary/20">
                <Flame className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">1. Le Lock-in</h3>
              <p className="text-zinc-400 leading-relaxed">
                Johnny sélectionne Yasuo. Il tape "trust me" dans le chat. Le jungler commence déjà à pleurer.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-accent/50 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-accent/20">
                <Zap className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">2. Le Pari</h3>
              <p className="text-zinc-400 leading-relaxed">
                Choisissez votre prophétie : "Ragequit avant 10min" ou "0 damage dealt". Misez vos crédits.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-gold/50 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gold/20">
                <Trophy className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">3. La Richesse</h3>
              <p className="text-zinc-400 leading-relaxed">
                Regardez Johnny échouer spectaculairement. Encaissez vos gains pendant qu'il désinstalle le jeu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="relative z-10 py-20 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-gold" />
                <span className="text-gold font-bold uppercase tracking-wider">Bonus de bienvenue</span>
                <Sparkles className="w-6 h-6 text-gold" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                10 000 CRÉDITS OFFERTS
              </h2>
              <p className="text-xl text-zinc-400 mb-8">
                Inscris-toi maintenant et reçois ton capital de départ pour commencer à parier sur le chaos.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-gold to-amber-500 text-black font-black text-lg rounded-xl hover:scale-105 transition-transform shadow-xl shadow-gold/30"
              >
                <Users className="w-6 h-6" />
                Créer mon compte gratuit
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 text-center border-t border-white/5 bg-black text-zinc-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Skull className="w-5 h-5" />
            <span className="font-bold">JohnnyFF15 Inc.</span>
        </div>
        <p className="max-w-md mx-auto px-4">
            Site non affilié à Riot Games. Si vous perdez de l'argent réel ici, consultez un médecin, car c'est une monnaie virtuelle qui ne sert à rien.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
