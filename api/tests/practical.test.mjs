import test from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/service.mjs';
import { memoryRepository } from './helpers.mjs';
import { handle } from '../src/http.mjs';

async function fixture(year='L6') {
  const repo=memoryRepository();let time=100000;
  const api=createService(repo,{},()=>time);
  const teacher=(await api.login({role:'teacher',code:'5678'})).token;
  const created=await api.eventCreate(teacher,{name:'Practical '+year,year,theoryStartsAt:200000,theoryEndsAt:600000,practicalStartsAt:90000,practicalEndsAt:300000});
  const eventId=created.createdEventId;
  await api.eventActivate(teacher,{eventId,expectedRevision:1});
  await api.teamAdd(teacher,{eventId,name:'Practical team'});
  const teamId=(await api.teams(teacher,{eventId})).teams[0].id;
  const player=(await api.login({role:'competitor',code:'1234'})).token;
  await api.claim(player,{teamId});
  const start=()=>api.start(player);
  const save=(changes,expectedRevision=0,requestId='practical-request-0001',token=player)=>api.practicalSave(token,{eventId,changes,expectedRevision,requestId});
  const edit=async changes=>{const event=(await api.events(teacher)).events.find(e=>e.id===eventId);return api.eventUpdate(teacher,{eventId,expectedRevision:event.revision,...changes});};
  return {api,repo,teacher,player,eventId,teamId,pk:eventId+'-'+teamId,start,save,edit,setTime:value=>{time=value;}};
}

for(const [year,fields] of [['L5',[1,2,3,4]],['L6',[3,4]],['U6',[1,2,3,4]]])test(year+' retains original practical identifiers and precise numeric/scientific text',async()=>{
  const f=await fixture(year);await f.start();
  const view=await f.api.practical(f.player,{});
  assert.deepEqual(Object.keys(view.responses),fields.map(n=>'numPracticalResponse'+n));
  assert.equal(view.revision,0);assert.equal(view.updatedAt,null);assert.equal(view.finalField,'numPracticalResponse4');
  const changes=Object.fromEntries(fields.map(n=>['numPracticalResponse'+n,n===4?' 0.000E+02 ':'1.2300e-4']));
  const saved=await f.save(changes);
  assert.equal(saved.responses.numPracticalResponse4.text,' 0.000E+02 ');
  assert.equal(saved.responses.numPracticalResponse4.value,0);
  assert.equal(saved.responses['numPracticalResponse'+fields[0]].value,0.000123);
  assert.equal(saved.eventEndsAt,300000);assert.equal(saved.readOnly,false);
  assert.deepEqual(await f.api.practical(f.player,{}),saved);
  const team=(await f.api.teams(f.teacher,{eventId:f.eventId})).teams[0];
  assert.equal(team.practical.revision,1);assert.equal(team.practical.responses.numPracticalResponse4.value,0);
  assert.equal(team.score,0);assert.equal(team.hasSubmittedActivity,true);
  assert.equal((await f.repo.get(f.pk,'team')).lastScoringAt,null);
});

test('incremental edits, null clear, blank final and zero final remain distinct without locking',async()=>{
  const f=await fixture();await f.start();
  assert.equal((await f.api.teams(f.teacher,{eventId:f.eventId})).teams[0].practical,null);
  const first=await f.save({numPracticalResponse3:'12.30'});
  assert.equal(first.responses.numPracticalResponse4,null);
  const second=await f.save({numPracticalResponse4:'0'},1,'practical-second-0002');
  assert.equal(second.responses.numPracticalResponse3.text,'12.30');
  assert.equal(second.responses.numPracticalResponse4.value,0);
  const third=await f.save({numPracticalResponse3:null,numPracticalResponse4:null},2,'practical-clear-00003');
  assert.equal(third.revision,3);assert.equal(third.responses.numPracticalResponse4,null);
  assert.equal((await f.repo.get(f.pk,'team')).hasSubmittedActivity,true);
  assert.equal((await f.api.leaderboard(f.teacher)).entries.length,0);
  assert.equal((await f.save({numPracticalResponse4:'9.10'},3,'practical-edit-000004')).revision,4);
});

test('invalid fields and numbers reject the whole save without a receipt or partial state',async()=>{
  const f=await fixture();await f.start();
  for(const value of ['', ' ', 'NaN', 'Infinity','0x10','12,3','1e101','1e-999','1'.repeat(81),1,{},undefined]) {
    await assert.rejects(f.save({numPracticalResponse3:'12',numPracticalResponse4:value}),{status:400});
  }
  for(const changes of [{numPracticalResponse1:'1'},{unknown:'1'},[],{},null])await assert.rejects(f.save(changes),{status:400});
  assert.equal((await f.api.practical(f.player,{})).revision,0);
  assert.equal(await f.repo.get(f.pk,'receipt-practical-request-0001'),null);
  const u5=await fixture('U5');await u5.start();await assert.rejects(u5.api.practical(u5.player,{}),{status:404});
});

test('idempotency, stale revisions, concurrent changes and cross-operation request IDs conflict',async()=>{
  const f=await fixture();await f.start();
  const first=await f.save({numPracticalResponse3:'1.00'});
  assert.deepEqual(await f.save({numPracticalResponse3:'1.00'}),first);
  await assert.rejects(f.save({numPracticalResponse3:'1'}),{status:409});
  await assert.rejects(f.save({numPracticalResponse3:'1.00'},1),{status:409});
  await assert.rejects(f.save({numPracticalResponse4:'2'},0,'practical-stale-00001'),{status:409});
  const results=await Promise.allSettled([f.save({numPracticalResponse3:'3'},1,'practical-concur-0001'),f.save({numPracticalResponse4:'4'},1,'practical-concur-0002')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  f.setTime(210000);
  await assert.rejects(f.api.draft(f.player,{questionId:'L6P8',requestId:'practical-request-0001',expectedRevision:0,answers:{answer:'0'}}),{status:409});
  await f.api.draft(f.player,{questionId:'L6P8',requestId:'theory-request-000001',expectedRevision:0,answers:{answer:'0'}});
  await assert.rejects(f.save({numPracticalResponse4:'2'},2,'theory-request-000001'),{status:409});
});

test('independent practical windows, absent timing, security states and event/team binding fail closed',async()=>{
  const f=await fixture();
  await assert.rejects(f.api.practical(f.player,{}),{status:423});
  await assert.rejects(f.save({numPracticalResponse3:'1'}),{status:423});
  await f.start();
  await assert.rejects(f.api.practical(f.player,{eventId:'other'}),{status:403});
  f.setTime(89999);await assert.rejects(f.api.practical(f.player,{}),{status:403});
  await assert.rejects(f.save({numPracticalResponse3:'1'}),{status:403});
  f.setTime(90000);await f.save({numPracticalResponse3:'1'}); // Theory has not opened.
  f.setTime(300000);
  const closed=await f.api.practical(f.player,{});assert.equal(closed.readOnly,true);assert.equal(closed.revision,1);
  await assert.rejects(f.save({numPracticalResponse3:'2'},1,'practical-late-000001'),{status:403});
  f.setTime(600000);await assert.rejects(f.api.practical(f.player,{}),{status:403});
  f.setTime(100000);const state=await f.api.session(f.player);await f.api.breach(f.player,{epoch:state.competition.epoch});
  await assert.rejects(f.api.practical(f.player,{}),{status:423});await assert.rejects(f.save({numPracticalResponse3:'1'}),{status:423});
  const absent=await fixture();await absent.start();await absent.edit({practicalStartsAt:null,practicalEndsAt:null});
  await assert.rejects(absent.api.practical(absent.player,{}),{status:404});
  assert.equal((await absent.api.practical(absent.teacher,{eventId:absent.eventId})).eventEndsAt,null);
  const wrongYear=await fixture();await wrongYear.start();const team=await wrongYear.repo.get(wrongYear.pk,'team');await wrongYear.repo.write({...team,year:'U6'},team.etag);
  await assert.rejects(wrongYear.api.practical(wrongYear.player,{}),{status:403});
});

test('teacher catalogue and event preview are session-isolated and do not write real results',async()=>{
  const f=await fixture();
  const second=(await f.api.login({role:'teacher',code:'5678'})).token;
  await f.api.practicalSave(f.teacher,{eventId:'catalogue-L6',requestId:'preview-request-0001',expectedRevision:0,changes:{numPracticalResponse4:'0'}});
  assert.equal((await f.api.practical(second,{eventId:'catalogue-L6'})).revision,0);
  assert.equal((await f.api.practical(f.teacher,{eventId:f.eventId})).revision,0);
  assert.equal((await f.api.teams(f.teacher,{eventId:f.eventId})).teams[0].practical,null);
  await assert.rejects(f.api.practical(f.player,{eventId:'catalogue-L6'}),{status:403});
  await assert.rejects(f.api.practical(f.teacher,{eventId:'catalogue-U5'}),{status:404});
  await f.start();await f.save({numPracticalResponse4:'5.0'});
  const event=(await f.api.events(f.teacher)).events[0];await f.api.eventEnd(f.teacher,{eventId:f.eventId,expectedRevision:event.revision,confirm:true});
  assert.equal((await f.api.teams(f.teacher,{eventId:f.eventId})).teams[0].practical.responses.numPracticalResponse4.text,'5.0');
  await assert.rejects(f.save({numPracticalResponse4:'6'},1,'ended-practical-0001'),{status:403});
  assert.equal((await f.api.practicalSave(f.teacher,{eventId:f.eventId,requestId:'ended-preview-00001',expectedRevision:0,changes:{numPracticalResponse4:'99'}})).revision,1);
  assert.equal((await f.api.teams(f.teacher,{eventId:f.eventId})).teams[0].practical.responses.numPracticalResponse4.value,5);
});

test('release, in-tab interruption/recovery and deletion retain acknowledged responses and activity',async()=>{
  const f=await fixture();await f.start();await f.save({numPracticalResponse4:'0'});
  const locked=await f.api.session(f.player,{interrupt:true});
  await assert.rejects(f.api.practical(f.player,{}),{status:423});
  const grant=await f.api.recovery(f.player,{code:'5678',expectedEpoch:locked.competition.epoch});await f.api.resume(f.player,{grant:grant.grant,expectedEpoch:locked.competition.epoch});
  assert.equal((await f.api.practical(f.player,{})).responses.numPracticalResponse4.value,0);
  await f.api.teamRelease(f.teacher,{eventId:f.eventId,teamId:f.teamId,confirm:true});
  await assert.rejects(f.save({numPracticalResponse4:'4'},1,'released-request-0001'),{status:401});
  const second=(await f.api.login({role:'competitor',code:'1234'})).token;await f.api.claim(second,{teamId:f.teamId});await f.api.start(second);
  assert.equal((await f.api.practical(second,{})).revision,1);
  await f.api.practicalSave(second,{requestId:'clear-before-delete1',expectedRevision:1,changes:{numPracticalResponse4:null}});
  assert.equal((await f.api.teamDelete(f.teacher,{eventId:f.eventId,teamId:f.teamId,teamName:'Practical team',confirm:true,requestId:'delete-practical-001'})).outcome,'removed');
  assert.equal((await f.repo.get(f.pk,'team')).removed,true);assert.ok(await f.repo.get(f.pk,'practical'));
  await assert.rejects(f.api.practical(second,{}),{status:401});
});

test('atomic saves fail without partial rows and retries fence release, breach, deletion and deadlines',async()=>{
  const failed=await fixture();await failed.start();failed.repo.failBatch=true;
  await assert.rejects(failed.save({numPracticalResponse4:'7'}));failed.repo.failBatch=false;
  assert.equal((await failed.api.practical(failed.player,{})).revision,0);assert.equal((await failed.repo.get(failed.pk,'team')).hasSubmittedActivity,false);
  for(const race of ['release','breach','delete','deadline']) {
    const f=await fixture();await f.start();
    f.repo.beforeBatch=async()=>{
      if(race==='release')await f.api.teamRelease(f.teacher,{eventId:f.eventId,teamId:f.teamId,confirm:true});
      if(race==='breach'){const state=await f.api.session(f.player);await f.api.breach(f.player,{epoch:state.competition.epoch});}
      if(race==='delete')await f.api.teamDelete(f.teacher,{eventId:f.eventId,teamId:f.teamId,teamName:'Practical team',confirm:true,requestId:'delete-race-0000001'});
      if(race==='deadline'){f.setTime(300000);const team=await f.repo.get(f.pk,'team');await f.repo.write({...team},team.etag);}
    };
    await assert.rejects(f.save({numPracticalResponse4:'7'}),{status:race==='breach'?423:race==='deadline'?403:401});
    assert.equal(await f.repo.get(f.pk,'practical'),null);
  }
});

test('accepted schedule snapshot survives concurrent edits, subsequent practical saves use new times',async()=>{
  const f=await fixture();await f.start();
  f.repo.beforeBatch=()=>f.edit({practicalEndsAt:99999});
  assert.equal((await f.save({numPracticalResponse4:'2'})).revision,1);
  await assert.rejects(f.save({numPracticalResponse4:'3'},1,'practical-new-window1'),{status:403});
});

test('practical autosaves preserve theory ranking and a winning save makes concurrent deletion retain activity',async()=>{
  const f=await fixture();await f.start();f.setTime(210000);
  await f.api.submit(f.player,{questionId:'L6P8',requestId:'theory-solved-000001',answers:{answer:'0.437'}});
  const before=await f.api.leaderboard(f.teacher);
  f.setTime(220000);await f.save({numPracticalResponse4:'0'});
  assert.deepEqual((await f.api.leaderboard(f.teacher)).entries,before.entries);
  const race=await fixture();await race.start();
  race.repo.beforeBatch=()=>race.save({numPracticalResponse3:'0'});
  const result=await race.api.teamDelete(race.teacher,{eventId:race.eventId,teamId:race.teamId,teamName:'Practical team',confirm:true,requestId:'delete-winning-save1'});
  assert.equal(result.outcome,'removed');assert.equal((await race.repo.get(race.pk,'practical')).responses.numPracticalResponse3.value,0);
});

test('HTTP exposes practical POST endpoints with authenticated origin and cookie rules',async()=>{
  const f=await fixture();await f.start();
  const headers={origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:'__Host-olympiad-session='+f.player};
  const request=(action,body={},extra={})=>handle({method:'POST',params:{action},headers,body,...extra},async()=>f.api);
  assert.equal((await request('practical')).body.revision,0);
  assert.equal((await request('practical-save',{expectedRevision:0,requestId:'http-practical-00001',changes:{numPracticalResponse4:'0'}})).body.revision,1);
  assert.equal((await request('practical',{}, {headers:{...headers,origin:'https://invalid.example'}})).status,403);
  assert.equal((await request('practical',{}, {method:'GET'})).status,404);
});
