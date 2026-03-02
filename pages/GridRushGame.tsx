import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Zap, Copy, CheckCircle, Users, Play, Square, Trophy, Lock, Unlock, Eye, Send, Loader2, ArrowLeft, Plus, X, Crown } from 'lucide-react';
import { useAuthStore } from '../services/authStore';
import { useCreditsStore } from '../services/creditsStore';
import { useGridRushStore, GridRushTeam } from '../services/gridRushStore';
import { Difficulty, DIFFICULTIES, DIFFICULTY_COLORS, DIFFICULTY_BG, TEAM_COLORS } from '../services/gridRushData';

const ADMIN_USERS = ['Rausteen'];

const GridRushGame = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const { user } = useAuthStore();
  const { profile } = useCreditsStore();
  const {
    game, teams, guesses, myTeamId, loading, error,
    loadGame, createTeam, joinTeam, leaveTeam,
    startGame, endGame, submitGuess, subscribeToGame,
    getTeamScore, getFoundWordsCount, isFinalWordUnlocked,
    isHintUnlocked, isWordFound, isFinalWordFound, reset,
  } = useGridRushStore();

  const [guessInput, setGuessInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].value);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = profile && ADMIN_USERS.includes(profile.pseudo);
  const isGameCreator = game && user && game.created_by === user.id;

  // Load game on mount
  useEffect(() => {
    if (joinCode) {
      loadGame(joinCode);
    }
    return () => reset();
  }, [joinCode]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (game?.id) {
      const unsubscribe = subscribeToGame(game.id);
      return unsubscribe;
    }
  }, [game?.id]);

  // Auto-focus input when game starts
  useEffect(() => {
    if (game?.status === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [game?.status]);

  const handleCopyLink = () => {
    if (!game) return;
    const link = `${window.location.origin}${window.location.pathname}#/gridrush/game/${game.join_code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const success = await createTeam(newTeamName.trim(), newTeamColor);
    if (success) {
      setNewTeamName('');
      setShowCreateTeam(false);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!user || !profile) return;
    await joinTeam(teamId, user.id, profile.pseudo);
  };

  const handleLeaveTeam = async () => {
    if (!user) return;
    await leaveTeam(user.id);
  };

  const handleSubmitGuess = async () => {
    if (!guessInput.trim() || !user || submitting) return;
    setSubmitting(true);

    const result = await submitGuess(guessInput.trim(), user.id);

    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);

    if (result.found) {
      setFeedback({
        type: 'success',
        message: `${result.word} (${result.difficulty}) +${result.points} pts${result.isFinalWord ? ' - MOT DE FIN !' : ''}`,
      });
    } else if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      setFeedback({ type: 'error', message: 'Mauvaise réponse !' });
    }

    setGuessInput('');
    setSubmitting(false);
    inputRef.current?.focus();

    feedbackTimeout.current = setTimeout(() => setFeedback(null), 3000);
  };

  const handleStartGame = async () => {
    if (teams.length < 2) {
      setFeedback({ type: 'error', message: 'Il faut au moins 2 équipes pour commencer !' });
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 3000);
      return;
    }
    await startGame();
  };

  // Get team by ID
  const getTeam = (teamId: string): GridRushTeam | undefined =>
    teams.find((t) => t.id === teamId);

  // Sorted teams by score (descending)
  const sortedTeams = [...teams].sort((a, b) => getTeamScore(b.id) - getTeamScore(a.id));

  // Loading state
  if (loading && !game) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
        <p className="text-zinc-400">Chargement de la partie...</p>
      </div>
    );
  }

  // Not found
  if (!loading && !game) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Zap className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Partie introuvable</h2>
        <p className="text-zinc-400 mb-6">Le code {joinCode} ne correspond à aucune partie.</p>
        <Link to="/" className="text-accent hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Zap className="w-16 h-16 text-accent mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">GridRush</h2>
        <p className="text-zinc-400 mb-6">Connecte-toi pour rejoindre la partie !</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (!game) return null;

  // ================== LOBBY VIEW ==================
  if (game.status === 'waiting') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={isAdmin ? '/gridrush' : '/'} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <Zap className="w-6 h-6 text-accent" />
                GridRush
              </h1>
              <p className="text-zinc-400 text-sm">En attente des joueurs...</p>
            </div>
          </div>
        </div>

        {/* Join Code + Link */}
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-zinc-400 text-sm mb-1">Code de la partie</p>
              <p className="text-4xl font-mono font-black tracking-[0.3em] text-white">{game.join_code}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent/20 border border-accent/30 text-accent font-bold hover:bg-accent/30 transition cursor-pointer"
            >
              {copiedLink ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copiedLink ? 'Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>

        {/* Teams */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              Équipes ({teams.length})
            </h2>
            {(isGameCreator || isAdmin) && (
              <button
                onClick={() => setShowCreateTeam(!showCreateTeam)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition cursor-pointer"
              >
                {showCreateTeam ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showCreateTeam ? 'Annuler' : 'Nouvelle équipe'}
              </button>
            )}
          </div>

          {/* Create Team Form */}
          {showCreateTeam && (
            <div className="mb-4 p-4 rounded-xl bg-black/30 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Nom de l'équipe..."
                  maxLength={20}
                  className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white focus:outline-none focus:border-accent/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                />
                <div className="flex gap-1.5">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewTeamColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition cursor-pointer ${
                        newTeamColor === c.value ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className="px-5 py-2 rounded-lg bg-accent text-white font-bold hover:bg-accent/80 transition disabled:opacity-50 cursor-pointer"
                >
                  Créer
                </button>
              </div>
            </div>
          )}

          {/* Team Cards */}
          {teams.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              Aucune équipe créée. {isGameCreator ? "Crée des équipes pour commencer !" : "L'admin va créer les équipes."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teams.map((team) => {
                const isMyTeam = myTeamId === team.id;
                return (
                  <div
                    key={team.id}
                    className={`p-4 rounded-xl border transition ${
                      isMyTeam
                        ? 'bg-white/10 border-white/20 shadow-lg'
                        : 'bg-black/30 border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                        <span className="font-bold text-lg">{team.name}</span>
                        {isMyTeam && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">Toi</span>
                        )}
                      </div>
                      <span className="text-sm text-zinc-400">{team.members.length} joueur(s)</span>
                    </div>

                    {/* Members */}
                    <div className="space-y-1 mb-3">
                      {team.members.map((m) => (
                        <div key={m.id} className="text-sm text-zinc-300 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                          {m.pseudo}
                        </div>
                      ))}
                      {team.members.length === 0 && (
                        <p className="text-sm text-zinc-500 italic">Aucun joueur</p>
                      )}
                    </div>

                    {/* Join / Leave button */}
                    {isMyTeam ? (
                      <button
                        onClick={handleLeaveTeam}
                        className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition cursor-pointer"
                      >
                        Quitter l'équipe
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinTeam(team.id)}
                        className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition cursor-pointer"
                      >
                        Rejoindre
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start button (admin/creator only) */}
        {(isGameCreator || isAdmin) && (
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={teams.length < 2}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-black hover:from-green-400 hover:to-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/25 cursor-pointer"
            >
              <Play className="w-6 h-6" />
              Lancer la partie
            </button>
            {teams.length < 2 && (
              <p className="text-zinc-500 text-sm mt-2">Il faut au moins 2 équipes</p>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-bold text-sm z-50 shadow-xl ${
            feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {feedback.message}
          </div>
        )}
      </div>
    );
  }

  // ================== GAME VIEW (playing or finished) ==================
  const totalWords = DIFFICULTIES.reduce((sum, d) => {
    const cat = game.grid_data[d];
    return sum + cat.words.length + 1; // +1 for final word
  }, 0);
  const foundWords = guesses.length;

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl pb-28">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={isAdmin ? '/gridrush' : '/'} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              GridRush
              <span className="text-sm font-mono text-zinc-500 ml-2">{game.join_code}</span>
            </h1>
            {game.status === 'finished' ? (
              <p className="text-zinc-400 text-xs">Partie terminée</p>
            ) : (
              <p className="text-green-400 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                En cours - {foundWords}/{totalWords} mots trouvés
              </p>
            )}
          </div>
        </div>

        {/* Admin controls */}
        {(isGameCreator || isAdmin) && game.status === 'playing' && (
          <button
            onClick={endGame}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition cursor-pointer"
          >
            <Square className="w-4 h-4" />
            Terminer
          </button>
        )}
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        {sortedTeams.map((team, index) => {
          const score = getTeamScore(team.id);
          const isMyTeam = myTeamId === team.id;
          return (
            <div
              key={team.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap ${
                isMyTeam ? 'bg-white/10 border-white/20' : 'bg-black/30 border-white/5'
              }`}
            >
              {index === 0 && game.status === 'finished' && (
                <Crown className="w-4 h-4 text-yellow-400" />
              )}
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
              <span className="font-bold text-sm">{team.name}</span>
              <span className="font-mono font-black text-lg" style={{ color: team.color }}>
                {score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {DIFFICULTIES.map((diff) => {
          const category = game.grid_data[diff];
          if (!category) return null;

          const foundCount = getFoundWordsCount(diff);
          const finalUnlocked = isFinalWordUnlocked(diff);
          const hintUnlocked = isHintUnlocked(diff);
          const finalFound = isFinalWordFound(diff);

          return (
            <div key={diff} className={`rounded-2xl border bg-gradient-to-br p-4 ${DIFFICULTY_BG[diff]}`}>
              {/* Column header */}
              <div className="text-center mb-3">
                <h3 className={`text-lg font-black ${DIFFICULTY_COLORS[diff]}`}>{diff}</h3>
                <p className="text-zinc-400 text-xs">{category.pointsPerWord} pts / mot</p>
                <p className="text-zinc-500 text-xs mt-1">{foundCount}/{category.words.length} trouvés</p>
              </div>

              {/* Words */}
              <div className="space-y-2">
                {category.words.map((word, index) => {
                  const guess = isWordFound(diff, index);
                  const team = guess ? getTeam(guess.team_id) : null;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border transition-all ${
                        guess
                          ? 'bg-white/10 border-white/20'
                          : 'bg-black/20 border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm ${guess ? 'text-zinc-400 line-through' : 'text-zinc-200'}`}>
                            <span className="text-zinc-500 text-xs mr-1.5">{index + 1}.</span>
                            {word.clue}
                          </p>
                          {guess && (
                            <p className="font-bold mt-1 text-sm" style={{ color: team?.color || '#fff' }}>
                              {word.answer}
                            </p>
                          )}
                        </div>
                        {guess && team && (
                          <div
                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: team.color }}
                            title={team.name}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Final Word */}
                <div
                  className={`p-3 rounded-xl border-2 border-dashed transition-all ${
                    finalFound
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : finalUnlocked
                      ? 'bg-accent/10 border-accent/30 animate-pulse'
                      : 'bg-black/10 border-white/10 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {finalUnlocked ? (
                      <Unlock className="w-4 h-4 text-accent" />
                    ) : (
                      <Lock className="w-4 h-4 text-zinc-500" />
                    )}
                    <span className="text-xs font-bold text-yellow-400 uppercase">
                      Mot de Fin {!finalUnlocked && `(${5 - foundCount} mots restants)`}
                    </span>
                    <span className="text-xs text-zinc-400">+{category.finalWordPoints} pts</span>
                  </div>

                  {finalUnlocked ? (
                    <>
                      <p className={`text-sm ${finalFound ? 'text-zinc-400 line-through' : 'text-zinc-200'}`}>
                        {category.finalWord.clue}
                      </p>
                      {finalFound && (
                        <p className="font-bold mt-1 text-sm" style={{ color: getTeam(finalFound.team_id)?.color || '#fff' }}>
                          {category.finalWord.answer}
                        </p>
                      )}
                      {hintUnlocked && category.finalWord.hintAfter8 && !finalFound && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-xs text-yellow-400 font-bold">
                            Indice : {category.finalWord.hintAfter8}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">
                      Trouve {5 - foundCount} mot(s) de plus pour débloquer
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results banner when finished */}
      {game.status === 'finished' && sortedTeams.length > 0 && (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-900/10 border border-yellow-500/30 text-center">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-2xl font-black mb-2">Partie Terminée !</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sortedTeams[0].color }} />
            <span className="text-xl font-bold" style={{ color: sortedTeams[0].color }}>
              {sortedTeams[0].name}
            </span>
            <span className="text-yellow-400 font-bold">remporte la partie avec {getTeamScore(sortedTeams[0].id)} pts !</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            {sortedTeams.map((team, i) => (
              <div key={team.id} className="text-center">
                <div className="text-sm text-zinc-400">#{i + 1}</div>
                <div className="font-bold" style={{ color: team.color }}>{team.name}</div>
                <div className="font-mono font-black text-lg">{getTeamScore(team.id)} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guess Input (only when playing) */}
      {game.status === 'playing' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="container mx-auto max-w-3xl">
            {!myTeamId ? (
              <p className="text-center text-yellow-400 font-bold text-sm">
                Rejoins une équipe pour pouvoir deviner !
              </p>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
                    placeholder="Tape ta réponse..."
                    className={`w-full px-5 py-3 rounded-xl bg-zinc-900 border text-white text-lg font-bold focus:outline-none transition ${
                      feedback?.type === 'success'
                        ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : feedback?.type === 'error'
                        ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : 'border-white/10 focus:border-accent/50'
                    }`}
                    disabled={submitting}
                  />
                  {feedback && (
                    <div
                      className={`absolute -top-10 left-0 right-0 text-center text-sm font-bold py-1.5 px-3 rounded-lg ${
                        feedback.type === 'success' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                      }`}
                    >
                      {feedback.message}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSubmitGuess}
                  disabled={!guessInput.trim() || submitting}
                  className="px-6 py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent/80 transition disabled:opacity-40 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}

            {/* My team indicator */}
            {myTeamId && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getTeam(myTeamId)?.color }} />
                <span className="text-xs text-zinc-400">
                  Équipe {getTeam(myTeamId)?.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GridRushGame;
