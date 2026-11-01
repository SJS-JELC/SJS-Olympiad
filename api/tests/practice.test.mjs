import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';
async function setup(){const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=await api.login({role:'teacher',code:'5678'});const state=await api.eventCreate(staff.token,{name:'Practice L6',year:'L6',theoryStartsAt:200000,theoryEndsAt:400000});const event=state.events[0];return {repo,api,staff:staff.token,event};}
test('practice scores and recovery are isolated; activation revokes practice',async()=>{
 const {repo,api,staff,event}=await setup();const durable=()=>JSON.stringify([...repo.rows].filter(([,row])=>row.kind!=='session'));const before=durable();
 const player=await api.login({role:'competitor',code:'1234'});assert.equal(player.state.practice,true);
 await assert.rejects(api.login({role:'competitor',code:'bad'}),{status:403});
 await api.claim(player.token,{teamId:'practice'});await api.start(player.token);
 const result=await api.submit(player.token,{questionId:'L6P8',answers:{answer:'0.437'},requestId:'practice-solve'});assert.equal(result.score,3);
 const repeat=await api.submit(player.token,{questionId:'L6P8',answers:{answer:'0.437'},requestId:'practice-solve'});assert.deepEqual(repeat,result);
 const locked=await api.session(player.token,{interrupt:true});assert.equal(locked.competition.status,'LOCKED');
 await assert.rejects(api.recovery(player.token,{code:'bad',expectedEpoch:locked.competition.epoch}),{status:403});
 const recovery=await api.recovery(player.token,{code:'5678',expectedEpoch:locked.competition.epoch});
 assert.equal((await api.resume(player.token,{grant:recovery.grant,expectedEpoch:locked.competition.epoch})).competition.status,'ACTIVE');
 await assert.rejects(api.eventActivate(player.token,{eventId:event.id,expectedRevision:1}),{status:403});
 assert.equal(durable(),before);
 await api.eventActivate(staff,{eventId:event.id,expectedRevision:1});
 await assert.rejects(api.submit(player.token,{questionId:'L6P8',answers:{answer:'0.437'},requestId:'stale'}),{status:401});
 assert.equal((await api.login({role:'competitor',code:'1234'})).state.practice,undefined);
});
test('practice refresh, server restart and draft edits expire ephemeral games',async()=>{
 const {repo,api,staff,event}=await setup();const first=await api.login({role:'competitor',code:'1234'});
 await assert.rejects(api.session(first.token,{restore:true}),{status:401});await assert.rejects(api.session(first.token),{status:401});
 const second=await api.login({role:'competitor',code:'1234'});
 await assert.rejects(createService(repo,{},()=>100000).session(second.token),{status:401});
 await api.eventUpdate(staff,{eventId:event.id,expectedRevision:1,name:'Updated'});
 await assert.rejects(api.teams(second.token),{status:401});
});

test('all drafts are offered by default and selection is authenticated',async()=>{
 const {api,staff,event}=await setup();
 const added=await api.eventCreate(staff,{name:'Second draft',year:'U6',theoryStartsAt:200000,theoryEndsAt:400000});
 const second=added.events.find(e=>e.id!==event.id);
 const player=await api.login({role:'competitor',code:'1234'});
 assert.equal(player.state.practice,undefined);assert.equal(player.state.draftEvents.length,2);
 await assert.rejects(api.practiceStart(staff,{eventId:event.id}),{status:403});
 await assert.rejects(api.practiceStart(player.token,{eventId:'missing'}),{status:409});
 const selected=await api.practiceStart(player.token,{eventId:second.id});assert.equal(selected.state.practice,true);assert.equal(selected.state.activeEvent.year,'U6');
 await assert.rejects(api.session(player.token),{status:401});
 const next=await api.login({role:'competitor',code:'1234'});
 await api.eventActivate(staff,{eventId:event.id,expectedRevision:1});
 await assert.rejects(api.practiceStart(next.token,{eventId:second.id}),{status:409});
});
