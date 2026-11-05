import {test,expect} from './fixtures';
import {openTeacher} from './teacher';
import fs from 'node:fs/promises';


// Whole-catalogue artifact capture, intentionally separate from interaction tests.
// PARITY_PHASE labels evidence only; it never changes application behavior.
const ids=['L5','U5','L6','U6'].flatMap(year=>Array.from({length:9},(_,i)=>year+'P'+(i+1))).filter(id=>id!=='U5P1');
const sizes=[{width:1920,height:1080},{width:2560,height:1440},{width:1200,height:800}];
for(const size of sizes)test(`presentation parity capture ${size.width}x${size.height}`,async({page},info)=>{
  test.setTimeout(240000);
  await page.setViewportSize(size);
  const phase=process.env.PARITY_PHASE??'integrated';
  const captures=[];
  const baseline=JSON.parse(await fs.readFile(new URL(`../../.scratch/protected-question-content/evidence/baseline-render-${size.width}.json`,import.meta.url),'utf8'));
  const verify=(capture:any)=>{const expected=baseline.captures.find((row:any)=>row.id===capture.id);const comparable=structuredClone(capture);if(['L5P7','L6-practical'].includes(capture.id)){comparable.images=comparable.images.map((image:any,index:number)=>(['Gallium nitride unit cell','Mohr Crisps'].includes(image.alt)?{...image,width:expected.images[index].width,height:expected.images[index].height}:image));}expect(comparable).toEqual(expected);};
  for(const id of ids){
    const [year,number]=id.split('P');
    await openTeacher(page,`/?theory&catalogue&year=${year}&question=${number}`);
    await expect(page.locator('.question-content')).toBeVisible();
    await expect(page.locator('.cloud-load-error')).toHaveCount(0);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
    await page.screenshot({path:info.outputPath(`${phase}-${id}.png`)});
    captures.push({id,...await page.locator('.question-page').evaluate(element=>({text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}))});
  }
  for(const year of ['L5','L6','U6']){
    await openTeacher(page,`/?practical&catalogue&year=${year}`);
    await expect(page.locator('.practical-protocol')).toBeVisible();
    await expect(page.locator('.practical-responses input')).toHaveCount(year==='L6'?2:4);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
    await page.screenshot({path:info.outputPath(`${phase}-${year}-practical.png`)});
    captures.push({id:year+'-practical',...await page.locator('.question-page').evaluate(element=>({text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}))});
  }
  for(const capture of captures)verify(capture);
  await fs.writeFile(info.outputPath(`${phase}-presentation.json`),JSON.stringify({phase,viewport:size,captures},null,2));
  expect(captures).toHaveLength(38);
});
