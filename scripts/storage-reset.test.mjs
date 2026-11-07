import test from 'node:test';
import assert from 'node:assert/strict';
import {encode,decode} from '../api/src/storage.mjs';
import {previewReset,executeReset} from './storage-reset.mjs';

const target={account:'synthetic',table:'fixture'};
function fixture(){
 let version=0;const rows=new Map(),k=(p,r)=>p+'/'+r,clone=structuredClone;
 function put(entity){rows.set(k(entity.partitionKey,entity.rowKey),{...clone(entity),etag:String(++version)});}
 const missing=()=>Object.assign(Error('missing'),{statusCode:404});
 const client={rows,failDeletes:false,
  async getEntity(p,r){const value=rows.get(k(p,r));if(!value)throw missing();return clone(value);},
  async *listEntities(){yield* [...rows.values()].map(row=>clone(row));},
  async createEntity(entity){assert.ok(!rows.has(k(entity.partitionKey,entity.rowKey)));put(entity);},
  async updateEntity(entity,mode,{etag}){assert.equal(rows.get(k(entity.partitionKey,entity.rowKey))?.etag,etag);put(entity);},
  async deleteEntity(p,r,{etag}){if(client.failDeletes)throw Error('Injected interruption');assert.ok(etag&&etag!=='*');assert.equal(rows.get(k(p,r))?.etag,etag);rows.delete(k(p,r));}
 };
 put(encode({partitionKey:'system',rowKey:'settings',kind:'settings',revision:4,competitorHash:'a'.repeat(32)+':'+ 'b'.repeat(64),teacherHash:'c'.repeat(32)+':'+ 'd'.repeat(64),events:[{id:'old-event'}],testingEventId:'obsolete'}));
 put(encode({partitionKey:'system',rowKey:'schools',kind:'school-directory',revision:2,schools:[{id:'host',name:'Synthetic host',isHostSchool:true,colours:['#123456']},{id:'old',name:'Reserved name',deleted:true}]}));
 put(encode({partitionKey:'readiness-pilot-v1',rowKey:'config',kind:'pilot-config',status:'open',revision:3}));
 for(const [p,r]of [['old-event','team'],['sessions','old-session'],['readiness-pilot-v1','attempt:old'],['system','old-operation']])put(encode({partitionKey:p,rowKey:r,kind:'discard'}));
 return client;
}
test('reset removes history, preserves configured values and publishes explicit layout',async()=>{
 const client=fixture(),schools=await client.getEntity('system','schools'),plan=await previewReset(client,target);
 assert.ok(!JSON.stringify(plan).includes('Synthetic host'));assert.ok(!JSON.stringify(plan).includes('a'.repeat(32)));
 await executeReset(client,plan,{persist:async()=>{},expectedTarget:target});
 assert.equal(plan.state,'complete');assert.equal(client.rows.size,4);assert.deepEqual(await client.getEntity('system','schools'),schools);
 const settings=decode(await client.getEntity('system','settings'));assert.deepEqual(settings.events,[]);assert.ok(!('testingEventId'in settings));assert.equal(settings.competitorHash,'a'.repeat(32)+':'+ 'b'.repeat(64));
 const pilot=decode(await client.getEntity('readiness-pilot-v1','config'));assert.equal(pilot.status,'open');assert.equal(pilot.resetEpoch,plan.resetEpoch);
 assert.equal(decode(await client.getEntity('system','layout')).maintenance,false);
});
test('interrupted deletion resumes with the same reset identity',async()=>{
 const client=fixture(),plan=await previewReset(client,target);client.failDeletes=true;
 await assert.rejects(executeReset(client,plan,{persist:async()=>{},expectedTarget:target}));
 assert.equal(decode(await client.getEntity('system','layout')).maintenance,true);
 client.failDeletes=false;await executeReset(client,plan,{persist:async()=>{},expectedTarget:target});assert.equal(plan.state,'complete');
});
test('stale preview and unexpected concurrent writes are rejected before deletion',async()=>{
 const client=fixture(),plan=await previewReset(client,target);
 await client.createEntity(encode({partitionKey:'sessions',rowKey:'new',kind:'session'}));
 await assert.rejects(executeReset(client,plan,{persist:async()=>{},expectedTarget:target}),/Data changed/);
 assert.ok(client.rows.has('old-event/team'));
});
test('unknown settings fail closed instead of silently losing configuration',async()=>{
 const client=fixture(),raw=await client.getEntity('system','settings');
 await client.updateEntity(encode({...decode(raw),unknownSetting:true}),'Replace',{etag:raw.etag});
 await assert.rejects(previewReset(client,target),/unclassified/);
});
test('a lost committed-delete response resumes from rows actually remaining',async()=>{
 const client=fixture(),plan=await previewReset(client,target),original=client.deleteEntity;let lose=true;
 client.deleteEntity=async(...args)=>{await original(...args);if(lose){lose=false;throw Error('Lost delete response');}};
 await assert.rejects(executeReset(client,plan,{persist:async()=>{},expectedTarget:target}));
 await executeReset(client,plan,{persist:async()=>{},expectedTarget:target});assert.equal(plan.state,'complete');assert.equal(client.rows.size,4);
});
test('a lost final publication response does not lose preserved configuration or rotate epoch again',async()=>{
 const client=fixture(),plan=await previewReset(client,target),original=client.updateEntity;let lose=true;
 client.updateEntity=async(entity,mode,options)=>{await original(entity,mode,options);if(entity.rowKey==='layout'&&!decode(entity).maintenance&&lose){lose=false;throw Error('Lost publication response');}};
 await assert.rejects(executeReset(client,plan,{persist:async()=>{},expectedTarget:target}));
 await executeReset(client,plan,{persist:async()=>{},expectedTarget:target});assert.equal(plan.state,'complete');assert.equal(decode(await client.getEntity('readiness-pilot-v1','config')).resetEpoch,plan.resetEpoch);
});
test('configuration changed after preview aborts without a maintenance marker or deletes',async()=>{
 const client=fixture(),plan=await previewReset(client,target),school=await client.getEntity('system','schools');
 await client.updateEntity(encode({...decode(school),revision:3}),'Replace',{etag:school.etag});
 await assert.rejects(executeReset(client,plan,{persist:async()=>{},expectedTarget:target}),/configuration changed/);assert.equal(client.rows.size,7);assert.ok(!client.rows.has('system/layout'));
});
