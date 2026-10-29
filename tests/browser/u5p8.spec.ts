import { expect, test } from '@playwright/test';

const route = '/?theory&year=U5&question=8';

test('Boundaries reference is keyboard accessible, contains only the formula aid and is removed on lock', async ({ page }) => {
  await page.goto('/?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode' }).click();
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await page.getByRole('button', { name: 'Theoretical Challenge' }).click();
  // Internal navigation preserves the active provider and fullscreen session.
  await page.evaluate(() => { history.pushState({}, '', '/?theory&year=U5&question=8'); window.dispatchEvent(new PopStateEvent('popstate')); });
  const trigger = page.getByRole('button', { name: 'Open spherical cap volume reference' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Spherical cap volume' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('V = πh²(3R − h)/3');
  await expect(dialog).toContainText('R: sphere radius · h: cap height');
  await expect(dialog).not.toContainText(/159|rate|interface|area/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.u5p8-reference')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Space');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Close reference' }).click();
  await expect(page.locator('.u5p8-reference')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Space');
  await expect(dialog).toBeVisible();
  const removed = await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    return !document.querySelector('[data-testid="u5p8-content"]') && !document.querySelector('.u5p8-reference');
  });
  expect(removed).toBe(true);
  await expect(page.getByRole('dialog', { name: 'COMPETITION MODE BREACHED' })).toBeVisible();
});

test('Boundaries standard submission rejects the old answer and preserves cooldown across navigation', async ({ page }) => {
  await page.clock.install();
  await page.goto(route);
  const answer = page.getByRole('textbox', { name: 'Volume of solution added in cm³' });
  await expect(answer).toBeFocused();
  await answer.fill('0.0325');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(answer).toBeDisabled();
  await expect(page.locator('.incorrect-feedback')).toBeVisible();
  await page.clock.fastForward(3000);
  await page.getByRole('button', { name: 'Retry in 17 seconds' }).click();
  await page.getByRole('button', { name: 'Back to theory' }).click();
  await page.getByRole('button', { name: 'Problem 8, 3 points, not yet solved', exact: true }).click();
  await expect(answer).toHaveValue('0.0325');
  await page.clock.fastForward(17100);
  await expect(answer).toBeEnabled();
  await answer.fill('159.5');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(answer).toBeDisabled();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
});

test('Boundaries accepts the higher interface solution through the shared form', async ({ page }) => {
  await page.goto(route);
  const answer = page.getByRole('textbox', { name: 'Volume of solution added in cm³' });
  await answer.fill('308.3');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(answer).toBeDisabled();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
});

for (const viewport of [{ width: 1200, height: 800 }, { width: 1440, height: 810 }, { width: 960, height: 640 }]) {
  test(`Boundaries bounded layout at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.u5p8-flask')).toBeVisible();
    await expect(page.locator('.u5p8-flask')).toContainText('10.0 cm');
    const dimensions = await page.locator('.u5p8-flask [data-dimension]').evaluateAll(paths => paths.map(path => {
      const style = getComputedStyle(path);
      return { name: path.getAttribute('data-dimension'), separateLine: !/M.*M/.test(path.getAttribute('d') ?? ''),
        arrowAtStart: style.markerStart !== 'none', arrowAtEnd: style.markerEnd !== 'none' };
    }));
    expect(dimensions).toEqual(['diameter', 'ester-depth', 'aqueous-depth'].map(name => ({ name, separateLine: true, arrowAtStart: true, arrowAtEnd: true })));
    await expect(page.locator('.u5p8-prompt')).not.toContainText('10.0 cm');
    const bounds = await page.evaluate(() => {
      const pane = document.querySelector('.u5p8-brief')!;
      const check = document.querySelector('.check-button')!.getBoundingClientRect();
      const answer = document.querySelector('#u5p8-answer')!.getBoundingClientRect();
      const diagram = document.querySelector('.u5p8-flask')!.getBoundingClientRect();
      const paneRect = pane.getBoundingClientRect();
      return { pageFits: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth,
        checkFits: check.bottom <= innerHeight && check.top >= 0, answerFits: answer.bottom <= innerHeight,
        diagramFits: diagram.top >= paneRect.top && diagram.bottom <= paneRect.bottom,
        paneFits: pane.scrollHeight <= pane.clientHeight + 1 };
    });
    expect(bounds).toEqual({ pageFits: true, checkFits: true, answerFits: true, diagramFits: true, paneFits: true });
  });
}
