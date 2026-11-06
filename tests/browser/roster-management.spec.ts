import {test,expect} from './fixtures';
import {openEvents,reloadTeacher} from './teacher';

test('school deletion confirms, protects host, refuses unfinished teams and retains history',async({page,api})=>{
 const school=(await api.service.schoolCreate(api.token,{name:'Delete Academy',requestId:'browser-delete-school-create'})).school;
 await openEvents(page);await page.getByLabel('School',{exact:true}).selectOption('host-st-johns');await expect(page.getByRole('button',{name:'Delete selected school',exact:true})).toBeDisabled();
 await page.getByLabel('School',{exact:true}).selectOption(school.id);await page.getByRole('button',{name:'Delete selected school',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Historical results');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect((await api.service.schools(api.token)).schools.find((s:any)=>s.id===school.id).deleted).toBeUndefined();
 api.lostResponses.add('school-delete');await page.getByRole('button',{name:'Delete selected school',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('School',{exact:true}).locator('option',{hasText:'Delete Academy'})).toHaveCount(0);
 const calls=api.requests.filter(r=>r.action==='school-delete');expect(calls).toHaveLength(2);expect(calls[1].body).toEqual(calls[0].body);
});

test('draft bulk removal retains partial progress and retries only the uncertain frozen team',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Bulk team 2'});await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Bulk team 3'});
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();
 await expect(page.getByRole('checkbox',{name:'Select team Test team 1',exact:true})).toBeChecked();
 const failing=(await api.service.teams(api.token,{eventId:'fixture-L5'})).teams[1];const original=api.repo.batch;let fail=true;
 api.repo.batch=async(ops:any[])=>{if(fail && ops.some(op=>op.entity.partitionKey==='fixture-L5-'+failing.id && op.entity.removed))throw Error('Second deletion unavailable.');return original(ops);};
 await page.getByRole('button',{name:'Remove selected teams',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('2 of 3');
 await expect(page.getByRole('button',{name:'Retry failed items',exact:true})).toBeEnabled();fail=false;await page.getByRole('button',{name:'Retry failed items',exact:true}).click();
 await expect.poll(async()=>(await api.service.teams(api.token,{eventId:'fixture-L5'})).teams.length).toBe(0);await expect(page.getByRole('button',{name:'Retry failed items',exact:true})).toHaveCount(0);
 const batches=api.requests.filter(r=>r.action==='teams-batch');expect(batches).toHaveLength(2);expect(batches[1].body).toEqual(batches[0].body);expect(api.requests.filter(r=>r.action==='team-delete')).toHaveLength(0);

});

test('bulk reselection confirms and lost response retry preserves a newly claimed device',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L6',name:'Second claimed team'});
 const players=[];for(let i=0;i<2;i++){const p=await api.service.login({role:'competitor',code:'1234'}),team=(await api.service.teams(p.token)).teams[i];await api.service.claim(p.token,{teamId:team.id});players.push({p,team});}
 await openEvents(page);for(const {team} of players)await page.getByRole('checkbox',{name:'Select team '+team.name,exact:true}).check();
 await page.getByRole('button',{name:'Allow reselection for selected',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('2 teams');api.lostResponses.add('teams-batch');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeEnabled();
 const fresh=await api.service.login({role:'competitor',code:'1234'});await api.service.claim(fresh.token,{teamId:players[0].team.id});await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 expect((await api.service.session(fresh.token)).team.id).toBe(players[0].team.id);await expect(api.service.session(players[1].p.token)).rejects.toMatchObject({status:401});
 const requests=api.requests.filter(r=>r.action==='teams-batch');expect(requests).toHaveLength(2);expect(requests[0].body).toEqual(requests[1].body);
});

test('Excel import previews additions and colours, retries without duplicates, and lower targets retain teams',async({page,api})=>{
 await openEvents(page);await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();
 await page.getByLabel('Paste school table').fill('School\tTeam count\tColour 1\tColour 2\nImport Academy\t3\t#123456\t#ABCDEF\nSecond Academy\t2\t#024633');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('table',{name:'Import preview'})).toContainText('Import Academy');
 expect(api.requests.filter(r=>r.action==='schools-import')).toHaveLength(0);api.lostResponses.add('schools-import');await page.getByRole('button',{name:'Apply import',exact:true}).click();await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByLabel('Paste school table')).toHaveValue('');
 const schools=(await api.service.schools(api.token)).schools,school=schools.find((s:any)=>s.name==='Import Academy');expect(schools.filter((s:any)=>s.name==='Import Academy')).toHaveLength(1);expect(school.colours).toEqual(['#123456','#ABCDEF']);
 expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id)).toHaveLength(3);
 const requests=api.requests.filter(r=>r.action==='schools-import');expect(requests[0].body).toEqual(requests[1].body);
 await page.getByLabel('Paste school table').fill('import academy\t1\t#654321');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('table',{name:'Import preview'})).toContainText('0');await page.getByRole('button',{name:'Apply import',exact:true}).click();await expect(page.getByLabel('Paste school table')).toHaveValue('');
 expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id)).toHaveLength(3);expect(api.requests.filter(r=>r.action==='team-delete')).toHaveLength(0);
 await page.getByLabel('School',{exact:true}).selectOption(school.id);await expect(page.getByLabel('Colour 1 hex',{exact:true})).toHaveValue('#654321');
});

test('invalid import produces no writes and event switching clears team selection',async({page,api})=>{
 await openEvents(page);await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();await page.getByLabel('Selected event').selectOption('fixture-L5');await expect(page.getByRole('checkbox',{name:'Select all teams',exact:true})).not.toBeChecked();
 await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();await page.getByLabel('Paste school table').fill('Bad Academy\t2\tred');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.locator('.settings-school-import').getByRole('alert')).toContainText('six-digit');await expect(page.getByRole('button',{name:'Apply import',exact:true})).toHaveCount(0);expect(api.requests.filter(r=>['schools-import','school-create','school-colours','school-teams'].includes(r.action))).toHaveLength(0);
});


test('active bulk removal requires confirmation and completed events hide selection controls',async({page,api},testInfo)=>{
 await openEvents(page);await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();await page.getByRole('button',{name:'Remove selected teams',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Test team 1');expect(api.requests.filter(r=>r.action==='team-delete')).toHaveLength(0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Select team Test team 1',exact:true})).toBeChecked();
 await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();await page.getByLabel('Paste school table').fill('Layout Academy\t2\t#123456\t#ABCDEF');await page.getByRole('button',{name:'Preview import',exact:true}).click();
 await page.screenshot({path:testInfo.outputPath('roster-import-preview.png'),fullPage:true});
 await page.getByRole('button',{name:'Remove selected teams',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.length).toBe(0);
 const event=(await api.service.events(api.token)).events.find((e:any)=>e.id==='fixture-L6');await api.service.eventEnd(api.token,{eventId:event.id,expectedRevision:event.revision,confirm:true});
 await reloadTeacher(page);await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L6');await expect(page.getByRole('checkbox',{name:'Select all teams',exact:true})).toHaveCount(0);await expect(page.getByText('Bulk load schools, teams and colours',{exact:true})).toHaveCount(0);
});


test('Excel import restores a deleted school with the same name and identity after a lost response',async({page,api})=>{
 const school=(await api.service.schoolCreate(api.token,{name:'Restore Academy',requestId:'restore-browser-create'})).school;
 await api.service.schoolDelete(api.token,{schoolId:school.id,expectedRevision:school.revision,requestId:'restore-browser-delete',confirm:true});
 await openEvents(page);await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();await page.getByLabel('Paste school table').fill('Restore Academy\t2\t#123456');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('table',{name:'Import preview'}).getByRole('cell',{name:'Restore',exact:true})).toBeVisible();
 api.lostResponses.add('schools-import');await page.getByRole('button',{name:'Apply import',exact:true}).click();await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByLabel('Paste school table')).toHaveValue('');
 const restored=(await api.service.schools(api.token)).schools.filter((s:any)=>s.name==='Restore Academy');expect(restored).toHaveLength(1);expect(restored[0]).toMatchObject({id:school.id,colours:['#123456']});expect(restored[0].deleted).toBeUndefined();expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id)).toHaveLength(2);
 const requests=api.requests.filter(r=>r.action==='schools-import');expect(requests).toHaveLength(2);expect(requests[1].body).toEqual(requests[0].body);
});


test('removed teams restore in one batch with retained results and new device claims',async({page,api})=>{
 const school=(await api.service.schoolCreate(api.token,{name:'Event Academy',requestId:'browser-entry-school'})).school;
 await api.service.schoolTeams(api.token,{eventId:'fixture-L6',schoolId:school.id,targetCount:2,requestId:'browser-entry-setup'});
 const teams=(await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id);
 await openEvents(page);for(const team of teams)await page.getByRole('checkbox',{name:'Select team '+team.name,exact:true}).check();
 await page.getByRole('button',{name:'Remove selected teams',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByText('Removed teams (2)',{exact:true}).click();await page.getByRole('checkbox',{name:'Select all removed teams',exact:true}).check();
 await page.getByRole('button',{name:'Restore selected teams',exact:true}).click();api.lostResponses.add('teams-batch');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 for(const team of teams)await expect(page.getByRole('checkbox',{name:'Select team '+team.name,exact:true})).toBeVisible();
 await expect(page.getByText('Removed teams (2)',{exact:true})).toHaveCount(0);
 const calls=api.requests.filter(r=>r.action==='teams-batch' && r.body.action==='team-restore');expect(calls).toHaveLength(2);expect(calls[1].body).toEqual(calls[0].body);
});
