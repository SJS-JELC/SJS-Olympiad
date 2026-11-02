import {test,expect,openCompetitorQuestion,claimAndStart} from './fixtures';
const competitor=test.extend({accessRole:'competitor' as const});

competitor('wrong answer disappears after refresh/reselection while cooldown and eventual completion persist',async({page,api})=>{
 await page.clock.install();await openCompetitorQuestion(page,api,'U5',6);
 const answer=page.getByRole('textbox',{name:'Greatest hydrogen separation in pm'});
 await answer.fill('484');await page.getByRole('button',{name:'Check answers',exact:true}).click();
 await expect(answer).toBeDisabled();await expect(answer).toHaveValue('484');
 const old=await api.service.session(api.token),staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 await page.reload();await expect(page.getByLabel('Competitor code',{exact:true})).toBeVisible();
 await api.service.teamRelease(staff,{eventId:old.team.eventId,teamId:old.team.id,confirm:true});
 await claimAndStart(page);await page.getByRole('button',{name:'Theoretical Challenge'}).click();await page.getByRole('button',{name:/^Problem 6,/}).click();
 await expect(answer).toHaveValue('');await expect(answer).toBeDisabled();
 await page.clock.fastForward(20100);await answer.fill('485');await page.getByRole('button',{name:'Check answers',exact:true}).click();
 await expect(page.locator('.completion-stamp')).toBeVisible();
 const solvedTime=await page.locator('.completion-stamp').getAttribute('aria-label');
 const solved=await api.service.session(api.token);
 await page.reload();await expect(page.getByLabel('Competitor code',{exact:true})).toBeVisible();
 await api.service.teamRelease(staff,{eventId:solved.team.eventId,teamId:solved.team.id,confirm:true});
 await claimAndStart(page);await page.getByRole('button',{name:'Theoretical Challenge'}).click();await page.getByRole('button',{name:/^Problem 6,/}).click();
 await expect(answer).toHaveValue('');await expect(answer).toBeDisabled();
 await expect(page.locator('.completion-stamp')).toHaveAttribute('aria-label',solvedTime!);
});

competitor('GC reports stay through navigation but a fresh page restores only an active capture',async({page,api})=>{
 await page.clock.install();await openCompetitorQuestion(page,api,'U5',5);
 await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
 await page.getByRole('button',{name:'Add Citrus scent to injector',exact:true}).click();
 await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.getByRole('button',{name:'Running',exact:true})).toBeVisible();
 await page.clock.fastForward(4100);await expect(page.locator('.gc-printout')).toHaveCount(1);
 await page.getByRole('button',{name:'Back to theory',exact:true}).click();await page.getByRole('button',{name:/^Problem 5,/}).click();await expect(page.locator('.gc-printout')).toHaveCount(1);
 await page.getByRole('button',{name:'Add Mystery sample to injector',exact:true}).click();await page.getByRole('button',{name:'Run',exact:true}).click();
 const old=await api.service.session(api.token),staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 await page.reload();await expect(page.getByLabel('Competitor code',{exact:true})).toBeVisible();
 await api.service.teamRelease(staff,{eventId:old.team.eventId,teamId:old.team.id,confirm:true});await claimAndStart(page);
 await page.getByRole('button',{name:'Theoretical Challenge'}).click();await page.getByRole('button',{name:/^Problem 5,/}).click();
 await expect(page.locator('.gc-printout')).toHaveCount(0);
 await page.clock.fastForward(4100);await expect(page.locator('.gc-printout')).toHaveCount(1);
 await expect(page.locator('.gc-printout')).toContainText('Mystery sample');
});
