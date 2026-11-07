import test from 'node:test';
import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {requestRepository} from '../src/request-cache.mjs';

test('control reads share only request-local snapshots, clone results and bypass security rechecks',async()=>{
  let reads=0,revision=1;const context=new AsyncLocalStorage();
  const {repo,fresh}=requestRepository({get:async()=>{reads++;return {revision,nested:{value:1}};}},context);
  await context.run({reads:new Map()},async()=>{
    const [one,two]=await Promise.all([repo.get('system','settings'),repo.get('system','settings')]);
    assert.equal(reads,1);one.nested.value=99;assert.equal(two.nested.value,1);
    revision=2;
    assert.equal((await repo.get('system','settings')).revision,1);
    assert.equal((await fresh(()=>repo.get('system','settings'))).revision,2);
    await repo.get('sessions','opaque');await repo.get('sessions','opaque');
    await repo.get('event!one','summary!team');await repo.get('event!one','summary!team');
    await repo.get('system','layout');await repo.get('system','layout');assert.equal(reads,8);
  });
  await context.run({reads:new Map()},async()=>assert.equal((await repo.get('system','settings')).revision,2));
  assert.equal(reads,9);
});

test('writes, failed writes and retries invalidate control snapshots, including reads started during a write',async()=>{
  let revision=1,finish;const context=new AsyncLocalStorage();
  const raw={get:async()=>({revision}),write:async()=>{await new Promise(resolve=>finish=resolve);revision++;},remove:async()=>{throw Error('failed');},batch:async()=>{revision++;}};
  const {repo,invalidate}=requestRepository(raw,context);
  await context.run({reads:new Map()},async()=>{
    assert.equal((await repo.get('system','settings')).revision,1);
    const write=repo.write({});assert.equal((await repo.get('system','settings')).revision,1);
    finish();await write;assert.equal((await repo.get('system','settings')).revision,2);
    revision=3;await assert.rejects(repo.remove());assert.equal((await repo.get('system','settings')).revision,3);
    revision=4;invalidate();assert.equal((await repo.get('system','settings')).revision,4);
    await repo.batch([]);assert.equal((await repo.get('system','settings')).revision,5);
  });
});
