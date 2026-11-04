import { openTeacher } from './teacher';
import { test, expect } from './fixtures';
import { openCompetitorQuestion, resumeCompetition } from './fixtures';
const competitor = test.extend({accessRole:'competitor' as const});
test.use({hasTouch:true});

test('all approved U5 questions are catalogued and return to Settings',async({page})=>{
 await openTeacher(page);await page.getByRole('button',{name:'Preview Questions',exact:true}).click();
 for(const number of [2,3,4,5,6,7,8,9]){
  await page.getByRole('button',{name:new RegExp(`^U5 Problem ${number}:`)}).click();await expect(page).toHaveURL(new RegExp(`question=${number}$`));await expect(page.locator('.question-brief')).toBeVisible();await expect(page.locator('.olympiad-question-heading__number')).toHaveText(`U5 \u00b7 Problem ${number}`);await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
 }
 for(const number of [1])await expect(page.getByRole('button',{name:new RegExp(`^U5 Problem ${number}:`)})).toHaveCount(0);
});

competitor('U5 content and an open Boundaries reference unmount synchronously on lock', async ({page,api}) => {
  await page.clock.install();
  await openCompetitorQuestion(page,api,'U5');
  for(const number of [2,3,4,5,6,7,8,9]) {
    await page.evaluate(number=>{ history.pushState(null,'',`?theory&year=U5&question=${number}`); window.dispatchEvent(new PopStateEvent('popstate')); },number);
    await expect(page.locator('.question-content')).toBeVisible();
    if(number===8) {
      await page.getByRole('button',{name:'Open spherical cap volume reference',exact:true}).click();
      await expect(page.getByRole('dialog',{name:'Spherical cap volume',exact:true})).toBeVisible();
    }
    const breachAcknowledged=page.waitForResponse(response=>response.url().endsWith('/api/olympiad/breach'));
    const absentImmediately=await page.evaluate(()=>{
      window.dispatchEvent(new Event('blur'));
      return document.querySelector('.question-content,.question-brief,.u5p8-reference')===null;
    });
    expect(absentImmediately,`U5P${number} content and reference removed within the blur event`).toBe(true);
    await expect(page.locator('.question-content')).toHaveCount(0);
    await expect(page.locator('.question-brief')).toHaveCount(0);
    await expect(page.getByRole('dialog',{name:'Spherical cap volume',exact:true})).toHaveCount(0);
    await breachAcknowledged;
    // Every cycle verifies recovery without exhausting the production staff-code rate limit.
    await page.clock.fastForward(61_000);
    await expect(page.locator('.question-content')).toHaveCount(0);
    await resumeCompetition(page);
    await expect(page.locator('.question-content')).toBeVisible();
    await expect(page.getByRole('dialog',{name:'Spherical cap volume',exact:true})).toHaveCount(0);
  }
});

test('monomer drawing supports touch atom replacement, undo and navigation', async ({page}) => {
  await page.setViewportSize({width:1200,height:800});
  await openTeacher(page, '/?theory&year=U5&question=3');
  const canvas=page.locator('.molecule-workspace');
  await expect(canvas).toBeVisible();
  await page.locator('[data-element="H"]').tap();
  const box=(await canvas.boundingBox())!;
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  const atom=canvas.locator('[data-atom]');
  await expect(atom).toHaveCount(1);
  await expect(atom).toHaveAttribute('aria-label',/^Hydrogen atom/);
  for(const [element,name] of [['F','Fluorine'],['Cl','Chlorine']]) {
    await page.locator(`[data-element="${element}"]`).tap();
    await atom.tap();
    await expect(atom).toHaveAttribute('aria-label',new RegExp(`^${name} atom`));
    await page.getByRole('button',{name:'Undo',exact:true}).tap();
    await expect(atom).toHaveAttribute('aria-label',/^Hydrogen atom/);
  }
  await page.getByRole('button',{name:'Back to settings',exact:true}).tap();
  await page.getByRole('button',{name:'Preview Questions',exact:true}).click();
  await page.getByRole('button',{name:/^U5 Problem 3:/}).tap();
  await expect(atom).toHaveCount(1);
  await expect(atom).toHaveAttribute('aria-label',/^Hydrogen atom/);
});
