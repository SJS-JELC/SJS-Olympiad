import {test,expect} from './fixtures';
import {openEvents} from './teacher';

test('teacher creates a school once, defaults to two, groups its numbered teams and preserves typed counts while collapsed',async({page,api})=>{
 await openEvents(page);await page.getByLabel('New school name',{exact:true}).fill('Example Academy');await page.getByRole('button',{name:'Create school',exact:true}).click();
 await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('2');await page.getByRole('button',{name:'Set team count',exact:true}).click();
 await expect(page.getByRole('rowheader',{name:'Example Academy · 2 teams',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'Example Academy 1',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'Example Academy 2',exact:true})).toBeVisible();
 await page.getByLabel('Target team count',{exact:true}).fill('3');await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByRole('button',{name:'Events',exact:true}).click();await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('3');
 await page.getByRole('button',{name:'Set team count',exact:true}).click();await expect(page.getByRole('cell',{name:'Example Academy 3',exact:true})).toBeVisible();
 const staff=await api.service.login({role:'teacher',code:'5678'}),school=(await api.service.schools(staff.token)).schools.find((s:any)=>s.name==='Example Academy');
 expect((await api.service.teams(staff.token,{eventId:'fixture-L6'})).teams.filter((t:any)=>t.schoolId===school.id).map((t:any)=>t.teamNumber)).toEqual([1,2,3]);
 await page.getByLabel('Selected event').selectOption('fixture-L5');await page.getByLabel('School',{exact:true}).selectOption(school.id);await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('2');
 await page.getByLabel('School',{exact:true}).selectOption('host-st-johns');await expect(page.getByLabel('Target team count',{exact:true})).toHaveValue('4');
});

test('uncertain school and team setup retry their frozen request without duplicates',async({page,api})=>{
 await openEvents(page);await page.getByLabel('New school name',{exact:true}).fill('Retry Academy');api.lostResponses.add('school-create');await page.getByRole('button',{name:'Create school',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry create school',exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry create school',exact:true}).click();
 const create=api.requests.filter(r=>r.action==='school-create');expect(create).toHaveLength(2);expect(create[1].body).toEqual(create[0].body);
 api.lostResponses.add('school-teams');await page.getByRole('button',{name:'Set team count',exact:true}).click();await expect(page.getByRole('button',{name:'Retry set team count',exact:true})).toBeVisible();await page.getByRole('button',{name:'Retry set team count',exact:true}).click();
 const requests=api.requests.filter(r=>r.action==='school-teams');expect(requests).toHaveLength(2);expect(requests[1].body).toEqual(requests[0].body);await expect(page.getByRole('rowheader',{name:'Retry Academy · 2 teams',exact:true})).toBeVisible();
});

test('legacy linking preserves its permanent ID and a school rename updates completed roster names',async({page,api})=>{
 await openEvents(page);await page.getByLabel('New school name',{exact:true}).fill('Linked Academy');await page.getByRole('button',{name:'Create school',exact:true}).click();
 const old=(await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.find((t:any)=>t.name==='Test team 1');
 await page.getByRole('button',{name:'Link school for Test team 1',exact:true}).click();await page.getByLabel('Unused team number',{exact:true}).fill('7');await page.getByRole('button',{name:'Link team',exact:true}).click();await expect(page.getByRole('cell',{name:'Linked Academy 7',exact:true})).toBeVisible();
 expect((await api.service.teams(api.token,{eventId:'fixture-L6'})).teams.find((t:any)=>t.id===old.id).teamNumber).toBe(7);
 await page.getByRole('combobox',{name:'Event status',exact:true}).selectOption('ended');await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await page.getByRole('button',{name:'Rename selected school',exact:true}).click();await page.getByLabel('School name',{exact:true}).fill('Renamed Academy');await page.getByRole('button',{name:'Save school name',exact:true}).click();await expect(page.getByRole('cell',{name:'Renamed Academy 7',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Set team count',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Delete team Renamed Academy 7',exact:true})).toBeDisabled();
});

test('partial setup shows progress and resumes its reserved plan',async({page,api})=>{
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token,school=(await api.service.schoolCreate(staff,{name:'Partial Academy',requestId:'partial-browser-school'})).school;
 const original=api.repo.batch;let failed=false;api.repo.batch=async(ops:any[])=>{if(!failed && ops.some(op=>op.entity.kind==='team' && op.entity.schoolId===school.id && op.entity.teamNumber===2)){failed=true;throw Error('Injected partial failure');}return original(ops);};
 await api.service.schoolTeams(staff,{eventId:'fixture-L6',schoolId:school.id,targetCount:2,requestId:'partial-browser-teams'}).catch(()=>{});
 await openEvents(page);await expect(page.getByRole('status').filter({hasText:'Partial Academy: 1 of 2 new teams saved'})).toBeVisible();await page.getByRole('button',{name:'Resume team setup',exact:true}).click();await expect(page.getByRole('cell',{name:'Partial Academy 2',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Resume team setup',exact:true})).toHaveCount(0);
});
