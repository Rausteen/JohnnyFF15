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
import { useAuthStore } from './services/authStore';
import { useMatchHistoryStore } from './services/matchHistoryStore';
import { useGameStore } from './services/gameStore';

const App = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const { loadConfig, loadMatches, syncMatches, matches } = useMatchHistoryStore();
  const { loadJohnnyConfig, startPolling, johnny, isPolling } = useGameStore();

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

  // Initialize surveillance on app load (always active)
  useEffect(() => {
    const initSurveillance = async () => {
      await loadJohnnyConfig();
    };
    initSurveillance();
  }, [loadJohnnyConfig]);

  // Auto-start polling when Johnny is configured
  useEffect(() => {
    if (johnny.puuid && !isPolling) {
      console.log('Auto-starting surveillance for', johnny.gameName);
      startPolling(30000);
    }
  }, [johnny.puuid, isPolling, startPolling]);

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
          <Route path="user/:userId" element={<PublicProfile />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;