import {test,expect} from './fixtures';
import {openEvents,openTeacher} from './teacher';

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
