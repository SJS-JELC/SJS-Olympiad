import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';

async function fixture(){
 const repo=memoryRepository(),config={eventId:'diagnostic-legacy',endsAt:200000,competitorCode:'6194',teacherCode:'9283',
  connectionString:'SECRET_CONFIG_CANARY',runtime:{repository:'memory',storageConfigured:false,source:'local-preview',unknown:'SECRET_RUNTIME_CANARY'}};
 const api=createService(repo,config,()=>100000),staff=(await api.login({role:'teacher',code:'9283'})).token,competitor=(await api.login({role:'competitor',code:'6194'})).token;
 await api.eventUpdate(staff,{eventId:config.eventId,expectedRevision:1,theoryStartsAt:50000,theoryEndsAt:300000});
 const raw=await repo.get('system','settings');
 await repo.write({...raw,unknownSecret:'SECRET_SETTINGS_CANARY',events:[...raw.events,{id:'old-ended',name:'Archived event',year:'L5',status:'ended',revision:2,endsAt:120000,secret:'SECRET_EVENT_CANARY'}]},raw.etag);
 await api.teamAdd(staff,{eventId:config.eventId,name:'SECRET_TEAM_NAME_CANARY'});
 return {repo,config,api,staff,competitor};
}
test('diagnostics is teacher-only through the no-store HTTP route',async()=>{
 const f=await fixture();
 for(const [token,status] of [[null,401],[f.competitor,403],[f.staff,200]]){
  const response=await handle({method:'GET',params:{action:'diagnostics'},headers:token?{cookie:'__Host-olympiad-session='+token}:{}},()=>f.api);
  assert.equal(response.status,status);assert.equal(response.headers['Cache-Control'],'no-store');
  if(status!==200)assert.equal(response.body.settingsRevision,undefined);
 }
});
test('allowlisted snapshot distinguishes bootstrap from effective saved settings without secrets or writes',async()=>{
 const f=await fixture(),before=JSON.stringify([...f.repo.rows]),raw=await f.repo.get('system','settings');
 process.env.DIAGNOSTICS_SECRET_TEST_CANARY='SECRET_ENV_CANARY';
 let snapshot;try{snapshot=await f.api.diagnostics(f.staff);}finally{delete process.env.DIAGNOSTICS_SECRET_TEST_CANARY;}
 assert.equal(JSON.stringify([...f.repo.rows]),before);
 assert.equal(snapshot.settingsRevision,2);assert.equal(snapshot.currentEventId,'diagnostic-legacy');assert.equal(snapshot.currentEventSource,'active event');
 assert.equal(snapshot.legacyBootstrap.endsAt,200000);assert.equal(snapshot.events[0].theoryEndsAt,300000);
 assert.equal(snapshot.events[0].timingSource.theoryEndsAt,'saved settings');assert.equal(snapshot.events[1].timingSource.theoryEndsAt,'legacy endsAt');assert.equal(snapshot.events[1].theoryStartsAt,null);
 assert.equal(snapshot.repository,'memory');assert.equal(snapshot.storageConfigured,false);assert.equal(snapshot.tableName,null);assert.equal(snapshot.configurationSource,'isolated local preview');
 assert.deepEqual(snapshot.accessCodes,{competitorConfigured:true,teacherConfigured:true});assert.equal(snapshot.sessionDurationMs,8*3600000);
 const serialized=JSON.stringify(snapshot);
 for(const secret of ['SECRET_CONFIG_CANARY','SECRET_RUNTIME_CANARY','SECRET_SETTINGS_CANARY','SECRET_EVENT_CANARY','SECRET_TEAM_NAME_CANARY','SECRET_ENV_CANARY','6194','9283',raw.teacherHash,raw.competitorHash,f.staff,f.competitor])assert.ok(!serialized.includes(secret));
 assert.ok(!serialized.includes('process.env'));assert.ok(!serialized.includes('teacherHash'));assert.ok(!serialized.includes('owner'));
});
test('invalid bootstrap inputs are status-only; unknown runtime settings cannot be reflected',async()=>{
 const repo=memoryRepository(),api=createService(repo,{eventId:'SECRET_INVALID_ID_CANARY/invalid',endsAt:NaN,runtime:{repository:'SECRET_REPOSITORY_CANARY',storageConfigured:'SECRET_STORAGE_CANARY',source:'SECRET_SOURCE_CANARY'}},()=>100000);
 const staff=(await api.login({role:'teacher',code:'5678'})).token,snapshot=await api.diagnostics(staff);
 assert.equal(snapshot.legacyBootstrap.eventId,null);assert.equal(snapshot.legacyBootstrap.eventIdStatus,'invalid');assert.equal(snapshot.legacyBootstrap.endsAt,null);
 assert.equal(snapshot.repository,'injected');assert.equal(snapshot.storageConfigured,null);assert.equal(snapshot.currentEventSource,'none');assert.deepEqual(snapshot.events,[]);
 assert.ok(!JSON.stringify(snapshot).includes('SECRET_'));
});
