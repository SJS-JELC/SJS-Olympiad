import {test,expect} from './fixtures';
import {openEvents,reloadTeacher} from './teacher';

test('school deletion confirms, protects host, refuses unfinished teams and retains history',async({page,api})=>{
 const school=(await api.service.schoolCreate(api.token,{name:'Delete Academy',requestId:'browser-delete-school-create'})).school;
 await openEvents(page);await page.getByLabel('School',{exact:true}).selectOption('host-st-johns');await expect(page.getByRole('button',{name:'Delete selected school',exact:true})).toBeDisabled();
 await page.getByLabel('School',{exact:true}).selectOption(school.id);await page.getByRole('button',{name:'Delete selected school',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Historical results');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect((await api.service.schools(api.token)).schools.find((s:any)=>s.id===school.id).deleted).toBeUndefined();
 api.lostResponses.add('school-delete');await page.getByRole('button',{name:'Delete selected school',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
 await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByLabel('School',{exact:true}).locator('option',{hasText:'Delete Academy'})).toHaveCount(0);
 const calls=api.requests.filter(r=>r.action==='school-delete');expect(calls).toHaveLength(2);expect(calls[1].body).toEqual(calls[0].body);
});

test('draft bulk deletion retains partial progress and retries only the uncertain frozen team',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Bulk team 2'});await api.service.teamAdd(api.token,{eventId:'fixture-L5',name:'Bulk team 3'});
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();
 await expect(page.getByRole('checkbox',{name:'Select team Test team 1',exact:true})).toBeChecked();
 let calls=0;await page.route('**/api/olympiad/team-delete',async route=>{calls++;if(calls===2){await route.fulfill({status:503,json:{error:'Second deletion unavailable.'}});return;}await route.fallback();});
 await page.getByRole('button',{name:'Delete selected teams',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('1 of 3');
 await expect(page.getByRole('button',{name:'Retry remaining teams',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Retry remaining teams',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:/^Select team /})).toHaveCount(0);await expect.poll(async()=>(await api.service.teams(api.token,{eventId:'fixture-L5'})).teams.length).toBe(0);await expect(page.getByRole('button',{name:'Retry remaining teams',exact:true})).toHaveCount(0);expect(calls).toBe(4);
});

test('bulk reselection confirms and lost response retry preserves a newly claimed device',async({page,api})=>{
 await api.service.teamAdd(api.token,{eventId:'fixture-L6',name:'Second claimed team'});
 const players=[];for(let i=0;i<2;i++){const p=await api.service.login({role:'competitor',code:'1234'}),team=(await api.service.teams(p.token)).teams[i];await api.service.claim(p.token,{teamId:team.id});players.push({p,team});}
 await openEvents(page);for(const {team} of players)await page.getByRole('checkbox',{name:'Select team '+team.name,exact:true}).check();
 await page.getByRole('button',{name:'Allow reselection for selected',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('2 teams');api.lostResponses.add('team-release');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
 const fresh=await api.service.login({role:'competitor',code:'1234'});await api.service.claim(fresh.token,{teamId:players[0].team.id});await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 expect((await api.service.session(fresh.token)).team.id).toBe(players[0].team.id);await expect(api.service.session(players[1].p.token)).rejects.toMatchObject({status:401});
 const requests=api.requests.filter(r=>r.action==='team-release');expect(requests).toHaveLength(3);expect(requests[0].body).toEqual(requests[1].body);
});

test('Excel import previews additions and colours, retries without duplicates, and lower targets retain teams',async({page,api})=>{
 await openEvents(page);await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();
 await page.getByLabel('Paste school table').fill('School\tTeam count\tColour 1\tColour 2\nImport Academy\t3\t#123456\t#ABCDEF\nSecond Academy\t2\t#024633');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('table',{name:'Import preview'})).toContainText('Import Academy');
 expect(api.requests.filter(r=>r.action==='school-create')).toHaveLength(0);api.lostResponses.add('school-teams');await page.getByRole('button',{name:'Apply import',exact:true}).click();await expect(page.getByRole('button',{name:'Retry remaining import',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Retry remaining import',exact:true}).click();await expect(page.getByLabel('Paste school table')).toHaveValue('');
 const schools=(await api.service.schools(api.token)).schools,school=schools.find((s:any)=>s.name==='Import Academy');expect(schools.filter((s:any)=>s.name==='Import Academy')).toHaveLength(1);expect(school.colours).toEqual(['#123456','#ABCDEF']);
 expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id)).toHaveLength(3);
 const requests=api.requests.filter(r=>r.action==='school-teams');expect(requests[0].body).toEqual(requests[1].body);
 await page.getByLabel('Paste school table').fill('import academy\t1\t#654321');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.getByRole('table',{name:'Import preview'})).toContainText('0');await page.getByRole('button',{name:'Apply import',exact:true}).click();await expect(page.getByLabel('Paste school table')).toHaveValue('');
 expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id)).toHaveLength(3);expect(api.requests.filter(r=>r.action==='team-delete')).toHaveLength(0);
 await page.getByLabel('School',{exact:true}).selectOption(school.id);await expect(page.getByLabel('Colour 1 hex',{exact:true})).toHaveValue('#654321');
});

test('invalid import produces no writes and event switching clears team selection',async({page,api})=>{
 await openEvents(page);await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();await page.getByLabel('Selected event').selectOption('fixture-L5');await expect(page.getByRole('checkbox',{name:'Select all teams',exact:true})).not.toBeChecked();
 await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();await page.getByLabel('Paste school table').fill('Bad Academy\t2\tred');await page.getByRole('button',{name:'Preview import',exact:true}).click();await expect(page.locator('.settings-school-import').getByRole('alert')).toContainText('six-digit');await expect(page.getByRole('button',{name:'Apply import',exact:true})).toHaveCount(0);expect(api.requests.filter(r=>['school-create','school-colours','school-teams'].includes(r.action))).toHaveLength(0);
});


test('active bulk deletion requires confirmation and completed events hide selection controls',async({page,api},testInfo)=>{
 await openEvents(page);await page.getByRole('checkbox',{name:'Select all teams',exact:true}).check();await page.getByRole('button',{name:'Delete selected teams',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Test team 1');expect(api.requests.filter(r=>r.action==='team-delete')).toHaveLength(0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Select team Test team 1',exact:true})).toBeChecked();
 await page.getByText('Bulk load schools, teams and colours',{exact:true}).click();await page.getByLabel('Paste school table').fill('Layout Academy\t2\t#123456\t#ABCDEF');await page.getByRole('button',{name:'Preview import',exact:true}).click();
 await page.screenshot({path:testInfo.outputPath('roster-import-preview.png'),fullPage:true});
 await page.getByRole('button',{name:'Delete selected teams',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.length).toBe(0);
 const event=(await api.service.events(api.token)).events.find((e:any)=>e.id==='fixture-L6');await api.service.eventEnd(api.token,{eventId:event.id,expectedRevision:event.revision,confirm:true});
 await reloadTeacher(page);await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L6');await expect(page.getByRole('checkbox',{name:'Select all teams',exact:true})).toHaveCount(0);await expect(page.getByText('Bulk load schools, teams and colours',{exact:true})).toHaveCount(0);
});
