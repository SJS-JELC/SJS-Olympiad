import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1200, height: 800 }, { width: 1440, height: 810 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  for (const question of [1, 2, 3, 4, 5, 6, 7, 8]) {
    test(`L5P${question} composition at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.goto(`/?theory&year=L5&question=${question}`);
      await page.evaluate(() => document.fonts.ready);
      const inputs = page.locator('.question-answer-form input');
      await expect(inputs.first()).toBeFocused();
      const pane = await page.locator('.question-brief').boundingBox();
      const input = await inputs.first().boundingBox();
      const check = await page.locator('.check-button').boundingBox();
      expect(pane && input && check).toBeTruthy();
      expect(pane!.y + pane!.height).toBeLessThan(input!.y);
      expect(input!.y + input!.height).toBeLessThan(check!.y);
      expect(check!.y + check!.height).toBeLessThan(viewport.height);
      expect(Math.abs(viewport.height - check!.y - check!.height - viewport.height * .025)).toBeLessThan(.1);
      expect(Math.abs(check!.height - viewport.height * .08)).toBeLessThan(.1);
      expect(await page.locator('.olympiad-question-heading__title').evaluate(title => parseFloat(getComputedStyle(title).fontSize))).toBeCloseTo(viewport.height * .046, 1);
      const titlePane = await page.locator('.question-title-panel').boundingBox();
      expect(Math.abs(pane!.y - titlePane!.y - titlePane!.height - viewport.height * .01)).toBeLessThan(.1);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
      expect(Math.abs(check!.x + check!.width / 2 - viewport.width / 2)).toBeLessThan(2);
      for (const element of await inputs.all()) {
        const box = await element.boundingBox();
        expect(box!.x).toBeGreaterThan(0);
        expect(box!.x + box!.width).toBeLessThan(viewport.width);
      }
      if (question === 5 || question === 7) {
        const diagrams = page.locator(question === 5 ? '.l5p5-formulae figure' : '.l5p7-diagrams figure');
        for (let index = 0; index < await inputs.count(); index++) {
          const diagram = await diagrams.nth(index).boundingBox();
          const answer = await inputs.nth(index).boundingBox();
          expect(Math.abs(diagram!.x + diagram!.width / 2 - answer!.x - answer!.width / 2)).toBeLessThan(2);
        }
      }
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `.verification/consistency-l5/l5p${question}-${viewport.width}x${viewport.height}.png` });
    });
  }
}

test('L5 controls remain visible at 125% desktop zoom equivalent', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1.25 });
  const page = await context.newPage();
  for (const question of [1, 2, 3, 4, 5, 6, 7, 8]) {
    await page.goto(`${baseURL}/?theory&year=L5&question=${question}`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.question-answer-form input').first()).toBeFocused();
    const check = await page.locator('.check-button').boundingBox();
    expect(check!.y).toBeGreaterThan(0);
    expect(check!.y + check!.height).toBeLessThan(640);
    expect(Math.abs(640 - check!.y - check!.height - 16)).toBeLessThan(.1);
    await page.screenshot({ path: `.verification/consistency-l5/l5p${question}-zoom125.png` });
  }
  await context.close();
});
