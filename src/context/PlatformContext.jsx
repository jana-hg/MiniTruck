import { createContext, useContext } from 'react';

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  // Read VITE_APP_PLATFORM from environment at build time
  const platform = import.meta.env.VITE_APP_PLATFORM || 'web';
  const isNative = platform !== 'web';

  const value = {
    platform, // 'customer' | 'driver' | 'web'
    isNative, // true if running as APK
    isCustomer: platform === 'customer',
    isDriver: platform === 'driver',
    isWeb: platform === 'web',
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}

export default PlatformContext;
