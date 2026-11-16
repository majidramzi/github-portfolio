import { useCallback, useEffect, useState } from 'react';
import { siteConfig } from '../config/site';
import type { ThemeMode, ThemePreference } from '../types/portfolio';

const THEME_STORAGE_KEY = 'github-portfolio:theme';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(defaultPreference: ThemePreference): ThemeMode {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
  } catch {
    // Ignore storage access errors
  }

  if (defaultPreference === 'light' || defaultPreference === 'dark') {
    return defaultPreference;
  }

  return getSystemTheme();
}

export function useTheme(defaultPreference: ThemePreference = siteConfig.defaultTheme ?? 'system') {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme(defaultPreference));
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#020617' : '#f8fafc');
    }
  }, [theme]);

  // Keep in sync with OS color scheme changes when user has not explicitly chosen a theme
  useEffect(() => {
    if (hasExplicitChoice || defaultPreference !== 'system') {
      return;
    }
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [hasExplicitChoice, defaultPreference]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    setHasExplicitChoice(true);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
