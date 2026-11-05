import {test,expect,type ApiHarness,type Page} from './fixtures';
const anonymous=test.extend({accessRole:null});
async function setup(api:ApiHarness,page:Page){
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 for(const event of (await api.service.events(staff)).events.filter((event:any)=>event.status!=='ended'))await api.service.eventEnd(staff,{eventId:event.id,expectedRevision:event.revision,confirm:true});
 const now=Date.now(),event=(await api.service.eventCreate(staff,{name:'Lifecycle fixture',year:'L6',theoryStartsAt:now+3600000,theoryEndsAt:now+7200000})).events.at(-1);
 await api.service.teamAdd(staff,{eventId:event.id,name:'Lifecycle team'});
 const roster=(await api.service.teams(staff,{eventId:event.id})).teams;
 await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await page.getByLabel('Teacher code',{exact:true}).fill('5678');await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'Submit teacher code',exact:true}).click();
 await page.getByRole('button',{name:'Events',exact:true}).click();return {staff,event,roster};
}
anonymous('status dropdown owns confirmed lifecycle transitions and practical preview stays in the catalogue',async({page,api})=>{
 const {staff,event,roster}=await setup(api,page),status=page.getByRole('combobox',{name:'Event status',exact:true}),toolbar=page.getByRole('toolbar',{name:'Event actions',exact:true});
 expect(roster.map((team:any)=>team.name).sort()).toEqual(['Lifecycle team',"St John's 1","St John's 2","St John's 3","St John's 4"]);
 for(const name of ['Activate event','End event','Return to draft','Preview practical'])await expect(toolbar.getByRole('button',{name,exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Preview Questions',exact:true}).click();
 for(const name of ['L5 practical: FLOATY','L6 practical: MOHR CRISPS','U6 practical: CLIPPY'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 await expect(status).toHaveValue('draft');await status.selectOption('active');await expect(page.getByRole('dialog')).toContainText('Activate this event?');
 expect(api.requests.filter(row=>row.action==='event-activate')).toHaveLength(0);await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(status).toHaveValue('draft');
 await status.selectOption('active');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(status).toHaveValue('active');
 await status.selectOption('draft');await expect(page.getByRole('dialog')).toContainText('Saved results and team claims will be preserved');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(status).toHaveValue('draft');
 await status.selectOption('ended');await expect(page.getByRole('dialog')).toContainText('cannot restart');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(status).toHaveValue('ended');await expect(status).toBeDisabled();
 const mutations=api.requests.filter(row=>['event-activate','event-draft','event-end'].includes(row.action));expect(mutations.map(row=>row.action)).toEqual(['event-activate','event-draft','event-end']);
 expect(mutations.map(row=>row.body.expectedRevision)).toEqual([1,2,3]);expect(mutations.every(row=>row.body.confirm===true)).toBe(true);
 expect((await api.service.events(staff)).events.find((row:any)=>row.id===event.id).status).toBe('ended');expect((await api.service.teams(staff,{eventId:event.id})).teams).toEqual(roster);
});
anonymous('dirty settings disable status changes and a stale transition remains an actionable confirmed failure',async({page,api})=>{
 const {staff,event}=await setup(api,page),status=page.getByRole('combobox',{name:'Event status',exact:true}),name=page.getByLabel('Event name',{exact:true});
 await name.fill('Unsaved name');await expect(status).toBeDisabled();await name.fill(event.name);await expect(status).toBeEnabled();
 await api.service.eventUpdate(staff,{eventId:event.id,expectedRevision:1,name:'Another teacher saved'});
 await status.selectOption('active');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/changed|refresh/i);
 expect((await api.service.events(staff)).events.find((row:any)=>row.id===event.id)).toMatchObject({status:'draft',name:'Another teacher saved',revision:2});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(name).toHaveValue(event.name);await expect(status).toHaveValue('draft');
});
