import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Skull, Trophy, Zap, Play, AlertTriangle, History } from 'lucide-react';

const Landing = () => {
  return (
    <div className="flex flex-col">
      {/* Marquee Ticker */}
      <div className="bg-primary/10 border-y border-primary/20 backdrop-blur-sm overflow-hidden py-2 relative z-20">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8 text-sm font-mono text-primary-300">
          <span>⚠️ ALERTE : YASUO LOCKED IN</span>
          <span>•</span>
          <span className="text-white">Xx_DarkSasuke_xX a perdu 500 crédits sur un dive niveau 3</span>
          <span>•</span>
          <span className="text-gold">Saucisse_Man a gagné 1200 crédits grâce à un AFK</span>
          <span>•</span>
          <span>JOHNNY TILT RATE: 99%</span>
          <span>•</span>
          <span className="text-white">Le support a vendu ses items</span>
          <span>•</span>
          <span>FF15 DANS 3... 2... 1...</span>
          <span>•</span>
           <span>⚠️ ALERTE : YASUO LOCKED IN</span>
          <span>•</span>
          <span className="text-white">Xx_DarkSasuke_xX a perdu 500 crédits sur un dive niveau 3</span>
          <span>•</span>
          <span className="text-gold">Saucisse_Man a gagné 1200 crédits grâce à un AFK</span>
        </div>
      </div>

      {/* Hero Section Split */}
      <div className="container mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left: Text Content */}
        <div className="space-y-8 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-300 text-sm font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
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
            Le seul site de paris où le talent ne compte pas. Misez sur la toxicité, le feed intentionnel et les flashs dans le mur.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto group relative px-8 py-4 bg-white text-black rounded-xl font-black text-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <span className="relative z-10 group-hover:text-white flex items-center gap-2">
                COMMENCER LE PARI <ArrowRight className="w-5 h-5" />
              </span>
            </Link>
            
            <Link to="/history" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-2">
              <History className="w-5 h-5" />
              Voir le carnage
            </Link>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-zinc-500 font-mono pt-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              Server Online
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              Johnny Tilted
            </div>
          </div>
        </div>

        {/* Right: Visual Graphic */}
        <div className="relative lg:h-[600px] flex items-center justify-center z-10">
            {/* Background blobs behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/30 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-primary/30 rounded-full blur-[60px] translate-x-10 -translate-y-10"></div>

            {/* The Card */}
            <div className="relative w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-float transform rotate-2 hover:rotate-0 transition-transform duration-500">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
                            J
                        </div>
                        <div>
                            <div className="font-bold text-white">Johnny</div>
                            <div className="text-xs text-primary font-mono uppercase">Mid / Feeder</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-zinc-500 uppercase">KDA Actuel</div>
                        <div className="font-mono font-bold text-2xl text-red-500">0 / 12 / 1</div>
                    </div>
                </div>

                {/* Live Action */}
                <div className="space-y-4">
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                        <AlertTriangle className="text-amber-500 w-8 h-8 shrink-0" />
                        <div>
                            <div className="text-xs text-amber-500 font-bold uppercase mb-1">Dernière action</div>
                            <div className="text-sm text-zinc-300">A flashé dans le mur pour KS le support.</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Probabilité FF15</span>
                            <span className="text-primary font-bold">98.2%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-purple-600 w-[98%]"></div>
                        </div>
                    </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute -top-4 -right-4 bg-gold text-black font-black text-sm px-4 py-2 rounded-full transform rotate-12 shadow-lg shadow-gold/20 border-2 border-white">
                    COTE x12.0
                </div>
            </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-24 bg-black/40 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">COMMENT PERDRE <span className="text-primary">AVEC STYLE</span></h2>
            <p className="text-zinc-400">Le processus est simple, rapide et douloureux.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-primary/50 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-primary/30">
                <Flame className="w-8 h-8 text-primary group-hover:animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">1. Le Lock-in</h3>
              <p className="text-zinc-400 leading-relaxed">
                Johnny sélectionne Yasuo. Il tape "trust me" dans le chat. Le jungler commence déjà à pleurer.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-accent/50 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-accent/30">
                <Zap className="w-8 h-8 text-accent group-hover:animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">2. Le Pari</h3>
              <p className="text-zinc-400 leading-relaxed">
                Choisissez votre prophétie : "Ragequit avant 10min" ou "0 damage dealt". Misez vos crédits.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-gold/50 hover:bg-zinc-900 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-gold/30">
                <Trophy className="w-8 h-8 text-gold group-hover:animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">3. La Richesse</h3>
              <p className="text-zinc-400 leading-relaxed">
                Regardez Johnny échouer spectaculairement. Encaissez vos gains pendant qu'il désinstalle le jeu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-white/5 bg-black text-zinc-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Skull className="w-5 h-5" />
            <span className="font-bold">JohnnyFF15 Inc.</span>
        </div>
        <p className="max-w-md mx-auto">
            Site non affilié à Riot Games. Si vous perdez de l'argent réel ici, consultez un médecin, car c'est une monnaie virtuelle qui ne sert à rien.
        </p>
      </footer>
    </div>
  );
};

export default Landing;