import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import Navbar from './Navbar';
import Hero from './Hero';
import PublicSplinePreloader from './cinematic/PublicSplinePreloader';
import {
  arePublicSectionsPrepared,
  getPublicStartupUiState,
  isHeroExperiencePrepared,
  PUBLIC_LOADER_SCENE_EXIT_MS,
  PUBLIC_MINIMUM_LOADER_MS,
  PUBLIC_COFFEE_LOADER_VISIBLE_MS,
  PUBLIC_SITE_HANDOFF_MS,
  shouldDismissInitialBootLoader,
  type PublicStartupPhase,
} from './cinematic/publicStartup';
import { isMobileSplineViewport, warmPublicMainSplineAssets } from './cinematic/splineWarmup';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import type { HomepageSectionId } from '../siteSettings/siteSettings';
import { recordPerformanceMetric } from '../utils/performanceMonitor';
import { dismissInitialBootLoader } from '../utils/bootLoader';
import { preloadArtImages } from '../utils/artAssets';

let publicExperienceModulesPromise: Promise<void> | null = null;

const SplineBackground = lazy(() => import('./cinematic/SplineBackground'));
const LoginModal = lazy(() => import('./LoginModal'));
const Footer = lazy(() => import('./Footer'));
const Ethos = lazy(() => import('./Ethos'));
const ClinicalPractice = lazy(() => import('./ClinicalPractice'));
const AcademicTenure = lazy(() => import('./AcademicTenure'));
const DoodleArt = lazy(() => import('./DoodleArt'));
const ConsultationExperience = lazy(() => import('./ConsultationExperience'));
const ConsultationDesk = lazy(() => import('./ConsultationDesk'));

function preloadPublicBelowFoldExperience() {
  if (!publicExperienceModulesPromise) {
    publicExperienceModulesPromise = Promise.all([
      import('./Ethos'),
      import('./ClinicalPractice'),
      import('./AcademicTenure'),
      import('./DoodleArt'),
      import('./ConsultationExperience'),
      import('./ConsultationDesk'),
      import('./Footer'),
      import('./LoginModal'),
    ]).then(() => undefined);
  }

  return publicExperienceModulesPromise;
}

const publicAssetsReadyPromise = (() => {
  const waitForDocumentReady = new Promise<void>((resolve) => {
    if (document.readyState !== 'loading') {
      resolve();
      return;
    }

    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  const waitForFonts =
    'fonts' in document
      ? Promise.race([
          document.fonts.ready.then(() => undefined),
          new Promise<void>((resolve) => window.setTimeout(resolve, PUBLIC_MINIMUM_LOADER_MS)),
        ])
      : Promise.resolve();

  return Promise.all([waitForDocumentReady, waitForFonts]).then(() => undefined);
})();

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

export default function PublicPortfolio() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => isMobileSplineViewport());
  const [isSplineBackgroundReady, setIsSplineBackgroundReady] = useState(false);
  const [isPreloaderSplineReady, setIsPreloaderSplineReady] = useState(false);
  const [arePublicAssetsReady, setArePublicAssetsReady] = useState(false);
  const [arePublicSectionsReady, setArePublicSectionsReady] = useState(false);
  const [hasMinimumLoaderTimeElapsed, setHasMinimumLoaderTimeElapsed] = useState(false);
  const [hasCoffeeLoaderVisibleTimeElapsed, setHasCoffeeLoaderVisibleTimeElapsed] = useState(false);
  const [startupPhase, setStartupPhase] = useState<PublicStartupPhase>('loading');
  const { siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const shouldUseSplinePreloader = !isMobileViewport;
  const shouldLoadHeroExperience = isMobileViewport || isPreloaderSplineReady;
  const publicSectionsPrepared = arePublicSectionsPrepared({ arePublicSectionsReady });
  const effectivePublicAssetsReady = arePublicAssetsReady;
  const effectiveSplineBackgroundReady = isSplineBackgroundReady;
  const effectivePreloaderReady = shouldUseSplinePreloader ? isPreloaderSplineReady : true;
  const effectiveCoffeeLoaderVisibleTimeElapsed = shouldUseSplinePreloader ? hasCoffeeLoaderVisibleTimeElapsed : true;
  const shouldLoadMainSplineScene = shouldLoadHeroExperience;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobileViewport(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const heroExperiencePrepared = useMemo(
    () =>
      isHeroExperiencePrepared({
        areSiteSettingsReady: !siteSettingsLoading,
        arePublicAssetsReady: effectivePublicAssetsReady,
        hasMinimumLoaderTimeElapsed,
        hasCoffeeLoaderVisibleTimeElapsed: effectiveCoffeeLoaderVisibleTimeElapsed,
        isPreloaderSplineReady: effectivePreloaderReady,
        isSplineBackgroundReady: effectiveSplineBackgroundReady,
      }),
    [
      effectivePublicAssetsReady,
      siteSettingsLoading,
      hasMinimumLoaderTimeElapsed,
      effectiveCoffeeLoaderVisibleTimeElapsed,
      effectivePreloaderReady,
      effectiveSplineBackgroundReady,
    ]
  );

  const {
    isPublicExperienceReady,
    isPublicExperienceVisible,
    shouldRevealSplineBackground,
    shouldRenderPreloader,
    shouldHidePreloaderScene,
    shouldFadePreloaderLayer,
  } = useMemo(() => getPublicStartupUiState(startupPhase), [startupPhase]);

  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);
  const handleBackgroundReady = useCallback(() => setIsSplineBackgroundReady(true), []);
  const handlePreloaderReady = useCallback(() => setIsPreloaderSplineReady(true), []);

  useEffect(() => {
    let isMounted = true;

    publicAssetsReadyPromise.finally(() => {
      if (isMounted) {
        setArePublicAssetsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadHeroExperience) {
      return;
    }

    let isMounted = true;
    void warmPublicMainSplineAssets();
    preloadArtImages(siteSettings);

    preloadPublicBelowFoldExperience().then(() => {
      if (isMounted) {
        setArePublicSectionsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [shouldLoadHeroExperience, siteSettings]);

  useEffect(() => {
    const minimumLoaderDelay = isMobileViewport ? 720 : PUBLIC_MINIMUM_LOADER_MS;
    const minimumTimer = window.setTimeout(() => setHasMinimumLoaderTimeElapsed(true), minimumLoaderDelay);

    return () => {
      window.clearTimeout(minimumTimer);
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (!effectivePreloaderReady) {
      setHasCoffeeLoaderVisibleTimeElapsed(false);
      return;
    }

    if (!shouldUseSplinePreloader) {
      setHasCoffeeLoaderVisibleTimeElapsed(true);
      return;
    }

    const coffeeVisibleTimer = window.setTimeout(
      () => setHasCoffeeLoaderVisibleTimeElapsed(true),
      PUBLIC_COFFEE_LOADER_VISIBLE_MS
    );

    return () => window.clearTimeout(coffeeVisibleTimer);
  }, [effectivePreloaderReady, shouldUseSplinePreloader]);

  useEffect(() => {
    document.body.classList.toggle('public-site-loading', startupPhase !== 'ready');

    return () => {
      document.body.classList.remove('public-site-loading');
    };
  }, [startupPhase]);

  useEffect(() => {
    const canDismissBootLoader = shouldUseSplinePreloader
      ? effectivePreloaderReady
      : heroExperiencePrepared;

    if (!shouldDismissInitialBootLoader(startupPhase, canDismissBootLoader)) {
      return;
    }

    dismissInitialBootLoader();
  }, [effectivePreloaderReady, heroExperiencePrepared, shouldUseSplinePreloader, startupPhase]);

  useEffect(() => {
    if (!heroExperiencePrepared || startupPhase !== 'loading') {
      return;
    }

    setStartupPhase(isMobileViewport ? 'ready' : 'loader-exiting');
  }, [heroExperiencePrepared, isMobileViewport, startupPhase]);

  useEffect(() => {
    if (startupPhase !== 'loader-exiting') {
      return;
    }

    const timeoutId = window.setTimeout(() => setStartupPhase('site-entering'), PUBLIC_LOADER_SCENE_EXIT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [startupPhase]);

  useEffect(() => {
    if (startupPhase !== 'site-entering') {
      return;
    }

    const timeoutId = window.setTimeout(() => setStartupPhase('ready'), PUBLIC_SITE_HANDOFF_MS);
    return () => window.clearTimeout(timeoutId);
  }, [startupPhase]);

  useEffect(() => {
    if (startupPhase !== 'ready') {
      return;
    }

    recordPerformanceMetric('public-ready', performance.now(), {
      mobileViewport: isMobileViewport,
      publicSectionsReady: arePublicSectionsReady,
      splineBackgroundReady: isSplineBackgroundReady,
      splinePreloaderUsed: shouldUseSplinePreloader,
    }, `public-ready:${isMobileViewport ? 'mobile' : 'desktop'}:${window.location.pathname}`);
  }, [arePublicSectionsReady, isMobileViewport, isSplineBackgroundReady, shouldUseSplinePreloader, startupPhase]);

  useEffect(() => {
    if (!publicSectionsPrepared || !isPublicExperienceVisible || !window.location.hash || window.location.hash === '#home') {
      return;
    }

    const scrollToCurrentHash = () => {
      const section = document.querySelector<HTMLElement>(window.location.hash);

      if (!section) {
        return;
      }

      const contentTarget =
        section.querySelector<HTMLElement>('.section-frame') ||
        section.querySelector<HTMLElement>('.booking-shell') ||
        section;
      const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 84;
      const visualGap = window.innerWidth < 640 ? 10 : 10;

      window.scrollTo({
        top: Math.max(0, contentTarget.getBoundingClientRect().top + window.scrollY - navHeight - visualGap),
        behavior: 'auto',
      });
    };

    const timeoutIds = [0, 250, 700].map((delay) => window.setTimeout(scrollToCurrentHash, delay));

    return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, [isPublicExperienceVisible, publicSectionsPrepared]);

  const visibleSections = useMemo(
    () =>
      siteSettings.homepage.sectionOrder.filter((sectionId) => siteSettings.homepage.visibility[sectionId]),
    [siteSettings.homepage.sectionOrder, siteSettings.homepage.visibility]
  );

  const renderSection = useCallback(
    (sectionId: HomepageSectionId): ReactNode => {
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
          return <ConsultationDesk onLoginClick={openLoginModal} />;
        default:
          return null;
      }
    },
    [openLoginModal]
  );

  return (
    <>
      <ScrollProgress />
      <CinematicBackdrop />
      <div className={`public-site relative public-site--${startupPhase}`}>
        <Suspense fallback={null}>
          <SplineBackground
            shouldLoadScene={shouldLoadMainSplineScene}
            isVisible={shouldRevealSplineBackground}
            onSceneReady={handleBackgroundReady}
          />
        </Suspense>
        {shouldRenderPreloader && shouldUseSplinePreloader && (
          <Suspense fallback={null}>
            <PublicSplinePreloader
              isLeaving={shouldFadePreloaderLayer}
              isSceneHidden={shouldHidePreloaderScene}
              onSceneReady={handlePreloaderReady}
            />
          </Suspense>
        )}
        <div
          className="public-site__content"
          aria-hidden={isPublicExperienceVisible ? undefined : 'true'}
          aria-busy={isPublicExperienceReady ? undefined : 'true'}
          inert={isPublicExperienceVisible ? undefined : true}
        >
          {shouldLoadHeroExperience && (
            <>
              <a href="#main-content" className="skip-link">
                {siteSettings.appCopy.skipLinkLabel}
              </a>
              <Navbar onLoginClick={openLoginModal} />
              <main id="main-content" className="pb-28 lg:pb-0">
                {visibleSections.map((sectionId) => {
                  if (sectionId !== 'hero' && !publicSectionsPrepared) {
                    return null;
                  }

                  return (
                    <Suspense key={sectionId} fallback={null}>
                      {renderSection(sectionId)}
                    </Suspense>
                  );
                })}
              </main>
              {publicSectionsPrepared && (
                <Suspense fallback={null}>
                  <Footer />
                </Suspense>
              )}
              {isLoginModalOpen && (
                <Suspense fallback={null}>
                  <LoginModal
                    isOpen={isLoginModalOpen}
                    onClose={closeLoginModal}
                  />
                </Suspense>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
