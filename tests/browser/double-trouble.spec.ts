import { test, expect, openCompetitorQuestion, resumeCompetition } from './fixtures';
import { openTeacher } from './teacher';
import { doubleTroubleGroups } from '../fixtures/double-trouble';
const competitor = test.extend({accessRole:'competitor' as const});
const subscript = (formula: string) => formula.replace(/\d/g, digit => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);

competitor('Double Trouble groups stay local, survive navigation and lock, and award two points once',async({page,api})=>{
  await page.clock.install();
  await openCompetitorQuestion(page,api,'U5',7);
  const tiles=page.locator('.grouping-item');
  const check=page.getByRole('button',{name:'Check answers',exact:true});
  const clear=page.getByRole('button',{name:'Reset / clear groups'});
  await check.click();
  await expect(tiles.first()).toBeEnabled();
  const requests=api.requests.length;
  await tiles.first().focus();await page.keyboard.press('Space');
  await expect(tiles.first()).toHaveAttribute('data-group','1');
  expect(api.requests.length).toBe(requests);
  await page.getByRole('button',{name:'Back to theory',exact:true}).click();
  await page.getByRole('button',{name:'Problem 7, 2 points, not yet solved',exact:true}).click();
  await expect(tiles.first()).toHaveAttribute('data-group','1');
  const acknowledged=page.waitForResponse(response=>response.url().endsWith('/api/olympiad/breach'));
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.getByTestId('u5p7-content')).toHaveCount(0);
  await acknowledged;await resumeCompetition(page);
  await expect(tiles.first()).toHaveAttribute('data-group','1');
  for(let i=1;i<9;i++)await tiles.nth(i).click();
  await check.click();await expect(tiles.first()).toBeDisabled();
  await clear.click();
  await expect(page.locator('.grouping-item[data-group="0"]')).toHaveCount(9);
  await page.clock.fastForward(20100);
  for(const formula of doubleTroubleGroups.flat())await page.getByRole('button',{name:subscript(formula)+', unselected',exact:true}).click();
  await check.click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 02');
  await expect(clear).toBeDisabled();await expect(check).toBeDisabled();
  await expect(tiles.first()).toBeDisabled();
});

for (const viewport of [{width:960,height:640},{width:1920,height:1080},{width:2560,height:1440}]) {
  test(`Double Trouble formula tiles fit ${viewport.width}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);
    await openTeacher(page,'/?theory&year=U5&question=7');
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole('heading',{name:/DOUBLE TROUBLE/})).toBeVisible();
    await expect(page.locator('.grouping-formula')).toHaveCount(9);
    await expect(page.locator('.question-brief')).not.toContainText(/DBE|unsaturation/);
    expect(await page.locator('.grouping-formula').evaluateAll(labels=>labels.every(label=>{
      const a=label.getBoundingClientRect(),b=label.parentElement!.getBoundingClientRect();
      return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;
    }))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({path:testInfo.outputPath('double-trouble.png')});
  });
}
