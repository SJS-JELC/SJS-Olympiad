import { openTeacher } from './teacher';
import { test, expect } from './fixtures';

test('one viewport backdrop survives navigation without shifting', async ({ page }) => {
 await openTeacher(page);
 const backdrop = page.locator('.olympiad-background');
 await expect(backdrop).toHaveCount(1);
 const initial = await backdrop.boundingBox();
 const floor = await page.locator('.olympiad-background__floor').boundingBox();
 await backdrop.evaluate(element => element.setAttribute('data-persistence-check', 'original'));
 await page.getByRole('button', { name: 'Preview Questions',exact:true }).click();
 await page.getByRole('button', { name: /^L6 Problem 5:/ }).click();
 await expect(backdrop).toHaveCount(1);
 await expect(backdrop).toHaveAttribute('data-persistence-check', 'original');
 expect(await backdrop.boundingBox()).toEqual(initial);
 expect(await page.locator('.olympiad-background__floor').boundingBox()).toEqual(floor);
 await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
 expect(await backdrop.boundingBox()).toEqual(initial);
 await page.getByRole('button', { name: 'Back to settings' }).click();
 expect(await backdrop.boundingBox()).toEqual(initial);
});
