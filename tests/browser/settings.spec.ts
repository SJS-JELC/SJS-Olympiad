import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('lost deletion response keeps an actionable dialog and retries the same confirmed operation',async({page,api})=>{
 await page.goto('/?settings');await page.getByRole('button',{name:'Delete team Test team 1',exact:true}).click();api.lostResponses.add('team-delete');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/fetch|network|connection/i);const first=api.requests.find(request=>request.action==='team-delete')!.body;await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toHaveCount(0);const requests=api.requests.filter(request=>request.action==='team-delete');expect(requests).toHaveLength(2);expect(requests[1].body).toEqual(first);
});

test('panel toggles are independent and preserve event and code edits while collapsed',async({page})=>{
 await page.goto('/?settings');const events=page.getByRole('button',{name:'Events',exact:true}),codes=page.getByRole('button',{name:'Access codes',exact:true}),questions=page.getByRole('button',{name:'Questions Preview',exact:true});
 await expect(events).toHaveAttribute('aria-expanded','true');await expect(codes).toHaveAttribute('aria-expanded','false');await expect(questions).toHaveAttribute('aria-expanded','false');
 await page.getByLabel('Event name',{exact:true}).fill('Pending name');await events.focus();await page.keyboard.press('Enter');await expect(page.getByRole('toolbar',{name:'Event actions'})).toHaveCount(0);await expect(page.getByLabel('Event name',{exact:true})).not.toBeVisible();
 await codes.focus();await page.keyboard.press('Space');await page.getByLabel('New teacher code').fill('pending-code');await codes.click();await expect(page.getByLabel('New teacher code')).not.toBeVisible();
 await questions.click();await expect(questions).toHaveAttribute('aria-expanded','true');await expect(events).toHaveAttribute('aria-expanded','false');await events.click();await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('Pending name');await codes.click();await expect(page.getByLabel('New teacher code')).toHaveValue('pending-code');
 await page.getByRole('button',{name:'Back to landing',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Discard unsaved changes');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('Pending name');
});

test('event status selector uses confirmed forward lifecycle transitions and names-only selection',async({page,api})=>{
 await page.goto('/?settings');await expect(page.getByRole('toolbar',{name:'Event actions'}).getByRole('button').first()).toHaveText('Create new event');
 expect(await page.locator('#event-select option:not([value=""])').allTextContents()).toEqual(expect.arrayContaining(['L6 fixture event','L5 fixture event']));
 const status=page.getByRole('combobox',{name:'Event status',exact:true});await expect(status).toHaveValue('active');await expect(status.locator('option[value="draft"]')).toBeDisabled();
 await page.getByLabel('Selected event:').selectOption('fixture-L5');await expect(status).toHaveValue('draft');await expect(status.locator('option[value="ended"]')).toBeDisabled();
 await status.selectOption('active');await expect(page.getByRole('dialog')).toContainText('ends L6 fixture event');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(status).toHaveValue('draft');expect((await api.service.session(api.token)).activeEvent.id).toBe('fixture-L6');
 await status.selectOption('active');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(status).toHaveValue('active');expect((await api.service.session(api.token)).activeEvent.id).toBe('fixture-L5');
 await status.selectOption('ended');await expect(page.getByRole('dialog')).toContainText('cannot restart');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(status).toHaveValue('ended');await expect(status).toBeDisabled();expect((await api.service.session(api.token)).activeEvent).toBeNull();
});

test('compact toolbar preserves native validation, errors, timing groups and automatic refresh',async({page,api})=>{
 await page.clock.install();await page.goto('/?settings');
 await expect(page.locator('.settings-message')).toHaveCount(0);await expect(page.getByRole('button',{name:'Refresh settings',exact:true})).toHaveCount(0);
 await expect(page.getByText(/^Active event:/)).toHaveCount(0);await expect(page.getByText('All event times use Europe/London (UK time). Practical timings are optional.')).toHaveCount(0);
 expect(await page.locator('.settings-timing-tile legend').allTextContents()).toEqual(['Practical','Theory']);
 await expect(page.getByRole('group',{name:'Theory',exact:true}).getByLabel('Start',{exact:true})).toBeVisible();
 const toolbar=page.getByRole('toolbar',{name:'Event actions'}),save=toolbar.getByRole('button',{name:'Save event',exact:true});
 await expect(save).toHaveAttribute('title','Save event');await expect(save.locator('svg')).toHaveCount(1);
 await expect(toolbar.getByRole('button',{name:'Preview practical',exact:true})).toBeEnabled();
 await page.getByLabel('Event name',{exact:true}).fill('');await save.click();expect(api.requests.filter(request=>request.action==='event-update')).toHaveLength(0);expect(await page.getByLabel('Event name',{exact:true}).evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true);
 await page.getByLabel('Event name',{exact:true}).fill('L6 fixture event');
 const state=await api.service.session(api.token);await api.service.eventUpdate(api.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,name:'Automatic refresh'});
 await page.clock.fastForward(15000);await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('Automatic refresh');
 await page.getByRole('button',{name:'End event',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(save).toBeDisabled();await expect(page.getByRole('button',{name:/Delete team/})).toBeDisabled();await expect(page.getByRole('button',{name:/Allow reselection for/})).toBeDisabled();
});

test('Questions Preview is collapsed, ordered, keyboard accessible and isolated from the selected event',async({page,api})=>{
 await page.goto('/?settings&eventId=fixture-U6');const before=await api.service.session(api.token);
 await expect(page.locator('.settings-panel').first()).toHaveClass(/settings-questions/);
 const toggle=page.getByRole('button',{name:'Questions Preview',exact:true});await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('button',{name:/^U5 Problem/})).toHaveCount(0);
 await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('.problem-testing-card')).toHaveCount(33);await expect(page.locator('.practical-catalogue-list button')).toHaveCount(3);
 for(const year of ['L5','L6','U5','U6']) {
  const buttons=page.locator(`[aria-labelledby="testing-${year}"] .problem-testing-card`);
  const labels=await buttons.evaluateAll(elements=>elements.map(element=>element.getAttribute('aria-label')!));const order=labels.map(label=>Number(/Problem (\d)/.exec(label)![1]));expect(order).toEqual([...order].sort((a,b)=>a-b));
  for(let i=0;i<order.length;i++){await expect(buttons.nth(i).locator('.problem-testing-title')).toHaveCSS('text-transform','uppercase');await expect(buttons.nth(i).locator('.question-points')).toHaveClass(new RegExp(`question-points--${order[i]<=4?1:order[i]<=7?2:3}`));await expect(buttons.nth(i).locator('.question-points')).toHaveText(/^[123] points?$/);}
 }
 await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('button',{name:'Access codes',exact:true}).click();await page.getByRole('button',{name:'U5 Problem 6: Cubane',exact:true}).click();await expect(page.getByTestId('u5p6-content')).toBeVisible();await page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true}).fill('485');await page.getByRole('button',{name:'Check answers',exact:true}).click();await expect(page.locator('.completion-stamp')).toBeVisible();
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByRole('button',{name:'Questions Preview',exact:true})).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('button',{name:'Events',exact:true})).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('button',{name:'Access codes',exact:true})).toHaveAttribute('aria-expanded','true');await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U6');expect((await api.service.session(api.token)).events).toEqual(before.events);expect((await api.service.leaderboard(api.token)).entries).toEqual([]);
});

test('team table confirms permanent draft deletion and retains active wrong-attempt records on removal',async({page,api})=>{
 await page.goto('/?settings');const player=await api.service.login({role:'competitor',code:'1234'}),team=(await api.service.teams(player.token)).teams[0];await api.service.claim(player.token,{teamId:team.id});await api.service.start(player.token);await api.service.submit(player.token,{questionId:'L6P8',requestId:'settings-wrong-001',answers:{answer:'0'}});
 await page.reload();const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Test team 1',exact:true})});
 await expect(row).toBeVisible();expect(await page.locator('.settings-teams th').allTextContents()).toEqual(['Team','Practical answer','Theory score','Status','Actions']);await expect(row.getByRole('cell',{name:'Final answer not submitted',exact:true})).toBeVisible();await expect(row.getByRole('cell',{name:'Taken',exact:true})).toBeVisible();
 await row.getByRole('button',{name:/Allow reselection/}).click();await expect(page.getByRole('dialog')).toContainText('Test team 1');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(row.getByRole('cell',{name:'Available',exact:true})).toBeVisible();await expect(row.getByRole('button',{name:/Allow reselection/})).toBeDisabled();
 await row.getByRole('button',{name:/Delete team/}).click();await expect(page.getByRole('dialog')).toContainText('retained');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(row).toHaveCount(0);const stored=await api.repo.get('fixture-L6-'+team.id,'team');expect(stored.removed).toBe(true);expect(stored.score).toBe(0);expect((await api.repo.get('fixture-L6-'+team.id,'q-L6P8')).state.retryAt).toBeGreaterThan(0);await expect(page.locator('.settings-message')).toHaveCount(0);
 await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByRole('button',{name:'Delete team Test team 1',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Permanently delete Test team 1');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toBeVisible();await page.getByRole('button',{name:'Delete team Test team 1',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toHaveCount(0);
});
test('teacher cog opens event controls and returns to landing', async ({ page }) => { await page.goto('/'); await page.getByRole('button', { name: 'Settings', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible(); await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L6'); await page.getByRole('button', { name: 'Back to landing', exact: false }).click(); await expect(page.getByRole('button', { name: 'Theoretical Challenge' })).toBeVisible(); });
test('active year is immutable while draft name/year/end are editable', async ({ page, api }) => { await page.goto('/?settings'); await expect(page.locator('#event-year')).toBeDisabled(); await page.getByLabel('Selected event').selectOption('fixture-L5'); await expect(page.locator('#event-year')).toBeEnabled(); await page.locator('#event-name').fill('Edited event'); await page.locator('#event-year').selectOption('U6'); await page.getByRole('button', { name: 'Save event', exact: true }).click(); await expect.poll(async()=>(await api.service.session(api.token)).events.find((event:any)=>event.id==='fixture-L5').name).toBe('Edited event'); await expect(page.locator('.settings-message')).toHaveCount(0); const state = await api.service.session(api.token); expect(state.events.find((event: any) => event.id === 'fixture-L5')).toMatchObject({ name: 'Edited event', year: 'U6', status: 'draft' }); });
test('create event stores a draft in the event panel and activation confirms ending the prior event', async ({ page, api }) => { await page.goto('/?settings'); await page.getByRole('button', { name: 'Create new event', exact: true }).click(); await page.locator('#new-event-name').fill('New event'); await page.locator('#new-event-theory-start').fill('2030-01-02T13:00'); await page.locator('#new-event-theory-end').fill('2030-01-02T15:00'); await page.getByRole('button', { name: 'Create draft event' }).click(); await expect(page.getByLabel('Selected event')).not.toHaveValue(''); const state = await api.service.session(api.token), event = state.events.find((event: any) => event.name === 'New event'); expect(event.status).toBe('draft'); expect(event.theoryStartsAt).toBe(Date.parse('2030-01-02T13:00Z')); expect(event.practicalStartsAt).toBeNull(); await expect(page.getByLabel('Selected event')).toHaveValue(event.id); await page.getByRole('button', { name: 'Activate event', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('ends'); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); expect((await api.service.session(api.token)).activeEvent.id).toBe('fixture-L6'); await page.getByRole('button', { name: 'Activate event', exact: true }).click(); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); expect((await api.service.session(api.token)).activeEvent.id).toBe(event.id); });
test('end requires confirmation and ended event has no restart or edit controls', async ({ page, api }) => { await page.goto('/?settings'); await page.getByRole('button', { name: 'End event', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('cannot restart'); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByLabel('Event name', { exact: true }).first()).toBeDisabled(); await expect(page.getByRole('button', { name: 'Activate event', exact: true })).toHaveCount(0); expect((await api.service.session(api.token)).activeEvent).toBeNull(); });
test('team names are unique and release confirms revocation while retaining results', async ({ page, api }) => {
    await page.goto('/?settings');
    await page.getByLabel('New team name').fill('New team');
    await page.getByRole('button', { name: 'Add team', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'New team', exact: true })).toBeVisible();
    await page.getByLabel('New team name').fill('new TEAM');
    await page.getByRole('button', { name: 'Add team', exact: true }).click();
    await expect(page.locator('.teacher-settings').getByRole('alert')).toContainText('already exists');
    const competitor = await api.service.login({ role: 'competitor', code: '1234' }), teams = await api.service.teams(competitor.token), team = teams.teams[0];
    await api.service.claim(competitor.token, { teamId: team.id });
    await api.service.start(competitor.token);
    await api.service.submit(competitor.token, { questionId: 'L6P8', requestId: 'saved-result-000001', answers: { answer: '0.437' } });
    await page.reload();
    await page.getByRole('button', { name: 'Allow reselection for ' + team.name, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('retained');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const result = await api.service.teams(api.token, { eventId: 'fixture-L6' });
    expect(result.teams.find((entry: any) => entry.id === team.id)).toMatchObject({ score: 3, claimed: false });
    await expect.poll(() => api.service.session(competitor.token).catch((error: any) => error.status)).toBe(401);
});
test('changing codes retains issued sessions and updates server login checks', async ({ page, api }) => { await page.goto('/?settings'); await page.getByRole('button',{name:'Access codes',exact:true}).click(); await page.getByLabel('New competitor code').fill('changed-competitor'); await page.getByLabel('New teacher code').fill('changed-teacher'); await page.getByRole('button', { name: 'Save codes', exact: true }).click(); await expect(page.getByLabel('New competitor code')).toHaveValue(''); await expect(page.locator('.settings-message')).toHaveCount(0); expect((await api.service.session(api.token)).role).toBe('teacher'); await expect.poll(() => api.service.login({ role: 'teacher', code: '5678' }).catch((error: any) => error.status)).toBe(403); expect((await api.service.login({ role: 'teacher', code: 'changed-teacher' })).state.role).toBe('teacher'); });
test('selected event preview uses its saved year and remains unscored', async ({ page }) => { await page.goto('/?settings'); await page.getByLabel('Selected event').selectOption('fixture-U5'); await page.getByRole('button', { name: 'Preview theory' }).click(); await expect(page.locator('.theory-title')).toContainText('U5'); await expect(page.locator('.theory-score output')).toHaveAttribute('aria-label', 'Score: 00'); expect(await page.evaluate(() => document.fullscreenElement)).toBeNull(); });
test('stale event edits fail without overwriting staff changes or typed form values',async({page,api})=>{
 await page.goto('/?settings');await page.locator('#event-name').fill('My pending edit');const state=await api.service.session(api.token);await api.service.eventUpdate(api.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,name:'Other teacher edit'});await page.getByRole('button',{name:'Save event',exact:true}).click();await expect(page.locator('.teacher-settings').getByRole('alert')).toContainText(/refresh|changed/i);await expect(page.locator('#event-name')).toHaveValue('My pending edit');expect((await api.service.session(api.token)).activeEvent.name).toBe('Other teacher edit');await expect(page.getByRole('button',{name:'Refresh settings',exact:true})).toHaveCount(0);await page.reload();await expect(page.locator('#event-name')).toHaveValue('Other teacher edit');
});
test('stale code edits preserve entered values and do not silently replace newer codes',async({page,api})=>{
 await page.goto('/?settings');await page.getByRole('button',{name:'Access codes',exact:true}).click();await page.getByLabel('New competitor code').fill('pending-competitor');const state=await api.service.session(api.token);await api.service.codesUpdate(api.token,{expectedConfigRevision:state.configRevision,competitorCode:'newer-competitor'});await page.getByRole('button',{name:'Save codes',exact:true}).click();await expect(page.locator('.teacher-settings').getByRole('alert')).toContainText(/refresh|changed/i);await expect(page.getByLabel('New competitor code')).toHaveValue('pending-competitor');expect((await api.service.login({role:'competitor',code:'newer-competitor'})).state.role).toBe('competitor');
});
test('event schedules use London time, reject DST ambiguity and keep optional practical times paired',async({page,api})=>{
 await page.goto('/?settings');await page.getByRole('button',{name:'Create new event',exact:true}).click();await page.getByLabel('Event name',{exact:true}).fill('London schedule');
 await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('Start',{exact:true}).fill('2026-10-25T01:30');await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('End',{exact:true}).fill('2026-10-25T03:00');await page.getByRole('button',{name:'Create draft event',exact:true}).click();
 await expect(page.locator('.settings-message')).toContainText('occurs twice');expect((await api.service.session(api.token)).events.some((event:any)=>event.name==='London schedule')).toBe(false);
 await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('Start',{exact:true}).fill('2030-07-15T12:00');await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('End',{exact:true}).fill('2030-07-15T13:00');await page.getByRole('group',{name:'Practical',exact:true}).getByLabel('Start',{exact:true}).fill('2030-07-15T12:30');await page.getByRole('button',{name:'Create draft event',exact:true}).click();await expect(page.locator('.settings-message')).toContainText('both practical');
 await page.getByRole('group',{name:'Practical',exact:true}).getByLabel('End',{exact:true}).fill('2030-07-15T14:00');await page.getByRole('button',{name:'Create draft event',exact:true}).click();await expect(page.getByLabel('Selected event')).not.toHaveValue('');await expect(page.locator('.settings-message')).toHaveCount(0);
 const event=(await api.service.session(api.token)).events.find((event:any)=>event.name==='London schedule');expect(event.theoryStartsAt).toBe(Date.parse('2030-07-15T11:00Z'));expect(event.endsAt).toBe(Date.parse('2030-07-15T13:00Z'));
});
test('late team responses cannot populate a different selected event',async({page})=>{
 let release!:()=>void;const delayed=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/olympiad/teams?eventId=fixture-L5',async route=>{await delayed;await route.fulfill({json:{teams:[{id:'late-team',name:'Late L5 team',eventId:'fixture-L5',year:'L5',claimGeneration:0}]}});});
 await page.goto('/?settings');await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByLabel('Selected event').selectOption('fixture-U5');await expect(page.getByRole('heading',{name:'Teams · U5 fixture event'})).toBeVisible();release();
 await expect(page.getByRole('cell',{name:'Late L5 team',exact:true})).toHaveCount(0);await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toBeVisible();
});
test('shared teacher navigation retains the authenticated landing and preview event',async({page,api})=>{
 await page.goto('/?theory&eventId=fixture-U5&question=6');await expect(page.getByText('Teacher Mode',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Back to theory',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U5');await page.getByRole('button',{name:'Back to landing',exact:true}).click();await expect(page.getByRole('button',{name:'Theoretical Challenge'})).toBeVisible();expect((await api.service.session(api.token)).role).toBe('teacher');
});

for (const viewport of [{width:2560,height:1440},{width:1200,height:800}]) {
 test(`settings event panel render evidence at ${viewport.width}x${viewport.height}`,async({page,api},testInfo)=>{
  await page.setViewportSize(viewport);
  await page.goto('/');
  await expect(page.getByText('Teacher Mode',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:testInfo.outputPath(`settings-navigation-home-${viewport.width}x${viewport.height}.png`)});

  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L6');
  await expect(page.locator('.settings-event-status')).toHaveValue('active');
  await expect(page.locator('.settings-events .settings-teams')).toBeVisible();
  await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toBeVisible();
  const originalBackArrow=await readFile(new URL('../../src/assets/powerapp/backarrow.svg',import.meta.url),'utf8');
  const backArtwork=page.locator('.settings-header .artwork-back img');
  await expect(backArtwork).toBeVisible();
  const artwork=await backArtwork.evaluate(async(element,original)=>{
   const image=element as HTMLImageElement;await image.decode();
   const source=image.currentSrc||image.src;
   let svg:string;
   if(source.startsWith('data:')){const comma=source.indexOf(',');const payload=source.slice(comma+1);svg=source.slice(0,comma).includes(';base64')?atob(payload):decodeURIComponent(payload);}
   else svg=await(await fetch(source)).text();
   // Vite may inline and compact SVG whitespace/quotes. Compare its full parsed
   // artwork tree with the original, rather than depending on an asset URL.
   const signature=(text:string)=>{
    const visit=(node:Node):unknown=>node.nodeType===Node.ELEMENT_NODE?[(node as Element).tagName,Array.from((node as Element).attributes).map(attribute=>[attribute.name,attribute.value.trim().replace(/\s+/g,' ')]).sort(([a],[b])=>a.localeCompare(b)),Array.from(node.childNodes).filter(child=>child.nodeType===Node.ELEMENT_NODE||child.nodeType===Node.TEXT_NODE&&!!child.textContent?.trim()).map(visit)]:node.textContent?.trim().replace(/\s+/g,' ');
    return JSON.stringify(visit(new DOMParser().parseFromString(text,'image/svg+xml').documentElement));
   };
   return{originalArtwork:signature(svg)===signature(original),loaded:image.complete&&image.naturalWidth>0,rotation:getComputedStyle(image).transform};
  },originalBackArrow);
  expect(artwork).toEqual({originalArtwork:true,loaded:true,rotation:'matrix(-1, 0, 0, -1, 0, 0)'});
  await expect(page.getByRole('button',{name:'Back to landing',exact:true})).toBeVisible();
  await expect(page.getByText('Teacher Mode',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`settings-active-teams-${viewport.width}x${viewport.height}.png`),fullPage:true});

  await page.getByRole('button',{name:'Create new event',exact:true}).click();
  await expect(page.locator('.settings-events #new-event-name')).toBeVisible();
  await expect(page.locator('.settings-event-status')).toHaveValue('draft');
  await expect(page.locator('.settings-events .settings-timing-tile')).toHaveCount(2);
  await expect(page.getByRole('heading',{name:'Create an event',exact:true})).toHaveCount(0);
  await expect(page.getByText('Teacher Mode',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`settings-add-new-${viewport.width}x${viewport.height}.png`),fullPage:true});

  await page.getByRole('button',{name:'Back to landing',exact:true}).click();
  await expect(page.getByRole('button',{name:'Theoretical Challenge'})).toBeVisible();
  expect((await api.service.session(api.token)).role).toBe('teacher');
 });
}
