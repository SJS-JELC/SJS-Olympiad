import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import { createService } from '../src/service.mjs';
import { handle } from '../src/http.mjs';
import { memoryRepository } from './helpers.mjs';
import { presentationRecord, presentationCatalogue } from '../src/presentation/registry.mjs';
import { fixedAsset, validateRecord } from '../src/presentation/record.mjs';

async function fixture(status='active',year='L6') {
 const repo=memoryRepository();let time=100000;
 const api=createService(repo,{},()=>time),teacher=(await api.login({role:'teacher',code:'5678'})).token;
 const event=(await api.eventCreate(teacher,{name:'Synthetic content fixture',year,theoryStartsAt:200000,theoryEndsAt:300000,practicalStartsAt:350000,practicalEndsAt:400000})).events[0];
 if(status==='active')await api.eventActivate(teacher,{eventId:event.id,expectedRevision:1});
 const player=(await api.login({role:'competitor',code:'1234'})).token;
 const team=(await api.teams(player)).teams[0];await api.claim(player,{teamId:team.id});
 return {api,repo,teacher,player,event,team,setTime:value=>time=value,pk:event.id+'-'+team.id};
}
const question={questionId:'L6P5'};
const asset={kind:'question',...question,version:presentationRecord('question','L6P5').version,assetId:'example'};

test('all theory scientific paragraphs remain exact baseline text after runtime configuration changes',()=>{
 const baseline=JSON.parse(readFileSync(new URL('../../.scratch/protected-question-content/evidence/baseline-render-1920.json',import.meta.url),'utf8'));
 for(const {id}of presentationCatalogue()){
  const record=presentationRecord('question',id),capture=baseline.captures.find(value=>value.id===id);
  assert.ok(capture,id+' has a pinned source capture');
  for(const paragraph of record.presentation.paragraphs??[])assert.ok(capture.text.includes(paragraph),id+' scientific paragraph changed');
 }
});
for(const status of ['draft','active'])test(`${status} content and binary assets enforce exact start-inclusive/end-exclusive theory boundaries`,async()=>{
 const f=await fixture(status);
 for(const read of [()=>f.api.questionContent(f.player,question),()=>f.api.contentAsset(f.player,asset)])await assert.rejects(read(),{status:423});
 const started=await f.api.start(f.player);
 assert.ok(Object.values(started.hydration.questions).every(value=>!value.data && !value.attempt.interaction));
 for(const time of [100000,199999,300000,300001]){
  f.setTime(time);
  for(const read of [()=>f.api.questionContent(f.player,question),()=>f.api.contentAsset(f.player,asset),()=>f.api.question(f.player,question),()=>f.api.action(f.player,{questionId:'L6P3',requestId:'before-timed-start',action:{type:'start'}})])await assert.rejects(read(),{status:403});
 }
 for(const time of [200000,299999]){
  f.setTime(time);const before=JSON.stringify([...f.repo.rows]);
  const record=await f.api.questionContent(f.player,question),bytes=await f.api.contentAsset(f.player,asset);
  assert.equal(record.id,'L6P5');assert.equal(record.schemaVersion,1);assert.equal(record.presentation.title,'Twist and Bump');assert.equal(record.assets.length,2);
  assert.equal(record.serverNow,time);assert.ok(Buffer.isBuffer(bytes.body));assert.equal(bytes.body.length,record.assets[0].bytes);
  assert.equal(JSON.stringify([...f.repo.rows]),before,'content reads never create question rows, timers or scores');
 }
});

test('anonymous/pilot credentials, wrong event/year, invalid record/version/asset/path and catalogue access fail closed',async()=>{
 const f=await fixture();await f.api.start(f.player);f.setTime(200000);
 for(const token of [undefined,'pilot-private-credential'])for(const read of [()=>f.api.questionContent(token,question),()=>f.api.contentAsset(token,asset),()=>f.api.contentCatalogue(token)])await assert.rejects(read(),{status:401});
 await assert.rejects(f.api.contentCatalogue(f.player),{status:403});
 for(const input of [{questionId:'U6P5'},{questionId:'../../L6P5'},{questionId:'L6P0'},{questionId:'L6P5',contentId:'L6P4'}])await assert.rejects(f.api.questionContent(f.player,input),{status:404});
 await assert.rejects(f.api.questionContent(f.player,{...question,eventId:'wrong'}),{status:403});
 for(const input of [{...asset,version:'unknown-version'},{...asset,assetId:'../../newman.svg'},{...asset,assetId:'unknown'},{...asset,kind:'anything'},{...asset,contentId:'L6P4'}])await assert.rejects(f.api.contentAsset(f.player,input),error=>[400,404].includes(error.status));
 const team=await f.repo.get(f.pk,'team');await f.repo.write({...team,year:'U6'},team.etag);
 await assert.rejects(f.api.questionContent(f.player,question),{status:403});
});

test('teachers retain authenticated event/catalogue previews outside windows without competitor bulk prefetch',async()=>{
 const f=await fixture();
 for(const eventId of [f.event.id,'catalogue-L6']){
  const before=JSON.stringify([...f.repo.rows]);
  assert.equal((await f.api.questionContent(f.teacher,{...question,eventId})).presentation.title,'Twist and Bump');
  assert.ok((await f.api.contentAsset(f.teacher,{...asset,eventId})).body.length>100);
  assert.equal(JSON.stringify([...f.repo.rows]),before);
 }
 assert.ok((await f.api.contentCatalogue(f.teacher)).questions.some(value=>value.id==='L6P5' && value.title==='Twist and Bump'));
 await assert.rejects(f.api.questionContent(f.teacher,{...question,eventId:'catalogue-U6'}),{status:404});
 await assert.rejects(f.api.questionContent(f.teacher,{...question,eventId:'catalogue-bad'}),{status:404});
});

for(const change of ['locked','release','ended','logout','expired'])test(`content and assets reject ${change} authority`,async()=>{
 const f=await fixture();await f.api.start(f.player);f.setTime(200000);
 if(change==='locked')await f.api.breach(f.player,{epoch:2});
 if(change==='release')await f.api.teamRelease(f.teacher,{eventId:f.event.id,teamId:f.team.id,confirm:true});
 if(change==='ended')await f.api.eventEnd(f.teacher,{eventId:f.event.id,expectedRevision:2,confirm:true});
 if(change==='logout')await f.api.logout(f.player);
 if(change==='expired')f.setTime(100000+8*60*60*1000);
 for(const read of [()=>f.api.questionContent(f.player,question),()=>f.api.contentAsset(f.player,asset)])await assert.rejects(read(),error=>[401,403,423].includes(error.status));
});

for(const change of ['locked','deadline'])test(`a ${change} race during content authorization cannot return bytes or payload`,async()=>{
 const f=await fixture();await f.api.start(f.player);f.setTime(200000);
 const get=f.repo.get.bind(f.repo);let count=0;
 f.repo.get=async(p,r)=>{
  if(p===f.pk && r==='team' && ++count===2){if(change==='locked')await f.api.breach(f.player,{epoch:2});else f.setTime(300000);}
  return get(p,r);
 };
 await assert.rejects(f.api.questionContent(f.player,question),error=>[403,423].includes(error.status));
});

test('status-only start/session/resume/hydrate never return timed prompts, revelations, GC traces or captures',async()=>{
 for(const year of ['L6','U5']){
  const f=await fixture('draft',year);await f.api.start(f.player);f.setTime(200000);
  if(year==='L6')await f.api.action(f.player,{questionId:'L6P3',requestId:'content-active-timed',action:{type:'start'}});
  else await f.api.action(f.player,{questionId:'U5P5',requestId:'content-active-gc',action:{type:'gc-run',sample:'citrus',concentration:12.5}});
  for(const value of [await f.api.session(f.player),await f.api.hydrate(f.player)]){
   const text=JSON.stringify(value);for(const key of ['gcTraces','interaction','formula','revealed','activeRun','privateState'])assert.ok(!text.includes('"'+key+'"'),key);
  }
  const selected=await f.api.question(f.player,{questionId:year==='L6'?'L6P3':'U5P5'});assert.ok(selected.attempt.interaction);
  const locked=await f.api.breach(f.player,{epoch:2}),grant=await f.api.recovery(f.player,{code:'5678',expectedEpoch:locked.competition.epoch});
  const resumed=await f.api.resume(f.player,{grant:grant.grant,expectedEpoch:locked.competition.epoch});
  assert.ok(Object.values(resumed.hydration.questions).every(value=>!value.data && !value.attempt.interaction));
 }
});

test('historical scientific feedback keys never escape bulk status before or after opening',async()=>{
 const f=await fixture('draft');
 await f.repo.write({partitionKey:f.pk,rowKey:'q-L6P4',kind:'question',questionId:'L6P4',revision:7,state:{answers:{HOMO1:'1'},feedback:{HOMO:false,LUMO:true,'private old clue':false},retryAt:250000,solvedAt:null},privateState:{}});
 const started=await f.api.start(f.player);
 const safe=value=>{const text=JSON.stringify(value);for(const marker of ['HOMO','LUMO','private old clue'])assert.ok(!text.includes(marker));};
 safe(started);safe(await f.api.session(f.player));
 f.setTime(200000);const hydrated=await f.api.hydrate(f.player);safe(hydrated);
 assert.deepEqual(hydrated.questions.L6P4.attempt.feedback,{question:false});
 assert.equal(hydrated.questions.L6P4.revision,7);assert.equal(hydrated.questions.L6P4.attempt.retryAt,250000);
 const locked=await f.api.breach(f.player,{epoch:2}),grant=await f.api.recovery(f.player,{code:'5678',expectedEpoch:locked.competition.epoch});
 safe(await f.api.resume(f.player,{grant:grant.grant,expectedEpoch:locked.competition.epoch}));
 assert.deepEqual((await f.repo.get(f.pk,'q-L6P4')).state.feedback,{HOMO:false,LUMO:true,'private old clue':false});
});

test('practical content infrastructure enforces its independent window; closed result reads contain numeric results only',async()=>{
 const f=await fixture('draft');await f.api.start(f.player);
 await assert.rejects(f.api.practicalContent(f.player,{contentId:'L6'}),{status:403});
 f.setTime(350000);
 assert.equal((await f.api.practicalContent(f.player,{contentId:'L6'})).id,'L6');
 await f.api.practicalSave(f.player,{requestId:'content-practical-save',expectedRevision:0,changes:{numPracticalResponse3:'12.34'}});
 f.setTime(400000);
 await assert.rejects(f.api.practicalContent(f.player,{contentId:'L6'}),{status:403});
 const result=await f.api.practical(f.player,{});assert.equal(result.readOnly,true);assert.equal(result.responses.numPracticalResponse3.text,'12.34');assert.equal(result.presentation,undefined);
});

test('POST HTTP and Azure transport return actual no-store nosniff SVG bytes with existing origin/session handling',async()=>{
 const f=await fixture();const headers={origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:'__Host-olympiad-session='+f.teacher};
 const req={method:'POST',params:{action:'content-asset'},headers,body:{...asset,eventId:'catalogue-L6'}};
 const result=await handle(req,()=>f.api);
 assert.equal(result.status,200);assert.equal(result.isRaw,true);assert.ok(Buffer.isBuffer(result.body));assert.match(result.body.toString('utf8'),/^<svg/);
 assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.headers['X-Content-Type-Options'],'nosniff');assert.equal(result.headers['Content-Type'],'image/svg+xml');
 assert.equal((await handle({...req,method:'GET'},()=>f.api)).status,404);
 assert.equal((await handle({...req,headers:{...headers,origin:'https://wrong.example'}},()=>f.api)).status,403);
 assert.equal((await handle({...req,headers:{...headers,cookie:''}},()=>f.api)).status,401);
});

test('L6P5 text/Unicode, typed labels and exact SVG geometry are preserved; record validation rejects missing renderer fields',()=>{
 const record=presentationRecord('question','L6P5');
 assert.equal(record.presentation.captions[1],'Conformation: 0'+String.fromCharCode(176));
 assert.equal(record.presentation.captions[3],'Conformation: 180'+String.fromCharCode(176));
 for(const [index,type] of [[0,'example'],[1,'question']]){
  assert.deepEqual(record.assets[index].body,readFileSync(new URL('../../src/questions/l6p5/assets/newman-'+type+'-geometry.svg',import.meta.url)));
  assert.deepEqual(record.presentation[type+'Labels'],JSON.parse(readFileSync(new URL('../../src/questions/l6p5/assets/newman-'+type+'-labels.json',import.meta.url),'utf8')));
 }
 assert.throws(()=>validateRecord({...record,presentation:{...record.presentation,paragraphs:[]}}));
 assert.throws(()=>fixedAsset('../path','image/svg+xml',new URL('../src/presentation/assets/l6p5/newman-example-geometry.svg',import.meta.url)));
});

test('trusted SVG audit rejects active content, external references and embedded images before registry delivery',()=>{
 const folder=mkdtempSync(join(tmpdir(),'sjs-presentation-audit-')),file=join(folder,'audit.svg'),url=pathToFileURL(file);
 try{
  for(const fragment of ['<script>alert(1)</script>','<foreignObject/>','<g onload="alert(1)"/>','<image href="https://external.example/diagram.svg"/>','<use href="#shape"/>','<style>path{fill:url(https://external.example/x)}</style>','<style>@import "https://external.example/x";</style>','<!ENTITY x SYSTEM "file:///private">','<image href="data:image/svg+xml;base64,PHN2Zy8+"/>','<?xml-stylesheet href="https://external.example/x"?>']){
   writeFileSync(file,'<svg xmlns="http://www.w3.org/2000/svg">'+fragment+'</svg>');
   assert.throws(()=>fixedAsset('audit','image/svg+xml',url),/Unsafe presentation SVG/);
  }
  writeFileSync(file,'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L1 1"/></svg>');
  assert.ok(fixedAsset('audit','image/svg+xml',url).body.length>0);
  assert.throws(()=>fixedAsset('audit','text/html',url));
  assert.throws(()=>fixedAsset('audit','image/svg+xml',new URL('https://external.example/diagram.svg')));
 }finally{unlinkSync(file);rmdirSync(folder);}
});
