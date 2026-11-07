import { teamScope, scopedKey, summaryRange } from '../src/layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';
import {oxyanions} from '../src/private-oxyanions.mjs';

async function fixture(year='L6',role='competitor') {
  const repo=memoryRepository();let time=100000;
  const api=createService(repo,{},()=>time),staff=(await api.login({role:'teacher',code:'5678'})).token;
  const event=(await api.eventCreate(staff,{name:'Retention fixture',year,theoryStartsAt:0,theoryEndsAt:500000})).events[0];
  const team=(await api.teamAdd(staff,{eventId:event.id,name:'Synthetic team'})).teams[0];
  await api.eventActivate(staff,{eventId:event.id,expectedRevision:1});
  const token=role==='teacher'?staff:(await api.login({role:'competitor',code:'1234'})).token;
  if(role==='competitor'){await api.claim(token,{teamId:team.id});await api.start(token);}
  const pk=role==='teacher'?'preview-'+createHash('sha256').update(token).digest('hex')+'-'+event.id:teamScope(event.id,team.id);
  return {repo,api,token,staff,event,team,pk,setTime:value=>time=value};
}
for(const role of ['competitor','teacher'])test(`${role} keeps outcomes and bound receipts, never raw wrong/successful work`,async()=>{
  const f=await fixture('L6',role),base={eventId:f.event.id,questionId:'L6P8'};
  const wrong={...base,requestId:'wrong-content-001',answers:{answer:'0.123456789'}};
  const first=await f.api.submit(f.token,wrong);
  assert.equal(first.attempt.retryAt,115000);assert.deepEqual(first.attempt.answers,{});
  f.setTime(101000);assert.equal((await f.api.submit(f.token,wrong)).attempt.retryAt,115000);
  await assert.rejects(f.api.submit(f.token,{...wrong,answers:{answer:'different'}}),{status:409});
  f.setTime(115000);const solved=await f.api.submit(f.token,{...base,requestId:'correct-content-01',answers:{answer:'0.437'}});
  assert.equal(solved.attempt.solvedAt,115000);assert.equal(solved.score,role==='competitor'?3:0);
  assert.equal((await f.api.submit(f.token,{...base,requestId:'correct-content-01',answers:{answer:'0.437'}})).attempt.solvedAt,115000);
  const rows=await f.repo.list({partitionKey:f.pk});
  for(const row of rows.filter(row=>row.kind==='question'||row.kind==='receipt')){
    const serialized=JSON.stringify(row);assert.ok(!serialized.includes('0.123456789'));assert.ok(!serialized.includes('0.437'));
    if(row.kind==='receipt'){assert.equal(row.questionId,'L6P8');assert.equal(row.fingerprint.length,64);}
  }
});
test('historical question/receipt content is not returned or resurrected, without cleanup writes',async()=>{
  const f=await fixture(),id='L6P8',old={partitionKey:f.pk,rowKey:'q-'+id,kind:'question',questionId:id,revision:7,state:{answers:{answer:'old-private-working'},feedback:{answer:false},retryAt:110000,solvedAt:null},privateState:{}};
  await f.repo.write(old);
  const before=JSON.stringify([...f.repo.rows]);
  assert.deepEqual((await f.api.hydrate(f.token)).questions[id].attempt.answers,{});
  assert.deepEqual((await f.api.session(f.token)).attempts[id].answers,{});
  assert.equal(JSON.stringify([...f.repo.rows]),before);
  f.setTime(110000);await f.api.submit(f.token,{questionId:id,requestId:'new-content-after-old',answers:{answer:'wrong-new-working'}});
  const rows=await f.repo.list({partitionKey:f.pk});assert.ok(!JSON.stringify(rows).includes('old-private-working'));assert.ok(!JSON.stringify(rows).includes('wrong-new-working'));
});
test('drawings and grouping selections do not persist and presentation endpoints are retired',async()=>{
  const f=await fixture('U5');
  await f.api.submit(f.token,{questionId:'U5P3',requestId:'wrong-drawing-001',answers:{drawing:'invalid-unique-drawing'}});
  assert.ok(!JSON.stringify(await f.repo.list({partitionKey:f.pk})).includes('invalid-unique-drawing'));
  await assert.rejects(f.api.draft(f.token,{questionId:'U5P3',requestId:'retired-draft-001',expectedRevision:1,answers:{drawing:'x'}}),{status:410});
  await assert.rejects(f.api.action(f.token,{questionId:'U5P5',requestId:'retired-layout-01',action:{type:'gc-result-position',id:1,position:[.1,.2]}}),{status:410});
  const g=await fixture('L6');await g.api.submit(g.token,{questionId:'L6P1',requestId:'wrong-groups-001',answers:{groups:'Ta,S,As,Cu,V,Zr,F,Th,Na'}});
  assert.deepEqual((await g.api.hydrate(g.token)).questions.L6P1.attempt.interaction,undefined);
});
test('timed run stores row IDs and deadline, never typed names; sequence expires with the run',async()=>{
  const f=await fixture();
  await f.api.action(f.token,{questionId:'L6P3',requestId:'timed-start-001',action:{type:'start'}});
  await f.api.submit(f.token,{questionId:'L6P3',requestId:'timed-wrong-001',answers:{answer:'unique-wrong-oxyanion'}});
  let stored=await f.repo.get(f.pk,'q-L6P3');assert.ok(stored.privateState.run.every(Number.isInteger));assert.equal(stored.state.interaction.deadline,175000);
  assert.ok(!JSON.stringify(await f.repo.list({partitionKey:f.pk})).includes('unique-wrong-oxyanion'));
  const expected=oxyanions.find(row=>row.row===stored.privateState.run[0]);
  await f.api.submit(f.token,{questionId:'L6P3',requestId:'timed-correct-01',answers:{answer:expected.name}});
  assert.equal((await f.api.hydrate(f.token)).questions.L6P3.attempt.interaction,undefined);
  const hydration=(await f.api.question(f.token,{questionId:'L6P3'})).attempt;assert.equal(hydration.interaction.step,1);assert.equal(hydration.interaction.deadline,175000);assert.deepEqual(hydration.answers,{});
  f.setTime(175000);await f.api.action(f.token,{questionId:'L6P3',requestId:'timed-expire-001',action:{type:'tick'}});
  stored=await f.repo.get(f.pk,'q-L6P3');assert.deepEqual(stored.privateState,{});assert.equal(stored.state.retryAt,195000);
});
test('GC retains only the active capture and returns an idempotent completion ID without report history',async()=>{
  const f=await fixture('U5'),base={questionId:'U5P5'};
  const run=await f.api.action(f.token,{...base,requestId:'gc-run-capture-01',action:{type:'gc-run',sample:'citrus',concentration:12.5}});
  assert.equal(run.attempt.interaction.activeRun.deadline,104000);
  const row=await f.repo.get(f.pk,'receipt-gc-run-capture-01');assert.equal(row.response.attempt.interaction.activeRun.sample,undefined);assert.equal(row.response.attempt.interaction.activeRun.concentration,undefined);
  f.setTime(104000);const tick={...base,requestId:'gc-complete-001',action:{type:'tick'}};
  const result=await f.api.action(f.token,tick);assert.equal(result.gcCompletedRunId,1);assert.deepEqual(result.attempt.interaction.results,[]);
  assert.equal((await f.api.action(f.token,tick)).gcCompletedRunId,1);
  const stored=await f.repo.get(f.pk,'q-U5P5');assert.equal(stored.state.interaction.activeRun,null);assert.deepEqual(stored.state.interaction.results,[]);
  const rows=await f.repo.list({partitionKey:f.pk});assert.ok(!JSON.stringify(rows).includes('12.5'));
  assert.equal((await f.api.hydrate(f.token)).questions.U5P5.attempt.interaction,undefined);
  assert.deepEqual((await f.api.question(f.token,{questionId:'U5P5'})).attempt.interaction.results,[]);
});
