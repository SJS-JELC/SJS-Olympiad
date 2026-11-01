import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createService } from '../src/service.mjs';
import { handle } from '../src/http.mjs';
import { memoryRepository } from './helpers.mjs';
const code='1234',teacherCode='5678';
const origin='https://olympiad.masters-of-chemistry.app';
// Ordinary fixture actions fetch the displayed baseline. Concurrency cases use
// rawApi with a deliberately retained revision, matching two open admin forms.
function currentAdminRevision(api) {
  return new Proxy(api,{get(target,key){
    if(!['eventUpdate','eventActivate','eventEnd','codesUpdate'].includes(key))return target[key];
    return async(token,input)=>{
      const field=key==='codesUpdate'?'expectedConfigRevision':'expectedRevision';
      if(Object.hasOwn(input,field))return target[key](token,input);
      const settings=await target.events(token);
      const revision=key==='codesUpdate'?settings.configRevision:settings.events.find(event=>event.id===input.eventId)?.revision;
      return target[key](token,{...input,[field]:revision});
    };
  }});
}
async function fixture(initial=[]) {
  const repo=memoryRepository(initial);let time=100000;
  const api=createService(repo,{eventId:'pilot',endsAt:200000},()=>time);
  const staff=await api.login({role:'teacher',code:teacherCode});
  const player=await api.login({role:'competitor',code});
  return {api:currentAdminRevision(api),rawApi:api,repo,staff:staff.token,player:player.token,setTime:value=>{time=value;}};
}
const submission=(requestId='submission-0000001',answer='0.437')=>({questionId:'L6P8',requestId,answers:{answer}});
async function playing(f) {await f.api.claim(f.player,{teamId:'test-1'});return f.api.start(f.player);}
test('role auth uses slow salted hashes, opaque sessions, expiration and saved code rotations',async()=>{
  const f=await fixture(),s=await f.repo.get('system','settings');
  assert.match(s.competitorHash,/^[a-f0-9]{32}:[a-f0-9]{64}$/);assert.notEqual(s.competitorHash,s.teacherHash);
  await assert.rejects(f.api.login({role:'teacher',code}),{status:403});
  await assert.rejects(f.api.events(f.player),{status:403});
  await f.api.codesUpdate(f.staff,{competitorCode:'new-user',teacherCode:'new-staff'});
  assert.equal((await f.api.session(f.staff)).role,'teacher');
  await assert.rejects(f.api.login({role:'competitor',code}),{status:403});
  assert.equal((await f.api.login({role:'competitor',code:'new-user'})).state.role,'competitor');
  await assert.rejects(f.api.codesUpdate(f.staff,{teacherCode:'new-user'}),{status:400});
  const restarted=createService(f.repo,{eventId:'pilot',endsAt:1});
  assert.equal((await restarted.login({role:'teacher',code:'new-staff'})).state.activeEvent.endsAt,200000);
  f.setTime(100000+28800000);await assert.rejects(f.api.session(f.staff),{status:401});
});
test('named events have one active, immutable active year, explicit end, no restart and current end settings',async()=>{
  const f=await fixture();
  let state=await f.api.eventCreate(f.staff,{name:'New season',year:'U5',theoryStartsAt:0,theoryEndsAt:300000});
  const event=state.events.find(e=>e.name==='New season');
  await assert.rejects(f.api.eventActivate(f.staff,{eventId:event.id}),{status:409});
  await assert.rejects(f.api.eventUpdate(f.staff,{eventId:'pilot',year:'U5'}),{status:409});
  await assert.rejects(f.api.eventEnd(f.staff,{eventId:'pilot'}),{status:400});
  await f.api.eventEnd(f.staff,{eventId:'pilot',confirmed:true});
  await assert.rejects(f.api.eventActivate(f.staff,{eventId:'pilot'}),{status:409});
  await assert.rejects(f.api.teamRelease(f.staff,{eventId:'pilot',teamId:'test-1',confirm:true}),{status:409});
  state=await f.api.eventActivate(f.staff,{eventId:event.id});assert.equal(state.activeEvent.year,'U5');
  await f.api.eventUpdate(f.staff,{eventId:event.id,theoryEndsAt:350000});
  assert.equal((await f.api.session(f.player)).activeEvent.endsAt,350000);
});
test('concurrent claims are exclusive, retries recover response loss, logout retains claim, release preserves scores',async()=>{
  const f=await fixture(),other=(await f.api.login({role:'competitor',code})).token;
  const results=await Promise.allSettled([f.api.claim(f.player,{teamId:'test-1'}),f.api.claim(other,{teamId:'test-1'})]);
  assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
  const owner=results[0].status==='fulfilled'?f.player:other;
  const loser=owner===f.player?other:f.player;
  await assert.rejects(f.api.claim(loser,{teamId:'missing-team'}),{status:404});
  assert.equal((await f.api.claim(loser,{teamId:'test-2'})).team.id,'test-2');
  await assert.rejects(f.api.claim(owner,{teamId:'test-3'}),{status:409});
  assert.equal((await f.api.claim(owner,{teamId:'test-1'})).team.id,'test-1');
  await f.api.start(owner);await f.api.submit(owner,submission());
  await f.api.logout(owner);assert.equal((await f.api.teams(f.staff)).teams.find(t=>t.id==='test-1').claimed,true);
  await f.api.teamRelease(f.staff,{eventId:'pilot',teamId:'test-1',confirm:true});
  const replacement=(await f.api.login({role:'competitor',code})).token;
  assert.equal((await f.api.claim(replacement,{teamId:'test-1'})).score,3);
  assert.equal((await f.api.start(replacement)).attempts.L6P8.solvedAt,100000);
});
test('team names are event unique after normalization; draft year is inherited on claim',async()=>{
  const f=await fixture();await f.api.teamAdd(f.staff,{name:'Other Team',eventId:'pilot'});
  await assert.rejects(f.api.teamAdd(f.staff,{name:' other TEAM ',eventId:'pilot'}),{status:409});
  await assert.rejects(f.api.teamAdd(f.staff,{name:'Test team 1',eventId:'pilot'}),{status:409});
  const state=await f.api.eventCreate(f.staff,{name:'Draft',year:'L5',theoryStartsAt:0,theoryEndsAt:300000}),id=state.events.at(-1).id;
  const list=await f.api.teamAdd(f.staff,{name:'Other Team',eventId:id});
  const changed=await f.api.eventChangeYear(f.staff,{eventId:id,year:'U6',expectedRevision:1,requestId:'change-draft-year',confirm:true});
  await f.api.eventEnd(f.staff,{eventId:'pilot',confirm:true});await f.api.eventActivate(f.staff,{eventId:changed.createdEventId});
  assert.equal((await f.api.claim(f.player,{teamId:list.teams[0].id})).team.year,'U6');
});
test('transactional submissions have canonical receipt binding, fixed cooldown and exactly once concurrent scores',async()=>{
  const f=await fixture();await playing(f);
  const wrong=submission('wrong-submission-01','');
  assert.equal((await f.api.submit(f.player,wrong)).attempt.retryAt,115000);
  assert.equal((await f.api.submit(f.player,wrong)).attempt.retryAt,115000);
  await assert.rejects(f.api.submit(f.player,{...wrong,answers:{answer:'1'}}),{status:409});
  const cooldown=await f.api.submit(f.player,submission());assert.equal(cooldown.score,0);assert.equal(cooldown.attempt.retryAt,115000);
  f.setTime(115000);
  const result=await Promise.all([f.api.submit(f.player,submission('good-request-00001')),f.api.submit(f.player,submission('good-request-00001')),f.api.submit(f.player,submission('good-request-00002'))]);
  assert.ok(result.every(item=>item.score===3));
  await assert.rejects(f.api.action(f.player,{questionId:'L6P8',requestId:'good-request-00001',action:{type:'tick'}}),{status:409});
  assert.equal((await f.api.leaderboard(f.staff)).rows[0].score,3);
});
test('draft revisions, semantic size limits, private state and year ownership fail closed',async()=>{
  const f=await fixture();await playing(f);
  const q=await f.api.question(f.player,{questionId:'L6P8'});
  const draft={questionId:'L6P8',requestId:'draft-request-001',expectedRevision:q.revision,answers:{answer:'0.4'}};
  assert.equal((await f.api.draft(f.player,draft)).attempt.answers.answer,'0.4');
  await assert.rejects(f.api.draft(f.player,{...draft,requestId:'draft-request-002'}),{status:409});
  await assert.rejects(f.api.question(f.player,{questionId:'U5P6'}),{status:404});
  await assert.rejects(f.api.question(f.player,{questionId:'L6P8',eventId:'another'}),{status:403});
  await assert.rejects(f.api.draft(f.player,{...draft,answers:{answer:'a'.repeat(30000)}}),{status:400});
  const run=await f.api.action(f.player,{questionId:'L6P3',requestId:'timed-run-00001',action:{type:'start',random:[0],now:1}});
  assert.equal(run.attempt.interaction.deadline,175000);assert.ok(!JSON.stringify(run).includes('privateState'));
  assert.ok(!Object.hasOwn(run.attempt.interaction,'run'));
  const incoming={...run.attempt.interaction,step:5,deadline:999999,active:false};
  const saved=await f.api.draft(f.player,{questionId:'L6P3',requestId:'timed-draft-001',expectedRevision:run.revision,answers:{answer:''},interaction:incoming});
  assert.equal(saved.attempt.interaction.step,0);assert.equal(saved.attempt.interaction.deadline,175000);
});
test('breach, refresh and recovery use fenced epochs and single-use short grants without promotion',async()=>{
  const f=await fixture();const started=await playing(f);
  const locked=await f.api.session(f.player,{interrupt:true});assert.equal(locked.competition.status,'LOCKED');assert.deepEqual(locked.attempts,{});
  await assert.rejects(f.api.question(f.player,{questionId:'L6P8'}),{status:423});
  await assert.rejects(f.api.start(f.player),{status:409});
  const grant=await f.api.recovery(f.player,{code:teacherCode,epoch:locked.competition.epoch});
  assert.equal((await f.api.session(f.player)).competition.status,'LOCKED');
  const resumed=await f.api.resume(f.player,{grant:grant.grant,epoch:locked.competition.epoch});assert.equal(resumed.role,'competitor');
  await assert.rejects(f.api.resume(f.player,{grant:grant.grant,epoch:locked.competition.epoch}),{status:403});
  assert.equal((await f.api.breach(f.player,{epoch:started.competition.epoch})).competition.status,'ACTIVE');
  const relocked=await f.api.breach(f.player,{epoch:resumed.competition.epoch});
  const expired=await f.api.recovery(f.player,{code:teacherCode,epoch:relocked.competition.epoch});f.setTime(161000);
  await assert.rejects(f.api.resume(f.player,{grant:expired.grant,epoch:relocked.competition.epoch}),{status:403});
  await f.api.teamRelease(f.staff,{teamId:'test-1',eventId:'pilot',confirm:true});await assert.rejects(f.api.session(f.player),{status:401});
});
test('breach and release ETags invalidate in-flight scoring; failed transactions make no partial writes',async()=>{
  const f=await fixture();const active=await playing(f);
  f.repo.failBatch=true;await assert.rejects(f.api.submit(f.player,submission()),/Storage transaction failed/);f.repo.failBatch=false;
  assert.equal((await f.api.session(f.player)).score,0);assert.equal(await f.repo.get('pilot-test-1','receipt-submission-0000001'),null);
  f.repo.beforeBatch=async()=>{await f.api.breach(f.player,{epoch:active.competition.epoch});};
  await assert.rejects(f.api.submit(f.player,submission()),{status:423});assert.equal((await f.api.session(f.player)).score,0);
  const locked=await f.api.session(f.player),grant=await f.api.recovery(f.player,{code:teacherCode,epoch:locked.competition.epoch});await f.api.resume(f.player,{grant:grant.grant,epoch:locked.competition.epoch});
  f.repo.beforeBatch=async()=>{await f.api.teamRelease(f.staff,{teamId:'test-1',confirm:true});};
  await assert.rejects(f.api.submit(f.player,submission()),{status:401});
  assert.equal((await f.api.leaderboard(f.staff)).rows.length,0);
});
test('accepted operations may finish original event snapshot; subsequent actions use current settings',async()=>{
  const f=await fixture();await playing(f);
  f.repo.beforeBatch=async()=>{await f.api.eventEnd(f.staff,{eventId:'pilot',confirm:true});};
  assert.equal((await f.api.submit(f.player,submission())).score,3);
  await assert.rejects(f.api.question(f.player,{questionId:'L6P8'}),{status:403});assert.deepEqual((await f.api.session(f.player)).attempts,{});
  assert.equal((await f.api.session(f.player)).competition.status,'NOT_STARTED');
});
test('teacher previews isolate score and state from real teams and other teacher sessions',async()=>{
  const f=await fixture();const preview=await f.api.submit(f.staff,{...submission(),eventId:'pilot'});
  assert.equal(preview.score,0);assert.equal(preview.attempt.solvedAt,100000);assert.equal((await f.api.leaderboard(f.staff)).rows.length,0);
  const staff2=(await f.api.login({role:'teacher',code:teacherCode})).token;
  assert.equal((await f.api.question(staff2,{questionId:'L6P8'})).attempt.solvedAt,null);
});
test('ranking uses nonzero summaries, score then latest scoring time then stable ID, ignores releases/wrong attempts',async()=>{
  const f=await fixture();await playing(f);await f.api.submit(f.player,submission());
  const other=(await f.api.login({role:'competitor',code})).token;await f.api.claim(other,{teamId:'test-2'});await f.api.start(other);f.setTime(110000);await f.api.submit(other,submission());
  let result=await f.api.leaderboard(f.staff);assert.deepEqual(result.rows.map(row=>row.teamId),['test-1','test-2']);
  await f.api.teamRelease(f.staff,{teamId:'test-1',confirm:true});result=await f.api.leaderboard(f.staff);assert.equal(result.rows[0].teamId,'test-1');assert.equal(result.entries[0].scoreReachedAt,100000);
  await assert.rejects(f.api.leaderboard(other),{status:403});
});
test('legacy bootstrap preserves exact L6P8 state and receipts once; old cookie requires role authentication',async()=>{
  const secret='a'.repeat(64),sessionHash=createHash('sha256').update(secret).digest('hex');
  const initial=[{partitionKey:'pilot-test-1',rowKey:'team',teamId:'test-1',name:'Test team 1',sessionHash,expires:200000,score:3,solvedAt:90000,retryAt:0},{partitionKey:'pilot-test-1',rowKey:'attempt-legacy-request-001',answer:'0.437',correct:true}];
  const f=await fixture(initial);
  await assert.rejects(f.api.session('test-1.'+secret),{status:401});
  const login=await f.api.login({role:'competitor',code,legacyToken:'test-1.'+secret});assert.equal(login.state.score,3);assert.equal(login.state.competition.status,'LOCKED');
  const grant=await f.api.recovery(login.token,{code:teacherCode,epoch:login.state.competition.epoch});await f.api.resume(login.token,{grant:grant.grant,epoch:login.state.competition.epoch});
  assert.equal((await f.api.submit(login.token,submission('legacy-request-001'))).score,3);
  const restarted=createService(f.repo,{eventId:'pilot',endsAt:300000},()=>100000);assert.equal((await restarted.session(login.token)).attempts.L6P8.solvedAt,90000);
  assert.equal((await f.repo.get('pilot-test-1','attempt-legacy-request-001')).answer,'0.437');
});
test('HTTP validates origin, hides secrets, issues opaque HttpOnly cookie, restores, expires and rate-limits',async()=>{
  const f=await fixture();
  const req={method:'POST',params:{action:'login'},headers:{origin,'content-type':'application/json'},body:{role:'competitor',code}};
  const response=await handle(req,async()=>f.api);assert.equal(response.status,200);assert.match(response.headers['Set-Cookie'],/__Host-olympiad-session=[a-f0-9]{64}; Secure; HttpOnly; SameSite=Strict; Path=\/$/);assert.ok(!JSON.stringify(response.body).includes('Hash'));
  assert.equal((await handle({...req,headers:{...req.headers,origin:'https://evil.invalid'}},async()=>f.api)).status,403);
  assert.equal((await handle({...req,body:'invalid'},async()=>f.api)).status,400);
  const failed=await handle(req,async()=>{throw Error('AccountKey=SECRET');});assert.equal(failed.status,503);assert.ok(!JSON.stringify(failed).includes('SECRET'));
  const cookie=response.headers['Set-Cookie'].split(';')[0];
  const restored=await handle({method:'GET',params:{action:'session'},headers:{cookie},query:{restore:'1'}},async()=>f.api);assert.equal(restored.status,401);assert.match(restored.headers['Set-Cookie'],/Max-Age=0/);
  await f.api.throttle('small',1);await assert.rejects(f.api.throttle('small',1),{status:429});
  for(let n=0;n<10;n++)await handle({...req,body:{role:'teacher',code:'wrong'}},async()=>f.api);
  assert.equal((await handle(req,async()=>f.api)).status,429);
});
test('safe grouping/GC drafts persist presentation while timed/run authority cannot be injected',async()=>{
  const f=await fixture();await playing(f);
  let q=await f.api.question(f.player,{questionId:'L6P1'});
  q=await f.api.draft(f.player,{questionId:'L6P1',requestId:'grouping-draft-01',expectedRevision:q.revision,answers:{},interaction:{kind:'grouping',selected:['Ta','S']}});
  assert.deepEqual(q.attempt.interaction.selected,['Ta','S']);
  const created=await f.api.eventCreate(f.staff,{name:'U5 preview',year:'U5',theoryStartsAt:0,theoryEndsAt:300000}),eventId=created.events.at(-1).id;
  const gc=await f.api.question(f.staff,{questionId:'U5P5',eventId});assert.ok(gc.data.gcTraces);
  const saved=await f.api.draft(f.staff,{questionId:'U5P5',eventId,requestId:'gc-draft-00001',expectedRevision:gc.revision,answers:{composition:''},interaction:{...gc.attempt.interaction,entered:true,activeRun:{deadline:999999,id:999},nextRunId:999,analyses:['mystery'],concentrations:{citrus:25},results:[{id:999,sample:'mystery',concentration:1}],interval:[1,2]}});
  assert.equal(saved.attempt.interaction.activeRun,null);assert.equal(saved.attempt.interaction.nextRunId,1);assert.deepEqual(saved.attempt.interaction.analyses,[]);assert.deepEqual(saved.attempt.interaction.results,[]);assert.equal(saved.attempt.interaction.concentrations.citrus,25);assert.deepEqual(saved.attempt.interaction.interval,[1,2]);
});
test('every registered question is served through year-bound teacher previews without team claims',async()=>{
  const f=await fixture();
  for(const [year,numbers] of [['L5',[1,2,3,4,5,6,7,8,9]],['L6',[1,2,3,4,5,6,7,8,9]],['U6',[1,2,3,4,5,6,7,8,9]],['U5',[2,3,5,6,7,8]]]) {
    const created=await f.api.eventCreate(f.staff,{name:year+' preview',year,theoryStartsAt:0,theoryEndsAt:300000}),eventId=created.events.at(-1).id;
    for(const number of numbers){const q=await f.api.question(f.staff,{questionId:year+'P'+number,eventId});assert.equal(q.score,0);assert.equal(q.attempt.solvedAt,null);}
  }
  assert.equal((await f.api.leaderboard(f.staff)).rows.length,0);
});

test('event edits and transitions reject missing or stale displayed revisions without overwriting newer changes',async()=>{
  const f=await fixture(),api=f.rawApi;
  await assert.rejects(api.eventUpdate(f.staff,{eventId:'pilot',theoryStartsAt:0,theoryEndsAt:220000}),{status:400});
  await assert.rejects(api.eventActivate(f.staff,{eventId:'pilot'}),{status:400});
  await assert.rejects(api.eventEnd(f.staff,{eventId:'pilot',confirm:true}),{status:400});
  const baseline=(await api.events(f.staff)).events.find(event=>event.id==='pilot');
  const results=await Promise.allSettled([
    api.eventUpdate(f.staff,{eventId:'pilot',expectedRevision:baseline.revision,theoryStartsAt:0,theoryEndsAt:220000}),
    api.eventUpdate(f.staff,{eventId:'pilot',expectedRevision:baseline.revision,theoryStartsAt:0,theoryEndsAt:230000}),
  ]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
  const saved=(await api.events(f.staff)).events.find(event=>event.id==='pilot');
  assert.equal(saved.revision,baseline.revision+1);
  await assert.rejects(api.eventEnd(f.staff,{eventId:'pilot',expectedRevision:baseline.revision,confirm:true}),{status:409});
  assert.deepEqual((await api.events(f.staff)).events.find(event=>event.id==='pilot'),saved);
  const created=await api.eventCreate(f.staff,{name:'Next event',year:'U5',theoryStartsAt:0,theoryEndsAt:300000}),draft=created.events.at(-1);
  await api.eventUpdate(f.staff,{eventId:draft.id,expectedRevision:draft.revision,name:'Updated next event'});
  await assert.rejects(api.eventActivate(f.staff,{eventId:draft.id,expectedRevision:draft.revision}),{status:409});
});

test('code edits require the displayed config revision and a CAS retry cannot overwrite a concurrent replacement',async()=>{
  const f=await fixture(),api=f.rawApi;
  await assert.rejects(api.codesUpdate(f.staff,{competitorCode:'replacement'}),{status:400});
  const baseline=await api.events(f.staff);
  const results=await Promise.allSettled([
    api.codesUpdate(f.staff,{expectedConfigRevision:baseline.configRevision,competitorCode:'replacement-alpha'}),
    api.codesUpdate(f.staff,{expectedConfigRevision:baseline.configRevision,competitorCode:'replacement-beta'}),
  ]);
  const winner=results.findIndex(result=>result.status==='fulfilled');
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
  const saved=await api.events(f.staff);assert.equal(saved.configRevision,baseline.configRevision+1);
  const winningCode=winner===0?'replacement-alpha':'replacement-beta',losingCode=winner===0?'replacement-beta':'replacement-alpha';
  assert.equal((await api.login({role:'competitor',code:winningCode})).state.role,'competitor');
  await assert.rejects(api.login({role:'competitor',code:losingCode}),{status:403});
  await assert.rejects(api.codesUpdate(f.staff,{expectedConfigRevision:baseline.configRevision,teacherCode:'stale-staff'}),{status:409});
  assert.equal((await api.events(f.staff)).configRevision,saved.configRevision);
  assert.equal((await api.login({role:'teacher',code:teacherCode})).state.role,'teacher');
});

test('hostile deeply nested draft revisions and interactions return 400 without storage effects',async()=>{
  const f=await fixture();await playing(f);
  const q=await f.api.question(f.player,{questionId:'L6P8'});
  const baseline=await f.repo.get('pilot-test-1','q-L6P8');
  let nested=0;for(let depth=0;depth<6000;depth++)nested=[nested];
  const base={questionId:'L6P8',requestId:'hostile-draft-001',expectedRevision:q.revision,answers:{answer:'0.4'}};
  await assert.rejects(f.rawApi.draft(f.player,{...base,expectedRevision:nested}),{status:400});
  await assert.rejects(f.rawApi.draft(f.player,{...base,interaction:{kind:'timed',nested}}),{status:400});
  let serviceCalls=0;
  const request={method:'POST',params:{action:'draft'},headers:{origin,'content-type':'application/json'},body:{...base,expectedRevision:nested},rawBody:'{"expectedRevision":'+'['.repeat(6000)+'0'+']'.repeat(6000)+'}'};
  assert.ok(Buffer.byteLength(request.rawBody)<64000);
  const getService=async()=>{serviceCalls++;return f.rawApi;};
  assert.equal((await handle(request,getService)).status,400);
  assert.equal((await handle({...request,rawBody:undefined},getService)).status,400);
  assert.equal((await handle({...request,body:{...base,interaction:{kind:'timed',nested}}},getService)).status,400);
  assert.equal(serviceCalls,0);
  assert.deepEqual(await f.repo.get('pilot-test-1','q-L6P8'),baseline);
  assert.equal(await f.repo.get('pilot-test-1','receipt-hostile-draft-001'),null);
});
