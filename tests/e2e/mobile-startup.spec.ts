import { devices, expect, test, type Page } from '@playwright/test';
import { createThemeState, resolveTheme } from '../../src/theme/themeUtils';
import { themePresets } from '../../src/theme/themePresets';

test.use({ ...devices['Pixel 7'] });

test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

const waitForPublicSite = async (page: Page) => {
  await expect(page.locator('.public-site')).toHaveClass(/public-site--ready/, { timeout: 60_000 });
  await expect(page.locator('.public-site__content')).toBeVisible();
};

const readContrast = async (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const parseColor = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) {
        return null;
      }

      const [r, g, b, alpha = '1'] = match[1].split(',').map((part) => part.trim());
      return {
        r: Number.parseFloat(r),
        g: Number.parseFloat(g),
        b: Number.parseFloat(b),
        a: Number.parseFloat(alpha),
      };
    };

    const flatten = (
      foreground: { r: number; g: number; b: number; a: number },
      background: { r: number; g: number; b: number; a: number }
    ) => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / Math.max(alpha, 0.0001),
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / Math.max(alpha, 0.0001),
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / Math.max(alpha, 0.0001),
        a: alpha,
      };
    };

    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const channel = [r, g, b].map((value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channel[0] + 0.7152 * channel[1] + 0.0722 * channel[2];
    };

    let node: HTMLElement | null = element as HTMLElement;
    let background = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 244, g: 236, b: 227, a: 1 };

    while (node) {
      const parsed = parseColor(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.a > 0) {
        background = flatten(parsed, background);
      }
      node = node.parentElement;
    }

    const textColor = parseColor(getComputedStyle(element as HTMLElement).color);
    if (!textColor) {
      return 0;
    }

    const foreground = flatten(textColor, background);
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    return (lighter + 0.05) / (darker + 0.05);
  });

const expectTextUsesThemeVar = async (
  page: Page,
  selector: string,
  cssVars:
    | '--theme-text-rgb'
    | '--theme-muted-rgb'
    | '--theme-ink-text-rgb'
    | '--theme-ink-muted-rgb'
    | Array<'--theme-text-rgb' | '--theme-muted-rgb' | '--theme-ink-text-rgb' | '--theme-ink-muted-rgb'>,
  minimumAlpha = 0.9
) => {
  const result = await page.locator(selector).evaluate((element, variableName) => {
    const color = getComputedStyle(element).color;
    const names = Array.isArray(variableName) ? variableName : [variableName];
    const expected = names.map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    return { color, expected };
  }, cssVars);

  const match = result.color.match(/rgba?\(([^)]+)\)/i);
  const expectedTriplets = result.expected
    .map((value) => value.split(/\s+/).map((part) => Number.parseFloat(part)))
    .filter((parts) => parts.length >= 3);

  if (!match || expectedTriplets.length === 0) {
    throw new Error(`Could not parse theme color for ${selector}`);
  }

  const [r, g, b, alpha = '1'] = match[1].split(',').map((part) => part.trim());
  const actual = [Math.round(Number.parseFloat(r)), Math.round(Number.parseFloat(g)), Math.round(Number.parseFloat(b))];
  const matchesThemeVar = expectedTriplets.some(([expectedR, expectedG, expectedB]) =>
    Math.abs(actual[0] - expectedR) <= 2 &&
    Math.abs(actual[1] - expectedG) <= 2 &&
    Math.abs(actual[2] - expectedB) <= 2
  );

  expect(matchesThemeVar).toBe(true);
  expect(Number.parseFloat(alpha)).toBeGreaterThanOrEqual(minimumAlpha);
};

test('mobile startup keeps the intro to the AMB preparing screen and never mounts the spline preloader', async ({ page }) => {
  await page.addInitScript(() => {
    const seen = { preloaderMounted: false };

    const observer = new MutationObserver(() => {
      if (document.querySelector('.public-spline-preloader')) {
        seen.preloaderMounted = true;
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    // @ts-expect-error test probe
    window.__mobileSplineProbe = seen;
  });

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  const html = await response?.text();

  expect(html).toContain('id="initial-boot-loader"');
  expect(html).toContain('Preparing the experience');
  await expect(page.locator('.public-spline-preloader')).toHaveCount(0);
  await waitForPublicSite(page);
  await expect(page.locator('.public-spline-preloader')).toHaveCount(0);
  await expect(page.locator('#initial-boot-loader')).toHaveCount(0);

  const preloaderMounted = await page.evaluate(() =>
    // @ts-expect-error test probe
    Boolean(window.__mobileSplineProbe?.preloaderMounted)
  );

  expect(preloaderMounted).toBe(false);
});

test('mobile text stays readable in dark and light theme overrides', async ({ page }) => {
  const darkTheme = createThemeState(themePresets.find((preset) => preset.id === 'noir-velvet') || themePresets[0]);
  const resolvedDarkTheme = resolveTheme(darkTheme);

  await page.addInitScript(({ overrideTheme, resolvedTheme }) => {
    window.localStorage.setItem('amb-theme-studio-override-v1', JSON.stringify(overrideTheme));
    window.localStorage.setItem(
      'amb-resolved-theme-cache-v1',
      JSON.stringify({
        cssVars: resolvedTheme.cssVars,
        surfaceMode: overrideTheme.controls.surfaceMode,
        contrastMode: overrideTheme.controls.contrastMode,
        themeColor: overrideTheme.colors.primary,
      })
    );
  }, { overrideTheme: darkTheme, resolvedTheme: resolvedDarkTheme });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForPublicSite(page);

  await expectTextUsesThemeVar(page, '.display-hero', '--theme-text-rgb', 0.95);
  await expectTextUsesThemeVar(page, '.display-lead', ['--theme-text-rgb', '--theme-muted-rgb'], 0.94);

  await page.locator('#consultation-desk').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Select a Date' })).toBeVisible();
  await expectTextUsesThemeVar(page, '.booking-rail__headline', '--theme-ink-text-rgb', 0.95);
  await expectTextUsesThemeVar(page, '.booking-rail__description', ['--theme-ink-text-rgb', '--theme-ink-muted-rgb'], 0.95);
  await expect(readContrast(page, '.booking-location-card p.mt-1')).resolves.toBeGreaterThan(4.5);
});
