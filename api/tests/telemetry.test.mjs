import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { withRequestTelemetry, measurePhase, performanceSnapshot, tableTelemetryOptions } from '../src/telemetry.mjs';
import { memoryRepository } from '../src/memory-storage.mjs';
import { createRepository, encode } from '../src/storage.mjs';
import { createService, ApiError } from '../src/service.mjs';
import { handle } from '../src/http.mjs';

const origin='https://olympiad.masters-of-chemistry.app';
const request=(action,method='GET',extra={})=>({method,params:{action},headers:{origin,'content-type':'application/json'},body:{},...extra});
const ok=()=>({status:200,headers:{},body:{ok:true}});
const hasHeaders=response=>{
  assert.match(response.headers['X-Request-Id'],/^[a-f0-9-]{36}$/);
  assert.match(response.headers['Server-Timing'],/^total;dur=\d+, init;dur=\d+, app;dur=\d+$/);
  assert.equal(response.headers['Cache-Control'],'no-store');
};

test('concurrent requests keep independent phases, storage counts and generated correlation IDs',async()=>{
  const repo=memoryRepository([{partitionKey:'PRIVATE_KEY',rowKey:'PRIVATE_ROW',payload:'PRIVATE_PAYLOAD'}]);
  const records=[];
  const responses=await Promise.all(Array.from({length:100},(_,index)=>{
    const count=index%4+1;
    const api={teams:async()=>{
      for(let i=0;i<count;i++)await measurePhase('settings',async()=>{await yieldTurn();await repo.get('PRIVATE_KEY','PRIVATE_ROW');});
      return {count};
    }};
    return handle(request('teams','GET',{headers:{'x-request-id':'PRIVATE_CALLER_ID',cookie:'PRIVATE_COOKIE'}}),()=>api,{log:record=>records.push(record)});
  }));
  assert.equal(new Set(responses.map(response=>response.headers['X-Request-Id'])).size,100);
  for(const response of responses){
    hasHeaders(response);
    const record=records.find(record=>record.requestId===response.headers['X-Request-Id']);
    assert.equal(record.storage.get.count,response.body.count);
    assert.equal(record.phases.find(phase=>phase.name==='settings').count,response.body.count);
    assert.equal(record.transport.attempts,0);
  }
  assert.doesNotMatch(JSON.stringify(records),/PRIVATE_/);
});

test('safe coarse headers and structured context logging cover JSON, binary, validation and initialization errors',async()=>{
  const records=[],context={log(record){assert.equal(this,context);records.push(record);}};
  const binary=Buffer.from('PRIVATE_BINARY');
  const api={throttle:async()=>{},contentAsset:async()=>({binary:true,mimeType:'image/png',body:binary}),
    teams:async()=>{throw new ApiError(403,'PRIVATE_ALLOWED_ERROR');}};
  const asset=await handle(request('content-asset','POST'),()=>api,context);
  assert.equal(asset.body,binary);assert.equal(asset.isRaw,true);assert.equal(asset.headers['Content-Type'],'image/png');
  const forbidden=await handle(request('teams'),()=>api,context);
  assert.equal(forbidden.status,403);assert.equal(forbidden.body.error,'PRIVATE_ALLOWED_ERROR');
  const unavailable=await handle(request('teams'),async()=>{await yieldTurn();throw Error('PRIVATE_CONNECTION_STRING');},context);
  assert.equal(unavailable.status,503);
  assert.ok(records.at(-1).phases.some(phase=>phase.name==='getService'));
  const unknown=await handle(request('PRIVATE_ACTION?secret=PRIVATE_QUERY'),()=>{throw Error('must not initialize');},context);
  assert.equal(unknown.status,404);assert.equal(records.at(-1).action,'unknown');
  assert.ok(records.at(-1).phases.some(phase=>phase.name==='validation'));
  const invalid=await handle(request('login','POST',{headers:{origin:'PRIVATE_ORIGIN'},body:{code:'PRIVATE_CODE'}}),()=>api,context);
  assert.equal(invalid.status,403);
  for(const response of [asset,forbidden,unavailable,unknown,invalid])hasHeaders(response);
  assert.doesNotMatch(JSON.stringify(records),/PRIVATE_|cookie|stack|payload|url/i);
  const accepted=await handle(request('availability'),()=>({availability:async()=>({competitorAvailable:true})}),{log(){throw Error('PRIVATE_LOGGER');}});
  assert.equal(accepted.status,200);hasHeaders(accepted);
});

test('wall clock jumps do not produce negative request or phase durations',async t=>{
  let clock=2000;
  t.mock.method(Date,'now',()=>clock-=1000);
  let record;
  await withRequestTelemetry('availability','GET',()=>measurePhase('operation',async()=>{Date.now();await yieldTurn();Date.now();return ok();}),value=>record=value);
  assert.ok(record.durationMs>=0 && record.durationMs<10000);
  assert.ok(record.phases[0].totalMs>=0 && record.phases[0].totalMs<10000);
});

test('storage tracks pages, rows, failures, query classes and transaction sizes without values',async()=>{
  class Transaction {actions=[];createEntity(entity){this.actions.push(entity);}}
  let failList=false;
  const repo=createRepository({
    getEntity:async()=>{throw Object.assign(Error('PRIVATE_ERROR'),{statusCode:404});},
    createEntity:async()=>{throw Object.assign(Error('PRIVATE_ERROR'),{statusCode:412});},
    deleteEntity:async()=>{},submitTransaction:async()=>{},
    listEntities:()=>({byPage:async function*(){
      yield [encode({partitionKey:'PRIVATE_KEY',rowKey:'PRIVATE_ROW',secret:'PRIVATE_ANSWER'})];
      yield [];
      if(failList)throw Error('PRIVATE_ERROR');
      yield [encode({partitionKey:'PRIVATE_KEY',rowKey:'PRIVATE_ROW_2'})];
    }}),
  },Transaction);
  let record;
  await withRequestTelemetry('teams','GET',async()=>{
    assert.equal(await repo.get('PRIVATE_KEY','missing'),null);
    await assert.rejects(repo.write({partitionKey:'PRIVATE_KEY',rowKey:'PRIVATE_ROW'}));
    await repo.remove('PRIVATE_KEY','PRIVATE_ROW','PRIVATE_ETAG');
    assert.equal((await repo.list({partitionKey:'PRIVATE_KEY'})).length,2);
    failList=true;await assert.rejects(repo.list({partitionKey:'PRIVATE_KEY',rowKeyFrom:'PRIVATE_FROM',rowKeyTo:'PRIVATE_TO'}));
    await repo.batch([1,2,3].map(n=>({entity:{partitionKey:'PRIVATE_KEY',rowKey:String(n)}})));
    return ok();
  },value=>record=value);
  assert.equal(record.storage.get.count,1);assert.equal(record.storage.get.rows,0);assert.equal(record.storage.get.errors,0);
  assert.equal(record.storage.write.errors,1);assert.equal(record.storage.write.rows,0);
  assert.equal(record.storage.remove.count,1);
  assert.equal(record.storage.list.count,2);assert.equal(record.storage.list.errors,1);
  assert.equal(record.storage.list.pages,5);assert.equal(record.storage.list.rows,3);
  assert.deepEqual(record.storage.list.queryClasses,{point:0,partition:1,range:1,unpartitioned:0});
  assert.equal(record.storage.batch.transactionEntities,3);assert.equal(record.storage.batch.maxTransactionEntities,3);
  assert.equal(record.storage.batch.rows,3);
  assert.doesNotMatch(JSON.stringify(record),/PRIVATE_/);
});

test('application conflicts count retries actually performed, including exhausted operations',async()=>{
  let failures=2,record;
  const settings=encode({partitionKey:'system',rowKey:'settings',events:[]});
  const repo=createRepository({getEntity:async(p,r)=>r==='settings'?settings:null,
    createEntity:async()=>{if(failures-->0)throw Object.assign(Error('PRIVATE_CONFLICT'),{statusCode:412});}},null);
  const api=createService(repo);
  await withRequestTelemetry('login','POST',async()=>{await api.throttle('PRIVATE_BUCKET');return ok();},value=>record=value);
  assert.equal(record.conflictRetries,2);assert.equal(record.storage.write.count,3);assert.equal(record.storage.write.errors,2);
  failures=20;
  await withRequestTelemetry('login','POST',async()=>{await assert.rejects(api.throttle('PRIVATE_BUCKET'),{status:409});return ok();},value=>record=value);
  assert.equal(record.conflictRetries,7);assert.equal(record.storage.write.count,8);
});

test('transport policy counts thrown failures without serializing exception or request details',async()=>{
  let record;
  const policy=tableTelemetryOptions().additionalPolicies[0];assert.equal(policy.position,'perRetry');
  await withRequestTelemetry('teams','GET',async()=>{
    await assert.rejects(policy.policy.sendRequest({url:'PRIVATE_URL',headers:{authorization:'PRIVATE_TOKEN'}},async()=>{throw Error('PRIVATE_ERROR');}));
    return ok();
  },value=>record=value);
  assert.equal(record.transport.attempts,1);assert.equal(record.transport.failures,1);
  assert.doesNotMatch(JSON.stringify(record),/PRIVATE_/);
});

test('instance history is bounded, projected, detached and ignores arbitrary dimension labels',async()=>{
  for(let index=0;index<300;index++)await withRequestTelemetry('PRIVATE_'+index,'PRIVATE_METHOD',()=>measurePhase('PRIVATE_PHASE',ok));
  const snapshot=performanceSnapshot();
  assert.equal(snapshot.schemaVersion,1);assert.equal(snapshot.scope,'instance');assert.equal(snapshot.window.count,256);
  assert.ok(snapshot.totalRequests>=300);assert.equal(snapshot.routes.length,1);
  assert.equal(snapshot.routes[0].requests,256);assert.equal(snapshot.routes[0].action,'unknown');assert.equal(snapshot.routes[0].method,'OTHER');
  assert.equal(snapshot.routes[0].phases.length,0);
  assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE_|requestId/);
  snapshot.routes[0].storage.get.count=999;
  assert.equal(performanceSnapshot().routes[0].storage.get.count,0);
});
