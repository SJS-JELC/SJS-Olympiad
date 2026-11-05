import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';

async function fixture(year,past=false){
 const repo=memoryRepository();let time=100000;
 const api=createService(repo,{},()=>time),staff=(await api.login({role:'teacher',code:'5678'})).token;
 const timing=past?{theoryStartsAt:1000,theoryEndsAt:2000,practicalStartsAt:3000,practicalEndsAt:4000}:{theoryStartsAt:500000,theoryEndsAt:600000,practicalStartsAt:700000,practicalEndsAt:800000};
 const event=(await api.eventCreate(staff,{name:'Synthetic draft '+year,year,...timing})).events[0];
 const first=(await api.teamAdd(staff,{eventId:event.id,name:'Alpha'})).teams[0];
 await api.teamAdd(staff,{eventId:event.id,name:'Beta'});

 return {repo,api,staff,event,first,setTime:value=>time=value};
}
for(const year of ['U5','L6'])for(const past of [false,true])test(`${year} ${past?'past':'future'} draft preserves real schedules, claims and results, respecting starts and ends`,async()=>{
 const f=await fixture(year,past),player=await f.api.login({role:'competitor',code:'1234'}),state=player.state;
 assert.equal(state.practice,undefined);assert.equal(state.activeEvent.id,f.event.id);assert.equal(state.activeEvent.year,year);
 assert.equal(state.activeEvent.theoryStartsAt,f.event.theoryStartsAt);assert.equal(state.activeEvent.theoryEndsAt,f.event.theoryEndsAt);
 const roster=(await f.api.teams(player.token)).teams;
 assert.deepEqual(roster.map(team=>team.name).sort(),['Alpha','Beta',"St John's 1","St John's 2","St John's 3","St John's 4"]);assert.ok(roster.every(team=>team.year===year&&!team.claimed));
 if(past){
  await assert.rejects(f.api.claim(player.token,{teamId:f.first.id}),{status:403});
  assert.equal((await f.repo.get(f.event.id+'-'+f.first.id,'team')).owner,null);return;
 }
 await f.api.claim(player.token,{teamId:f.first.id});const started=await f.api.start(player.token);
 assert.equal(started.team.name,'Alpha');assert.equal(started.team.year,year);assert.equal(started.score,0);
 assert.ok(Object.keys(started.hydration.questions).every(id=>id.startsWith(year)));
 const another=await f.api.login({role:'competitor',code:'1234'});
 assert.equal((await f.api.teams(another.token)).teams.find(team=>team.id===f.first.id).claimed,true);
 await assert.rejects(f.api.claim(another.token,{teamId:f.first.id}),{status:409});
 const id=year==='U5'?'U5P6':'L6P8',answer=year==='U5'?'485':'0.437';
 await assert.rejects(f.api.question(player.token,{questionId:id}),{status:403});
 f.setTime(500000);
 const wrong=await f.api.submit(player.token,{questionId:id,requestId:'draft-wrong-0001',answers:{answer:'1'}});assert.equal(wrong.attempt.retryAt,year==='U5'?520000:515000);
 const blocked=await f.api.submit(player.token,{questionId:id,requestId:'early-correct-001',answers:{answer}});assert.equal(blocked.score,0);assert.equal(blocked.attempt.retryAt,wrong.attempt.retryAt);assert.equal(blocked.attempt.solvedAt,null);
 f.setTime(521000);const marked=await f.api.submit(player.token,{questionId:id,requestId:'draft-correct-001',answers:{answer}});assert.equal(marked.score,year==='U5'?2:3);
 const persisted=await f.repo.get(f.event.id+'-'+f.first.id,'q-'+id);assert.equal(persisted.state.solvedAt,521000);assert.deepEqual(persisted.state.answers,{});
 assert.equal((await f.api.leaderboard(f.staff)).rows[0].score,marked.score);
 if(year==='U5')await assert.rejects(f.api.practical(player.token),{status:404});
 else{
  await assert.rejects(f.api.practical(player.token),{status:403});f.setTime(700000);
  assert.equal((await f.api.practical(player.token)).readOnly,false);
  const saved=await f.api.practicalSave(player.token,{requestId:'draft-practical-001',expectedRevision:0,changes:{numPracticalResponse3:'12.34'}});assert.equal(saved.responses.numPracticalResponse3.text,'12.34');
 }
 await f.api.eventUpdate(f.staff,{eventId:f.event.id,expectedRevision:1,name:'Draft revised'});
 const restarted=createService(f.repo,{},()=>521000);assert.equal((await restarted.session(player.token)).score,marked.score);
 const locked=await restarted.breach(player.token,{expectedEpoch:started.competition.epoch,requestId:'draft-breach-001'});assert.equal(locked.competition.status,'LOCKED');
 await assert.rejects(restarted.submit(player.token,{questionId:id,requestId:'locked-draft-001',answers:{answer}}),{status:423});
 const recovery=await restarted.recovery(player.token,{code:'5678',expectedEpoch:locked.competition.epoch});
 assert.equal((await restarted.resume(player.token,{grant:recovery.grant,expectedEpoch:locked.competition.epoch})).competition.status,'ACTIVE');
 await assert.rejects(restarted.session(player.token,{restore:true}),{status:401});
 const fresh=await restarted.login({role:'competitor',code:'1234'});await assert.rejects(restarted.claim(fresh.token,{teamId:f.first.id}),{status:409});
 await restarted.teamRelease(f.staff,{eventId:f.event.id,teamId:f.first.id,confirm:true});
 await restarted.claim(fresh.token,{teamId:f.first.id});const resumed=await restarted.start(fresh.token);assert.equal(resumed.score,marked.score);assert.equal(resumed.hydration.questions[id].attempt.solvedAt,521000);assert.deepEqual(resumed.hydration.questions[id].attempt.answers,{});
 f.setTime(600000);await assert.rejects(f.api.question(fresh.token,{questionId:id}),{status:403});
 if(year==='L6'){f.setTime(800000);await assert.rejects(f.api.practicalSave(fresh.token,{requestId:'ended-practical-001',expectedRevision:1,changes:{numPracticalResponse3:'20'}}),{status:403});}
});

test('removed roster rows stay absent and an empty draft has no invented teams',async()=>{
 const f=await fixture('U5');for(const row of await f.repo.list({kind:'team',eventId:f.event.id}))await f.repo.write({...row,removed:true},row.etag);
 const player=await f.api.login({role:'competitor',code:'1234'});assert.deepEqual((await f.api.teams(player.token)).teams,[]);
});

for(const activity of ['wrong','correct','timed','none'])test(`draft deletion preserves submitted ${activity} activity and fences claims`,async()=>{
 const f=await fixture('L6'),player=await f.api.login({role:'competitor',code:'1234'});await f.api.claim(player.token,{teamId:f.first.id});await f.api.start(player.token);f.setTime(500000);
 if(activity==='timed')await f.api.action(player.token,{questionId:'L6P3',requestId:'draft-timed-0001',action:{type:'start'}});
 else if(activity!=='none')await f.api.submit(player.token,{questionId:'L6P8',requestId:'draft-mark-0001',answers:{answer:activity==='correct'?'0.437':'1'}});
 const result=await f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:f.first.id,teamName:'Alpha',requestId:'draft-delete-001',confirm:true});
 assert.equal(result.outcome,activity==='none'?'deleted':'removed');await assert.rejects(f.api.session(player.token),{status:401});
 const rows=await f.repo.list({partitionKey:f.event.id+'-'+f.first.id});assert.equal(rows.some(row=>row.kind==='question'),activity!=='none');
});

test('legacy latest draft is selected only without an active event; active schedules stay authoritative',async()=>{
 const f=await fixture('L6'),settings=await f.repo.get('system','settings');
 const latest={...f.event,id:'latest-u5-draft',year:'U5',name:'Latest draft'};
 await f.repo.write({...settings,events:[f.event,latest]},settings.etag);
 const practice=await f.api.login({role:'competitor',code:'1234'});assert.equal(practice.state.activeEvent.year,'U5');assert.equal(practice.state.activeEvent.id,latest.id);
 const revised=await f.repo.get('system','settings');await f.repo.write({...revised,events:[{...f.event,status:'active'},latest]},revised.etag);
 const live=await f.api.login({role:'competitor',code:'1234'});assert.equal(live.state.practice,undefined);assert.equal(live.state.activeEvent.id,f.event.id);
 assert.equal(live.state.activeEvent.theoryStartsAt,f.event.theoryStartsAt);
 await f.api.claim(live.token,{teamId:(await f.api.teams(live.token)).teams.find(team=>team.name==='Beta').id});await f.api.start(live.token);
 await assert.rejects(f.api.question(live.token,{questionId:'L6P8'}),{status:403});
});
