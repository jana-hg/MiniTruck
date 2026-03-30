import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const AuthContext = createContext(null);

function getStoredAuth() {
  try {
    const stored = localStorage.getItem('minitruck_auth');
    if (stored) {
      const data = JSON.parse(stored);
      // Check if session is expired (30 days)
      if (Date.now() - data.loggedInAt > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('minitruck_auth');
        return null;
      }
      return data;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth);

  const login = useCallback((user, role, token) => {
    const data = { user, role, token, loggedInAt: Date.now() };
    localStorage.setItem('minitruck_auth', JSON.stringify(data));
    setAuth(data);
  }, []);

  const logout = useCallback(() => {
    // Update biometric backup before clearing session
    // so fingerprint login can restore the session after logout
    try {
      const bioStr = localStorage.getItem('minitruck_biometric');
      const authStr = localStorage.getItem('minitruck_auth');
      if (bioStr && authStr) {
        const bio = JSON.parse(bioStr);
        bio.backupAuth = JSON.parse(authStr);
        localStorage.setItem('minitruck_biometric', JSON.stringify(bio));
      }
    } catch {}
    localStorage.removeItem('minitruck_auth');
    // Keep minitruck_biometric so fingerprint login works after logout
    setAuth(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setAuth(prev => {
      if (!prev) return prev;
      const updated = { ...prev, user: { ...prev.user, ...updates } };
      localStorage.setItem('minitruck_auth', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(() => ({
    user: auth?.user ?? null,
    role: auth?.role ?? null,
    token: auth?.token ?? null,
    isAuthenticated: !!auth,
    login,
    logout,
    updateUser,
  }), [auth, login, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
