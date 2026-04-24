import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

const waitForPublicSite = async (page: Page) => {
  await expect(page.locator('.public-site')).toHaveClass(/public-site--ready/, { timeout: 60_000 });
  await expect(page.locator('.public-site__content')).toBeVisible();
};

test('homepage renders key hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#initial-boot-loader')).toBeAttached();
  await waitForPublicSite(page);
  await expect(page.locator('#initial-boot-loader')).toHaveCount(0);
  await expect(page.locator('.public-spline-preloader')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Psychological support that stays clear, private, and grounded\./i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Book a Consultation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('sign-in modal opens and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await waitForPublicSite(page);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('book navigation reaches the consultation desk section', async ({ page }) => {
  await page.goto('/');
  await waitForPublicSite(page);
  await page.getByRole('navigation').getByRole('link', { name: /^Book$/ }).click();
  await expect(page).toHaveURL(/#consultation-desk/);

  await expect
    .poll(async () => page.locator('#consultation-desk').evaluate((element) => Math.round(element.getBoundingClientRect().top)), {
      timeout: 12_000,
    })
    .toBeLessThan(140);

  await expect(page.getByRole('heading', { name: 'Select a Date' })).toBeVisible();
});

test('unauthorized dashboard routes redirect to the homepage', async ({ page }) => {
  await page.goto('/admin-dashboard');
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  await page.goto('/patient-dashboard');
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
});
