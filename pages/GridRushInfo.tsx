import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Grid3X3, Users, Clock, Brain, Trophy, Target, ArrowRight, Lightbulb, Layers } from 'lucide-react';
import { useAuthStore } from '../services/authStore';

const GridRushInfo: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-20">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/25">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight">
              GRID<span className="text-red-400">RUSH</span>
            </h1>
          </div>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Un jeu de <span className="text-white font-bold">mots croisés en équipe</span> où la rapidité et la communication sont la clé de la victoire.
          </p>
        </div>

        {/* Concept */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-white/5 rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
            <Target className="w-6 h-6 text-red-400" />
            Le concept
          </h2>
          <p className="text-zinc-400 leading-relaxed text-lg">
            Les équipes s'affrontent pour compléter <span className="text-amber-400 font-bold">3 grilles de mots croisés</span> de difficulté croissante (facile, moyenne, difficile). Chaque grille contient un <span className="text-red-400 font-bold">mot mystère</span> bonus caché dans certaines cases. Pour passer à la grille suivante, il suffit de trouver <span className="text-white font-bold">presque tous les mots</span> (tous sauf un). La première équipe à terminer les 3 grilles remporte la partie.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="group bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-emerald-500/30 rounded-3xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Étape 1</div>
            <h3 className="text-lg font-bold text-white mb-2">Rejoindre une partie</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Un admin crée la partie et partage le <span className="text-white font-semibold">code de jeu</span>. Tu rejoins avec ce code, tu crées ou rejoins une équipe (max 2 équipes).
            </p>
          </div>

          <div className="group bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-amber-500/30 rounded-3xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Grid3X3 className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">Étape 2</div>
            <h3 className="text-lg font-bold text-white mb-2">Remplir les grilles</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Avec ton équipe, remplis les mots croisés en utilisant les indices. Chaque lettre correcte valide en temps réel. <span className="text-white font-semibold">Communiquez-vous</span> pour aller plus vite !
            </p>
          </div>

          <div className="group bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/5 hover:border-red-500/30 rounded-3xl p-6 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">Étape 3</div>
            <h3 className="text-lg font-bold text-white mb-2">Trouver le mot mystère</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Certaines cases de la grille forment un <span className="text-white font-semibold">mot mystère</span>. C'est un bonus : le trouver valide automatiquement tous les mots restants de la grille et permet de passer directement à la suivante.
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Le timer
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Chaque partie a un timer (5 à 60 min, par défaut 20 min). Si le temps expire, l'équipe avec le plus de mots trouvés gagne.
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              3 niveaux de difficulté
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Les grilles sont jouées dans l'ordre : <span className="text-emerald-400 font-semibold">Facile</span> → <span className="text-amber-400 font-semibold">Moyenne</span> → <span className="text-red-400 font-semibold">Difficile</span>. Il faut trouver <span className="text-white font-semibold">tous les mots sauf un</span> (ou le mot mystère) pour passer à la grille suivante.
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Indices du mot mystère
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Chaque grille a un <span className="text-yellow-400 font-semibold">indice principal</span> pour le mot mystère. En trouvant <span className="text-white font-semibold">5 mots</span>, un premier indice bonus se débloque. À <span className="text-white font-semibold">8 mots</span> trouvés, un deuxième indice apparaît pour t'aider.
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Comment gagner
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              La <span className="text-gold font-semibold">première équipe</span> à compléter les 3 grilles gagne ! Pas besoin de trouver tous les mots mystères : il suffit de trouver assez de mots pour valider chaque grille. Si le temps expire, l'équipe la plus avancée l'emporte.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/20 rounded-2xl p-6 mb-10">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Conseils pour gagner
          </h3>
          <ul className="space-y-2 text-zinc-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span><span className="text-white font-semibold">Répartissez-vous les indices</span> — chaque membre peut travailler sur des mots différents en parallèle.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span><span className="text-white font-semibold">Surveillez les cases mystères</span> — dès que vous avez assez de lettres, tentez le mot mystère.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span><span className="text-white font-semibold">Utilisez le chat</span> — communiquez avec votre équipe en temps réel pendant la partie.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span><span className="text-white font-semibold">Ne restez pas bloqués</span> — passez à un autre mot et revenez plus tard.</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Prêt à jouer ? Demande le code de la prochaine partie à un admin !</p>
          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-red-500/20"
            >
              Se connecter
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
};

export default GridRushInfo;
