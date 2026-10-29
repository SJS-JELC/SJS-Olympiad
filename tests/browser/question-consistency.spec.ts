import { test, expect } from '@playwright/test';

const questions: readonly [string,number][] = [
  ...['L5','L6','U6'].flatMap(year=>Array.from({length:9},(_,index)=>[year,index+1] as [string,number])),
  ...[2,3,5,6,7].map(number=>['U5',number] as [string,number]),
];

for(const viewport of [{width:1200,height:800},{width:1440,height:900},{width:1440,height:810},{width:1920,height:1080}]) {
  test(`every registered question shares title size and bottom action at ${viewport.width}x${viewport.height}`,async({page})=>{
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    for(const [year,number]of questions) {
      await page.goto(`/?theory&year=${year}&question=${number}`);
      await page.locator('.question-brief').waitFor();
      if(year==='U5'&&number===5){const enter=page.getByRole('button',{name:/Enter laboratory/i});if(await enter.count())await enter.click();}
      await page.evaluate(()=>document.fonts.ready);
      const metrics=await page.evaluate(()=>{
        const title=document.querySelector('.olympiad-question-heading__title')!,panel=document.querySelector('.question-title-panel')!,pane=document.querySelector('.question-brief')!,action=document.querySelector('.check-button,.l6p3-submit')!;
        const ar=action.getBoundingClientRect(),pr=pane.getBoundingClientRect(),tr=panel.getBoundingClientRect();
        const overlaps=[...document.querySelectorAll('.question-content input,.question-content select,.question-content button')].filter(el=>el!==action&&!el.closest('.question-actions')&&el.getClientRects().length).map(el=>el.getBoundingClientRect()).some(r=>r.width>0&&r.height>0&&r.left<ar.right-.5&&r.right>ar.left+.5&&r.top<ar.bottom-.5&&r.bottom>ar.top+.5);
        return{font:parseFloat(getComputedStyle(title).fontSize),height:ar.height,bottom:innerHeight-ar.bottom,gap:pr.top-tr.bottom,actionOverlaps:overlaps,scroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
      });
      expect(metrics.font,`${year}P${number} title`).toBeCloseTo(viewport.height*.046,1);
      expect(metrics.height,`${year}P${number} action height`).toBeCloseTo(viewport.height*.08,1);
      expect(Math.abs(metrics.bottom-viewport.height*.025),`${year}P${number} action bottom`).toBeLessThan(1);
      expect(Math.abs(metrics.gap-viewport.height*.01),`${year}P${number} header gap`).toBeLessThan(1);
      expect(metrics.actionOverlaps,`${year}P${number} action overlap`).toBe(false);
      expect(metrics.scroll,`${year}P${number} document overflow`).toBe(false);
    }
  });
}

test('solved inline award status stays below Check within its reserved bottom band',async({page},testInfo)=>{
  test.setTimeout(90_000);
  for(const viewport of [{width:1200,height:800},{width:960,height:640}]) {
    await page.setViewportSize(viewport);
    await page.goto('/?theory&year=U6&question=8');
    await page.locator('.question-brief').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const pane=await page.locator('.question-brief').boundingBox();
    await page.getByRole('textbox',{name:'SN1 (%)',exact:true}).fill('60.3');
    await page.getByRole('textbox',{name:'SN2 (%)',exact:true}).fill('39.7');
    await page.getByRole('button',{name:'Check answers'}).click();
    const status=page.locator('.question-actions [role="status"]');
    await expect(status).toHaveText('3 points awarded.');
    const award=await status.boundingBox(),check=await page.locator('.check-button').boundingBox();
    expect(award!.y).toBeGreaterThan(check!.y+check!.height);
    expect(award!.y+award!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.locator('.question-brief').boundingBox()).toEqual(pane);
    await page.waitForTimeout(500); // Capture settled decorative score digits.
    await page.screenshot({path:testInfo.outputPath(`state-U6P8-solved-${viewport.width}x${viewport.height}.png`)});
  }
});
