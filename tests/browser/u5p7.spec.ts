import {test,expect} from '@playwright/test';
test('Cut and Shut edits and restores a drawing; Boundaries is P8',async({page})=>{
 await page.goto('/?theory&year=U5&question=7');
 await expect(page.getByRole('heading',{name:/CUT AND SHUT/i})).toBeVisible();
 const canvas=page.getByRole('group',{name:'Molecule drawing canvas'});
 await canvas.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:/Carbon [12]$/})).toHaveCount(2);
 await page.getByRole('button',{name:'Single bond',exact:true}).click();
 await page.getByRole('button',{name:'Carbon 1',exact:true}).click();await page.getByRole('button',{name:'Carbon 2',exact:true}).click();
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();
 await page.getByRole('button',{name:'Back to theory'}).click();
 await page.getByRole('button',{name:'Problem 7, 2 points, not yet solved',exact:true}).click();
 await expect(page.getByRole('button',{name:/Carbon [12]$/})).toHaveCount(2);
 await page.goto('/?theory&year=U5&question=8');
 await expect(page.getByRole('heading',{name:/BOUNDARIES/i})).toBeVisible();
});
