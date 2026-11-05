import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';

async function fixture(){
 const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token;
 const input={name:'Synthetic school event',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'create-school-event'};
 const state=await api.eventCreate(staff,input),event=state.events[0];
 const school=(await api.schoolCreate(staff,{name:'Example School',requestId:'create-example-school'})).school;
 return {repo,api,staff,input,event,school};
}
const ensure=(f,targetCount,requestId='school-count-request')=>f.api.schoolTeams(f.staff,{eventId:f.event.id,schoolId:f.school.id,targetCount,requestId});

test('new event host setup and event creation retries are idempotent; schools have unique normalized permanent IDs',async()=>{
 const f=await fixture(),again=await f.api.eventCreate(f.staff,f.input);
 assert.equal(again.createdEventId,f.event.id);assert.equal((await f.api.teams(f.staff,{eventId:f.event.id})).teams.length,4);
 assert.equal(again.events[0].hostSetup.status,'complete');
 const host=(await f.api.schools(f.staff)).schools.find(s=>s.isHostSchool);assert.equal(host.id,'host-st-johns');
 await assert.rejects(f.api.schoolCreate(f.staff,{name:'  Ｅxample   School ',requestId:'duplicate-school-request'}),{status:409});
 await assert.rejects(f.api.schoolCreate(f.staff,{name:'St John’s',requestId:'duplicate-host-request'}),{status:409});
 assert.equal((await f.api.schoolCreate(f.staff,{name:'Example School',requestId:'create-example-school'})).school.id,f.school.id);
 await assert.rejects(f.api.eventCreate(f.staff,{...f.input,name:'Changed'}),{status:409});
});

test('target counts preserve existing gameplay and permanently reserve deleted numbers',async()=>{
 const f=await fixture(),first=await ensure(f,2),teams=first.teams.filter(t=>t.schoolId===f.school.id);
 assert.deepEqual(teams.map(t=>t.name),['Example School 1','Example School 2']);assert.notEqual(teams[0].id,teams[1].id);
 const player=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(player.token,{teamId:teams[0].id});await f.api.start(player.token);
 await f.api.submit(player.token,{questionId:'L6P8',requestId:'school-correct-answer',answers:{answer:'0.437'}});
 const before=await f.repo.get(f.event.id+'-'+teams[0].id,'team');
 await ensure(f,3,'increase-count-request');
 assert.deepEqual(await f.repo.get(before.partitionKey,'team'),before);
 await assert.rejects(ensure(f,1,'reduce-count-request'),{status:409});
 await f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:teams[1].id,teamName:teams[1].name,requestId:'delete-unused-team',confirm:true});
 const increased=(await ensure(f,3,'replace-count-request')).teams.filter(t=>t.schoolId===f.school.id);
 assert.deepEqual(increased.map(t=>t.teamNumber),[1,3,4]);
 await ensure(f,2); // Original successful operation is replayed, not reinterpreted against today's roster.
 assert.equal((await f.api.teams(f.staff,{eventId:f.event.id})).teams.filter(t=>t.schoolId===f.school.id).length,3);
 for(const count of [0,51,1.5,'2'])await assert.rejects(ensure(f,count,'invalid-count-'+String(count)),{status:400});
});

test('partial storage failure exposes durable progress; concurrent and lost-response retries create no duplicate or resurrected teams',async()=>{
 const f=await fixture(),original=f.repo.batch;let failed=false;
 f.repo.batch=async ops=>{if(!failed && ops.some(op=>op.entity.kind==='team' && op.entity.schoolId===f.school.id && op.entity.teamNumber===2)){failed=true;throw Error('Injected storage failure');}return original(ops);};
 await assert.rejects(ensure(f,2),/Injected/);
 const status=await f.api.schools(f.staff,{eventId:f.event.id});assert.equal(status.progress[0].completed,1);assert.equal(status.progress[0].total,2);
 const first=(await f.api.teams(f.staff,{eventId:f.event.id})).teams.find(t=>t.schoolId===f.school.id);
 await f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:first.id,teamName:first.name,requestId:'delete-partial-team',confirm:true});
 await Promise.all([ensure(f,2),ensure(f,2)]);
 const teams=(await f.api.teams(f.staff,{eventId:f.event.id})).teams.filter(t=>t.schoolId===f.school.id);
 assert.deepEqual(teams.map(t=>t.teamNumber),[2]);assert.equal(await f.repo.get(f.event.id+'-'+first.id,'team'),null);
 assert.deepEqual((await f.api.schools(f.staff,{eventId:f.event.id})).progress,[]);
 await assert.rejects(ensure(f,3),{status:409});
 const attempts=await Promise.allSettled([ensure(f,3,'concurrent-plan-one'),ensure(f,3,'concurrent-plan-two')]);assert.ok(attempts.some(a=>a.status==='fulfilled'));
 assert.equal((await f.api.teams(f.staff,{eventId:f.event.id})).teams.filter(t=>t.schoolId===f.school.id).length,3);
});

test('failed host creation remains visible, blocks activation, and resumes without a second event',async()=>{
 const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token,original=repo.batch;let fail=true;
 repo.batch=async ops=>{if(fail && ops.some(op=>op.entity.kind==='team'))throw Error('Injected host failure');return original(ops);};
 const input={name:'Host failure event',year:'L5',theoryStartsAt:0,theoryEndsAt:900000,requestId:'host-failure-request'},created=await api.eventCreate(staff,input),event=created.events[0];
 assert.equal(event.hostSetup.status,'pending');assert.equal((await api.schools(staff,{eventId:event.id})).progress[0].completed,0);
 await assert.rejects(api.eventActivate(staff,{eventId:event.id,expectedRevision:1}),{status:409});
 fail=false;const resumed=await api.eventCreate(staff,input);assert.equal(resumed.createdEventId,event.id);assert.equal(resumed.events.length,1);assert.equal(resumed.events[0].hostSetup.status,'complete');assert.equal((await api.teams(staff,{eventId:event.id})).teams.length,4);
});

test('linking and rename derive current names in claimed sessions, leaderboard and completed results without changing IDs or gameplay',async()=>{
 const f=await fixture(),added=await f.api.teamAdd(f.staff,{eventId:f.event.id,name:'Legacy synthetic team'}),team=added.teams.find(t=>t.name==='Legacy synthetic team');
 const player=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(player.token,{teamId:team.id});await f.api.start(player.token);await f.api.submit(player.token,{questionId:'L6P8',requestId:'legacy-correct-answer',answers:{answer:'0.437'}});
 const before=await f.repo.get(f.event.id+'-'+team.id,'team');
 const input={eventId:f.event.id,schoolId:f.school.id,teamId:team.id,teamNumber:7,requestId:'link-legacy-request'};
 await Promise.all([f.api.schoolLink(f.staff,input),f.api.schoolLink(f.staff,input)]);
 const linked=await f.repo.get(before.partitionKey,'team');for(const field of ['teamId','score','claimGeneration','securityEpoch','owner','lastScoringAt'])assert.equal(linked[field],before[field]);assert.equal(Object.hasOwn(linked,'name'),false);
 const rename={schoolId:f.school.id,name:'Renamed School',expectedRevision:1,requestId:'rename-school-request'};
 await f.api.schoolRename(f.staff,rename);await f.api.schoolRename(f.staff,rename);
 assert.equal((await f.api.session(player.token)).team.name,'Renamed School 7');assert.equal((await f.api.leaderboard(f.staff)).entries[0].name,'Renamed School 7');
 await f.api.eventEnd(f.staff,{eventId:f.event.id,expectedRevision:1,confirm:true});
 await f.api.schoolRename(f.staff,{...rename,name:'Historical Rename',expectedRevision:2,requestId:'rename-historical-request'});
 assert.equal((await f.api.teams(f.staff,{eventId:f.event.id})).teams.find(t=>t.id===team.id).name,'Historical Rename 7');
 await assert.rejects(f.api.schoolLink(f.staff,{...input,requestId:'ended-link-request'}),{status:409});await assert.rejects(ensure(f,4,'ended-count-request'),{status:409});
});

test('year reset preserves school metadata, permanent team IDs and allocation high water but resets gameplay',async()=>{
 const f=await fixture(),created=(await ensure(f,2)).teams.filter(t=>t.schoolId===f.school.id);
 await f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:created[1].id,teamName:created[1].name,requestId:'delete-before-year',confirm:true});
 const changed=await f.api.eventChangeYear(f.staff,{eventId:f.event.id,year:'U6',expectedRevision:1,requestId:'school-year-request',confirm:true});
 const next={...f,event:changed.events[0]};const teams=(await ensure(next,2,'after-year-request')).teams.filter(t=>t.schoolId===f.school.id);
 assert.deepEqual(teams.map(t=>t.teamNumber),[1,3]);assert.equal(teams[0].id,created[0].id);assert.equal(teams[0].schoolId,f.school.id);assert.equal(teams[0].year,'U6');assert.equal(teams[0].score,0);
});

test('school endpoints are teacher-only, use production HTTP dispatch, and retain competitor field privacy',async()=>{
 const f=await fixture(),player=await f.api.login({role:'competitor',code:'1234'});
 for(const [method,input] of [['schools',{}],['schoolCreate',{name:'Unauthorised',requestId:'unauthorised-school'}],['schoolRename',{schoolId:f.school.id,name:'Unauthorised',expectedRevision:1,requestId:'unauthorised-rename'}],['schoolTeams',{eventId:f.event.id,schoolId:f.school.id,targetCount:2,requestId:'unauthorised-teams'}],['schoolLink',{}],['schoolResume',{}],['eventSetup',{eventId:f.event.id}]])await assert.rejects(f.api[method](player.token,input),{status:403});
 const response=await handle({method:'POST',params:{action:'school-teams'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:'__Host-olympiad-session='+f.staff},body:{eventId:f.event.id,schoolId:f.school.id,targetCount:2,requestId:'http-school-request'}},()=>f.api);assert.equal(response.status,200);
 const publicTeams=(await f.api.teams(player.token)).teams;assert.ok(publicTeams.every(t=>!('score' in t) && !('hasSubmittedActivity' in t) && !('owner' in t)));
});

test('conflicting concurrent links release the failed plan but permanently reserve both chosen numbers',async()=>{
 const f=await fixture(),other=(await f.api.schoolCreate(f.staff,{name:'Second School',requestId:'second-school-request'})).school;
 const team=(await f.api.teamAdd(f.staff,{eventId:f.event.id,name:'Legacy link race'})).teams.find(t=>t.name==='Legacy link race');
 const requests=[f.school.id,other.id].map((schoolId,i)=>({eventId:f.event.id,schoolId,teamId:team.id,teamNumber:5,requestId:'racing-link-request-'+i}));
 const original=f.repo.write;let release,ready;const gate=new Promise(resolve=>release=resolve),reached=new Promise(resolve=>ready=resolve);
 f.repo.write=async(entity,etag)=>{if(entity.schoolLinkRequestId===requests[0].requestId){ready();await gate;}return original(entity,etag);};
 const first=f.api.schoolLink(f.staff,requests[0]);first.catch(()=>{});await reached;const second=f.api.schoolLink(f.staff,requests[1]);await second;release();
 const results=await Promise.allSettled([first,second]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 assert.deepEqual((await f.api.schools(f.staff,{eventId:f.event.id})).progress,[]);
 for(const [i,schoolId] of [f.school.id,other.id].entries()){
  const current=(await f.api.teams(f.staff,{eventId:f.event.id})).teams.filter(t=>t.schoolId===schoolId).length;
  await f.api.schoolTeams(f.staff,{eventId:f.event.id,schoolId,targetCount:current+1,requestId:'after-racing-link-'+i});
  assert.ok((await f.api.teams(f.staff,{eventId:f.event.id})).teams.some(t=>t.schoolId===schoolId && t.teamNumber===6));
 }
});

test('interrupted year reset persists validated resume input and fences concurrent roster changes across service recycling',async()=>{
 const f=await fixture();await ensure(f,2);
 const input={eventId:f.event.id,year:'U6',expectedRevision:1,requestId:'resumable-year-reset',confirm:true};
 await assert.rejects(f.api.eventChangeYear(f.staff,{...input,name:''}),{status:400});assert.equal((await f.api.events(f.staff)).events[0].rosterResetInput,undefined);
 const original=f.repo.write;let failed=false;f.repo.write=async(entity,etag)=>{if(!failed && entity.kind==='team' && entity.eventId.startsWith('year-')){failed=true;throw Error('Injected staging failure');}return original(entity,etag);};
 await assert.rejects(f.api.eventChangeYear(f.staff,input),/Injected/);
 const saved=(await f.api.events(f.staff)).events[0].rosterResetInput;assert.deepEqual(saved,input);
 await assert.rejects(ensure(f,3,'during-year-request'),{status:409});await assert.rejects(f.api.eventUpdate(f.staff,{eventId:f.event.id,expectedRevision:1,name:'Race edit'}),{status:409});
 const restarted=createService(f.repo,{},()=>100000),result=await restarted.eventChangeYear(f.staff,saved);assert.equal(result.events[0].year,'U6');assert.equal(result.events[0].rosterResetInput,undefined);
 assert.equal((await restarted.teams(f.staff,{eventId:result.createdEventId})).teams.filter(t=>t.schoolId===f.school.id).length,2);
});

test('host identity survives rename and still creates four teams in the next event',async()=>{
 const f=await fixture(),host=(await f.api.schools(f.staff)).schools.find(s=>s.isHostSchool);
 await f.api.schoolRename(f.staff,{schoolId:host.id,name:'Renamed Host',expectedRevision:1,requestId:'rename-host-request'});
 await f.api.eventEnd(f.staff,{eventId:f.event.id,expectedRevision:1,confirm:true});
 const next=await f.api.eventCreate(f.staff,{...f.input,name:'Next event',requestId:'next-host-event-request'});
 const teams=(await f.api.teams(f.staff,{eventId:next.createdEventId})).teams;assert.deepEqual(teams.map(t=>t.name),['Renamed Host 1','Renamed Host 2','Renamed Host 3','Renamed Host 4']);assert.ok(teams.every(t=>t.schoolId===host.id));
});

test('legacy name reservations fence a concurrent school rename and are released after permanent deletion',async()=>{
 const f=await fixture();await ensure(f,2);
 const original=f.repo.batch;let checked=false;
 f.repo.batch=async ops=>{if(!checked && ops.some(op=>op.entity.kind==='team' && op.entity.name==='Collision 1')){checked=true;await assert.rejects(f.api.schoolRename(f.staff,{schoolId:f.school.id,name:'Collision',expectedRevision:1,requestId:'collision-rename-request'}),{status:409});}return original(ops);};
 const added=await f.api.teamAdd(f.staff,{eventId:f.event.id,name:'Collision 1'}),team=added.teams.find(t=>t.name==='Collision 1');assert.equal(checked,true);
 await f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:team.id,teamName:team.name,requestId:'delete-collision-team',confirm:true});
 const renamed=await f.api.schoolRename(f.staff,{schoolId:f.school.id,name:'Collision',expectedRevision:1,requestId:'after-collision-rename'});assert.equal(renamed.school.name,'Collision');
 await assert.rejects(f.api.schoolLink(f.staff,{eventId:f.event.id,schoolId:f.school.id,teamId:team.id,teamNumber:1,requestId:'used-link-number'}),{status:409});
});

test('a deletion holding an old ETag cannot resurrect its team through concurrent year-reset staging',async()=>{
 const f=await fixture(),team=(await ensure(f,2)).teams.find(t=>t.schoolId===f.school.id),input={eventId:f.event.id,teamId:team.id,teamName:team.name,requestId:'delete-during-reset',confirm:true};
 const original=f.repo.batch;let changed,intercepted=false;
 f.repo.batch=async ops=>{if(!intercepted && ops.some(op=>op.entity.kind==='team' && op.entity.teamId===team.id && op.entity.removed)){intercepted=true;changed=await f.api.eventChangeYear(f.staff,{eventId:f.event.id,year:'U6',expectedRevision:1,requestId:'reset-during-delete',confirm:true});}return original(ops);};
 await assert.rejects(f.api.teamDelete(f.staff,input),{status:404});assert.equal(intercepted,true);
 // Reset won the fence; no deletion was accepted. The fresh team remains available
 // for an explicitly confirmed deletion in the newly selected event.
 const fresh=(await f.api.teams(f.staff,{eventId:changed.createdEventId})).teams.find(t=>t.id===team.id);assert.ok(fresh);
 const removed=await f.api.teamDelete(f.staff,{...input,eventId:changed.createdEventId,requestId:'delete-after-reset'});assert.equal(removed.outcome,'deleted');
 assert.equal((await f.api.teams(f.staff,{eventId:changed.createdEventId})).teams.some(t=>t.id===team.id),false);
});

test('a deletion winning before the old-row staging fence is omitted from the replacement roster',async()=>{
 const f=await fixture(),team=(await ensure(f,2)).teams.find(t=>t.schoolId===f.school.id),batch=f.repo.batch,write=f.repo.write;
 let ready,release,deletion;const reached=new Promise(resolve=>ready=resolve),gate=new Promise(resolve=>release=resolve);let intercepted=false;
 f.repo.batch=async ops=>{if(!intercepted && ops.some(op=>op.entity.kind==='team' && op.entity.teamId===team.id && op.entity.removed)){intercepted=true;ready();await gate;}return batch(ops);};
 f.repo.write=async(entity,etag)=>{if(entity.kind==='team' && entity.teamId===team.id && entity.rosterResetFingerprint){release();await deletion;}return write(entity,etag);};
 deletion=f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:team.id,teamName:team.name,requestId:'delete-winning-reset',confirm:true});await reached;
 const changed=await f.api.eventChangeYear(f.staff,{eventId:f.event.id,year:'U6',expectedRevision:1,requestId:'reset-after-deletion',confirm:true});assert.equal((await deletion).outcome,'deleted');
 assert.equal((await f.api.teams(f.staff,{eventId:changed.createdEventId})).teams.some(t=>t.id===team.id),false);
});
