import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSiteSettings, sanitizeSiteSettings, siteSettingsDocId, type SiteSettings } from '../siteSettings/siteSettings';
import { getInitialSiteSettings, writeCachedSiteSettings } from '../utils/themeBootStorage';

interface SiteSettingsContextValue {
  siteSettings: SiteSettings;
  loading: boolean;
  error: string;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);
const SITE_SETTINGS_INITIAL_FALLBACK_MS = 4500;

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => getInitialSiteSettings());
  const [loading, setLoading] = useState(siteSettings === defaultSiteSettings);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    const fallbackTimer = window.setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, SITE_SETTINGS_INITIAL_FALLBACK_MS);

    void (async () => {
      try {
        const [{ doc, onSnapshot }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('../firebase-db'),
        ]);

        if (!isMounted) {
          return;
        }

        unsubscribe = onSnapshot(
          doc(db, 'settings', siteSettingsDocId),
          (snapshot) => {
            if (!isMounted) {
              return;
            }

            window.clearTimeout(fallbackTimer);
            const nextSettings = snapshot.exists() ? sanitizeSiteSettings(snapshot.data()) : defaultSiteSettings;
            setSiteSettings(nextSettings);
            writeCachedSiteSettings(nextSettings);
            setError('');
            setLoading(false);
          },
          (snapshotError) => {
            console.error('Error loading site settings:', snapshotError);
            if (!isMounted) {
              return;
            }
            window.clearTimeout(fallbackTimer);
            setError('The live website settings could not be loaded, so local defaults are being used.');
            setLoading(false);
          }
        );
      } catch (snapshotError) {
        console.error('Error preparing site settings subscription:', snapshotError);
        if (!isMounted) {
          return;
        }
        window.clearTimeout(fallbackTimer);
        setError('The live website settings could not be loaded, so local defaults are being used.');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      siteSettings,
      loading,
      error,
    }),
    [error, loading, siteSettings]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}
