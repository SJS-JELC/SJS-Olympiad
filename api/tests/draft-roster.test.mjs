import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';

async function fixture(year,past=false){
 const repo=memoryRepository();let time=100000;
 const api=createService(repo,{},()=>time),staff=(await api.login({role:'teacher',code:'5678'})).token;
 const timing=past?{theoryStartsAt:1000,theoryEndsAt:2000,practicalStartsAt:3000,practicalEndsAt:4000}:{theoryStartsAt:500000,theoryEndsAt:600000,practicalStartsAt:700000,practicalEndsAt:800000};
 const event=(await api.eventCreate(staff,{name:'Synthetic draft '+year,year,...timing})).events[0];
 const first=(await api.teamAdd(staff,{eventId:event.id,name:'Hypothetical Alpha'})).teams[0];
 await api.teamAdd(staff,{eventId:event.id,name:'Hypothetical Beta'});
 const row=await repo.get(event.id+'-'+first.id,'team');
 await repo.write({...row,owner:'durable-owner',score:7,claimGeneration:8,securityStatus:'LOCKED'},row.etag);
 const durable=()=>JSON.stringify([...repo.rows].filter(([,row])=>row.kind!=='session'));
 return {repo,api,staff,event,first,durable,setTime:value=>time=value};
}
for(const year of ['U5','L6'])for(const past of [false,true])test(`${year} ${past?'past':'future'} draft uses its year, roster and open isolated challenge windows`,async()=>{
 const f=await fixture(year,past),before=f.durable();
 const player=await f.api.login({role:'competitor',code:'1234'}),state=player.state;
 assert.equal(state.practice,true);assert.equal(state.activeEvent.id,f.event.id);assert.equal(state.activeEvent.year,year);
 assert.ok(state.activeEvent.theoryStartsAt<state.serverNow);assert.equal(state.activeEvent.theoryEndsAt,state.expiresAt);
 const roster=(await f.api.teams(player.token)).teams;
 assert.deepEqual(roster.map(team=>team.name).sort(),['Hypothetical Alpha','Hypothetical Beta']);
 assert.ok(roster.every(team=>team.year===year&&!team.claimed));
 const chosen=roster.find(team=>team.name==='Hypothetical Alpha');
 await f.api.claim(player.token,{teamId:chosen.id});const started=await f.api.start(player.token);
 assert.equal(started.team.name,'Hypothetical Alpha');assert.equal(started.team.year,year);assert.equal(started.score,0);
 assert.ok(Object.keys(started.hydration.questions).every(id=>id.startsWith(year)));
 const id=year==='U5'?'U5P6':'L6P8';
 const wrong=await f.api.submit(player.token,{questionId:id,requestId:'draft-wrong-0001',answers:{answer:'1'}});assert.ok(wrong.attempt.retryAt>100000);
 f.setTime(121000);const marked=await f.api.submit(player.token,{questionId:id,requestId:'draft-correct-001',answers:{answer:year==='U5'?'485':'0.437'}});assert.equal(marked.score,year==='U5'?2:3);
 if(year==='U5')await assert.rejects(f.api.practical(player.token),{status:404});
 else{
  const practical=await f.api.practical(player.token);assert.equal(practical.readOnly,false);
  const saved=await f.api.practicalSave(player.token,{requestId:'practice-practical-01',expectedRevision:0,changes:{numPracticalResponse3:'12.34'}});assert.equal(saved.responses.numPracticalResponse3.text,'12.34');
 }
 assert.equal(f.durable(),before);
 const another=await f.api.login({role:'competitor',code:'1234'});assert.ok((await f.api.teams(another.token)).teams.every(team=>!team.claimed));
 await f.api.eventUpdate(f.staff,{eventId:f.event.id,expectedRevision:1,name:'Draft revised'});
 await assert.rejects(f.api.teams(player.token),{status:401});
});
test('removed roster rows stay absent and an empty draft retains the synthetic fallback',async()=>{
 const f=await fixture('U5'),rows=await f.repo.list({kind:'team',eventId:f.event.id});
 for(const row of rows)await f.repo.write({...row,removed:true},row.etag);
 const game=await f.api.login({role:'competitor',code:'1234'});
 assert.deepEqual((await f.api.teams(game.token)).teams.map(team=>team.name),['Practice team']);
});
test('legacy latest draft is selected only without an active event; active schedules stay authoritative',async()=>{
 const f=await fixture('L6'),settings=await f.repo.get('system','settings');
 const latest={...f.event,id:'latest-u5-draft',year:'U5',name:'Latest draft'};
 await f.repo.write({...settings,events:[f.event,latest]},settings.etag);
 const practice=await f.api.login({role:'competitor',code:'1234'});assert.equal(practice.state.activeEvent.year,'U5');assert.equal(practice.state.activeEvent.id,latest.id);
 const revised=await f.repo.get('system','settings');await f.repo.write({...revised,events:[{...f.event,status:'active'},latest]},revised.etag);
 const live=await f.api.login({role:'competitor',code:'1234'});assert.equal(live.state.practice,undefined);assert.equal(live.state.activeEvent.id,f.event.id);
 assert.equal(live.state.activeEvent.theoryStartsAt,f.event.theoryStartsAt);
 await f.api.claim(live.token,{teamId:(await f.api.teams(live.token)).teams.find(team=>team.name==='Hypothetical Beta').id});await f.api.start(live.token);
 await assert.rejects(f.api.question(live.token,{questionId:'L6P8'}),{status:403});
});
