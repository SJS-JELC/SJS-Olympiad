import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {memoryRepository} from '../src/memory-storage.mjs';
import {createRepository} from '../src/storage.mjs';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {teamKey,teamRange,summaryRange,eventPartition,LAYOUT_KEY,LAYOUT_VERSION,PILOT_PARTITION} from '../src/layout.mjs';

const read=(repo,key)=>repo.get(key.partitionKey,key.rowKey);
const origin='https://olympiad.masters-of-chemistry.app';
async function fixture(){
  const repo=memoryRepository([],{allowBootstrap:true}),api=createService(repo,{},()=>100000);
  const staff=(await api.login({role:'teacher',code:'5678'})).token;
  const event=(await api.eventCreate(staff,{name:'Layout test',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'layout-event-create'})).events[0];
  return {repo,api,staff,event};
}
const validManifest={...LAYOUT_KEY,kind:'storage-layout',version:LAYOUT_VERSION,maintenance:false};

test('event summary and team data ranges isolate prefix-neighbor teams and namespaces',async()=>{
  const repo=memoryRepository();
  for(const eventId of ['one','two'])for(const teamId of ['a','a-b','aa']){
    await repo.write({...teamKey(eventId,teamId),kind:'team',eventId,teamId});
    for(const row of ['q-L6P8','practical','receipt-repeated','deleted-team'])await repo.write({...teamKey(eventId,teamId,row),kind:'data',teamId});
  }
  assert.deepEqual((await repo.list(summaryRange('one'))).map(row=>row.teamId),['a','a-b','aa']);
  assert.equal((await repo.list(teamRange('one','a'))).length,4);
  assert.ok((await repo.list(teamRange('one','a'))).every(row=>row.teamId==='a' && row.partitionKey===eventPartition('one')));
  assert.equal((await repo.list(teamRange('one','a','q-'))).length,1);
  assert.equal(new Set([...repo.rows.values()].map(row=>row.partitionKey)).size,2);
});

test('both repositories reject broad lists; SDK filter includes escaped partition and half-open RowKey range',async()=>{
  const memory=memoryRepository();let calls=0,options;
  const azure=createRepository({listEntities:input=>{calls++;options=input;return (async function*(){})();}},null);
  for(const repo of [memory,azure]){
    await assert.rejects(repo.list(),/partition-scoped/);
    await assert.rejects(repo.list({kind:'team',eventId:'one'}),/partition-scoped/);
    await assert.rejects(repo.list({partitionKey:'one',rowKeyFrom:'z',rowKeyTo:'a'}),/row range/);
  }
  assert.equal(calls,0);
  await azure.list({partitionKey:"a'b",rowKeyFrom:"q'a",rowKeyTo:'qz'});
  assert.equal(options.queryOptions.filter,"PartitionKey eq 'a''b' and RowKey ge 'q''a' and RowKey lt 'qz'");
});

test('physical cleanup retains every neighbor row and requires a live conditional fence',async()=>{
  const f=await fixture();
  const teams=await f.repo.list(summaryRange(f.event.id)),target=teams[0],neighbor=teams[1];
  for(let n=0;n<125;n++)await f.repo.write({...teamKey(f.event.id,target.teamId,'saved-'+n),kind:'question',state:{solvedAt:null}});
  await f.repo.write({...teamKey(f.event.id,neighbor.teamId,'q-L6P8'),kind:'question',state:{solvedAt:7}});
  const before=structuredClone([...f.repo.rows.values()].filter(row=>row.rowKey===neighbor.rowKey || row.rowKey.startsWith('team!'+neighbor.teamId+'!')));
  let batches=0;const batch=f.repo.batch;
  f.repo.batch=async(operations,options)=>{
    if(operations.some(op=>op.remove)){
      batches++;assert.ok(options?.deleteGuard);
      assert.ok(operations.every(op=>!op.remove || op.entity.rowKey===target.rowKey || op.entity.rowKey.startsWith('team!'+target.teamId+'!')));
    }
    return batch(operations,options);
  };
  await f.api.teamDelete(f.staff,{eventId:f.event.id,teamId:target.teamId,teamName:"St John's 1",confirm:true,requestId:'layout-delete-target'});
  assert.ok(batches>=3);assert.equal(await read(f.repo,teamKey(f.event.id,target.teamId)),null);
  for(const row of before)assert.deepEqual(await read(f.repo,row),row);
  f.repo.batch=batch;
  const marker=await read(f.repo,teamKey(f.event.id,target.teamId,'deleted-team'));
  const stale={...marker};await f.repo.write({...marker,revision:marker.revision+1},marker.etag);
  await assert.rejects(f.repo.batch([{entity:stale,etag:stale.etag},{entity:neighbor,etag:neighbor.etag,remove:true}],{deleteGuard:{rowKey:stale.rowKey,etag:stale.etag}}),{statusCode:412});
  assert.deepEqual(await read(f.repo,neighbor),neighbor);
});

test('batch delete ETags alone cannot bypass the explicit conditional-update guard',async()=>{
  let sends=0;
  class Transaction{actions=[];deleteEntity(){throw Error('must reject before serialization');}}
  const repo=createRepository({submitTransaction:async()=>sends++},Transaction);
  const remove={entity:{partitionKey:'event!one',rowKey:'team!a!q-L6P8'},etag:'target-etag',remove:true};
  for(const options of [undefined,{deleteGuard:{rowKey:'missing',etag:'x'}},{deleteGuard:{rowKey:remove.entity.rowKey,etag:remove.etag}}])await assert.rejects(repo.batch([remove],options),/conditional update fence/);
  assert.equal(sends,0);
});

test('Azure manifest fails closed on every request and is shared once across HTTP internal calls',async()=>{
  const f=await fixture(),api=createService(f.repo,{runtime:{repository:'azure-table'},eventId:'forbidden-bootstrap',endsAt:900000},()=>100000);
  const initial=JSON.stringify([...f.repo.rows]);
  await assert.rejects(api.availability(),{status:503});assert.equal(JSON.stringify([...f.repo.rows]),initial);
  for(const value of [{...validManifest,version:2},{...validManifest,maintenance:true},{...validManifest,maintenance:undefined}]){
    const old=await read(f.repo,LAYOUT_KEY);await f.repo.write(value,old?.etag);
    await assert.rejects(api.availability(),{status:503});
  }
  const old=await read(f.repo,LAYOUT_KEY);await f.repo.write(validManifest,old.etag);
  const get=f.repo.get;let manifestReads=0;
  f.repo.get=(p,r)=>{if(p===LAYOUT_KEY.partitionKey && r===LAYOUT_KEY.rowKey)manifestReads++;return get(p,r);};
  const response=await handle({method:'POST',params:{action:'school-create'},headers:{origin,'content-type':'application/json',cookie:'__Host-olympiad-session='+f.staff},body:{name:'Manifest school',requestId:'manifest-school-create',rosterEventId:f.event.id}},()=>api);
  assert.equal(response.status,200);assert.equal(response.body.roster.status,'complete');assert.equal(manifestReads,1);
  const manifest=await read(f.repo,LAYOUT_KEY);await f.repo.write({...manifest,maintenance:true},manifest.etag);
  const denied=await handle({method:'GET',params:{action:'entry'},headers:{}},()=>api);
  assert.equal(denied.status,503);assert.ok(denied.headers['Server-Timing']);
});

test('Azure never bootstraps missing settings even with memory fixture flags; memory bootstrap is explicit',async()=>{
  const repo=memoryRepository([validManifest],{allowBootstrap:true,allowLegacyBootstrap:true});
  const api=createService(repo,{runtime:{repository:'azure-table'},eventId:'legacy',endsAt:900000},()=>100000);
  await assert.rejects(api.login({role:'teacher',code:'5678'}),{status:503});assert.equal(repo.rows.size,1);
  await assert.rejects(createService(memoryRepository()).availability(),{status:503});
  const memory=memoryRepository([],{allowBootstrap:true});await createService(memory,{eventId:'legacy',endsAt:900000}).availability();
  assert.equal([...memory.rows.values()].some(row=>row.kind==='team'),false);
});

test('roster getter and mutation use one fresh summary traversal with no broad list or redundant teams read',async()=>{
  const f=await fixture(),list=f.repo.list,queries=[];
  f.repo.list=filter=>{assert.equal(typeof filter.partitionKey,'string');assert.ok(filter.rowKeyFrom);queries.push(filter);return list(filter);};
  const snapshot=await f.api.roster(f.staff,{eventId:f.event.id});
  assert.deepEqual(Object.keys(snapshot).sort(),['progress','removedTeams','schools','teams']);
  assert.equal(queries.filter(q=>q.rowKeyFrom==='summary!').length,1);
  const team=snapshot.teams[0];queries.length=0;
  f.api.teams=()=>{throw Error('redundant old roster read');};
  const result=await f.api.teamRemove(f.staff,{eventId:f.event.id,rosterEventId:f.event.id,teamId:team.id,requestId:'roster-remove-one',expectedEntryRevision:0,confirm:true});
  assert.equal(result.roster.status,'complete');assert.equal(result.roster.snapshot.teams.length,3);assert.equal(result.roster.snapshot.removedTeams[0].id,team.id);
  assert.deepEqual(result.teams,result.roster.snapshot.teams);assert.equal(result.event.id,f.event.id);
  assert.equal(queries.filter(q=>q.rowKeyFrom==='summary!').length,1);
  const player=(await f.api.login({role:'competitor',code:'1234'})).token;
  await assert.rejects(f.api.roster(player,{eventId:f.event.id}),{status:403});
});

test('confirmed mutation survives readback failure; explicit refresh and same receipt do not repeat the write',async()=>{
  const f=await fixture(),team=(await f.api.roster(f.staff,{eventId:f.event.id})).teams[0],list=f.repo.list;
  let fail=true;f.repo.list=filter=>{if(fail && filter.rowKeyFrom==='summary!')throw Error('PRIVATE_STORAGE_ERROR');return list(filter);};
  const input={eventId:f.event.id,rosterEventId:f.event.id,teamId:team.id,requestId:'saved-readback-fail',expectedEntryRevision:0,confirm:true};
  const saved=await f.api.teamRemove(f.staff,input);
  assert.equal(saved.roster.status,'failed');assert.doesNotMatch(saved.roster.error,/PRIVATE_/);
  const before=await read(f.repo,teamKey(f.event.id,team.id));assert.equal(before.withdrawn,true);
  fail=false;assert.equal((await f.api.roster(f.staff,{eventId:f.event.id})).removedTeams[0].id,team.id);
  assert.equal((await f.api.teamRemove(f.staff,input)).roster.status,'complete');assert.deepEqual(await read(f.repo,before),before);
});

test('global school changes return the selected event snapshot and rosterEventId does not bind receipts',async()=>{
  const f=await fixture();
  let result=await f.api.schoolCreate(f.staff,{name:'Global school',requestId:'global-create-one',rosterEventId:f.event.id});
  const school=result.school;assert.equal(result.roster.status,'complete');assert.equal(result.roster.snapshot.teams.length,4);
  result=await f.api.schoolRename(f.staff,{schoolId:school.id,name:'Global renamed',expectedRevision:1,requestId:'global-rename-one',rosterEventId:f.event.id});assert.equal(result.roster.status,'complete');
  result=await f.api.schoolColours(f.staff,{schoolId:school.id,colours:['#123456'],expectedRevision:2,requestId:'global-colours-one',rosterEventId:f.event.id});assert.equal(result.roster.status,'complete');
  result=await f.api.schoolDelete(f.staff,{schoolId:school.id,expectedRevision:3,confirm:true,requestId:'global-delete-one',rosterEventId:f.event.id});assert.equal(result.roster.status,'complete');
  const replay=await f.api.schoolCreate(f.staff,{name:'Global school',requestId:'global-create-one',rosterEventId:'missing-event'});
  assert.equal(replay.school.id,school.id);assert.equal(replay.school.deleted,true);assert.equal(replay.roster.status,'failed');
});

test('post-read presentation authorization bypasses cached settings when another writer ends the event',async()=>{
  const f=await fixture(),player=(await f.api.login({role:'competitor',code:'1234'})).token;
  const team=(await f.api.teams(player)).teams[0];await f.api.claim(player,{teamId:team.id});
  const get=f.repo.get,write=f.repo.write;let sessionReads=0;
  f.repo.get=async(p,r)=>{
    const result=await get(p,r);
    if(p==='sessions' && ++sessionReads===2){
      // Bypass the service wrapper, like a genuinely separate request/instance.
      const settings=await get('system','settings');
      await write({...settings,events:settings.events.map(event=>({...event,status:'ended'}))},settings.etag);
    }
    return result;
  };
  await assert.rejects(f.api.questionContent(player,{questionId:'L6P8'}),{status:403});
  assert.equal(sessionReads,2);
});

test('pilot reset epoch is exposed and rejects old enter/submit identities before receipt replay and during retries',async()=>{
  const f=await fixture();await f.api.pilotMode(f.staff,{status:'open',expectedRevision:1,requestId:'pilot-epoch-open'});
  const key={partitionKey:PILOT_PARTITION,rowKey:'config'},config=await read(f.repo,key);
  await f.repo.write({...config,resetEpoch:'epoch-one'},config.etag);
  const state=await f.api.pilot(),input={schoolId:state.schools[0].id,resetEpoch:'epoch-one',credential:randomBytes(32).toString('hex'),requestId:'pilot-epoch-submit',graph:'{}'};
  assert.equal(state.resetEpoch,'epoch-one');assert.equal((await f.api.pilotReport(f.staff)).resetEpoch,'epoch-one');
  await f.api.pilotEnter(null,input);const accepted=await f.api.pilotSubmit(null,input);assert.equal(accepted.accepted,false);
  const newer=await read(f.repo,key);await f.repo.write({...newer,resetEpoch:'epoch-two'},newer.etag);
  await assert.rejects(f.api.pilotEnter(null,input),{status:409});await assert.rejects(f.api.pilotSubmit(null,input),{status:409});
  await assert.rejects(f.api.pilotSubmit(null,{...input,resetEpoch:'epoch-two'}),{status:409});
  const fresh={...input,resetEpoch:'epoch-two',credential:randomBytes(32).toString('hex')},batch=f.repo.batch;let changed=false;
  f.repo.batch=async(ops,options)=>{
    if(!changed && ops.some(op=>op.entity.kind==='pilot-attempt')){changed=true;const current=await read(f.repo,key);await f.repo.write({...current,resetEpoch:'epoch-three'},current.etag);}
    return batch(ops,options);
  };
  await assert.rejects(f.api.pilotEnter(null,fresh),{status:409});assert.equal(changed,true);
});
