import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';
import {handle} from '../src/http.mjs';

async function fixture() {
  const repo=memoryRepository(),api=createService(repo,{eventId:'pilot',endsAt:200000},()=>100000);
  const staff=(await api.login({role:'teacher',code:'5678'})).token,player=(await api.login({role:'competitor',code:'1234'})).token;
  const deletion=(teamId='test-1',teamName='Test team 1',requestId='delete-request-001')=>({eventId:'pilot',teamId,teamName,requestId,confirm:true});
  return {repo,api,staff,player,deletion};
}
async function start(f,id='test-1') {await f.api.claim(f.player,{teamId:id});await f.api.start(f.player);}

test('delete requires teacher, explicit confirmation/name and an editable event',async()=>{
  const f=await fixture();
  await assert.rejects(f.api.teamDelete(f.player,f.deletion()),{status:403});
  await assert.rejects(f.api.teamDelete(f.staff,{...f.deletion(),confirm:false}),{status:400});
  await assert.rejects(f.api.teamDelete(f.staff,{...f.deletion(),teamName:'Other team'}),{status:409});
  const state=await f.api.events(f.staff);
  await f.api.eventEnd(f.staff,{eventId:'pilot',expectedRevision:state.activeEvent.revision,confirm:true});
  await assert.rejects(f.api.teamDelete(f.staff,f.deletion()),{status:409});
  assert.ok(await f.repo.get('pilot-test-1','team'));
});

test('production HTTP dispatch exposes guarded team deletion with the teacher cookie',async()=>{
  const f=await fixture();
  const response=await handle({method:'POST',params:{action:'team-delete'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:'__Host-olympiad-session='+f.staff},body:f.deletion()},()=>f.api);
  assert.equal(response.status,200);assert.equal(response.body.outcome,'deleted');
});

test('permanent cleanup follows all team rows in Azure-sized conditional chunks',async()=>{
  const f=await fixture();
  for(let i=0;i<125;i++)await f.repo.write({partitionKey:'pilot-test-1',rowKey:'saved-'+i,kind:'question',state:{answers:{answer:'draft'}}});
  const original=f.repo.batch;let cleanupChunks=0;
  f.repo.batch=async ops=>{assert.ok(ops.length<=100);if(ops.some(op=>op.remove))cleanupChunks++;return original(ops);};
  await f.api.teamDelete(f.staff,f.deletion());assert.equal(cleanupChunks,3);
  assert.deepEqual((await f.repo.list({partitionKey:'pilot-test-1'})).map(row=>row.kind).sort(),['admin-receipt','team-deletion']);
});

test('draft permanently deletes every team data row, retaining only minimal deletion fencing',async()=>{
  const f=await fixture(),state=await f.api.eventCreate(f.staff,{name:'Draft',year:'U6',theoryStartsAt:0,theoryEndsAt:300000});
  const eventId=state.createdEventId,added=await f.api.teamAdd(f.staff,{eventId,name:'Draft team'}),team=added.teams[0],pk=eventId+'-'+team.id;
  await f.repo.write({partitionKey:pk,rowKey:'old-answer',kind:'question',state:{answers:{answer:'private'},solvedAt:90000}});
  const result=await f.api.teamDelete(f.staff,{eventId,teamId:team.id,teamName:team.name,requestId:'draft-delete-001',confirm:true});
  assert.equal(result.outcome,'deleted');assert.equal(result.teams.length,0);
  assert.deepEqual((await f.repo.list({partitionKey:pk})).map(row=>row.kind).sort(),['admin-receipt','team-deletion']);
});

test('active draft-only data permanently deletes; rerun migration never resurrects the legacy team',async()=>{
  const f=await fixture();await start(f);
  await f.api.question(f.player,{questionId:'L6P8'});
  await f.api.draft(f.player,{questionId:'L6P8',requestId:'draft-only-0001',expectedRevision:1,answers:{answer:'0.4'}});
  const result=await f.api.teamDelete(f.staff,f.deletion());assert.equal(result.outcome,'deleted');
  assert.equal(await f.repo.get('pilot-test-1','team'),null);
  await assert.rejects(f.api.session(f.player),{status:401});
  const restarted=createService(f.repo,{eventId:'pilot',endsAt:200000},()=>100000);
  await restarted.login({role:'teacher',code:'5678'});
  assert.equal(await f.repo.get('pilot-test-1','team'),null);
  assert.equal((await restarted.teams(f.staff)).teams.some(team=>team.id==='test-1'),false);
});

for(const activity of ['wrong','correct','timed'])test(`active ${activity} activity is retained, hidden and revoked`,async()=>{
  const f=await fixture();await start(f);
  if(activity==='timed')await f.api.action(f.player,{questionId:'L6P3',requestId:'timed-start-001',action:{type:'start'}});
  else await f.api.submit(f.player,{questionId:'L6P8',requestId:'submitted-0001',answers:{answer:activity==='correct'?'0.437':'0'}});
  const before=await f.repo.list({partitionKey:'pilot-test-1'}),result=await f.api.teamDelete(f.staff,f.deletion());
  assert.equal(result.outcome,'removed');
  const retained=await f.repo.get('pilot-test-1','team');assert.equal(retained.removed,true);assert.equal(retained.owner,null);assert.equal(retained.recovery,null);
  assert.equal(retained.score,activity==='correct'?3:0);
  for(const row of before.filter(row=>!['team','deleted-team'].includes(row.rowKey)))assert.deepEqual(await f.repo.get(row.partitionKey,row.rowKey),row);
  assert.equal((await f.repo.get('pilot-test-1','deleted-team')).kind,'team-deletion');
  assert.equal(result.teams.some(team=>team.id==='test-1'),false);assert.equal((await f.api.leaderboard(f.staff)).entries.length,0);
  await assert.rejects(f.api.session(f.player),{status:401});
  await assert.rejects(f.api.teamAdd(f.staff,{eventId:'pilot',name:'test TEAM 1'}),{status:409});
  assert.equal((await f.api.teamDelete(f.staff,f.deletion())).outcome,'removed');
});

test('existing zero-score legacy attempts are activity even without the new summary flag',async()=>{
  const f=await fixture();
  await f.repo.write({partitionKey:'pilot-test-1',rowKey:'attempt-old',answer:'wrong',correct:false});
  assert.equal((await f.api.teams(f.staff)).teams.find(team=>team.id==='test-1').hasSubmittedActivity,true);
  assert.equal((await f.api.teamDelete(f.staff,f.deletion())).outcome,'removed');
});

test('deletion fences an already accepted score transaction; no old write survives the permanent wipe',async()=>{
  const f=await fixture();await start(f);
  f.repo.beforeBatch=async()=>{assert.equal((await f.api.teamDelete(f.staff,f.deletion())).outcome,'deleted');};
  await assert.rejects(f.api.submit(f.player,{questionId:'L6P8',requestId:'race-submit-001',answers:{answer:'0.437'}}),{status:401});
  assert.equal(await f.repo.get('pilot-test-1','q-L6P8'),null);assert.equal(await f.repo.get('pilot-test-1','receipt-race-submit-001'),null);
});

test('submission winning the deletion race changes classification to retained on conditional retry',async()=>{
  const f=await fixture();await start(f);
  f.repo.beforeBatch=async()=>{await f.api.submit(f.player,{questionId:'L6P8',requestId:'winning-submit-001',answers:{answer:'0'}});};
  assert.equal((await f.api.teamDelete(f.staff,f.deletion())).outcome,'removed');
  assert.ok(await f.repo.get('pilot-test-1','receipt-winning-submit-001'));
});

test('failed cleanup is hidden/revoked and retry completes safely without touching another team',async()=>{
  const f=await fixture();await start(f);await f.api.question(f.player,{questionId:'L6P8'});
  f.repo.beforeBatch=async()=>{f.repo.beforeBatch=async()=>{throw Error('Temporary cleanup failure');};};
  await assert.rejects(f.api.teamDelete(f.staff,f.deletion()),/Temporary cleanup/);
  assert.equal((await f.repo.get('pilot-test-1','team')).removed,true);
  await assert.rejects(f.api.session(f.player),{status:401});
  assert.equal((await f.api.teamDelete(f.staff,f.deletion())).outcome,'deleted');
  assert.ok(await f.repo.get('pilot-test-2','team'));assert.equal(await f.repo.get('pilot-test-1','q-L6P8'),null);
});

test('delayed duplicate cleanup cannot delete a recreated team or its new answers',async()=>{
  const f=await fixture();const added=await f.api.teamAdd(f.staff,{eventId:'pilot',name:'Reusable'}),team=added.teams.find(team=>team.name==='Reusable'),pk='pilot-'+team.id,input=f.deletion(team.id,team.name);
  await start(f,team.id);await f.api.question(f.player,{questionId:'L6P8'});
  f.repo.beforeBatch=async()=>{f.repo.beforeBatch=async()=>{
    await f.api.teamDelete(f.staff,input);
    await f.api.teamAdd(f.staff,{eventId:'pilot',name:'Reusable'});
    await f.repo.write({partitionKey:pk,rowKey:'q-L6P8',kind:'question',state:{answers:{answer:'new'},solvedAt:null}});
  };};
  await f.api.teamDelete(f.staff,input);
  const recreated=await f.repo.get(pk,'team');assert.equal(recreated.removed,undefined);assert.ok(recreated.claimGeneration>1);
  assert.equal((await f.repo.get(pk,'q-L6P8')).state.answers.answer,'new');
  await f.api.teamDelete(f.staff,input);assert.equal((await f.repo.get(pk,'q-L6P8')).state.answers.answer,'new');
  await assert.rejects(f.api.claim(f.player,{teamId:team.id}),{status:401});
});

test('catalogue teacher preview spans years without events, team claims or real score changes',async()=>{
  const f=await fixture(),before=await f.api.events(f.staff);
  const preview=await f.api.submit(f.staff,{eventId:'catalogue-U5',questionId:'U5P6',requestId:'catalogue-submit-001',answers:{answer:'485'}});
  assert.equal(preview.score,0);assert.equal(preview.attempt.solvedAt,100000);assert.deepEqual((await f.api.events(f.staff)).events,before.events);
  await start(f);
  await assert.rejects(f.api.question(f.player,{eventId:'catalogue-U5',questionId:'U5P6'}),{status:403});
  await assert.rejects(f.api.question(f.staff,{eventId:'catalogue-U5',questionId:'U6P6'}),{status:404});
  assert.equal((await f.api.leaderboard(f.staff)).entries.length,0);
});

test('stale team creation cannot reuse a generation after an intervening recreation/deletion cycle',async()=>{
  const f=await fixture(),name='Reusable fence';
  const team=(await f.api.teamAdd(f.staff,{eventId:'pilot',name})).teams.find(team=>team.name===name),pk='pilot-'+team.id;
  await f.api.teamDelete(f.staff,f.deletion(team.id,name,'first-removal-001'));
  const get=f.repo.get.bind(f.repo);let injected=false,intermediateGeneration;
  f.repo.get=async(p,r)=>{const result=await get(p,r);if(!injected && p===pk && r==='deleted-team'){
    injected=true;
    await f.api.teamAdd(f.staff,{eventId:'pilot',name});
    intermediateGeneration=(await f.api.claim(f.player,{teamId:team.id})).team.claimGeneration;
    await f.api.teamDelete(f.staff,f.deletion(team.id,name,'second-removal-001'));
  }return result;};
  await f.api.teamAdd(f.staff,{eventId:'pilot',name});
  const recreated=await get(pk,'team');assert.ok(recreated.claimGeneration>intermediateGeneration);
  assert.equal((await get(pk,'deleted-team')).claimGeneration,recreated.claimGeneration);
  await assert.rejects(f.api.claim(f.player,{teamId:team.id}),{status:401});
});
