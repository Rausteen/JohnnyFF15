import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap, LogIn, Plus, Users, Gamepad2 } from 'lucide-react';
import CrosswordGrid from '../components/gridrush/CrosswordGrid';
import ClueList from '../components/gridrush/ClueList';
import MysteryWordInput from '../components/gridrush/MysteryWordInput';
import GameTimer from '../components/gridrush/GameTimer';
import GridProgress from '../components/gridrush/GridProgress';
import TeamChat from '../components/gridrush/TeamChat';
import GameOverScreen from '../components/gridrush/GameOverScreen';
import Lobby from '../components/gridrush/Lobby';
import type { GameSession, GridSet, Team } from '../services/gridrush/gridrushTypes';
import { getGameByCode, startGame, joinGame } from '../services/gridrush/gridrushService';
import { getDefaultGridSet } from '../services/gridrush/gridrushData';
import { loadGridSet } from '../services/gridrush/gridrushService';
import { useGridRushGame } from '../services/gridrush/useGridRushGame';
import { useCreditsStore } from '../services/creditsStore';
import { supabase } from '../services/supabase';

// Join form shown to players visiting via the shared link
const JoinForm: React.FC<{ gameCode: string; game: GameSession; onJoined: (data: { gameId: string; teamId: string; playerId: string; playerName: string }) => void }> = ({ gameCode, game, onJoined }) => {
  const { profile } = useCreditsStore();
  const playerName = profile?.pseudo || '';
  const [teamOption, setTeamOption] = useState<'new' | 'existing'>('existing');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableTeams = game.teams.filter(t => t.players.length < 2);

  // Auto-select first available team
  useEffect(() => {
    if (availableTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(availableTeams[0].id);
      setTeamOption('existing');
    } else if (availableTeams.length === 0) {
      setTeamOption('new');
    }
  }, [availableTeams.length]);

  const handleJoin = async () => {
    if (!playerName) return;
    setLoading(true);
    setError('');

    const result = await joinGame(
      gameCode,
      playerName,
      teamOption === 'existing' ? selectedTeamId : undefined,
      teamOption === 'new' ? (newTeamName.trim() || `Équipe ${playerName}`) : undefined
    );

    if (result) {
      sessionStorage.setItem(
        'gridrush_session',
        JSON.stringify({
          gameId: result.gameId,
          gameCode: gameCode.toUpperCase(),
          teamId: result.teamId,
          playerId: result.playerId,
          playerName,
          isHost: false,
        })
      );
      onJoined({ gameId: result.gameId, teamId: result.teamId, playerId: result.playerId, playerName });
    } else {
      setError('Impossible de rejoindre. Équipe pleine ou partie déjà lancée.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              GRID<span className="text-red-400">RUSH</span>
            </h1>
          </div>
          <p className="text-zinc-500 text-sm">Rejoindre la partie <span className="font-mono text-white">{gameCode}</span></p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <LogIn className="w-5 h-5 text-violet-400" />
            Rejoindre
          </h2>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <span className="text-xs text-zinc-500">Joueur :</span>
            <span className="text-sm font-bold text-white">{playerName}</span>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Équipe</label>
            <div className="flex gap-2 mb-3">
              {availableTeams.length > 0 && (
                <button
                  onClick={() => { setTeamOption('existing'); setSelectedTeamId(availableTeams[0]?.id || ''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    teamOption === 'existing'
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Rejoindre existante
                </button>
              )}
              <button
                onClick={() => setTeamOption('new')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  teamOption === 'new'
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Nouvelle équipe
              </button>
            </div>

            {teamOption === 'new' && (
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nom de l'équipe"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-violet-500/50"
                maxLength={30}
              />
            )}

            {teamOption === 'existing' && availableTeams.length > 0 && (
              <div className="space-y-2">
                {availableTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      selectedTeamId === team.id
                        ? 'border-violet-500/50 bg-violet-500/10 text-white'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4 text-violet-400" />
                    <div>
                      <span className="font-bold text-sm">{team.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">{team.players.length}/2 joueurs</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={loading || !playerName || (teamOption === 'existing' && !selectedTeamId)}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:brightness-110 text-white font-bold text-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Rejoindre la partie'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Wrapper that loads game data, then renders the actual game
const GridRushGame: React.FC = () => {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [gridSet, setGridSet] = useState<GridSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsJoin, setNeedsJoin] = useState(false);

  // Get session info from sessionStorage — MUST match the current gameCode
  const [sessionData, setSessionData] = useState<any>(() => {
    const raw = sessionStorage.getItem('gridrush_session');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Only use session if it matches the current game URL
      if (parsed.gameCode?.toUpperCase() !== gameCode?.toUpperCase()) {
        console.log('[GridRush] Session gameCode mismatch:', parsed.gameCode, '!==', gameCode, '— clearing');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const loadGame = useCallback(async () => {
    if (!gameCode) { navigate('/'); return; }

    const game = await getGameByCode(gameCode);
    if (!game) {
      setError('Partie introuvable');
      setLoading(false);
      return;
    }
    setGameSession(game);

    // Load grid set
    let gs: GridSet | null = null;
    if (game.gridSetId === 'default-set') {
      gs = getDefaultGridSet();
    } else {
      gs = await loadGridSet(game.gridSetId);
    }

    if (!gs) {
      setError('Impossible de charger les grilles');
      setLoading(false);
      return;
    }

    setGridSet(gs);
    setLoading(false);
  }, [gameCode, navigate]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (!loading && gameSession && !sessionData) {
      setNeedsJoin(true);
    }
  }, [loading, gameSession, sessionData]);

  // Subscribe to lobby channel for player_joined events (separate channel from game channel)
  useEffect(() => {
    if (!gameSession) return;
    const channel = supabase.channel(`gridrush-lobby-${gameSession.id}`);
    channel
      .on('broadcast', { event: 'player_joined' }, () => {
        loadGame();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameSession?.id, loadGame]);

  const handleJoined = useCallback((data: { gameId: string; teamId: string; playerId: string; playerName: string }) => {
    setSessionData({
      gameId: data.gameId,
      gameCode: gameCode?.toUpperCase(),
      teamId: data.teamId,
      playerId: data.playerId,
      playerName: data.playerName,
      isHost: false,
    });
    setNeedsJoin(false);
    // Reload game data to get updated teams
    loadGame();
  }, [gameCode, loadGame]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <p className="text-zinc-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !gameSession || !gridSet) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-4">{error || 'Erreur inconnue'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Show join form for players visiting via the shared link
  if (needsJoin || !sessionData) {
    return <JoinForm gameCode={gameCode!} game={gameSession} onJoined={handleJoined} />;
  }

  return (
    <GridRushGameInner
      gameSession={gameSession}
      gridSet={gridSet}
      playerId={sessionData.playerId}
      playerName={sessionData.playerName}
      teamId={sessionData.teamId}
      isHost={sessionData.isHost}
      onGameUpdate={setGameSession}
    />
  );
};

// Inner component: actual game view
interface GameInnerProps {
  gameSession: GameSession;
  gridSet: GridSet;
  playerId: string;
  playerName: string;
  teamId: string;
  isHost: boolean;
  onGameUpdate: (game: GameSession) => void;
}

const GridRushGameInner: React.FC<GameInnerProps> = ({
  gameSession,
  gridSet,
  playerId,
  playerName,
  teamId,
  isHost,
  onGameUpdate,
}) => {
  const navigate = useNavigate();

  const myTeam = gameSession.teams.find(t => t.id === teamId);

  const game = useGridRushGame({
    gridSet,
    gameId: gameSession.id,
    teamId,
    teamName: myTeam?.name || '',
    playerId,
    playerName,
    isHost,
    timerDuration: gameSession.timerDuration,
    startedAt: gameSession.startedAt || null,
  });

  const handleStartGame = async () => {
    const success = await startGame(gameSession.id);
    if (success) {
      const now = new Date().toISOString();
      game.broadcastGameStarted(now);
      game.startTimer(now);
    }
  };

  const handleJoinTeam = async (targetTeamId: string) => {
    // This is for lobby - player changes team
    // For simplicity, we reload the page
    await joinGame(gameSession.gameCode, playerName, targetTeamId);
    window.location.reload();
  };

  const handleCreateTeam = async (newTeamName: string) => {
    await joinGame(gameSession.gameCode, playerName, undefined, newTeamName);
    window.location.reload();
  };

  // Lobby view
  if (game.gameStatus === 'lobby') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="px-4 pt-6 pb-20">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black">
              GRID<span className="text-red-400">RUSH</span>
            </h1>
          </div>

          {/* Realtime connection status */}
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-zinc-500">
            <div className={`w-2 h-2 rounded-full ${game.realtimeStatus.teamReady ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
            <span>Équipe: {game.realtimeStatus.teamReady ? 'connecté' : 'connexion...'}</span>
            <div className={`w-2 h-2 rounded-full ml-2 ${game.realtimeStatus.gameReady ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
            <span>Partie: {game.realtimeStatus.gameReady ? 'connecté' : 'connexion...'}</span>
          </div>

          <Lobby
            game={gameSession}
            myPlayerId={playerId}
            myTeamId={teamId}
            isHost={isHost}
            onStartGame={handleStartGame}
            onJoinTeam={handleJoinTeam}
            onCreateTeam={handleCreateTeam}
          />
        </div>
      </div>
    );
  }

  // Game over
  const isGameOver = game.gameStatus === 'finished';

  // Currently selected clue for display above grid
  const selectedWord = game.selectedWordId !== null
    ? game.currentGrid.words.find(w => w.id === game.selectedWordId) : null;

  const diffColors = [
    { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', bar: 'bg-emerald-500' },
    { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', bar: 'bg-amber-500' },
    { badge: 'bg-red-500/20 text-red-400 border border-red-500/30', bar: 'bg-red-500' },
  ];
  const dc = diffColors[game.currentGridIndex] || diffColors[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm hidden sm:inline">
              GRID<span className="text-red-400">RUSH</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${game.realtimeStatus.teamReady ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} title={game.realtimeStatus.teamReady ? 'Connecté' : 'Déconnecté'} />
            <GridProgress
              currentGridIndex={game.currentGridIndex}
              totalGrids={game.totalGrids}
              wordsFoundPerGrid={game.allWordsFound}
            />
          </div>

          <GameTimer timeRemaining={game.timeRemaining} />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Grid + Mystery */}
          <div className="space-y-4">
            {/* Difficulty badge + progress bar */}
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${dc.badge}`}>
                {game.currentGrid.name}
              </span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${dc.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${(game.wordsFoundCount / game.currentGrid.words.length) * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-400 font-mono font-bold">
                {game.wordsFoundCount}/{game.currentGrid.words.length}
              </span>
            </div>

            {/* Selected clue banner */}
            {selectedWord && (
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="font-mono font-bold text-sky-400 text-sm mt-0.5">{selectedWord.number}.</span>
                <div>
                  <span className="text-xs text-sky-400/70 uppercase tracking-wider font-bold">
                    {selectedWord.direction === 'across' ? 'Horizontal' : 'Vertical'}
                  </span>
                  <p className="text-sm text-white">{selectedWord.clue}</p>
                </div>
              </div>
            )}

            {/* Crossword grid */}
            <div className="overflow-x-auto flex justify-center py-2">
              <CrosswordGrid
                grid={game.currentGrid}
                cellValues={game.cellValues}
                wordsFound={game.wordsFound}
                selectedCell={game.selectedCell}
                selectedDirection={game.selectedDirection}
                selectedWordId={game.selectedWordId}
                onCellInput={game.setCellValue}
                onCellSelect={game.selectCell}
                onWordSelect={game.setSelectedWordId}
                onDirectionChange={game.setSelectedDirection}
              />
            </div>

            {/* Mystery word input */}
            <MysteryWordInput
              grid={game.currentGrid}
              wordsFoundCount={game.wordsFoundCount}
              wordsFound={game.wordsFound}
              cellValues={game.cellValues}
              mysteryInput={game.mysteryInput}
              onInputChange={game.setMysteryInput}
              onSubmit={game.submitMysteryWord}
            />
          </div>

          {/* Right: Clues + Chat */}
          <div className="space-y-4">
            <ClueList
              words={game.currentGrid.words}
              wordsFound={game.wordsFound}
              selectedWordId={game.selectedWordId}
              selectedDirection={game.selectedDirection}
              onSelectWord={(wordId, direction) => {
                game.setSelectedWordId(wordId);
                game.setSelectedDirection(direction);
                const word = game.currentGrid.words.find(w => w.id === wordId);
                if (word) game.selectCell(word.row, word.col, direction);
              }}
            />

            <TeamChat
              messages={game.chatMessages}
              playerName={playerName}
              onSendMessage={game.sendChat}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs">
        {game.notifications.slice(-3).map((notif, i) => (
          <div
            key={i}
            onClick={() => game.clearNotification(i)}
            className="bg-emerald-900/80 border border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-emerald-100 shadow-xl cursor-pointer backdrop-blur-sm"
          >
            {notif}
          </div>
        ))}
      </div>

      {/* Game over overlay */}
      {isGameOver && (
        <GameOverScreen
          isWin={game.allWordsFound.every((wf, i) => wf.length >= gridSet.grids[i].words.length - 1)}
          myTeamId={teamId}
          timeElapsed={gameSession.timerDuration - game.timeRemaining}
          finishedTeams={game.finishedTeams}
        />
      )}
    </div>
  );
};

export default GridRushGame;
