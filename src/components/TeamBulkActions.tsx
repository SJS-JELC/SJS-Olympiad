import type {EventRecord,TeamRecord,AdminBatchResult} from '../cloud/api';
import type {RosterCommand} from './useRosterController';

type Props={restoreOnly?:boolean;event:EventRecord;teams:TeamRecord[];selected:string[];disabled:boolean;start:(command:RosterCommand)=>void;confirm:(value:{title:string;description:string;run:()=>Promise<void>})=>void;onDone:(ids:string[])=>void};
export function TeamBulkActions({restoreOnly=false,event,teams,selected,disabled,start,confirm,onDone}:Props){
 const chosen=teams.filter(team=>selected.includes(team.id));
 function begin(action:'team-remove'|'team-release'|'team-restore'){
  if(disabled)return;
  const targets=chosen.filter(team=>action!=='team-release' || team.claimed);
  if(!targets.length)return;
  const command:RosterCommand={action:'teams-batch',label:action==='team-remove'?'Remove selected teams':action==='team-restore'?'Restore selected teams':'Allow selected teams to reselect',items:targets.map(team=>({id:team.id,name:team.name})),
   body:{requestId:crypto.randomUUID(),eventId:event.id,action,confirm:true,items:targets.map(team=>({teamId:team.id,...(action==='team-release'?{expectedClaimGeneration:team.claimGeneration}:{expectedEntryRevision:team.entryRevision ?? 0})}))},
   onConfirmed:(result:AdminBatchResult)=>onDone(result.results.filter(item=>item.ok).map(item=>targets[item.index].id))};
  if(action==='team-remove' && event.status==='draft')start(command);
  else confirm({title:action==='team-remove'?'Remove selected teams from event?':action==='team-restore'?'Restore selected teams?':'Allow selected teams to reselect?',description:targets.length+' teams: '+targets.map(t=>t.name).join(', ')+'. '+(action==='team-remove'?'Teams will leave this event and their current devices will lose access. Saved results will be retained for restoration.':action==='team-restore'?'Restore these teams and their saved results in this event. They will need to claim again.':'Their current devices will lose access. Saved results and cooldowns will be retained.'),run:async()=>start(command)});
 }
 return <div className="settings-bulk-actions"><span>{selected.length} selected</span>
  {!restoreOnly && <><button type="button" className="ui-button" disabled={disabled || !chosen.some(t=>t.claimed)} onClick={()=>begin('team-release')}>Allow reselection for selected</button><button type="button" className="ui-button" disabled={disabled || !chosen.length} onClick={()=>begin('team-remove')}>Remove selected teams</button></>}
  {restoreOnly && <button type="button" className="ui-button" disabled={disabled || !chosen.length} onClick={()=>begin('team-restore')}>Restore selected teams</button>}
 </div>;
}
