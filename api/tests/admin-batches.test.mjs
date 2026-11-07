import { teamScope, scopedKey, summaryRange } from '../src/layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';
async function fixture(){const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token;const event=(await api.eventCreate(staff,{name:'Batch event',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'batch-event-create'})).events[0];return {repo,api,staff,event};}
test('batch auth, whole-payload binding and per-item release receipts protect newer claims',async()=>{
 const f=await fixture(),teams=(await f.api.teams(f.staff,{eventId:f.event.id})).teams.slice(0,2),input={requestId:'release-batch-request',eventId:f.event.id,action:'team-release',confirm:true,items:teams.map(t=>({teamId:t.id,expectedClaimGeneration:t.claimGeneration}))};
 const player=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(player.token,{teamId:teams[0].id});await assert.rejects(f.api.teamsBatch(player.token,input),{status:403});
 assert.equal((await f.api.teamsBatch(f.staff,input)).completed,2);
 const fresh=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(fresh.token,{teamId:teams[0].id});
 const restarted=createService(f.repo,{},()=>100000);assert.equal((await restarted.teamsBatch(f.staff,input)).complete,true);assert.equal((await f.api.session(fresh.token)).team.id,teams[0].id);
 await assert.rejects(f.api.teamsBatch(f.staff,{...input,items:input.items.slice(1)}),{status:409});
 const request={method:'POST',params:{action:'teams-batch'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json'},body:input};assert.equal((await handle(request,()=>f.api)).status,401);
});
test('partial batch failure retries only failed items and does not fetch a roster per item',async()=>{
 const f=await fixture(),teams=(await f.api.teams(f.staff,{eventId:f.event.id})).teams.slice(0,3),input={requestId:'partial-batch-request',eventId:f.event.id,action:'team-release',confirm:true,items:teams.map(t=>({teamId:t.id,expectedClaimGeneration:t.claimGeneration}))};
 const original=f.repo.batch;let fail=true;f.repo.batch=async (ops,options)=>{if(fail && ops.some(op=>op.entity.partitionKey===scopedKey(teamScope(f.event.id,teams[1].id),'team').partitionKey && op.entity.rowKey===scopedKey(teamScope(f.event.id,teams[1].id),'team').rowKey)){throw Error('Unavailable');}return original(ops,options);};
 let rosterReads=0;const list=f.repo.list;f.repo.list=async filter=>{if(filter.partitionKey===summaryRange(f.event.id).partitionKey && filter.rowKeyFrom===summaryRange(f.event.id).rowKeyFrom)rosterReads++;return list(filter);};
 const result=await f.api.teamsBatch(f.staff,input);assert.equal(result.completed,2);assert.equal(result.results[1].ok,false);assert.equal(rosterReads,0);
 const successful=await f.repo.get(teamScope(f.event.id,teams[0].id),'team');fail=false;assert.equal((await f.api.teamsBatch(f.staff,input)).complete,true);assert.deepEqual(await f.repo.get(successful.partitionKey,successful.rowKey),successful);
});
test('school import is one resumable job and rejects duplicate or invalid rows before writes',async()=>{
 const f=await fixture(),input={requestId:'schools-batch-request',eventId:f.event.id,rows:[{name:'Batch Academy',targetCount:2,colours:['#123456']},{name:'Second Academy',targetCount:3,colours:['#ABCDEF','#654321']}]};
 const before=await f.repo.get('system','schools');await assert.rejects(f.api.schoolsImport(f.staff,{...input,rows:[...input.rows,{...input.rows[0]}]}),{status:400});assert.deepEqual(await f.repo.get('system','schools'),before);
 const original=f.repo.batch;let fail=true;f.repo.batch=async (ops,options)=>{if(fail && ops.some(op=>op.entity.kind==='team' && op.entity.schoolId!=='host-st-johns'))throw Error('Unavailable');return original(ops,options);};
 assert.equal((await f.api.schoolsImport(f.staff,input)).complete,false);fail=false;
 const restarted=createService(f.repo,{},()=>100000);assert.equal((await restarted.schoolsImport(f.staff,input)).complete,true);
 const teams=(await f.api.teams(f.staff,{eventId:f.event.id})).teams;assert.equal(teams.length,9);assert.equal((await f.api.schools(f.staff)).schools.length,3);
 assert.equal((await f.api.schoolsImport(f.staff,input)).completed,2);assert.equal((await f.api.teams(f.staff,{eventId:f.event.id})).teams.length,9);
});
