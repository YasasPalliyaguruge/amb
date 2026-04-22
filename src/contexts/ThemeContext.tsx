import { createContext, type CSSProperties, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { defaultThemePreset, themePresets } from '../theme/themePresets';
import { createThemeState, randomThemeState, resolveTheme, sanitizeThemeState } from '../theme/themeUtils';
import type { ContrastMode, SurfaceMode, ThemeState } from '../theme/types';
import { useSiteSettings } from './SiteSettingsContext';

const STORAGE_KEY = 'amb-theme-studio-override-v1';

interface ThemeContextType {
  theme: ThemeState;
  resolvedTheme: ReturnType<typeof resolveTheme>;
  presets: typeof themePresets;
  themeStudioEnabled: boolean;
  isUsingLiveSiteTheme: boolean;
  setPreset: (presetId: string) => void;
  updateColor: (key: keyof ThemeState['colors'], value: string) => void;
  updateControl: <T extends keyof ThemeState['controls']>(key: T, value: ThemeState['controls'][T]) => void;
  resetTheme: () => void;
  randomizeTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readStoredThemeOverride(): ThemeState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ThemeState;
    return sanitizeThemeState(parsed, themePresets);
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { siteSettings } = useSiteSettings();
  const [visitorOverride, setVisitorOverride] = useState<ThemeState | null>(() => readStoredThemeOverride());

  useEffect(() => {
    if (siteSettings.themeStudioEnabled) {
      if (visitorOverride) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visitorOverride));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    setVisitorOverride(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [siteSettings.themeStudioEnabled, visitorOverride]);

  const theme = useMemo(
    () => sanitizeThemeState(visitorOverride ?? siteSettings.theme, themePresets),
    [siteSettings.theme, visitorOverride]
  );

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    resolvedTheme,
    presets: themePresets,
    themeStudioEnabled: siteSettings.themeStudioEnabled,
    isUsingLiveSiteTheme: visitorOverride == null,
    setPreset: (presetId) => {
      const preset = themePresets.find((entry) => entry.id === presetId) || defaultThemePreset;
      setVisitorOverride(createThemeState(preset));
    },
    updateColor: (key, value) => {
      setVisitorOverride((currentOverride) =>
        sanitizeThemeState(
          {
            ...(currentOverride ?? siteSettings.theme),
            colors: {
              ...(currentOverride ?? siteSettings.theme).colors,
              [key]: value,
            },
          },
          themePresets
        )
      );
    },
    updateControl: (key, value) => {
      setVisitorOverride((currentOverride) =>
        sanitizeThemeState(
          {
            ...(currentOverride ?? siteSettings.theme),
            controls: {
              ...(currentOverride ?? siteSettings.theme).controls,
              [key]: value,
            },
          },
          themePresets
        )
      );
    },
    resetTheme: () => {
      setVisitorOverride(null);
    },
    randomizeTheme: () => {
      setVisitorOverride((currentOverride) => randomThemeState(currentOverride ?? siteSettings.theme, themePresets));
    },
  }), [resolvedTheme, siteSettings.theme, siteSettings.themeStudioEnabled, theme, visitorOverride]);

  return (
    <ThemeContext.Provider value={value}>
      <div
        className="theme-root relative min-h-screen"
        style={resolvedTheme.cssVars as CSSProperties}
        data-surface-mode={theme.controls.surfaceMode as SurfaceMode}
        data-contrast-mode={theme.controls.contrastMode as ContrastMode}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
