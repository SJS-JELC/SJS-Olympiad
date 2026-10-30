import { expect, test } from './fixtures';

const event = { id: 'autumn', name: 'Autumn Olympiad', year: 'L6', status: 'active', revision: 1, endsAt: 1900000000000 };
const session = { role: 'teacher', expiresAt: 1900000000000, serverNow: 1800000000000, configRevision: 1, activeEvent: event, events: [event], team: null, competition: { status: 'NOT_STARTED', epoch: 1 }, score: 0, attempts: {} };

test('teacher leaderboard keeps the original podium and artwork in landscape', async ({ page }, testInfo) => {
  await page.route('**/api/olympiad/session', route => route.fulfill({ json: session }));
  await page.route('**/api/olympiad/leaderboard', route => route.fulfill({ json: { activeEvent: event, rows: [
    { teamId: 'eagles', name: 'Eagles', score: 8 }, { teamId: 'atoms', name: 'Atoms', score: 5 }, { teamId: 'ions', name: 'Ions', score: 1 },
  ] } }));
  for (const [width, height] of [[1368, 912], [1600, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/?leaderboard');
    await expect(page.getByRole('heading', { name: 'Leaderboard', exact: true })).toBeAttached();
    await expect(page.getByRole('status')).toContainText('Live results');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(page.locator('.leaderboard-place--3')).toContainText('1 Point');
    await expect(page.locator('select')).toHaveCount(0);
    const places = await page.locator('.leaderboard-place').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, right: box.right, bottom: box.bottom }; }));
    expect(places[0].y).toBeLessThan(places[1].y);
    expect(places[1].y).toBeLessThan(places[2].y);
    expect(places[1].right).toBeLessThan(places[0].x);
    expect(places[0].right).toBeLessThan(places[2].x);
    for (const box of places) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); expect(box.bottom).toBeLessThan(height); }
    await expect(page.locator('.leaderboard-art')).toHaveCount(3);
    await expect.poll(()=>page.locator('.leaderboard-art').evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`podium-${width}x${height}.png`) });
  }
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await page.setViewportSize({ width: 64, height: 64 });
  const favicon = await page.goto('/favicon.svg');
  expect(favicon?.ok()).toBe(true);
  await expect(page.locator('svg').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('favicon-64.png') });
});

test('hidden document pauses polling, resuming refreshes immediately and stale results remain visible', async ({ page }, testInfo) => {
  let calls = 0;
  await page.setViewportSize({ width: 1368, height: 912 });
  await page.route('**/api/olympiad/session', route => route.fulfill({ json: session }));
  await page.route('**/api/olympiad/leaderboard', route => {
    calls++;
    return calls === 2
      ? route.fulfill({ status: 503, json: { error: 'Unavailable' } })
      : route.fulfill({ json: { activeEvent: event, rows: [{ teamId: 'eagles', name: 'Eagles', score: calls > 2 ? 9 : 8 }] } });
  });
  await page.goto('/?leaderboard');
  await expect(page.locator('.leaderboard-place--1')).toContainText('Eagles');
  await expect(page.getByRole('status')).toHaveText('Live results');
  expect(calls).toBe(1);
  // Chromium headless tabs do not reliably become hidden when another tab is
  // brought forward. Dispatch the document visibility signal deterministically.
  const visibility = async (state: 'hidden' | 'visible') => page.evaluate(value => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
  await visibility('hidden');
  await page.waitForTimeout(3200);
  expect(calls).toBe(1);
  await visibility('visible');
  await expect.poll(() => calls, { timeout: 1500 }).toBe(2);
  await expect(page.getByRole('status')).toContainText('showing last received results');
  await expect(page.locator('.leaderboard-place--1')).toContainText('8 Points');
  await expect(page.locator('.leaderboard-place--2 .leaderboard-team')).toHaveText('');
  await expect(page.locator('.leaderboard-place--2 .leaderboard-points')).toHaveText('');
  await expect(page.locator('.leaderboard-place--3 .leaderboard-team')).toHaveText('');
  await expect(page.locator('.leaderboard-place--3 .leaderboard-points')).toHaveText('');
  await page.screenshot({ path: testInfo.outputPath('podium-empty-positions-stale.png') });
  await visibility('hidden');
  await page.waitForTimeout(3200);
  expect(calls).toBe(2);
  await expect(page.getByRole('status')).toContainText('showing last received results');
  await expect(page.locator('.leaderboard-place--1')).toContainText('8 Points');
  await visibility('visible');
  await expect.poll(() => calls, { timeout: 1500 }).toBe(3);
  await expect(page.locator('.leaderboard-place--1')).toContainText('9 Points');
  await expect(page.getByRole('status')).toHaveText('Live results');
  await page.getByRole('button', { name: 'Back to teacher settings' }).click();
  const stoppedAt = calls;
  await page.waitForTimeout(3200);
  expect(calls).toBe(stoppedAt);
});

