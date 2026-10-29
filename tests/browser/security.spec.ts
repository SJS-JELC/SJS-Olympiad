import { expect, test, type Page } from '@playwright/test';
import { interrupt, mockFullscreen } from './fullscreen';

const key = 'sjs-olympiad-security-v1';
const question = (page: Page) => page.getByTestId('question-content');
async function start(page: Page) {
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(question(page)).toBeVisible();
}

test('landing stays unarmed and supports keyboard entry', async ({ page }) => {
  await mockFullscreen(page); await page.goto('./?security-test'); await interrupt(page, 'blur');
  await expect(question(page)).toHaveCount(0);
  const enter = page.getByRole('button', { name: 'Enter Competition Mode', exact: true });
  await enter.focus(); await page.keyboard.press('Enter'); await expect(question(page)).toBeVisible();
});

for (const reason of ['blur', 'hidden', 'fullscreen'] as const) {
  test(`${reason} removes question within the browser event stack and persists the lock`, async ({ page }) => {
    await mockFullscreen(page); await page.goto('./?security-test'); await start(page);
    const absentImmediately = await page.evaluate((eventReason) => {
      if (eventReason === 'blur') window.dispatchEvent(new Event('blur'));
      if (eventReason === 'hidden') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      }
      if (eventReason === 'fullscreen') (window as unknown as { securityTestFullscreen: { exit(): void } }).securityTestFullscreen.exit();
      return document.querySelector('[data-testid="question-content"]') === null;
    }, reason);
    expect(absentImmediately).toBe(true);
    await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!).session.status, key)).toBe('LOCKED');
    await page.reload(); await expect(question(page)).toHaveCount(0); await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
  });
}

test('wrong PIN stays locked, correct PIN commits unlock and event together', async ({ page }) => {
  await mockFullscreen(page); await page.goto('./?security-test'); await start(page); await interrupt(page, 'blur');
  await page.getByLabel('Staff PIN', { exact: true }).fill('0000'); await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Incorrect staff PIN.', { exact: true })).toBeVisible(); await expect(question(page)).toHaveCount(0);
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234'); await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await expect(question(page)).toBeVisible();
  const stored = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(stored.session.status).toBe('ACTIVE'); expect(stored.events.at(-1).type).toBe('STAFF_UNLOCK');
  // Match a stored credential value, not an incidental digit sequence in a UUID/date.
  expect(JSON.stringify(stored)).not.toContain('"1234"'); expect(JSON.stringify(stored)).not.toContain('"0000"');
});

test('fullscreen rejection keeps content gated', async ({ page }) => {
  await mockFullscreen(page, 'reject'); await page.goto('./?security-test');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(question(page)).toHaveCount(0); await expect(page.getByRole('alert')).toBeVisible();
});

test('interruption invalidates a pending fullscreen result', async ({ page }) => {
  await mockFullscreen(page, 'deferred'); await page.goto('./?security-test');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await interrupt(page, 'blur');
  await page.evaluate(() => (window as unknown as { securityTestFullscreen: { complete(): void } }).securityTestFullscreen.complete());
  await expect(page.getByRole('button', { name: 'Enter Competition Mode', exact: true })).toBeEnabled(); await expect(question(page)).toHaveCount(0);
});

test('storage write failure prevents question exposure', async ({ page }) => {
  await mockFullscreen(page); await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
  });
  await page.goto('./?security-test'); await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible(); await expect(question(page)).toHaveCount(0);
});

test('active refresh restores a lock and an external storage change cannot unlock', async ({ page }) => {
  await mockFullscreen(page); await page.goto('./?security-test'); await start(page); await page.reload();
  await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible(); await expect(question(page)).toHaveCount(0);
  await page.evaluate(storageKey => window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: JSON.stringify({ session: { status: 'ACTIVE' } }) })), key);
  await expect(question(page)).toHaveCount(0);
});

test('a second tab changing storage synchronously gates the first tab', async ({ page, context }) => {
  await mockFullscreen(page); await page.goto('./?security-test');
  // A second app instance would react to the initial ACTIVE write and lock
  // both tabs before start() can finish. Use a passive same-origin storage peer.
  const second = await context.newPage();
  const peerUrl = new URL('storage-peer', page.url()).href;
  await second.route(peerUrl, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Storage peer</title>' }));
  await second.goto(peerUrl);
  await page.bringToFront(); await start(page);
  await page.evaluate(storageKey => {
    // Registered after the app listener: observe the DOM in the same event stack.
    window.addEventListener('storage', event => {
      if (event.key === storageKey && event.newValue === null) {
        document.documentElement.dataset.questionAbsentOnStorage = String(
          document.querySelector('[data-testid="question-content"]') === null,
        );
      }
    });
  }, key);
  await second.evaluate(storageKey => localStorage.removeItem(storageKey), key);
  await expect(page.locator('html')).toHaveAttribute('data-question-absent-on-storage', 'true');
  await expect(question(page)).toHaveCount(0); await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(storageKey => {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return stored && {
      status: stored.session.status,
      reason: stored.session.lockReason,
      consistent: stored.session.eventCount === stored.events.length,
      lastEvent: stored.events.at(-1)?.type,
    };
  }, key)).toEqual({ status: 'LOCKED', reason: 'CROSS_TAB_CONFLICT', consistent: true, lastEvent: 'CROSS_TAB_CONFLICT' });
});

test('small viewport keeps PIN and controls reachable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 }); await mockFullscreen(page); await page.goto('./?security-test'); await start(page); await interrupt(page, 'blur');
  await expect(page.getByLabel('Staff PIN', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234'); await page.getByRole('button', { name: 'Staff unlock', exact: true }).click(); await expect(question(page)).toBeVisible();
});

test('real browser fullscreen entry and exit smoke', async ({ page }) => {
  await page.goto('./?security-test');
  test.skip(!await page.evaluate(() => typeof document.documentElement.requestFullscreen === 'function' && document.fullscreenEnabled), 'Browser does not expose fullscreen');
  await start(page); expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  await page.evaluate(() => document.exitFullscreen()); await expect(question(page)).toHaveCount(0);
});
