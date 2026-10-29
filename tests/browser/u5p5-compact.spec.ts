import {test,expect} from '@playwright/test';
test('compact lab loads a captured dilution and opens its report',async({page})=>{
 await page.clock.install(); await page.goto('/?theory&year=U5&question=5');
 await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
 await expect(page.getByText('Select a sample from the left to add it to the injector.')).toBeVisible();
 await expect(page.locator('.gc-sample').first()).toContainText('Mystery sample');
 await expect(page.locator('.gc-mixture-adjustments')).toHaveCount(0);
 await page.getByRole('slider',{name:'citrus concentration'}).fill('20');
 await page.getByRole('button',{name:'Add Citrus scent to injector'}).first().click();
 await page.getByRole('slider',{name:'citrus concentration'}).fill('50');
 await page.getByRole('button',{name:'Run',exact:true}).click();
 await page.clock.fastForward(7000);
 await expect(page.locator('.gc-printout')).toContainText('20%');
 const paper=page.locator('.gc-printout');
 const original=(await paper.boundingBox())!;
 await page.mouse.move(original.x+original.width/2,original.y+original.height/2);
 await page.mouse.down();await page.mouse.move(original.x+original.width/2-180,original.y+original.height/2+50,{steps:10});await page.mouse.up();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const movedPaper=(await paper.boundingBox())!;expect(movedPaper.x).toBeLessThan(original.x-100);
 await page.getByRole('button',{name:'Back to theory'}).click();
 await page.getByRole('button',{name:'Problem 5, 2 points, not yet solved',exact:true}).click();
 expect((await paper.boundingBox())!.x).toBeCloseTo(movedPaper.x,0);
 await paper.focus();await page.keyboard.press('ArrowLeft');
 expect((await paper.boundingBox())!.x).toBeLessThan(movedPaper.x);
 await paper.click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Enlarge run 1',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 const graph=page.locator('.gc-sheet .gc-trace');
 const point=async(time:number)=>graph.evaluate((svg,time)=>{const matrix=(svg as SVGSVGElement).getScreenCTM()!;const p=new DOMPoint(58+time/5.4*822,200).matrixTransform(matrix);return {x:p.x,y:p.y};},time);
 const start=await point(1),end=await point(4);
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y);await page.mouse.up();
 await expect(page.getByRole('slider',{name:'Integration start',exact:true})).toHaveAttribute('aria-valuenow',/^0?\.?9|^1/);
 const handle=await point(4),moved=await point(4.5);
 await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(moved.x,moved.y);await page.mouse.up();
 const value=Number(await page.getByRole('slider',{name:'Integration end',exact:true}).getAttribute('aria-valuenow'));expect(value).toBeCloseTo(4.5,1);
 await expect(page.locator('.gc-sheet input')).toHaveCount(0);
 await expect(page.locator('.gc-sheet')).toContainText('Area under peak');
 await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Delete run 1',exact:true}).click();
 await expect(paper).toHaveCount(0);
});

for (const viewport of [{width:1200,height:800},{width:1440,height:810}]) {
 test(`delete bins remove specific piled reports at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport); await page.clock.install();
  await page.goto('/?theory&year=U5&question=5');
  await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
  for(let id=1;id<=4;id++){
   await page.getByRole('button',{name:'Add Mystery sample to injector'}).click();
   await page.getByRole('button',{name:'Run',exact:true}).click();
   await page.clock.fastForward(7500);
  }
  for(const id of [4,2,1,3]){
   const button=page.getByRole('button',{name:`Delete run ${id}`,exact:true});
   await button.locator('svg').click();
   await expect(page.getByRole('group',{name:`Run ${id} printout`,exact:true})).toHaveCount(0);
  }
  await expect(page.locator('.gc-printout')).toHaveCount(0);
 });
}
