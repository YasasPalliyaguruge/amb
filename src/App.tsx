/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteSettingsProvider, useSiteSettings } from './contexts/SiteSettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SplineBackground from './components/cinematic/SplineBackground';
import PublicSplinePreloader from './components/cinematic/PublicSplinePreloader';
import type { HomepageSectionId } from './siteSettings/siteSettings';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const PatientDashboard = lazy(() => import('./components/PatientDashboard'));
const ThemeStudio = lazy(() => import('./components/ThemeStudio'));
const LoginModal = lazy(() => import('./components/LoginModal'));
const Footer = lazy(() => import('./components/Footer'));
const Ethos = lazy(() => import('./components/Ethos'));
const ClinicalPractice = lazy(() => import('./components/ClinicalPractice'));
const AcademicTenure = lazy(() => import('./components/AcademicTenure'));
const DoodleArt = lazy(() => import('./components/DoodleArt'));
const ConsultationExperience = lazy(() => import('./components/ConsultationExperience'));
const ConsultationDesk = lazy(() => import('./components/ConsultationDesk'));

function preloadPublicExperience() {
  return Promise.all([
    import('./components/Ethos'),
    import('./components/ClinicalPractice'),
    import('./components/AcademicTenure'),
    import('./components/DoodleArt'),
    import('./components/ConsultationExperience'),
    import('./components/ConsultationDesk'),
    import('./components/Footer'),
    import('./components/LoginModal'),
  ]);
}

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

function SectionLoader() {
  return (
    <div className="section-shell section-shell--airy">
      <div className="section-frame">
        <div className="theme-panel-soft min-h-[12rem] animate-pulse" />
      </div>
    </div>
  );
}

function CinematicBackdrop() {
  const shouldReduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const motionFactor = theme.controls.motionDensity;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(var(--theme-primary-rgb)/0.12),_transparent_34%),radial-gradient(circle_at_20%_25%,_rgb(var(--theme-accent-rgb)/0.12),_transparent_25%),linear-gradient(180deg,rgb(var(--theme-bg-rgb)/1),rgb(var(--theme-bg-rgb)/0.96))]" />
      <motion.div
        className="absolute left-[-8rem] top-[-7rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgb(var(--theme-primary-rgb)/0.22),_transparent_70%)] blur-3xl"
        animate={shouldReduceMotion ? undefined : { x: [0, 30 * motionFactor, -18 * motionFactor, 0], y: [0, 22 * motionFactor, 8 * motionFactor, 0], scale: [1, 1.08, 0.98, 1] }}
        transition={shouldReduceMotion ? undefined : { duration: 20 / motionFactor, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-10rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgb(var(--theme-accent-rgb)/0.18),_transparent_70%)] blur-3xl"
        animate={shouldReduceMotion ? undefined : { x: [0, -26 * motionFactor, 16 * motionFactor, 0], y: [0, 20 * motionFactor, -14 * motionFactor, 0], scale: [1, 0.96, 1.08, 1] }}
        transition={shouldReduceMotion ? undefined : { duration: 24 / motionFactor, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgb(var(--theme-secondary-rgb)/0.18),_transparent_74%)] blur-3xl"
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.04, 0.94, 1], y: [0, -24 * motionFactor, -10 * motionFactor, 0] }}
        transition={shouldReduceMotion ? undefined : { duration: 26 / motionFactor, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return <motion.div aria-hidden="true" className="scroll-progress" style={{ scaleX }} />;
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

function MainPortfolio() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSplineBackgroundReady, setIsSplineBackgroundReady] = useState(false);
  const [isPreloaderSplineReady, setIsPreloaderSplineReady] = useState(false);
  const [arePublicSectionsReady, setArePublicSectionsReady] = useState(false);
  const [arePublicAssetsReady, setArePublicAssetsReady] = useState(false);
  const [hasMinimumLoaderTimeElapsed, setHasMinimumLoaderTimeElapsed] = useState(false);
  const [hasLoaderSafetyElapsed, setHasLoaderSafetyElapsed] = useState(false);
  const [shouldRenderPreloader, setShouldRenderPreloader] = useState(true);
  const { siteSettings } = useSiteSettings();

  const isPublicExperienceReady =
    arePublicSectionsReady &&
    arePublicAssetsReady &&
    hasMinimumLoaderTimeElapsed &&
    (isPreloaderSplineReady || hasLoaderSafetyElapsed) &&
    (isSplineBackgroundReady || hasLoaderSafetyElapsed);

  useEffect(() => {
    let isMounted = true;

    preloadPublicExperience().finally(() => {
      if (isMounted) {
        setArePublicSectionsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const waitForWindowLoad = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }

      window.addEventListener('load', () => resolve(), { once: true });
    });

    const waitForFonts = 'fonts' in document ? document.fonts.ready.then(() => undefined) : Promise.resolve();

    Promise.all([waitForWindowLoad, waitForFonts]).finally(() => {
      if (isMounted) {
        setArePublicAssetsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const minimumTimer = window.setTimeout(() => setHasMinimumLoaderTimeElapsed(true), 3200);
    // Avoid a permanent blank page if an external Spline request stalls.
    const safetyTimer = window.setTimeout(() => setHasLoaderSafetyElapsed(true), 8500);

    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('public-site-loading', !isPublicExperienceReady);

    return () => {
      document.body.classList.remove('public-site-loading');
    };
  }, [isPublicExperienceReady]);

  useEffect(() => {
    if (!isPublicExperienceReady) {
      setShouldRenderPreloader(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setShouldRenderPreloader(false), 650);
    return () => window.clearTimeout(timeoutId);
  }, [isPublicExperienceReady]);

  const visibleSections = siteSettings.homepage.sectionOrder.filter(
    (sectionId) => siteSettings.homepage.visibility[sectionId]
  );

  const renderSection = (sectionId: HomepageSectionId): ReactNode => {
    switch (sectionId) {
      case 'hero':
        return <Hero />;
      case 'profile':
        return <Ethos />;
      case 'credentials':
        return <AcademicTenure />;
      case 'practice':
        return <ClinicalPractice />;
      case 'art':
        return <DoodleArt />;
      case 'consultation':
        return <ConsultationExperience />;
      case 'booking':
        return <ConsultationDesk onLoginClick={() => setIsLoginModalOpen(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className={`public-site relative ${isPublicExperienceReady ? 'public-site--ready' : 'public-site--loading'}`}>
      <SplineBackground onSceneReady={() => setIsSplineBackgroundReady(true)} />
      {shouldRenderPreloader && (
        <PublicSplinePreloader
          isExiting={isPublicExperienceReady}
          onSceneReady={() => setIsPreloaderSplineReady(true)}
        />
      )}
      <div className="public-site__content" aria-hidden={isPublicExperienceReady ? undefined : 'true'}>
        <a href="#main-content" className="skip-link">
          {siteSettings.appCopy.skipLinkLabel}
        </a>
        <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
        <main id="main-content" className="pb-28 lg:pb-0">
          {visibleSections.map((sectionId) => (
            <Suspense key={sectionId} fallback={sectionId === 'hero' ? null : <SectionLoader />}>
              {renderSection(sectionId)}
            </Suspense>
          ))}
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
        <Suspense fallback={null}>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </Suspense>
      </div>
    </div>
  );
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

  useEffect(() => {
    document.title = siteSettings.branding.siteTitle;
  }, [siteSettings.branding.siteTitle]);

  return (
    <>
      <ScrollProgress />
      <ScrollToHash />
      <CinematicBackdrop />

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
          <Route path="/" element={<MainPortfolio />} />
          <Route path="/admin-dashboard" element={<AdminRoute />} />
          <Route path="/patient-dashboard" element={<PatientRoute />} />
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
