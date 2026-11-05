import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';
async function fixture(){const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token;const event=(await api.eventCreate(staff,{name:'Synthetic event',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'manage-event-create'})).events[0];const school=(await api.schoolCreate(staff,{name:'Synthetic School',requestId:'manage-school-create'})).school;return {repo,api,staff,event,school};}
const removal=f=>({schoolId:f.school.id,expectedRevision:f.school.revision,requestId:'manage-delete-school',confirm:true});
const target=f=>({eventId:f.event.id,schoolId:f.school.id,targetCount:2,requestId:'manage-create-teams'});
test('school deletion requires teacher, confirmation, matching revision and a nonhost school; HTTP dispatch works',async()=>{
 const f=await fixture(),player=await f.api.login({role:'competitor',code:'1234'});
 await assert.rejects(f.api.schoolDelete(player.token,removal(f)),{status:403});
 await assert.rejects(f.api.schoolDelete(f.staff,{...removal(f),confirm:false}),{status:400});
 await assert.rejects(f.api.schoolDelete(f.staff,{...removal(f),expectedRevision:99}),{status:409});
 await assert.rejects(f.api.schoolDelete(f.staff,{...removal(f),schoolId:'host-st-johns'}),{status:409});
 const req={method:'POST',params:{action:'school-delete'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json'},body:removal(f)};
 assert.equal((await handle(req,()=>f.api)).status,401);
 assert.equal((await handle({...req,headers:{...req.headers,cookie:'__Host-olympiad-session='+f.staff}},()=>f.api)).status,200);
 const first=await f.repo.get('system','schools');await f.api.schoolDelete(f.staff,removal(f));assert.deepEqual(await f.repo.get('system','schools'),first);
 await assert.rejects(f.api.schoolDelete(f.staff,{...removal(f),expectedRevision:2}),{status:409});
 await assert.rejects(f.api.schoolTeams(f.staff,target(f)),{status:409});
 await assert.rejects(f.api.schoolRename(f.staff,{schoolId:f.school.id,name:'Changed',expectedRevision:2,requestId:'deleted-rename-test'}),{status:409});
 await assert.rejects(f.api.schoolColours(f.staff,{schoolId:f.school.id,colours:['#123456'],expectedRevision:2,requestId:'deleted-colours-test'}),{status:409});
});
test('school deletion refuses unfinished teams but retains completed results and historical display names',async()=>{
 const f=await fixture();await f.api.schoolTeams(f.staff,target(f));
 await assert.rejects(f.api.schoolDelete(f.staff,removal(f)),{status:409});
 const before=(await f.api.teams(f.staff,{eventId:f.event.id})).teams;
 await f.api.eventEnd(f.staff,{eventId:f.event.id,expectedRevision:f.event.revision,confirm:true});
 await f.api.schoolDelete(f.staff,removal(f));
 assert.deepEqual((await f.api.teams(f.staff,{eventId:f.event.id})).teams,before);
 assert.equal((await f.api.schools(f.staff)).schools.find(s=>s.id===f.school.id).deleted,true);
 await assert.rejects(f.api.schoolCreate(f.staff,{name:f.school.name,requestId:'reuse-deleted-school'}),{status:409});
});
test('concurrent school allocation fences deletion and incomplete setup prevents deletion',async()=>{
 const f=await fixture();
 f.repo.beforeBatch=async()=>{await f.api.schoolTeams(f.staff,target(f));};
 await assert.rejects(f.api.schoolDelete(f.staff,removal(f)),{status:409});
 assert.equal((await f.api.schools(f.staff)).schools.find(s=>s.id===f.school.id).deleted,undefined);
 const g=await fixture();const original=g.repo.batch;let fail=true;g.repo.batch=async ops=>{if(fail && ops.some(op=>op.entity.kind==='team' && op.entity.schoolId===g.school.id)){fail=false;throw Error('simulated materialization failure');}return original(ops);};
 await assert.rejects(g.api.schoolTeams(g.staff,target(g)),/simulated/);
 await assert.rejects(g.api.schoolDelete(g.staff,removal(g)),{status:409});
 await g.api.schoolTeams(g.staff,target(g));assert.equal((await g.api.teams(g.staff,{eventId:g.event.id})).teams.filter(t=>t.schoolId===g.school.id).length,2);
});
test('lost release response replay cannot revoke a new claim and mismatched or stale operations fail',async()=>{
 const f=await fixture();await f.api.schoolTeams(f.staff,target(f));const team=(await f.api.teams(f.staff,{eventId:f.event.id})).teams.find(t=>t.schoolId===f.school.id);
 const first=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(first.token,{teamId:team.id});await f.api.start(first.token);await f.api.submit(first.token,{questionId:'L6P8',requestId:'manage-wrong-answer',answers:{answer:'0'}});
 const input={eventId:f.event.id,teamId:team.id,confirm:true,requestId:'manage-release-one',expectedClaimGeneration:team.claimGeneration};
 await f.api.teamRelease(f.staff,input);const second=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(second.token,{teamId:team.id});
 const before=await f.repo.get(f.event.id+'-'+team.id,'team');await f.api.teamRelease(f.staff,input);assert.deepEqual(await f.repo.get(before.partitionKey,'team'),before);assert.equal((await f.api.session(second.token)).team.id,team.id);
 await assert.rejects(f.api.session(first.token),{status:401});
 await assert.rejects(f.api.teamRelease(f.staff,{...input,requestId:'stale-release-request'}),{status:409});
 await assert.rejects(f.api.teamRelease(f.staff,{...input,expectedClaimGeneration:1}),{status:409});
 assert.ok((await f.repo.get(before.partitionKey,'q-L6P8')).state.retryAt>0);
});
test('release receipt and ownership change commit atomically; completed events remain read-only',async()=>{
 const f=await fixture(),team=(await f.api.teams(f.staff,{eventId:f.event.id})).teams[0],input={eventId:f.event.id,teamId:team.id,confirm:true,requestId:'atomic-release-test',expectedClaimGeneration:team.claimGeneration};
 const before=await f.repo.get(f.event.id+'-'+team.id,'team');f.repo.failBatch=true;await assert.rejects(f.api.teamRelease(f.staff,input),/Storage/);f.repo.failBatch=false;assert.deepEqual(await f.repo.get(before.partitionKey,'team'),before);assert.equal(await f.repo.get(before.partitionKey,'release-'+input.requestId),null);
 await f.api.eventEnd(f.staff,{eventId:f.event.id,expectedRevision:f.event.revision,confirm:true});await assert.rejects(f.api.teamRelease(f.staff,input),{status:409});
});
