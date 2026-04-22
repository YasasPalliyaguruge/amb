import { expect, test } from '@playwright/test';

test('homepage renders key hero content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.public-site__content')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Psychological support that stays clear, private, and grounded\./i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Book a Consultation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('sign-in modal opens and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.public-site__content')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('book navigation reaches the consultation desk section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.public-site__content')).toBeVisible({ timeout: 15000 });
  await page.getByRole('navigation').getByRole('link', { name: /^Book$/ }).click();
  await expect(page).toHaveURL(/#consultation-desk/);

  await expect
    .poll(async () => page.locator('#consultation-desk').evaluate((element) => Math.round(element.getBoundingClientRect().top)), {
      timeout: 4000,
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
