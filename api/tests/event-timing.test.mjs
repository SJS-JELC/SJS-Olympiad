import test from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/service.mjs';
import { memoryRepository } from './helpers.mjs';

async function fixture() {
  const repo = memoryRepository(); let time = 100000;
  const api = createService(repo, {eventId:'pilot',endsAt:500000}, () => time);
  const teacher = await api.login({role:'teacher',code:'5678'});
  const player = await api.login({role:'competitor',code:'1234'});
  const edit = async input => {
    const state = await api.events(teacher.token);
    return api.eventUpdate(teacher.token,{eventId:'pilot',expectedRevision:state.events[0].revision,...input});
  };
  return {api,repo,teacher:teacher.token,player:player.token,edit,setTime:value=>{time=value;}};
}

test('legacy timings normalize without rewriting settings, results or ownership', async () => {
  const f = await fixture(), before = await f.repo.get('system','settings');
  const state = await f.api.events(f.teacher);
  assert.equal(state.events[0].theoryStartsAt,null);
  assert.equal(state.events[0].theoryEndsAt,500000);
  assert.equal(state.events[0].practicalStartsAt,null);
  assert.equal(state.events[0].practicalEndsAt,null);
  await f.api.session(f.player);
  assert.deepEqual(await f.repo.get('system','settings'),before);
  await f.edit({name:'Renamed legacy'});
  assert.equal((await f.api.events(f.teacher)).events[0].theoryStartsAt,null);
});

test('new events require a theory pair, optional complete practical pair and independent valid windows', async () => {
  const f = await fixture(), create = input => f.api.eventCreate(f.teacher,{name:'New',year:'L6',...input});
  for (const input of [{endsAt:900000},{theoryStartsAt:null,theoryEndsAt:900000},{theoryStartsAt:300000,theoryEndsAt:300000},{theoryStartsAt:300000,theoryEndsAt:400000,practicalStartsAt:200000},{theoryStartsAt:300000,theoryEndsAt:400000,practicalStartsAt:300000,practicalEndsAt:200000}])
    await assert.rejects(create(input),{status:400});
  let result = await create({theoryStartsAt:300000,theoryEndsAt:400000});
  assert.equal(result.events.at(-1).endsAt,400000);
  result = await create({theoryStartsAt:300000,theoryEndsAt:400000,practicalStartsAt:200000,practicalEndsAt:350000});
  assert.equal(result.events.at(-1).endsAt,400000); // Overlapping, practical first.
  result = await create({theoryStartsAt:300000,theoryEndsAt:400000,practicalStartsAt:500000,practicalEndsAt:600000});
  assert.equal(result.events.at(-1).endsAt,600000);
});

test('claim and fullscreen start are available before theory while all question endpoints are gated', async () => {
  const f = await fixture();
  await f.edit({theoryStartsAt:200000,theoryEndsAt:300000,practicalStartsAt:350000,practicalEndsAt:500000});
  await f.api.claim(f.player,{teamId:'test-1'});
  assert.equal((await f.api.start(f.player)).competition.status,'ACTIVE');
  const commands = [
    () => f.api.question(f.player,{questionId:'L6P8'}),
    () => f.api.draft(f.player,{questionId:'L6P8',requestId:'before-start-draft',expectedRevision:0,answers:{answer:'0.4'}}),
    () => f.api.submit(f.player,{questionId:'L6P8',requestId:'before-start-answer',answers:{answer:'0.437'}}),
    () => f.api.action(f.player,{questionId:'L6P3',requestId:'before-start-run',action:{type:'start'}}),
  ];
  for (const command of commands) await assert.rejects(command(),{status:403});
  assert.equal((await f.api.session(f.player)).score,0);
  assert.deepEqual((await f.api.session(f.player)).attempts,{});
  assert.equal((await f.api.question(f.teacher,{questionId:'L6P8',eventId:'pilot'})).score,0);
  f.setTime(200000);
  assert.equal((await f.api.question(f.player,{questionId:'L6P8'})).eventEndsAt,300000);
});

test('theory closing preserves score, claims, cooldowns and recovery throughout remaining practical time', async () => {
  const f = await fixture();
  await f.edit({theoryStartsAt:0,theoryEndsAt:200000,practicalStartsAt:250000,practicalEndsAt:500000});
  await f.api.claim(f.player,{teamId:'test-1'}); await f.api.start(f.player);
  await f.api.submit(f.player,{questionId:'L6P8',requestId:'window-solved-0001',answers:{answer:'0.437'}});
  await f.api.submit(f.player,{questionId:'L6P6',requestId:'window-wrong-0001',answers:{answer:'0'}});
  const teamBefore = await f.repo.get('pilot-test-1','team'), questionBefore = await f.repo.get('pilot-test-1','q-L6P6');
  f.setTime(200000);
  const state = await f.api.session(f.player);
  assert.equal(state.competition.status,'ACTIVE'); assert.equal(state.score,3); assert.deepEqual(state.attempts,{});
  await assert.rejects(f.api.question(f.player,{questionId:'L6P8'}),{status:403});
  await assert.rejects(f.api.submit(f.player,{questionId:'L6P8',requestId:'after-close-answer',answers:{answer:'0.437'}}),{status:403});
  await assert.rejects(f.api.action(f.player,{questionId:'L6P3',requestId:'after-close-run',action:{type:'start'}}),{status:403});
  assert.deepEqual(await f.repo.get('pilot-test-1','team'),teamBefore);
  assert.deepEqual(await f.repo.get('pilot-test-1','q-L6P6'),questionBefore);
  const locked = await f.api.breach(f.player,{epoch:state.competition.epoch,reason:'WINDOW_BLUR'});
  const permission = await f.api.recovery(f.player,{code:'5678',expectedEpoch:locked.competition.epoch});
  assert.equal((await f.api.resume(f.player,{grant:permission.grant,expectedEpoch:locked.competition.epoch})).competition.status,'ACTIVE');
  f.setTime(500000);
  assert.equal((await f.api.session(f.player)).competition.status,'NOT_STARTED');
});

test('schedule edits preserve accepted-operation snapshots and subsequent requests use the new window', async () => {
  const f = await fixture();
  await f.edit({theoryStartsAt:0,theoryEndsAt:200000});
  await f.api.claim(f.player,{teamId:'test-1'}); await f.api.start(f.player);
  f.repo.beforeBatch = () => f.edit({theoryEndsAt:90000});
  const result = await f.api.submit(f.player,{questionId:'L6P8',requestId:'accepted-schedule-change',answers:{answer:'0.437'}});
  assert.equal(result.score,3);
  await assert.rejects(f.api.submit(f.player,{questionId:'L6P8',requestId:'after-schedule-change',answers:{answer:'0.437'}}),{status:403});
  assert.equal((await f.repo.get('pilot-test-1','team')).score,3);
});
