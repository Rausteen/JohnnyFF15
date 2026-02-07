import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import { useCreditsStore } from '../services/creditsStore';
import { useCosmeticsLookup } from '../services/useCosmeticsLookup';

const Layout = () => {
  const { profile } = useCreditsStore();
  const { getCosmetic } = useCosmeticsLookup();
  const equippedBackground = getCosmetic(profile?.equipped_background);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      {/* User video background */}
      {equippedBackground?.image_url && (
        <video
          key={equippedBackground.id}
          src={equippedBackground.image_url}
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
      )}

      {/* Global Background Elements (hidden when video bg active) */}
      {!equippedBackground?.image_url && (
        <>
          <div className="fixed inset-0 bg-grid z-0 pointer-events-none opacity-[0.4]"></div>
          <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"></div>
          <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 z-0 pointer-events-none"></div>
        </>
      )}

      <div className="relative z-10">
        <TopBar />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;