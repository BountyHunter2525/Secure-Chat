import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_MODE_KEY = '@securechat_dark_mode';

// ── Colour palettes ────────────────────────────────────────────────────────────
export const lightColors = {
  // Backgrounds
  bg: '#ffffff',
  card: '#f8fafc',
  cardBorder: '#e2e8f0',
  headerBg: '#075E54',
  // Text
  text: '#1e293b',
  textSub: '#64748b',
  textMuted: '#94a3b8',
  textOnDark: '#ffffff',
  // Accents
  accent: '#075E54',
  accentLight: '#10b981',
  accentBtn: '#059669',
  danger: '#dc2626',
  // Input / borders
  inputBg: '#f1f5f9',
  divider: '#e2e8f0',
  // Switch track
  switchTrack: '#cbd5e1',
  // Additional professional colors
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  isDark: false,
};

export const darkColors = {
  // Backgrounds
  bg: '#0f172a',
  card: '#1e293b',
  cardBorder: '#334155',
  headerBg: '#1e293b',
  // Text
  text: '#f8fafc',
  textSub: '#cbd5e1',
  textMuted: '#64748b',
  textOnDark: '#f8fafc',
  // Accents
  accent: '#10b981',
  accentLight: '#34d399',
  accentBtn: '#059669',
  danger: '#ef4444',
  // Input / borders
  inputBg: '#334155',
  divider: '#334155',
  // Switch track
  switchTrack: '#475569',
  // Additional professional colors
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  isDark: true,
};

// ── Context ────────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load saved preference on startup
    AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {
      if (val === 'true') setIsDark(true);
      setLoaded(true);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(DARK_MODE_KEY, String(next));
      return next;
    });
  };

  const colors = isDark ? darkColors : lightColors;

  // Don't render children until preference is loaded to avoid flicker
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
