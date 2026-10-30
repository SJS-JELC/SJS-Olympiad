import { test, expect } from './fixtures';
test('teacher event previews expose all 33 registered problem presentations', async ({ page }) => { test.setTimeout(120000); for (const year of ['L5', 'L6', 'U6', 'U5'])
    for (const number of year === 'U5' ? [2, 3, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        await page.goto(`/?theory&eventId=fixture-${year}&question=${number}`);
        await expect(page.locator('.question-brief')).toBeVisible();
        await expect(page.locator('.olympiad-question-heading')).toContainText(year);
        await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
        await expect(page.locator('.theory-title')).toContainText(year);
    } });
test('internal history preserves draft answers and the selected event', async ({ page }) => { await page.goto('/?theory&eventId=fixture-L6&question=5'); await page.locator('.angle-input input').first().fill('300'); await page.getByRole('button', { name: 'Back to theory' }).click(); await expect(page.locator('.theory-stage')).toBeVisible(); await page.goBack(); await expect(page.locator('.angle-input input').first()).toHaveValue('300'); await page.goForward(); await expect(page.locator('.theory-title')).toContainText('L6'); });
test('teacher can switch event preview without fullscreen or team selection', async ({ page }) => { await page.goto('/?settings'); await page.getByLabel('Selected event').selectOption('fixture-U5'); await page.getByRole('button', { name: 'Preview theory' }).click(); await expect(page.locator('.theory-title')).toContainText('U5'); await page.getByRole('button', { name: /^Problem 3,/ }).click(); await expect(page.getByTestId('u5p3-content')).toBeVisible(); await page.getByRole('button', { name: 'Back to theory' }).click(); await page.getByRole('button', { name: 'Back to landing' }).click(); await page.getByRole('button', { name: 'Settings', exact: true }).click(); await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U5'); });
