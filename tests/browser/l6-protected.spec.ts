import {test,expect} from './fixtures';
import {openTeacher} from './teacher';
import baseline1200 from '../../.scratch/protected-question-content/evidence/baseline-render-1200.json' with {type:'json'};
import baseline1920 from '../../.scratch/protected-question-content/evidence/baseline-render-1920.json' with {type:'json'};
import baseline2560 from '../../.scratch/protected-question-content/evidence/baseline-render-2560.json' with {type:'json'};
const numbers=[1,2,3,4,6,7,8,9];
for(const baseline of [baseline1200,baseline1920,baseline2560])test(`L6 protected scientific parity ${baseline.viewport.width}x${baseline.viewport.height}`,async({page,api},info)=>{
 test.setTimeout(180000);await page.setViewportSize(baseline.viewport);
 for(const number of numbers){
  await openTeacher(page,`/?theory&catalogue&year=L6&question=${number}`);
  await expect(page.locator('.question-content')).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await page.locator('.question-page img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  const actual=await page.locator('.question-page').evaluate(element=>({text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}));
  const expected=baseline.captures.find(capture=>capture.id===`L6P${number}`)!;
  expect(actual).toEqual({text:expected.text,labels:expected.labels,images:expected.images,bounds:expected.bounds});
  await page.screenshot({path:info.outputPath(`L6P${number}-${baseline.viewport.width}.png`)});
 }
 expect(api.requests.filter(request=>request.action==='question-content')).toHaveLength(8);
});
test('protected L6 orbital phases retain accessible keyboard selection and memory-only revisit',async({page,api})=>{
 await openTeacher(page,'/?theory&catalogue&year=L6&question=4');
 const phase=page.getByRole('button',{name:'HOMO orbital 1: not selected. Change phase.',exact:true});
 await phase.focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'HOMO orbital 1: phase 1. Change phase.',exact:true})).toBeVisible();
 const count=api.requests.filter(request=>['question-content','content-asset'].includes(request.action)).length;
 await page.evaluate(() => { history.pushState(null, '', '?theory&catalogue&year=L6&question=2'); window.dispatchEvent(new PopStateEvent('popstate')); });
 await expect(page.locator('.l6p2-question')).toBeVisible();await page.goBack();
 await expect(page.getByRole('button',{name:'HOMO orbital 1: phase 1. Change phase.',exact:true})).toBeVisible();
 expect(api.requests.filter(request=>['question-content','content-asset'].includes(request.action) && request.body.questionId==='L6P4')).toHaveLength(count);
});
test('protected L6 grouping keeps real authorized element identities and reset behavior',async({page})=>{
 await openTeacher(page,'/?theory&catalogue&year=L6&question=1');
 const tile=page.getByRole('button',{name:'Ta, unselected',exact:true});await tile.click();
 await expect(page.getByRole('button',{name:'Ta, group 1',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Reset / clear groups'}).click();await expect(tile).toBeEnabled();
});
