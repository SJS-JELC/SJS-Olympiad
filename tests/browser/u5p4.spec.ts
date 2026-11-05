import { openTeacher } from './teacher';
import { test, expect, openCompetitorQuestion } from './fixtures';
const competitor = test.extend({ accessRole: 'competitor' as const });
competitor('naming blank cooldown survives navigation and correct answer awards once', async ({page,api}) => {
  await page.clock.install();
  await openCompetitorQuestion(page,api,'U5',4);
  const answer=page.getByRole('textbox',{name:'Name of the sixth molecule'});
  await expect(answer).toBeFocused();
  await page.getByRole('button',{name:'Check answers'}).click();
  await expect(answer).toBeDisabled();
  await page.getByRole('button',{name:'Back to theory',exact:true}).click();
  await page.getByRole('button',{name:'Problem 4, 1 point, not yet solved',exact:true}).click();
  await expect(answer).toBeDisabled();
  await page.clock.fastForward(20100);
  await answer.fill('1,4-oxazepine');
  await page.getByRole('button',{name:'Check answers'}).click();
  await expect(answer).toBeDisabled();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 01');
  await expect(page.getByRole('button',{name:'Check answers'})).toBeDisabled();
});
for (const viewport of [{width:960,height:640},{width:1920,height:1080},{width:2560,height:1440}]) {
  test(`naming readable layout ${viewport.width}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);
    await openTeacher(page,'/?theory&year=U5&question=4');
    await page.evaluate(()=>document.fonts.ready);
    const diagram=page.locator('.u5p4-diagram');
    await expect(diagram).toBeVisible();
    expect(await diagram.evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth===1620)).toBe(true);
    const fits=await page.evaluate(()=>{
      const pane=document.querySelector('.u5p4-brief')!;
      const check=document.querySelector('.check-button')!.getBoundingClientRect();
      return {page:document.documentElement.scrollHeight<=innerHeight,pane:pane.scrollHeight<=pane.clientHeight+1,check:check.bottom<=innerHeight};
    });
    expect(fits).toEqual({page:true,pane:true,check:true});
    await page.screenshot({path:testInfo.outputPath('naming.png')});
  });
}
