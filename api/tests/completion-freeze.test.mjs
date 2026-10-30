import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';

for(const role of ['competitor','teacher'])test(`completed ${role} GC state, reports, drafts and rank time remain frozen through all later actions`,async()=>{
 const repo=memoryRepository();let time=100000;
 const api=createService(repo,{},()=>time),staff=(await api.login({role:'teacher',code:'5678'})).token;
 const event=(await api.eventCreate(staff,{name:'Completion freeze',year:'U5',theoryStartsAt:0,theoryEndsAt:300000})).events[0];
 const team=(await api.teamAdd(staff,{eventId:event.id,name:'Freeze test team'})).teams[0];await api.eventActivate(staff,{eventId:event.id,expectedRevision:1});
 const token=role==='teacher'?staff:(await api.login({role:'competitor',code:'1234'})).token;
 if(role==='competitor'){await api.claim(token,{teamId:team.id});await api.start(token);}
 const base={eventId:event.id,questionId:'U5P5'};let serial=0;
 const action=value=>api.action(token,{...base,requestId:'freeze-action-'+(++serial),action:value});
 await action({type:'gc-enter'});await action({type:'gc-load',sample:'mystery'});await action({type:'gc-run'});time+=6001;await action({type:'tick'});
 await action({type:'gc-load',sample:'citrus',concentration:30});await action({type:'gc-run'});
 const solved=await api.submit(token,{...base,requestId:'freeze-solve-001',answers:{composition:'[25,14,9,152]'}});assert.equal(solved.attempt.solvedAt,time);assert.equal(solved.score,role==='competitor'?2:0);
 const pk=role==='teacher'?'preview-'+createHash('sha256').update(token).digest('hex')+'-'+event.id:event.id+'-'+team.id;
 const original=await repo.get(pk,'q-U5P5'),summary=await repo.get(event.id+'-'+team.id,'team');
 time+=20000;
 for(const value of [{type:'tick'},{type:'gc-dilute',sample:'citrus',value:90},{type:'gc-delete-result',id:1},{type:'gc-result-position',id:1,position:[90,90]},{type:'gc-result-interval',id:1,interval:[1,3]},{type:'gc-run'}])await action(value);
 await api.draft(token,{...base,requestId:'freeze-draft-001',expectedRevision:original.revision,answers:{composition:'[0,0,0,200]'}});
 await api.submit(token,{...base,requestId:'freeze-repeat-001',answers:{composition:'[0,0,0,200]'}});
 const after=await repo.get(pk,'q-U5P5');assert.deepEqual(after.state,original.state);assert.deepEqual(after.privateState,original.privateState);assert.equal(after.revision,original.revision);
 assert.equal((await repo.get(event.id+'-'+team.id,'team')).lastScoringAt,summary.lastScoringAt);
 await assert.rejects(api.action(token,{...base,requestId:'freeze-action-7',action:{type:'gc-run'}}),{status:409});
});
