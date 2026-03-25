import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const AuthContext = createContext(null);

function getStoredAuth() {
  try {
    const stored = sessionStorage.getItem('minitruck_auth');
    if (stored) {
      const data = JSON.parse(stored);
      // Check if session is expired (8 hours)
      if (Date.now() - data.loggedInAt > 8 * 60 * 60 * 1000) {
        sessionStorage.removeItem('minitruck_auth');
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
    sessionStorage.setItem('minitruck_auth', JSON.stringify(data));
    setAuth(data);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('minitruck_auth');
    setAuth(null);
  }, []);

  const value = useMemo(() => ({
    user: auth?.user ?? null,
    role: auth?.role ?? null,
    token: auth?.token ?? null,
    isAuthenticated: !!auth,
    login,
    logout,
  }), [auth, login, logout]);

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
