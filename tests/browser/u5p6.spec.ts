import { expect, test } from '@playwright/test';

const route = '/?theory&year=U5&question=6';

test('Cubane uses a rotatable model, persists a non-restarting cooldown, and awards two points once', async ({ page }) => {
  await page.clock.install();
  await page.goto(route);
  await expect(page.getByTestId('u5p6-content')).toBeVisible();
  const diagram = page.getByRole('group', {name:/Cubane molecule/});
  await expect(diagram).toBeVisible();
  const before=await diagram.locator('[data-atom="C0"]').innerHTML();
  await diagram.focus(); await page.keyboard.press('ArrowRight');
  expect(await diagram.locator('[data-atom="C0"]').innerHTML()).not.toBe(before);
  await page.getByRole('button',{name:'Reset view'}).click();
  expect(await diagram.locator('[data-atom="C0"]').innerHTML()).toBe(before);
  const box=(await diagram.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+30,{steps:6});await page.mouse.up();
  expect(await diagram.locator('[data-atom="C0"]').innerHTML()).not.toBe(before);
  await page.getByRole('textbox',{name:'Greatest hydrogen separation in pm'}).focus();
  const answer = page.getByRole('textbox', { name: 'Greatest hydrogen separation in pm' });
  await expect(answer).toBeFocused();
  await answer.fill('485pm');
  await expect(answer).toHaveValue('');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(answer).toBeDisabled();
  await expect(page.locator('.incorrect-feedback')).toBeVisible();
  await page.clock.fastForward(5000);
  await page.locator('.check-button').click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label', 'Retry in 15 seconds');
  await page.getByRole('button', { name: 'Back to theory' }).click();
  await page.getByRole('button', { name: 'Problem 6, 2 points, not yet solved', exact: true }).click();
  await expect(answer).toBeDisabled();
  await page.clock.fastForward(15_000);
  await expect(answer).toBeEnabled();
  await answer.fill('485');
  await expect(page.locator('.answer-input__unit')).toHaveText('pm');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 02');
  await expect(answer).toBeDisabled();
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 02');
  await page.getByRole('button', { name: 'Back to theory' }).click();
  await expect(page.getByRole('button', { name: 'Problem 6, 2 points, correct', exact: true })).toBeVisible();
});

for (const viewport of [{ width: 1200, height: 800 }, { width: 1440, height: 810 }, { width: 960, height: 600 }]) {
  test(`Cubane keeps artwork and answer controls within ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await expect(page.getByTestId('u5p6-content')).toBeVisible();
    for (const selector of ['.question-brief', '.u5p6-diagram', '#u5p6-answer', '.check-button']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await expect(page.locator('.cubane-model [data-atom]')).toHaveCount(16);
    await page.screenshot({path:'test-results/cubane-3d-'+viewport.width+'.png'});
  });
}
