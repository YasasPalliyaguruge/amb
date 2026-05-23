export type PublicStartupPhase = 'loading' | 'loader-exiting' | 'site-entering' | 'ready';

export const PUBLIC_MINIMUM_LOADER_MS = 1250;
export const PUBLIC_COFFEE_LOADER_VISIBLE_MS = 1050;
export const PUBLIC_LOADER_SCENE_SAFETY_MS = 4500;
export const PUBLIC_MAIN_SCENE_SAFETY_MS = 30000;
export const PUBLIC_LOADER_SCENE_EXIT_MS = 560;
export const PUBLIC_SITE_HANDOFF_MS = 520;

type PublicExperienceReadiness = {
  areSiteSettingsReady: boolean;
  arePublicSectionsReady: boolean;
  arePublicAssetsReady: boolean;
  hasMinimumLoaderTimeElapsed: boolean;
  hasCoffeeLoaderVisibleTimeElapsed: boolean;
  isPreloaderSplineReady: boolean;
  hasLoaderSafetyElapsed: boolean;
  isSplineBackgroundReady: boolean;
  hasMainSplineSafetyElapsed: boolean;
};

export function isPublicExperiencePrepared({
  areSiteSettingsReady,
  arePublicSectionsReady,
  arePublicAssetsReady,
  hasMinimumLoaderTimeElapsed,
  hasCoffeeLoaderVisibleTimeElapsed,
  isPreloaderSplineReady,
  hasLoaderSafetyElapsed,
  isSplineBackgroundReady,
  hasMainSplineSafetyElapsed,
}: PublicExperienceReadiness) {
  return Boolean(
    areSiteSettingsReady &&
    arePublicSectionsReady &&
    arePublicAssetsReady &&
    hasMinimumLoaderTimeElapsed &&
    (hasCoffeeLoaderVisibleTimeElapsed || hasLoaderSafetyElapsed) &&
    (isPreloaderSplineReady || hasLoaderSafetyElapsed) &&
    (isSplineBackgroundReady || hasMainSplineSafetyElapsed)
  );
}

export function getPublicStartupUiState(startupPhase: PublicStartupPhase) {
  const isPublicExperienceVisible = startupPhase === 'site-entering' || startupPhase === 'ready';

  return {
    isPublicExperienceReady: startupPhase === 'ready',
    isPublicExperienceVisible,
    shouldRevealSplineBackground: isPublicExperienceVisible,
    shouldRenderPreloader: startupPhase !== 'ready',
    // Fade the coffee loader away before the public flower scene enters so the
    // two Spline scenes never visually stack on top of each other.
    shouldHidePreloaderScene: startupPhase === 'loader-exiting' || startupPhase === 'site-entering',
    shouldFadePreloaderLayer: startupPhase === 'loader-exiting' || startupPhase === 'site-entering',
  };
}

export function shouldDismissInitialBootLoader(
  startupPhase: PublicStartupPhase,
  isPreloaderSplineReady: boolean
) {
  return isPreloaderSplineReady || startupPhase !== 'loading';
}
