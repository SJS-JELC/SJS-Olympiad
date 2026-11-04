import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';
test('legacy isolated practice tokens cannot authenticate or migrate into real claims',async()=>{
 const repo=memoryRepository(),api=createService(repo,{},()=>100000);
 await assert.rejects(api.session('practice-'+ 'a'.repeat(64)),{status:401});
 await assert.rejects(api.claim('practice-'+ 'a'.repeat(64),{teamId:'practice'}),{status:401});
 assert.equal((await repo.list({kind:'team'})).length,0);
});
test('obsolete practice-start authenticates before returning retired and never sets a new cookie',async()=>{
 const api=createService(memoryRepository(),{},()=>100000),signed=await api.login({role:'competitor',code:'1234'});
 const req={method:'POST',params:{action:'practice-start'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json'},body:{eventId:'old-draft'}};
 assert.equal((await handle(req,()=>api)).status,401);
 const response=await handle({...req,headers:{...req.headers,cookie:'__Host-olympiad-session='+signed.token}},()=>api);
 assert.equal(response.status,410);assert.equal(response.headers['Set-Cookie'],undefined);
});
