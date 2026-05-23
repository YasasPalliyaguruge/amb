import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteSettingsProvider, useSiteSettings } from './contexts/SiteSettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { dismissInitialBootLoader } from './utils/bootLoader';

const PublicPortfolio = lazy(() => import('./components/PublicPortfolio'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const PatientDashboard = lazy(() => import('./components/PatientDashboard'));
const ThemeStudio = lazy(() => import('./components/ThemeStudio'));

function RouteLoader() {
  const { siteSettings } = useSiteSettings();

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="theme-panel w-full max-w-sm px-8 py-10 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[rgb(var(--theme-line-rgb)/0.6)] border-t-[rgb(var(--theme-primary-rgb))]" />
        <div className="mt-4 space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[rgb(var(--theme-muted-rgb))]">{siteSettings.appCopy.routeLoaderTitle}</p>
          <p className="text-sm text-[rgb(var(--theme-text-rgb)/0.72)]">{siteSettings.appCopy.routeLoaderDescription}</p>
        </div>
      </div>
    </div>
  );
}

function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const hash = location.hash;

    const scrollToTarget = () => {
      const element = document.querySelector(hash);
      if (!element) {
        return;
      }

      const offset = 96;
      const targetTop = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo(0, Math.max(0, targetTop));
    };

    const timeoutIds = [80, 220, 520, 900, 1400, 2000].map((delay) => window.setTimeout(scrollToTarget, delay));
    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [location.hash, location.pathname]);

  return null;
}

function PatientRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <PatientDashboard />;
}

function AdminRoute() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user || role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
}

function AppShell() {
  const { siteSettings } = useSiteSettings();
  const location = useLocation();

  useEffect(() => {
    document.title = siteSettings.branding.siteTitle;
  }, [siteSettings.branding.siteTitle]);

  useEffect(() => {
    if (location.pathname === '/') {
      return;
    }

    dismissInitialBootLoader();
  }, [location.pathname]);

  return (
    <>
      <ScrollToHash />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--theme-surface-strong-rgb) / 0.95)',
            backdropFilter: 'blur(18px)',
            color: 'rgb(var(--theme-text-rgb) / 1)',
            borderRadius: '20px',
            border: '1px solid rgb(var(--theme-line-rgb) / 0.42)',
            boxShadow: '0 20px 60px rgb(var(--theme-text-rgb) / 0.14)',
          }
        }}
      />

      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<PublicPortfolio />} />
          <Route path="/admin-dashboard" element={<AdminRoute />} />
          <Route path="/client-dashboard" element={<PatientRoute />} />
          <Route path="/patient-dashboard" element={<Navigate to="/client-dashboard" replace />} />
        </Routes>
      </Suspense>

      <Suspense fallback={null}>
        <ThemeStudio />
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SiteSettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <div className="app-shell relative min-h-screen w-full overflow-x-hidden text-[rgb(var(--theme-text-rgb))]">
                <AppShell />
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </SiteSettingsProvider>
    </ErrorBoundary>
  );
}
