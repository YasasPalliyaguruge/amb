export type SurfaceMode = 'paper' | 'glass' | 'velvet' | 'ink' | 'glow';
export type ContrastMode = 'soft' | 'balanced' | 'high';

export interface ThemeColors {
  background: string;
  primary: string;
  accent: string;
  text: string;
}

export interface ThemeControls {
  surfaceMode: SurfaceMode;
  contrastMode: ContrastMode;
  radiusScale: number;
  shadowDepth: number;
  grainIntensity: number;
  motionDensity: number;
}

export interface ThemePreset {
  id: string;
  label: string;
  family: string;
  description: string;
  colors: ThemeColors;
  defaults: ThemeControls;
}

export interface ThemeState {
  presetId: string;
  colors: ThemeColors;
  controls: ThemeControls;
}

export interface ResolvedTheme {
  cssVars: Record<string, string>;
  surfaceHex: string;
  surfaceStrongHex: string;
  inkHex: string;
  lineHex: string;
  mutedHex: string;
}
