import {test,expect,openCompetitorQuestion,resumeCompetition,type Page,type ApiHarness} from './fixtures';
import {openTeacher} from './teacher';
import {interrupt} from './fullscreen';
// Production handler generates each response before it is held at the browser boundary.
// @ts-expect-error Node-only API module.
import {handle} from '../../api/src/http.mjs';
async function delaySelected(page:Page,api:ApiHarness,id:string){
 const held:{release:(status?:number)=>void}[]=[];
 await page.route('**/api/olympiad/question',async route=>{
  const request=route.request(),body=request.postDataJSON();
  if(body.questionId!==id || held.length>=2)return route.fallback();
  api.requests.push({action:'question',body});
  const response=await handle({method:'POST',params:{action:'question'},headers:{...request.headers(),origin:'https://olympiad.masters-of-chemistry.app',cookie:'__Host-olympiad-session='+api.token},body,rawBody:request.postData()},()=>api.service);
  let release!:(status?:number)=>void;const gate=new Promise<number|undefined>(resolve=>{release=resolve;});held.push({release});
  const status=await gate;
  await route.fulfill(status?{status,json:{error:status===503?'Fresh selected read unavailable.':'Obsolete selected authority.'}}:{status:response.status,headers:response.headers,json:response.body});
 });
 return {wait:async(index:number)=>{await expect.poll(()=>held.length).toBeGreaterThan(index);},release:async(index:number,status?:number)=>{const response=page.waitForResponse(response=>response.url().endsWith('/api/olympiad/question')&&response.request().postDataJSON()?.questionId===id);held[index].release(status);await response;await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}};
}
const competitor=test.extend({accessRole:'competitor' as const});
for(const [id,year,number]of [['L6P3','L6',3],['U5P5','U5',5]] as const){
 competitor(`held ${id} selected response across lock/recovery starts a replacement before obsolete settlement`,async({page,api})=>{
  const delayed=await delaySelected(page,api,id);await openCompetitorQuestion(page,api,year);
  await page.getByRole('button',{name:new RegExp('^Problem '+number+',')}).click();await delayed.wait(0);
  await expect(page.getByRole('progressbar',{name:'Loading question'})).toBeVisible();
  await interrupt(page,'blur');await expect(page.locator('.question-content')).toHaveCount(0);await resumeCompetition(page);await delayed.wait(1);
  // Old error settles first: it must neither relock nor clear the replacement flight.
  await delayed.release(0,423);await expect(page.getByRole('progressbar',{name:'Loading question'})).toBeVisible();await expect(page.locator('.cloud-load-error')).toHaveCount(0);
  await delayed.release(1);await expect(page.locator('.question-content')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.requests.filter(row=>row.action==='question'&&row.body.questionId===id)).toHaveLength(2);
 });
 test(`held ${id} selected response across teacher context return keeps fresh-first state`,async({page,api})=>{
  const delayed=await delaySelected(page,api,id);await openTeacher(page,`/?theory&catalogue&year=${year}&question=${number}`);await delayed.wait(0);
  await openTeacher(page,'/?theory&catalogue&year=U6&question=2');await expect(page.locator('.question-content')).toBeVisible();
  await openTeacher(page,`/?theory&catalogue&year=${year}&question=${number}`);await delayed.wait(1);
  await delayed.release(1);await expect(page.locator('.question-content')).toBeVisible();await delayed.release(0,423);
  await expect(page.locator('.question-content')).toBeVisible();await expect(page.locator('.cloud-load-error')).toHaveCount(0);await expect(page.locator('.access-gate')).toHaveCount(0);
  expect(api.requests.filter(row=>row.action==='question'&&row.body.questionId===id)).toHaveLength(2);
 });
 test(`fresh ${id} selected failure after context return shows actionable Retry while obsolete response remains held`,async({page,api})=>{
  const delayed=await delaySelected(page,api,id);await openTeacher(page,`/?theory&catalogue&year=${year}&question=${number}`);await delayed.wait(0);
  await openTeacher(page,'/?theory&catalogue&year=U6&question=2');await expect(page.locator('.question-content')).toBeVisible();
  await openTeacher(page,`/?theory&catalogue&year=${year}&question=${number}`);await delayed.wait(1);await delayed.release(1,503);
  await expect(page.locator('.cloud-load-error')).toContainText('Fresh selected read unavailable.');await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(page.locator('.question-content')).toBeVisible();await delayed.release(0);await expect(page.locator('.question-content')).toBeVisible();
  expect(api.requests.filter(row=>row.action==='question'&&row.body.questionId===id)).toHaveLength(3);
 });
}
