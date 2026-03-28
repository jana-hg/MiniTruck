import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const ThemeContext = createContext(null);

function getStoredTheme() {
  try {
    return localStorage.getItem('minitruck_theme') || 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    localStorage.setItem('minitruck_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update native UI for APKs
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0F172A' : '#F8FAFC';
    
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      StatusBar.setBackgroundColor({ color: bgColor });
    }

    // Update browser theme-color
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', bgColor);

    // Update favicon based on theme
    const link = document.querySelector("link[rel='icon']");
    if (link) link.href = isDark ? '/truck-dark.svg' : '/truck-light.svg';
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
