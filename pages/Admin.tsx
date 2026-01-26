import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, JohnnyConfig } from '../services/gameStore';
import { useCreditsStore } from '../services/creditsStore';
import { useAuthStore } from '../services/authStore';
import { useMatchHistoryStore } from '../services/matchHistoryStore';
import { Region, riotApi } from '../services/riotApi';
import { resolveBets } from '../services/betResolutionService';
import { getAllPendingBets, updateBetStatus, deleteUserBets } from '../services/betsService';
import { Bet } from '../types';
import { usePropsStore } from '../services/propsStore';
import { MOCK_PROPS } from '../services/mockData';
import { supabase } from '../services/supabase';
import { Power, Dices, RotateCcw, User, Globe, CheckCircle, AlertCircle, Loader2, Radio, Wifi, WifiOff, ShieldX, Zap, Trash2, History, Gavel, FlaskConical, Play, Square, Settings, Users, RefreshCw, TrendingUp, ChevronDown, ChevronUp, Check, X, Download, Plus, Coins, Bell, Send } from 'lucide-react';
import { setWebhookUrl, getStoredWebhookUrl, sendTestNotification } from '../services/discordWebhook';

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
  const { clearAllMatches, matches, loadMatches, syncMatches, syncLastGame, syncing } = useMatchHistoryStore();

  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState<Region>('EUW');
  const [configSuccess, setConfigSuccess] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveResult, setResolveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [resolvingBetId, setResolvingBetId] = useState<string | null>(null);
  const [forceSyncLoading, setForceSyncLoading] = useState(false);
  const [forceSyncResult, setForceSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Note: bets are now Supabase-only (no local storage)

  // All pending bets from Supabase (all users)
  const [allPendingBets, setAllPendingBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);

  // Load all pending bets from Supabase
  const loadAllPendingBets = async () => {
    setLoadingBets(true);
    try {
      const bets = await getAllPendingBets();
      setAllPendingBets(bets);
    } catch (err) {
      console.error('Error loading bets:', err);
    } finally {
      setLoadingBets(false);
    }
  };

  // Pending bets from Supabase (sorted by timestamp, newest first)
  const mergedPendingBets = useMemo(() => {
    return [...allPendingBets].sort((a, b) => b.timestamp - a.timestamp);
  }, [allPendingBets]);

  const [selectedTestMatch, setSelectedTestMatch] = useState<string>('');
  const [testModeLoading, setTestModeLoading] = useState(false);
  const [testModeResult, setTestModeResult] = useState<{ success: boolean; message: string } | null>(null);

  // Odds management
  const { customOdds, setOdds, resetOdds, resetAllOdds } = usePropsStore();
  const [oddsExpanded, setOddsExpanded] = useState(false);
  const [editingOdds, setEditingOdds] = useState<Record<string, string>>({});

  // User management
  const [allUsers, setAllUsers] = useState<{ id: string; pseudo: string; credits: number }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [resetAccountLoading, setResetAccountLoading] = useState(false);
  const [resetAccountResult, setResetAccountResult] = useState<{ success: boolean; message: string } | null>(null);

  // Add credits to user
  const [addCreditsUserId, setAddCreditsUserId] = useState<string>('');
  const [addCreditsAmount, setAddCreditsAmount] = useState<string>('1000');
  const [addCreditsLoading, setAddCreditsLoading] = useState(false);
  const [addCreditsResult, setAddCreditsResult] = useState<{ success: boolean; message: string } | null>(null);

  // Discord webhook
  const [webhookUrl, setWebhookUrlState] = useState<string>('');
  const [testChampion, setTestChampion] = useState<string>('Yasuo');
  const [testGameMode, setTestGameMode] = useState<string>('Ranked Solo/Duo');
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if user is admin
  const isAdmin = profile && ADMIN_USERS.includes(profile.pseudo);

  useEffect(() => {
    loadJohnnyConfig();
    loadMatches();
    loadAllPendingBets();
    // Load stored webhook URL
    setWebhookUrlState(getStoredWebhookUrl());
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

  const handleSyncMuseum = async () => {
    setSyncResult(null);

    try {
      const result = await syncMatches();
      setSyncResult({
        success: true,
        message: result.newMatches > 0
          ? `${result.newMatches} nouvelle(s) game(s) ajoutée(s) au musée !`
          : 'Musée déjà à jour, aucune nouvelle game.'
      });
    } catch (err: any) {
      setSyncResult({ success: false, message: `Erreur: ${err.message}` });
    }

    setTimeout(() => setSyncResult(null), 5000);
  };

  const handleForceSyncLastGame = async () => {
    setForceSyncLoading(true);
    setForceSyncResult(null);

    const result = await syncLastGame();

    if (result.success && result.match) {
      setForceSyncResult({
        success: true,
        message: `Game ajoutée: ${result.match.champion_name} ${result.match.kills}/${result.match.deaths}/${result.match.assists} (${result.match.win ? 'Victoire' : 'Défaite'})`
      });
    } else {
      setForceSyncResult({
        success: false,
        message: result.error || 'Erreur inconnue'
      });
    }

    setForceSyncLoading(false);
    setTimeout(() => setForceSyncResult(null), 5000);
  };

  // Manually resolve a single bet (works with Supabase bets from all users)
  const handleManualResolve = async (betId: string, won: boolean) => {
    const bet = mergedPendingBets.find(b => b.id === betId);
    if (!bet) return;

    setResolvingBetId(betId);

    try {
      const newStatus = won ? 'WON' : 'LOST';
      const resolvedStat = won ? '✓ Résolu manuellement (WIN)' : '✗ Résolu manuellement (LOSE)';

      // Update in Supabase
      const success = await updateBetStatus(betId, newStatus as any, resolvedStat);
      if (!success) {
        setResolveResult({ success: false, message: 'Erreur lors de la mise à jour dans Supabase' });
        return;
      }

      // Update user's credits in Supabase
      if (bet.userId) {
        if (won) {
          // Add winnings to user's credits
          const { error: creditError } = await supabase
            .from('profiles')
            .select('credits, bets_won, jc_won')
            .eq('id', bet.userId)
            .single()
            .then(async ({ data, error }) => {
              if (error || !data) return { error };
              return supabase
                .from('profiles')
                .update({
                  credits: data.credits + bet.potentialPayout,
                  bets_won: (data.bets_won || 0) + 1,
                  jc_won: (data.jc_won || 0) + (bet.potentialPayout - bet.amount)
                })
                .eq('id', bet.userId);
            });

          if (creditError) {
            console.error('Error updating user credits:', creditError);
          }
        } else {
          // Record loss in stats
          const { error: lossError } = await supabase
            .from('profiles')
            .select('bets_lost')
            .eq('id', bet.userId)
            .single()
            .then(async ({ data, error }) => {
              if (error || !data) return { error };
              return supabase
                .from('profiles')
                .update({
                  bets_lost: (data.bets_lost || 0) + 1
                })
                .eq('id', bet.userId);
            });

          if (lossError) {
            console.error('Error updating user stats:', lossError);
          }
        }
      }

      // Remove from local list
      setAllPendingBets(prev => prev.filter(b => b.id !== betId));

      setResolveResult({
        success: true,
        message: `${bet.propTitle}: ${won ? 'WIN (+' + bet.potentialPayout + ' JC)' : 'LOSE'}`
      });
    } catch (err: any) {
      setResolveResult({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setResolvingBetId(null);
      setTimeout(() => setResolveResult(null), 3000);
    }
  };

  const handleResolveBets = async () => {
    if (!johnny.puuid) {
      setResolveResult({ success: false, message: 'PUUID non configuré' });
      return;
    }

    if (mergedPendingBets.length === 0) {
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

  // Fetch all users for reset feature
  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, pseudo, credits')
        .order('pseudo');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Reset a user's account
  const handleResetAccount = async () => {
    if (!selectedUserId) {
      setResetAccountResult({ success: false, message: 'Sélectionne un utilisateur' });
      return;
    }

    const selectedUser = allUsers.find(u => u.id === selectedUserId);
    if (!confirm(`Es-tu sûr de vouloir reset le compte de ${selectedUser?.pseudo} ?\n\n- Credits → 10000\n- Daily bonus → Reset\n- Stats → Remises à zéro\n- Paris → Supprimés`)) {
      return;
    }

    setResetAccountLoading(true);
    setResetAccountResult(null);

    try {
      // Reset profile in Supabase (including reset_at timestamp to prevent bet re-migration)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          credits: 10000,
          last_daily_bonus: null,
          total_bets: 0,
          bets_won: 0,
          bets_lost: 0,
          jc_won: 0,
          jc_lost: 0,
          reset_at: new Date().toISOString()
        })
        .eq('id', selectedUserId);

      if (profileError) throw profileError;

      // Delete user's bets from Supabase
      const deleteResult = await deleteUserBets(selectedUserId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Impossible de supprimer les paris');
      }

      setResetAccountResult({
        success: true,
        message: `Compte de ${selectedUser?.pseudo} reset ! (${deleteResult.deleted} paris supprimés)`
      });

      // Refresh users list and pending bets
      fetchAllUsers();
      loadAllPendingBets();
      setSelectedUserId('');
    } catch (err: any) {
      console.error('Reset account error:', err);
      setResetAccountResult({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setResetAccountLoading(false);
      setTimeout(() => setResetAccountResult(null), 5000);
    }
  };

  // Add credits to a specific user
  const handleAddCreditsToUser = async () => {
    if (!addCreditsUserId) {
      setAddCreditsResult({ success: false, message: 'Sélectionne un utilisateur' });
      return;
    }

    const amount = parseInt(addCreditsAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setAddCreditsResult({ success: false, message: 'Montant invalide' });
      return;
    }

    const selectedUser = allUsers.find(u => u.id === addCreditsUserId);
    if (!confirm(`Ajouter ${amount.toLocaleString()} JC à ${selectedUser?.pseudo} ?`)) {
      return;
    }

    setAddCreditsLoading(true);
    setAddCreditsResult(null);

    try {
      // Get current credits and add the amount
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', addCreditsUserId)
        .single();

      if (fetchError) throw fetchError;

      const newCredits = (currentProfile?.credits || 0) + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', addCreditsUserId);

      if (updateError) throw updateError;

      setAddCreditsResult({
        success: true,
        message: `+${amount.toLocaleString()} JC ajoutés à ${selectedUser?.pseudo} ! (Total: ${newCredits.toLocaleString()} JC)`
      });

      // Refresh users list
      fetchAllUsers();
      setAddCreditsUserId('');
    } catch (err: any) {
      console.error('Add credits error:', err);
      setAddCreditsResult({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setAddCreditsLoading(false);
      setTimeout(() => setAddCreditsResult(null), 5000);
    }
  };

  // Save webhook URL
  const handleSaveWebhook = () => {
    setWebhookUrl(webhookUrl);
    setWebhookResult({ success: true, message: 'Webhook URL sauvegardé !' });
    setTimeout(() => setWebhookResult(null), 3000);
  };

  // Test webhook
  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setWebhookResult({ success: false, message: 'Configure d\'abord l\'URL du webhook' });
      return;
    }

    setWebhookTestLoading(true);
    setWebhookResult(null);

    // Save first to ensure we use the current URL
    setWebhookUrl(webhookUrl);

    const success = await sendTestNotification(testChampion, testGameMode);

    if (success) {
      setWebhookResult({ success: true, message: 'Message de test envoyé ! Vérifie ton serveur Discord.' });
    } else {
      setWebhookResult({ success: false, message: 'Erreur lors de l\'envoi. Vérifie l\'URL du webhook.' });
    }

    setWebhookTestLoading(false);
    setTimeout(() => setWebhookResult(null), 5000);
  };

  // Handle odds change
  const handleOddsChange = (propId: string, value: string) => {
    setEditingOdds(prev => ({ ...prev, [propId]: value }));
  };

  const handleOddsSave = (propId: string) => {
    const value = parseFloat(editingOdds[propId]);
    if (!isNaN(value) && value >= 1) {
      setOdds(propId, value);
      setEditingOdds(prev => {
        const newState = { ...prev };
        delete newState[propId];
        return newState;
      });
    }
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

            <div className="space-y-3">
              {/* Force sync last game - primary action */}
              <button
                onClick={handleForceSyncLastGame}
                disabled={forceSyncLoading || syncing || !johnny.puuid}
                className="w-full py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {forceSyncLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Récupération de la dernière game...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Forcer sync dernière game
                  </>
                )}
              </button>

              {forceSyncResult && (
                <div className={`p-3 rounded-xl text-sm ${
                  forceSyncResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {forceSyncResult.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-xs">{forceSyncResult.message}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSyncMuseum}
                disabled={syncing || forceSyncLoading || !johnny.puuid}
                className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync toutes les games (20 dernières)
                  </>
                )}
              </button>

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
            </div>

            {syncResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm ${
                syncResult.success
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{syncResult.message}</span>
                </div>
              </div>
            )}

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

          {/* Manual Bet Resolution */}
          <div className="bg-gradient-to-b from-green-950/20 to-zinc-900 p-6 rounded-2xl border border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Gavel className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-white">Résolution Manuelle des Paris</h3>
              </div>
              <div className="flex items-center gap-2">
                {mergedPendingBets.length > 0 && (
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
                    {mergedPendingBets.length} en attente
                  </span>
                )}
                <button
                  onClick={loadAllPendingBets}
                  disabled={loadingBets}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all"
                  title="Rafraîchir les paris"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBets ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Paris de tous les utilisateurs. Choisis WIN ou LOSE pour chaque pari.
            </p>

            {resolveResult && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${
                resolveResult.success
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {resolveResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-xs">{resolveResult.message}</span>
                </div>
              </div>
            )}

            {loadingBets ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" />
                <div className="text-zinc-500 text-sm mt-2">Chargement des paris...</div>
              </div>
            ) : mergedPendingBets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mergedPendingBets.map(bet => (
                  <div key={bet.id} className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {bet.propTitle}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Mise: {bet.amount} JC • Gain: {bet.potentialPayout} JC (x{bet.odds.toFixed(1)})
                        </div>
                        <div className="text-xs text-primary mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {bet.userId ? `ID: ${bet.userId.slice(0, 8)}...` : 'Inconnu'}
                          {bet.championName && <span className="text-zinc-500">• {bet.championName}</span>}
                        </div>
                        {bet.comboId && (
                          <div className="text-xs text-purple-400 mt-0.5">
                            Combo {bet.comboIndex}/{bet.comboTotal}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleManualResolve(bet.id, true)}
                          disabled={resolvingBetId === bet.id}
                          className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {resolvingBetId === bet.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          WIN
                        </button>
                        <button
                          onClick={() => handleManualResolve(bet.id, false)}
                          disabled={resolvingBetId === bet.id}
                          className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {resolvingBetId === bet.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          LOSE
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-500 text-sm">
                Aucun pari en attente à résoudre
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

          {/* Odds Management */}
          <div className="bg-gradient-to-b from-amber-950/20 to-zinc-900 p-6 rounded-2xl border border-amber-500/30">
            <button
              onClick={() => {
                setOddsExpanded(!oddsExpanded);
              }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white">Gestion des Cotes</h3>
              </div>
              <div className="flex items-center gap-2">
                {Object.keys(customOdds).length > 0 && (
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
                    {Object.keys(customOdds).length} modifiées
                  </span>
                )}
                {oddsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </div>
            </button>

            {oddsExpanded && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-zinc-400">
                  Modifie les cotes de chaque pari. Les changements sont appliqués immédiatement.
                </p>

                {Object.keys(customOdds).length > 0 && (
                  <button
                    onClick={resetAllOdds}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Réinitialiser toutes les cotes
                  </button>
                )}

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {MOCK_PROPS.map(prop => {
                    const currentOdds = customOdds[prop.id] ?? prop.odds;
                    const isModified = customOdds[prop.id] !== undefined;
                    const isEditing = editingOdds[prop.id] !== undefined;

                    return (
                      <div
                        key={prop.id}
                        className={`p-3 rounded-lg border ${
                          isModified
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-zinc-800/50 border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {prop.title}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {prop.category} • Default: x{prop.odds.toFixed(1)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  value={editingOdds[prop.id]}
                                  onChange={(e) => handleOddsChange(prop.id, e.target.value)}
                                  className="w-20 p-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-600 text-white text-center font-mono focus:border-amber-500 focus:outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleOddsSave(prop.id);
                                    if (e.key === 'Escape') {
                                      setEditingOdds(prev => {
                                        const newState = { ...prev };
                                        delete newState[prop.id];
                                        return newState;
                                      });
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleOddsSave(prop.id)}
                                  className="p-1 text-green-400 hover:text-green-300"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOddsChange(prop.id, currentOdds.toString())}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition ${
                                    isModified
                                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                      : 'bg-zinc-700 text-white hover:bg-zinc-600'
                                  }`}
                                >
                                  x{currentOdds.toFixed(1)}
                                </button>
                                {isModified && (
                                  <button
                                    onClick={() => resetOdds(prop.id)}
                                    className="p-1 text-zinc-500 hover:text-red-400"
                                    title="Réinitialiser"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Account Reset */}
          <div className="bg-gradient-to-b from-red-950/20 to-zinc-900 p-6 rounded-2xl border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-white">Reset de Compte</h3>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Reset un compte utilisateur: 10000 crédits, stats à zéro, daily bonus reset, paris supprimés.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  onClick={() => {
                    if (allUsers.length === 0) fetchAllUsers();
                  }}
                  className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="">-- Sélectionner un utilisateur --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.pseudo} ({u.credits.toLocaleString()} JC)
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchAllUsers}
                  disabled={usersLoading}
                  className="px-3 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <button
                onClick={handleResetAccount}
                disabled={resetAccountLoading || !selectedUserId}
                className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {resetAccountLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reset en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Reset le compte
                  </>
                )}
              </button>

              {resetAccountResult && (
                <div className={`p-3 rounded-xl text-sm ${
                  resetAccountResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {resetAccountResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{resetAccountResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Credits to User */}
          <div className="bg-gradient-to-b from-amber-950/20 to-zinc-900 p-6 rounded-2xl border border-amber-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Coins className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white">Ajouter des Crédits</h3>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Ajoute des JohnnyCoins à un utilisateur. Utile pour compenser des bugs ou des erreurs.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={addCreditsUserId}
                  onChange={(e) => setAddCreditsUserId(e.target.value)}
                  onClick={() => {
                    if (allUsers.length === 0) fetchAllUsers();
                  }}
                  className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Sélectionner un utilisateur --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.pseudo} ({u.credits.toLocaleString()} JC)
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchAllUsers}
                  disabled={usersLoading}
                  className="px-3 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Montant à ajouter</label>
                <input
                  type="number"
                  value={addCreditsAmount}
                  onChange={(e) => setAddCreditsAmount(e.target.value)}
                  min="1"
                  step="100"
                  placeholder="1000"
                  className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleAddCreditsToUser}
                disabled={addCreditsLoading || !addCreditsUserId}
                className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {addCreditsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ajout en cours...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter les crédits
                  </>
                )}
              </button>

              {addCreditsResult && (
                <div className={`p-3 rounded-xl text-sm ${
                  addCreditsResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {addCreditsResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{addCreditsResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Discord Webhook */}
          <div className="bg-gradient-to-b from-indigo-950/20 to-zinc-900 p-6 rounded-2xl border border-indigo-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white">Discord Webhook</h3>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Configure le webhook Discord pour envoyer des notifications quand Johnny entre en game.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">URL du Webhook</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrlState(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                />
              </div>

              <button
                onClick={handleSaveWebhook}
                disabled={!webhookUrl}
                className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                Sauvegarder le Webhook
              </button>

              <div className="pt-4 border-t border-zinc-800">
                <div className="text-sm text-zinc-400 mb-3">Tester le webhook</div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Champion</label>
                    <select
                      value={testChampion}
                      onChange={(e) => setTestChampion(e.target.value)}
                      className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Yasuo">Yasuo</option>
                      <option value="Yone">Yone</option>
                      <option value="Riven">Riven</option>
                      <option value="Vayne">Vayne</option>
                      <option value="Lee Sin">Lee Sin</option>
                      <option value="Zed">Zed</option>
                      <option value="Akali">Akali</option>
                      <option value="Irelia">Irelia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Mode de jeu</label>
                    <select
                      value={testGameMode}
                      onChange={(e) => setTestGameMode(e.target.value)}
                      className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Ranked Solo/Duo">Ranked Solo/Duo</option>
                      <option value="Ranked Flex">Ranked Flex</option>
                      <option value="Normal Draft">Normal Draft</option>
                      <option value="ARAM">ARAM</option>
                      <option value="Clash">Clash</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleTestWebhook}
                  disabled={webhookTestLoading || !webhookUrl}
                  className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {webhookTestLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer un message de test
                    </>
                  )}
                </button>
              </div>

              {webhookResult && (
                <div className={`p-3 rounded-xl text-sm ${
                  webhookResult.success
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {webhookResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{webhookResult.message}</span>
                  </div>
                </div>
              )}
            </div>
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
