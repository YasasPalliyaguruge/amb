import { describe, expect, it } from 'vitest';
import {
  getPublicStartupUiState,
  isPublicExperiencePrepared,
  shouldDismissInitialBootLoader,
} from '../src/components/cinematic/publicStartup';

describe('public startup helpers', () => {
  it('keeps the experience blocked until the main spline background is ready', () => {
    expect(
      isPublicExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: false,
      })
    ).toBe(false);

    expect(
      isPublicExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(true);
  });

  it('does not reveal the public page while the coffee preloader or public chunks are still pending', () => {
    expect(
      isPublicExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicSectionsReady: false,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(false);

    expect(
      isPublicExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: false,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(false);

    expect(
      isPublicExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: false,
        isSplineBackgroundReady: true,
      })
    ).toBe(false);
  });

  it('keeps the public page hidden until live site settings resolve', () => {
    expect(
      isPublicExperiencePrepared({
        areSiteSettingsReady: false,
        arePublicSectionsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(false);
  });

  it('maps each startup phase to the correct visibility flags', () => {
    expect(getPublicStartupUiState('loading')).toEqual({
      isPublicExperienceReady: false,
      isPublicExperienceVisible: false,
      shouldRevealSplineBackground: false,
      shouldRenderPreloader: true,
      shouldHidePreloaderScene: false,
      shouldFadePreloaderLayer: false,
    });

    expect(getPublicStartupUiState('loader-exiting')).toEqual({
      isPublicExperienceReady: false,
      isPublicExperienceVisible: false,
      shouldRevealSplineBackground: false,
      shouldRenderPreloader: true,
      shouldHidePreloaderScene: true,
      shouldFadePreloaderLayer: true,
    });

    expect(getPublicStartupUiState('site-entering')).toEqual({
      isPublicExperienceReady: false,
      isPublicExperienceVisible: true,
      shouldRevealSplineBackground: true,
      shouldRenderPreloader: true,
      shouldHidePreloaderScene: true,
      shouldFadePreloaderLayer: true,
    });

    expect(getPublicStartupUiState('ready')).toEqual({
      isPublicExperienceReady: true,
      isPublicExperienceVisible: true,
      shouldRevealSplineBackground: true,
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
