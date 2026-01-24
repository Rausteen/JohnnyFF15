import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, JohnnyConfig } from '../services/gameStore';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useMatchHistoryStore } from '../services/matchHistoryStore';
import { Region, riotApi } from '../services/riotApi';
import { resolveBets } from '../services/betResolutionService';
import { useStore } from '../services/store';
import { Power, Dices, RotateCcw, User, Globe, CheckCircle, AlertCircle, Loader2, Radio, Wifi, WifiOff, ShieldX, Zap, Trash2, History, Gavel, FlaskConical, Play, Square } from 'lucide-react';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'EUW', label: 'Europe West (EUW)' },
  { value: 'EUNE', label: 'Europe Nordic & East (EUNE)' },
  { value: 'NA', label: 'North America (NA)' },
  { value: 'KR', label: 'Korea (KR)' },
];

// Admin users (by pseudo)
const ADMIN_USERS = ['Rausteen'];

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useCreditsStore();
  const {
    johnny,
    isInGame,
    currentGame,
    isPolling,
    loading,
    error,
    testMode,
    testMatchId,
    setJohnnyConfig,
    loadJohnnyConfig,
    startPolling,
    stopPolling,
    checkGameStatus,
    clearError,
    startTestMode,
    endTestMode
  } = useGameStore();

  const { addCredits } = useCreditsStore();
  const { clearAllMatches, matches, loadMatches } = useMatchHistoryStore();

  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState<Region>('EUW');
  const [configSuccess, setConfigSuccess] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveResult, setResolveResult] = useState<{ success: boolean; message: string } | null>(null);

  const { bets } = useStore();
  const pendingBets = bets.filter(b => b.status === 'PENDING');

  const [selectedTestMatch, setSelectedTestMatch] = useState<string>('');
  const [testModeLoading, setTestModeLoading] = useState(false);
  const [testModeResult, setTestModeResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if user is admin
  const isAdmin = profile && ADMIN_USERS.includes(profile.pseudo);

  useEffect(() => {
    loadJohnnyConfig();
    loadMatches();
  }, []);

  // Redirect non-admin users
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Accès refusé</h1>
        <p className="text-zinc-400">Tu dois être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Zone interdite</h1>
        <p className="text-zinc-400">Seul Rausteen peut accéder à cette page.</p>
        <p className="text-zinc-500 text-sm mt-2">Pseudo actuel: {profile?.pseudo || 'inconnu'}</p>
      </div>
    );
  }

  useEffect(() => {
    if (johnny.gameName) {
      setGameName(johnny.gameName);
      setTagLine(johnny.tagLine);
      setRegion(johnny.region);
    }
  }, [johnny]);

  const handleSaveConfig = async () => {
    setConfigSuccess(false);
    clearError();

    if (!gameName || !tagLine) {
      return;
    }

    const success = await setJohnnyConfig(gameName, tagLine, region);
    if (success) {
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    }
  };

  const handleAddCredits = async () => {
    await addCredits(1000);
  };

  const handleResetMuseum = async () => {
    if (!confirm('Es-tu sûr de vouloir supprimer TOUTES les games du Musée du Throw ?')) {
      return;
    }

    setResetLoading(true);
    setResetResult(null);

    const success = await clearAllMatches();

    if (success) {
      setResetResult({ success: true, message: 'Musée vidé ! Toutes les games ont été supprimées.' });
    } else {
      setResetResult({ success: false, message: 'Erreur lors de la suppression.' });
    }

    setResetLoading(false);
    setTimeout(() => setResetResult(null), 5000);
  };

  const handleResolveBets = async () => {
    if (!johnny.puuid) {
      setResolveResult({ success: false, message: 'PUUID non configuré' });
      return;
    }

    if (pendingBets.length === 0) {
      setResolveResult({ success: false, message: 'Aucun pari en attente' });
      return;
    }

    setResolveLoading(true);
    setResolveResult(null);

    try {
      // Get the last match
      const lastMatch = await riotApi.getLastMatch(johnny.puuid);

      if (!lastMatch) {
        setResolveResult({ success: false, message: 'Impossible de récupérer la dernière game' });
        setResolveLoading(false);
        return;
      }

      console.log('Resolving bets with match:', lastMatch.metadata.matchId);
      const results = await resolveBets(lastMatch, johnny.puuid);

      const won = results.filter(r => r.won).length;
      const lost = results.filter(r => !r.won).length;

      setResolveResult({
        success: true,
        message: `${results.length} paris résolus: ${won} gagnés, ${lost} perdus`
      });
    } catch (err: any) {
      console.error('Resolve bets error:', err);
      setResolveResult({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setResolveLoading(false);
      setTimeout(() => setResolveResult(null), 5000);
    }
  };

  const handleStartTestMode = async () => {
    if (!selectedTestMatch) {
      setTestModeResult({ success: false, message: 'Sélectionne une game d\'abord' });
      return;
    }

    setTestModeLoading(true);
    setTestModeResult(null);

    const success = await startTestMode(selectedTestMatch);

    if (success) {
      setTestModeResult({ success: true, message: 'Mode test activé ! Va sur le Dashboard pour parier.' });
    } else {
      setTestModeResult({ success: false, message: 'Erreur lors du démarrage du mode test' });
    }

    setTestModeLoading(false);
  };

  const handleEndTestMode = async () => {
    setTestModeLoading(true);
    setTestModeResult(null);

    const results = await endTestMode();

    setTestModeResult({
      success: true,
      message: `Mode test terminé ! ${results.won} paris gagnés, ${results.lost} paris perdus`
    });

    setTestModeLoading(false);
    setSelectedTestMatch('');
    setTimeout(() => setTestModeResult(null), 5000);
  };

  const handleTestApi = async () => {
    setApiTestLoading(true);
    setApiTestResult(null);

    try {
      if (!johnny.puuid) {
        setApiTestResult({ success: false, message: 'PUUID non configuré. Sauvegarde Johnny d\'abord.' });
        return;
      }

      // Test 1: Check if we can access spectator API
      console.log('Testing Riot API with PUUID:', johnny.puuid);
      const currentGame = await riotApi.getCurrentGame(johnny.puuid);

      if (currentGame) {
        setApiTestResult({
          success: true,
          message: `API OK! Johnny est EN GAME (Game ID: ${currentGame.gameId})`
        });
      } else {
        // Try to get match history to verify API is working
        const matchHistory = await riotApi.getMatchHistory(johnny.puuid, 1);
        if (matchHistory && matchHistory.length > 0) {
          setApiTestResult({
            success: true,
            message: `API OK! Johnny n'est pas en game actuellement. Dernière game: ${matchHistory[0]}`
          });
        } else {
          setApiTestResult({
            success: false,
            message: 'API peut fonctionner mais aucune game trouvée. Vérifie la clé API ou la région.'
          });
        }
      }
    } catch (err: any) {
      console.error('API Test error:', err);
      setApiTestResult({
        success: false,
        message: `Erreur: ${err.message || 'Vérifie la console pour plus de détails'}`
      });
    } finally {
      setApiTestLoading(false);
    }
  };

  const gameTimeMinutes = currentGame
    ? Math.floor((Date.now() - currentGame.gameStartTime) / 1000 / 60)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-gradient-to-b from-red-950/20 to-zinc-950 border border-red-900/30 p-8 rounded-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-900/20 rounded-xl">
            <Power className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Salle de Contrôle</h1>
            <p className="text-red-400 text-sm">Configure Johnny et surveille ses games</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Johnny Configuration */}
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-white">Configuration de Johnny</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Game Name</label>
                  <input
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="JohnnyFF15"
                    className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Tag Line</label>
                  <input
                    type="text"
                    value={tagLine}
                    onChange={(e) => setTagLine(e.target.value)}
                    placeholder="EUW"
                    className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Région
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:border-primary focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {configSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Johnny configuré ! PUUID récupéré.
                </div>
              )}

              <button
                onClick={handleSaveConfig}
                disabled={loading || !gameName || !tagLine}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recherche du joueur...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Sauvegarder
                  </>
                )}
              </button>

              {johnny.puuid && (
                <div className="text-xs text-zinc-500 font-mono truncate">
                  PUUID: {johnny.puuid}
                </div>
              )}
            </div>
          </div>

          {/* Game Monitoring */}
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-white">Surveillance des Games</h3>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                isInGame
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {isInGame ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    EN GAME
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-zinc-500 rounded-full"></span>
                    HORS GAME
                  </>
                )}
              </div>
            </div>

            {isInGame && currentGame && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">Mode</div>
                    <div className="text-white font-bold">{currentGame.gameMode}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Durée</div>
                    <div className="text-white font-bold">{gameTimeMinutes} min</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {isPolling ? (
                <button
                  onClick={stopPolling}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <WifiOff className="w-4 h-4" />
                  Arrêter la surveillance
                </button>
              ) : (
                <button
                  onClick={() => startPolling(30000)}
                  disabled={!johnny.puuid}
                  className="flex-1 py-3 bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Wifi className="w-4 h-4" />
                  Lancer la surveillance
                </button>
              )}

              <button
                onClick={checkGameStatus}
                disabled={!johnny.puuid || loading}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isPolling && (
              <div className="mt-3 text-xs text-zinc-500 text-center">
                Vérification toutes les 30 secondes...
              </div>
            )}

            {/* API Test Section */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <button
                onClick={handleTestApi}
                disabled={apiTestLoading || !johnny.puuid}
                className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {apiTestLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Tester la connexion API Riot
                  </>
                )}
              </button>

              {apiTestResult && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${
                  apiTestResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-start gap-2">
                    {apiTestResult.success ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <span>{apiTestResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Musée du Throw */}
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-white">Musée du Throw</h3>
              </div>
              <span className="text-xs text-zinc-500">{matches.length} games enregistrées</span>
            </div>

            <button
              onClick={handleResetMuseum}
              disabled={resetLoading || matches.length === 0}
              className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {resetLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Vider le Musée
                </>
              )}
            </button>

            {resetResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm ${
                resetResult.success
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {resetResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{resetResult.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* Test Mode */}
          <div className="bg-gradient-to-b from-purple-950/20 to-zinc-900 p-6 rounded-2xl border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white">Mode Test</h3>
              </div>
              {testMode && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full border border-purple-500/30 animate-pulse">
                  ACTIF
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Parie sur une ancienne game du musée pour tester le système. Les paris seront résolus selon les vraies stats de la game.
            </p>

            {!testMode ? (
              <>
                {/* Select a match from history */}
                <div className="mb-4">
                  <label className="block text-sm text-zinc-400 mb-2">Sélectionne une game</label>
                  <select
                    value={selectedTestMatch}
                    onChange={(e) => setSelectedTestMatch(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- Choisir une game --</option>
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.champion_name} - {match.kills}/{match.deaths}/{match.assists} - {match.win ? 'Victoire' : 'Défaite'} ({new Date(match.game_creation).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleStartTestMode}
                  disabled={testModeLoading || !selectedTestMatch || matches.length === 0}
                  className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {testModeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Lancer le mode test
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-sm text-purple-300 mb-1">Game de test active:</div>
                  <div className="font-mono text-xs text-zinc-400 truncate">{testMatchId}</div>
                  <div className="text-xs text-zinc-500 mt-2">
                    Va sur le <a href="/dashboard" className="text-purple-400 underline">Dashboard</a> pour placer tes paris, puis reviens ici pour terminer le test.
                  </div>
                </div>

                <button
                  onClick={handleEndTestMode}
                  disabled={testModeLoading}
                  className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {testModeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Résolution...
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Terminer le test et résoudre les paris
                    </>
                  )}
                </button>
              </>
            )}

            {testModeResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm ${
                testModeResult.success
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {testModeResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{testModeResult.message}</span>
                </div>
              </div>
            )}

            {matches.length === 0 && (
              <div className="mt-3 text-xs text-amber-400">
                Aucune game dans le musée. Synchronise d'abord le musée pour avoir des games de test.
              </div>
            )}
          </div>

          {/* Simulation / Cheats */}
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <Dices className="w-5 h-5 text-gold" />
              <h3 className="font-bold text-white">Cheats (pour tester)</h3>
            </div>

            <button
              onClick={handleAddCredits}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              S'injecter 1000 crédits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
