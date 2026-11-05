import {useState} from 'react';
import {request,type EventRecord,type TeamRecord} from '../cloud/api';

type Item={id:string;name:string;body:Record<string,unknown>};
type Job={action:'team-delete'|'team-release';items:Item[];total:number};
type Props={event:EventRecord;teams:TeamRecord[];selected:string[];disabled:boolean;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;confirm:(value:{title:string;description:string;run:()=>Promise<void>})=>void;refresh:()=>Promise<void>;onPending:(pending:boolean)=>void;onDone:(id:string)=>void;onDeleting:(id:string,hidden:boolean)=>void};
export function TeamBulkActions({event,teams,selected,disabled,busy,run,confirm,refresh,onPending,onDone,onDeleting}:Props){
 const [job,setJob]=useState<Job|null>(null),[completed,setCompleted]=useState(0);
 const chosen=teams.filter(team=>selected.includes(team.id));
 async function process(current:Job){
  setJob(current);onPending(true);
  try{
   while(current.items.length){
    const item=current.items[0];if(current.action==='team-delete')onDeleting(item.id,true);
    try{await request(current.action,item.body);current.items.shift();setCompleted(current.total-current.items.length);onDone(item.id);await refresh();}
    finally{if(current.action==='team-delete')onDeleting(item.id,false);}
   }
   await refresh();setJob(null);onPending(false);
  }catch(error){await refresh().catch(()=>{});throw error;}
 }
 function start(action:Job['action']){
  const targets=chosen.filter(team=>action==='team-delete' || team.claimed);
  const current:Job={action,total:targets.length,items:targets.map(team=>({id:team.id,name:team.name,body:{eventId:event.id,teamId:team.id,confirm:true,requestId:crypto.randomUUID(),...(action==='team-delete'?{teamName:team.name}:{expectedClaimGeneration:team.claimGeneration})}}))};
  if(!current.total)return;
  setCompleted(0);
  if(action==='team-delete' && event.status==='draft')void run(()=>process(current));
  else confirm({title:action==='team-delete'?'Delete selected teams?':'Allow selected teams to reselect?',description:current.total+' teams: '+targets.map(t=>t.name).join(', ')+'. '+(action==='team-delete'?'Teams with submitted activity will be removed from the event and their saved records retained. Teams without activity will be permanently deleted.':'Their current devices will lose access. Saved results and cooldowns will be retained.'),run:()=>process(current)});
 }
 return <div className="settings-bulk-actions">
  <span>{selected.length} selected</span>
  <button type="button" className="ui-button" disabled={disabled || !chosen.some(t=>t.claimed)} onClick={()=>start('team-release')}>Allow reselection for selected</button>
  <button type="button" className="ui-button" disabled={disabled || !chosen.length} onClick={()=>start('team-delete')}>Delete selected teams</button>
  {job && <><span role="status">{completed} of {job.total} teams processed.</span><button type="button" className="ui-button" disabled={busy} onClick={()=>void run(()=>process(job))}>Retry remaining teams</button><button type="button" className="ui-button" disabled={busy} onClick={()=>{setJob(null);onPending(false);}}>Stop remaining actions</button></>}
 </div>;
}
