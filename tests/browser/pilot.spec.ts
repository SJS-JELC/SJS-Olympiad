import {test,expect} from './fixtures';
import type {Page} from './fixtures';
import {signInTeacher} from './teacher';
test.use({accessRole:null});
const key='olympiad-readiness-pilot-v1';
const graph=(count=1)=>({atoms:Array.from({length:count*5},(_,id)=>({id,element:'C',x:(id%5)*70+Math.floor(id/5)*350,y:50})),bonds:Array.from({length:count},(_,n)=>Array.from({length:4},(_,i)=>({a:n*5+i,b:n*5+i+1,order:i===0?3:1}))).flat()});
async function resume(page:Page){await page.getByRole('button',{name:'GO',exact:true}).click();await expect(page.getByRole('heading',{name:'FUNNY BONES',exact:true})).toBeVisible();await expect(page.locator('.question-actions button')).toBeEnabled();}
async function drawFixture(page:Page,count=1){await page.evaluate(({key,graph})=>{const saved=JSON.parse(localStorage.getItem(key)!);saved.drawing={kind:'molecule',graph,history:[]};localStorage.setItem(key,JSON.stringify(saved));},{key,graph:graph(count)});await page.reload();await resume(page);}
test.beforeEach(async({api})=>{
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 await api.service.schoolTeams(staff,{eventId:'fixture-L6',schoolId:'host-st-johns',targetCount:4,requestId:'pilot-host-teams'});
 await api.service.pilotMode(staff,{status:'open',expectedRevision:1,requestId:'browser-open-pilot'});
});
async function enter(page:Page){await page.goto('/');await page.getByRole('button',{name:'GO',exact:true}).click();await page.getByRole('radio',{name:"St John's",exact:true}).check();await page.getByRole('button',{name:'NEXT',exact:true}).click();await expect(page.getByRole('heading',{name:'FUNNY BONES',exact:true})).toBeVisible();await expect(page.locator('.question-actions button')).toBeEnabled();}
test('access is recorded before submission, reload restores drawing and uncertain retries preserve best',async({page,api})=>{
 await enter(page);const staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 let report=await api.service.pilotReport(staff);expect(report.readiness).toHaveLength(1);expect(report.readiness[0].best).toBeNull();const time=report.readiness[0].confirmedAt;
 await expect(page.locator('.pilot-board .pilot-school-name')).toHaveText(['–','–','–']);await expect(page.getByRole('button',{name:'Teacher sign in'})).toHaveCount(0);
 await drawFixture(page);api.lostResponses.add('pilot-submit');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('button',{name:'Retry submission'})).toBeEnabled();
 await page.reload();await resume(page);await page.getByRole('button',{name:'Retry submission'}).click();await expect(page.getByText('This submission: 1. Personal best: 1.',{exact:true})).toBeVisible();
 const calls=api.requests.filter(r=>r.action==='pilot-submit');expect(calls).toHaveLength(2);expect(calls[0].body).toEqual(calls[1].body);
 await expect(page.getByLabel('Score: 01')).toBeVisible();await expect(page.locator('.pilot-board .pilot-school-name')).toHaveText(["St John's",'–','–']);
 report=await api.service.pilotReport(staff);expect(report.readiness).toHaveLength(1);expect(report.readiness[0].confirmedAt).toBe(time);
 const n=api.requests.length;await page.waitForTimeout(1200);expect(api.requests).toHaveLength(n);
});
test('50 structures remain intact and screenshots fit landscape layouts',async({page},testInfo)=>{
 await page.setViewportSize({width:1920,height:1080});await enter(page);await drawFixture(page,50);
 await expect(page.locator('.pilot-drawing [data-atom]')).toHaveCount(250);await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.getByRole('button',{name:/clean/i}).click();
 await expect(page.locator('.pilot-drawing [data-atom]')).toHaveCount(250);await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByLabel('Score: 01')).toBeVisible();
 for(const size of [{width:1920,height:1080},{width:2560,height:1440},{width:1024,height:768}]){await page.setViewportSize(size);await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeInViewport();await page.screenshot({path:testInfo.outputPath(`funny-bones-${size.width}.png`)});}
});
test('cross-tab edits block stale submission and off/on retains the attempt',async({page,api})=>{
 await enter(page);await drawFixture(page);await page.evaluate(key=>window.dispatchEvent(new StorageEvent('storage',{key,newValue:'changed'})),key);
 await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Reload saved attempt'}).click();await resume(page);
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 await api.service.pilotMode(staff,{status:'off',expectedRevision:2,requestId:'browser-pilot-off'});
 await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByLabel('Competitor code',{exact:true})).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).drawing.graph.atoms.length,key)).toBe(5);
 await api.service.pilotMode(staff,{status:'open',expectedRevision:3,requestId:'browser-pilot-on'});await page.reload();await resume(page);await expect(page.locator('.pilot-drawing [data-atom]')).toHaveCount(5);
 expect((await api.service.pilotReport(staff)).readiness).toHaveLength(1);
});
test('teacher switch is reversible and report has only the requested columns',async({page})=>{
 await enter(page);await page.getByRole('button',{name:'Back to landing'}).click();await signInTeacher(page);
 await page.getByRole('button',{name:'Pilot',exact:true}).click();const panel=page.locator('#pilot-settings');
 await expect(panel.getByRole('columnheader')).toHaveText(['School','Access Confirmation Time','High Score']);await expect(panel.locator('tbody tr')).toHaveCount(1);
 const toggle=panel.getByRole('switch',{name:'Pilot',exact:true});await expect(toggle).toBeChecked();await toggle.click();await expect(toggle).not.toBeChecked();await toggle.click();await expect(toggle).toBeChecked();
 await expect(panel.getByRole('button',{name:/refresh/i})).toHaveCount(0);await expect(panel.getByText('Pilot results')).toHaveCount(0);
});
test('landing eagle is keyboard accessible; four digit inputs and stable GO artwork',async({page,api},testInfo)=>{
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token;await api.service.pilotMode(staff,{status:'off',expectedRevision:2,requestId:'entry-pilot-off'});
 await page.setViewportSize({width:1920,height:1080});await page.goto('/');const pin=page.getByLabel('Competitor code',{exact:true});await pin.fill('123456');await expect(pin).toHaveValue('1234');await pin.fill('ab12');await expect(pin).toHaveValue('12');
 await page.screenshot({path:testInfo.outputPath('landing.png')});const eagle=page.getByRole('button',{name:'Teacher sign in',exact:true});await eagle.focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Teacher code',{exact:true})).toBeFocused();
 await page.screenshot({path:testInfo.outputPath('teacher-bubble.png')});await page.setViewportSize({width:1024,height:768});await expect(page.locator('#teacher-password')).toBeInViewport();await page.screenshot({path:testInfo.outputPath('teacher-bubble-small.png')});await page.keyboard.press('Escape');await expect(eagle).toBeFocused();await expect(page.getByLabel('Teacher code',{exact:true})).toHaveCount(0);
});
