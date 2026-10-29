import { expect, test } from '@playwright/test';
import { mockFullscreen, interrupt } from './fullscreen';

const key = 'sjs-olympiad-security-v1';
test('cog opens settings and back returns to an unarmed landing', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter Competition Mode', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await expect(page.getByRole('button', { name: 'Practical challenge', exact: true })).toBeVisible();
  await expect(page.getByTestId('question-content')).toHaveCount(0);
});

test('settings retains locking, staff unlock and safe back navigation', async ({ page }) => {
  await mockFullscreen(page);
  await page.goto('./?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await interrupt(page, 'blur');
  await expect(page.getByTestId('question-content')).toHaveCount(0);
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).session.status, key)).toBe('ACTIVE');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('question-content')).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).events.map((event: { type: string }) => event.type), key)).toEqual(['COMPETITION_STARTED', 'WINDOW_BLUR', 'STAFF_UNLOCK']);
});

for (const reason of ['blur', 'hidden', 'fullscreen'] as const) {
  test(`landing remains protected from ${reason} after internal navigation`, async ({ page }) => {
    await mockFullscreen(page);
    await page.goto('./?settings');
    await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
    await expect(page.getByTestId('question-content')).toBeVisible();
    await page.getByRole('link', { name: 'Back to landing' }).click();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await interrupt(page, reason);
    await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
    await expect(page.getByTestId('question-content')).toHaveCount(0);
    await page.goBack();
    await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
    expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).session.status, key)).toBe('LOCKED');
  });
}

test('real fullscreen survives internal navigation and active landing refresh locks', async ({ page }) => {
  await page.goto('./?settings');
  test.skip(!await page.evaluate(() => document.fullscreenEnabled), 'Fullscreen unavailable');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await page.getByRole('link', { name: 'Back to landing' }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).session.status, key)).toBe('ACTIVE');
  await page.reload();
  await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
  await expect(page.getByTestId('question-content')).toHaveCount(0);
});


test('staff can end a locked session, with an audit event and no fullscreen requirement', async ({ page }) => {
  await mockFullscreen(page);
  await page.goto('./?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await interrupt(page, 'fullscreen');
  const end = page.getByRole('button', { name: 'End Competition Mode', exact: true });
  await expect(end).toBeDisabled();
  await page.getByLabel('Staff PIN', { exact: true }).fill('0000');
  await end.click();
  await expect(page.getByRole('dialog').getByText('Incorrect staff PIN.', { exact: true })).toBeVisible();
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await end.click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  const snapshot = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
  expect(snapshot.session).toEqual({ status: 'NOT_STARTED', eventCount: snapshot.events.length });
  expect(snapshot.events.at(-1).type).toBe('COMPETITION_ENDED');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enter Competition Mode', exact: true })).toBeEnabled();
});

test('failed end persistence keeps the session locked', async ({ page }) => {
  await mockFullscreen(page);
  await page.goto('./?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await interrupt(page, 'blur');
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).session.status, key)).toBe('LOCKED');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'End Competition Mode', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).session.status, key)).toBe('LOCKED');
});

test('ending while fullscreen exits without overwriting the ended snapshot', async ({ page }) => {
  await page.goto('./?settings');
  test.skip(!await page.evaluate(() => document.fullscreenEnabled), 'Fullscreen unavailable');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(page.getByTestId('question-content')).toBeVisible();
  await interrupt(page, 'blur');
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'End Competition Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).session.status, key)).toBe('NOT_STARTED');
});

test('challenge ripple never expands the document during its animation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  const measurements = await page.evaluate(async () => {
    const before = document.documentElement.scrollHeight;
    (document.querySelector('.challenge-button') as HTMLButtonElement).click();
    const heights = [];
    for (let i = 0; i < 45; i++) { await new Promise(requestAnimationFrame); heights.push(document.documentElement.scrollHeight); }
    return { before, max: Math.max(...heights) };
  });
  expect(measurements.max).toBe(measurements.before);
});
