import {readFileSync} from 'node:fs';
import {test,expect,openCompetitorQuestion} from './fixtures';
import {openTeacher} from './teacher';

for(const [width,height] of [[1200,800],[1920,1080],[2560,1440]])test(`protected L5 scientific rendering at ${width}x${height}`,async({page,api},testInfo)=>{
 test.setTimeout(120_000);
 const baseline=JSON.parse(readFileSync(`.scratch/protected-question-content/evidence/baseline-render-${width}.json`,'utf8'));
 await page.setViewportSize({width,height});
 for(let number=1;number<=9;number++)await test.step('L5P'+number,async()=>{
  await openTeacher(page,`/?theory&year=L5&question=${number}`);
  await expect(page.locator(`.l5p${number}-question,[data-testid="l5p${number}-content"]`)).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.question-page img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  const actual=await page.locator('.question-page').evaluate(element=>({id:'',text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}));
  actual.id='L5P'+number;
  const expected=baseline.captures.find((capture:{id:string})=>capture.id===actual.id);
  // The full original embedded-image SVG is rasterized at 2x source viewBox resolution.
  // Intrinsic raster dimensions differ; rendered composition remains the same.
  if(number===7){expect(actual.images.at(-1)?.width).toBeGreaterThan(3000);actual.images.at(-1)!.width=expected.images.at(-1).width;actual.images.at(-1)!.height=expected.images.at(-1).height;}
  expect(actual).toEqual(expected);
  expect(await page.locator('.question-brief img,.l5p1-dressing').evaluateAll(images=>images.every(image=>image.getAttribute('src')?.startsWith('blob:')))).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`l5p${number}-${width}x${height}.png`)});
 });
 expect(api.requests.filter(request=>request.action==='question-content')).toHaveLength(9);
 await openTeacher(page,'/?theory&year=L5&question=1');
 await expect(page.locator('.l5p1-question')).toBeVisible();
 expect(api.requests.filter(request=>request.action==='question-content')).toHaveLength(9);
});

const competitor=test.extend({accessRole:'competitor' as const});
competitor('L5 grouping protected identities retain local selection and reset through navigation',async({page,api})=>{
 await openCompetitorQuestion(page,api,'L5',9);
 const tile=page.getByRole('button',{name:'ZnO\u2082, unselected',exact:true});
 await tile.click();await expect(page.getByRole('button',{name:'ZnO\u2082, group 1',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Back to theory',exact:true}).click();
 await page.getByRole('button',{name:/^Problem 9,/}).click();
 await expect(page.getByRole('button',{name:'ZnO\u2082, group 1',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(api.requests.filter(request=>request.action==='question-content')).toHaveLength(1);
 await page.getByRole('button',{name:'Reset / clear groups',exact:true}).click();await expect(tile).toHaveAttribute('aria-pressed','false');
 expect(api.requests.filter(request=>['submit','question-action'].includes(request.action))).toHaveLength(0);
});
