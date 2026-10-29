import {test,expect} from '@playwright/test';
for(const viewport of [{width:1200,height:800},{width:1440,height:810},{width:960,height:600}])test('N2O editor '+viewport.width,async({page})=>{
 await page.setViewportSize(viewport);await page.clock.install();await page.goto('/?theory&year=U5&question=2');
 await expect(page.locator('.dot-cross-editor')).toBeVisible();
 await expect(page.getByText('Keyboard and non-drag controls')).toHaveCount(0);
 expect(await page.locator('.dc-canvas').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
 await page.locator('[data-element="N"]').click();
 await page.locator('.dc-canvas').click({position:{x:160,y:120}});
 await expect(page.locator('.dc-canvas .atom')).toHaveCount(1);
 await page.getByRole('button',{name:'Undo the last edit',exact:true}).click();
 await expect(page.locator('.dc-canvas .atom')).toHaveCount(0);
 await page.getByRole('button',{name:'Redo the last undone edit',exact:true}).click();
 await expect(page.locator('.dc-canvas .atom')).toHaveCount(1);

 await expect(page.getByRole('button',{name:'Check answers'})).toBeVisible();
 await expect(page.getByRole('group',{name:'Charge tools'})).toHaveCount(0);
 const check=await page.locator('.check-button').boundingBox();expect(check!.y+check!.height).toBeLessThanOrEqual(viewport.height+1);
 await page.getByRole('button',{name:'Check answers'}).click();
 await expect(page.locator('.incorrect-feedback')).toBeVisible();
 await page.clock.fastForward(20000);
 await expect(page.getByRole('button',{name:'Check answers'})).toBeVisible();
 await page.screenshot({path:'test-results/u5p2-'+viewport.width+'.png'});
});
