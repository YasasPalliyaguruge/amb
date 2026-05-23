import { describe, expect, it } from 'vitest';
import {
  arePublicSectionsPrepared,
  getPublicStartupUiState,
  isHeroExperiencePrepared,
  shouldDismissInitialBootLoader,
} from '../src/components/cinematic/publicStartup';

describe('public startup helpers', () => {
  it('keeps the experience blocked until the main spline background is ready', () => {
    expect(
      isHeroExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: false,
      })
    ).toBe(false);

    expect(
      isHeroExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(true);
  });

  it('does not reveal the public page while the coffee preloader is still pending', () => {
    expect(
      isHeroExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: false,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(false);

    expect(
      isHeroExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: false,
        isSplineBackgroundReady: true,
      })
    ).toBe(false);
  });

  it('tracks below-fold public section readiness separately from hero reveal', () => {
    expect(arePublicSectionsPrepared({ arePublicSectionsReady: false })).toBe(false);
    expect(arePublicSectionsPrepared({ arePublicSectionsReady: true })).toBe(true);

    expect(
      isHeroExperiencePrepared({
        areSiteSettingsReady: true,
        arePublicAssetsReady: true,
        hasMinimumLoaderTimeElapsed: true,
        hasCoffeeLoaderVisibleTimeElapsed: true,
        isPreloaderSplineReady: true,
        isSplineBackgroundReady: true,
      })
    ).toBe(true);
  });

  it('keeps the public page hidden until live site settings resolve', () => {
    expect(
      isHeroExperiencePrepared({
        areSiteSettingsReady: false,
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
