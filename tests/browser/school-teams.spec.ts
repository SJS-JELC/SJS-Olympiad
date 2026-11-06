import {test,expect,type Page} from './fixtures';
import {openEvents} from './teacher';
const teamRow=(page:Page,school:string,number:number)=>page.getByRole('row').filter({has:page.getByRole('cell',{name:school,exact:true})}).filter({has:page.getByRole('cell',{name:String(number),exact:true})});

for(const outcome of ['success','failure'] as const)test(`draft deletion remains visible until confirmation before ${outcome} and preserves retry identity`,async({page,api})=>{
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 const button=page.getByRole('button',{name:'Remove team Test team 1',exact:true});
 await expect(button).toBeEnabled();
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 const bodies:unknown[]=[];
 await page.route('**/api/olympiad/team-remove',async route=>{
  bodies.push(route.request().postDataJSON());
  if(bodies.length===1){await held;if(outcome==='failure'){await route.fulfill({status:503,json:{error:'Deletion unavailable.'}});return;}}
  await route.fallback();
 });
 try{
  await button.click();await expect.poll(()=>bodies.length).toBe(1);
  await expect(button).toBeVisible();await expect(button).toBeDisabled();await expect(page.getByLabel('Selected event')).toBeDisabled();await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await api.service.teams(api.token,{eventId:'fixture-L5'})).teams.some((team:any)=>team.name==='Test team 1')).toBe(true);
 }finally{release();}
 if(outcome==='failure'){
  await expect(button).toBeVisible();await expect(page.getByLabel('Roster save status')).toContainText('Deletion unavailable.');
  const retry=page.getByRole('button',{name:'Retry save',exact:true});await expect(retry).toBeEnabled();await retry.click();
  await expect.poll(()=>bodies.length).toBe(2);expect(bodies[1]).toEqual(bodies[0]);
 }
 await expect.poll(async()=>(await api.service.teams(api.token,{eventId:'fixture-L5'})).teams.some((team:any)=>team.name==='Test team 1')).toBe(false);
 await expect(button).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('blank practical records show only a dash while a submitted zero remains visible',async({page,api})=>{
 const team=(await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.find((team:any)=>team.name==='Test team 1');
 const row=await api.repo.get('fixture-L6-'+team.id,'team');
 row.practical={year:'L6',revision:1,responses:{numPracticalResponse3:null,numPracticalResponse4:null},finalField:'numPracticalResponse4',updatedAt:null};
 await api.repo.write(row,row.etag);await openEvents(page);
 const result=page.getByRole('row').filter({has:page.getByRole('cell',{name:'Test team 1',exact:true})}).getByRole('cell').nth(3);
 await expect(result).toHaveText('–');await expect(result.locator('details')).toHaveCount(0);
 expect(api.requests.filter(request=>request.action==='practical-content')).toHaveLength(0);
 const saved=await api.repo.get('fixture-L6-'+team.id,'team');saved.practical.responses.numPracticalResponse4={text:'0.00',value:0};
 await api.repo.write(saved,saved.etag);
 await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByLabel('Selected event').selectOption('fixture-L6');
 await expect(result.locator('strong')).toHaveText(/^0\.00/);await expect(result.locator('summary')).toHaveText('Working responses');
});

test('teacher creates a school once, defaults to two, lists school and team in separate columns and preserves typed counts while collapsed',async({page,api})=>{
 await openEvents(page);await page.getByLabel('New school name',{exact:true}).fill('Example Academy');await page.getByRole('button',{name:'Create school',exact:true}).click();
 await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('2');await page.getByRole('button',{name:'Set team count',exact:true}).click();
 await expect(page.getByRole('columnheader',{name:'School',exact:true})).toBeVisible();await expect(page.getByRole('columnheader',{name:'Team',exact:true})).toBeVisible();await expect(page.getByRole('rowheader')).toHaveCount(0);await expect(teamRow(page,'Example Academy',1)).toBeVisible();await expect(teamRow(page,'Example Academy',2)).toBeVisible();
 await page.getByLabel('Target team count',{exact:true}).fill('3');await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('button',{name:'Events',exact:true}).click();await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('3');
 await page.getByRole('button',{name:'Set team count',exact:true}).click();await expect(teamRow(page,'Example Academy',3)).toBeVisible();
 const staff=await api.service.login({role:'teacher',code:'5678'}),school=(await api.service.schools(staff.token)).schools.find((s:any)=>s.name==='Example Academy');
 expect((await api.service.teams(staff.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id).map((t:any)=>t.teamNumber)).toEqual([1,2,3]);
 await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByLabel('School',{exact:true}).selectOption(school.id);await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('2');
 await page.getByLabel('School',{exact:true}).selectOption('host-st-johns');await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('4');
});

test('uncertain school and team setup retry their frozen request without duplicates',async({page,api})=>{
 await openEvents(page);await page.getByLabel('New school name',{exact:true}).fill('Retry Academy');api.lostResponses.add('school-create');await page.getByRole('button',{name:'Create school',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry save',exact:true}).click();
 const create=api.requests.filter(r=>r.action==='school-create');expect(create).toHaveLength(2);expect(create[1].body).toEqual(create[0].body);
 api.lostResponses.add('school-teams');await page.getByRole('button',{name:'Set team count',exact:true}).click();await expect(page.getByRole('button',{name:'Retry save',exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry save',exact:true}).click();
 const requests=api.requests.filter(r=>r.action==='school-teams');expect(requests).toHaveLength(2);expect(requests[1].body).toEqual(requests[0].body);await expect(teamRow(page,'Retry Academy',1)).toBeVisible();await expect(teamRow(page,'Retry Academy',2)).toBeVisible();
});

test('legacy linking preserves its permanent ID and a school rename updates completed roster names',async({page,api})=>{
 await openEvents(page);await page.getByLabel('New school name',{exact:true}).fill('Linked Academy');await page.getByRole('button',{name:'Create school',exact:true}).click();
 const old=(await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.find((t:any)=>t.name==='Test team 1');
 await page.getByRole('button',{name:'Link school for Test team 1',exact:true}).click();await page.getByLabel('Unused team number',{exact:true}).fill('7');await page.getByRole('button',{name:'Link team',exact:true}).click();await expect(teamRow(page,'Linked Academy',7)).toBeVisible();
 expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.find((t:any)=>t.id===old.id).teamNumber).toBe(7);
 await page.getByRole('combobox',{name:'Event status',exact:true}).selectOption('ended');await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await page.getByRole('button',{name:'Rename selected school',exact:true}).click();await page.getByLabel('School name',{exact:true}).fill('Renamed Academy');await page.getByRole('button',{name:'Save school name',exact:true}).click();await expect(teamRow(page,'Renamed Academy',7)).toBeVisible();await expect(page.getByRole('button',{name:'Set team count',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Remove team Renamed Academy 7',exact:true})).toBeDisabled();
});

test('partial setup shows progress and resumes its reserved plan',async({page,api})=>{
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token,school=(await api.service.schoolCreate(staff,{name:'Partial Academy',requestId:'partial-browser-school'})).school;
 const original=api.repo.batch;let failed=false;api.repo.batch=async(ops:any[])=>{if(!failed && ops.some(op=>op.entity.kind==='team' && op.entity.schoolId===school.id && op.entity.teamNumber===2)){failed=true;throw Error('Injected partial failure');}return original(ops);};
 await api.service.schoolTeams(staff,{eventId:'fixture-L6',schoolId:school.id,targetCount:2,requestId:'partial-browser-teams'}).catch(()=>{});
 await openEvents(page);await expect(page.getByRole('status').filter({hasText:'Partial Academy: 1 of 2 new teams saved'})).toBeVisible();await page.getByRole('button',{name:'Resume team setup',exact:true}).click();await expect(teamRow(page,'Partial Academy',2)).toBeVisible();await expect(page.getByRole('button',{name:'Resume team setup',exact:true})).toHaveCount(0);
});
