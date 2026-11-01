import {test,expect,claimAndStart} from './fixtures';
test('draft practice enforces breach recovery with a visible editable code field',async({page,api})=>{
 const staff=await api.service.login({role:'teacher',code:'5678'});
 let state=await api.service.session(staff.token);const active=state.activeEvent;
 await api.service.eventEnd(staff.token,{eventId:active.id,expectedRevision:active.revision,confirm:true});
 state=await api.service.session(staff.token);
 await page.goto('/');await claimAndStart(page,'fixture-U6');
 await expect(page.getByRole('button',{name:'Theoretical challenge',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Practical challenge',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);
 await page.evaluate(()=>document.exitFullscreen());
 const pin=page.getByLabel('Teacher code',{exact:true});await expect(pin).toBeVisible();await expect(pin).toHaveCSS('opacity','1');
 await expect(page.locator('.breach-pin .score-digit')).toHaveCount(4);await pin.pressSequentially('5678');await expect(pin).toHaveValue('5678');
 await page.getByRole('button',{name:'CONFIRM'}).click();
 await page.getByRole('button',{name:'Resume competition'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Theoretical challenge',exact:true})).toBeEnabled();
});

test('active challenge banners follow independent windows and completed landing remains visible',async({page,api})=>{
 const staff=await api.service.login({role:'teacher',code:'5678'}),state=await api.service.session(staff.token),event=state.activeEvent;
 const now=Date.now();
 await api.service.eventUpdate(staff.token,{eventId:event.id,expectedRevision:event.revision,theoryStartsAt:now+300000,theoryEndsAt:now+600000,practicalStartsAt:now+400000,practicalEndsAt:now+700000});
 await page.goto('/');await claimAndStart(page);
 const theory=page.getByRole('button',{name:'Theoretical challenge',exact:true}),practical=page.getByRole('button',{name:'Practical challenge',exact:true});
 await expect(theory).toBeDisabled();await expect(practical).toBeDisabled();await expect(theory).toContainText('Opens in');
 await page.clock.install();await page.clock.fastForward(310000);
 await expect(theory).toBeEnabled();await expect(theory.locator('.challenge-banner')).toHaveCount(0);await expect(practical).toBeDisabled();
 await page.clock.fastForward(400000);
 await expect(theory).toBeDisabled();await expect(theory).toContainText('COMPLETE');await expect(practical).toContainText('COMPLETE');
 await page.evaluate(()=>document.exitFullscreen());await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByRole('dialog')).toHaveCount(0);expect(api.requests.filter(r=>r.action==='breach')).toHaveLength(0);
});

test('settings confirms return to draft without a testing checkbox',async({page})=>{
 await page.goto('/');await page.getByLabel('Teacher code',{exact:true}).fill('5678');await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'GO',exact:true}).click();
 await page.getByRole('button',{name:'Events',exact:true}).click();
 await page.getByRole('button',{name:'Return to draft',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Event status')).toHaveValue('active');
 await page.getByLabel('Event status').selectOption('draft');
 await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByLabel('Event status')).toHaveValue('draft');
 await expect(page.getByLabel('Enable competitor testing for this draft')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Activate event',exact:true})).toBeVisible();
});

for(const year of ['L5','L6','U6'])test(`competitor opens theory and practical in ${year} draft testing`,async({page,api})=>{
 const staff=await api.service.login({role:'teacher',code:'5678'});let state=await api.service.session(staff.token);
 state=await api.service.eventDraft(staff.token,{eventId:state.activeEvent.id,expectedRevision:state.activeEvent.revision,confirm:true});
 await page.goto('/');await claimAndStart(page,'fixture-'+year);
 await page.getByRole('button',{name:'Theoretical challenge',exact:true}).click();
 await expect(page.locator('.theory-page')).toBeVisible();await expect(page.locator('.theory-problem')).toHaveCount(9);
 await page.getByRole('button',{name:'Problem 1, 1 point, not yet solved',exact:true}).click();
 await expect(page.locator('.cloud-fields')).toBeVisible();await expect(page.locator('.question-access')).toHaveCount(0);
 await page.getByRole('button',{name:'Back to theory',exact:true}).click();await page.getByRole('button',{name:'Back to landing',exact:true}).click();
 await page.getByRole('button',{name:'Practical challenge',exact:true}).click();
 await expect(page.getByRole('region',{name:'Practical protocol'})).toBeVisible();
 const responses=page.getByRole('group',{name:'Practical responses'});await expect(responses).toBeEnabled();
 const input=responses.locator('input').first();await expect(input).toBeEditable();await input.fill('1.23');await input.blur();
 await page.getByRole('button',{name:'Back to landing',exact:true}).click();await expect(page.getByRole('button',{name:'Theoretical challenge',exact:true})).toBeEnabled();
 expect(api.requests.some(r=>r.action==='practical')).toBe(true);
 const records=await api.repo.list({kind:'team',eventId:'fixture-'+year});expect(records.every((team:any)=>!team.practical && !team.owner && team.score===0)).toBe(true);
});

test('teacher can change an active event year with explicit reset confirmation',async({page})=>{
 await page.goto('/');await page.getByLabel('Teacher code',{exact:true}).fill('5678');await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'GO',exact:true}).click();
 await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByLabel('Year',{exact:true}).selectOption('U6');await page.getByRole('button',{name:'Save event',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('team sessions will reset');await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Event status')).toHaveValue('active');
 await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByLabel('Event status')).toHaveValue('draft');await expect(page.getByLabel('Year',{exact:true})).toHaveValue('U6');await expect(page.locator('.settings-teams')).toContainText('Test team 1');
});
