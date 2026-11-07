import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { withRequestTelemetry, tableTelemetryOptions } from '../src/telemetry.mjs';
import { createRepository } from '../src/storage.mjs';

// Standard installed API dependencies; NODE_PATH may point at the existing
// external tooling mirror when running tests directly against synced sources.
const require=createRequire(import.meta.url);
const {TableClient,TableTransaction}=require('@azure/data-tables');
const {createHttpHeaders}=require('@azure/core-rest-pipeline');

test('real SDK direct delete transmits exact If-Match; batch delete relies on its named update fence',async()=>{
  const requests=[];
  const client=TableClient.fromConnectionString('DefaultEndpointsProtocol=https;AccountName=example;AccountKey=ZmFrZQ==;TableEndpoint=https://example.invalid',
    'TestTable',{httpClient:{async sendRequest(request){
      requests.push(request);
      return {request,status:request.method==='DELETE'?204:412,headers:createHttpHeaders({'content-type':'application/json'}),bodyAsText:request.method==='DELETE'?'':JSON.stringify({'odata.error':{code:'UpdateConditionNotSatisfied',message:{value:'Synthetic stale fence'}}})};
    }},retryOptions:{maxRetries:0}});
  const repo=createRepository(client,TableTransaction);
  await repo.remove('event!one','team!a!q-L6P8','W/"exact-17"');
  assert.equal(requests[0].headers.get('if-match'),'W/"exact-17"');
  const guard={entity:{partitionKey:'event!one',rowKey:'team!a!deleted-team',kind:'team-deletion'},etag:'W/"fence-12"'};
  const deletion={entity:{partitionKey:'event!one',rowKey:'team!a!q-L6P8'},etag:'W/"target-20"',remove:true};
  await assert.rejects(repo.batch([guard,deletion]),/conditional update fence/);assert.equal(requests.length,1);
  await assert.rejects(repo.batch([guard,deletion],{deleteGuard:{rowKey:guard.entity.rowKey,etag:guard.etag}}),{statusCode:412});
  assert.equal(requests.length,2);
  const body=String(requests[1].body);
  assert.match(body,/PUT [^\r\n]+deleted-team[^\r\n]+HTTP\/1\.1\r\n(?:(?!\r\n\r\n)[\s\S])*if-match: W\/"fence-12"/i);
  assert.match(body,/DELETE [^\r\n]+HTTP\/1\.1\r\n(?:(?!\r\n\r\n)[\s\S])*if-match: \*/i);
  assert.doesNotMatch(body,/target-20/); // Explicit SDK limitation, never mistaken for a conditional delete.
});

test('real SDK pipeline counts setup, retried sends, continuation pages and batch envelopes exactly',async()=>{
  let mode='setup',attempts=0,gets=0,pages=0,record;
  const httpClient={async sendRequest(request){
    attempts++;
    const headers={'content-type':'application/json'};
    let status=200,body={};
    if(mode==='setup')status=201;
    if(mode==='get') {
      gets++;
      if(gets<3){status=503;body={'odata.error':{code:'ServerBusy',message:{lang:'en',value:'PRIVATE_RETRY_ERROR'}}};}
      else body={PartitionKey:'PRIVATE_KEY',RowKey:'PRIVATE_ROW',payload:JSON.stringify({secret:'PRIVATE_PAYLOAD'})};
    }
    if(mode==='list'){
      pages++;body={value:[{PartitionKey:'PRIVATE_KEY',RowKey:'PRIVATE_ROW_'+pages,payload:'{}'}]};
      if(pages===1){headers['x-ms-continuation-NextPartitionKey']='PRIVATE_CONTINUATION';headers['x-ms-continuation-NextRowKey']='PRIVATE_ROW_CONTINUATION';}
    }
    if(mode==='batch'){status=400;body={'odata.error':{code:'InvalidInput',message:{lang:'en',value:'PRIVATE_BATCH_ERROR'}}};}
    return {request,status,headers:createHttpHeaders(headers),bodyAsText:JSON.stringify(body)};
  }};
  // Reserved example domain and injected HTTP client: this test cannot call Azure.
  const client=TableClient.fromConnectionString('DefaultEndpointsProtocol=https;AccountName=example;AccountKey=ZmFrZQ==;TableEndpoint=https://example.invalid',
    'TestTable',{...tableTelemetryOptions(),httpClient,retryOptions:{maxRetries:2,retryDelayInMs:1,maxRetryDelayInMs:2}});
  const policies=client.pipeline.getOrderedPolicies().map(policy=>policy.name);
  const retryIndex=policies.findIndex(name=>/retry/i.test(name));
  assert.ok(retryIndex>=0);assert.ok(policies.indexOf('olympiadTransportTelemetry')>retryIndex);
  const repo=createRepository(client,TableTransaction);
  await withRequestTelemetry('teams','GET',async()=>{
    await client.createTable();
    mode='get';assert.equal((await repo.get('PRIVATE_KEY','PRIVATE_ROW')).secret,'PRIVATE_PAYLOAD');
    mode='list';assert.equal((await repo.list({partitionKey:'PRIVATE_KEY'})).length,2);
    mode='batch';await assert.rejects(repo.batch([1,2].map(n=>({entity:{partitionKey:'PRIVATE_KEY',rowKey:String(n)}}))));
    return {status:200,headers:{}};
  },value=>record=value);
  assert.equal(attempts,7);assert.equal(record.transport.attempts,attempts);
  assert.equal(record.transport.failures,3);
  assert.equal(record.storage.get.count,1);assert.equal(record.storage.get.errors,0);
  assert.equal(record.storage.list.count,1);assert.equal(record.storage.list.pages,2);assert.equal(record.storage.list.rows,2);
  assert.equal(record.storage.batch.count,1);assert.equal(record.storage.batch.errors,1);
  assert.equal(record.storage.batch.transactionEntities,2);
  assert.doesNotMatch(JSON.stringify(record),/PRIVATE_|example.invalid|AccountKey/);
});
