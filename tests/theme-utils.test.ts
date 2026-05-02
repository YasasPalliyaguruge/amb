import { describe, expect, it } from 'vitest';
import { resolveVisitorTheme } from '../src/contexts/ThemeContext';
import { defaultThemePreset, themePresets } from '../src/theme/themePresets';
import { createThemeState, resolveTheme, sanitizeThemeState } from '../src/theme/themeUtils';

function parseRgb(rgb: string) {
  return rgb.split(' ').map((channel) => Number(channel));
}

function luminance([r, g, b]: number[]) {
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(rgbA: string, rgbB: string) {
  const left = luminance(parseRgb(rgbA));
  const right = luminance(parseRgb(rgbB));
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

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

  it('derives readable ink tokens for dark overlay panels', () => {
    const resolved = resolveTheme(
      sanitizeThemeState(
        {
          presetId: defaultThemePreset.id,
          colors: {
            background: '#F8F3EC',
            primary: '#4A83B6',
            accent: '#8E5E9B',
            text: '#3B2E29',
          },
          controls: {
            surfaceMode: 'ink',
            contrastMode: 'soft',
            radiusScale: 1,
            shadowDepth: 0.8,
            grainIntensity: 0.12,
            motionDensity: 0.8,
          },
        },
        themePresets
      )
    );

    const inkContrast = contrastRatio(
      resolved.cssVars['--theme-ink-rgb'],
      resolved.cssVars['--theme-ink-text-rgb']
    );

    expect(inkContrast).toBeGreaterThanOrEqual(4.5);
    expect(resolved.cssVars['--theme-ink-muted-rgb']).toMatch(/^\d+ \d+ \d+$/);
    expect(resolved.cssVars['--theme-ink-line-rgb']).toMatch(/^\d+ \d+ \d+$/);
  });

  it('uses the admin-selected site theme when a visitor has not chosen a personal theme', () => {
    const siteTheme = createThemeState(themePresets.find((preset) => preset.id === 'ink-gallery')!);
    const resolved = resolveVisitorTheme(siteTheme, null, true);

    expect(resolved.presetId).toBe('ink-gallery');
  });

  it('lets visitors override the site theme only while the public style dock is enabled', () => {
    const siteTheme = createThemeState(themePresets.find((preset) => preset.id === 'ink-gallery')!);
    const visitorTheme = createThemeState(themePresets.find((preset) => preset.id === 'sea-glass')!);

    expect(resolveVisitorTheme(siteTheme, visitorTheme, true).presetId).toBe('sea-glass');
    expect(resolveVisitorTheme(siteTheme, visitorTheme, false).presetId).toBe('ink-gallery');
  });
});
