import { test, expect } from '@playwright/test';

test('L6P5 preserves attempts through navigation and security lock, then awards once', async ({ page }) => {
 test.setTimeout(45000);
 const errors: string[]=[];page.on('pageerror', e=>errors.push(e.message));

 await page.goto('/?settings');
 await page.getByRole('button',{name:'Enter Competition Mode'}).click();
 await page.getByRole('link',{name:'Back to landing'}).click();
 await page.getByRole('button',{name:'Theoretical Challenge'}).click();
 await page.getByRole('button',{name:'Problem 5, 2 points, not yet solved',exact:true}).click();
 await expect(page.locator('[data-testid="l6p5-content"]')).toBeVisible();

 const values=['300','60','300','60','60','240'];
 for(let i=0;i<6;i++) await page.locator('.angle-input input').nth(i).fill(values[i]);
 await page.getByRole('button',{name:'Check answers'}).click();
 await expect(page.locator('.answer-part--correct')).toHaveCount(0);
 await expect(page.locator('.incorrect-feedback')).toBeVisible();
 await expect(page.getByRole('button',{name:/Retry in/})).toBeEnabled();
 await page.getByRole('button',{name:'Back to theory'}).click();
 await expect(page.locator('.theory-score output')).toHaveAttribute('aria-label', 'Score: 00');
 await page.getByRole('button',{name:'Problem 5, 2 points, not yet solved',exact:true}).click();
 await expect(page.locator('.angle-input input').nth(3)).toHaveValue('60');
 const removed=await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));return document.querySelector('[data-testid="l6p5-content"]')===null;});
 if(!removed) throw Error('Question not synchronously removed');
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.locator('input[type="password"]').fill('1234');
 await page.getByRole('button',{name:/unlock/i}).click();
 await expect(page.locator('[data-testid="l6p5-content"]')).toBeVisible();
 await page.locator('.angle-input input').nth(3).waitFor({state:'visible'});
 await expect(page.locator('.angle-input input').nth(3)).toBeEnabled({timeout:23000});
 await page.locator('.angle-input input').nth(3).fill('120');
 await page.getByRole('button',{name:'Check answers'}).click();
 await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 02');
 await page.getByRole('button',{name:'Back to theory'}).click();
 await expect(page.locator('.theory-score output')).toHaveAttribute('aria-label', 'Score: 02');
 await page.getByRole('button',{name:'Problem 5, 2 points, correct',exact:true}).click();
 await expect(page.getByRole('button',{name:'Check answers'})).toBeEnabled();
 await expect(page.locator('.angle-input input').first()).toBeDisabled();
 await page.setViewportSize({width:1200,height:800});

 expect(errors).toEqual([]);
});

test('L6P5 is usable outside Competition Mode and blur does not lock it', async ({ page }) => {
 await page.goto('/?theory&question=5');
 await expect(page.locator('[data-testid="l6p5-content"]')).toBeVisible();
 await page.evaluate(() => window.dispatchEvent(new Event('blur')));
 await expect(page.locator('[data-testid="l6p5-content"]')).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 for (const [index, value] of ['300','60','300','120','60','240'].entries()) await page.locator('.angle-input input').nth(index).fill(value);
 await page.getByRole('button',{name:'Check answers'}).click();
 await expect(page.locator('.question-score output')).toHaveAttribute('aria-label', 'Score: 02');
 await expect(page.getByRole('button',{name:'Check answers'})).toBeEnabled();
 await expect(page.locator('.angle-input input').first()).toBeDisabled();
 const questionSize = await page.locator('.score').boundingBox();
 await page.getByRole('button', { name: 'Back to theory' }).click();
 await expect(page.locator('.score__display')).toHaveAttribute('aria-label', 'Score: 02');
 const hubSize = await page.locator('.score').boundingBox();
 expect(hubSize?.width).toBe(questionSize?.width);
 expect(hubSize?.height).toBe(questionSize?.height);
 expect(hubSize?.x).toBe(questionSize?.x);
 expect(hubSize?.y).toBe(questionSize?.y);
});

 test('shared feedback uses the deadline without shifting the pane or restarting on clicks', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?theory&question=5');
  await page.evaluate(() => document.fonts.ready);
  const pane = await page.locator('.question-brief').boundingBox();
  await page.getByRole('button', { name: 'Check answers' }).click();
  await expect(page.locator('.incorrect-feedback')).toBeVisible();
  await expect(page.locator('.check-button')).toContainText('TIME OUT');
  await expect(page.locator('.check-button')).toBeEnabled();
  await page.clock.fastForward(3000);
  await page.locator('.check-button').click();
  await expect(page.locator('.check-button')).toHaveAttribute('aria-label', 'Retry in 17 seconds');
  await page.clock.fastForward(2000);
  await expect(page.locator('.incorrect-feedback')).toBeVisible();
  await page.clock.fastForward(600);
  await expect(page.locator('.incorrect-feedback')).toHaveCount(0);
  await page.clock.fastForward(14500);
  await expect(page.getByRole('button', { name: 'Check answers' })).toBeEnabled();
  await expect(page.locator('.angle-input input').first()).toBeEnabled();
  expect(await page.locator('.question-brief').boundingBox()).toEqual(pane);
 });
