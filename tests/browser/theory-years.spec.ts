import { test, expect } from '@playwright/test';

test('year selection before and during ACTIVE preserves fullscreen and separate scores', async ({ page }) => {
  await page.goto('/?settings');
  await page.locator('#theory-year').selectOption('L5');
  await page.getByRole('button', { name: 'Enter Competition Mode' }).click();
  await expect(page.locator('#theory-year')).toBeVisible();
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await page.getByRole('button', { name: 'Theoretical Challenge' }).click();
  await expect(page).toHaveURL(/year=L5/);
  await page.getByRole('button', { name: 'Problem 1, 1 point, not yet solved', exact: true }).click();
  await page.locator('input[name="answer"]').fill('vanadium');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 01');
  await page.getByRole('button', { name: 'Back to theory' }).click();
  await page.getByRole('button', { name: 'Back to landing' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#theory-year').selectOption('U6');
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await page.getByRole('button', { name: 'Theoretical Challenge' }).click();
  await expect(page.locator('.theory-score output')).toHaveAttribute('aria-label', 'Score: 00');
  await page.getByRole('button', { name: 'Back to landing' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#theory-year').selectOption('L5');
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await page.getByRole('button', { name: 'Theoretical Challenge' }).click();
  await expect(page.getByRole('button', { name: 'Problem 1, 1 point, correct', exact: true })).toBeVisible();
  await expect(page.locator('.theory-score output')).toHaveAttribute('aria-label', 'Score: 01');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#theory-year')).toHaveCount(0);
});

test('legacy year links use preference and invalid explicit years never fall back', async ({ page }) => {
  await page.goto('/?settings');
  await page.locator('#theory-year').selectOption('L5');
  await page.goto('/?theory&question=1');
  await expect(page.locator('.olympiad-question-heading')).toContainText('L5');
  await expect(page.locator('.question-brief')).toContainText('M₂(CO₃)₃');
  await page.goto('/?theory&year=U4&question=1');
  await expect(page.getByRole('heading', { name: 'Theory year unavailable' })).toBeVisible();
  await expect(page.locator('.question-brief')).toHaveCount(0);
});

test('timed naming expires while on another year and preserves absolute retry deadline', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?theory&year=L6&question=3');
  await page.getByRole('button', { name: 'GO: start oxyanion challenge' }).click();
  await expect(page.locator('.l6p3-formula')).toBeVisible();
  await page.getByRole('button', { name: 'Back to theory' }).click();
  await page.evaluate(() => { history.pushState(null,'','?theory&year=L5'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.clock.fastForward(80000);
  await page.evaluate(() => { history.pushState(null,'','?theory&year=L6&question=3'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('.l6p3-reveal')).toContainText('The answer was');
  await expect(page.getByRole('button', { name: 'GO: start oxyanion challenge' })).toBeDisabled();
  await page.clock.fastForward(15000);
  await expect(page.getByRole('button', { name: 'GO: start oxyanion challenge' })).toBeEnabled();
});
