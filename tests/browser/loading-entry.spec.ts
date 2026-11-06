import {test,expect,loginCompetitor} from './fixtures';
import {mockFullscreen} from './fullscreen';
test.use({accessRole:null});

test('team lock-in preloads the whole theory year before GO and navigation reuses it',async({page,api})=>{
 await mockFullscreen(page);await page.goto('/');await loginCompetitor(page);
 await page.getByRole('button',{name:'LOCK IN',exact:true}).click();
 await expect(page.getByRole('button',{name:'GO',exact:true})).toBeVisible();
 await expect.poll(()=>new Set(api.requests.filter(r=>r.action==='question-content').map(r=>r.body.questionId)).size).toBe(9);
 await expect(page.locator('.question-brief')).toHaveCount(0);
 await page.getByRole('button',{name:'GO',exact:true}).click();
 await page.getByRole('button',{name:'Theoretical Challenge'}).click();
 const before=api.requests.filter(r=>r.action==='question-content').length;
 await page.getByRole('button',{name:/^Problem 5,/}).click();
 await expect(page.locator('.question-brief')).toBeVisible();
 expect(api.requests.filter(r=>r.action==='question-content')).toHaveLength(before);
});

test('entry shows the full splash until mode is known, then reveals competition input',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 let release!:()=>void;const wait=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/olympiad/entry',async route=>{await wait;await route.fulfill({json:{mode:'competition',competitorAvailable:true}});});
 await page.goto('/');
 await expect(page.locator('.loading-indicator--full')).toBeVisible();
 await page.screenshot({path:'test-results/loading-splash.png'});
 await expect(page.getByLabel('Competitor code')).toHaveCount(0);
 release();await expect(page.getByLabel('Competitor code')).toBeVisible();
 await expect(page.locator('.loading-indicator--full')).toHaveCount(0);
});

test('pilot background request begins before GO and GO joins the same request',async({page,api})=>{
 await page.route('**/api/olympiad/entry',route=>route.fulfill({json:{mode:'pilot',competitorAvailable:true}}));
 let count=0,release!:()=>void;const wait=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/olympiad/pilot',async route=>{count++;await wait;await route.fulfill({json:{status:'open',revision:1,eventId:null,schools:[],rankings:[],snapshotAt:Date.now()}});});
 await page.goto('/');await expect(page.getByText('Welcome to the Olympiad!',{exact:false})).toBeVisible();
 await expect.poll(()=>count).toBe(1);
 await page.getByRole('button',{name:'GO',exact:true}).click();
 await expect(page.getByText('Loading schools…')).toBeVisible();
 expect(count).toBe(1);release();
 await expect(page.getByText('Loading schools…')).toHaveCount(0);
 expect(api.requests.filter(r=>r.action==='availability')).toHaveLength(0);
});

test('failed entry offers retry without guessing mode',async({page})=>{
 let fail=true;await page.route('**/api/olympiad/entry',route=>route.fulfill(fail?{status:503,json:{error:'Unavailable'}}:{json:{mode:'competition',competitorAvailable:true}}));
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('Unavailable');
 await expect(page.getByLabel('Competitor code')).toHaveCount(0);
 fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.getByLabel('Competitor code')).toBeVisible();
});
