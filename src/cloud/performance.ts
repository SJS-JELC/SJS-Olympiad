/** Page-memory diagnostics only. Names are allowlisted; URLs and payloads never enter history. */
const actions = new Set(('entry availability session events teams schools removed-teams roster leaderboard diagnostics login logout event-create event-setup event-update event-year-change event-activate event-draft event-end codes-update school-create school-delete school-colours school-rename school-teams school-link school-resume team-add team-remove team-restore team-release team-delete teams-batch schools-import claim start breach recovery resume hydrate question draft submit action practical practical-save question-content practical-content content-asset content-catalogue pilot pilot-report pilot-mode pilot-enter pilot-submit').split(' '));
export type ApiTiming = {at:number;action:string;durationMs:number;status:number|null;outcome:'ok'|'http-error'|'network-error'|'aborted';requestId:string|null;serverMs:number|null};
export type ActionTiming = {at:number;action:string;durationMs:number;outcome:'confirmed'|'refresh-failed'|'uncertain'|'rejected'};
const history:ApiTiming[]=[],actionHistory:ActionTiming[]=[];
const safeAction=(action:string)=>{const name=action.split('?')[0];return actions.has(name)?name:'unknown';};
export function recentApiTimings(){return history.map(item=>({...item}));}
export function recentActionTimings(){return actionHistory.map(item=>({...item}));}
export function clearApiTimings(){history.length=0;actionHistory.length=0;}
export function beginActionTiming(action:string){
 const start=performance.now(),name=safeAction(action);
 return (outcome:ActionTiming['outcome'])=>{actionHistory.unshift({at:Date.now(),action:name,durationMs:Math.max(0,performance.now()-start),outcome});actionHistory.length=Math.min(actionHistory.length,100);};
}
export function beginApiTiming(action:string){
 const start=performance.now(),name=safeAction(action);let response:Response|undefined;
 return {
  response(value:Response){response=value;},
  finish(error?:unknown){
   const rawId=response?.headers?.get('x-request-id')??'',timing=response?.headers?.get('server-timing')??'';
   const duration=/(?:^|,)\s*(?:total|server)\s*;dur=([\d.]+)/.exec(timing)?.[1];
   const serverMs=duration===undefined?null:Number(duration);
   history.unshift({at:Date.now(),action:name,durationMs:Math.max(0,performance.now()-start),status:response?.status??null,
    outcome:error?(error instanceof Error&&error.name==='AbortError'?'aborted':response&&!response.ok?'http-error':'network-error'):'ok',
    requestId:/^[a-f0-9-]{16,64}$/i.test(rawId)?rawId:null,serverMs:serverMs!==null&&Number.isFinite(serverMs)?serverMs:null});
   history.length=Math.min(history.length,100);
  }
 };
}
