import {test,expect,openCompetitorQuestion,resumeCompetition} from './fixtures';
import {interrupt} from './fullscreen';
const anonymous=test.extend({accessRole:null});
async function checkHints(field:import('@playwright/test').Locator){
 await expect(field).toHaveAttribute('type','password');await expect(field).toHaveAttribute('autocomplete','off');
 await expect(field).toHaveAttribute('data-1p-ignore','true');await expect(field).toHaveAttribute('data-lpignore','true');
 await expect(field.locator('xpath=ancestor::form')).toHaveAttribute('autocomplete','off');
}
anonymous('entry codes retain masking, editing and invalid state with password-manager hints',async({page,context})=>{
 await page.clock.install();await page.goto('/');
 await expect(page.getByLabel('Teacher code',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Teacher sign in',exact:true}).click();
 for(const label of ['Teacher code','Competitor code']){
  const field=page.getByLabel(label,{exact:true});await checkHints(field);await field.fill('2468');
  await field.press('Backspace');await expect(field).toHaveValue('246');await field.fill('');
 }
 const teacher=page.getByLabel('Teacher code',{exact:true});await teacher.fill('0000');
 const submit=page.locator('form').filter({has:teacher}).getByRole('button',{name:'Submit teacher code',exact:true});
 await submit.click();
 await expect(teacher).toHaveAttribute('aria-invalid','true');await expect(page.getByText('Code not recognised.')).toHaveCount(0);
 await expect(teacher).toBeDisabled();await expect(submit).toBeDisabled();
 await page.clock.fastForward(10100);await expect(teacher).toBeEnabled();
 await teacher.press('1');await expect(teacher).not.toHaveAttribute('aria-invalid','true');await teacher.fill('');
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.evaluate(()=>navigator.clipboard.writeText('5678'));
 await teacher.focus();await teacher.press('Control+V');await expect(teacher).toHaveValue('5678');
 await submit.click();await expect(page.locator('.teacher-settings')).toBeVisible();
});
const competitor=test.extend({accessRole:'competitor' as const});
competitor('recovery code uses the same hints and masking without bypassing recovery',async({page,api})=>{
 await openCompetitorQuestion(page,api,'U5',6);await interrupt(page,'blur');
 const field=page.getByRole('dialog').getByLabel('Teacher code',{exact:true});await checkHints(field);
 await field.fill('0000');await page.getByRole('button',{name:'CONFIRM',exact:true}).click();await expect(field).toHaveAttribute('aria-invalid','true');
 await expect(page.getByText('Teacher code not recognised.')).toHaveCount(0);await field.press('1');await expect(field).not.toHaveAttribute('aria-invalid','true');
 await field.fill('');await resumeCompetition(page);await expect(page.getByTestId('u5p6-content')).toBeVisible();
});
