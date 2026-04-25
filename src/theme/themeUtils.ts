import type { ContrastMode, ResolvedTheme, SurfaceMode, ThemeColors, ThemeControls, ThemePreset, ThemeState } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace('#', '');
  if (cleaned.length === 3) {
    return `#${cleaned.split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }
  if (cleaned.length !== 6) {
    return '#000000';
  }
  return `#${cleaned}`.toUpperCase();
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  const value = parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function rgbString(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

function mix(hexA: string, hexB: string, weight: number) {
  const left = hexToRgb(hexA);
  const right = hexToRgb(hexB);
  const clamped = clamp(weight, 0, 1);
  return rgbToHex(
    left.r + (right.r - left.r) * clamped,
    left.g + (right.g - left.g) * clamped,
    left.b + (right.b - left.b) * clamped
  );
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(hexA: string, hexB: string) {
  const left = luminance(hexA);
  const right = luminance(hexB);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrastAgainstBackground(background: string, candidate: string, fallbackText: string, minimumContrast: number) {
  const normalizedBackground = normalizeHex(background);
  const normalizedFallback = normalizeHex(fallbackText);
  let nextColor = normalizeHex(candidate);

  if (contrastRatio(normalizedBackground, nextColor) >= minimumContrast) {
    return nextColor;
  }

  for (let step = 1; step <= 6; step += 1) {
    const weight = step / 6;
    nextColor = mix(nextColor, normalizedFallback, weight);
    if (contrastRatio(normalizedBackground, nextColor) >= minimumContrast) {
      return nextColor;
    }
  }

  return contrastRatio(normalizedBackground, normalizedFallback) >= minimumContrast
    ? normalizedFallback
    : ensureReadableText(normalizedBackground, normalizedFallback);
}

function ensureReadableText(background: string, requestedText: string) {
  const normalizedBackground = normalizeHex(background);
  const normalizedText = normalizeHex(requestedText);

  if (contrastRatio(normalizedBackground, normalizedText) >= 4.5) {
    return normalizedText;
  }

  return contrastRatio(normalizedBackground, '#111111') > contrastRatio(normalizedBackground, '#F8F6F1')
    ? '#111111'
    : '#F8F6F1';
}

function surfaceBlend(background: string, primary: string, accent: string, text: string, mode: SurfaceMode) {
  switch (mode) {
    case 'glass':
      return {
        surface: mix(background, '#FFFFFF', 0.4),
        strong: mix(background, '#FFFFFF', 0.56),
        ink: mix(text, primary, 0.12),
      };
    case 'velvet':
      return {
        surface: mix(background, primary, 0.12),
        strong: mix(background, primary, 0.22),
        ink: mix(text, primary, 0.22),
      };
    case 'ink':
      return {
        surface: mix(background, text, 0.16),
        strong: mix(background, text, 0.26),
        ink: mix(text, accent, 0.08),
      };
    case 'glow':
      return {
        surface: mix(background, accent, 0.16),
        strong: mix(background, accent, 0.26),
        ink: mix(text, primary, 0.16),
      };
    case 'paper':
    default:
      return {
        surface: mix(background, '#FFFFFF', 0.62),
        strong: mix(background, '#FFFFFF', 0.78),
        ink: mix(text, primary, 0.08),
      };
  }
}

function lineBlend(surface: string, text: string, contrastMode: ContrastMode) {
  if (contrastMode === 'soft') {
    return mix(surface, text, 0.15);
  }
  if (contrastMode === 'high') {
    return mix(surface, text, 0.28);
  }
  return mix(surface, text, 0.22);
}

function mutedBlend(text: string, background: string, contrastMode: ContrastMode) {
  let candidate: string;
  if (contrastMode === 'soft') {
    candidate = mix(text, background, 0.54);
  } else if (contrastMode === 'high') {
    candidate = mix(text, background, 0.32);
  } else {
    candidate = mix(text, background, 0.42);
  }
  return ensureContrastAgainstBackground(background, candidate, text, 4.5);
}

function inkMutedBlend(text: string, background: string, contrastMode: ContrastMode) {
  let candidate: string;
  if (contrastMode === 'soft') {
    candidate = mix(text, background, 0.32);
  } else if (contrastMode === 'high') {
    candidate = mix(text, background, 0.2);
  } else {
    candidate = mix(text, background, 0.26);
  }
  return ensureContrastAgainstBackground(background, candidate, text, 4.5);
}

export function createThemeState(preset: ThemePreset): ThemeState {
  return {
    presetId: preset.id,
    colors: { ...preset.colors },
    controls: { ...preset.defaults },
  };
}

export function sanitizeThemeState(theme: ThemeState, presets: ThemePreset[]): ThemeState {
  const fallbackPreset = presets.find((preset) => preset.id === theme.presetId) || presets[0];
  const background = normalizeHex(theme.colors.background || fallbackPreset.colors.background);
  const primary = normalizeHex(theme.colors.primary || fallbackPreset.colors.primary);
  const accent = normalizeHex(theme.colors.accent || fallbackPreset.colors.accent);
  const text = ensureReadableText(background, theme.colors.text || fallbackPreset.colors.text);

  return {
    presetId: fallbackPreset.id,
    colors: {
      background,
      primary,
      accent,
      text,
    },
    controls: {
      surfaceMode: theme.controls.surfaceMode || fallbackPreset.defaults.surfaceMode,
      contrastMode: theme.controls.contrastMode || fallbackPreset.defaults.contrastMode,
      radiusScale: clamp(theme.controls.radiusScale ?? fallbackPreset.defaults.radiusScale, 0.7, 1.5),
      shadowDepth: clamp(theme.controls.shadowDepth ?? fallbackPreset.defaults.shadowDepth, 0.2, 1.2),
      grainIntensity: clamp(theme.controls.grainIntensity ?? fallbackPreset.defaults.grainIntensity, 0, 0.55),
      motionDensity: clamp(theme.controls.motionDensity ?? fallbackPreset.defaults.motionDensity, 0.2, 1.2),
    },
  };
}

export function resolveTheme(theme: ThemeState): ResolvedTheme {
  const background = normalizeHex(theme.colors.background);
  const primary = normalizeHex(theme.colors.primary);
  const accent = normalizeHex(theme.colors.accent);
  const text = ensureReadableText(background, theme.colors.text);
  const secondary = mix(primary, accent, 0.38);
  const { surface, strong, ink } = surfaceBlend(background, primary, accent, text, theme.controls.surfaceMode);
  const line = lineBlend(strong, text, theme.controls.contrastMode);
  const muted = mutedBlend(text, background, theme.controls.contrastMode);
  const inkText = ensureReadableText(ink, '#F8F6F1');
  const inkLine = lineBlend(ink, inkText, theme.controls.contrastMode);
  const inkMuted = inkMutedBlend(inkText, ink, theme.controls.contrastMode);
  const radiusBase = 10 * theme.controls.radiusScale;
  const blur = theme.controls.surfaceMode === 'glass' ? 22 : theme.controls.surfaceMode === 'ink' ? 12 : 18;
  const shadowStrength = 0.08 + theme.controls.shadowDepth * 0.16;

  return {
    surfaceHex: surface,
    surfaceStrongHex: strong,
    inkHex: ink,
    lineHex: line,
    mutedHex: muted,
    cssVars: {
      '--color-brand-bg': background,
      '--color-brand-primary': primary,
      '--color-brand-secondary': secondary,
      '--color-brand-accent': accent,
      '--color-brand-text': text,
      '--theme-bg-rgb': rgbString(background),
      '--theme-primary-rgb': rgbString(primary),
      '--theme-secondary-rgb': rgbString(secondary),
      '--theme-accent-rgb': rgbString(accent),
      '--theme-text-rgb': rgbString(text),
      '--theme-surface-rgb': rgbString(surface),
      '--theme-surface-strong-rgb': rgbString(strong),
      '--theme-ink-rgb': rgbString(ink),
      '--theme-ink-text-rgb': rgbString(inkText),
      '--theme-ink-line-rgb': rgbString(inkLine),
      '--theme-ink-muted-rgb': rgbString(inkMuted),
      '--theme-line-rgb': rgbString(line),
      '--theme-muted-rgb': rgbString(muted),
      '--theme-radius-md': `${radiusBase}px`,
      '--theme-radius-lg': `${radiusBase * 1.35}px`,
      '--theme-radius-xl': `${radiusBase * 1.7}px`,
      '--theme-blur': `${blur}px`,
      '--theme-shadow-alpha': `${shadowStrength}`,
      '--theme-grain-opacity': `${theme.controls.grainIntensity}`,
      '--theme-motion-factor': `${theme.controls.motionDensity}`,
      '--theme-card-lift': `${14 + theme.controls.shadowDepth * 18}px`,
    },
  };
}

export function randomThemeState(current: ThemeState, presets: ThemePreset[]) {
  const nextPreset = presets[Math.floor(Math.random() * presets.length)];
  const base = createThemeState(nextPreset);

  return sanitizeThemeState(
    {
      ...base,
      controls: {
        ...base.controls,
        radiusScale: clamp(base.controls.radiusScale + (Math.random() * 0.26 - 0.13), 0.72, 1.45),
        shadowDepth: clamp(base.controls.shadowDepth + (Math.random() * 0.22 - 0.11), 0.25, 1.15),
        grainIntensity: clamp(base.controls.grainIntensity + (Math.random() * 0.14 - 0.07), 0, 0.5),
        motionDensity: clamp(base.controls.motionDensity + (Math.random() * 0.18 - 0.09), 0.3, 1.18),
      },
    },
    presets
  );
}
