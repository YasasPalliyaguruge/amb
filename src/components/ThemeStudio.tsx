import { AnimatePresence, motion } from 'framer-motion';
import { Palette, RefreshCcw, Shuffle, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { ThemePreset } from '../theme/types';

const surfaceModes = [
  { value: 'paper', label: 'Paper' },
  { value: 'glass', label: 'Glass' },
  { value: 'velvet', label: 'Velvet' },
  { value: 'ink', label: 'Ink' },
  { value: 'glow', label: 'Glow' },
] as const;

const contrastModes = [
  { value: 'soft', label: 'Soft' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'high', label: 'High' },
] as const;

const colorControls = [
  { key: 'background', label: 'Background' },
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'text', label: 'Text' },
] as const;

type StudioTab = 'presets' | 'tune';

function PresetSwatch({ preset }: { preset: ThemePreset }) {
  return (
    <div className="mb-3 flex gap-1.5">
      {[preset.colors.background, preset.colors.primary, preset.colors.accent, preset.colors.text].map((color) => (
        <span key={`${preset.id}-${color}`} className="h-3.5 flex-1 rounded-full" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export default function ThemeStudio() {
  const {
    theme,
    presets,
    themeStudioEnabled,
    isUsingLiveSiteTheme,
    setPreset,
    updateColor,
    updateControl,
    resetTheme,
    randomizeTheme,
  } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>('presets');
  const [familyFilter, setFamilyFilter] = useState('All');

  const families = useMemo(() => ['All', ...new Set(presets.map((preset) => preset.family))], [presets]);
  const filteredPresets = useMemo(
    () => (familyFilter === 'All' ? presets : presets.filter((preset) => preset.family === familyFilter)),
    [familyFilter, presets]
  );
  const currentPreset = useMemo(
    () => presets.find((preset) => preset.id === theme.presetId),
    [presets, theme.presetId]
  );

  if (!themeStudioEnabled) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[rgb(var(--theme-ink-rgb)/0.24)] backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 hidden max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 md:flex">
        <AnimatePresence>
          {isOpen && (
            <motion.aside
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-[min(21.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-[calc(var(--theme-radius-xl)+0.1rem)] border border-[rgb(var(--theme-line-rgb)/0.42)] bg-[linear-gradient(180deg,rgb(var(--theme-surface-strong-rgb)/0.94),rgb(var(--theme-surface-rgb)/0.92))] shadow-[0_28px_90px_rgb(var(--theme-text-rgb)/0.18)] backdrop-blur-[calc(var(--theme-blur)+6px)]"
            >
              <div className="border-b border-[rgb(var(--theme-line-rgb)/0.3)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--theme-muted-rgb))]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Style Dock
                    </p>
                    <h2 className="font-heading text-[1.45rem] font-semibold text-[rgb(var(--theme-text-rgb))]">
                      {currentPreset?.label || 'Custom'}
                    </h2>
                    <p className="text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">
                      Personalize the atmosphere while keeping the booking flow intact.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-[rgb(var(--theme-line-rgb)/0.32)] bg-[rgb(var(--theme-surface-rgb)/0.72)] p-2 text-[rgb(var(--theme-text-rgb))] transition hover:-translate-y-0.5"
                    aria-label="Close theme studio"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      activeTab === 'presets'
                        ? 'bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]'
                        : 'text-[rgb(var(--theme-muted-rgb))]'
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tune')}
                    className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      activeTab === 'tune'
                        ? 'bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]'
                        : 'text-[rgb(var(--theme-muted-rgb))]'
                    }`}
                  >
                    Fine Tune
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={randomizeTheme}
                      className="rounded-full border border-[rgb(var(--theme-line-rgb)/0.34)] bg-[rgb(var(--theme-surface-rgb)/0.7)] p-2 text-[rgb(var(--theme-text-rgb))] transition hover:-translate-y-0.5"
                      aria-label="Randomize theme"
                    >
                      <Shuffle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={resetTheme}
                      disabled={isUsingLiveSiteTheme}
                      className="rounded-full border border-[rgb(var(--theme-line-rgb)/0.34)] bg-[rgb(var(--theme-surface-rgb)/0.7)] p-2 text-[rgb(var(--theme-text-rgb))] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                      aria-label="Reset to live site theme"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[68vh] overflow-y-auto px-4 py-4">
                {activeTab === 'presets' ? (
                  <div className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {families.map((family) => (
                        <button
                          key={family}
                          type="button"
                          onClick={() => setFamilyFilter(family)}
                          className={`shrink-0 rounded-full px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition ${
                            familyFilter === family
                              ? 'bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]'
                              : 'border border-[rgb(var(--theme-line-rgb)/0.3)] bg-[rgb(var(--theme-surface-rgb)/0.66)] text-[rgb(var(--theme-muted-rgb))]'
                          }`}
                        >
                          {family}
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setPreset(preset.id)}
                          className={`rounded-[calc(var(--theme-radius-md)+0.08rem)] border p-3 text-left transition hover:-translate-y-0.5 ${
                            preset.id === theme.presetId
                              ? 'border-[rgb(var(--theme-primary-rgb)/0.64)] bg-[rgb(var(--theme-primary-rgb)/0.1)]'
                              : 'border-[rgb(var(--theme-line-rgb)/0.28)] bg-[rgb(var(--theme-surface-rgb)/0.66)]'
                          }`}
                        >
                          <PresetSwatch preset={preset} />
                          <p className="text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{preset.label}</p>
                          <p className="mt-1 text-xs leading-5 text-[rgb(var(--theme-muted-rgb))]">{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {colorControls.map((control) => (
                        <label key={control.key} className="space-y-2">
                          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
                            {control.label}
                          </span>
                          <div className="flex items-center gap-3 rounded-[calc(var(--theme-radius-md)+0.05rem)] border border-[rgb(var(--theme-line-rgb)/0.3)] bg-[rgb(var(--theme-surface-rgb)/0.72)] px-3 py-2">
                            <input
                              type="color"
                              value={theme.colors[control.key]}
                              onChange={(event) => updateColor(control.key, event.target.value)}
                              className="h-10 w-12 cursor-pointer rounded border-none bg-transparent p-0"
                            />
                            <span className="font-mono text-xs uppercase tracking-[0.12em] text-[rgb(var(--theme-text-rgb))]">
                              {theme.colors[control.key]}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
                          Surface style
                        </span>
                        <select
                          value={theme.controls.surfaceMode}
                          onChange={(event) => updateControl('surfaceMode', event.target.value as typeof theme.controls.surfaceMode)}
                          className="theme-select"
                        >
                          {surfaceModes.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                              {mode.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
                          Contrast
                        </span>
                        <select
                          value={theme.controls.contrastMode}
                          onChange={(event) => updateControl('contrastMode', event.target.value as typeof theme.controls.contrastMode)}
                          className="theme-select"
                        >
                          {contrastModes.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                              {mode.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="rounded-[calc(var(--theme-radius-md)+0.08rem)] border border-[rgb(var(--theme-line-rgb)/0.3)] bg-[rgb(var(--theme-surface-rgb)/0.62)] p-4">
                      <div className="mb-4 flex items-center gap-2 text-[rgb(var(--theme-text-rgb))]">
                        <SlidersHorizontal className="h-4 w-4" />
                        <p className="text-sm font-semibold uppercase tracking-[0.16em]">Advanced controls</p>
                      </div>

                      <div className="space-y-4">
                        {[
                          { key: 'radiusScale', label: 'Radius', min: 0.7, max: 1.5, step: 0.01 },
                          { key: 'shadowDepth', label: 'Shadow depth', min: 0.2, max: 1.2, step: 0.01 },
                          { key: 'grainIntensity', label: 'Texture', min: 0, max: 0.55, step: 0.01 },
                          { key: 'motionDensity', label: 'Motion', min: 0.2, max: 1.2, step: 0.01 },
                        ].map((slider) => (
                          <label key={slider.key} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
                                {slider.label}
                              </span>
                              <span className="text-xs text-[rgb(var(--theme-text-rgb))]">
                                {theme.controls[slider.key as keyof typeof theme.controls].toFixed(2)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={slider.min}
                              max={slider.max}
                              step={slider.step}
                              value={theme.controls[slider.key as keyof typeof theme.controls]}
                              onChange={(event) =>
                                updateControl(
                                  slider.key as keyof typeof theme.controls,
                                  Number(event.target.value) as never
                                )
                              }
                              className="w-full accent-[rgb(var(--theme-primary-rgb))]"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[rgb(var(--theme-line-rgb)/0.28)] px-4 py-3">
                <p className="text-xs leading-5 text-[rgb(var(--theme-muted-rgb))]">
                  Changes here stay on this device unless the shared site style is updated later.
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full border border-[rgb(var(--theme-line-rgb)/0.4)] bg-[rgb(var(--theme-surface-strong-rgb)/0.9)] px-3 py-2 text-sm font-semibold text-[rgb(var(--theme-text-rgb))] shadow-[0_20px_48px_rgb(var(--theme-text-rgb)/0.12)] backdrop-blur-[calc(var(--theme-blur)+5px)] transition hover:-translate-y-0.5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--theme-primary-rgb)/0.1)] text-[rgb(var(--theme-primary-rgb))]">
            <Palette className="h-4 w-4" />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[0.6rem] uppercase tracking-[0.22em] text-[rgb(var(--theme-muted-rgb))]">
              Small Dock
            </span>
            <span className="block max-w-[8.5rem] truncate text-[0.92rem]">{currentPreset?.label || 'Custom mood'}</span>
          </span>
        </button>
      </div>
    </>
  );
}
