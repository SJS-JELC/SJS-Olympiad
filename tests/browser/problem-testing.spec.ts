import { test, expect } from '@playwright/test';
import { mockFullscreen, interrupt } from './fullscreen';

test('Settings directory opens every available problem and returns to the directory', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('/?settings');
  await page.getByRole('button', { name: 'Open problem testing', exact: true }).click();
  await expect(page).toHaveURL(/\?settings&view=problems$/);
  await expect(page.locator('.problem-testing-card')).toHaveCount(36);
  await expect(page.getByRole('button', { name: 'U5 Problem 1: Not available', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('directory-1440.png'), fullPage: true });
  const names = await page.locator('.problem-testing-card:enabled').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')!));
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page).toHaveURL(/from=problem-testing$/);
    await page.getByRole('button', { name: 'Back to problem testing', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Problem testing', exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 1200, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('directory-1200.png'), fullPage: true });
  await page.getByRole('link', { name: 'Back to Settings', exact: true }).click();
  await expect(page.locator('#theory-year')).toHaveValue('L6');
});

test('testing origin survives history and answers persist; ordinary question back stays in theory', async ({ page }) => {
  await page.goto('/?settings&view=problems');
  const question = page.getByRole('button', { name: 'L6 Problem 5: Twist and Bump', exact: true });
  await question.click();
  await page.locator('.angle-input input').first().fill('300');
  await page.goBack();
  await expect(question).toBeVisible();
  await page.goForward();
  await expect(page.locator('.angle-input input').first()).toHaveValue('300');
  await page.getByRole('button', { name: 'Back to problem testing', exact: true }).click();
  await question.click();
  await expect(page.locator('.angle-input input').first()).toHaveValue('300');
  await page.goto('/?theory&year=L6&question=5');
  await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
  await expect(page).toHaveURL(/\?theory&year=L6$/);
});

test('testing hub and origin respect competition lock and unlock', async ({ page }) => {
  await mockFullscreen(page);
  await page.goto('/?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Open problem testing', exact: true }).click();
  await interrupt(page, 'blur');
  await expect(page.locator('.problem-testing-card')).toHaveCount(0);
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await page.getByRole('button', { name: 'U5 Problem 5: Scents and Scentsibility', exact: true }).click();
  await interrupt(page, 'blur');
  await expect(page.getByTestId('u5p5-content')).toHaveCount(0);
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Back to problem testing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Problem testing', exact: true })).toBeVisible();
});
