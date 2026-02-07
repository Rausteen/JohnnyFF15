import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface BackgroundOverrideContextType {
  overrideBackgroundUrl: string | null;
  setOverrideBackgroundUrl: (url: string | null) => void;
}

const BackgroundOverrideContext = createContext<BackgroundOverrideContextType>({
  overrideBackgroundUrl: null,
  setOverrideBackgroundUrl: () => {},
});

export const BackgroundOverrideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrideBackgroundUrl, setOverrideBackgroundUrl] = useState<string | null>(null);

  const setOverride = useCallback((url: string | null) => {
    setOverrideBackgroundUrl(url);
  }, []);

  // Stable context value — only creates a new object when the URL actually changes
  const value = useMemo(
    () => ({ overrideBackgroundUrl, setOverrideBackgroundUrl: setOverride }),
    [overrideBackgroundUrl, setOverride]
  );

  return (
    <BackgroundOverrideContext.Provider value={value}>
      {children}
    </BackgroundOverrideContext.Provider>
  );
};

export const useBackgroundOverride = () => useContext(BackgroundOverrideContext);
