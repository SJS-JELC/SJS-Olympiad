import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {password,verify} from '../src/password.mjs';

test('asynchronous passwords retain scrypt parameters, old hash compatibility and event-loop responsiveness',async()=>{
  let yielded=false;const turn=yieldTurn().then(()=>yielded=true);
  const stored=await password('Synthetic-code');assert.equal(yielded,true);await turn;
  const [salt,key]=stored.split(':');assert.equal(crypto.scryptSync('Synthetic-code',salt,32,{N:16384,r:8,p:1}).toString('hex'),key);
  assert.equal(await verify('Synthetic-code',stored),true);assert.equal(await verify('wrong',stored),false);
  assert.equal(await verify('x',null),false);assert.equal(await verify('x'.repeat(129),stored),false);
});

test('password work limits native concurrency and queued requests without dropping accepted jobs',async t=>{
  const callbacks=[];let active=0,maxActive=0,calls=0;
  const mock=t.mock.method(crypto,'scrypt',(_value,_salt,length,options,callback)=>{
    assert.equal(length,32);assert.deepEqual(options,{N:16384,r:8,p:1});
    calls++;active++;maxActive=Math.max(maxActive,active);
    callbacks.push(()=>{active--;callback(null,Buffer.alloc(32));});
  });
  syncBuiltinESMExports();
  try{
    const pending=Promise.allSettled(Array.from({length:140},()=>password('queue-test')));
    assert.equal(callbacks.length,4);
    while(callbacks.length){const current=callbacks.splice(0);for(const complete of current)complete();await yieldTurn();}
    const outcomes=await pending;
    assert.equal(maxActive,4);assert.equal(calls,132);assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,132);
    assert.equal(outcomes.filter(result=>result.status==='rejected').length,8);
  }finally{mock.mock.restore();syncBuiltinESMExports();}
});
