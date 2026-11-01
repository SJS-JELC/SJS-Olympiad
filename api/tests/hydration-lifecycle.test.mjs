import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';

async function fixture(year='L6',startsAt=0) {
  const repo=memoryRepository();let time=100000;
  const api=createService(repo,{},()=>time),staff=await api.login({role:'teacher',code:'5678'});
  const state=await api.eventCreate(staff.token,{name:'Hydration test',year,theoryStartsAt:startsAt,theoryEndsAt:300000});
  const event=state.events[0];await api.eventActivate(staff.token,{eventId:event.id,expectedRevision:event.revision});
  const team=await api.teamAdd(staff.token,{eventId:event.id,name:'Test team'});
  const player=await api.login({role:'competitor',code:'1234'});
  const teams=await api.teams(player.token);await api.claim(player.token,{teamId:teams.teams[0].id});
  return {api,repo,staff:staff.token,player:player.token,eventId:event.id,teamId:teams.teams[0].id,setTime:value=>time=value};
}

test('GO bulk-hydrates every registered question with one partition list and no question writes',async()=>{
  for(const [year,count] of [['L5',9],['U5',6],['L6',9],['U6',9]]) {
    const f=await fixture(year);const lists=[],gets=[],writes=[];
    const list=f.repo.list.bind(f.repo),get=f.repo.get.bind(f.repo),write=f.repo.write.bind(f.repo);
    f.repo.list=async filter=>{lists.push(filter);return list(filter);};
    f.repo.get=async(p,r)=>{gets.push(r);return get(p,r);};
    f.repo.write=async(entity,etag)=>{writes.push(entity);return write(entity,etag);};
    const result=await f.api.start(f.player),hydration=result.hydration;
    assert.equal(hydration.year,year);assert.equal(Object.keys(hydration.questions).length,count);
    assert.equal(lists.filter(filter=>filter.kind==='question').length,1);
    assert.equal(gets.filter(key=>key.startsWith('q-')).length,0);
    assert.equal(writes.filter(row=>row.kind==='question'||row.kind==='receipt').length,0);
    assert.ok(!JSON.stringify(hydration).includes('privateState'));
    for(const entry of Object.values(hydration.questions))assert.equal(entry.revision,0);
    if(year==='U5')assert.ok(hydration.questions.U5P5.data.gcTraces.mystery.length>100);
  }
});

test('prestart hydration is allowed after GO but question content/actions stay scheduled',async()=>{
  const f=await fixture('L6',150000);await assert.rejects(f.api.hydrate(f.player),{status:423});
  const result=await f.api.start(f.player);assert.equal(Object.keys(result.hydration.questions).length,9);assert.deepEqual(result.attempts,{});
  assert.equal((await f.api.hydrate(f.player)).year,'L6');
  await assert.rejects(f.api.question(f.player,{questionId:'L6P8'}),{status:403});
  await assert.rejects(f.api.submit(f.player,{questionId:'L6P8',requestId:'prestart-check',answers:{answer:'0.437'}}),{status:403});
  await assert.rejects(f.api.hydrate(f.player,{eventId:'wrong-event'}),{status:403});
});

test('teacher bulk previews remain isolated and readonly and reject invalid catalogue years',async()=>{
  const f=await fixture();const before=JSON.stringify([...f.repo.rows]);
  const hydration=await f.api.hydrate(f.staff,{eventId:'catalogue-U5'});
  assert.equal(hydration.score,0);assert.equal(Object.keys(hydration.questions).length,6);
  assert.equal(JSON.stringify([...f.repo.rows]),before);
  await assert.rejects(f.api.hydrate(f.staff,{eventId:'catalogue-U4'}),{status:404});
  const readsBefore=JSON.stringify([...f.repo.rows]);await f.api.question(f.staff,{eventId:'catalogue-U5',questionId:'U5P5'});assert.equal(JSON.stringify([...f.repo.rows]),readsBefore);
});

test('fresh competitor boot revokes the role cookie, retains claimed team/results and cannot reclaim',async()=>{
  const f=await fixture();await f.api.start(f.player);
  const solved=await f.api.submit(f.player,{questionId:'L6P8',requestId:'solve-before-boot',answers:{answer:'0.437'}});
  const cookie='__Host-olympiad-session='+f.player;
  const response=await handle({method:'GET',params:{action:'session'},query:{restore:'1'},headers:{cookie}},()=>f.api);
  assert.equal(response.status,401);assert.match(response.headers['Set-Cookie'],/Max-Age=0/);
  await assert.rejects(f.api.submit(f.player,{questionId:'L6P8',requestId:'stale-after-boot',answers:{answer:'0.437'}}),{status:401});
  const next=await f.api.login({role:'competitor',code:'1234'});assert.equal((await f.api.teams(next.token)).teams.filter(team=>!team.claimed).length,0);
  await assert.rejects(f.api.claim(next.token,{teamId:f.teamId}),{status:409});
  const stored=await f.repo.get(f.eventId+'-'+f.teamId,'q-L6P8');assert.equal(stored.state.solvedAt,solved.attempt.solvedAt);
  await f.api.teamRelease(f.staff,{eventId:f.eventId,teamId:f.teamId,confirm:true});await f.api.claim(next.token,{teamId:f.teamId});
  const resumed=await f.api.start(next.token);assert.equal(resumed.score,3);assert.equal(resumed.hydration.questions.L6P8.attempt.solvedAt,solved.attempt.solvedAt);
  const unclaimed=await f.api.login({role:'competitor',code:'1234'});await assert.rejects(f.api.session(unclaimed.token,{restore:true}),{status:401});
  await assert.rejects(f.api.session(f.staff,{restore:true}),{status:401});
});

test('in-tab interruption preserves role and staff recovery; combined GC Run owns timing',async()=>{
  const f=await fixture('U5');await f.api.start(f.player);
  const locked=await f.api.session(f.player,{interrupt:true});assert.equal(locked.competition.status,'LOCKED');
  const recovery=await f.api.recovery(f.player,{code:'5678',expectedEpoch:locked.competition.epoch});
  await f.api.resume(f.player,{grant:recovery.grant,expectedEpoch:locked.competition.epoch});
  for(const [sample,concentration] of [['mystery',50],['citrus',12.3]])await assert.rejects(f.api.action(f.player,{questionId:'U5P5',requestId:'invalid-'+sample,action:{type:'gc-run',sample,concentration}}),{status:400});
  const run=await f.api.action(f.player,{questionId:'U5P5',requestId:'combined-gc-run',action:{type:'gc-run',sample:'citrus',concentration:12.5,deadline:1,id:500}});
  assert.equal(run.attempt.interaction.activeRun.deadline,106000);assert.equal(run.attempt.interaction.activeRun.id,1);assert.equal(run.attempt.interaction.activeRun.concentration,12.5);
  f.setTime(106000);const projected=await f.api.hydrate(f.player);assert.equal(projected.questions.U5P5.attempt.interaction.results.length,1);
  const stored=await f.repo.get(f.eventId+'-'+f.teamId,'q-U5P5');assert.ok(stored.state.interaction.activeRun);
  const finished=await f.api.action(f.player,{questionId:'U5P5',requestId:'combined-gc-finish',action:{type:'tick'}});assert.equal(finished.attempt.interaction.results[0].concentration,12.5);
  assert.equal((await f.api.leaderboard(f.staff)).entries.length,0);
});

test('completed GC read/hydration freeze even an unfinished run without exposing private state',async()=>{
  const f=await fixture('U5');await f.api.start(f.player);
  await f.api.action(f.player,{questionId:'U5P5',requestId:'completed-read-run',action:{type:'gc-run',sample:'mystery',concentration:100}});
  const solved=await f.api.submit(f.player,{questionId:'U5P5',requestId:'completed-read-solve',answers:{composition:'[25,14,9,152]'}});
  f.setTime(120000);const before=JSON.stringify([...f.repo.rows]);
  const read=await f.api.question(f.player,{questionId:'U5P5'}),hydrated=await f.api.hydrate(f.player);
  assert.deepEqual(read.attempt,solved.attempt);assert.deepEqual(hydrated.questions.U5P5.attempt,solved.attempt);
  assert.equal(JSON.stringify([...f.repo.rows]),before);assert.ok(!JSON.stringify(hydrated).includes('privateState'));
});

test('ordinary stale 401 cannot expire a replacement cookie; explicit restore and logout still clear it',async()=>{
  const f=await fixture();await f.api.logout(f.player);
  for(const [action,query] of [['teams',{}],['session',{}],['session',{interrupt:'1'}]]) {
    const result=await handle({method:'GET',params:{action},query,headers:{cookie:'__Host-olympiad-session='+f.player}},()=>f.api);
    assert.equal(result.status,401);assert.equal(result.headers['Set-Cookie'],undefined);
  }
  const restore=await handle({method:'GET',params:{action:'session'},query:{restore:'1'},headers:{cookie:'__Host-olympiad-session='+f.player}},()=>f.api);
  assert.equal(restore.status,401);assert.match(restore.headers['Set-Cookie'],/Max-Age=0/);
  const logout=await handle({method:'POST',params:{action:'logout'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:'__Host-olympiad-session='+f.player},body:{}},()=>f.api);
  assert.equal(logout.status,401);assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);
  const current=await f.api.login({role:'teacher',code:'5678'});assert.equal((await f.api.session(current.token)).role,'teacher');
});
