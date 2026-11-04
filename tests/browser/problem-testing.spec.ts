import { test, expect } from './fixtures';
import { openTeacher, openEvents } from './teacher';

test('teacher catalogue exposes all 35 registered problem presentations',async({page})=>{
 test.setTimeout(120000);await openTeacher(page);await page.getByRole('button',{name:'Preview Questions',exact:true}).click();
 for(const year of ['L5','L6','U6','U5'])for(const number of year==='U5'?[2,3,4,5,6,7,8,9]:[1,2,3,4,5,6,7,8,9]){
  await page.getByRole('button',{name:new RegExp(`^${year} Problem ${number}:`)}).click();await expect(page.locator('.question-brief')).toBeVisible();await expect(page.locator('.olympiad-question-heading')).toContainText(year);await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
 }
});

test('internal history preserves preview working and the selected event',async({page})=>{
 await openEvents(page,'/?settings&eventId=fixture-L6');await page.getByRole('button',{name:'Preview Questions',exact:true}).click();await page.getByRole('button',{name:/^L6 Problem 5:/}).click();await page.locator('.angle-input input').first().fill('300');await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L6');await page.goBack();await expect(page.locator('.angle-input input').first()).toHaveValue('300');await page.goForward();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-L6');
});

test('teacher can preview another year without fullscreen or a team and preserve the selected event',async({page})=>{
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-U5');await page.getByRole('button',{name:'Preview Questions',exact:true}).click();await page.getByRole('button',{name:/^L5 Problem 1:/}).click();await expect(page.locator('.olympiad-question-heading')).toContainText('L5');expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();await expect(page.locator('.competitor-team-pill')).toHaveCount(0);await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByLabel('Selected event')).toHaveValue('fixture-U5');
});
