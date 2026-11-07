import { test, expect,fixtureTeamRow } from './fixtures';
import { openTeacher, openEvents, reloadTeacher } from './teacher';

test('delayed initial events read preserves typed event fields',async({page})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let started=false;
 await page.route('**/api/olympiad/events',async route=>{started=true;await held;await route.fallback();});
 await openEvents(page);await expect.poll(()=>started).toBe(true);
 const name=page.getByLabel('Event name',{exact:true});
 const response=page.waitForResponse(value=>new URL(value.url()).pathname.endsWith('/events'));
 try{await name.fill('Typed while initial events read waits');}finally{release();}
 await response;await expect(name).toHaveValue('Typed while initial events read waits');
 await expect(page.getByRole('button',{name:'Save event',exact:true})).toBeEnabled();
});

test('captured old initial events read cannot replace a confirmed save or its revision',async({page,api})=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let captured=false;
 await page.route('**/api/olympiad/events',async route=>{
  const value=await api.service.events(api.token);captured=true;await held;await route.fulfill({json:value});
 });
 await openEvents(page);await expect.poll(()=>captured).toBe(true);
 const name=page.getByLabel('Event name',{exact:true}),save=page.getByRole('button',{name:'Save event',exact:true});
 const response=page.waitForResponse(value=>new URL(value.url()).pathname.endsWith('/events'));
 try{
  await name.fill('Confirmed newer event name');await save.click();
  await expect.poll(()=>api.requests.filter(r=>r.action==='event-update').length).toBe(1);
  await expect(name).toBeEnabled();await expect(name).toHaveValue('Confirmed newer event name');
 }finally{release();}
 await (await response).finished();
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await expect(name).toHaveValue('Confirmed newer event name');
 // A second save also proves the old response did not restore the old revision.
 await name.fill('Second confirmed event name');await save.click();await expect(name).toBeEnabled();
 await expect.poll(async()=>(await api.service.events(api.token)).events.find((event:any)=>event.id==='fixture-L6').name).toBe('Second confirmed event name');
 const writes=api.requests.filter(r=>r.action==='event-update');expect(writes).toHaveLength(2);expect(writes[1].body.expectedRevision).toBe(writes[0].body.expectedRevision+1);
});

test('lost deletion response closes consent and retries the same operation from roster status',async({page,api})=>{
 await openEvents(page, '/?settings');await page.getByRole('button',{name:'Remove team Test team 1',exact:true}).click();api.lostResponses.add('team-remove');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Roster save status')).toContainText(/fetch|network|connection/i);const first=api.requests.find(request=>request.action==='team-remove')!.body;await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toHaveCount(0);const requests=api.requests.filter(request=>request.action==='team-remove');expect(requests).toHaveLength(2);expect(requests[1].body).toEqual(first);
});

test('panel toggles are independent and preserve event edits while collapsed',async({page})=>{
 await openEvents(page);const events=page.getByRole('button',{name:'Events',exact:true}),backend=page.getByRole('button',{name:'Backend settings',exact:true}),questions=page.getByRole('button',{name:'Preview Questions',exact:true});
 await expect(backend).toHaveAttribute('aria-expanded','false');await expect(questions).toHaveAttribute('aria-expanded','false');
 await page.getByLabel('Event name',{exact:true}).fill('Pending name');await events.focus();await page.keyboard.press('Enter');await expect(page.getByRole('toolbar',{name:'Event actions'})).toHaveCount(0);await expect(page.getByLabel('Event name',{exact:true})).not.toBeVisible();
 await backend.focus();await page.keyboard.press('Space');await expect(backend).toHaveAttribute('aria-expanded','true');await backend.click();
 await questions.click();await expect(questions).toHaveAttribute('aria-expanded','true');await expect(events).toHaveAttribute('aria-expanded','false');await events.click();await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('Pending name');
 await page.getByRole('button',{name:'U5 Problem 6: Cubone',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Discard unsaved changes');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('Pending name');
});

test('legacy unfinished events require explicit completion before activation',async({page,api})=>{
 await openEvents(page);expect(await page.locator('#event-select option:not([value=""])').allTextContents()).toEqual(expect.arrayContaining(['L6 fixture event','L5 fixture event']));
 const status=page.getByRole('combobox',{name:'Event status',exact:true});await expect(status).toHaveValue('active');await expect(status.locator('option[value="draft"]')).toBeEnabled();await expect(page.getByRole('button',{name:'Create new event',exact:true})).toBeDisabled();
 await page.getByLabel('Selected event').selectOption('fixture-L5');await expect(status).toHaveValue('draft');await expect(status.locator('option[value="ended"]')).toBeEnabled();
 await status.selectOption('active');await expect(page.getByRole('dialog')).toContainText('Activate this event?');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(api.requests.filter(row=>row.action==='event-activate')).toHaveLength(0);
 await status.selectOption('active');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/complete|unfinished/i);expect((await api.service.session(api.token)).activeEvent.id).toBe('fixture-L6');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(status).toHaveValue('draft');
 await status.selectOption('ended');await expect(page.getByRole('dialog')).toContainText('cannot restart');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(status).toHaveValue('ended');await expect(status).toBeDisabled();expect((await api.service.session(api.token)).activeEvent.id).toBe('fixture-L6');
});

test('compact toolbar preserves native validation, errors, timing groups and explicit metadata refresh',async({page,api})=>{
 await page.clock.install();await openEvents(page, '/?settings');
 await expect(page.locator('.settings-message')).toHaveCount(0);await expect(page.getByRole('button',{name:'Refresh settings',exact:true})).toHaveCount(0);
 await expect(page.getByText(/^Active event:/)).toHaveCount(0);await expect(page.getByText('All event times use Europe/London (UK time). Practical timings are optional.')).toHaveCount(0);
 expect(await page.locator('.settings-timing-tile legend').allTextContents()).toEqual(['Practical','Theory']);
 await expect(page.getByRole('group',{name:'Theory',exact:true}).getByLabel('Start',{exact:true})).toBeVisible();
 const toolbar=page.getByRole('toolbar',{name:'Event actions'}),save=toolbar.getByRole('button',{name:'Save event',exact:true});
 await expect(save).toHaveAttribute('title','Save event');await expect(save.locator('svg')).toHaveCount(1);
 await expect(toolbar.getByRole('button',{name:'Preview practical',exact:true})).toHaveCount(0);
 await page.getByLabel('Event name',{exact:true}).fill('');await save.click();expect(api.requests.filter(request=>request.action==='event-update')).toHaveLength(0);expect(await page.getByLabel('Event name',{exact:true}).evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true);
 await page.getByLabel('Event name',{exact:true}).fill('L6 fixture event');
 const state=await api.service.session(api.token);await api.service.eventUpdate(api.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,name:'Automatic refresh'});
 const sessionReads=api.requests.filter(request=>request.action==='session').length;await page.clock.fastForward(15000);await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('L6 fixture event');expect(api.requests.filter(request=>request.action==='session')).toHaveLength(sessionReads);await reloadTeacher(page);await openEvents(page);await expect(page.getByLabel('Event name',{exact:true})).toHaveValue('Automatic refresh');
 await page.getByRole('combobox',{name:'Event status',exact:true}).selectOption('ended');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(save).toBeDisabled();await expect(page.getByRole('button',{name:/Remove team/})).toBeDisabled();await expect(page.getByRole('button',{name:/Allow reselection for/})).toBeDisabled();
});

test('Preview Questions is collapsed, ordered, keyboard accessible and isolated from the selected event',async({page,api})=>{
 await openTeacher(page, '/?settings&eventId=fixture-U6');const before=await api.service.session(api.token);
 await expect(page.locator('.settings-panel').first()).toHaveClass(/settings-questions/);
 const toggle=page.getByRole('button',{name:'Preview Questions',exact:true});await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('button',{name:/^U5 Problem/})).toHaveCount(0);
 await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('.problem-testing-card[aria-label*=" Problem "]')).toHaveCount(35);await expect(page.locator('.practical-catalogue-list button')).toHaveCount(3);
 for(const year of ['L5','L6','U5','U6']) {
  const buttons=page.locator(`[aria-labelledby="testing-${year}"] .problem-testing-card`);
  const labels=await buttons.evaluateAll(elements=>elements.map(element=>element.getAttribute('aria-label')!));const order=labels.map(label=>Number(/Problem (\d)/.exec(label)![1]));expect(order).toEqual([...order].sort((a,b)=>a-b));
  for(let i=0;i<order.length;i++){await expect(buttons.nth(i).locator('.problem-testing-title')).toHaveCSS('text-transform','uppercase');await expect(buttons.nth(i).locator('.question-points')).toHaveClass(new RegExp(`question-points--${order[i]<=4?1:order[i]<=7?2:3}`));await expect(buttons.nth(i).locator('.question-points')).toHaveText(/^[123] points?$/);}
 }
 await page.getByRole('button',{name:'Backend settings',exact:true}).click();await page.getByRole('button',{name:'U5 Problem 6: Cubone',exact:true}).click();await expect(page.getByTestId('u5p6-content')).toBeVisible();await page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true}).fill('485');await page.getByRole('button',{name:'Check answers',exact:true}).click();await expect(page.locator('.completion-stamp')).toBeVisible();
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByRole('button',{name:'Preview Questions',exact:true})).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('button',{name:'Events',exact:true})).toHaveAttribute('aria-expanded','false');await expect(page.getByRole('button',{name:'Backend settings',exact:true})).toHaveAttribute('aria-expanded','true');await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U6');expect((await api.service.session(api.token)).events).toEqual(before.events);expect((await api.service.leaderboard(api.token)).entries).toEqual([]);
});

test('team table removes draft teams after server confirmation and retains active wrong-attempt records on removal',async({page,api})=>{
 await openEvents(page, '/?settings');const player=await api.service.login({role:'competitor',code:'1234'}),team=(await api.service.teams(player.token)).teams[0];await api.service.claim(player.token,{teamId:team.id});await api.service.start(player.token);await api.service.submit(player.token,{questionId:'L6P8',requestId:'settings-wrong-001',answers:{answer:'0'}});
 await reloadTeacher(page);await openEvents(page);const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Test team 1',exact:true})});
 await expect(row).toBeVisible();expect(await page.locator('.settings-teams thead th').allTextContents()).toEqual(['','School','Team','Practical answer','Theory score','Status','Actions']);await expect(row.getByRole('cell').nth(3)).toHaveText('\u2013');await expect(row.getByRole('cell',{name:'Taken',exact:true})).toBeVisible();
 await row.getByRole('button',{name:/Allow reselection/}).click();await expect(page.getByRole('dialog')).toContainText('Test team 1');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(row.getByRole('cell',{name:'Available',exact:true})).toBeVisible();await expect(row.getByRole('button',{name:/Allow reselection/})).toBeDisabled();
 await row.getByRole('button',{name:/Remove team/}).click();await expect(page.getByRole('dialog')).toContainText('retained');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(row).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0);const stored=await fixtureTeamRow(api,'fixture-L6',team.id);expect(stored.removed).toBe(true);expect(stored.score).toBe(0);expect((await fixtureTeamRow(api,'fixture-L6',team.id,'q-L6P8')).state.retryAt).toBeGreaterThan(0);await expect(page.locator('.settings-message')).toHaveCount(0);
 await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByRole('button',{name:'Remove team Test team 1',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toHaveCount(0);
});
test('teacher home and legacy hub routes remain rooted in Settings',async({page})=>{
 for(const route of ['/', '/?theory', '/?theory&year=U5']) {await openTeacher(page,route);await expect(page.locator('.teacher-settings')).toBeVisible();await expect(page.getByRole('button',{name:'Back to landing',exact:true})).toHaveCount(0);await expect(page.locator('.splash-stage,.theory-stage')).toHaveCount(0);}
});

test('active year changes require a confirmed reset preserving team names',async({page,api})=>{
 await openEvents(page);await expect(page.locator('#event-year')).toBeEnabled();await page.locator('#event-name').fill('Edited event');await page.locator('#event-year').selectOption('U6');await page.getByRole('button',{name:'Save event',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Change year and reset this event?');expect(api.requests.filter(row=>row.action==='event-year-change')).toHaveLength(0);await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('#event-year')).toHaveValue('U6');
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Event status')).toHaveValue('draft');await expect(page.locator('#event-name')).toHaveValue('Edited event');await expect(page.locator('.settings-teams')).toContainText('Test team 1');const state=await api.service.session(api.token);expect(state.events.find((event:any)=>event.name==='Edited event')).toMatchObject({year:'U6',status:'draft'});expect(api.requests.filter(row=>row.action==='event-year-change')).toHaveLength(1);
});

test('creating another event requires completing existing events first', async ({ page, api }) => {
 const staff=await api.service.login({role:'teacher',code:'5678'});
 for(const event of (await api.service.events(staff.token)).events)await api.service.eventEnd(staff.token,{eventId:event.id,expectedRevision:event.revision,confirm:true});
 await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await page.getByLabel('Teacher code',{exact:true}).fill('5678');
 await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'Submit teacher code',exact:true}).click();
 await page.getByRole('button',{name:'Events',exact:true}).click();
 await page.getByRole('button',{name:'Create new event',exact:true}).click();
 await page.locator('#new-event-name').fill('New event');await page.locator('#new-event-theory-start').fill('2030-01-02T13:00');await page.locator('#new-event-theory-end').fill('2030-01-02T15:00');
 await page.getByRole('button',{name:'Create draft event'}).click();await expect(page.locator('#new-event-name')).toHaveCount(0);
 const state=await api.service.session(api.token),event=state.events.find((event:any)=>event.name==='New event');
 expect(event.status).toBe('draft');await expect(page.getByLabel('Selected event')).toHaveValue(event.id);
 await expect(page.getByRole('button',{name:'Create new event',exact:true})).toBeDisabled();
 await page.getByRole('combobox',{name:'Event status',exact:true}).selectOption('active');await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);expect((await api.service.session(api.token)).activeEvent.id).toBe(event.id);
});
test('end requires confirmation and ended event has no restart or edit controls', async ({ page, api }) => { await openEvents(page, '/?settings'); await page.getByRole('combobox',{name:'Event status',exact:true}).selectOption('ended'); await expect(page.getByRole('dialog')).toContainText('cannot restart'); await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByLabel('Event name', { exact: true }).first()).toBeDisabled(); await expect(page.getByRole('button', { name: 'Activate event', exact: true })).toHaveCount(0); const state=await api.service.session(api.token);expect(state.events.find((event:any)=>event.id==='fixture-L6').status).toBe('ended');expect(state.activeEvent).toMatchObject({id:'fixture-U6',status:'draft'}); });
test('school names are unique and release confirms revocation while retaining results', async ({ page, api }) => {
    await openEvents(page, '/?settings');
    await page.getByLabel('New school name').fill('New school');
    await page.getByRole('button', { name: 'Create school', exact: true }).click();
    await page.getByRole('button', { name: 'Set team count', exact: true }).click();
    await expect(page.getByRole('row').filter({has:page.getByRole('cell',{name:'New school',exact:true})}).filter({has:page.getByRole('cell',{name:'1',exact:true})})).toBeVisible();
    await page.getByLabel('New school name').fill('new SCHOOL');
    await page.getByRole('button', { name: 'Create school', exact: true }).click();
    await expect(page.locator('.teacher-settings').getByRole('alert')).toContainText('already exists');
    const competitor = await api.service.login({ role: 'competitor', code: '1234' }), teams = await api.service.teams(competitor.token), team = teams.teams[0];
    await api.service.claim(competitor.token, { teamId: team.id });
    await api.service.start(competitor.token);
    await api.service.submit(competitor.token, { questionId: 'L6P8', requestId: 'saved-result-000001', answers: { answer: '0.437' } });
    await reloadTeacher(page);await openEvents(page);
    await page.getByRole('button', { name: 'Allow reselection for ' + team.name, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('retained');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const result = await api.service.teams(api.token, { eventId: 'fixture-L6' });
    expect(result.teams.find((entry: any) => entry.id === team.id)).toMatchObject({ score: 3, claimed: false });
    await expect.poll(() => api.service.session(competitor.token).catch((error: any) => error.status)).toBe(401);
});
test('access codes are unavailable for editing in teacher Settings',async({page,api})=>{
 await openEvents(page);await page.getByRole('button',{name:'Backend settings',exact:true}).click();await expect(page.getByRole('button',{name:'Access codes',exact:true})).toHaveCount(0);await expect(page.getByLabel('New competitor code')).toHaveCount(0);await expect(page.getByLabel('New teacher code')).toHaveCount(0);await expect(page.getByRole('button',{name:'Save codes',exact:true})).toHaveCount(0);await expect(page.locator('#settings-diagnostics-content')).toContainText('configured');expect(api.requests.some(row=>row.action==='codes-update')).toBe(false);
});

test('catalogue year is independent of the selected event and remains unscored',async({page})=>{
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByRole('button',{name:'Preview Questions',exact:true}).click();await page.getByRole('button',{name:'U5 Problem 6: Cubone',exact:true}).click();await expect(page.locator('.olympiad-question-heading')).toContainText('U5');await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 00');expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L5');
});

test('stale event edits fail without overwriting staff changes or typed form values',async({page,api})=>{
 await openEvents(page, '/?settings');await page.locator('#event-name').fill('My pending edit');const state=await api.service.session(api.token);await api.service.eventUpdate(api.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,name:'Other teacher edit'});await page.getByRole('button',{name:'Save event',exact:true}).click();await expect(page.locator('.teacher-settings').getByRole('alert')).toContainText(/refresh|changed/i);await expect(page.locator('#event-name')).toHaveValue('My pending edit');expect((await api.service.session(api.token)).activeEvent.name).toBe('Other teacher edit');await expect(page.getByRole('button',{name:'Refresh settings',exact:true})).toHaveCount(0);await reloadTeacher(page);await openEvents(page);await expect(page.locator('#event-name')).toHaveValue('Other teacher edit');
});
test('read-only backend refresh preserves typed event values',async({page,api})=>{
 await openEvents(page);await page.locator('#event-name').fill('Pending edit');await page.getByRole('button',{name:'Backend settings',exact:true}).click();await expect(page.locator('#settings-diagnostics-content')).toContainText('configured');const before=api.requests.filter(row=>row.action==='diagnostics').length;await page.getByRole('button',{name:'Refresh backend settings',exact:true}).click();await expect.poll(()=>api.requests.filter(row=>row.action==='diagnostics').length).toBe(before+1);await expect(page.locator('#event-name')).toHaveValue('Pending edit');expect(api.requests.filter(row=>row.action==='event-update')).toHaveLength(0);
});

test('event schedules use London time, reject DST ambiguity and keep optional practical times paired',async({page,api})=>{
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token;for(const event of (await api.service.events(staff)).events)await api.service.eventEnd(staff,{eventId:event.id,expectedRevision:event.revision,confirm:true});await openEvents(page);await page.getByRole('button',{name:'Create new event',exact:true}).click();await page.getByLabel('Event name',{exact:true}).fill('London schedule');
 await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('Start',{exact:true}).fill('2026-10-25T01:30');await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('End',{exact:true}).fill('2026-10-25T03:00');await page.getByRole('button',{name:'Create draft event',exact:true}).click();
 await expect(page.locator('.settings-message')).toContainText('occurs twice');expect((await api.service.session(api.token)).events.some((event:any)=>event.name==='London schedule')).toBe(false);
 await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('Start',{exact:true}).fill('2030-07-15T12:00');await page.getByRole('group',{name:'Theory',exact:true}).getByLabel('End',{exact:true}).fill('2030-07-15T13:00');await page.getByRole('group',{name:'Practical',exact:true}).getByLabel('Start',{exact:true}).fill('2030-07-15T12:30');await page.getByRole('button',{name:'Create draft event',exact:true}).click();await expect(page.locator('.settings-message')).toContainText('both practical');
 await page.getByRole('group',{name:'Practical',exact:true}).getByLabel('End',{exact:true}).fill('2030-07-15T14:00');await page.getByRole('button',{name:'Create draft event',exact:true}).click();await expect(page.getByLabel('Selected event')).not.toHaveValue('');await expect(page.locator('.settings-message')).toHaveCount(0);
 const event=(await api.service.session(api.token)).events.find((event:any)=>event.name==='London schedule');expect(event.theoryStartsAt).toBe(Date.parse('2030-07-15T11:00Z'));expect(event.endsAt).toBe(Date.parse('2030-07-15T13:00Z'));
});
test('late team responses cannot populate a different selected event',async({page})=>{
 let release!:()=>void;const delayed=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/olympiad/roster?eventId=fixture-L5',async route=>{await delayed;await route.fulfill({json:{schools:[],progress:[],removedTeams:[],teams:[{id:'late-team',name:'Late L5 team',eventId:'fixture-L5',year:'L5',claimGeneration:0}]}});});
 await openEvents(page, '/?settings');await page.getByLabel('Selected event').selectOption('fixture-L5');await expect(page.getByLabel('Selected event')).toBeDisabled();await page.evaluate(()=>{history.pushState(null,'','/?settings&eventId=fixture-U5');window.dispatchEvent(new PopStateEvent('popstate'));});await expect(page.getByRole('heading',{name:'Teams · U5 fixture event'})).toBeVisible();release();
 await expect(page.getByRole('cell',{name:'Late L5 team',exact:true})).toHaveCount(0);await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toBeVisible();
});
test('question previews and leaderboard return directly to Settings',async({page,api})=>{
 await openEvents(page,'/?settings&eventId=fixture-U5');await page.getByRole('button',{name:'Preview Questions',exact:true}).click();await page.getByRole('button',{name:'U5 Problem 6: Cubone',exact:true}).click();await expect(page.getByText('Teacher Mode',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U5');await page.getByRole('button',{name:'Open leaderboard',exact:true}).click();await expect(page.getByRole('heading',{name:'Leaderboard',exact:true})).toBeAttached();await page.getByRole('button',{name:'Back to teacher settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U5');expect((await api.service.session(api.token)).role).toBe('teacher');
});

for(const viewport of [{width:2560,height:1440},{width:1200,height:800}])test(`settings panels fit at ${viewport.width}x${viewport.height}`,async({page,api},testInfo)=>{
 await page.setViewportSize(viewport);await openTeacher(page);for(const label of ['Preview Questions','Events','Backend settings'])await expect(page.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-expanded','false');await expect(page.getByText('Teacher Mode',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Back to landing',exact:true})).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:testInfo.outputPath(`settings-collapsed-${viewport.width}.png`)});
 await openEvents(page);await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L6');await expect(page.locator('.settings-event-status')).toHaveValue('active');await expect(page.locator('.settings-events .settings-teams')).toBeVisible();await expect(page.getByRole('cell',{name:'Test team 1',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Create new event',exact:true})).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath(`settings-active-teams-${viewport.width}.png`),fullPage:true});expect((await api.service.session(api.token)).role).toBe('teacher');
});
