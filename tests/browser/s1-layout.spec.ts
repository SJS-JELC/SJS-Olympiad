import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1200, height: 800 }, { width: 1440, height: 810 }]) {
  test(`S1 compact pilot at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    await page.goto('/?theory&year=L5&question=1');
    await page.evaluate(() => document.fonts.ready);
    const input = page.getByRole('textbox', { name: 'Name of the metal, M' });
    await expect(input).toBeFocused();
    await expect(page.locator('.olympiad-question-heading__title')).toHaveText("CAN'T TAKE THE HEAT?");
    const pane = await page.locator('.question-brief').boundingBox();
    const field = await input.boundingBox();
    const check = await page.locator('.check-button').boundingBox();
    expect(pane && field && check).toBeTruthy();
    expect(pane!.y + pane!.height).toBeLessThan(field!.y);
    expect(field!.y + field!.height).toBeLessThan(check!.y);
    expect(Math.abs(field!.x + field!.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(Math.abs(check!.x + check!.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(pane!.height).toBeLessThan(viewport.height * .35);
    expect(check!.y + check!.height).toBeLessThan(viewport.height);
    expect(Math.abs(viewport.height - check!.y - check!.height - viewport.height * .025)).toBeLessThan(.1);
    await page.screenshot({ path: `.verification/s1-pilot-${viewport.width}x${viewport.height}.png` });
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(input).toBeDisabled();
    await page.clock.fastForward(30_100);
    await expect(input).toBeEnabled();
    await expect(input).not.toBeFocused();
    expect(await page.locator('.question-brief').boundingBox()).toEqual(pane);
    await input.fill('vanadium');
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 01');
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 01');
  });
}

for (const year of ['L5', 'L6']) {
  test(`S1 ${year} grouping tiles retain appearance after selecting and clearing`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(`/?theory&year=${year}&question=${year === 'L5' ? 9 : 1}`);
    const tiles = page.locator('.grouping-item');
    const first = tiles.first();
    const box = await first.boundingBox();
    expect(box).toBeTruthy();
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(1);
    const before = await first.locator('img').evaluate(image => ({ filter: getComputedStyle(image).filter, opacity: getComputedStyle(image).opacity }));
    await first.click();
    await expect(first).toHaveAttribute('aria-label', /group 1/);
    await expect(first).toHaveCSS('background-color', 'rgb(92, 184, 250)');
    expect(await first.locator('img').evaluate(image => ({ filter: getComputedStyle(image).filter, opacity: getComputedStyle(image).opacity }))).toEqual(before);
    await expect(page.locator('.grouping-number')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset / clear groups' }).click();
    await expect(first).toHaveAttribute('data-group', '0');
    await expect(first).toBeEnabled();
    await page.screenshot({ path: `.verification/s1-grouping-${year}.png` });
  });
}
