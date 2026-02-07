import React, { useRef, useEffect, memo } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import { useCreditsStore } from '../services/creditsStore';
import { useCosmeticsLookup } from '../services/useCosmeticsLookup';
import { BackgroundOverrideProvider, useBackgroundOverride } from '../services/backgroundOverride';

// Memoized video component — swaps src via ref instead of remounting the DOM element
const VideoBackground = memo(({ src }: { src: string | undefined }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentSrc = useRef<string | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (src && src !== currentSrc.current) {
      currentSrc.current = src;
      video.src = src;
      video.load();
      video.play().catch(() => {});
    } else if (!src) {
      currentSrc.current = undefined;
      video.removeAttribute('src');
      video.load();
    }
  }, [src]);

  if (!src) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0 will-change-transform"
    />
  );
});

const DefaultBackground = memo(() => (
  <>
    <div className="fixed inset-0 bg-grid z-0 pointer-events-none opacity-[0.4]"></div>
    <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"></div>
    <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 z-0 pointer-events-none"></div>
  </>
));

const LayoutInner = () => {
  const { profile } = useCreditsStore();
  const { getCosmetic } = useCosmeticsLookup();
  const equippedBackground = getCosmetic(profile?.equipped_background);
  const { overrideBackgroundUrl } = useBackgroundOverride();

  const backgroundUrl = overrideBackgroundUrl || equippedBackground?.image_url;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      {backgroundUrl ? (
        <VideoBackground src={backgroundUrl} />
      ) : (
        <DefaultBackground />
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

const Layout = () => (
  <BackgroundOverrideProvider>
    <LayoutInner />
  </BackgroundOverrideProvider>
);

export default Layout;
