import baseline from '../../.scratch/protected-question-content/evidence/j02-render-baseline.json' with {type:'json'};
import {test,expect,openCompetitorQuestion,resumeCompetition} from './fixtures';
import {openTeacher} from './teacher';
import {interrupt} from './fullscreen';
const competitor=test.extend({accessRole:'competitor' as const});
const contentRequests=(requests:{action:string;body?:any}[])=>requests.filter(item=>['question-content','content-asset'].includes(item.action) && item.body?.questionId==='L6P5');

competitor('L6P5 first opening fetches one record and two binary diagrams; revisit is memory-only; lock revokes blobs and recovery reloads',async({page,api})=>{
 await page.addInitScript(()=>{
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL,created:string[]=[],revoked:string[]=[];
  URL.createObjectURL=blob=>{const url=create(blob);created.push(url);return url;};URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};Object.assign(window,{contentBlobs:{created,revoked}});
 });
 await openCompetitorQuestion(page,api,'L6',5);
 await expect(page.locator('.question-title-panel')).toContainText('TWIST AND BUMP');
 expect(contentRequests(api.requests).map(item=>item.action)).toEqual(['question-content','content-asset','content-asset']);
 await page.locator('.angle-input input').first().fill('300');
 await page.getByRole('button',{name:'Back to theory',exact:true}).click();
 await page.getByRole('button',{name:/^Problem 5,/}).click();
 await expect(page.locator('.angle-input input').first()).toHaveValue('300');
 expect(contentRequests(api.requests)).toHaveLength(3);
 await interrupt(page,'blur');await expect(page.locator('.question-content')).toHaveCount(0);
 expect(await page.evaluate(()=>{const b=(window as any).contentBlobs;return b.created.length>=2 && b.created.every((url:string)=>b.revoked.includes(url));})).toBe(true);
 await resumeCompetition(page);await expect(page.locator('.angle-input input').first()).toHaveValue('300');
 expect(contentRequests(api.requests)).toHaveLength(6);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>/content|question/i.test(key)))).toEqual([]);
});

test('protected loading and retry gate all real content even when teacher state starts ready',async({page,api})=>{
 api.fail.add('question-content');await openTeacher(page,'/?theory&question=5');
 await expect(page.locator('.cloud-load-error')).toContainText('unavailable');await expect(page.locator('.question-content')).toHaveCount(0);
 await expect(page.locator('.question-title-panel')).toContainText('QUESTION 5');
 api.fail.delete('question-content');await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.locator('.l6p5-question')).toBeVisible();await expect(page.locator('.question-title-panel')).toContainText('TWIST AND BUMP');
 expect(api.requests.filter(item=>item.action==='content-asset')).toHaveLength(2);
});

for(const [width,height] of [[1200,800],[1920,1080],[2560,1440]])test(`protected L6P5 scientific rendering at ${width}x${height}`,async({page},testInfo)=>{
 await page.setViewportSize({width,height});await openTeacher(page,'/?theory&question=5');await expect(page.locator('.l6p5-question')).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.locator('.question-page img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
 await expect(page.locator('.l6p5-captions')).toHaveText(/Most StableConformation: 0.+Least StableConformation: 180/);
 expect(await page.locator('.scientific-diagram image').evaluateAll(images=>images.every(image=>image.getAttribute('href')?.startsWith('blob:')))).toBe(true);
 expect(await page.locator('.scientific-diagram text').allTextContents()).toContain('C');
 await expect(page.locator('.angle-input input')).toHaveCount(6);
 const actual=await page.locator('.question-page').evaluate(element=>({text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}));
 const expected=baseline.captures[String(width) as keyof typeof baseline.captures];expect(actual).toEqual({text:expected.text,labels:expected.labels,images:expected.images,bounds:expected.bounds});
 await page.screenshot({path:testInfo.outputPath(`l6p5-${width}x${height}.png`)});
});
