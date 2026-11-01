import { test, expect, claimAndStart, loginCompetitor, type ApiHarness } from './fixtures';
import { mockFullscreen } from './fullscreen';

async function schedule(api: ApiHarness, startsIn = -60000, endsIn = 3600000) {
  const staff = await api.service.login({ role: 'teacher', code: '5678' }), state = await api.service.session(staff.token), event = state.activeEvent;
  await api.service.eventUpdate(staff.token, { eventId: event.id, expectedRevision: event.revision, name: event.name, year: event.year, theoryStartsAt: Date.now()-60000, theoryEndsAt: Date.now()+7200000, practicalStartsAt: Date.now()+startsIn, practicalEndsAt: Date.now()+endsIn });
}

for (const [year, title, count] of [['L5','FLOATY',4],['L6','MOHR CRISPS',2],['U6','CLIPPY',4]] as const) {
  test(`${year} teacher practical is local-only and navigates without the service`, async ({ page, api }) => {
    await page.clock.install();
    await page.goto('/?settings');
    await page.getByRole('button', { name: 'Preview Questions', exact: true }).click();
    await page.getByRole('button', { name: `${year} practical: ${title}`, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.locator('.practical-responses input')).toHaveCount(count);
    await expect(page.getByRole('button', { name: 'Check', exact: true })).toHaveCount(0);
    await expect(page.getByText('Teacher Mode', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
    for (const action of ['practical-save','practical','session','events','teams','draft','action']) api.fail.add(action);
    await page.locator('#practical-numPracticalResponse4').fill('1e-');
    await page.locator('#practical-numPracticalResponse4').blur();
    await page.clock.fastForward(1000);
    await expect(page.locator('.practical-status')).toHaveCount(0);
    await expect(page.locator('.practical-save-error')).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to settings', exact: true }).click();
    await expect(page.locator('.teacher-settings')).toBeVisible();
    await expect(page.locator('.navigation-error')).toHaveCount(0);
    await page.getByRole('button', { name: `${year} practical: ${title}`, exact: true }).click();
    await expect(page.locator('#practical-numPracticalResponse4')).toHaveValue('');
    expect(api.requests.some(item=>item.action==='practical-save' || item.action==='practical')).toBe(false);
    expect(api.requests.some(item=>item.action==='submit')).toBe(false);
  });
}

test('selected-event preview and U5 unavailable practical respect the selected event', async ({ page }) => {
  await page.goto('/?settings&eventId=fixture-L6');
  await page.getByRole('button', { name: 'Preview practical', exact: true }).click();
  await expect(page.locator('.practical-title')).toContainText('MOHR CRISPS');
  await page.getByRole('button', { name: 'Back to landing' }).click();
  await page.goto('/?settings&eventId=fixture-U5');
  await expect(page.getByRole('button', { name: 'Preview practical', exact: true })).toBeDisabled();
});

for (const viewport of [{width:1200,height:800},{width:1920,height:1080},{width:2560,height:1440}]) {
  test(`practical protocol scroll and final answer remain readable at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    for (const year of ['L5','L6','U6']) {
      await page.goto(`/?practical&catalogue&year=${year}`);
      await expect(page.locator('.practical-responses input')).toHaveCount(year==='L6'?2:4);
      const bounds = await page.locator('.practical-protocol').evaluate(element => ({scroll:element.scrollHeight,client:element.clientHeight,bottom:element.getBoundingClientRect().bottom}));
      expect(bounds.scroll).toBeGreaterThan(bounds.client);
      const final = await page.locator('.practical-response').last().boundingBox();
      expect(final!.y).toBeGreaterThan(bounds.bottom); expect(final!.y+final!.height).toBeLessThan(viewport.height);
      const responses = await page.locator('.practical-responses').boundingBox();
      expect(Math.abs(final!.x+final!.width-responses!.x-responses!.width)).toBeLessThan(2);
      expect(Math.abs(viewport.height-responses!.y-responses!.height-viewport.height*.02)).toBeLessThan(2);
      const protocolWidth = await page.locator('.practical-protocol').evaluate(element => ({width:element.clientWidth,padding:parseFloat(getComputedStyle(element).paddingLeft)+parseFloat(getComputedStyle(element).paddingRight)}));
      const textWidth = await page.locator('.practical-protocol-text').evaluate(element => element.getBoundingClientRect().width);
      expect(Math.abs(textWidth-protocolWidth.width+protocolWidth.padding)).toBeLessThan(2);
      if(year==='L5')await expect(page.getByRole('img',{name:'Cuttlefish',exact:true})).toBeVisible();
      await page.screenshot({path:testInfo.outputPath(`${year}-${viewport.width}-protocol-top.png`)});
      await page.locator('.practical-protocol').evaluate(element => element.scrollTop=element.scrollHeight);
      await page.screenshot({path:testInfo.outputPath(`${year}-${viewport.width}-protocol-end.png`)});
      await expect(page.getByRole('button', { name: 'Back to settings' })).toBeVisible();
    }
  });
}

const competitor = test.extend({ accessRole:'competitor' as const });
competitor('GO and practical countdown gate content; autosave flushes, clears and restores only acknowledged precision', async ({ page, api }) => {
  await page.clock.install(); await schedule(api, 60000); await mockFullscreen(page); await page.goto('/?practical'); await loginCompetitor(page);
  await expect(page.locator('.practical-protocol')).toHaveCount(0);
  await page.getByRole('button', { name: 'LOCK IN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'GO', exact: true })).toBeVisible();
  await expect(page.locator('.practical-protocol')).toHaveCount(0);
  await page.getByRole('button', { name: 'GO', exact: true }).click();
  await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  await expect(page.getByRole('heading', { name: /Practical opens in/ })).toBeVisible();
  expect(api.requests.some(item=>item.action==='practical')).toBe(false);
  // The already-known opening time advances locally, with no session poll.
  const sessionReads=api.requests.filter(request=>request.action==='session').length;
  await page.clock.fastForward(61000);
  expect(api.requests.filter(request=>request.action==='session')).toHaveLength(sessionReads);
  await expect(page.locator('.practical-responses input')).toHaveCount(2, {timeout:20000});
  await page.locator('#practical-numPracticalResponse3').fill('2.500e1');
  await page.locator('#practical-numPracticalResponse4').fill('0');
  await page.getByRole('button', {name:'Theory challenge',exact:true}).click();
  await expect(page.locator('.theory-stage')).toBeVisible();
  await page.getByRole('button',{name:'Back to landing'}).click();
  await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  await expect(page.locator('#practical-numPracticalResponse3')).toHaveValue('2.500e1');
  await expect(page.locator('#practical-numPracticalResponse4')).toHaveValue('0');
  await page.locator('#practical-numPracticalResponse3').fill('');
  await page.locator('#practical-numPracticalResponse3').blur();
  await expect.poll(()=>api.requests.filter(item=>item.action==='practical-save').at(-1)?.body.changes.numPracticalResponse3).toBe(null);
  const previous=(await api.service.session(api.token)).team;await page.reload();await expect(page.getByLabel('Competitor code')).toBeVisible();await expect(page.locator('.practical-protocol')).toHaveCount(0);
  const staff=await api.service.login({role:'teacher',code:'5678'});await api.service.teamRelease(staff.token,{eventId:previous.eventId,teamId:previous.id,confirm:true});
  await claimAndStart(page);await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  await expect(page.locator('#practical-numPracticalResponse4')).toHaveValue('0');
});

competitor('invalid input stays local and failed saves block navigation until an idempotent retry', async ({page,api}) => {
  await schedule(api); await mockFullscreen(page); await page.goto('/'); await claimAndStart(page);
  await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  const input=page.locator('#practical-numPracticalResponse4'); await input.fill('1e-'); await input.blur();
  await expect(page.getByText(/Enter a finite number/)).toBeVisible();
  expect(api.requests.filter(item=>item.action==='practical-save')).toHaveLength(0);
  await page.locator('#practical-numPracticalResponse3').fill('20.0'); await page.locator('#practical-numPracticalResponse3').blur();
  await expect.poll(()=>api.requests.filter(item=>item.action==='practical-save').length).toBe(1);
  await expect(page.getByText('Saved',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Changes awaiting save…',{exact:true})).toBeVisible();
  api.lostResponses.add('practical-save'); await input.fill('1.2300'); await input.blur();
  await expect(page.getByRole('button',{name:'Retry save'})).toBeVisible();
  api.fail.add('practical-save'); await page.getByRole('button',{name:'Back to landing'}).click();
  await expect(page.locator('.navigation-error')).toBeVisible(); await expect(input).toHaveValue('1.2300');
  api.fail.delete('practical-save'); await page.getByRole('button',{name:'Retry save'}).click();
  await expect(page.getByRole('button',{name:'Retry save'})).toHaveCount(0);
  const writes=api.requests.filter(item=>item.action==='practical-save' && item.body.changes.numPracticalResponse4); expect(writes.at(-1)?.body.requestId).toBe(writes[0].body.requestId);
  await page.getByRole('button',{name:'Back to landing'}).click(); await expect(page.locator('.splash-stage')).toBeVisible();
});

competitor('practical closes read-only without a breach and retains its final result',async({page,api})=>{
  await page.clock.install(); await schedule(api,-60000,20000); await mockFullscreen(page); await page.goto('/'); await claimAndStart(page); await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  await page.locator('#practical-numPracticalResponse4').fill('1.50'); await page.locator('#practical-numPracticalResponse4').blur();
  await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  await page.locator('#practical-numPracticalResponse3').fill('1e-'); await page.locator('#practical-numPracticalResponse3').blur();
  await page.clock.fastForward(20001);
  await expect(page.locator('#practical-numPracticalResponse4')).toBeDisabled({timeout:20000});
  await expect(page.locator('#practical-numPracticalResponse4')).toHaveValue('1.50'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Discard unsaved changes and reload',exact:true}).click();
  await expect(page.locator('#practical-numPracticalResponse3')).toHaveValue('');
  await page.getByRole('button',{name:'Theory challenge',exact:true}).click(); await expect(page.locator('.theory-stage')).toBeVisible();
});

test('teacher team result distinguishes intermediate work, zero final and complete-event read-only',async({page,api})=>{
  await schedule(api);
  const login=await api.service.login({role:'competitor',code:'1234'}), teams=await api.service.teams(login.token), team=teams.teams[0];
  await api.service.claim(login.token,{teamId:team.id,requestId:crypto.randomUUID()}); let state=await api.service.session(login.token);
  await api.service.start(login.token,{epoch:state.competition.epoch,requestId:crypto.randomUUID()});
  let value=await api.service.practical(login.token,{}); value=await api.service.practicalSave(login.token,{requestId:crypto.randomUUID(),expectedRevision:value.revision,changes:{numPracticalResponse3:'20.00'}});
  await page.goto('/?settings'); const row=page.getByRole('row').filter({has:page.getByText(team.name,{exact:true})});
  await expect(row.getByText('Final answer not submitted',{exact:true})).toBeVisible(); await row.getByText('Working responses',{exact:true}).click(); await expect(row.getByText('20.00',{exact:true})).toBeVisible();
  await api.service.practicalSave(login.token,{requestId:crypto.randomUUID(),expectedRevision:value.revision,changes:{numPracticalResponse4:'0.000'}});
  const staff=await api.service.login({role:'teacher',code:'5678'}); state=await api.service.session(staff.token); await api.service.eventEnd(staff.token,{eventId:state.activeEvent.id,expectedRevision:state.activeEvent.revision,confirm:true});
  await page.reload(); await expect(row.getByText('0.000 g',{exact:true})).toBeVisible(); await expect(page.getByText('This event is complete. Results are read-only.')).toBeVisible(); await expect(row.getByRole('button',{name:/Allow reselection/})).toBeDisabled();
});

competitor('a fresh authorized entry loads a staff-extended practical deadline and saves', async ({ page, api }) => {
  await page.clock.install(); await schedule(api, -120000, -1000); await mockFullscreen(page);
  await page.goto('/'); await claimAndStart(page); await page.getByRole('button', { name: 'Practical challenge', exact: true }).click();
  const input = page.locator('#practical-numPracticalResponse4');
  await expect(input).toBeDisabled();
  expect((await api.service.practical(api.token)).readOnly).toBe(true);
  const previous=(await api.service.session(api.token)).team;await schedule(api);
  await page.clock.fastForward(15000);await expect(input).toBeDisabled();
  await page.reload();await expect(page.getByLabel('Competitor code')).toBeVisible();
  const staff=await api.service.login({role:'teacher',code:'5678'});await api.service.teamRelease(staff.token,{eventId:previous.eventId,teamId:previous.id,confirm:true});
  await claimAndStart(page);await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  await expect(input).toBeEnabled();
  await input.fill('1.2500'); await input.blur();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect((await api.service.practical(api.token)).responses.numPracticalResponse4).toEqual({ text: '1.2500', value: 1.25 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

competitor('held practical reloads disable edits and an older read cannot overwrite edits after the latest read', async ({ page, api }) => {
  await schedule(api);await mockFullscreen(page);await page.goto('/');await claimAndStart(page);await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
  const input = page.locator('#practical-numPracticalResponse4');
  await input.fill('1.00'); await input.blur();
  await expect.poll(async () => (await api.service.practical(api.token)).responses.numPracticalResponse4?.text).toBe('1.00');
  api.fail.add('practical-save'); await input.fill('2.00'); await input.blur();
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
  let reads = 0;
  const releases: (() => void)[] = [];
  await page.route('**/api/olympiad/practical', async route => {
    const snapshot = await api.service.practical(api.token, route.request().postDataJSON());
    const index = reads++;
    await new Promise<void>(resolve => { releases[index] = resolve; });
    await route.fulfill({ json: snapshot });
  });
  // Two same-turn discard actions deliberately overlap their asynchronous reads.
  await page.getByRole('button', { name: 'Discard unsaved changes and reload', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(() => reads).toBe(2);
  await expect(input).toBeDisabled(); await expect(input).toHaveValue('2.00');
  await expect(page.getByRole('status')).toHaveText('Loading saved responses…');
  releases[1]();
  await expect(input).toBeEnabled(); await expect(input).toHaveValue('1.00');
  api.fail.delete('practical-save'); await input.fill('3.00'); await input.blur();
  await expect.poll(async () => (await api.service.practical(api.token)).responses.numPracticalResponse4?.text).toBe('3.00');
  const olderResponse = page.waitForResponse(response => response.url().endsWith('/api/olympiad/practical'));
  releases[0](); await olderResponse;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(input).toHaveValue('3.00');
  await expect(page.getByRole('status')).toHaveCount(0);
});
