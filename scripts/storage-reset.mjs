import {createHash,randomUUID} from 'node:crypto';
import {decode,encode} from '../api/src/storage.mjs';
import {LAYOUT_VERSION,LAYOUT_KEY,PILOT_PARTITION} from '../api/src/layout.mjs';

export const RESET_VERSION=1;
const settingsKey=['system','settings'],schoolsKey=['system','schools'],pilotKey=[PILOT_PARTITION,'config'],layoutKey=[LAYOUT_KEY.partitionKey,LAYOUT_KEY.rowKey];
const key=row=>JSON.stringify([row.partitionKey,row.rowKey]);
const retainedKeys=new Set([settingsKey,schoolsKey,pilotKey].map(pair=>JSON.stringify(pair)));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const matches=(row,pair)=>row.partitionKey===pair[0]&&row.rowKey===pair[1];
export function preservedValue(raw){
 const row=decode(raw);
 if(matches(row,settingsKey)){
  if(row.kind!=='settings'||!Number.isSafeInteger(row.revision)||row.revision<1)throw Error('Settings contain invalid identity or revision fields.');
  if(!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(row.competitorHash??'')||!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(row.teacherHash??''))throw Error('Configured access codes are missing or invalid; reset will not manufacture defaults.');
  const known=new Set(['partitionKey','rowKey','etag','timestamp','kind','revision','competitorHash','teacherHash','events','testingEventId']);
  if(Object.keys(row).some(field=>!known.has(field)))throw Error('Settings contain unclassified fields; update the explicit preservation policy before reset.');
  return {competitorHash:row.competitorHash,teacherHash:row.teacherHash};
 }
 if(matches(row,schoolsKey)){
  if(row.kind!=='school-directory'||!Array.isArray(row.schools)||!row.schools.some(s=>s.isHostSchool))throw Error('School directory is incomplete.');
  const {partitionKey,rowKey,etag,timestamp,...value}=row;return value;
 }
 if(matches(row,pilotKey)){
  if(row.kind!=='pilot-config'||!['open','off','idle','closed'].includes(row.status))throw Error('Pilot setting is invalid.');
  return {status:row.status==='open'?'open':'off'};
 }
 throw Error('Not a retained configuration record.');
}
async function allRows(client){const rows=[];for await(const row of client.listEntities())rows.push(row);return rows;}
async function get(client,pair){try{return await client.getEntity(...pair);}catch(error){if(error.statusCode===404)return null;throw error;}}

/** Journal contains keys/ETags and fingerprints, never configuration values or account credentials. */
export async function previewReset(client,target){
 const rows=await allRows(client),retained=rows.filter(row=>retainedKeys.has(key(row)));
 for(const required of [settingsKey,schoolsKey])if(!retained.some(row=>matches(row,required)))throw Error('Required preserved configuration is missing.');
 const existing=rows.find(row=>matches(row,layoutKey));
 if(existing&&decode(existing).maintenance)throw Error('A reset is already in progress; resume its journal.');
 const discarded=rows.filter(row=>!retainedKeys.has(key(row))&&!matches(row,layoutKey));
 return {version:RESET_VERSION,id:randomUUID(),target,createdAt:Date.now(),state:'preview',resetEpoch:randomUUID(),
  retained:retained.map(row=>({partitionKey:row.partitionKey,rowKey:row.rowKey,etag:row.etag,fingerprint:digest(preservedValue(row))})),
  discarded:discarded.map(row=>({partitionKey:row.partitionKey,rowKey:row.rowKey,etag:row.etag})),
  layoutEtag:existing?.etag??null,completed:[],pilotPresent:retained.some(row=>matches(row,pilotKey))};
}
export function resetSummary(plan){
 const partitions=new Map();for(const row of plan.discarded)partitions.set(row.partitionKey,(partitions.get(row.partitionKey)??0)+1);
 return {target:plan.target,planId:plan.id,createdAt:plan.createdAt,state:plan.state,recordsToRemove:plan.discarded.length,partitionsAffected:partitions.size,
  conditionalDeleteRequests:plan.discarded.length,preserved:['school directory including reserved names','configured access codes','pilot on/off'],
  note:'Counts exclude verification, pagination, configuration and retry requests. Reset has a separately supplied HTTP budget.'};
}
export async function executeReset(client,plan,{persist,expectedTarget}){
 if(plan.version!==RESET_VERSION||JSON.stringify(plan.target)!==JSON.stringify(expectedTarget))throw Error('Reset journal targets another account/table.');
 const retained=[];
 for(const expected of plan.retained){const row=await get(client,[expected.partitionKey,expected.rowKey]);
  if(!row||digest(preservedValue(row))!==expected.fingerprint||plan.state==='preview'&&row.etag!==expected.etag)throw Error('Preserved configuration changed; the preview is stale.');retained.push(row);
 }
 let manifest=await get(client,layoutKey);
 if(plan.state==='complete'){
  if(!manifest||decode(manifest).resetId!==plan.id||decode(manifest).maintenance)throw Error('Reset completion cannot be verified.');return;
 }
 const sameReset=manifest&&decode(manifest).resetId===plan.id;
 if(!sameReset){
  if((manifest?.etag??null)!==plan.layoutEtag)throw Error('Storage layout changed after preview.');
  const currentRows=await allRows(client),expected=new Map(plan.discarded.map(row=>[key(row),row.etag]));
  const actual=currentRows.filter(row=>!retainedKeys.has(key(row))&&!matches(row,layoutKey));
  if(actual.length!==expected.size||actual.some(row=>expected.get(key(row))!==row.etag))throw Error('Data changed after preview; create a fresh preview.');
  const next=encode({...LAYOUT_KEY,kind:'storage-layout',version:LAYOUT_VERSION,maintenance:true,resetId:plan.id});
  if(manifest)await client.updateEntity(next,'Replace',{etag:manifest.etag});else await client.createEntity(next);
 }
 plan.state='resetting';await persist(plan);
 // Re-enumerate on resume. ETags make unexpected concurrent changes fail rather than be erased.
 const expected=new Map(plan.discarded.map(row=>[key(row),row.etag]));
 const remaining=(await allRows(client)).filter(row=>!retainedKeys.has(key(row))&&!matches(row,layoutKey));
 if(remaining.some(row=>expected.get(key(row))!==row.etag))throw Error('Unexpected writes occurred during maintenance; stop and investigate.');
 // SDK 13.x's submitTransaction delete branch discards per-row ETags. Direct
 // deletes preserve the actual If-Match contract; maintenance has its own budget.
 for(const row of remaining){
  await client.deleteEntity(row.partitionKey,row.rowKey,{etag:row.etag});
  plan.completed.push(key(row));await persist(plan);
 }
 const oldSettings=decode(await get(client,settingsKey)),codes=preservedValue(oldSettings);
 await client.updateEntity(encode({partitionKey:'system',rowKey:'settings',kind:'settings',revision:oldSettings.revision+1,...codes,events:[]}),'Replace',{etag:oldSettings.etag});
 const pilot=await get(client,pilotKey),pilotValue=pilot?decode(pilot):null;
 const pilotConfig=encode({partitionKey:pilotKey[0],rowKey:pilotKey[1],kind:'pilot-config',status:pilotValue?preservedValue(pilotValue).status:'off',revision:(pilotValue?.revision??0)+1,resetEpoch:plan.resetEpoch});
 if(pilot)await client.updateEntity(pilotConfig,'Replace',{etag:pilot.etag});else await client.createEntity(pilotConfig);
 const after=await allRows(client);
 if(after.some(row=>!retainedKeys.has(key(row))&&!matches(row,layoutKey)))throw Error('Disposable records remain; reset is still in maintenance.');
 for(const expected of plan.retained){const row=after.find(row=>key(row)===key(expected));if(!row||digest(preservedValue(row))!==expected.fingerprint)throw Error('Preservation verification failed; keep the app stopped.');}
 manifest=await get(client,layoutKey);
 if(decode(manifest).resetId!==plan.id)throw Error('Reset ownership changed.');
 await client.updateEntity(encode({...LAYOUT_KEY,kind:'storage-layout',version:LAYOUT_VERSION,maintenance:false,resetId:plan.id}),'Replace',{etag:manifest.etag});
 plan.state='complete';await persist(plan);
}
