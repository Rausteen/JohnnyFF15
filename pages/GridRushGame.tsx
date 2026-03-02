import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import CrosswordGrid from '../components/gridrush/CrosswordGrid';
import ClueList from '../components/gridrush/ClueList';
import MysteryWordInput from '../components/gridrush/MysteryWordInput';
import GameTimer from '../components/gridrush/GameTimer';
import GridProgress from '../components/gridrush/GridProgress';
import TeamChat from '../components/gridrush/TeamChat';
import GameOverScreen from '../components/gridrush/GameOverScreen';
import Lobby from '../components/gridrush/Lobby';
import type { GameSession, GridSet } from '../services/gridrush/gridrushTypes';
import { getGameByCode, startGame, joinGame } from '../services/gridrush/gridrushService';
import { getDefaultGridSet } from '../services/gridrush/gridrushData';
import { loadGridSet } from '../services/gridrush/gridrushService';
import { useGridRushGame } from '../services/gridrush/useGridRushGame';

// Wrapper that loads game data, then renders the actual game
const GridRushGame: React.FC = () => {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [gridSet, setGridSet] = useState<GridSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get session info from sessionStorage
  const sessionData = useMemo(() => {
    const raw = sessionStorage.getItem('gridrush_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!gameCode) {
      navigate('/gridrush');
      return;
    }

    if (!sessionData) {
      setError("Session expirée. Retourne au menu principal pour rejoindre.");
      setLoading(false);
      return;
    }

    const load = async () => {
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
    };

    load();
  }, [gameCode, sessionData, navigate]);

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

  if (error || !gameSession || !gridSet || !sessionData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-4">{error || 'Erreur inconnue'}</p>
          <button
            onClick={() => navigate('/gridrush')}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
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

  const game = useGridRushGame({
    gridSet,
    gameId: gameSession.id,
    teamId,
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm">
              GRID<span className="text-red-400">RUSH</span>
            </span>
          </div>

          <GridProgress
            currentGridIndex={game.currentGridIndex}
            totalGrids={game.totalGrids}
            wordsFoundPerGrid={game.allWordsFound}
          />

          <GameTimer timeRemaining={game.timeRemaining} />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Left: Grid + Mystery */}
          <div className="space-y-6">
            {/* Grid difficulty label */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                game.currentGridIndex === 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : game.currentGridIndex === 1
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {game.currentGrid.name}
              </span>
              <span className="text-xs text-zinc-600">
                {game.wordsFoundCount}/{game.currentGrid.words.length} mots
              </span>
            </div>

            {/* Crossword grid */}
            <div className="overflow-x-auto flex justify-center">
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
                onCheckWords={game.checkWordCompletion}
              />
            </div>

            {/* Mystery word input */}
            <MysteryWordInput
              grid={game.currentGrid}
              wordsFoundCount={game.wordsFoundCount}
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
                if (word) {
                  game.selectCell(word.row, word.col, direction);
                }
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
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {game.notifications.slice(-3).map((notif, i) => (
          <div
            key={i}
            onClick={() => game.clearNotification(i)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white shadow-xl cursor-pointer animate-slide-in"
          >
            {notif}
          </div>
        ))}
      </div>

      {/* Game over overlay */}
      {isGameOver && (
        <GameOverScreen
          isWin={game.allWordsFound.every((wf, i) => wf.length >= 9)}
          myTeamId={teamId}
          timeElapsed={gameSession.timerDuration - game.timeRemaining}
          finishedTeams={game.finishedTeams}
        />
      )}
    </div>
  );
};

export default GridRushGame;
