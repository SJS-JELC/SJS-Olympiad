import { test, expect, openCompetitorQuestion, claimAndStart, resumeCompetition } from './fixtures';
import { mockFullscreen, interrupt } from './fullscreen';
const competitor = test.extend({ accessRole: 'competitor' as const });
const anonymous = test.extend({ accessRole: null });
anonymous('every direct route is behind the role access gate', async ({ page }) => {
    for (const query of ['', '?settings', '?leaderboard', '?theory&year=L5&question=1']) {
        await page.goto('/' + query);
        await expect(page.getByLabel('Competitor code')).toBeVisible();
        await expect(page.locator('.question-brief')).toHaveCount(0);
    }
});
anonymous('login verifies the selected server role before showing content', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Access', { exact: true }).selectOption('teacher');
    await page.getByLabel('Teacher code', { exact: true }).fill('1234');
    await page.getByRole('button', { name: 'Enter Olympiad' }).click();
    await expect(page.getByRole('alert')).toContainText('Code not recognised');
    await page.getByLabel('Teacher code', { exact: true }).fill('5678');
    await page.getByRole('button', { name: 'Enter Olympiad' }).click();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
});
competitor('team choice does not expose question content until explicit fullscreen Start', async ({ page }) => {
    await mockFullscreen(page);
    await page.goto('/?theory&question=5');
    await expect(page.getByRole('button', { name: 'Claim team', exact: true })).toBeVisible();
    await expect(page.locator('.question-brief')).toHaveCount(0);
    await page.getByRole('button', { name: 'Claim team', exact: true }).click();
    await expect(page.getByRole('button', { name: 'GO', exact: true })).toBeVisible();
    await expect(page.locator('.question-brief')).toHaveCount(0);
    await page.getByRole('button', { name: 'GO', exact: true }).click();
    await expect(page.locator('.question-brief')).toBeVisible();
});
for (const reason of ['blur', 'hidden', 'fullscreen'] as const)
    competitor(`${reason} unmounts question content in the browser event stack`, async ({ page, api }) => {
        await openCompetitorQuestion(page, api, 'L6', 5);
        const removed = await page.evaluate(reason => { if (reason === 'blur')
            window.dispatchEvent(new Event('blur')); if (reason === 'hidden') {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
        } if (reason === 'fullscreen')
            (window as any).securityTestFullscreen.exit(); return !document.querySelector('.question-content'); }, reason);
        expect(removed).toBe(true);
        await expect(page.getByRole('heading', { name: 'COMPETITION MODE BREACHED' })).toBeVisible();
        await expect.poll(async () => { const state = await api.service.session(api.token); return state.competition.status; }).toBe('LOCKED');
        await page.reload();
        await expect(page.locator('.question-content')).toHaveCount(0);
        await expect(page.getByLabel('Teacher code', { exact: true })).toBeVisible();
    });
competitor('teacher verification grants no access until explicit Resume fullscreen', async ({ page, api }) => {
    await openCompetitorQuestion(page, api, 'L6', 5);
    await interrupt(page, 'blur');
    await page.getByLabel('Teacher code', { exact: true }).fill('0000');
    await page.getByRole('button', { name: 'Verify teacher code' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('not recognised');
    await page.getByLabel('Teacher code', { exact: true }).fill('5678');
    await page.getByRole('button', { name: 'Verify teacher code' }).click();
    await expect(page.locator('.question-content')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resume competition' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume competition' }).click();
    await expect(page.locator('.question-content')).toBeVisible();
    expect((await api.service.session(api.token)).role).toBe('competitor');
});
competitor('fullscreen denial and interrupted deferred entry never expose a view', async ({ page }) => {
    await mockFullscreen(page, 'reject');
    await page.goto('/');
    await page.getByRole('button', { name: 'Claim team', exact: true }).click();
    await page.getByRole('button', { name: 'GO', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('denied');
    await expect(page.locator('.question-content')).toHaveCount(0);
});
competitor('deferred fullscreen entry is invalidated by a departure', async ({ page }) => {
    await mockFullscreen(page, 'deferred');
    await page.goto('/');
    await page.getByRole('button', { name: 'Claim team', exact: true }).click();
    await page.getByRole('button', { name: 'GO', exact: true }).click();
    await interrupt(page, 'blur');
    await page.evaluate(() => (window as any).securityTestFullscreen.complete());
    await expect(page.getByRole('button', { name: 'GO', exact: true })).toBeEnabled();
    await expect(page.locator('.question-content')).toHaveCount(0);
});
competitor('refresh and cross-tab updates cannot reactivate a locked session', async ({ page, api }) => {
    await openCompetitorQuestion(page, api, 'L6', 5);
    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'any-session-key', newValue: 'ACTIVE' })));
    await expect(page.locator('.question-content')).toHaveCount(0);
    await resumeCompetition(page);
    await expect(page.locator('.question-content')).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'other-tab', newValue: 'ACTIVE' })));
    await expect(page.getByRole('dialog')).toBeVisible();
});
competitor('offline protected actions and periodic session failure close content', async ({ page, api }) => {
    await page.clock.install();
    await openCompetitorQuestion(page, api, 'L6', 5);
    api.fail.add('session');
    await page.locator('.angle-input input').first().fill('300');
    await page.getByRole('button', { name: 'Check answers' }).click();
    await expect(page.locator('.question-content')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
});
competitor('event end and event boundary remove active question content', async ({ page, api }) => {
    await page.clock.install();
    await openCompetitorQuestion(page, api, 'L6', 5);
    const teacher = await api.service.login({ role: 'teacher', code: '5678' });
    const state=await api.service.session(teacher.token);
    await api.service.eventEnd(teacher.token, { eventId: 'fixture-L6',expectedRevision:state.activeEvent.revision, confirm: true });
    await page.clock.fastForward(15000);
    await expect(page.locator('.question-content')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'Waiting for an event'})).toBeVisible();
});
competitor('locked modal traps keyboard focus and cannot be dismissed by Escape or navigation', async ({ page, api }) => {
    await openCompetitorQuestion(page, api, 'L6', 5);
    await interrupt(page, 'blur');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    expect(await page.getByRole('dialog').evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.goBack();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.question-content')).toHaveCount(0);
});
test('teacher previews require neither fullscreen nor team claim', async ({ page }) => {
    await page.goto('/?theory&year=L5&question=1');
    await expect(page.locator('.question-brief')).toBeVisible();
    await interrupt(page, 'blur');
    await expect(page.locator('.question-brief')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});
anonymous('editable browser storage cannot authorize a question or teacher settings',async({page})=>{await page.addInitScript(()=>localStorage.setItem('sjs-olympiad-security-v1',JSON.stringify({role:'teacher',session:{status:'ACTIVE'}})));await page.goto('/?theory&question=5');await expect(page.getByLabel('Competitor code')).toBeVisible();await expect(page.locator('.question-content')).toHaveCount(0);});
competitor('known event deadline closes question content before the next periodic server poll without a breach',async({page,api})=>{const fixed=Date.now()+100;await page.clock.install({time:new Date(fixed)});await page.clock.pauseAt(new Date(fixed+1000));const staff=await api.service.login({role:'teacher',code:'5678'}),state=await api.service.session(staff.token);const now=await page.evaluate(()=>Date.now());api.setTime(now);await api.service.eventUpdate(staff.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,theoryEndsAt:now+1000});await openCompetitorQuestion(page,api,'L6',5);const polls=api.requests.filter(request=>request.action==='session').length;await page.clock.fastForward(1001);await expect(page.locator('.question-content')).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0);expect(api.requests.filter(request=>request.action==='session')).toHaveLength(polls);expect(api.requests.filter(request=>request.action==='breach')).toHaveLength(0);});
competitor('lost Start response is reconciled to a recoverable server lock without reload',async({page,api})=>{
 await mockFullscreen(page);await page.goto('/');await page.getByRole('button',{name:'Claim team',exact:true}).click();api.lostResponses.add('start');await page.getByRole('button',{name:'GO',exact:true}).click();await expect(page.getByLabel('Teacher code',{exact:true})).toBeVisible();await expect(page.locator('.question-content')).toHaveCount(0);await expect.poll(async()=>{const state=await api.service.session(api.token);return state.competition.status;}).toBe('LOCKED');await resumeCompetition(page);await page.getByRole('button',{name:'Theoretical Challenge'}).click();await page.getByRole('button',{name:/^Problem 5,/}).click();await expect(page.locator('.question-content')).toBeVisible();
});
competitor('lost Resume response consumes no browser activation and permits a new teacher recovery',async({page,api})=>{
 await openCompetitorQuestion(page,api,'L6',5);await interrupt(page,'blur');await page.getByLabel('Teacher code',{exact:true}).fill('5678');await page.getByRole('button',{name:'Verify teacher code'}).click();api.lostResponses.add('resume');await page.getByRole('button',{name:'Resume competition'}).click();await expect(page.getByLabel('Teacher code',{exact:true})).toBeVisible();await expect(page.locator('.question-content')).toHaveCount(0);await expect.poll(async()=>{const state=await api.service.session(api.token);return state.competition.status;}).toBe('LOCKED');await resumeCompetition(page);await expect(page.locator('.question-content')).toBeVisible();
});
competitor('fullscreen countdown opens theory and closes content without a breach while practical time remains',async({page,api})=>{
 const fixed=Date.now()+100;await page.clock.install({time:new Date(fixed)});await page.clock.pauseAt(new Date(fixed+1000));const now=await page.evaluate(()=>Date.now());api.setTime(now);
 const staff=await api.service.login({role:'teacher',code:'5678'}),state=await api.service.session(staff.token);
 await api.service.eventUpdate(staff.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,theoryStartsAt:now+1500,theoryEndsAt:now+3000,practicalStartsAt:now+3500,practicalEndsAt:now+6000});
 await mockFullscreen(page);await page.goto('/');await claimAndStart(page);await expect(page.locator('.splash-timing')).toContainText('Theory opens in');
 await page.getByRole('button',{name:'Theoretical Challenge'}).click();await expect(page.getByRole('button',{name:/^Problem 5,/})).toBeDisabled();await expect(page.locator('.question-content')).toHaveCount(0);
 await page.clock.fastForward(1501);await expect(page.getByRole('button',{name:/^Problem 5,/})).toBeEnabled();await page.getByRole('button',{name:/^Problem 5,/}).click();await expect(page.locator('.question-content')).toBeVisible();
 await page.clock.fastForward(1500);await expect(page.locator('.question-content')).toHaveCount(0);await expect(page.locator('.question-access')).toContainText('finished');await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(api.requests.some(request=>request.action==='breach')).toBe(false);api.setTime(await page.evaluate(()=>Date.now()));expect((await api.service.session(api.token)).competition.status).toBe('ACTIVE');
 await page.getByRole('button',{name:'Back to theory',exact:true}).click();await expect(page.locator('.theory-timer')).toContainText('finished');
});
