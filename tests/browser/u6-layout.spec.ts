import { test, expect, openCompetitorQuestion, type Page } from './fixtures';
const competitor=test.extend({accessRole:'competitor' as const});

async function selectedWindow(page: Page) {
  return page.locator('.u6p1-nmr-selection').evaluate(rect => ({
    x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')),
    width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height')),
  }));
}

test('NMR magnifies X only and clamps direct overview pointer and keyboard selection', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/?theory&year=U6&question=1');
  const answer = page.getByRole('textbox', { name: 'Molecule name' });
  await expect(answer).toBeFocused();
  await answer.fill('retained');
  const images = await page.locator('.u6p1-nmr image').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  expect(images).toHaveLength(2);
  expect(images[0]).toBe(images[1]);
  expect(images[0]).toContain('nmr.svg');
  const overview = page.getByRole('slider', { name: /^NMR detail region/ });
  await expect(page.locator('.u6p1-nmr input, .u6p1-nmr figcaption')).toHaveCount(0);
  const bounds = await overview.boundingBox();
  if (!bounds) throw Error('No overview bounds');
  await page.mouse.move(bounds.x + 1, bounds.y + 1);
  let selection = await selectedWindow(page);
  expect(selection.x).toBe(0); expect(selection.y).toBe(0);
  await page.mouse.move(bounds.x + bounds.width - 1, bounds.y + bounds.height - 1);
  selection = await selectedWindow(page);
  expect(selection.x + selection.width).toBeCloseTo(321.8);
  expect(selection.y + selection.height).toBeCloseTo(150.97);
  await overview.focus(); await overview.press('Home');
  expect((await selectedWindow(page)).x).toBe(0);
  await overview.press('ArrowRight');
  expect((await selectedWindow(page)).x).toBeCloseTo(.25);
  await overview.press('End');
  expect((await selectedWindow(page)).x).toBeCloseTo(281.8);
  await overview.press('ArrowRight');
  expect((await selectedWindow(page)).x).toBeCloseTo(281.8);
  await overview.press('ArrowUp');
  selection = await selectedWindow(page);
  expect(selection.y).toBe(0);
  expect(selection.height).toBe(150.97);
  const scales = await page.locator('.u6p1-nmr').evaluate(figure => {
    const overviewScale = figure.querySelector<SVGGraphicsElement>('.u6p1-nmr-overview image')!.getScreenCTM()!;
    const detailScale = figure.querySelector<SVGGraphicsElement>('.u6p1-nmr-detail image')!.getScreenCTM()!;
    return { horizontalRatio: detailScale.a / overviewScale.a, overviewY: overviewScale.d, detailY: detailScale.d };
  });
  expect(scales.horizontalRatio).toBeCloseTo(321.8 / 40);
  expect(scales.detailY).toBeCloseTo(scales.overviewY, 5);
  await expect(answer).toHaveValue('retained');
});

test.describe('touch NMR preview',()=>{
test.use({viewport:{width:1200,height:800},hasTouch:true});
test('NMR touch selection pans the original detail without changing an answer', async ({ page }) => {
  await page.goto('/?theory&year=U6&question=1');
  await page.getByRole('textbox', { name: 'Molecule name' }).fill('retained');
  const box = await page.locator('.u6p1-nmr-overview').boundingBox();
  if (!box) throw Error('No overview bounds');
  await page.touchscreen.tap(box.x + box.width * .5, box.y + box.height * .5);
  const selected = await selectedWindow(page);
  expect(selected.x).toBeCloseTo((321.8 - selected.width) / 2, 0);
  expect(selected.y).toBe(0); expect(selected.height).toBe(150.97);
  await expect(page.getByRole('textbox', { name: 'Molecule name' })).toHaveValue('retained');
});
});

competitor('live rate table preserves source values, scientific units and marking', async ({ page, api }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1200, height: 800 });
  await openCompetitorQuestion(page,api,'U6',8);
  const table = page.getByRole('table', { name: 'Initial rate data' });
  await expect(table.getByRole('columnheader')).toHaveText([
    'Experiment', '[CH₃CH₂Br] / mol dm−3', '[OH−] / mol dm−3', 'Rate / mol dm−3 s−1',
  ]);
  const rows = table.locator('tbody tr');
  expect(await rows.evaluateAll(items => items.map(row => [...row.children].map(cell => cell.textContent)))).toEqual([
    ['1', '0.1', '0.3', '3.20 × 10−5'], ['2', '0.2', '0.3', '6.40 × 10−5'], ['3', '0.2', '0.6', '8.94 × 10−5'],
  ]);
  await expect(table.locator('sup')).toHaveCount(8);
  const sn1 = page.getByRole('textbox', { name: 'SN1 (%)', exact: true });
  const sn2 = page.getByRole('textbox', { name: 'SN2 (%)', exact: true });
  await expect(sn1).toBeFocused();
  const pane = page.locator('.question-brief');
  const before = await pane.boundingBox();
  await sn1.fill('50'); await sn2.fill('50');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(sn1).toBeDisabled();
  expect(await pane.boundingBox()).toEqual(before);
  await page.clock.fastForward(10_100);
  await expect(sn1).toBeEnabled();
  await sn1.fill('60.3'); await sn2.fill('39.7');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 03');
  expect(await pane.boundingBox()).toEqual(before);
});

for (const [width, height, scale] of [[1200, 800, 1], [1440, 900, 1], [1440, 810, 1], [1920, 1080, 1], [960, 640, 1.25]]) {
test.describe(`U6 inline geometry ${width}x${height}`,()=>{
  test.use({viewport:{width,height},deviceScaleFactor:scale});
  test('U6 inline rows fit with a white table and common Check baseline', async ({ page }) => {
    test.setTimeout(90_000);
    for (const number of [8, 9]) {
      await page.goto(`/?theory&year=U6&question=${number}`);
      await page.locator('.question-brief').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.locator('.question-content').evaluate(content => {
        const pane = content.querySelector<HTMLElement>('.question-brief')!;
        const check = content.querySelector<HTMLElement>('.check-button')!.getBoundingClientRect();
        const answers = [...content.querySelectorAll<HTMLInputElement>('input, select')].map(input => input.getBoundingClientRect());
        return { scroll: pane.scrollHeight - pane.clientHeight, checkBottom: check.bottom, checkHeight: check.height, answersBottom: answers.map(answer => answer.bottom), overlap: answers.some(answer => answer.right > check.left && answer.bottom > check.top) };
      });
      expect(geometry.checkBottom).toBeCloseTo(height * .975, 0);
      expect(geometry.checkHeight).toBeCloseTo(height * .08, 0);
      expect(geometry.answersBottom.every(bottom => Math.abs(bottom - geometry.checkBottom) < 1)).toBe(true);
      expect(geometry.overlap).toBe(false);
      if (number === 8) {
        expect(geometry.scroll).toBeLessThanOrEqual(1);
        expect(await page.locator('.u6p8-rate-data th, .u6p8-rate-data td').evaluateAll(cells => cells.every(cell => getComputedStyle(cell).backgroundColor === 'rgb(255, 255, 255)'))).toBe(true);
        expect(await page.locator('.u6p8-answer').evaluateAll(labels => labels.every(label => label.firstElementChild!.getBoundingClientRect().right < label.querySelector('input')!.getBoundingClientRect().left))).toBe(true);
      }
    }
  });
});
}

test('U6 charge digits stay on the baseline and propane counts are subscripts', async ({ page }) => {
  await page.goto('/?theory&year=U6&question=6');
  await expect(page.locator('.question-brief sup')).toHaveText(['+', '+', '+']);
  await page.goto('/?theory&year=U6&question=7');
  await expect(page.locator('.question-brief sub')).toHaveText(['3', '8']);
});
