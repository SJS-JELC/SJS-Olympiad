import baseline1200 from '../../.scratch/protected-question-content/evidence/baseline-render-1200.json' with {type:'json'};
import baseline1920 from '../../.scratch/protected-question-content/evidence/baseline-render-1920.json' with {type:'json'};
import baseline2560 from '../../.scratch/protected-question-content/evidence/baseline-render-2560.json' with {type:'json'};
import {test,expect} from './fixtures';
import {openTeacher} from './teacher';

for(const baseline of [baseline1200,baseline1920,baseline2560])test(`all protected U5 scientific views match baseline at ${baseline.viewport.width}`,async({page,api},testInfo)=>{
 await page.setViewportSize(baseline.viewport);
 for(const expected of baseline.captures.filter(capture=>/^U5P[2-9]$/.test(capture.id))){
  const number=Number(expected.id.slice(3));
  await openTeacher(page,`/?theory&year=U5&question=${number}`);
  await expect(page.locator('.question-content')).toBeVisible();
  await expect(page.locator('.question-title-panel')).not.toContainText('QUESTION ');
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.question-page img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  const actual=await page.locator('.question-page').evaluate((element,id)=>({id,text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}),expected.id);
  expect(actual).toEqual(expected);
  await page.screenshot({path:testInfo.outputPath(`${expected.id}-${baseline.viewport.width}.png`)});
 }
 expect(api.requests.filter(request=>request.action==='question-content')).toHaveLength(8);
 expect(api.requests.filter(request=>request.action==='content-asset')).toHaveLength(1);
});

test('U5 public definitions wait for authorized content and retry without a public scientific fallback',async({page,api})=>{
 api.fail.add('question-content');
 await openTeacher(page,'/?theory&year=U5&question=4');
 await expect(page.locator('.cloud-load-error')).toBeVisible();
 await expect(page.locator('.question-content')).toHaveCount(0);
 await expect(page.locator('.question-title-panel')).toContainText('QUESTION 4');
 api.fail.delete('question-content');
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.getByTestId('u5p4-content')).toBeVisible();
 await expect(page.locator('.u5p4-diagram')).toHaveAttribute('src',/^blob:/);
 await openTeacher(page,'/?theory&year=U5&question=5');
 await expect(page.getByTestId('u5p5-content')).toBeVisible();
 const loads=api.requests.filter(request=>request.action==='question-content').length;
 await openTeacher(page,'/?theory&year=U5&question=4');
 await expect(page.getByTestId('u5p4-content')).toBeVisible();
 expect(api.requests.filter(request=>request.action==='question-content')).toHaveLength(loads);
});
