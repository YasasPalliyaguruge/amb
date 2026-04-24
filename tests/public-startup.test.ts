import { describe, expect, it } from 'vitest';
import {
  getPublicStartupUiState,
  isPublicExperiencePrepared,
  shouldDismissInitialBootLoader,
} from '../src/components/cinematic/publicStartup';

describe('public startup helpers', () => {
  it('keeps the experience blocked until both spline gates or safety timers resolve', () => {
    expect(
      isPublicExperiencePrepared({
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        isPreloaderSplineReady: false,
        hasLoaderSafetyElapsed: false,
        isSplineBackgroundReady: true,
        hasMainSplineSafetyElapsed: false,
      })
    ).toBe(false);

    expect(
      isPublicExperiencePrepared({
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        isPreloaderSplineReady: false,
        hasLoaderSafetyElapsed: true,
        isSplineBackgroundReady: false,
        hasMainSplineSafetyElapsed: true,
      })
    ).toBe(true);
  });

  it('maps each startup phase to the correct visibility flags', () => {
    expect(getPublicStartupUiState('loading')).toEqual({
      isPublicExperienceReady: false,
      isPublicExperienceVisible: false,
      shouldRenderPreloader: true,
      shouldHidePreloaderScene: false,
      shouldFadePreloaderLayer: false,
    });

    expect(getPublicStartupUiState('loader-exiting')).toEqual({
      isPublicExperienceReady: false,
      isPublicExperienceVisible: false,
      shouldRenderPreloader: true,
      shouldHidePreloaderScene: true,
      shouldFadePreloaderLayer: false,
    });

    expect(getPublicStartupUiState('site-entering')).toEqual({
      isPublicExperienceReady: false,
      isPublicExperienceVisible: true,
      shouldRenderPreloader: true,
      shouldHidePreloaderScene: true,
      shouldFadePreloaderLayer: true,
    });

    expect(getPublicStartupUiState('ready')).toEqual({
      isPublicExperienceReady: true,
      isPublicExperienceVisible: true,
      shouldRenderPreloader: false,
      shouldHidePreloaderScene: false,
      shouldFadePreloaderLayer: false,
    });
  });

  it('dismisses the inline boot loader only when the spline loader is ready or the public site starts advancing', () => {
    expect(shouldDismissInitialBootLoader('loading', false)).toBe(false);
    expect(shouldDismissInitialBootLoader('loading', true)).toBe(true);
    expect(shouldDismissInitialBootLoader('loader-exiting', false)).toBe(true);
  });
});
