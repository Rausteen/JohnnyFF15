import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import { useAuthStore } from './services/authStore';
import { useMatchHistoryStore } from './services/matchHistoryStore';
import { useGameStore } from './services/gameStore';

// Lazy loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyBets = lazy(() => import('./pages/MyBets'));
const History = lazy(() => import('./pages/History'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const TeamBalancer = lazy(() => import('./pages/TeamBalancer'));
const Shop = lazy(() => import('./pages/Shop'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
      <p className="text-gray-400">Chargement...</p>
    </div>
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
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
            <Route path="shop" element={<Shop />} />
            <Route path="user/:userId" element={<PublicProfile />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

export default App;
