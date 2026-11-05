import {test,expect} from './fixtures';
test('fresh teacher entry, collapsed settings, in-memory preview and reload',async({page,api})=>{
 await page.goto('/?theory&question=6&year=U5');
 await expect(page.getByLabel('Teacher code',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Competitor code',{exact:true})).toBeVisible();
 await expect(page.locator('.access-card')).toHaveCount(0);
 await expect(page.locator('.code-panels__card')).toHaveCount(4);
 await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();
 await page.getByLabel('Teacher code',{exact:true}).fill('5678');
 await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'Submit teacher code',exact:true}).click();
 await expect(page.locator('.teacher-settings')).toBeVisible();
 await expect(page.getByRole('button',{name:'Back to landing',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Preview theory',exact:true})).toHaveCount(0);
 const questions=page.getByRole('button',{name:'Preview Questions',exact:true});
 await expect(questions).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('button',{name:'Events',exact:true})).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('button',{name:'Access codes',exact:true})).toHaveCount(0);
 await questions.click();
 const reads=api.requests.filter(r=>['hydrate','question'].includes(r.action)).length;
 await page.getByRole('button',{name:'U5 Problem 6: Cubone',exact:true}).click();
 const answer=page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true});
 await answer.fill('123');
 expect(api.requests.filter(r=>['hydrate','question'].includes(r.action)).length).toBe(reads);
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();
 await expect(questions).toHaveAttribute('aria-expanded','true');
 await page.getByRole('button',{name:'U5 Problem 6: Cubone',exact:true}).click();
 await expect(answer).toHaveValue('123');
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();
 await page.getByRole('button',{name:/L6 practical:/}).click();await expect(page.getByRole('region',{name:'Practical protocol'})).toBeVisible();
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
 await page.evaluate(()=>{window.history.pushState(null,'','/');window.dispatchEvent(new PopStateEvent('popstate'));});
 await expect(page.locator('.teacher-settings')).toBeVisible();await expect(page.locator('.splash-stage')).toHaveCount(0);
 await page.reload();
 await expect(page.getByLabel('Teacher code',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();
 await expect(page.getByLabel('Teacher code',{exact:true})).toHaveValue('');
 await expect(page.locator('.teacher-settings')).toHaveCount(0);
});

test('teacher timeout fills the bubble for ten seconds and survives closing',async({page,api},testInfo)=>{
 await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();
 const pin=page.getByLabel('Teacher code',{exact:true}),submit=page.getByRole('button',{name:'Submit teacher code'});
 await pin.fill('0000');await submit.click();await expect(pin).toBeDisabled();await expect(submit).toBeDisabled();await expect(page.locator('.teacher-password-liquid')).toBeVisible();
 const requests=api.requests.filter(r=>r.action==='login').length;
 await page.clock.fastForward(5000);await expect(page.getByRole('status').filter({hasText:'Teacher code time out'})).toContainText(/ [45] seconds/);
 await page.screenshot({path:testInfo.outputPath('teacher-timeout-half.png')});
 await page.getByRole('button',{name:'Close teacher sign in'}).click();await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();await expect(pin).toBeDisabled();
 await page.clock.fastForward(5100);await expect(pin).toBeEnabled();await expect(pin).toBeFocused();await expect(page.locator('.teacher-password-liquid')).toHaveCount(0);
 expect(api.requests.filter(r=>r.action==='login')).toHaveLength(requests);
 await pin.fill('5678');await submit.click();await expect(page.locator('.teacher-settings')).toBeVisible();
});

test('teacher transport failures do not start an incorrect-code timeout',async({page,api})=>{
 await page.goto('/');await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();api.fail.add('login');
 await page.getByLabel('Teacher code',{exact:true}).fill('5678');await page.getByRole('button',{name:'Submit teacher code'}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('Teacher code',{exact:true})).toBeEnabled();await expect(page.locator('.teacher-password-liquid')).toHaveCount(0);
});
