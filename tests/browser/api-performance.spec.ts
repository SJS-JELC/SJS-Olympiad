import {test,expect} from './fixtures';
import {openEvents,openTeacher} from './teacher';

test('copy report includes detailed timings without fetching or exposing settings',async({page,api})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as any).copiedPerformance=text;}}}));
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 await page.getByRole('button',{name:'Remove team Test team 1',exact:true}).click();
 await expect(page.getByText('Removed teams (1)',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Backend settings',exact:true}).click();
 await expect(page.getByRole('region',{name:'Server performance'})).toBeVisible();
 const before=api.requests.length;
 await page.getByRole('button',{name:'Copy performance report',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Performance report copied.'})).toBeVisible();
 expect(api.requests).toHaveLength(before);
 const raw=await page.evaluate(()=>(window as any).copiedPerformance),report=JSON.parse(raw);
 expect(report.browser.actions).toContainEqual(expect.objectContaining({action:'team-remove',outcome:'confirmed'}));
 expect(report.browser.requests).toContainEqual(expect.objectContaining({action:'team-remove',status:200,requestId:expect.any(String)}));
 expect(report.server.scope).toBe('instance');
 expect(report.server.routes).toContainEqual(expect.objectContaining({action:'team-remove',phases:expect.any(Array),storage:expect.any(Object),transport:expect.any(Object)}));
 expect(raw).not.toMatch(/fixture-L5|Test team|competitorHash|teacherHash|accessCodes|legacyBootstrap/);
});

test('clipboard rejection offers the same selectable report',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Permission denied');}}}));
 await openTeacher(page);await page.getByRole('button',{name:'Backend settings',exact:true}).click();
 await expect(page.getByRole('region',{name:'Server performance'})).toBeVisible();
 await page.getByRole('button',{name:'Copy performance report',exact:true}).click();
 const fallback=page.getByRole('textbox',{name:'Performance report for manual copying'});
 await expect(fallback).toBeVisible();expect(JSON.parse(await fallback.inputValue()).server.scope).toBe('instance');
 await fallback.focus();expect(await fallback.evaluate((element:HTMLTextAreaElement)=>element.selectionEnd-element.selectionStart)).toBe((await fallback.inputValue()).length);
});

test('draft roster removal completes with one browser API request',async({page,api})=>{
 await openEvents(page);await page.getByLabel('Selected event').selectOption('fixture-L5');
 await expect(page.getByRole('button',{name:'Remove team Test team 1',exact:true})).toBeEnabled();
 const before=api.requests.length;
 await page.getByRole('button',{name:'Remove team Test team 1',exact:true}).click();
 await expect(page.getByText('Removed teams (1)',{exact:true})).toBeVisible();
 expect(api.requests.slice(before).map(row=>row.action)).toEqual(['team-remove']);
});

test('teacher timing history refresh is local and server summaries are explicitly instance-scoped',async({page,api},testInfo)=>{
 await openTeacher(page);await page.getByRole('button',{name:'Backend settings',exact:true}).click();
 await expect(page.getByRole('region',{name:'API performance'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Server performance'})).toContainText('This server instance only');
 const before=api.requests.length;await page.getByRole('button',{name:'Refresh timing view',exact:true}).click();
 expect(api.requests).toHaveLength(before);
 await expect(page.getByRole('region',{name:'API performance'})).toContainText('diagnostics');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('backend-timing.png'),fullPage:true});
});
