import {test,expect} from './fixtures';
import {signInTeacher} from './teacher';
const anonymous=test.extend({accessRole:null});
const editorQuestionNumbers=[2,3,9] as const;

async function enterTeacher(page:import('@playwright/test').Page){
  await page.goto('/');await signInTeacher(page);
}
async function open(page:import('@playwright/test').Page,number:number){
  await page.evaluate(number=>{history.pushState(null,'',`?theory&catalogue&year=U5&question=${number}`);dispatchEvent(new PopStateEvent('popstate'));},number);
  const canvas=page.locator(number===2?'.dc-canvas':'.molecule-workspace');await expect(canvas).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);return canvas;
}
for(const [width,height] of [[1920,1080],[2560,1440],[1366,768],[960,640]])anonymous(`approved left palette fits ${width}x${height}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height});await enterTeacher(page);
  for(const number of editorQuestionNumbers){
    const canvas=await open(page,number),toolbar=page.locator(number===2?'.dot-cross-editor .toolbar':'.molecule-editor .editor-bar');
    const rail=(await toolbar.boundingBox())!,drawing=(await canvas.boundingBox())!;
    expect(rail.x+rail.width).toBeLessThanOrEqual(drawing.x+1);
    expect(drawing.height).toBeGreaterThan(height*.16);
    expect(rail.width).toBeLessThanOrEqual(Math.max(92,height*.115)+2);
    expect(await toolbar.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(number!==2){await canvas.focus();await canvas.press('Enter');await expect(canvas.locator('[data-atom]')).toHaveCount(1);}
    if(number===3){
      const pane=(await page.locator('.u5p3-question>.question-brief').boundingBox())!,card=(await page.locator('.molecule-editor .drawing-card').boundingBox())!;
      expect(Math.abs(pane.x-card.x)).toBeLessThanOrEqual(1);expect(Math.abs(pane.width-card.width)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({path:testInfo.outputPath(`U5P${number}-left-${width}x${height}.png`)});
  }
});
const touch=anonymous.extend({hasTouch:true,viewport:{width:960,height:640}});
touch('short touch viewport retains 44px targets and reachable drawing area',async({page},testInfo)=>{
  await enterTeacher(page);
  for(const number of editorQuestionNumbers){
    const canvas=await open(page,number),editor=page.locator(number===2?'.dot-cross-editor':'.molecule-editor');
    const tools=await editor.locator('button').evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().width>0).map(node=>({name:node.getAttribute('aria-label')??node.textContent,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
    expect(tools.filter(tool=>tool.width<43.9||tool.height<43.9)).toEqual([]);
    expect((await canvas.boundingBox())!.height).toBeGreaterThan(640*.14);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`U5P${number}-touch-960x640.png`)});
  }
});
