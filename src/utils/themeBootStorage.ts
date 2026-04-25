import { defaultSiteSettings, sanitizeSiteSettings, type SiteSettings } from '../siteSettings/siteSettings';
import { sanitizeThemeState } from '../theme/themeUtils';
import { themePresets } from '../theme/themePresets';
import type { ContrastMode, SurfaceMode, ThemeState } from '../theme/types';

export const SITE_SETTINGS_CACHE_KEY = 'amb-site-settings-cache-v1';
export const THEME_OVERRIDE_STORAGE_KEY = 'amb-theme-studio-override-v1';
export const RESOLVED_THEME_CACHE_KEY = 'amb-resolved-theme-cache-v1';

export type CachedResolvedTheme = {
  cssVars: Record<string, string>;
  surfaceMode: SurfaceMode;
  contrastMode: ContrastMode;
  themeColor: string;
};

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/storage failures; theme boot should degrade gracefully.
  }
}

export function readStoredThemeOverride(): ThemeState | null {
  const parsed = readJson<ThemeState>(THEME_OVERRIDE_STORAGE_KEY);
  return parsed ? sanitizeThemeState(parsed, themePresets) : null;
}

export function writeStoredThemeOverride(theme: ThemeState | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (theme) {
      window.localStorage.setItem(THEME_OVERRIDE_STORAGE_KEY, JSON.stringify(theme));
    } else {
      window.localStorage.removeItem(THEME_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; live theme state still renders in-memory.
  }
}

export function readCachedSiteSettings(): SiteSettings | null {
  const parsed = readJson<SiteSettings>(SITE_SETTINGS_CACHE_KEY);
  return parsed ? sanitizeSiteSettings(parsed) : null;
}

export function writeCachedSiteSettings(siteSettings: SiteSettings) {
  writeJson(SITE_SETTINGS_CACHE_KEY, sanitizeSiteSettings(siteSettings));
}

export function readCachedResolvedTheme(): CachedResolvedTheme | null {
  return readJson<CachedResolvedTheme>(RESOLVED_THEME_CACHE_KEY);
}

export function writeCachedResolvedTheme(theme: CachedResolvedTheme) {
  writeJson(RESOLVED_THEME_CACHE_KEY, theme);
}

export function getInitialSiteSettings() {
  return readCachedSiteSettings() ?? defaultSiteSettings;
}
