import { createContext, type CSSProperties, ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { defaultThemePreset, themePresets } from '../theme/themePresets';
import { createThemeState, randomThemeState, resolveTheme, sanitizeThemeState } from '../theme/themeUtils';
import type { ContrastMode, SurfaceMode, ThemeState } from '../theme/types';
import { useSiteSettings } from './SiteSettingsContext';
import {
  readStoredThemeOverride,
  writeStoredThemeOverride,
  writeCachedResolvedTheme,
} from '../utils/themeBootStorage';

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

export function resolveVisitorTheme(
  siteTheme: ThemeState,
  visitorOverride: ThemeState | null,
  themeStudioEnabled: boolean
) {
  return sanitizeThemeState(themeStudioEnabled && visitorOverride ? visitorOverride : siteTheme, themePresets);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { siteSettings } = useSiteSettings();
  const [visitorOverride, setVisitorOverride] = useState<ThemeState | null>(() =>
    siteSettings.themeStudioEnabled ? readStoredThemeOverride() : null
  );

  useEffect(() => {
    if (!siteSettings.themeStudioEnabled || visitorOverride) {
      return;
    }

    const storedOverride = readStoredThemeOverride();
    if (storedOverride) {
      setVisitorOverride(storedOverride);
    }
  }, [siteSettings.themeStudioEnabled, visitorOverride]);

  useEffect(() => {
    if (siteSettings.themeStudioEnabled) {
      writeStoredThemeOverride(visitorOverride);
      return;
    }

    setVisitorOverride(null);
    writeStoredThemeOverride(null);
  }, [siteSettings.themeStudioEnabled, visitorOverride]);

  const theme = useMemo(
    () => resolveVisitorTheme(siteSettings.theme, visitorOverride, siteSettings.themeStudioEnabled),
    [siteSettings.theme, siteSettings.themeStudioEnabled, visitorOverride]
  );

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    Object.entries(resolvedTheme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });
    root.dataset.surfaceMode = theme.controls.surfaceMode;
    root.dataset.contrastMode = theme.controls.contrastMode;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme.colors.primary);
    }

    writeCachedResolvedTheme({
      cssVars: resolvedTheme.cssVars,
      surfaceMode: theme.controls.surfaceMode,
      contrastMode: theme.controls.contrastMode,
      themeColor: theme.colors.primary,
    });
  }, [resolvedTheme.cssVars, theme.colors.primary, theme.controls.contrastMode, theme.controls.surfaceMode]);

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    resolvedTheme,
    presets: themePresets,
    themeStudioEnabled: siteSettings.themeStudioEnabled,
    isUsingLiveSiteTheme: !siteSettings.themeStudioEnabled || visitorOverride == null,
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
