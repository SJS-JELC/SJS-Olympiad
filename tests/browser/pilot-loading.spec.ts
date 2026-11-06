import {test,expect} from './fixtures';
import {signInTeacher} from './teacher';

test.use({accessRole:null});

for(const mode of ['open','off'] as const)test(`pending pilot lookup shows neither pupil entry form before ${mode} response`,async({page,api})=>{
 if(mode==='open'){
  const staff=(await api.service.login({role:'teacher',code:'5678'})).token;
  await api.service.pilotMode(staff,{status:'open',expectedRevision:1,requestId:'loading-pilot-open'});
 }
 let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/olympiad/entry',async route=>{await held;await route.fallback();});
 try{
  await page.goto('/');
  await expect(page.locator('.loading-indicator--full')).toBeVisible();
  await expect(page.getByLabel('Competitor code',{exact:true})).toHaveCount(0);
  await expect(page.locator('.pilot-welcome-copy')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'GO',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Teacher sign in',exact:true})).toHaveCount(0);
  expect(api.requests.filter(row=>row.action==='availability')).toHaveLength(0);
 }finally{release();}
 if(mode==='open'){
  await expect(page.locator('.pilot-welcome-copy')).toBeVisible();
  await expect(page.getByRole('button',{name:'GO',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Competitor code',{exact:true})).toHaveCount(0);
  expect(api.requests.filter(row=>row.action==='availability')).toHaveLength(0);
 }else{
  const pin=page.getByLabel('Competitor code',{exact:true});
  await expect(pin).toBeVisible();await pin.fill('1234');
  await expect(page.getByRole('button',{name:'GO',exact:true})).toBeEnabled();
 }
});

test('failed pilot lookup keeps pupil entry hidden and Retry resolves the mode',async({page,api})=>{
 api.fail.add('entry');await page.goto('/');
 await expect(page.locator('.pilot-entry-error')).toContainText('unavailable');
 await expect(page.getByLabel('Competitor code',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'GO',exact:true})).toHaveCount(0);
 api.fail.delete('entry');await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.getByLabel('Competitor code',{exact:true})).toBeVisible();
});

test('teacher sign-in is available after entry lookup recovers',async({page,api})=>{
 api.fail.add('entry');await page.goto('/');
 await expect(page.locator('.pilot-entry-error')).toBeVisible();
 api.fail.delete('entry');await page.getByRole('button',{name:'Retry',exact:true}).click();
 await signInTeacher(page);
});
