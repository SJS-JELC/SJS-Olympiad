import { test, expect } from '@playwright/test';

const route = '/?theory&year=U5&question=5';
const navigate = async (page: import('@playwright/test').Page, query: string) => page.evaluate(query => { history.pushState(null,'',query); window.dispatchEvent(new PopStateEvent('popstate')); }, query);
const sampleNames = { mystery:'Mystery sample', citrus:'Citrus scent', floral:'Floral scent' } as const;
async function runSample(page: import('@playwright/test').Page, sample: keyof typeof sampleNames) {
  await page.locator('.gc-sample--'+sample).getByRole('button',{name:'Add to injector',exact:true}).click();
  await expect(page.locator('.gc-machine p')).toContainText(sampleNames[sample]);
  await page.getByRole('button',{name:'Run',exact:true}).click();
  await expect(page.getByRole('progressbar',{name:'Analysis progress'})).toBeVisible();
}
const printout=(page:import('@playwright/test').Page,sample:keyof typeof sampleNames)=>page.locator('.gc-printout').filter({hasText:sampleNames[sample]});
async function expectFullComposition(page: import('@playwright/test').Page) {
  const percentages=await page.locator('.gc-mixture-labels strong').allTextContents();
  expect(percentages).toHaveLength(4);
  expect(percentages.reduce((sum,value)=>sum+Number.parseFloat(value),0)).toBe(100);
}

test('GC laboratory completes runs through navigation and uses ordinary non-restarting cooldown', async ({ page }) => {
  await page.clock.install(); await page.goto(route);
  await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
  await runSample(page,'mystery');
  await page.getByRole('button',{name:'Back to theory'}).click();
  await page.clock.fastForward(7000);
  await page.getByRole('button',{name:'Problem 5, 2 points, not yet solved',exact:true}).click();
  await expect(page.getByTestId('u5p5-content')).toBeVisible();
  await expect(printout(page,'mystery')).toHaveCount(1);
  await runSample(page,'citrus');
  await page.clock.fastForward(6000);
  await page.getByRole('button',{name:'Check answers'}).click();
  await expect(page.locator('.incorrect-feedback')).toBeVisible();
  await expect(page.getByRole('slider',{name:'Citrus / Floral boundary'})).toBeDisabled();
  await runSample(page,'floral');
  await page.clock.fastForward(6000);
  await page.locator('.check-button').click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label','Retry in 14 seconds');
  await page.clock.fastForward(14000);
  await expect(page.getByRole('slider',{name:'Citrus / Floral boundary'})).toBeEnabled();
  // Native sliders work by keyboard; ordered dividers preserve nonnegative fractions.
  const divider=page.getByRole('slider',{name:'Citrus / Floral boundary'});
  await divider.focus(); await page.keyboard.press('Home');
  await expect(divider).toHaveAttribute('aria-valuenow','0');
  await page.keyboard.press('End');
  await expect(divider).toHaveAttribute('aria-valuenow','50');
  await expectFullComposition(page);
});

test('U5 formulation awards exactly once, stays isolated from L6 and security removes the lab synchronously', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?settings');
  await page.locator('#theory-year').selectOption('U5');
  await page.getByRole('button',{name:'Enter Competition Mode',exact:true}).click();
  await page.getByRole('link',{name:'Back to landing'}).click();
  await page.getByRole('button',{name:'Theoretical challenge',exact:true}).click();
  await page.getByRole('button',{name:'Problem 5, 2 points, not yet solved',exact:true}).click();
  await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
  await runSample(page,'mystery');
  const removed=await page.evaluate(()=>{ window.dispatchEvent(new Event('blur')); return !document.querySelector('[data-testid="u5p5-content"]'); });
  expect(removed).toBe(true);
  await page.clock.fastForward(7000);
  await page.locator('input[type="password"]').fill('1234');
  await page.getByRole('button',{name:/unlock/i}).click();
  await expect(page.getByTestId('u5p5-content')).toBeVisible();
  await expect(printout(page,'mystery')).toHaveCount(1);
  // Set the exact half-percent recipe through ordinary accessible controls.
  for(const [name,tenSteps,singleSteps] of [['Citrus / Floral boundary',2,5],['Floral / Woody boundary',1,4],['Woody / Ethanol boundary',0,9]] as const) {
    await page.getByRole('slider',{name,exact:true}).focus(); await page.keyboard.press('Home');
    for(let i=0;i<tenSteps;i++) await page.keyboard.press('Shift+ArrowRight');
    for(let i=0;i<singleSteps;i++) await page.keyboard.press('ArrowRight');
  }
  await page.getByRole('button',{name:'Check answers'}).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 02');
  await page.getByRole('button',{name:'Check answers'}).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 02');
  await expect(page.getByRole('slider',{name:'Citrus / Floral boundary'})).toBeDisabled();
  await navigate(page,'?theory&year=L6');
  await expect(page.locator('.theory-score output')).toHaveAttribute('aria-label','Score: 00');
  await navigate(page,'?theory&year=U5');
  await expect(page.getByRole('button',{name:'Problem 5, 2 points, correct',exact:true})).toBeVisible();
});


test('paired run reports retain replaceable integration intervals and touch dividers stay ordered', async ({ page, context }) => {
  await page.clock.install(); await page.goto(route);
  await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
  for(const sample of ['mystery','citrus'] as const) {
    await runSample(page,sample);
    await page.clock.fastForward(6100);
    await expect(printout(page,sample)).toBeVisible();
  }
  // The current existing UI stores intervals per report; the former notebook UI is absent.
  const areas: number[]=[];
  for(const sample of ['citrus','mystery'] as const) {
    await printout(page,sample).click();
    await expect(page.locator('.gc-sheet')).toBeVisible();
    await page.getByLabel('End / min',{exact:true}).fill('3.49');
    await page.getByLabel('Start / min',{exact:true}).fill('3.31');
    areas.push(Number(await page.locator('.gc-sheet figcaption strong').innerText()));
    await page.getByRole('button',{name:'Close',exact:true}).click();
  }
  expect(areas[0]).toBeCloseTo(400,0);
  expect(areas[1]).toBeCloseTo(50,1);
  await printout(page,'citrus').click();
  await expect(page.getByLabel('Start / min',{exact:true})).toHaveValue('3.31');
  await expect(page.getByLabel('End / min',{exact:true})).toHaveValue('3.49');
  await page.getByLabel('Start / min',{exact:true}).fill('3.2');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Back to theory',exact:true}).click();
  await page.getByRole('button',{name:'Problem 5, 2 points, not yet solved',exact:true}).click();
  await printout(page,'citrus').click();
  await expect(page.getByLabel('Start / min',{exact:true})).toHaveValue('3.2');
  await expect(page.getByLabel('End / min',{exact:true})).toHaveValue('3.49');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const cdp=await context.newCDPSession(page);
  const divider=page.getByRole('slider',{name:'Floral / Woody boundary',exact:true});
  const box=(await divider.boundingBox())!;
  const bar=(await page.locator('.gc-mixture-bar').boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bar.x-50,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(divider).toHaveAttribute('aria-valuenow','25');
  await expectFullComposition(page);
});
