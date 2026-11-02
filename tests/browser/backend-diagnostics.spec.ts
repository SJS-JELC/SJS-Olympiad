import {test,expect} from './fixtures';
const anonymous=test.extend({accessRole:null});
async function teacher(page:import('@playwright/test').Page){
 await page.goto('/');await page.getByLabel('Teacher code',{exact:true}).fill('5678');await page.locator('form').filter({has:page.getByLabel('Teacher code',{exact:true})}).getByRole('button',{name:'GO',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
}
anonymous('backend pane loads lazily, refreshes explicitly and preserves unsaved event fields',async({page,api},testInfo)=>{
 await teacher(page);const toggle=page.getByRole('button',{name:'Backend settings',exact:true});
 await expect(toggle).toHaveAttribute('aria-expanded','false');expect(api.requests.filter(row=>row.action==='diagnostics')).toHaveLength(0);
 await page.getByRole('button',{name:'Events',exact:true}).click();const name=page.getByLabel('Event name',{exact:true});await name.fill('Unsaved local name');
 await toggle.click();await expect(page.getByRole('table',{name:'Effective backend',exact:true})).toBeVisible();expect(api.requests.filter(row=>row.action==='diagnostics')).toHaveLength(1);
 await expect(page.getByText('Secrets and personal/team data are omitted',{exact:false})).toBeVisible();
 const text=await page.locator('#settings-diagnostics-content').innerText();expect(text).toContain('OLYMPIAD_STORAGE_CONNECTION_STRING');expect(text).not.toContain('Test team 1');expect(text).not.toContain('teacherHash');expect(text).not.toContain('AccountKey=');
 await toggle.click();await toggle.click();expect(api.requests.filter(row=>row.action==='diagnostics')).toHaveLength(1);
 const previous=await api.service.session(api.token);const event=previous.activeEvent;await api.service.eventUpdate(api.token,{eventId:event.id,expectedRevision:event.revision,name:'Saved backend name'});
 await page.getByRole('button',{name:'Refresh backend settings',exact:true}).click();await expect(page.getByRole('heading',{name:/Saved backend name/})).toBeVisible();
 await expect(name).toHaveValue('Unsaved local name');expect(api.requests.filter(row=>row.action==='diagnostics')).toHaveLength(2);
 await page.waitForTimeout(1100);expect(api.requests.filter(row=>row.action==='diagnostics')).toHaveLength(2);
 await page.getByRole('button',{name:'Events',exact:true}).click();await page.setViewportSize({width:1366,height:768});
 await page.screenshot({path:testInfo.outputPath('backend-settings-1366x768.png'),fullPage:true});
});
anonymous('diagnostic failures remain compact and retry without mutating other settings',async({page,api})=>{
 await teacher(page);api.fail.add('diagnostics');await page.getByRole('button',{name:'Backend settings',exact:true}).click();
 await expect(page.locator('#settings-diagnostics-content').getByRole('alert')).toContainText('unavailable');
 await expect(page.getByRole('dialog')).toHaveCount(0);api.fail.delete('diagnostics');await page.getByRole('button',{name:'Retry diagnostics',exact:true}).click();await expect(page.getByRole('table',{name:'Effective backend',exact:true})).toBeVisible();
 expect(api.requests.filter(row=>['event-update','codes-update','team-add','team-release','team-delete'].includes(row.action))).toHaveLength(0);
});
