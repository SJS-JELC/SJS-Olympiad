import { test, expect, type Page } from '@playwright/test';
import { mockFullscreen, interrupt } from './fullscreen';

const route = '/?theory&year=U5&question=3';
const canvas = (page: Page) => page.locator('.molecule-workspace');
const atoms = (page: Page) => canvas(page).locator('[data-atom]');
const depiction = (page: Page) => canvas(page).locator('.molecule-structure').evaluate(node => ({
  atoms: [...node.querySelectorAll('.atom-node')].map(atom => ({
    element: atom.querySelector('.atom-label')?.textContent,
    x: atom.querySelector('.atom-hit')?.getAttribute('cx'),
    y: atom.querySelector('.atom-hit')?.getAttribute('cy'),
  })),
  bonds: [...node.querySelectorAll('.bond-hit')].map(bond =>
    ['x1','y1','x2','y2'].map(attribute => bond.getAttribute(attribute))),
  bondLines: node.querySelectorAll('.bond-line').length,
}));
async function atomPoint(page: Page, id: number) {
  return canvas(page).locator(`[data-atom="${id}"] .atom-hit`).evaluate(node => {
    const circle = node as SVGCircleElement;
    const p = new DOMPoint(circle.cx.baseVal.value, circle.cy.baseVal.value).matrixTransform(circle.getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
}
async function drag(page: Page, start: { x: number; y: number }, end: { x: number; y: number }) {
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 }); await page.mouse.up();
}
async function choose(page: Page, element: string) { await page.locator(`.molecule-editor [data-element="${element}"]`).click(); }
async function addSubstituent(page: Page, id: number, element: string, direction: number) {
  await choose(page, element); const point = await atomPoint(page, id);
  await drag(page, point, { x: point.x, y: point.y + direction * 58 });
}
/** Actual pointer drawing, reading only SVG atom geometry. No answer/state injection. */
async function solveByDrawing(page: Page) {
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  const box = (await canvas(page).boundingBox())!;
  const substitutions = [
    [{ side: 1, element: 'F', direction: -1 }],
    [{ side: 0, element: 'Cl', direction: -1 }, { side: 1, element: 'F', direction: -1 }, { side: 1, element: 'F', direction: 1 }],
    [{ side: 1, element: 'F', direction: -1 }, { side: 1, element: 'Cl', direction: 1 }],
    [{ side: 0, element: 'F', direction: -1 }, { side: 1, element: 'Cl', direction: -1 }, { side: 1, element: 'Cl', direction: 1 }],
  ];
  for (let index = 0; index < substitutions.length; index++) {
    await choose(page, 'C');
    const before = new Set(await atoms(page).evaluateAll(nodes => nodes.map(node => node.getAttribute('data-atom'))));
    const start = { x: box.x + box.width * (index + .32) / 4, y: box.y + box.height / 2 };
    await drag(page, start, { x: start.x + 58, y: start.y });
    const pair = await atoms(page).evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-atom'))));
    const ids = pair.filter(id => !before.has(String(id)));
    expect(ids).toHaveLength(2);
    const bond = canvas(page).locator(`[data-bond="${ids[0]}:${ids[1]}"]`);
    await bond.focus(); await bond.press('Enter');
    await expect(bond).toHaveAttribute('aria-label', /^Double bond/);
    for (const sub of substitutions[index]) await addSubstituent(page, ids[sub.side], sub.element, sub.direction);
  }
}

test('free canvas supports keyboard atoms, bond edits, undo, erase and navigation', async ({ page }) => {
  await page.goto(route); await expect(canvas(page)).toBeVisible();
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.locator('.u5p3-monomer')).toHaveCount(0);
  await expect(page.locator('.view-switch')).toHaveCount(0);
  await expect(page.locator('[data-element="O"], [data-element="N"]')).toHaveCount(0);
  await canvas(page).focus(); await canvas(page).press('Enter');
  await expect(atoms(page)).toHaveCount(1);
  const first = atoms(page).first(); await first.focus(); await first.press('ArrowRight'); await first.press('Enter');
  await expect(atoms(page)).toHaveCount(2);
  const bond = canvas(page).locator('[data-bond]').first(); await bond.focus(); await bond.press('Enter');
  await expect(bond).toHaveAttribute('aria-label', /^Double bond/);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(bond).toHaveAttribute('aria-label', /^Single bond/);
  await atoms(page).last().focus(); await page.keyboard.press('Delete');
  await expect(atoms(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
  await page.getByRole('button', { name: 'Problem 3, 1 point, not yet solved', exact: true }).click();
  await expect(atoms(page)).toHaveCount(1);
});

test('draws all monomers end-to-end, shared cooldown and once-only score', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.clock.install(); await page.goto(route); await page.evaluate(() => document.fonts.ready);
  const pane = await page.locator('.question-brief').boundingBox();
  await page.getByRole('button', { name: 'Check answers', exact: true }).click();
  await expect(page.locator('.incorrect-feedback')).toBeVisible();
  await expect(page.locator('[data-element="C"]')).toBeDisabled();
  await page.clock.fastForward(3000); await page.locator('.check-button').click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label', 'Retry in 17 seconds');
  await page.clock.fastForward(2600); await expect(page.locator('.incorrect-feedback')).toHaveCount(0);
  expect(await page.locator('.question-brief').boundingBox()).toEqual(pane);
  await page.clock.fastForward(14500); await expect(page.locator('[data-element="C"]')).toBeEnabled();
  await solveByDrawing(page);
  await page.screenshot({ path: testInfo.outputPath('u5p3-actual-drawing.png') });
  await page.getByRole('button', { name: 'Check answers', exact: true }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 01');
  await expect(page.locator('[data-element="C"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Check answers', exact: true }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 01');
  await page.clock.fastForward(1000);
  await page.screenshot({ path: testInfo.outputPath('u5p3-solved.png') });
  await page.getByRole('button', { name: 'Back to theory', exact: true }).click();
  await page.getByRole('button', { name: 'Problem 3, 1 point, correct', exact: true }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 01');
  await expect(canvas(page).locator('.atom-node:not(.implicit-hydrogen)')).toHaveCount(17);
});

for (const reason of ['blur', 'hidden', 'fullscreen'] as const) test(`drawing unmounts synchronously on ${reason} and survives staff unlock`, async ({ page }) => {
  await mockFullscreen(page); await page.goto('/?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Open problem testing', exact: true }).click();
  await page.getByRole('button', { name: 'U5 Problem 3: Chainspotting', exact: true }).click();
  await canvas(page).focus(); await canvas(page).press('Enter');
  await interrupt(page, reason);
  await expect(page.getByTestId('u5p3-content')).toHaveCount(0);
  if (reason === 'hidden') await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await expect(atoms(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Back to problem testing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Problem testing', exact: true })).toBeVisible();
});

test('displayed polymer and drawing canvas fit landscape and zoomed viewports', async ({ page }, testInfo) => {
  for (const [width, height] of [[1200, 800], [1440, 810], [960, 640]]) {
    await page.setViewportSize({ width, height }); await page.goto(route); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.u5p3-polymer svg')).toBeVisible();
    await expect(page.locator('.u5p3-polymer img')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const area = (await canvas(page).boundingBox())!, check = (await page.locator('.check-button').boundingBox())!;
    expect(area.height).toBeGreaterThan(height * .18);
    expect(area.y + area.height).toBeLessThanOrEqual(check.y);
    expect(check.y + check.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: testInfo.outputPath(`u5p3-canvas-${width}x${height}.png`) });
  }
});

test('cooldown deadline and drawing persist through navigation and staff unlock', async ({ page }) => {
  await page.clock.install(); await mockFullscreen(page); await page.goto('/?settings');
  await page.getByRole('button', { name: 'Enter Competition Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Open problem testing', exact: true }).click();
  await page.getByRole('button', { name: 'U5 Problem 3: Chainspotting', exact: true }).click();
  await canvas(page).focus(); await canvas(page).press('Enter');
  await atoms(page).first().focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  const drawn=await depiction(page);
  await page.getByRole('button', { name: 'Check answers', exact: true }).click();
  await expect(canvas(page).locator('.atom-node')).toHaveCount(2);
  expect(await depiction(page)).toEqual(drawn);
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
  await page.clock.fastForward(3000);
  await page.getByRole('button', { name: 'Back to problem testing', exact: true }).click();
  await page.getByRole('button', { name: 'U5 Problem 3: Chainspotting', exact: true }).click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label', 'Retry in 17 seconds');
  await interrupt(page, 'blur'); await page.clock.fastForward(2000);
  await page.getByLabel('Staff PIN', { exact: true }).fill('1234');
  await page.getByRole('button', { name: 'Staff unlock', exact: true }).click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label', 'Retry in 15 seconds');
  await expect(canvas(page).locator('.atom-node')).toHaveCount(2);
  await page.clock.fastForward(15000); await expect(atoms(page)).toHaveCount(2);
  await expect(page.locator('[data-element="C"]')).toBeEnabled();
  expect(await depiction(page)).toEqual(drawn);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(atoms(page)).toHaveCount(1);
});

for (const input of ['mouse','keyboard','touch'] as const) test(`explicit hydrogen replacement works through ${input}`,async({browser})=>{
  const context=await browser.newContext({hasTouch:input==='touch',viewport:{width:1200,height:800}});
  const page=await context.newPage();await page.goto(route);
  await canvas(page).focus();await canvas(page).press('Enter');
  await choose(page,'H');
  await atoms(page).first().focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await expect(atoms(page)).toHaveCount(2);
  await expect(canvas(page).locator('.implicit-hydrogen')).toHaveCount(0);
  for (const [element,name] of [['F','Fluorine'],['Cl','Chlorine'],['C','Carbon']]) {
    if(input==='touch') await page.locator(`[data-element="${element}"]`).tap();
    else await choose(page,element);
    const hydrogen=canvas(page).locator('[data-atom="2"]');
    if(input==='keyboard') {await hydrogen.focus();await hydrogen.press('Enter');}
    else {const p=await atomPoint(page,2);if(input==='touch')await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
    await expect(hydrogen).toHaveAttribute('aria-label',new RegExp(`^${name} atom 2`));
    await expect(atoms(page)).toHaveCount(2);
    await expect(canvas(page).locator('[data-bond]')).toHaveCount(1);
    if(input==='touch')await page.getByRole('button',{name:'Undo',exact:true}).tap();
    else await page.getByRole('button',{name:'Undo',exact:true}).click();
    await expect(hydrogen).toHaveAttribute('aria-label',/^Hydrogen atom 2/);
  }
  await context.close();
});

test('cleanup retains an explicit halogenated alkene and fits landscape and zoom',async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:810});await page.goto(route);
  await canvas(page).focus();await canvas(page).press('Enter');
  await atoms(page).first().focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  const bond=canvas(page).locator('[data-bond="1:2"]');await bond.focus();await bond.press('Enter');
  for (const [id,direction] of [[1,-1],[1,1],[2,-1],[2,1]]) await addSubstituent(page,id,'H',direction);
  await choose(page,'Cl');let p=await atomPoint(page,3);await page.mouse.click(p.x,p.y);
  await choose(page,'F');p=await atomPoint(page,5);await page.mouse.click(p.x,p.y);
  const before=await canvas(page).locator('.molecule-structure').innerHTML();
  await page.getByRole('button',{name:'Clean up',exact:true}).click();
  await expect(atoms(page)).toHaveCount(6);await expect(canvas(page).locator('[data-bond]')).toHaveCount(5);
  const cleaned=await canvas(page).locator('.molecule-structure').innerHTML();
  expect(cleaned).not.toBe(before);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  expect(await canvas(page).locator('.molecule-structure').innerHTML()).toBe(before);
  await page.getByRole('button',{name:'Clean up',exact:true}).click();
  await page.getByRole('button',{name:'Fit molecule',exact:true}).click();
  for (const [width,height] of [[1200,800],[1440,810],[960,640]]) {
    await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
    await page.getByRole('button',{name:'Fit molecule',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`explicit-clean-alkene-${width}x${height}.png`)});
  }
});

test('touch pointer drawing creates bonds and supports undo', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1200, height: 800 } });
  const page = await context.newPage(); await page.goto(route); await expect(canvas(page)).toBeVisible();
  const box = (await canvas(page).boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 150, y: box.y + box.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 220, y: box.y + box.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(atoms(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).tap(); await expect(atoms(page)).toHaveCount(0);
  await context.close();
});
