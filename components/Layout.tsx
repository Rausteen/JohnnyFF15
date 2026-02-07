import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import { useCreditsStore } from '../services/creditsStore';
import { useCosmeticsLookup } from '../services/useCosmeticsLookup';
import { BackgroundOverrideProvider, useBackgroundOverride } from '../services/backgroundOverride';

const LayoutInner = () => {
  const { profile } = useCreditsStore();
  const { getCosmetic } = useCosmeticsLookup();
  const equippedBackground = getCosmetic(profile?.equipped_background);
  const { overrideBackgroundUrl } = useBackgroundOverride();

  // Use the override URL (from PublicProfile) if set, otherwise use the user's own background
  const backgroundUrl = overrideBackgroundUrl || equippedBackground?.image_url;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      {/* Video background (override or user's own) */}
      {backgroundUrl && (
        <video
          key={backgroundUrl}
          src={backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
      )}

      {/* Default background when no video bg active */}
      {!backgroundUrl && (
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

const Layout = () => {
  return (
    <BackgroundOverrideProvider>
      <LayoutInner />
    </BackgroundOverrideProvider>
  );
};

export default Layout;
