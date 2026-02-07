import React, { createContext, useContext, useState, useCallback } from 'react';

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

  return (
    <BackgroundOverrideContext.Provider value={{ overrideBackgroundUrl, setOverrideBackgroundUrl: setOverride }}>
      {children}
    </BackgroundOverrideContext.Provider>
  );
};

export const useBackgroundOverride = () => useContext(BackgroundOverrideContext);
