import { describe, expect, it } from 'vitest';
import { defaultThemePreset, themePresets } from '../src/theme/themePresets';
import { createThemeState, resolveTheme, sanitizeThemeState } from '../src/theme/themeUtils';

describe('theme utilities', () => {
  it('creates a theme state from the preset defaults', () => {
    const state = createThemeState(defaultThemePreset);

    expect(state.presetId).toBe(defaultThemePreset.id);
    expect(state.colors).toEqual(defaultThemePreset.colors);
    expect(state.controls).toEqual(defaultThemePreset.defaults);
  });

  it('sanitizes malformed hex values and constrains controls', () => {
    const sanitized = sanitizeThemeState(
      {
        presetId: defaultThemePreset.id,
        colors: {
          background: 'abc',
          primary: 'be6542',
          accent: '#12',
          text: '#ffffff',
        },
        controls: {
          surfaceMode: 'paper',
          contrastMode: 'balanced',
          radiusScale: 10,
          shadowDepth: -3,
          grainIntensity: 99,
          motionDensity: 0,
        },
      },
      themePresets
    );

    expect(sanitized.colors.background).toBe('#AABBCC');
    expect(sanitized.colors.primary).toBe('#BE6542');
    expect(sanitized.colors.accent).toBe('#000000');
    expect(sanitized.controls.radiusScale).toBe(1.5);
    expect(sanitized.controls.shadowDepth).toBe(0.2);
    expect(sanitized.controls.grainIntensity).toBe(0.55);
    expect(sanitized.controls.motionDensity).toBe(0.2);
  });

  it('falls back to a readable text color when contrast is too low', () => {
    const sanitized = sanitizeThemeState(
      {
        presetId: defaultThemePreset.id,
        colors: {
          background: '#111111',
          primary: defaultThemePreset.colors.primary,
          accent: defaultThemePreset.colors.accent,
          text: '#121212',
        },
        controls: { ...defaultThemePreset.defaults },
      },
      themePresets
    );

    expect(sanitized.colors.text).not.toBe('#121212');
  });

  it('resolves a theme into CSS variables for the UI shell', () => {
    const resolved = resolveTheme(createThemeState(defaultThemePreset));

    expect(resolved.cssVars['--color-brand-bg']).toBe(defaultThemePreset.colors.background.toUpperCase());
    expect(resolved.cssVars['--color-brand-primary']).toBe(defaultThemePreset.colors.primary.toUpperCase());
    expect(resolved.cssVars['--theme-primary-rgb']).toMatch(/^\d+ \d+ \d+$/);
    expect(resolved.cssVars['--theme-radius-md']).toMatch(/px$/);
  });
});
