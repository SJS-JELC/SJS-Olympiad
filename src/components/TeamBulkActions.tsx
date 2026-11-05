import {useState} from 'react';
import {request,type EventRecord,type TeamRecord,type AdminBatchResult} from '../cloud/api';

type Item={id:string;name:string;body:Record<string,unknown>};
type Job={requestId:string;action:'team-remove'|'team-release'|'team-restore';items:Item[];total:number};
type Props={restoreOnly?:boolean;event:EventRecord;teams:TeamRecord[];selected:string[];disabled:boolean;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;confirm:(value:{title:string;description:string;run:()=>Promise<void>})=>void;refresh:()=>Promise<void>;onPending:(pending:boolean)=>void;onDone:(id:string)=>void;onDeleting:(id:string,hidden:boolean)=>void};
export function TeamBulkActions({restoreOnly=false,event,teams,selected,disabled,busy,run,confirm,refresh,onPending,onDone,onDeleting}:Props){
 const [job,setJob]=useState<Job|null>(null),[completed,setCompleted]=useState(0);
 const chosen=teams.filter(team=>selected.includes(team.id));
 async function process(current:Job){
  setJob(current);onPending(true);
  if(current.action==='team-remove')current.items.forEach(item=>onDeleting(item.id,true));
  try{
   const result=await request<AdminBatchResult>('teams-batch',{requestId:current.requestId,eventId:event.id,action:current.action,confirm:true,items:current.items.map(item=>item.body)});
   setCompleted(result.completed);result.results.filter(item=>item.ok).forEach(item=>onDone(current.items[item.index].id));
   await refresh();
   if(!result.complete)throw Error(result.results.filter(item=>!item.ok).map(item=>current.items[item.index].name+': '+item.error).join(' '));
   setJob(null);onPending(false);
  }finally{if(current.action==='team-remove')current.items.forEach(item=>onDeleting(item.id,false));}
 }
 function start(action:Job['action']){
  const targets=chosen.filter(team=>action!=='team-release' || team.claimed);
  const current:Job={requestId:crypto.randomUUID(),action,total:targets.length,items:targets.map(team=>({id:team.id,name:team.name,body:{teamId:team.id,...(action==='team-release'?{expectedClaimGeneration:team.claimGeneration}:{expectedEntryRevision:team.entryRevision ?? 0})}}))};
  if(!current.total)return;
  setCompleted(0);
  if(action==='team-remove' && event.status==='draft')void run(()=>process(current));
  else confirm({title:action==='team-remove'?'Remove selected teams from event?':action==='team-restore'?'Restore selected teams?':'Allow selected teams to reselect?',description:current.total+' teams: '+targets.map(t=>t.name).join(', ')+'. '+(action==='team-remove'?'Teams will leave this event and their current devices will lose access. Saved results will be retained for restoration.':action==='team-restore'?'Restore these teams and their saved results in this event. They will need to claim again.':'Their current devices will lose access. Saved results and cooldowns will be retained.'),run:()=>process(current)});
 }
 return <div className="settings-bulk-actions">
  <span>{selected.length} selected</span>
  {!restoreOnly && <><button type="button" className="ui-button" disabled={disabled || !chosen.some(t=>t.claimed)} onClick={()=>start('team-release')}>Allow reselection for selected</button>
  <button type="button" className="ui-button" disabled={disabled || !chosen.length} onClick={()=>start('team-remove')}>Remove selected teams</button></>}
  {restoreOnly && <button type="button" className="ui-button" disabled={disabled || !chosen.length} onClick={()=>start('team-restore')}>Restore selected teams</button>}
  {job && <><span role="status">{completed} of {job.total} teams processed.</span><button type="button" className="ui-button" disabled={busy} onClick={()=>void run(()=>process(job))}>Retry remaining teams</button><button type="button" className="ui-button" disabled={busy} onClick={()=>{setJob(null);onPending(false);}}>Stop retrying</button></>}
 </div>;
}
