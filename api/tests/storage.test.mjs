import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository,encode,decode,connect } from '../src/storage.mjs';
test('Azure nested state round-trips scalar payload and preserves legacy rows',()=>{
  const row={partitionKey:'event-team',rowKey:'q-L6P3',etag:'v1',timestamp:'old',kind:'question',eventId:'event',state:{answers:{answer:'SO₄²⁻'},interaction:{step:1}},privateState:{run:[{name:'secret'}]}};
  const raw=encode(row);assert.equal(typeof raw.payload,'string');assert.ok(!Object.hasOwn(raw,'state'));assert.ok(!Object.hasOwn(raw,'etag'));
  const decoded=decode({...raw,etag:'v2'});assert.equal(decoded.etag,'v2');assert.deepEqual(decoded.state,row.state);assert.deepEqual(decoded.privateState,row.privateState);
  assert.equal(decode({partitionKey:'old',rowKey:'team',score:3}).score,3);
});

test('Azure removals use exact partition/row and ETags, including transactional cleanup',async()=>{
  class Transaction {actions=[];updateEntity(...args){this.actions.push(['update',...args]);}deleteEntity(...args){this.actions.push(['delete',...args]);}}
  let removed,submitted;
  const repo=createRepository({deleteEntity:async(...args)=>{removed=args;},submitTransaction:async actions=>{submitted=actions;}},Transaction);
  await repo.remove('one-team','q-L6P8','v3');assert.deepEqual(removed,['one-team','q-L6P8',{etag:'v3'}]);
  await assert.rejects(repo.remove('one-team','team','*'),/conditional/);
  await repo.batch([{entity:{partitionKey:'one-team',rowKey:'deleted-team'},etag:'v4'},{entity:{partitionKey:'one-team',rowKey:'q-L6P8'},etag:'v5',remove:true}]);
  assert.equal(submitted[0][3].etag,'v4');assert.deepEqual(submitted[1],['delete','one-team','q-L6P8',{etag:'v5'}]);
  await assert.rejects(repo.batch([{entity:{partitionKey:'one-team',rowKey:'team'},remove:true}]),/conditional/);
});
test('Azure adapter reads all pages and fences each transaction entity conditionally',async()=>{
  class Transaction {actions=[];updateEntity(...args){this.actions.push(['update',...args]);}createEntity(...args){this.actions.push(['create',...args]);}}
  let submitted,query;
  const client={
    getEntity:async()=>{throw Object.assign(Error(),{statusCode:404});},updateEntity:async(...args)=>args,createEntity:async(...args)=>args,
    submitTransaction:async actions=>{submitted=actions;},
    listEntities:options=>{query=options;return (async function*(){yield {...encode({partitionKey:'x',rowKey:'team1',kind:'team',score:1}),etag:'1'};yield {...encode({partitionKey:'x',rowKey:'team2',kind:'team',score:2}),etag:'2'};})();},
  };
  const repo=createRepository(client,Transaction);assert.equal(await repo.get('none','none'),null);
  const all=await repo.list({eventId:"teacher's-event",kind:'team'});assert.equal(all.length,2);assert.match(query.queryOptions.filter,/teacher''s-event/);
  await repo.batch([{entity:{partitionKey:'x',rowKey:'team'},etag:'v1'},{entity:{partitionKey:'x',rowKey:'question'},etag:'v2'},{entity:{partitionKey:'x',rowKey:'receipt'}}]);
  assert.deepEqual(submitted.map(op=>op[0]),['update','update','create']);assert.equal(submitted[0][3].etag,'v1');assert.equal(submitted[1][3].etag,'v2');
  await assert.rejects(repo.batch([{entity:{partitionKey:'x',rowKey:'a'}},{entity:{partitionKey:'y',rowKey:'b'}}]),/Invalid team transaction/);
  await assert.rejects(connect(''),/Storage is not configured/);
});
