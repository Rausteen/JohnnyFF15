import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import MyBets from './pages/MyBets';
import History from './pages/History';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import PublicProfile from './pages/PublicProfile';
import TeamBalancer from './pages/TeamBalancer';
import { useAuthStore } from './services/authStore';
import { useMatchHistoryStore } from './services/matchHistoryStore';
import { useGameStore } from './services/gameStore';

const App = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const { loadConfig, loadMatches, syncMatches, matches } = useMatchHistoryStore();
  const { loadTrackedPlayers, startPolling, trackedPlayers, isPolling } = useGameStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Initialize match history on app load
  useEffect(() => {
    const initMatchHistory = async () => {
      await loadConfig();
      await loadMatches();

      // If no matches in DB, do initial sync
      const currentMatches = useMatchHistoryStore.getState().matches;
      if (currentMatches.length === 0) {
        console.log('No matches in DB, syncing initial history...');
        await syncMatches();
      }
    };

    initMatchHistory();
  }, [loadConfig, loadMatches, syncMatches]);

  // Initialize tracked players on app load
  useEffect(() => {
    const initPlayers = async () => {
      await loadTrackedPlayers();
    };
    initPlayers();
  }, [loadTrackedPlayers]);

  // Auto-start polling when players are loaded
  useEffect(() => {
    if (trackedPlayers.length > 0 && !isPolling) {
      console.log(`Auto-starting surveillance for ${trackedPlayers.length} player(s)`);
      startPolling(30000);
    }
  }, [trackedPlayers.length, isPolling, startPolling]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-bets" element={<MyBets />} />
          <Route path="history" element={<History />} />
          <Route path="admin" element={<Admin />} />
          <Route path="login" element={<Login />} />
          <Route path="profile" element={<Profile />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="team-balancer" element={<TeamBalancer />} />
          <Route path="user/:userId" element={<PublicProfile />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
