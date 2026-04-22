import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSiteSettings, sanitizeSiteSettings, siteSettingsDocId, type SiteSettings } from '../siteSettings/siteSettings';

interface SiteSettingsContextValue {
  siteSettings: SiteSettings;
  loading: boolean;
  error: string;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

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

            setSiteSettings(snapshot.exists() ? sanitizeSiteSettings(snapshot.data()) : defaultSiteSettings);
            setError('');
            setLoading(false);
          },
          (snapshotError) => {
            console.error('Error loading site settings:', snapshotError);
            if (!isMounted) {
              return;
            }
            setSiteSettings(defaultSiteSettings);
            setError('The live website settings could not be loaded, so local defaults are being used.');
            setLoading(false);
          }
        );
      } catch (snapshotError) {
        console.error('Error preparing site settings subscription:', snapshotError);
        if (!isMounted) {
          return;
        }
        setSiteSettings(defaultSiteSettings);
        setError('The live website settings could not be loaded, so local defaults are being used.');
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
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
