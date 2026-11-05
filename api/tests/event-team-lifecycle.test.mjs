import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';
async function fixture(){
 const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token;
 const event=(await api.eventCreate(staff,{name:'Entry test',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'entry-test-create'})).events[0];
 const school=(await api.schoolCreate(staff,{name:'Entry Academy',requestId:'entry-school-create'})).school;
 await api.schoolTeams(staff,{schoolId:school.id,eventId:event.id,targetCount:2,requestId:'entry-team-setup'});
 const teams=(await api.teams(staff,{eventId:event.id})).teams.filter(t=>t.schoolId===school.id);
 return {repo,api,staff,event,school,teams};
}
const input=(f,team,requestId,expectedEntryRevision=0)=>({eventId:f.event.id,teamId:team.id,requestId,expectedEntryRevision,confirm:true});
test('remove/restore retains attempts, cooldowns and identity, revokes devices and fences stale requests',async()=>{
 const f=await fixture(),team=f.teams[0],player=await f.api.login({role:'competitor',code:'1234'});
 await f.api.claim(player.token,{teamId:team.id});await f.api.start(player.token);await f.api.submit(player.token,{questionId:'L6P8',requestId:'entry-wrong-answer',answers:{answer:'0'}});
 const pk=f.event.id+'-'+team.id,before=await f.repo.get(pk,'q-L6P8'),remove=input(f,team,'entry-remove-first');
 await assert.rejects(f.api.teamRemove(player.token,remove),{status:403});
 await assert.rejects(f.api.teamRemove(f.staff,{...remove,confirm:false}),{status:400});
 f.repo.failBatch=true;await assert.rejects(f.api.teamRemove(f.staff,remove));f.repo.failBatch=false;assert.equal((await f.api.session(player.token)).team.id,team.id);
 await f.api.teamRemove(f.staff,remove);await assert.rejects(f.api.session(player.token),{status:401});
 const other=await f.api.login({role:'competitor',code:'1234'});await assert.rejects(f.api.claim(other.token,{teamId:team.id}),{status:404});await assert.rejects(f.api.removedTeams(other.token,{eventId:f.event.id}),{status:403});
 assert.deepEqual(await f.repo.get(pk,'q-L6P8'),before);
 const restore=input(f,team,'entry-restore-first',1);await f.api.teamRestore(f.staff,restore);await f.api.teamRemove(f.staff,remove);
 assert.equal((await f.repo.get(pk,'team')).removed,false);await assert.rejects(f.api.teamRemove(f.staff,{...remove,requestId:'entry-stale-remove'}),{status:409});
 await assert.rejects(f.api.claim(player.token,{teamId:team.id}),{status:401});await f.api.claim(other.token,{teamId:team.id});
 await f.api.teamRemove(f.staff,input(f,team,'entry-remove-second',2));await f.api.teamRestore(f.staff,restore);assert.equal((await f.repo.get(pk,'team')).removed,true);
 assert.deepEqual(await f.repo.get(pk,'q-L6P8'),before);
});
test('schools are shared but fresh events get new team IDs and empty results; ended entries cannot restore',async()=>{
 const f=await fixture(),team=f.teams[0];await f.api.teamRemove(f.staff,input(f,team,'entry-remove-ended'));
 await f.api.eventEnd(f.staff,{eventId:f.event.id,expectedRevision:f.event.revision,confirm:true});
 await assert.rejects(f.api.teamRestore(f.staff,input(f,team,'entry-restore-ended',1)),{status:409});
 const event=(await f.api.eventCreate(f.staff,{name:'Next entry test',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'entry-next-create'})).events.find(e=>e.status==='draft');
 await f.api.schoolTeams(f.staff,{eventId:event.id,schoolId:f.school.id,targetCount:2,requestId:'entry-next-setup'});
 const fresh=(await f.api.teams(f.staff,{eventId:event.id})).teams.filter(t=>t.schoolId===f.school.id);
 assert.deepEqual(fresh.map(t=>t.teamNumber).sort(),[1,2]);assert.ok(fresh.every(t=>!f.teams.some(old=>old.id===t.id) && t.score===0 && !t.claimed));
 assert.equal((await f.api.removedTeams(f.staff,{eventId:f.event.id})).teams[0].id,team.id);
});
test('batch restore handles one school, deleted-school and pending-setup fences, and concurrent replay',async()=>{
 const f=await fixture(),items=f.teams.map(t=>({teamId:t.id,expectedEntryRevision:0}));
 const remove={eventId:f.event.id,requestId:'entry-remove-batch',action:'team-remove',confirm:true,items};
 assert.equal((await f.api.teamsBatch(f.staff,remove)).complete,true);
 await f.api.schoolDelete(f.staff,{schoolId:f.school.id,expectedRevision:f.school.revision,requestId:'entry-school-delete',confirm:true});
 await assert.rejects(f.api.teamRestore(f.staff,input(f,f.teams[0],'entry-deleted-restore',1)),{status:409});
 await f.api.schoolCreate(f.staff,{name:f.school.name,requestId:'entry-school-restore'});
 const original=f.repo.write;let fail=true;
 f.repo.write=async (entity,etag)=>{if(fail && entity.kind==='team' && entity.withdrawn===false)throw Error('Restore interrupted');return original(entity,etag);};
 const restore={...remove,action:'team-restore',requestId:'entry-restore-batch',items:items.map(t=>({...t,expectedEntryRevision:1}))};
 assert.equal((await f.api.teamsBatch(f.staff,restore)).complete,false);
 const school=(await f.api.schools(f.staff)).schools.find(s=>s.id===f.school.id);
 await assert.rejects(f.api.schoolDelete(f.staff,{schoolId:school.id,expectedRevision:school.revision,requestId:'entry-pending-delete',confirm:true}),{status:409});
 fail=false;const restarted=createService(f.repo,{},()=>100000);const results=await Promise.all([restarted.teamsBatch(f.staff,restore),f.api.teamsBatch(f.staff,restore)]);assert.ok(results.every(r=>r.complete));
 assert.equal((await f.api.teams(f.staff,{eventId:f.event.id})).teams.filter(t=>t.schoolId===school.id).length,2);
 assert.equal((await f.api.removedTeams(f.staff,{eventId:f.event.id})).teams.length,0);
 await f.api.teamRemove(f.staff,input(f,f.teams[0],'entry-limit-remove',2));
 await f.api.schoolTeams(f.staff,{eventId:f.event.id,schoolId:school.id,targetCount:50,requestId:'entry-fill-limit'});
 await assert.rejects(f.api.teamRestore(f.staff,input(f,f.teams[0],'entry-limit-restore',3)),{status:409});
});
