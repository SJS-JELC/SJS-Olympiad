import {test,expect} from './fixtures';
test('compact lab loads a captured dilution and opens its report',async({page})=>{
 await page.clock.install(); await page.goto('/?theory&year=U5&question=5');
 await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
 await expect(page.getByText('Select a sample above to add it to the injector.')).toBeVisible();
 await expect(page.locator('.gc-sample').first()).toContainText('Mystery sample');
 await expect(page.locator('.gc-mixture-adjustments')).toHaveCount(0);
 await page.getByRole('slider',{name:'citrus concentration'}).fill('20');
 await page.getByRole('button',{name:'Add Citrus scent to injector'}).first().click();
 await page.getByRole('slider',{name:'citrus concentration'}).fill('50');
 await page.getByRole('button',{name:'Run',exact:true}).click();
 await expect(page.getByRole('button',{name:'Running',exact:true})).toBeDisabled();
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
 await expect(page.locator('.gc-sheet')).toContainText('AREA UNDER PEAK');
 await expect(page.locator('.gc-sheet .gc-area-readout')).toHaveText(/^AREA UNDER PEAK\d+\.\d$/);
 await expect(page.locator('.gc-sheet .gc-area-readout')).not.toContainText('a.u.');
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible();
 await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(paper).toBeFocused();
 await page.keyboard.press('Enter'); await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await expect(paper).toBeFocused();
 await page.getByRole('button',{name:'Enlarge run 1',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Delete run 1',exact:true}).click();
 await expect(paper).toHaveCount(0);
 await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const viewport of [{width:960,height:600},{width:1200,height:800},{width:1440,height:810},{width:1920,height:1080},{width:2560,height:1440}]) {
 test(`GC briefing and equal sample cards fit at ${viewport.width}`,async({page},testInfo)=>{
  await page.setViewportSize(viewport); await page.clock.install(); await page.goto('/?theory&year=U5&question=5');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.getByText('Every run injects the same volume.',{exact:false})).toHaveCount(0);
  const enter=page.getByRole('button',{name:'Enter Laboratory',exact:true});
  await expect(enter).toHaveClass(/illustrated-action-button--lilac/);
  await expect(enter.locator('text').last()).toHaveText('>');
  await expect(page.locator('.gc-pane')).toHaveClass(/gc-pane--intro/);
  const intro=await page.locator('.gc-pane').evaluate(element=>({fits:element.scrollHeight<=element.clientHeight+1,height:element.getBoundingClientRect().height}));
  expect(intro.fits).toBe(true);expect(intro.height).toBeLessThan(viewport.height*.65);
  await page.screenshot({path:testInfo.outputPath(`gc-intro-${viewport.width}.png`)});
  await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
  for(const sample of ['citrus','floral','woody']) await page.getByRole('slider',{name:sample+' concentration',exact:true}).fill('50.5');
  const headingFit=await page.locator('.gc-sample-name').evaluateAll(elements=>elements.map(element=>({fits:element.scrollWidth<=element.clientWidth+1,nowrap:getComputedStyle(element).whiteSpace})));
  expect(headingFit).toHaveLength(4);
  for(const heading of headingFit){expect(heading.fits).toBe(true);expect(heading.nowrap).toBe('nowrap');}
  const fractionFit=await page.locator('.gc-sample small').evaluateAll(elements=>elements.map(element=>({fits:element.scrollWidth<=element.clientWidth+1,nowrap:getComputedStyle(element).whiteSpace,height:element.getBoundingClientRect().height,leading:parseFloat(getComputedStyle(element).lineHeight)})));
  expect(fractionFit).toHaveLength(3);
  for(const fraction of fractionFit){expect(fraction.fits).toBe(true);expect(fraction.nowrap).toBe('nowrap');expect(fraction.height).toBeLessThanOrEqual(fraction.leading+1);}
  const cards=await page.locator('.gc-sample').evaluateAll(elements=>elements.map(element=>element.getBoundingClientRect().height));
  expect(cards).toHaveLength(4);expect(Math.max(...cards)-Math.min(...cards)).toBeLessThan(1);
  expect(Math.min(...cards)).toBeGreaterThan(viewport.height*.08);
  const positions=await page.locator('.gc-sample').evaluateAll(elements=>elements.map(element=>({x:element.getBoundingClientRect().x,y:element.getBoundingClientRect().y,bottom:element.getBoundingClientRect().bottom})));
  expect(new Set(positions.map(position=>position.y))).toHaveProperty('size',1);
  expect(positions[3].x).toBeGreaterThan(positions[0].x);
  const machine=await page.locator('.gc-instrument').boundingBox();
  expect(machine!.y).toBeGreaterThan(positions[0].bottom);
  expect(machine!.width).toBeGreaterThan(viewport.width*.5);
  await expect(page.locator('.gc-load-button').first()).toHaveText('+');
  const bounds=await page.locator('.gc-pane').evaluate(element=>({fits:element.scrollHeight<=element.clientHeight+1,bottom:element.getBoundingClientRect().bottom}));
  expect(bounds.fits).toBe(true);expect(bounds.bottom).toBeLessThan(viewport.height);
  await page.screenshot({path:testInfo.outputPath(`gc-lab-${viewport.width}.png`)});
  await page.getByRole('button',{name:'Add Mystery sample to injector'}).click();
  await expect(page.getByRole('button',{name:'Run',exact:true})).toHaveClass(/illustrated-action-button--lilac/);
  await expect(page.getByRole('button',{name:'Run',exact:true}).locator('text').last()).toHaveText('>');
  await page.getByRole('button',{name:'Run',exact:true}).click();
  await expect(page.getByRole('button',{name:'Running',exact:true})).toBeDisabled();
  await page.clock.fastForward(7000);
  await expect(page.locator('.gc-printout')).toBeVisible();
  expect(await page.locator('.gc-printout-title').evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  expect(await page.locator('.gc-printout-tools svg').first().evaluate(element=>getComputedStyle(element).strokeWidth)).toBe('1px');
  const toolStyle=async()=>page.locator('.gc-printout-tools button').evaluateAll(elements=>elements.map(element=>{const style=getComputedStyle(element);return {fill:style.backgroundColor,color:style.color,border:style.borderTopWidth,borderColor:style.borderTopColor};}));
  const expectedToolStyles=Array.from({length:2},()=>({fill:'rgba(0, 0, 0, 0)',color:'rgb(51, 51, 51)',border:'1px',borderColor:'rgb(51, 51, 51)'}));
  expect(await toolStyle()).toEqual(expectedToolStyles);
  const zoom=page.getByRole('button',{name:'Enlarge run 1',exact:true});
  await zoom.hover(); expect(await toolStyle()).toEqual(expectedToolStyles);
  await page.mouse.down(); expect(await toolStyle()).toEqual(expectedToolStyles);
  await page.mouse.move(0,0); await page.mouse.up();
  await zoom.evaluate((element:HTMLButtonElement)=>{element.disabled=true;}); expect(await toolStyle()).toEqual(expectedToolStyles);
  await zoom.evaluate((element:HTMLButtonElement)=>{element.disabled=false;});
  await page.screenshot({path:testInfo.outputPath(`gc-preview-${viewport.width}.png`)});
  await page.locator('.gc-printout').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('.gc-sheet').evaluate(element=>getComputedStyle(element).borderTopWidth)).toBe('1px');
  await expect(page.locator('.gc-area-readout strong')).toHaveText(/^\d+\.\d$/);
  const header=await page.locator('.gc-report-header h2').boundingBox(),area=await page.locator('.gc-area-readout').boundingBox();
  expect(area!.x).toBeGreaterThan(header!.x+header!.width);
  expect((await page.locator('.gc-sheet').boundingBox())!.height).toBeLessThan(viewport.height*.85);
  expect(await page.locator('.gc-area-readout strong').evaluate(element=>getComputedStyle(element).fontWeight)).toBe('700');
  const close=page.getByRole('button',{name:'Close',exact:true});
  const reportHeadingStyle=await page.locator('.gc-report-header h2').evaluate(element=>({size:getComputedStyle(element).fontSize,weight:getComputedStyle(element).fontWeight}));
  const expectCloseStyle=async()=>expect(await close.evaluate(element=>{const style=getComputedStyle(element);return {size:style.fontSize,weight:style.fontWeight,fill:style.backgroundColor,border:style.borderTopWidth,borderColor:style.borderTopColor};})).toEqual({...reportHeadingStyle,fill:'rgba(0, 0, 0, 0)',border:'1px',borderColor:'rgb(51, 51, 51)'});
  await expectCloseStyle();
  await close.hover(); await expectCloseStyle();
  await page.mouse.down(); await expectCloseStyle();
  await page.mouse.move(0,0); await page.mouse.up();
  await close.evaluate((element:HTMLButtonElement)=>{element.disabled=true;}); await expectCloseStyle();
  await close.evaluate((element:HTMLButtonElement)=>{element.disabled=false;});
  await page.screenshot({path:testInfo.outputPath(`gc-report-${viewport.width}.png`)});
 });
}

for (const viewport of [{width:1200,height:800},{width:1440,height:810}]) {
 test(`delete bins remove specific piled reports at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport); await page.clock.install();
  await page.goto('/?theory&year=U5&question=5');
  await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
  for(let id=1;id<=4;id++){
   await page.getByRole('button',{name:'Add Mystery sample to injector'}).click();
   await page.getByRole('button',{name:'Run',exact:true}).click();
   await expect(page.getByRole('button',{name:'Running',exact:true})).toBeDisabled();
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
