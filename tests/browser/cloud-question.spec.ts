import { test, expect, openCompetitorQuestion } from './fixtures';
const competitor = test.extend({ accessRole: 'competitor' as const });

competitor('GO hydrates the year once; ordinary open/edit/navigation is local and CHECK is one request', async ({ page, api }) => {
    await page.clock.install();
    await openCompetitorQuestion(page, api, 'L6', 8);
    expect(api.requests.filter(item => item.action === 'question' || item.action === 'hydrate')).toHaveLength(0);
    const before = api.requests.length;
    await page.getByRole('textbox', { name: 'Equilibrium concentration of B', exact: true }).fill('0.437');
    await page.clock.fastForward(16000);
    await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
    await page.getByRole('button', { name: /^Problem 6,/ }).click();
    await page.locator('input[name="answer"]').fill('30');
    await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
    await page.getByRole('button', { name: /^Problem 8,/ }).click();
    await expect(page.getByRole('textbox', { name: 'Equilibrium concentration of B', exact: true })).toHaveValue('0.437');
    expect(api.requests.slice(before)).toEqual([]);
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.locator('.completion-stamp')).toBeVisible();
    expect(api.requests.slice(before).map(item => item.action)).toEqual(['submit']);
});

competitor('failed CHECK is honest, does not block navigation and retries its frozen receipt', async ({ page, api }) => {
    await openCompetitorQuestion(page, api, 'L6', 8);
    await page.getByRole('textbox', { name: 'Equilibrium concentration of B', exact: true }).fill('0.437');
    api.lostResponses.add('submit');
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.locator('.cloud-status')).toContainText('Not saved');
    await expect(page.locator('.completion-stamp')).toHaveCount(0);
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 00');
    const first = api.requests.find(request => request.action === 'submit')!.body;
    const before = api.requests.length;
    await page.getByRole('button', { name: 'Back to theory' }).click();
    await expect(page.locator('.theory-stage')).toBeVisible();
    await page.getByRole('button', { name: /^Problem 8,/ }).click();
    expect(api.requests.slice(before)).toEqual([]);
    await page.getByRole('button', { name: 'Retry save' }).click();
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
    const submitted = api.requests.filter(request => request.action === 'submit');
    expect(submitted).toHaveLength(2); expect(submitted[1].body).toEqual(first);
    expect((await api.service.session(api.token)).score).toBe(3);
});

competitor('practical keeps its one read and one autosave without a session preflight', async ({ page, api }) => {
    const staff = await api.service.login({ role: 'teacher', code: '5678' });
    const state = await api.service.session(staff.token), event = state.activeEvent;
    await api.service.eventUpdate(staff.token, { eventId: event.id, expectedRevision: event.revision, name: event.name, year: event.year, theoryStartsAt: Date.now() - 60000, theoryEndsAt: Date.now() + 7200000, practicalStartsAt: Date.now() - 60000, practicalEndsAt: Date.now() + 3600000 });
    await page.clock.install(); await openCompetitorQuestion(page, api, 'L6');
    await page.getByRole('button', { name: 'Back to landing', exact: true }).click();
    const before = api.requests.length;
    await page.getByRole('button', { name: 'Practical challenge', exact: true }).click();
    await expect(page.locator('#practical-numPracticalResponse3')).toBeVisible();
    expect(api.requests.slice(before).map(item => item.action)).toEqual(['practical']);
    await page.locator('#practical-numPracticalResponse3').fill('25.000');
    await page.clock.fastForward(500);
    await expect(page.locator('.practical-status')).toContainText('Saved');
    expect(api.requests.slice(before).map(item => item.action)).toEqual(['practical', 'practical-save']);
});

test('unavailable restore fails closed without exposing any question', async ({ page, api }) => {
    api.fail.add('session'); await page.goto('/?theory&question=8'); await expect(page.getByRole('alert')).toContainText('unavailable'); await expect(page.locator('.question-content')).toHaveCount(0);
});

test('teacher contexts hydrate once and unfinished edits remain only in memory', async ({ page, api }) => {
    await page.goto('/?settings');
    await page.getByRole('button', { name: 'Preview Questions', exact: true }).click();
    await page.getByRole('button', { name: /^L6 Problem 6:/ }).click();
    await page.locator('input[name="answer"]').fill('3');
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: /^U5 Problem 6:/ }).click();
    await expect(page.locator('.question-brief')).toBeVisible();
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await page.getByRole('button', { name: /^L6 Problem 6:/ }).click();
    await expect(page.locator('input[name="answer"]')).toHaveValue('3');
    expect(api.requests.filter(item => item.action === 'hydrate').map(item => item.body.eventId)).toEqual(['catalogue-L6', 'catalogue-U5']);
    expect(api.requests.filter(item => item.action === 'question' || item.action === 'draft')).toEqual([]);
    await page.reload(); await expect(page.locator('input[name="answer"]')).toHaveValue('');
    expect(api.requests.filter(item => item.action === 'hydrate')).toHaveLength(3);
});

test('GC setup and report work stay local around one Run and one deadline reconciliation', async ({ page, api }) => {
    await page.clock.install(); await page.goto('/?theory&catalogue&year=U5&question=5');
    await page.getByRole('button', { name: 'Enter Laboratory', exact: true }).click();
    const before = api.requests.length;
    const dilution = page.getByRole('slider', { name: 'citrus concentration', exact: true });
    await dilution.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Add Citrus scent to injector', exact: true }).click();
    await page.keyboard.press('Tab');
    expect(api.requests.slice(before)).toEqual([]);
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Running', exact: true })).toBeDisabled();
    expect(api.requests.slice(before).map(item => item.body.action)).toEqual([{ type: 'gc-run', sample: 'citrus', concentration: 0.5 }]);
    await page.clock.fastForward(6250); await expect(page.locator('.gc-printout')).toHaveCount(1);
    expect(api.requests.slice(before).map(item => item.body.action.type)).toEqual(['gc-run', 'tick']);
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toHaveCount(0);
    await page.locator('.gc-printout').focus(); await page.keyboard.press('ArrowLeft');
    await page.getByRole('button', { name: /^Enlarge run / }).click(); await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    expect(api.requests.slice(before).map(item => item.body.action.type)).toEqual(['gc-run', 'tick']);
});

test('timed challenge sends one GO and name CHECK, with a local wrong flash and one timeout tick', async ({ page, api }) => {
    await page.clock.install(); await page.goto('/?theory&catalogue&year=L6&question=3');
    await expect(page.getByRole('button', { name: 'GO: start oxyanion challenge', exact: true })).toBeVisible();
    const before = api.requests.length;
    await page.getByRole('button', { name: 'GO: start oxyanion challenge', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Oxyanion name', exact: true })).toBeEnabled();
    await page.getByRole('textbox', { name: 'Oxyanion name', exact: true }).fill('wrong');
    await page.getByRole('button', { name: 'Submit oxyanion name', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Incorrect', exact: true })).toBeVisible();
    await page.clock.fastForward(750);
    await expect(page.getByRole('img', { name: 'Incorrect', exact: true })).toHaveCount(0);
    expect(api.requests.slice(before).map(item => item.action)).toEqual(['action', 'submit']);
    await page.clock.fastForward(75000); await expect(page.locator('.l6p3-reveal')).toBeVisible();
    expect(api.requests.slice(before).map(item => item.action)).toEqual(['action', 'submit', 'action']);
    expect(api.requests.at(-1)!.body.action.type).toBe('tick');
});
