import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';
import {handle} from '../src/http.mjs';

test('public availability exposes only a boolean across the full event lifecycle',async()=>{
  const api=createService(memoryRepository(),{},()=>100000);
  const availability=()=>handle({method:'GET',params:{action:'availability'}},async()=>api);
  assert.deepEqual((await availability()).body,{competitorAvailable:false});
  const staff=await api.login({role:'teacher',code:'5678'});
  const created=await api.eventCreate(staff.token,{name:'Current',year:'U5',theoryStartsAt:200000,theoryEndsAt:400000});
  assert.deepEqual((await availability()).body,{competitorAvailable:true});
  const id=created.createdEventId;
  await assert.rejects(api.eventEnd(staff.token,{eventId:id,expectedRevision:1}),{status:400});
  await api.eventEnd(staff.token,{eventId:id,expectedRevision:1,confirm:true});
  assert.deepEqual((await availability()).body,{competitorAvailable:false});
  await assert.rejects(api.eventActivate(staff.token,{eventId:id,expectedRevision:2}),{status:409});
  const next=await api.eventCreate(staff.token,{name:'Next',year:'L6',theoryStartsAt:200000,theoryEndsAt:400000});
  await api.eventActivate(staff.token,{eventId:next.createdEventId,expectedRevision:1});
  assert.deepEqual((await availability()).body,{competitorAvailable:true});
  assert.equal((await api.login({role:'competitor',code:'1234'})).state.activeEvent.id,next.createdEventId);
});

test('concurrent creates commit only one draft and do not lose event history',async()=>{
  const repo=memoryRepository(),api=createService(repo,{},()=>100000);
  const staff=await api.login({role:'teacher',code:'5678'});
  const results=await Promise.allSettled(['First','Second'].map(name=>api.eventCreate(staff.token,{name,year:'U5',theoryStartsAt:200000,theoryEndsAt:400000})));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
  assert.equal((await api.events(staff.token)).events.length,1);
  const login=await api.login({role:'competitor',code:'1234'});
  assert.equal(login.state.practice,true);
  assert.equal(login.state.activeEvent.id,(await api.events(staff.token)).events[0].id);
});
