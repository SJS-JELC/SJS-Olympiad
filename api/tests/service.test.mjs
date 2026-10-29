import test from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../src/service.mjs';
import { handle } from '../src/http.mjs';
import { mark } from '../src/marking.mjs';
function fixture() {
  const rows = new Map(); let time=100000, version=0;
  const key=(p,r)=>p+'/'+r;
  const save=entity=>rows.set(key(entity.partitionKey,entity.rowKey),{...entity,etag:String(++version)});
  const conflict=()=>{throw Object.assign(new Error('Conflict'),{statusCode:412});};
  const repo={
    async get(p,r){return structuredClone(rows.get(key(p,r)) ?? null);},
    async write(entity,etag){const old=rows.get(key(entity.partitionKey,entity.rowKey));if(etag ? old?.etag!==etag : !!old)conflict();save(entity);},
    async commit(team,etag,attempt){if(rows.get(key(team.partitionKey,team.rowKey))?.etag!==etag || rows.has(key(attempt.partitionKey,attempt.rowKey)))conflict();save(team);save(attempt);},
  };
  const api=createService(repo,{code:'private-test-code',eventId:'pilot',endsAt:200000},()=>time);
  return {api,rows,setTime:value=>{time=value;},repo};
}
const claim={code:'private-test-code',teamId:'test-1',claimSecret:'a'.repeat(64)};
const submission={questionId:'L6P8',requestId:'submission-0000001',answer:'0.437'};
test('private marking preserves accepted/rejected answers',()=>{
  for(const value of ['0.437','.437','0.4370','4.37e-1',' 0.437 '])assert.equal(mark(value),true);
  for(const value of ['',' ','0.436','0.4371','0.4370001','437','NaN','0.437M'])assert.equal(mark(value),false);
});
test('concurrent claims and response-loss recovery',async()=>{
  const {api}=fixture();
  await assert.rejects(api.teams('wrong'),{status:403});
  const result=await Promise.allSettled([api.claim(claim),api.claim({...claim,claimSecret:'b'.repeat(64)})]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(result.find(r=>r.status==='rejected').reason.status,409);
  const first=result[0].value;
  assert.equal((await api.claim(claim)).token,first.token);
  assert.equal((await api.teams(claim.code)).teams.length,2);
  await assert.rejects(api.session('test-1.'+'b'.repeat(64)),{status:401});
});
test('transactional attempts, cooldown, concurrent scoring and isolation',async()=>{
  const {api,setTime,rows,repo}=fixture();const {token}=await api.claim(claim);
  const wrong={...submission,answer:'',requestId:'wrong-submission-01'};
  assert.equal((await api.submit(token,wrong)).correct,false);
  assert.equal((await api.submit(token,wrong)).retryAt,115000);
  await assert.rejects(api.submit(token,submission),{status:429});
  await assert.rejects(api.submit(token,{...wrong,answer:'1'}),{status:409});
  setTime(115000);
  const outcomes=await Promise.all([api.submit(token,submission),api.submit(token,submission),api.submit(token,{...submission,requestId:'submission-0000002'})]);
  assert.ok(outcomes.every(r=>r.score===3));
  assert.equal([...rows.values()].filter(r=>r.rowKey==='attempt-'+submission.requestId).length,1);
  const other=await api.claim({...claim,teamId:'test-2'});assert.equal(other.state.score,0);
  const restored=createService(repo,{code:claim.code,eventId:'pilot',endsAt:200000},()=>115000);
  assert.equal((await restored.session(token)).score,3);
  setTime(200000);await assert.rejects(api.submit(token,submission),{status:401});await assert.rejects(api.teams(claim.code),{status:403});
});
test('distributed limiter and fail-closed configuration',async()=>{
  const {api,setTime}=fixture();await Promise.all([api.throttle('join',2),api.throttle('join',2)]);
  await assert.rejects(api.throttle('join',2),{status:429});setTime(160000);await api.throttle('join',2);
  assert.throws(()=>createService({},{}),{status:503});
});
test('HTTP origin validation, secure cookie, errors and key absence',async()=>{
  const {api}=fixture();const origin='https://olympiad.masters-of-chemistry.app';
  const req={method:'POST',params:{action:'claim'},headers:{origin,'content-type':'application/json'},body:claim};
  const result=await handle(req,async()=>api);assert.equal(result.status,200);
  assert.match(result.headers['Set-Cookie'],/Secure; HttpOnly; SameSite=Strict; Path=\//);
  assert.ok(!JSON.stringify(result.body).includes('0.437'));assert.ok(!JSON.stringify(result.body).includes(claim.claimSecret));
  assert.equal((await handle({...req,headers:{...req.headers,origin:'https://evil.invalid'}},async()=>api)).status,403);
  assert.equal((await handle({...req,body:'invalid'},async()=>api)).status,400);
  assert.equal((await handle({...req,params:{action:'session'},method:'GET',headers:{}},async()=>api)).status,401);
  const failure=await handle(req,async()=>{throw Error('AccountKey=SECRET');});assert.equal(failure.status,503);assert.ok(!JSON.stringify(failure).includes('SECRET'));
});
