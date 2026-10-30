import { test, expect } from './fixtures';

const questions: readonly [string,number][] = [
  ...['L5','L6','U6'].flatMap(year=>Array.from({length:9},(_,index)=>[year,index+1] as [string,number])),
  ...[2,3,5,6,7,8].map(number=>['U5',number] as [string,number]),
];

for(const viewport of [{width:960,height:640},{width:1200,height:800},{width:1440,height:900},{width:1440,height:810},{width:1920,height:1080},{width:2560,height:1440}]) {
  test(`every registered question shares title size and bottom action at ${viewport.width}x${viewport.height}`,async({page},testInfo)=>{
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    for(const [year,number]of questions) {
      await test.step(`${year}P${number}`,async()=>{
      await page.goto(`/?theory&year=${year}&question=${number}`);
      await page.locator('.question-brief').waitFor();
      if(year==='U5'&&number===5){const enter=page.getByRole('button',{name:/Enter laboratory/i});if(await enter.count())await enter.click();}
      await expect(page.locator('.check-button,.l6p3-submit')).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);
      await expect.poll(()=>page.locator('.question-page img').evaluateAll(images=>images.every(image=>image instanceof HTMLImageElement&&image.complete&&image.naturalWidth>0))).toBe(true);
      const metrics=await page.evaluate(()=>{
        const title=document.querySelector('.olympiad-question-heading__title')!,panel=document.querySelector('.question-title-panel')!,pane=document.querySelector('.question-brief')!,action=document.querySelector('.check-button,.l6p3-submit')!;
        const prompt=pane.querySelector('p:not(.type-caption)');
        const ar=action.getBoundingClientRect(),pr=pane.getBoundingClientRect(),tr=panel.getBoundingClientRect();
        const overlaps=[...document.querySelectorAll('.question-content input,.question-content select,.question-content button')].filter(el=>el!==action&&!el.closest('.question-actions')&&el.getClientRects().length).map(el=>el.getBoundingClientRect()).some(r=>r.width>0&&r.height>0&&r.left<ar.right-.5&&r.right>ar.left+.5&&r.top<ar.bottom-.5&&r.bottom>ar.top+.5);
        const status=document.querySelector('.cloud-status')?.getBoundingClientRect();
        const statusOverlaps=!!status&&status.left<ar.right&&status.right>ar.left&&status.top<ar.bottom&&status.bottom>ar.top;
        return{font:parseFloat(getComputedStyle(title).fontSize),bodyFont:parseFloat(getComputedStyle(document.documentElement).fontSize),promptFont:prompt?parseFloat(getComputedStyle(prompt).fontSize):null,height:ar.height,bottom:innerHeight-ar.bottom,gap:pr.top-tr.bottom,actionOverlaps:overlaps,statusOverlaps,scroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
      });
      expect(metrics.font,`${year}P${number} title`).toBeCloseTo(viewport.height*.046,1);
      expect(metrics.bodyFont,'shared body scale').toBeCloseTo(Math.max(14,viewport.height*.019),1);
      expect(metrics.height,`${year}P${number} action height`).toBeCloseTo(viewport.height*.08,1);
      expect(Math.abs(metrics.bottom-viewport.height*.025),`${year}P${number} action bottom`).toBeLessThan(1);
      expect(Math.abs(metrics.gap-viewport.height*.01),`${year}P${number} header gap`).toBeLessThan(1);
      expect(metrics.actionOverlaps,`${year}P${number} action overlap`).toBe(false);
      expect(metrics.statusOverlaps,`${year}P${number} online status overlaps Check`).toBe(false);
      expect(metrics.scroll,`${year}P${number} document overflow`).toBe(false);
      // A high-resolution CSS viewport must enlarge live question text too.
      if(metrics.promptFont!==null)expect(metrics.promptFont,`${year}P${number} prompt scale`).toBeGreaterThanOrEqual(viewport.height*.019-.1);
      if(year==='U6'&&number===2)expect(metrics.promptFont,'ordinary prompt scale').toBeCloseTo(Math.max(19,viewport.height*.028),1);
      if(viewport.width===2560||viewport.width===1920||viewport.width===1200)
        await page.screenshot({path:testInfo.outputPath(`shared-${year}P${number}-${viewport.width}x${viewport.height}.png`)});
      });
    }
  });
}

for(const viewport of [{width:1200,height:800},{width:960,height:640}]) {
test(`teacher solved question hides routine footer clutter without moving Check at ${viewport.width}x${viewport.height}`,async({page},testInfo)=>{
  test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.goto('/?theory&year=U6&question=8');
    await page.locator('.question-brief').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const pane=await page.locator('.question-brief').boundingBox();
    const checkBefore=await page.locator('.check-button').boundingBox();
    await page.getByRole('textbox',{name:'SN1 (%)',exact:true}).fill('60.3');
    await page.getByRole('textbox',{name:'SN2 (%)',exact:true}).fill('39.7');
    await page.getByRole('button',{name:'Check answers'}).click();
    await expect(page.locator('.completion-stamp')).toBeVisible();
    await expect(page.locator('.question-actions [role="status"],.cloud-status,.event-status,.teacher-mode-position')).toHaveCount(0);
    await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 00');
    expect(await page.locator('.check-button').boundingBox()).toEqual(checkBefore);
    expect(await page.locator('.question-brief').boundingBox()).toEqual(pane);
    await page.waitForTimeout(500); // Capture settled decorative score digits.
    await page.screenshot({path:testInfo.outputPath(`state-U6P8-solved-${viewport.width}x${viewport.height}.png`)});
});
}
