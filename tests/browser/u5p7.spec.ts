import { test, expect, openCompetitorQuestion, resumeCompetition } from './fixtures';
import { interrupt } from './fullscreen';
import { moleculeDrawing, solutions } from '../fixtures/u5p7';

const route = '/?theory&year=U5&question=7';
const competitor = test.extend({ accessRole: 'competitor' as const });

test('Cut and Shut uses the shared C/H/O canvas and restores drawing/undo', async ({ page }) => {
  await page.goto(route);
  await expect(page.getByRole('heading', { name: /CUT AND SHUT/i })).toBeVisible();
  const canvas = page.locator('.molecule-workspace');
  await expect(canvas).toHaveCount(1);
  await expect(page.locator('[data-element]')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Oxygen', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New structure', exact: true })).toHaveCount(0);
  await expect(page.getByText(/Ignore differences involving/)).toHaveCount(0);
  await canvas.focus(); await canvas.press('Enter');
  await canvas.locator('[data-atom]').first().focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-atom]')).toHaveCount(2);
  const bond = canvas.locator('[data-bond]').first(); await bond.focus(); await bond.press('Enter');
  await expect(bond).toHaveAttribute('aria-label', /^Double bond/);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(bond).toHaveAttribute('aria-label', /^Single bond/);
  await page.getByRole('button', { name: 'Oxygen', exact: true }).click();
  await canvas.locator('[data-atom]').last().focus(); await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-atom]').last()).toHaveAttribute('aria-label', /^Oxygen atom/);
  await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
  await page.getByRole('button', { name: 'Problem 7, 2 points, not yet solved', exact: true }).click();
  await expect(canvas.locator('[data-atom]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(canvas.locator('[data-atom]').last()).toHaveAttribute('aria-label', /^Carbon atom/);
  await page.goto('/?theory&year=U5&question=8');
  await expect(page.getByRole('heading', { name: /BOUNDARIES/i })).toBeVisible();
});

test('RDKit product artwork and shared canvas fit supported landscape viewports', async ({ page }, testInfo) => {
  for (const [width, height] of [[1200,800], [1440,810], [960,640], [1920,1080], [2560,1440]]) {
    await page.setViewportSize({ width, height }); await page.goto(route);
    await expect(page.locator('.molecule-workspace')).toBeVisible(); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.cut-products [data-label-kind="atom"]')).toHaveCount(30);
    const canvas = (await page.locator('.molecule-workspace').boundingBox())!, check = (await page.locator('.check-button').boundingBox())!;
    const pane=(await page.locator('.cut-question > .question-brief').boundingBox())!;
    const task=(await page.getByText('Draw all possible structures of X.',{exact:true}).boundingBox())!;
    expect(task.y).toBeGreaterThanOrEqual(pane.y);
    expect(task.y+task.height).toBeLessThanOrEqual(pane.y+pane.height);
    expect(canvas.height).toBeGreaterThan(height*.16);
    expect(canvas.y+canvas.height).toBeLessThanOrEqual(check.y);
    expect(check.y+check.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`u5p7-rdkit-${width}x${height}.png`) });
    const questionPane=page.locator('.cut-question > .question-brief');
    const productExtent=await questionPane.evaluate(node=>{
      const product=node.querySelector('.cut-products')!.getBoundingClientRect(), area=node.getBoundingClientRect();
      return {top:product.top-area.top+node.scrollTop,bottom:product.bottom-area.top+node.scrollTop,scrollHeight:node.scrollHeight};
    });
    expect(productExtent.top).toBeGreaterThanOrEqual(0);
    expect(productExtent.bottom).toBeLessThanOrEqual(productExtent.scrollHeight+1);
    // Only the question pane scrolls: the whole product illustration must be
    // reachable while the shared canvas and Check stay in their layout positions.
    await questionPane.evaluate(node=>{node.scrollTop=node.scrollHeight;});
    const product=(await page.locator('.cut-products').boundingBox())!;
    expect(product.y).toBeGreaterThanOrEqual(pane.y);
    expect(product.y+product.height).toBeLessThanOrEqual(pane.y+pane.height);
    expect(await page.locator('.molecule-workspace').boundingBox()).toEqual(canvas);
    expect(await page.locator('.check-button').boundingBox()).toEqual(check);
    await page.screenshot({path:testInfo.outputPath(`u5p7-full-products-${width}x${height}.png`)});
    await questionPane.evaluate(node=>{node.scrollTop=0;});
    const restoredTask=(await page.getByText('Draw all possible structures of X.',{exact:true}).boundingBox())!;
    expect(restoredTask.y).toBeGreaterThanOrEqual(pane.y);
    expect(restoredTask.y+restoredTask.height).toBeLessThanOrEqual(pane.y+pane.height);
  }
});

test('legacy slots restore all three candidates without a migration write; oversized drafts remain intact', async ({ page, api }) => {
  const original = JSON.stringify({ graphs: Array.from({length:5},()=>structuredClone(solutions[0])), selected:4 });
  const saved = await api.service.draft(api.token, { eventId:'fixture-U5', questionId:'U5P7', requestId:'legacy-p7-draft', expectedRevision:0, answers:{drawings:original} });
  await page.goto(route);
  await expect(page.getByText(/exceed the canvas limit/)).toBeVisible();
  await expect(page.locator('.cut-legacy-grid svg')).toHaveCount(5);
  await expect(page.locator('.molecule-workspace')).toHaveCount(0);
  expect(api.requests.filter(request=>request.action==='draft')).toHaveLength(0);
  const retained=await api.service.question(api.token,{eventId:'fixture-U5',questionId:'U5P7'});
  expect(retained.attempt.answers.drawings).toBe(original);
  await api.service.draft(api.token,{eventId:'fixture-U5',questionId:'U5P7',requestId:'legacy-p7-three',expectedRevision:retained.revision,answers:{drawings:JSON.stringify({graphs:solutions,selected:2})}});
  await page.reload();
  await expect(page.locator('.molecule-workspace [data-atom]')).toHaveCount(30);
  expect(saved.attempt.answers.drawings).toBe(original);
});

test('all 78 explicit atoms clean without insertion and submit through the private marker', async ({ page, api }, testInfo) => {
  await api.service.draft(api.token,{eventId:'fixture-U5',questionId:'U5P7',requestId:'explicit-p7-78',expectedRevision:0,answers:{drawings:JSON.stringify(moleculeDrawing(true))}});
  await page.goto(route); await expect(page.locator('.molecule-workspace [data-atom]')).toHaveCount(78);
  await page.getByRole('button',{name:'Clean up',exact:true}).click();
  await expect(page.locator('.molecule-workspace [data-atom]')).toHaveCount(78);
  await page.screenshot({path:testInfo.outputPath('u5p7-three-explicit-candidates.png')});
  await page.getByRole('button',{name:'Check answers',exact:true}).click();
  await expect(page.locator('.completion-stamp')).toBeVisible();
  await expect(page.locator('[data-element="C"]')).toBeDisabled();
  const submitted=api.requests.filter(request=>request.action==='submit').at(-1)!;
  expect(JSON.parse(submitted.body.answers.drawings).history).toEqual([]);
});

competitor('drawing and cooldown survive navigation and a competition lock', async ({ page, api }) => {
  await page.clock.install(); await openCompetitorQuestion(page,api,'U5',7);
  const canvas=page.locator('.molecule-workspace'); await canvas.focus(); await canvas.press('Enter');
  await page.getByRole('button',{name:'Check answers',exact:true}).click();
  await expect(page.locator('[data-element="C"]')).toBeDisabled();
  await page.clock.fastForward(3000);
  await page.getByRole('button',{name:'Back to theory',exact:true}).click();
  await page.getByRole('button',{name:'Problem 7, 2 points, not yet solved',exact:true}).click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label','Retry in 17 seconds');
  await interrupt(page,'blur'); await expect(page.getByTestId('u5p7-content')).toHaveCount(0);
  await page.clock.fastForward(2000); await resumeCompetition(page);
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label','Retry in 15 seconds');
  await expect(canvas.locator('.atom-node')).toHaveCount(1);
  await page.clock.fastForward(15000); await expect(canvas.locator('[data-atom]')).toHaveCount(1);
  await expect(page.locator('[data-element="C"]')).toBeEnabled();
});
