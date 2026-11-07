export const LAYOUT_VERSION=1;
export const LAYOUT_KEY=Object.freeze({partitionKey:'system',rowKey:'layout'});
export const PILOT_PARTITION='readiness-pilot-v1';

const identifier=value=>{
  if(typeof value!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value))throw Error('Invalid storage identity');
  return value;
};
export const eventPartition=eventId=>'event!'+identifier(eventId);
export const teamScope=(eventId,teamId)=>({partitionKey:eventPartition(eventId),teamId:identifier(teamId)});
export function scopedKey(scope,rowKey) {
  if(typeof scope==='string')return {partitionKey:scope,rowKey}; // isolated teacher preview
  return {partitionKey:scope.partitionKey,rowKey:rowKey==='team'?'summary!'+scope.teamId:'team!'+scope.teamId+'!'+rowKey};
}
export const teamKey=(eventId,teamId,rowKey='team')=>scopedKey(teamScope(eventId,teamId),rowKey);
export function prefixRange(partitionKey,prefix) {
  if(!prefix)throw Error('A row prefix is required');
  return {partitionKey,rowKeyFrom:prefix,rowKeyTo:prefix.slice(0,-1)+String.fromCharCode(prefix.charCodeAt(prefix.length-1)+1)};
}
export const summaryRange=eventId=>prefixRange(eventPartition(eventId),'summary!');
export const scopedRange=(scope,prefix='')=>typeof scope==='string'
  ? (prefix?prefixRange(scope,prefix):{partitionKey:scope})
  : prefixRange(scope.partitionKey,'team!'+scope.teamId+'!'+prefix);
export const teamRange=(eventId,teamId,prefix='')=>scopedRange(teamScope(eventId,teamId),prefix);
export const systemRange=prefix=>prefixRange('system',prefix);
export function validLayout(value) {
  return value?.kind==='storage-layout' && value.version===LAYOUT_VERSION && value.maintenance===false;
}

// Fanout is driven by the authoritative event catalogue and bounded in flight.
export async function eventTeamRows(repo,events) {
  const results=new Array(events.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,events.length)},async()=>{
    while(cursor<events.length){const index=cursor++;results[index]=await repo.list(summaryRange(events[index].id));}
  }));
  return results.flat();
}
