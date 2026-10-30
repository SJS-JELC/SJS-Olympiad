import { test, expect, openCompetitorQuestion } from './fixtures';
const competitor = test.extend({ accessRole: 'competitor' as const });
competitor('all questions use the authoritative server adapter and replay failed submissions idempotently', async ({ page, api }) => {
    await openCompetitorQuestion(page, api, 'L6', 8);
    await page.getByRole('textbox', { name: 'Equilibrium concentration of B', exact: true }).fill('0.437');
    api.lostResponses.add('submit');
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.locator('.cloud-status')).toContainText('Not saved');
    const first = api.requests.find(request => request.action === 'submit')!.body;
    await page.getByRole('button', { name: 'Retry save' }).click();
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
    const submitted = api.requests.filter(request => request.action === 'submit');
    expect(submitted).toHaveLength(2);
    expect(submitted[1].body).toEqual(first);
    expect((await api.service.session(api.token)).score).toBe(3);
});
test('unavailable restore fails closed without exposing any question', async ({ page, api }) => { api.fail.add('session'); await page.goto('/?theory&question=8'); await expect(page.getByRole('alert')).toContainText('unavailable'); await expect(page.locator('.question-content')).toHaveCount(0); });
test('failed drafts keep navigation on the question with a retry indicator', async ({ page, api }) => { await page.goto('/?theory&question=6'); await page.locator('input[name="answer"]').fill('36'); api.fail.add('draft'); await page.getByRole('button', { name: 'Back to theory' }).click(); await expect(page.locator('.cloud-status')).toContainText('Not saved'); await expect(page.locator('input[name="answer"]')).toHaveValue('36'); await expect(page).toHaveURL(/question=6/); api.fail.delete('draft'); await page.getByRole('button', { name: 'Retry save' }).click(); await expect(page.locator('.cloud-status')).toHaveCount(0); await page.getByRole('button', { name: 'Back to theory' }).click(); await expect(page.locator('.theory-stage')).toBeVisible(); });
test('delayed draft acknowledgements cannot overwrite a newer edit', async ({ page, api }) => { await page.goto('/?theory&question=6'); let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; }); let seen = false; await page.route('**/api/olympiad/draft', async (route) => { if (!seen) {
    seen = true;
    await wait;
} await route.fallback(); }); await page.locator('input[name="answer"]').fill('3'); await expect.poll(() => seen).toBe(true); await page.locator('input[name="answer"]').fill('36'); release(); await expect(page.locator('input[name="answer"]')).toHaveValue('36'); await page.getByRole('button', { name: 'Back to theory' }).click(); const drafts = api.requests.filter(request => request.action === 'draft'); expect(drafts.at(-1)!.body.answers.answer).toBe('36'); });
