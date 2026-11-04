import { openTeacher } from './teacher';
import {createHash} from 'node:crypto';
import {test,expect} from './fixtures';

async function restoreComplete(api:any,id:string){
 const eventId='catalogue-U5';await api.service.question(api.token,{eventId,questionId:id});
 const pk='preview-'+createHash('sha256').update(api.token).digest('hex')+'-'+eventId,stored=await api.repo.get(pk,'q-'+id);
 const view=await api.service.question(api.token,{eventId,questionId:id}),q=stored ?? {partitionKey:pk,rowKey:'q-'+id,kind:'question',questionId:id,revision:view.revision,state:view.attempt,privateState:{}};
 await api.repo.write({...q,state:{...q.state,solvedAt:Date.parse('2026-10-30T10:00:00Z')}},q.etag);
}

test('completed Cubane rejects pointer and keyboard rotation while content and navigation stay accessible',async({page})=>{
 await openTeacher(page, '/?theory&catalogue&year=U5&question=6');await page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true}).fill('485');await page.getByRole('button',{name:'Check answers'}).click();await expect(page.locator('.completion-stamp')).toBeVisible();
 const model=page.getByRole('group',{name:/Cubane molecule/});await expect(model).toHaveAttribute('tabindex','-1');await expect(model).toHaveAttribute('aria-disabled','true');const before=await model.innerHTML(),box=(await model.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.8);await page.mouse.up();await model.dispatchEvent('keydown',{key:'ArrowRight'});expect(await model.innerHTML()).toBe(before);await model.focus();await expect(model).not.toBeFocused();await expect(page.getByRole('button',{name:'Check answers'})).toBeDisabled();
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.getByRole('button',{name:'Preview Questions',exact:true})).toBeVisible();
});

test('completed editor disables drawing, camera, keyboard and wheel without hiding its readable content',async({page,api})=>{
 await openTeacher(page);await restoreComplete(api,'U5P3');await openTeacher(page, '/?theory&catalogue&year=U5&question=3');await page.getByRole('button',{name:'Check answers',exact:true}).click();await expect(page.locator('.completion-stamp')).toBeVisible();const canvas=page.locator('.molecule-workspace'),before=await canvas.getAttribute('viewBox');await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeDisabled();await expect(canvas).toHaveAttribute('tabindex','-1');
 const box=(await canvas.boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await canvas.dispatchEvent('keydown',{key:'Enter'});await canvas.dispatchEvent('wheel',{deltaY:-500});expect(await canvas.getAttribute('viewBox')).toBe(before);await expect(canvas.locator('[data-atom]')).toHaveCount(0);await expect(page.locator('.question-brief')).toContainText('polymer');await expect(page.getByRole('button',{name:'Back to settings',exact:true})).toBeEnabled();
});

test('completed GC cannot run, drag/open reports or mutate formulation and emits no timer-action storm',async({page,api})=>{
 await page.clock.install();await openTeacher(page,'/?theory&catalogue&year=U5&question=5');await page.getByRole('button',{name:'Enter Laboratory',exact:true}).click();
 await page.getByRole('button',{name:'Add Mystery sample to injector',exact:true}).click();await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.getByRole('button',{name:'Running',exact:true})).toBeDisabled();await page.clock.fastForward(6000);await expect(page.locator('.gc-printout')).toHaveCount(1);
 await page.getByRole('button',{name:'Add Mystery sample to injector',exact:true}).click();await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.getByRole('button',{name:'Running',exact:true})).toBeDisabled();await restoreComplete(api,'U5P5');await page.getByRole('button',{name:'Check answers',exact:true}).click();await expect(page.locator('.completion-stamp')).toBeVisible();await expect(page.getByRole('button',{name:'Run',exact:true})).toBeDisabled();const report=page.locator('.gc-printout').first();await expect(report).toBeVisible();await expect(report).toHaveAttribute('tabindex','-1');await report.dispatchEvent('click');await report.dispatchEvent('keydown',{key:'Enter'});await expect(page.getByRole('dialog')).toHaveCount(0);const before=api.requests.filter((entry:any)=>entry.action==='action').length;await page.clock.fastForward(20000);expect(api.requests.filter((entry:any)=>entry.action==='action')).toHaveLength(before);
 await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
});

test('confirmed server completion freezes older local working without restoring server answer content',async({page,api})=>{
 await openTeacher(page, '/?theory&catalogue&year=U5&question=6');const answer=page.getByRole('textbox',{name:'Greatest hydrogen separation in pm',exact:true});let release!:()=>void,seen=false;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/olympiad/submit',async route=>{if(!seen){seen=true;await held;}await route.fallback();});
 await answer.fill('48');await page.getByRole('button',{name:'Check answers'}).click();await expect.poll(()=>seen).toBe(true);await expect(answer).toBeDisabled();
 await api.service.submit(api.token,{eventId:'catalogue-U5',questionId:'U5P6',requestId:'other-tab-complete',answers:{answer:'485'}});release();
 await expect(page.locator('.completion-stamp')).toBeVisible();await expect(answer).toHaveValue('48');await expect(answer).toBeDisabled();expect(api.requests.filter(request=>request.action==='draft')).toHaveLength(0);await page.getByRole('button',{name:'Back to settings',exact:true}).click();await expect(page.locator('.teacher-settings')).toBeVisible();
});
