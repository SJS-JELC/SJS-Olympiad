import { test, expect } from '@playwright/test';
import { mockFullscreen, interrupt } from './fullscreen';

test('all approved U5 questions are catalogued and return to their opening directory', async ({page}) => {
  await page.goto('/?settings&view=problems');
  for(const number of [3,5,6,7]) {
    await page.getByRole('button',{name:new RegExp(`^U5 Problem ${number}:`)}).click();
    await expect(page).toHaveURL(new RegExp(`year=U5&question=${number}&from=problem-testing$`));
    await expect(page.locator('.question-brief')).toBeVisible();
    await page.getByRole('button',{name:'Back to problem testing',exact:true}).click();
  }
  for(const number of [1,2,4,8,9]) await expect(page.getByRole('button',{name:`U5 Problem ${number}: Not available`,exact:true})).toBeDisabled();
  await page.goto('/?theory&year=U5&question=6');
  await page.getByRole('button',{name:'Back to theory',exact:true}).click();
  await expect(page).toHaveURL(/\?theory&year=U5$/);
});

test('U5 content and an open Boundaries reference unmount synchronously on lock', async ({page}) => {
  await mockFullscreen(page);
  await page.goto('/?settings');
  await page.getByRole('button',{name:'Enter Competition Mode',exact:true}).click();
  for(const number of [3,6,7]) {
    await page.evaluate(number=>{ history.pushState(null,'',`?theory&year=U5&question=${number}`); window.dispatchEvent(new PopStateEvent('popstate')); },number);
    await expect(page.getByTestId(`u5p${number}-content`)).toBeVisible();
    if(number===7) await page.getByRole('button',{name:/reference|formula|spherical.cap|volume/i}).first().click();
    await interrupt(page,'blur');
    await expect(page.getByTestId(`u5p${number}-content`)).toHaveCount(0);
    await expect(page.locator('.question-brief')).toHaveCount(0);
    await page.getByLabel('Staff PIN',{exact:true}).fill('1234');
    await page.getByRole('button',{name:'Staff unlock',exact:true}).click();
    await expect(page.getByTestId(`u5p${number}-content`)).toBeVisible();
  }
});

test('monomer atoms cycle on a touch surface', async ({browser,baseURL}) => {
  const context=await browser.newContext({hasTouch:true,viewport:{width:1200,height:800},baseURL});
  const page=await context.newPage();
  await page.goto('/?theory&year=U5&question=3');
  const atom=page.getByRole('button',{name:/^Monomer 1, top left atom:/});
  await atom.tap();
  await expect(atom).toHaveAttribute('aria-label',/atom: F\./);
  await atom.tap();
  await expect(atom).toHaveAttribute('aria-label',/atom: Cl\./);
  await atom.tap();
  await expect(atom).toHaveAttribute('aria-label',/atom: H\./);
  await context.close();
});
