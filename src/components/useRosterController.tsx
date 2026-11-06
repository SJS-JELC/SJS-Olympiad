import {useEffect,useRef,useState} from 'react';
import {HttpError,request,type AdminBatchResult,type SchoolRecord,type SchoolProgress,type TeamRecord} from '../cloud/api';

export type RosterSnapshot={schools:SchoolRecord[];progress:SchoolProgress[];teams:TeamRecord[];removedTeams:TeamRecord[]};
export type RosterCommand={action:string;body:Record<string,unknown>;label:string;items?:{id:string;name:string}[];onConfirmed?:(result:any)=>void};
type Operation=RosterCommand&{eventId:string;outcome:'saving'|'saved'|'partial'|'uncertain'|'rejected';result?:any;error?:string};
const empty: RosterSnapshot={schools:[],progress:[],teams:[],removedTeams:[]};

/** One page-local owner for writes and their authoritative, all-or-nothing readback. */
export function useRosterController(eventId:string,revision:number,onBusy:(busy:boolean)=>void){
 const [snapshot,setSnapshot]=useState<RosterSnapshot>(empty),[operation,setOperation]=useState<Operation|null>(null);
 const [working,setWorking]=useState(false),[fresh,setFresh]=useState(false),[readError,setReadError]=useState('');
 const active=useRef(true),generation=useRef(0),lock=useRef(false),current=useRef<Operation|null>(null),freshRef=useRef(false);
 const busyCallback=useRef(onBusy);busyCallback.current=onBusy;
 function busy(value:boolean){lock.current=value;setWorking(value);busyCallback.current(value);}
 function publish(value:Operation|null){current.current=value;setOperation(value);}
 async function read(token:number,op:Operation|null){
  try{
   const query='?eventId='+encodeURIComponent(eventId);
   const [schools,teams,removed]=await Promise.all([
    request<{schools:SchoolRecord[];progress:SchoolProgress[]}>('schools'+query),
    request<{teams:TeamRecord[]}>('teams'+query),request<{teams:TeamRecord[]}>('removed-teams'+query)
   ]);
   if(!active.current || token!==generation.current)return;
   setSnapshot({schools:schools.schools,progress:schools.progress,teams:teams.teams,removedTeams:removed.teams});
   freshRef.current=true;setFresh(true);setReadError('');
   if(op?.outcome==='saved'){publish(null);op.onConfirmed?.(op.result);}
   else if(op?.outcome==='partial')op.onConfirmed?.(op.result);
  }catch(error){
   if(!active.current || token!==generation.current)return;
   freshRef.current=false;setFresh(false);setReadError(error instanceof Error?error.message:'Unable to refresh the roster.');
  }
 }
 async function refresh(){
  if(lock.current)return;
  busy(true);const token=++generation.current;
  try{await read(token,current.current);}finally{if(active.current && token===generation.current)busy(false);}
 }
 async function send(op:Operation){
  if(lock.current)return;
  busy(true);const token=++generation.current;
  freshRef.current=false;setFresh(false);setReadError('');publish({...op,outcome:'saving',error:undefined});
  let settled:Operation;
  try{
   const result=await request<any>(op.action,op.body);
   const batch=result as AdminBatchResult;
   settled={...op,result,outcome:batch.complete===false?'partial':'saved',error:undefined};
  }catch(error){settled={...op,outcome:error instanceof HttpError && error.status<500?'rejected':'uncertain',error:error instanceof Error?error.message:'The save response was not confirmed.'};}
  if(!active.current || token!==generation.current)return;
  publish(settled);
  try{await read(token,settled);}finally{if(active.current && token===generation.current)busy(false);}
 }
 function start(command:RosterCommand){
  if(lock.current || !freshRef.current || (current.current && current.current.outcome!=='rejected'))return;
  // Detach every nested value from editable fields before the first request.
  const body=JSON.parse(JSON.stringify(command.body)) as Record<string,unknown>;
  void send({...command,body,eventId,outcome:'saving'});
 }
 async function stop(){
  if(lock.current)return;
  publish(null);freshRef.current=false;setFresh(false);await refresh();
 }
 useEffect(()=>{active.current=true;void refresh();return()=>{active.current=false;generation.current++;lock.current=false;busyCallback.current(false);};},[eventId]);
 useEffect(()=>{if(!lock.current && !current.current)void refresh();},[revision]);
 return {snapshot,operation,working,readError,start,refresh,retry:()=>current.current && void send(current.current),stop,
  blocked:!fresh || !!operation && operation.outcome!=='rejected'};
}

export function RosterOperationStatus({controller}:{controller:ReturnType<typeof useRosterController>}){
 const {operation:op,working,readError}=controller;
 const batch=op?.result as AdminBatchResult|undefined;
 return <div className="settings-setup-progress" aria-label="Roster save status">
  {working && <p role="status">{op?.outcome==='saving'?'Saving '+op.label.toLowerCase()+'…':'Refreshing roster…'}</p>}
  {op && !working && <>
   {op.outcome==='saved' && readError && <p role="status">Saved; couldn’t refresh the roster.</p>}
   {op.outcome==='uncertain' && <p role="alert">{op.label}: the save outcome is uncertain. {op.error}</p>}
   {op.outcome==='rejected' && <p role="alert">{op.label} was rejected. {op.error} Your entered values are retained.</p>}
   {op.outcome==='partial' && <><p role="status">{batch?.completed} of {batch?.total} {op.action==='schools-import'?'schools':'teams'} processed. Completed changes are retained.</p><ul>{batch?.results.filter(item=>!item.ok).map(item=><li key={item.index}>{op.items?.[item.index]?.name ?? 'Item '+(item.index+1)}: {item.error}</li>)}</ul></>}
   {(op.outcome==='uncertain' || op.outcome==='partial') && <><button type="button" className="ui-button" onClick={controller.retry}>{op.outcome==='partial'?'Retry failed items':'Retry save'}</button><button type="button" className="ui-button" onClick={()=>void controller.stop()}>Stop retrying</button></>}
  </>}
  {readError && <><p role="alert">{readError} Refresh the roster before making further changes.</p><button type="button" className="ui-button" disabled={working} onClick={()=>void controller.refresh()}>Retry refresh</button></>}
 </div>;
}
