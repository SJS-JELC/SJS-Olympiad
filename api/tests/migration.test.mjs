import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createService } from '../src/service.mjs';
import { createService as createLegacyService } from './fixtures/legacy-service.mjs';
import { memoryRepository } from './helpers.mjs';
const secret='a'.repeat(64),token='test-1.'+secret;
const legacyHash=createHash('sha256').update(secret).digest('hex');
const oldTeam={partitionKey:'pilot-test-1',rowKey:'team',teamId:'test-1',name:'Test team 1',sessionHash:legacyHash,expires:200000,score:3,solvedAt:90000,retryAt:0};
const configuration={eventId:'pilot',endsAt:200000};
test('captured legacy handler loses its in-flight ETag then cannot authenticate or cap a migrated aggregate',async()=>{
  const receipt={partitionKey:'pilot-test-1',rowKey:'attempt-preserved-old-001',questionId:'L6P8',answer:'0.437',correct:true,submittedAt:90000};
  const repo=memoryRepository([oldTeam,receipt]);
  const legacy=createLegacyService(repo,{...configuration,code:'private-test-code'},()=>100000);
  assert.equal((await legacy.session(token)).score,3);
  const current=createService(repo,configuration,()=>100000);let currentToken;
  repo.beforeBatch=async()=>{
    await current.login({role:'teacher',code:'5678'});
    const login=await current.login({role:'competitor',code:'1234',legacyToken:token});
    currentToken=login.token;
    assert.equal(login.state.team.id,'test-1');assert.equal(login.state.competition.status,'LOCKED');
    const permission=await current.recovery(currentToken,{code:'5678',expectedEpoch:login.state.competition.epoch});
    await current.resume(currentToken,{grant:permission.grant,expectedEpoch:login.state.competition.epoch});
    const awarded=await current.submit(currentToken,{questionId:'L6P6',requestId:'new-question-six-001',answers:{answer:'30'}});
    assert.equal(awarded.score,5);
  };
  // The old handler captured its team before bootstrap. Migration and the new
  // award commit before its legacy transaction, forcing its retry to re-auth.
  await assert.rejects(legacy.submit(token,{questionId:'L6P8',requestId:'legacy-pending-001',answer:'0.437'}),{status:401});
  await assert.rejects(legacy.session(token),{status:401});
  await assert.rejects(legacy.submit(token,{questionId:'L6P8',requestId:'legacy-later-0001',answer:'0.437'}),{status:401});
  const team=await repo.get('pilot-test-1','team');assert.equal(team.score,5);assert.ok(!Object.hasOwn(team,'sessionHash'));assert.ok(!Object.hasOwn(team,'expires'));assert.equal(team.legacySessionHash,legacyHash);assert.equal(team.legacyExpires,200000);
  const state=await current.session(currentToken);assert.equal(state.score,5);assert.equal(state.attempts.L6P8.solvedAt,90000);assert.equal(state.attempts.L6P6.solvedAt,100000);
  assert.deepEqual(await repo.get(receipt.partitionKey,receipt.rowKey),{...receipt,etag:'2'});
  assert.equal(await repo.get('pilot-test-1','attempt-legacy-pending-001'),null);
});

test('schema-v2 rerun fences old fields without changing claims, generations, question state or released legacy ownership',async()=>{
  const question={partitionKey:'pilot-test-1',rowKey:'q-L6P8',kind:'question',questionId:'L6P8',revision:7,state:{answers:{answer:'0.437'},feedback:{answer:true},retryAt:0,solvedAt:90000},privateState:{}};
  const team={...oldTeam,kind:'team',schemaVersion:2,eventId:'pilot',year:'L6',score:5,lastScoringAt:100000,claimGeneration:4,securityEpoch:8,securityStatus:'LOCKED',owner:null,legacySessionHash:null,legacyExpires:200000,recovery:null};
  const repo=memoryRepository([team,question]);
  const beforeQuestion=await repo.get(question.partitionKey,question.rowKey);
  const current=createService(repo,configuration,()=>100000);await current.login({role:'teacher',code:'5678'});
  const fenced=await repo.get(team.partitionKey,team.rowKey);
  assert.ok(!Object.hasOwn(fenced,'sessionHash'));assert.ok(!Object.hasOwn(fenced,'expires'));assert.equal(fenced.legacySessionHash,null);assert.equal(fenced.score,5);assert.equal(fenced.claimGeneration,4);assert.equal(fenced.securityEpoch,8);
  assert.deepEqual(await repo.get(question.partitionKey,question.rowKey),beforeQuestion);
  const recreated=createService(repo,configuration,()=>100000);await recreated.login({role:'teacher',code:'5678'});
  assert.deepEqual(await repo.get(team.partitionKey,team.rowKey),fenced);
  const login=await recreated.login({role:'competitor',code:'1234',legacyToken:token});assert.equal(login.state.team,null);
});

for(const existingFence of [false,true])test(`bootstrap import transaction cannot resurrect deletion after a ${existingFence?'present':'missing'} lifecycle fence read`,async()=>{
  const repo=memoryRepository(),clock=()=>100000,live=createService(repo,configuration,clock),staff=(await live.login({role:'teacher',code:'5678'})).token;
  const pk='pilot-test-1',originalGet=repo.get.bind(repo);
  if(!existingFence){const fence=await originalGet(pk,'deleted-team');if(fence)await repo.remove(pk,'deleted-team',fence.etag);}
  const other=await originalGet('pilot-test-2','team');let injected=false;
  repo.get=async(p,r)=>{
    const result=await originalGet(p,r);
    if(!injected && p===pk && r==='deleted-team'){
      injected=true;
      await live.teamDelete(staff,{eventId:'pilot',teamId:'test-1',teamName:'Test team 1',requestId:'review-bootstrap-race',confirm:true});
    }
    return result;
  };
  await createService(repo,configuration,clock).login({role:'teacher',code:'5678'});
  assert.equal(injected,true);assert.equal(await originalGet(pk,'team'),null);assert.equal(await originalGet(pk,'q-L6P8'),null);
  assert.equal((await originalGet(pk,'deleted-team')).kind,'team-deletion');assert.equal((await originalGet(pk,'deleted-team')).complete,true);
  assert.deepEqual(await originalGet('pilot-test-2','team'),other);
});
