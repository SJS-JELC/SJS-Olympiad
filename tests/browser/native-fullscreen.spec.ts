import {test,expect} from './fixtures';

const competitor=test.extend({accessRole:'competitor' as const});

competitor('native fullscreen entry, exit and staff recovery preserve the server gate',async({page,api})=>{
  await page.goto('/');
  // This test deliberately uses Chromium's actual Fullscreen API, without the
  // deterministic event adapter used by interruption/race tests.
  expect(await page.evaluate(()=>HTMLElement.prototype.requestFullscreen.toString())).toContain('[native code]');
  await page.getByRole('button',{name:'Claim team',exact:true}).click();
  await page.getByRole('button',{name:'GO',exact:true}).click();
  await expect(page.getByRole('button',{name:'Theoretical challenge',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
  expect((await api.service.session(api.token)).competition.status).toBe('ACTIVE');
  await page.getByRole('button',{name:'Theoretical challenge',exact:true}).click();
  await expect(page.locator('.theory-stage')).toBeVisible();
  await page.getByRole('button',{name:/^Problem 5,/}).click();
  await expect(page.locator('.question-content')).toBeVisible();

  await page.evaluate(()=>document.exitFullscreen());
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.question-content')).toHaveCount(0);
  await expect.poll(async()=>(await api.service.session(api.token)).competition.status).toBe('LOCKED');
  await page.getByLabel('Teacher code',{exact:true}).fill('5678');
  await page.getByRole('button',{name:'Verify teacher code',exact:true}).click();
  await expect(page.locator('.question-content')).toHaveCount(0);
  await page.getByRole('button',{name:'Resume competition',exact:true}).click();
  await expect(page.locator('.question-content')).toBeVisible();
  expect(await page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
  const restored=await api.service.session(api.token);
  expect(restored.role).toBe('competitor');
  expect(restored.competition.status).toBe('ACTIVE');
});
