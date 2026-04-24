export type PublicStartupPhase = 'loading' | 'loader-exiting' | 'site-entering' | 'ready';

export const PUBLIC_MINIMUM_LOADER_MS = 1800;
export const PUBLIC_LOADER_SCENE_SAFETY_MS = 8500;
export const PUBLIC_MAIN_SCENE_SAFETY_MS = 16000;
export const PUBLIC_LOADER_SCENE_EXIT_MS = 320;
export const PUBLIC_SITE_HANDOFF_MS = 720;

type PublicExperienceReadiness = {
  arePublicSectionsReady: boolean;
  arePublicAssetsReady: boolean;
  hasMinimumLoaderTimeElapsed: boolean;
  isPreloaderSplineReady: boolean;
  hasLoaderSafetyElapsed: boolean;
  isSplineBackgroundReady: boolean;
  hasMainSplineSafetyElapsed: boolean;
};

export function isPublicExperiencePrepared({
  arePublicSectionsReady,
  arePublicAssetsReady,
  hasMinimumLoaderTimeElapsed,
  isPreloaderSplineReady,
  hasLoaderSafetyElapsed,
  isSplineBackgroundReady,
  hasMainSplineSafetyElapsed,
}: PublicExperienceReadiness) {
  return (
    arePublicSectionsReady &&
    arePublicAssetsReady &&
    hasMinimumLoaderTimeElapsed &&
    (isPreloaderSplineReady || hasLoaderSafetyElapsed) &&
    (isSplineBackgroundReady || hasMainSplineSafetyElapsed)
  );
}

export function getPublicStartupUiState(startupPhase: PublicStartupPhase) {
  return {
    isPublicExperienceReady: startupPhase === 'ready',
    isPublicExperienceVisible: startupPhase === 'site-entering' || startupPhase === 'ready',
    shouldRenderPreloader: startupPhase !== 'ready',
    shouldHidePreloaderScene: startupPhase === 'loader-exiting' || startupPhase === 'site-entering',
    shouldFadePreloaderLayer: startupPhase === 'site-entering',
  };
}

export function shouldDismissInitialBootLoader(
  startupPhase: PublicStartupPhase,
  isPreloaderSplineReady: boolean
) {
  return isPreloaderSplineReady || startupPhase !== 'loading';
}
