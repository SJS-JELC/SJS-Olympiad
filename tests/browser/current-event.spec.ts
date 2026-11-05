import {test,expect} from './fixtures';

test.use({accessRole:null});

test('competitor GO follows availability and teacher opens the current draft',async({page,api})=>{
  const staff=await api.service.login({role:'teacher',code:'5678'});
  for(const event of (await api.service.events(staff.token)).events){
    await api.service.eventEnd(staff.token,{eventId:event.id,expectedRevision:event.revision,confirm:true});
  }
  await page.goto('/');
  await page.getByLabel('Competitor code',{exact:true}).fill('1234');
  const competitor=page.locator('form').filter({has:page.getByLabel('Competitor code',{exact:true})});
  await expect(competitor.getByRole('button',{name:'GO',exact:true})).toBeDisabled();
  const created=await api.service.eventCreate(staff.token,{name:'Current December event',year:'U5',theoryStartsAt:Date.now(),theoryEndsAt:Date.now()+3600000});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(competitor.getByRole('button',{name:'GO',exact:true})).toBeEnabled();
  await page.getByLabel('Teacher code',{exact:true}).fill('5678');
  await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'Submit teacher code',exact:true}).click();
  await page.getByRole('button',{name:'Events',exact:true}).click();
  await expect(page.getByLabel('Selected event:')).toHaveValue(created.createdEventId);
  await expect(page.getByRole('button',{name:'Create new event',exact:true})).toBeDisabled();
});

test('availability failures leave competitor GO disabled while teacher sign-in remains available',async({page,api})=>{
  api.fail.add('availability');
  await page.goto('/');
  await page.getByLabel('Competitor code',{exact:true}).fill('1234');
  await page.getByLabel('Teacher code',{exact:true}).fill('5678');
  await expect(page.locator('form').filter({has:page.getByLabel('Competitor code',{exact:true})}).getByRole('button',{name:'GO',exact:true})).toBeDisabled();
  await expect(page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'Submit teacher code',exact:true})).toBeEnabled();
  await expect(page.getByRole('alert')).toContainText('Event availability could not be checked');
});
