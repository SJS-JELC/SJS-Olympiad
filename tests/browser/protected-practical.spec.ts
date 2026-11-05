import {test,expect,claimAndStart,resumeCompetition,type ApiHarness} from './fixtures';
import {openTeacher} from './teacher';
import {mockFullscreen,interrupt} from './fullscreen';
import baseline1200 from '../../.scratch/protected-question-content/evidence/baseline-render-1200.json' with {type:'json'};
import baseline1920 from '../../.scratch/protected-question-content/evidence/baseline-render-1920.json' with {type:'json'};
import baseline2560 from '../../.scratch/protected-question-content/evidence/baseline-render-2560.json' with {type:'json'};
import fs from 'node:fs/promises';
const competitor=test.extend({accessRole:'competitor' as const});
const requests=(api:ApiHarness)=>api.requests.filter(item=>['practical-content','content-asset'].includes(item.action));
async function schedule(api:ApiHarness,endsIn=3600000){const staff=await api.service.login({role:'teacher',code:'5678'}),state=await api.service.session(staff.token),event=state.activeEvent;await api.service.eventUpdate(staff.token,{eventId:event.id,expectedRevision:event.revision,name:event.name,year:event.year,theoryStartsAt:Date.now()-60000,theoryEndsAt:Date.now()+7200000,practicalStartsAt:Date.now()-60000,practicalEndsAt:Date.now()+endsIn});}

test('teacher content failure has neutral title and no protocol/fields; Retry reveals protected text without reads or saves',async({page,api})=>{
 api.fail.add('practical-content');await openTeacher(page,'/?practical&catalogue&year=L6');
 await expect(page.getByRole('button',{name:'Retry content',exact:true})).toBeVisible();await expect(page.locator('.practical-protocol')).toHaveCount(0);await expect(page.locator('.practical-responses input')).toHaveCount(0);await expect(page.locator('.practical-title')).toHaveText('L6 PracticalPractical');
 expect(api.requests.some(item=>['practical','practical-save','submit'].includes(item.action))).toBe(false);
 api.fail.delete('practical-content');await page.getByRole('button',{name:'Retry content',exact:true}).click();await expect(page.locator('.practical-protocol')).toBeVisible();await expect(page.locator('.practical-title')).toContainText('MOHR CRISPS');
 await page.locator('#practical-numPracticalResponse4').fill('1e-');await page.locator('#practical-numPracticalResponse4').blur();expect(api.requests.some(item=>['practical','practical-save','submit'].includes(item.action))).toBe(false);
});

test('asset failure stays closed and can retry; a teacher catalogue title failure offers explicit retry',async({page,api})=>{
 api.fail.add('content-catalogue');await openTeacher(page);await page.getByRole('button',{name:'Preview Questions',exact:true}).click();const catalogue=page.locator('.practical-catalogue');await expect(catalogue.getByRole('alert')).toContainText('Unable to load practical titles');await expect(catalogue.getByRole('button',{name:'L6 practical: Practical',exact:true})).toBeDisabled();
 api.fail.delete('content-catalogue');await catalogue.getByRole('button',{name:'Retry',exact:true}).click();await expect(catalogue.getByRole('button',{name:'L6 practical: MOHR CRISPS',exact:true})).toBeEnabled();
 api.fail.add('content-asset');await catalogue.getByRole('button',{name:'L6 practical: MOHR CRISPS',exact:true}).click();await expect(page.getByRole('button',{name:'Retry content',exact:true})).toBeVisible();await expect(page.locator('.practical-protocol')).toHaveCount(0);
 api.fail.delete('content-asset');await page.getByRole('button',{name:'Retry content',exact:true}).click();await expect(page.locator('.practical-mohr')).toBeVisible();expect(await page.locator('.practical-mohr').getAttribute('src')).toMatch(/^blob:/);
});

competitor('first open deduplicates record and PNG; same-event revisit reuses them; lock/recovery reloads and keeps saved precision',async({page,api})=>{
 await page.addInitScript(()=>{const create=URL.createObjectURL,revoke=URL.revokeObjectURL,created:string[]=[],revoked:string[]=[];URL.createObjectURL=blob=>{const url=create(blob);created.push(url);return url;};URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};Object.assign(window,{practicalBlobs:{created,revoked}});});
 await schedule(api);await mockFullscreen(page);await page.goto('/');await claimAndStart(page);expect(requests(api)).toHaveLength(0);await page.getByRole('button',{name:'Practical challenge',exact:true}).click();await expect(page.locator('.practical-protocol')).toBeVisible();expect(requests(api).map(item=>item.action)).toEqual(['practical-content','content-asset']);
 await page.locator('#practical-numPracticalResponse4').fill('1.2300');await page.locator('#practical-numPracticalResponse4').blur();await expect(page.getByText('Saved',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Theory challenge',exact:true}).click();await page.getByRole('button',{name:'Back to landing',exact:true}).click();await page.getByRole('button',{name:'Practical challenge',exact:true}).click();await expect(page.locator('#practical-numPracticalResponse4')).toHaveValue('1.2300');expect(requests(api)).toHaveLength(2);
 await interrupt(page,'blur');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.practical-protocol')).toHaveCount(0);expect(await page.evaluate(()=>{const value=(window as any).practicalBlobs;return value.created.length===1 && value.revoked.length===1;})).toBe(true);
 await resumeCompetition(page);await expect(page.locator('.practical-protocol')).toBeVisible();await expect(page.locator('#practical-numPracticalResponse4')).toHaveValue('1.2300');expect(requests(api)).toHaveLength(4);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>/content|practical/i.test(key)))).toEqual([]);
});

competitor('late content crossing the practical deadline cannot display protocol or fetch its asset',async({page,api})=>{
 await page.clock.install();await schedule(api,20000);await mockFullscreen(page);await page.goto('/');await claimAndStart(page);
 let release:()=>void=()=>{},captured=false,delivered=false;
 await page.route('**/api/olympiad/practical-content',async route=>{const record=await api.service.practicalContent(api.token,route.request().postDataJSON());captured=true;await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({json:record}).catch(()=>{});delivered=true;});
 await page.getByRole('button',{name:'Practical challenge',exact:true}).click();await expect.poll(()=>captured).toBe(true);await expect(page.getByText('Loading practical content...',{exact:true})).toBeVisible();await expect(page.locator('.practical-status')).toBeVisible();await expect(page.locator('.practical-responses input')).toHaveCount(0);
 await page.clock.fastForward(20001);api.setTime(await page.evaluate(()=>Date.now()));release();await expect.poll(()=>delivered).toBe(true);await expect(page.locator('.practical-protocol')).toHaveCount(0);await expect(page.locator('.practical-title')).toHaveCount(0);expect(api.requests.filter(item=>item.action==='content-asset')).toHaveLength(0);
 expect((await api.service.practical(api.token)).readOnly).toBe(true);
});

for(const baseline of [baseline1200,baseline1920,baseline2560])test(`all three practicals preserve baseline text, aria and page bounds at ${baseline.viewport.width}`,async({page},info)=>{
 const {width,height}=baseline.viewport;await page.setViewportSize({width,height});const captures=[];
 for(const year of ['L5','L6','U6']){
  await openTeacher(page,`/?practical&catalogue&year=${year}`);await expect(page.locator('.practical-protocol')).toBeVisible();await expect(page.locator('.practical-responses input')).toHaveCount(year==='L6'?2:4);await page.evaluate(()=>document.fonts.ready);await page.locator('.question-page img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  const actual=await page.locator('.question-page').evaluate(element=>({text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}));
  const expected=baseline.captures.find(item=>item.id===year+'-practical')!;
  expect(actual.text).toEqual(expected.text);expect(actual.labels).toEqual(expected.labels);expect(actual.bounds).toEqual(expected.bounds);
  // The protected raster changes intrinsic pixel dimensions; displayed SVG geometry/alt remain unchanged.
  const images=actual.images.map(image=>image.alt==='Mohr Crisps'?{...image,width:expected.images.find(item=>item.alt===image.alt)!.width,height:expected.images.find(item=>item.alt===image.alt)!.height}:image);expect(images).toEqual(expected.images);
  if(year==='L6'){expect(actual.images.find(image=>image.alt==='Mohr Crisps')!.width).toBeGreaterThan(1000);const bounds=await page.locator('.practical-mohr').boundingBox();expect(bounds!.width/bounds!.height).toBeCloseTo(154.24/166.05,2);}
  await page.screenshot({path:info.outputPath(`protected-${year}-${width}-top.png`)});await page.locator('.practical-protocol').evaluate(element=>element.scrollTop=element.scrollHeight);await page.screenshot({path:info.outputPath(`protected-${year}-${width}-end.png`)});captures.push({id:year+'-practical',...actual});
 }
 await fs.writeFile(info.outputPath(`j07-parity-${width}.json`),JSON.stringify({viewport:baseline.viewport,captures},null,2));
});
