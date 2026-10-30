import {createHash} from 'node:crypto';
import {test,expect} from './fixtures';

async function restoreComplete(api:any,id:string){
 const eventId='catalogue-U5';await api.service.question(api.token,{eventId,questionId:id});
 const pk='preview-'+createHash('sha256').update(api.token).digest('hex')+'-'+eventId,q=await api.repo.get(pk,'q-'+id);
 await api.repo.write({...q,state:{...q.state,solvedAt:Date.parse('2026-10-30T10:00:00Z')}},q.etag);
}

test('completed Cubane rejects pointer and keyboard rotation while content and navigation stay accessible',async({page})=>{
 await page.goto('/?theory&catalogue&year=U5&question=6');await page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true}).fill('485');await page.getByRole('button',{name:'Check answers'}).click();await expect(page.locator('.completion-stamp')).toBeVisible();
 const model=page.getByRole('group',{name:/Cubane molecule/});await expect(model).toHaveAttribute('tabindex','-1');await expect(model).toHaveAttribute('aria-disabled','true');const before=await model.innerHTML(),box=(await model.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.8);await page.mouse.up();await model.dispatchEvent('keydown',{key:'ArrowRight'});expect(await model.innerHTML()).toBe(before);await model.focus();await expect(model).not.toBeFocused();await expect(page.getByRole('button',{name:'Check answers'})).toBeDisabled();
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByRole('button',{name:'Questions Preview',exact:true})).toBeVisible();
});

test('completed editor disables drawing, camera, keyboard and wheel without hiding its readable content',async({page,api})=>{
 await restoreComplete(api,'U5P3');await page.goto('/?theory&catalogue&year=U5&question=3');await expect(page.locator('.completion-stamp')).toBeVisible();const canvas=page.locator('.molecule-workspace'),before=await canvas.getAttribute('viewBox');await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeDisabled();await expect(canvas).toHaveAttribute('tabindex','-1');
 const box=(await canvas.boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await canvas.dispatchEvent('keydown',{key:'Enter'});await canvas.dispatchEvent('wheel',{deltaY:-500});expect(await canvas.getAttribute('viewBox')).toBe(before);await expect(canvas.locator('[data-atom]')).toHaveCount(0);await expect(page.locator('.question-brief')).toContainText('polymer');await expect(page.getByRole('button',{name:'Back to settings',exact:true})).toBeEnabled();
});

test('completed GC cannot run, drag/open reports or mutate formulation and emits no timer-action storm',async({page,api})=>{
 await page.clock.install();const base={eventId:'catalogue-U5',questionId:'U5P5'};
 for(const [index,action]of[{type:'gc-enter'},{type:'gc-load',sample:'mystery'},{type:'gc-run'}].entries())await api.service.action(api.token,{...base,requestId:'restore-run-'+index,action});
 api.setTime(Date.now()+6001);await api.service.action(api.token,{...base,requestId:'restore-run-tick',action:{type:'tick'}});await api.service.action(api.token,{...base,requestId:'restore-loaded-again',action:{type:'gc-load',sample:'mystery'}});await api.service.action(api.token,{...base,requestId:'restore-running-again',action:{type:'gc-run'}});await restoreComplete(api,'U5P5');
 await page.goto('/?theory&catalogue&year=U5&question=5');await expect(page.locator('.completion-stamp')).toBeVisible();await expect(page.getByRole('button',{name:'Running',exact:true})).toBeDisabled();const report=page.locator('.gc-printout').first();await expect(report).toBeVisible();await expect(report).toHaveAttribute('tabindex','-1');await report.dispatchEvent('click');await report.dispatchEvent('keydown',{key:'Enter'});await expect(page.getByRole('dialog')).toHaveCount(0);const before=api.requests.filter((entry:any)=>entry.action==='action').length;await page.clock.fastForward(20000);expect(api.requests.filter((entry:any)=>entry.action==='action')).toHaveLength(before);
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
});

test('confirmed server completion restores its saved answer over newer unacknowledged draft edits',async({page,api})=>{
 await page.goto('/?theory&catalogue&year=U5&question=6');const answer=page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true});let release!:()=>void,seen=false;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/olympiad/draft',async route=>{if(!seen){seen=true;await held;}await route.fallback();});
 await answer.fill('48');await expect.poll(()=>seen).toBe(true);await answer.fill('49');await api.service.submit(api.token,{eventId:'catalogue-U5',questionId:'U5P6',requestId:'other-tab-complete',answers:{answer:'485'}});release();
 await expect(page.locator('.completion-stamp')).toBeVisible();await expect(answer).toHaveValue('485');await expect(answer).toBeDisabled();await page.waitForTimeout(650);expect(api.requests.filter(request=>request.action==='draft')).toHaveLength(1);await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
});
