import {test,expect} from './fixtures';
import {openEvents} from './teacher';

test('bulk rows remain visible during saving and synchronous duplicate consent sends one batch',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Second visible team'});
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});const bodies:unknown[]=[];
 await page.route('**/api/olympiad/teams-batch',async route=>{bodies.push(route.request().postDataJSON());await held;await route.fallback();});
 try{
  await page.getByRole('button',{name:'Remove selected teams',exact:true}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect.poll(()=>bodies.length).toBe(1);
  for(const name of ['Test team 1','Second visible team'])await expect(page.getByRole('checkbox',{name:'Select team '+name,exact:true})).toBeVisible();
  await expect(page.getByLabel('Selected event')).toBeDisabled();await expect(page.getByLabel('New school name',{exact:true})).toBeDisabled();
 }finally{release();}
 await expect(page.getByText('Removed teams (2)',{exact:true})).toBeVisible();expect(bodies).toHaveLength(1);
});

for(const readAction of ['roster-snapshot'])test(`last removed team restoration survives a failed ${readAction} read and refresh sends no write`,async({page,api})=>{
 const team=(await api.service.teams(api.token,{eventId:'fixture-L5'})).teams[0];
 await api.service.teamRemove(api.token,{eventId:'fixture-L5',teamId:team.id,expectedEntryRevision:team.entryRevision ?? 0,requestId:'remove-before-restore-'+readAction,confirm:true});
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 await page.getByText('Removed teams (1)',{exact:true}).click();await page.getByRole('checkbox',{name:'Select all removed teams',exact:true}).check();
 await page.getByRole('button',{name:'Restore selected teams',exact:true}).click();api.fail.add(readAction);
 await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('Roster save status')).toContainText('Saved;');
 await expect(page.getByRole('button',{name:'Retry refresh',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Selected event')).toBeEnabled();await expect(page.getByRole('button',{name:'Restore selected teams',exact:true})).toBeDisabled();
 // The previous complete snapshot remains visible until every read succeeds.
 await expect(page.getByText('Removed teams (1)',{exact:true})).toBeVisible();
 const writes=api.requests.filter(r=>r.body!==undefined).length;
 api.fail.delete(readAction);await page.getByRole('button',{name:'Retry refresh',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:'Select team '+team.name,exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Select team '+team.name,exact:true})).not.toBeChecked();
 await expect(page.getByText('Removed teams (1)',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry refresh',exact:true})).toHaveCount(0);
 expect(api.requests.filter(r=>r.body!==undefined)).toHaveLength(writes);
 expect(api.requests.filter(r=>r.action==='teams-batch')).toHaveLength(1);
});

test('partial batch stays owned by root after read failure and retries the original full batch',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Partial second team'});
 const teams=(await api.service.teams(api.token,{eventId:'fixture-L5'})).teams;
 const original=api.repo.batch;let failing=true;
 api.repo.batch=async(ops:any[])=>{if(failing && ops.some(op=>op.entity.kind==='team' && op.entity.teamId===teams[1].id && op.entity.removed))throw Error('Second item unavailable.');return original(ops);};
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();api.fail.add('roster-snapshot');
 await page.getByRole('button',{name:'Remove selected teams',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry failed items',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Roster save status')).toContainText('1 of 2');
 for(const team of teams)await expect(page.getByRole('checkbox',{name:'Select team '+team.name,exact:true})).toBeChecked();
 failing=false;api.fail.delete('roster-snapshot');await page.getByRole('button',{name:'Retry failed items',exact:true}).click();
 await expect(page.getByText('Removed teams (2)',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Retry failed items',exact:true})).toHaveCount(0);
 const batches=api.requests.filter(r=>r.action==='teams-batch');expect(batches).toHaveLength(2);expect(batches[1].body).toEqual(batches[0].body);
});

test('school colour revision rejection refreshes before another write and retains both typed colours',async({page,api})=>{
 await openEvents(page);await page.getByLabel('School',{exact:true}).selectOption('host-st-johns');
 await page.getByLabel('Number of colours',{exact:true}).selectOption('2');
 await page.getByLabel('Colour 1 hex (left)',{exact:true}).fill('#123456');await page.getByLabel('Colour 2 hex (right)',{exact:true}).fill('#ABCDEF');
 const school=(await api.service.schools(api.token)).schools.find((s:any)=>s.id==='host-st-johns');
 await api.service.schoolColours(api.token,{schoolId:school.id,expectedRevision:school.revision,colours:['#654321'],requestId:'other-teacher-colour'});
 api.fail.add('roster');await page.getByRole('button',{name:'Save school colours',exact:true}).click();
 await expect(page.getByLabel('Roster save status')).toContainText('was rejected');
 await expect(page.getByLabel('Colour 1 hex (left)',{exact:true})).toHaveValue('#123456');
 await expect(page.getByLabel('Colour 2 hex (right)',{exact:true})).toHaveValue('#ABCDEF');
 await expect(page.getByRole('button',{name:'Save school colours',exact:true})).toBeDisabled();
 const writes=api.requests.filter(r=>r.action==='school-colours').length;
 api.fail.delete('roster');await page.getByRole('button',{name:'Retry refresh',exact:true}).click();
 await page.getByRole('button',{name:'Use latest school revision',exact:true}).click();
 await expect(page.getByLabel('Colour 1 hex (left)',{exact:true})).toHaveValue('#123456');await expect(page.getByLabel('Colour 2 hex (right)',{exact:true})).toHaveValue('#ABCDEF');
 expect(api.requests.filter(r=>r.action==='school-colours')).toHaveLength(writes);
 await page.getByRole('button',{name:'Save school colours',exact:true}).click();
 await expect(page.getByLabel('School',{exact:true})).toBeEnabled();
 expect((await api.service.schools(api.token)).schools.find((s:any)=>s.id===school.id).colours).toEqual(['#123456','#ABCDEF']);
});

test('late read from a departed event cannot replace its new roster',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Only in selected L5'});
 await openEvents(page);await expect(page.getByRole('checkbox',{name:'Select team Test team 1',exact:true})).toBeEnabled();
 let hold=false,started=false,release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/olympiad/roster?eventId=fixture-L6',async route=>{
  if(!hold){await route.fallback();return;}
  started=true;const value=await api.service.roster(api.token,{eventId:'fixture-L6'});await held;await route.fulfill({json:value});
 });
 hold=true;
 try{
  await page.getByRole('button',{name:'Refresh schools',exact:true}).click();await expect.poll(()=>started).toBe(true);
  await page.evaluate(()=>{history.pushState(null,'','/?settings&eventId=fixture-L5');window.dispatchEvent(new PopStateEvent('popstate'));});
  await expect(page.getByRole('checkbox',{name:'Select team Only in selected L5',exact:true})).toBeVisible();
 }finally{release();}
 await expect(page.getByRole('checkbox',{name:'Select team Only in selected L5',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L5');
});

test('stopping an uncertain save requires a fresh snapshot and does not undo completed work',async({page,api})=>{
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 api.lostResponses.add('team-remove');await page.getByRole('button',{name:'Remove team Test team 1',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeEnabled();api.fail.add('roster');
 await page.getByRole('button',{name:'Stop retrying',exact:true}).click();await expect(page.getByRole('button',{name:'Retry refresh',exact:true})).toBeEnabled();
 await expect(page.getByLabel('New school name',{exact:true})).toBeDisabled();
 api.fail.delete('roster');await page.getByRole('button',{name:'Retry refresh',exact:true}).click();await expect(page.getByLabel('New school name',{exact:true})).toBeEnabled();
 await expect(page.getByText('Removed teams (1)',{exact:true})).toBeVisible();expect(api.requests.filter(r=>r.action==='team-remove')).toHaveLength(1);
});
