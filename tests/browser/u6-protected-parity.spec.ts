import {test,expect,openCompetitorQuestion} from './fixtures';
import {openTeacher} from './teacher';
import fs from 'node:fs/promises';
for(const [width,height] of [[1200,800],[1920,1080],[2560,1440]])test(`U6 protected parity ${width}`,async({page},info)=>{
 test.setTimeout(120000);
 await page.setViewportSize({width,height});
 const baseline=JSON.parse(await fs.readFile(new URL(`../../.scratch/protected-question-content/evidence/baseline-render-${width}.json`,import.meta.url),'utf8'));
 const captures=[];
 for(let number=1;number<=9;number++){
  const id='U6P'+number;
  await openTeacher(page,`/?theory&catalogue&year=U6&question=${number}`);
  await expect(page.locator('.question-content')).toBeVisible();
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
  const capture={id,...await page.locator('.question-page').evaluate(element=>({text:element.textContent,labels:[...element.querySelectorAll('[aria-label],img[alt]')].map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')??e.getAttribute('alt')})),images:[...element.querySelectorAll('img')].map(e=>({alt:e.alt,width:e.naturalWidth,height:e.naturalHeight,complete:e.complete})),bounds:{width:element.clientWidth,height:element.clientHeight}}))};
  captures.push(capture);
  await page.screenshot({path:info.outputPath(`${id}-${width}.png`)});
  expect(capture).toEqual(baseline.captures.find((entry:{id:string})=>entry.id===id));
 }
 await fs.writeFile(info.outputPath(`u6-parity-${width}.json`),JSON.stringify(captures,null,2));
});

test('U6 protected records use first-open blob assets, page-memory revisits and retained local answers',async({page,api})=>{
 await openTeacher(page,'/?theory&catalogue&year=U6&question=8');
 const answer=page.getByRole('textbox',{name:'SN1 (%)',exact:true});
 await expect(answer).toBeVisible();await answer.fill('55.5');
 for(const src of await page.locator('.u6p8-diagrams img').evaluateAll(images=>images.map(image=>image.getAttribute('src'))))expect(src).toMatch(/^blob:/);
 const count=()=>api.requests.filter(request=>['question-content','content-asset'].includes(request.action)).length;
 const first=count();
 await openTeacher(page,'/?theory&catalogue&year=U6&question=9');await expect(page.locator('.u6p9-content, [data-testid=u6p9-content]')).toBeVisible();
 const second=count();expect(second).toBe(first+1);
 await openTeacher(page,'/?theory&catalogue&year=U6&question=8');await expect(answer).toHaveValue('55.5');expect(count()).toBe(second);
});

const competitor=test.extend({accessRole:'competitor' as const});
competitor('protected point-group selections survive navigation, share cooldown and award once',async({page,api})=>{
 await page.clock.install();await openCompetitorQuestion(page,api,'U6',9);
 const choices=page.locator('.u6p9-selections select');await expect(choices).toHaveCount(3);
 await page.getByRole('button',{name:'Check answers'}).click();
 for(const choice of await choices.all())await expect(choice).toBeDisabled();
 await page.clock.fastForward(30001);
 const keys=['C\u209b \u2013 E, \u03c3','C\u2082\u1d65 \u2013 E, C\u2082, 2 \u00d7 \u03c3\u1d65','D\u2083\u2095 \u2013 E, C\u2083, 3 \u00d7 C\u2082, \u03c3\u2095, 3 \u00d7 \u03c3\u1d65'];
 for(let i=0;i<3;i++)await choices.nth(i).selectOption(keys[i]);
 await page.getByRole('button',{name:'Back to theory'}).click();
 await page.getByRole('button',{name:/^Problem 9,/}).click();
 for(let i=0;i<3;i++)await expect(choices.nth(i)).toHaveValue(keys[i]);
 await page.getByRole('button',{name:'Check answers'}).click();
 await expect(page.locator('.completion-stamp')).toBeVisible();
 await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 03');
 for(const choice of await choices.all())await expect(choice).toBeDisabled();
 await expect(page.getByRole('button',{name:'Check answers'})).toBeDisabled();
});

test('completed protected NMR freezes custom pointer and keyboard selection',async({page})=>{
 await openTeacher(page,'/?theory&catalogue&year=U6&question=1');
 await page.getByRole('textbox',{name:'Molecule name'}).fill('4-hydroxycyclohexanone');
 await page.getByRole('button',{name:'Check answers'}).click();
 await expect(page.locator('.completion-stamp')).toBeVisible();
 const overview=page.getByRole('slider',{name:/NMR detail region/});
 await expect(overview).toHaveAttribute('tabindex','-1');await expect(overview).toHaveAttribute('aria-disabled','true');
 const before=await page.locator('.u6p1-detail-selection').getAttribute('x');
 await overview.dispatchEvent('keydown',{key:'Home'});
 expect(await page.locator('.u6p1-detail-selection').getAttribute('x')).toBe(before);
 const box=(await overview.boundingBox())!;await page.mouse.click(box.x+2,box.y+2);
 expect(await page.locator('.u6p1-detail-selection').getAttribute('x')).toBe(before);
 await expect(page.getByRole('button',{name:'Back to settings'})).toBeEnabled();
});
