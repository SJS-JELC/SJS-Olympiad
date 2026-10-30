import { test, expect } from './fixtures';
import { openCompetitorQuestion, resumeCompetition } from './fixtures';
const competitor = test.extend({accessRole:'competitor' as const});
import { oxyanions } from '../fixtures/custom-server';

for (const fixture of [
  { year:'L5', number:9, cooldown:30_000, points:'03', key:[0,3,6,2,5,8,1,4,7] },
  { year:'L6', number:1, cooldown:20_000, points:'01', key:[1,5,7,3,8,6,4,2,0] },
]) {
  competitor(`${fixture.year} grouping clear, deadline and once-only scoring survive presentation changes`, async ({ page, api }, testInfo) => {
    await page.clock.install();
    await openCompetitorQuestion(page,api,fixture.year,fixture.number);
    const tiles=page.locator('.grouping-item');
    const check=page.locator('.check-button');
    const clear=page.getByRole('button',{name:'Reset / clear groups'});
    await check.click();
    await expect(check).toHaveAttribute('aria-label','Check answers');
    for (let index=0;index<9;index++) await tiles.nth(index).click();
    await check.click();
    await expect(check).toContainText('TIME OUT');
    await expect(page.locator('.incorrect-feedback')).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`${fixture.year}-grouping-wrong.png`)});
    await page.clock.fastForward(5_600);
    await expect(page.locator('.incorrect-feedback')).toHaveCount(0);
    await check.click();
    await clear.click();
    await expect(page.locator('.grouping-item[data-group="0"]')).toHaveCount(9);
    await expect(tiles.first()).toBeDisabled();
    await page.clock.fastForward(fixture.cooldown-5_600+100);
    await expect(tiles.first()).toBeEnabled();
    for (const index of fixture.key) await tiles.nth(index).click();
    await check.click();
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label',`Score: ${fixture.points}`);
    const status=page.getByRole('status').filter({hasText:'awarded.'});
    const statusBounds=await status.boundingBox();
    expect(statusBounds).toBeTruthy();
    expect(statusBounds!.y+statusBounds!.height).toBeLessThanOrEqual((await page.viewportSize())!.height);
    await page.clock.fastForward(600); // Let the decorative score flip settle.
    await page.screenshot({path:testInfo.outputPath(`${fixture.year}-grouping-solved.png`)});
    await expect(clear).toBeDisabled();
    await expect(check).toBeDisabled();
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label',`Score: ${fixture.points}`);
    await expect(tiles.first()).toBeDisabled();
  });
}

test('all question answer inputs and selects retain accessible names, uppercase headings and image optouts', async ({ page }) => {
  test.setTimeout(90_000);
  for (const year of ['L5','L6','U6']) for (let number=1;number<=9;number++) {
    await page.goto(`/?theory&year=${year}&question=${number}`);
    await page.locator('.question-brief').waitFor();
    const title=await page.locator('.olympiad-question-heading__title').innerText();
    expect(title).toBe(title.toLocaleUpperCase('en-GB'));
    for (const control of await page.locator('.question-content input:not([type="range"]),.question-content select').all()) await expect(control).toHaveAccessibleName(/.+/);
    await expect(page.locator('.question-page [title],.question-page svg>title')).toHaveCount(0);
  }
  await page.goto('/?theory&year=U5&question=5');
  await expect(page.locator('.olympiad-question-heading__title')).toHaveText('SCENTS AND SCENTSIBILITY');
  const prevented=await page.locator('.question-eagle').evaluate(el=>{
    const event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

competitor('timed naming focuses on GO and preserves run, wrong, timeout and solved presentations', async ({ page, api }, testInfo) => {
  await page.setViewportSize({width:1200,height:800});
  await page.clock.install();
  await openCompetitorQuestion(page,api,'L6',3);
  const go=page.getByRole('button',{name:'GO: start oxyanion challenge'});
  const input=page.getByRole('textbox',{name:'Oxyanion name'});
  await expect(input).toBeDisabled();
  await page.screenshot({path:testInfo.outputPath('L6P3-idle.png')});
  await go.click();
  await expect(input).toBeFocused();
  await page.screenshot({path:testInfo.outputPath('L6P3-run.png')});
  await input.fill('wrong');
  const submit=page.getByRole('button',{name:'Submit oxyanion name'});
  await Promise.all([
    page.waitForResponse(response=>response.url().endsWith('/api/olympiad/submit')),
    submit.click(),
  ]);
  await expect(page.locator('.cloud-status')).toHaveText('Saved');
  await expect(submit).toBeFocused();
  await expect(page.locator('.l6p3-feedback')).toBeVisible();
  await expect(page.locator('.l6p3-reveal')).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('L6P3-wrong.png')});
  const wrongFlashAcknowledged=page.waitForResponse(response=>response.url().endsWith('/api/olympiad/action')&&response.request().postDataJSON()?.action?.type==='tick');
  await page.clock.fastForward(600);
  await wrongFlashAcknowledged;
  await expect(page.locator('.cloud-status')).toHaveText('Saved');
  await expect(page.locator('.l6p3-feedback')).toHaveCount(0);
  await expect(submit).toBeFocused();
  await page.clock.fastForward(74_500);
  await expect(page.locator('.l6p3-reveal')).toContainText('The answer was');
  await expect(go).toBeDisabled();
  await page.screenshot({path:testInfo.outputPath('L6P3-timeout.png')});
  await page.clock.fastForward(20_100);
  await go.click();
  await expect(input).toBeFocused();
  for(let step=0;step<5;step++) {
    const formula=await page.locator('.l6p3-formula').getAttribute('aria-label');
    const prompt=oxyanions.find((item:{formula:string;name:string})=>item.formula===formula);
    expect(prompt).toBeTruthy();
    await input.fill(prompt!.name);
    await input.press('Enter');
    if(step<4) await expect(page.locator('.l6p3-formula')).not.toHaveAttribute('aria-label',formula!);
  }
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 01');
  await expect(input).toBeDisabled();
  await page.clock.fastForward(600);
  await page.screenshot({path:testInfo.outputPath('L6P3-solved.png')});
});
