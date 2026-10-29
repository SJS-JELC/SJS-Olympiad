import {test,expect} from '@playwright/test';
test('online L6P8 joins, submits and restores score',async({page},testInfo)=>{
  let joined=false, solved=false;
  const snapshot=()=>({team:{id:'test-1',name:'Test team 1'},score:solved?3:0,solvedAt:solved?100000:null,retryAt:0,serverNow:Date.now(),eventEndsAt:Date.now()+3600000});
  await page.route('**/api/olympiad/*',async route=>{
    const action=route.request().url().split('/').at(-1);
    if(action==='session'&&!joined){await route.fulfill({status:401,json:{error:'Join first.'}});return;}
    if(action==='teams'){await route.fulfill({json:{teams:[{id:'test-1',name:'Test team 1'}]}});return;}
    if(action==='claim')joined=true;
    if(action==='submit'){expect(route.request().postDataJSON().questionId).toBe('L6P8');solved=true;}
    await route.fulfill({json:{...snapshot(),correct:solved}});
  });
  await page.goto('/?theory&year=L6&question=8');
  await page.getByLabel('Event code').fill('private-test-code');
  await page.getByRole('button',{name:'Find teams'}).click();
  await page.getByRole('button',{name:'Claim team'}).click();
  await expect(page.getByRole('textbox',{name:'Equilibrium concentration of B',exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('online-question.png'),fullPage:true});
  await page.getByRole('textbox',{name:'Equilibrium concentration of B',exact:true}).fill('0.437');
  await page.locator('form.question-answer-form').evaluate((form:HTMLFormElement)=>form.requestSubmit());
  await expect(page.getByText('Correct — score saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('3 points awarded.')).toBeVisible();
});
test('unavailable API reports a failure without local marking',async({page})=>{
  await page.route('**/api/olympiad/*',route=>route.fulfill({status:503,json:{error:'The score service is unavailable.'}}));
  await page.goto('/?theory&year=L6&question=8');
  await expect(page.locator('.cloud-status')).toContainText('unavailable');
  await expect(page.getByRole('textbox',{name:'Equilibrium concentration of B',exact:true})).toHaveCount(0);
});
