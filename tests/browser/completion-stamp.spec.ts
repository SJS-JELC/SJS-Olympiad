import {createHash} from 'node:crypto';
import {test,expect,openCompetitorQuestion,resumeCompetition} from './fixtures';
import {interrupt} from './fullscreen';
import {oxyanions} from '../fixtures/custom-server';
const competitor=test.extend({accessRole:'competitor' as const});
const questions=[...['L5','L6','U6'].flatMap(year=>Array.from({length:9},(_,index)=>({id:year+'P'+(index+1),year,number:index+1}))),...[2,3,5,6,7,8].map(number=>({id:'U5P'+number,year:'U5',number}))];

test('all33 restored server completions show their original London time without replaying the stamp',async({page,api})=>{
 test.setTimeout(120000);await page.setViewportSize({width:1200,height:800});
 const solvedAt=Date.parse('2026-07-15T12:03:04Z'),sessionHash=createHash('sha256').update(api.token!).digest('hex');
 for(const definition of questions){
  const eventId='catalogue-'+definition.year;await api.service.question(api.token,{eventId,questionId:definition.id});
  const pk='preview-'+sessionHash+'-'+eventId,q=await api.repo.get(pk,'q-'+definition.id);await api.repo.write({...q,state:{...q.state,solvedAt}},q.etag);
  await page.goto(`/?theory&catalogue&year=${definition.year}&question=${definition.number}`);
  const stamp=page.locator('.completion-stamp');await expect(stamp).toHaveAttribute('data-solved-at',String(solvedAt));await expect(stamp).toHaveAttribute('data-animated','false');await expect(page.locator('.cloud-fields')).toHaveAttribute('disabled','');await expect(page.locator('.cloud-fields')).toHaveCSS('pointer-events','none');expect(await page.locator('.cloud-fields').evaluate(element=>[...element.querySelectorAll('button,input,select,textarea')].every(control=>control.matches(':disabled')))).toBe(true);await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);await expect(stamp).toHaveAttribute('aria-label','Complete at 13:03:04 Europe/London · teacher preview (unscored)');await expect(stamp.locator('.completion-stamp__time')).toHaveText('13:03:04');await expect(page.locator('.question-score output')).toHaveAttribute('aria-label','Score: 00');
 }
});

competitor('stamp waits for confirmed save, keeps its original time on revisit/recovery and hides at theory closure',async({page,api})=>{
 await page.clock.install();await openCompetitorQuestion(page,api,'L6',8);const stamp=page.locator('.completion-stamp');
 await page.getByRole('textbox',{name:'Equilibrium concentration of B',exact:true}).fill('0');await page.getByRole('button',{name:'Check answers'}).click();await expect(page.locator('.incorrect-feedback')).toBeVisible();await expect(stamp).toHaveCount(0);await page.clock.fastForward(15001);
 await page.getByRole('textbox',{name:'Equilibrium concentration of B',exact:true}).fill('0.437');api.lostResponses.add('submit');await page.getByRole('button',{name:'Check answers'}).click();await expect(page.locator('.cloud-status')).toContainText('Not saved');await expect(stamp).toHaveCount(0);
 await page.getByRole('button',{name:'Retry save'}).click();await expect(stamp).toBeVisible();await expect(stamp).toHaveAttribute('data-animated','true');await expect(stamp).toHaveCSS('animation-duration','0.3s');const solvedAt=Number(await stamp.getAttribute('data-solved-at')),clock=await stamp.locator('.completion-stamp__time').textContent();expect(solvedAt).toBe((await api.service.session(api.token)).attempts.L6P8.solvedAt);
 await page.clock.fastForward(60000);await page.getByRole('button',{name:'Back to theory',exact:true}).click();await expect(stamp).toHaveCount(0);await page.getByRole('button',{name:/^Problem 8,/}).click();await expect(stamp).toHaveAttribute('data-animated','false');await expect(stamp.locator('.completion-stamp__time')).toHaveText(clock!);
 await interrupt(page,'blur');await expect(stamp).toHaveCount(0);await resumeCompetition(page);await expect(stamp).toHaveAttribute('data-solved-at',String(solvedAt));await expect(stamp).toHaveAttribute('data-animated','false');
 const staff=await api.service.login({role:'teacher',code:'5678'}),state=await api.service.session(staff.token),now=await page.evaluate(()=>Date.now());api.setTime(now);await api.service.eventUpdate(staff.token,{eventId:'fixture-L6',expectedRevision:state.activeEvent.revision,theoryEndsAt:now+2000,practicalStartsAt:now+2500,practicalEndsAt:now+10000});await page.getByRole('button',{name:'Back to theory',exact:true}).click();await page.getByRole('button',{name:/^Problem 8,/}).click();await expect(stamp).toBeVisible();await page.clock.fastForward(2001);await expect(stamp).toHaveCount(0);await expect(page.locator('.question-access')).toContainText('finished');await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('timed five-name completion receives the same confirmed shared stamp',async({page})=>{
 await page.goto('/?theory&question=3');await page.getByRole('button',{name:'GO: start oxyanion challenge'}).click();
 for(let step=0;step<5;step++){const formula=await page.locator('.l6p3-formula').getAttribute('aria-label'),prompt=oxyanions.find((row:{formula:string;name:string})=>row.formula===formula);expect(prompt).toBeTruthy();await page.getByRole('textbox',{name:'Oxyanion name'}).fill(prompt!.name);await page.getByRole('button',{name:'Submit oxyanion name'}).click();if(step<4)await expect(page.locator('.l6p3-formula')).not.toHaveAttribute('aria-label',formula!);}
 await expect(page.locator('.completion-stamp')).toHaveAttribute('data-animated','true');await expect(page.locator('.event-status')).toHaveCount(0);await expect(page.getByText('Teacher Mode',{exact:true})).toHaveCount(0);
});

test('pixel stamp is noninteractive, reduced-motion safe and rendered at both primary resolutions',async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?theory&catalogue&year=U5&question=6');await page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true}).fill('485');await page.getByRole('button',{name:'Check answers'}).click();const stamp=page.locator('.completion-stamp');await expect(stamp).toBeVisible();await expect(stamp).toHaveCSS('pointer-events','none');await expect(stamp).toHaveCSS('animation-name','none');await expect(stamp).toHaveCSS('opacity','1');await expect(stamp.locator('mask,pattern')).toHaveCount(0);await expect(stamp.locator('svg > g')).toHaveAttribute('fill','#ef202b');await expect(stamp.locator('rect')).toHaveAttribute('fill','none');await expect(page.getByText('Correct · teacher preview (unscored)',{exact:true})).toHaveCount(0);await expect(page.locator('.cloud-status,.event-status,.teacher-mode-position')).toHaveCount(0);
 for(const[width,height]of[[1920,1080],[2560,1440]]){await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);await expect(stamp.locator('.completion-stamp__eagle path')).toHaveAttribute('d',/^M/);await page.screenshot({path:testInfo.outputPath(`complete-stamp-${width}x${height}.png`)});const box=(await stamp.boundingBox())!;expect(box.x).toBeGreaterThan(0);expect(box.y).toBeGreaterThan(height*.1);expect(box.x+box.width).toBeLessThan(width);expect(box.y+box.height).toBeLessThan(height*.9);}
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(stamp).toHaveCount(0);
});
