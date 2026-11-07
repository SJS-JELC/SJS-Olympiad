import {LoadingIndicator} from './LoadingIndicator';
import {useEffect,useRef,useState} from 'react';
import {request,type DiagnosticSnapshot} from '../cloud/api';
import {useCompetitionSecurity} from '../security';
import {ApiPerformance} from './ApiPerformance';

const london=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'medium'});
function Instant({value}:{value:number|null|undefined}){
 if(value==null)return <>Not set</>;
 return <><span>{new Date(value).toISOString()}</span><span className="type-caption">{london.format(value)} Europe/London · {value} ms</span></>;
}
export function BackendDiagnostics({expanded}:{expanded:boolean}){
 const security=useCompetitionSecurity(),[snapshot,setSnapshot]=useState<DiagnosticSnapshot>(),[pending,setPending]=useState(false),[error,setError]=useState('');
 const requested=useRef(false),flight=useRef(false),generation=useRef(0);
 useEffect(()=>()=>{generation.current++;flight.current=false;requested.current=false;},[]);
 async function load(){
  if(flight.current || security.server?.role!=='teacher')return;
  const current=security.captureAuthority(),version=++generation.current;
  requested.current=true;flight.current=true;setPending(true);setError('');
  try{const value=await request<DiagnosticSnapshot>('diagnostics');if(current()&&generation.current===version)setSnapshot(value);}
  catch(reason){if(current()&&generation.current===version)setError(reason instanceof Error?reason.message:'Backend settings could not be loaded.');}
  finally{if(generation.current===version){flight.current=false;setPending(false);}}
 }
 useEffect(()=>{if(expanded&&!requested.current)void load();},[expanded]);
 return <div id="settings-diagnostics-content" className="settings-diagnostics-content" hidden={!expanded}>
  <div className="settings-diagnostics-toolbar"><p className="type-caption">Read-only backend snapshot. Secrets and personal/team data are omitted; sensitive configuration shows status only.</p><button type="button" className="ui-button" disabled={pending} onClick={()=>void load()}>{pending?'Refreshing…':'Refresh backend settings'}</button></div>
  {pending&&<LoadingIndicator/>}
  {expanded&&security.server?.role==='teacher'&&<ApiPerformance snapshot={snapshot}/>}
  {error&&<p className="type-caption" role="alert">{error}{snapshot?' Showing the previous snapshot.':''} <button type="button" className="ui-button" disabled={pending} onClick={()=>void load()}>Retry diagnostics</button></p>}
  {snapshot&&<>
   <p className="type-caption settings-diagnostics-snapshot">Snapshot: <Instant value={snapshot.snapshotAt}/></p>
   {snapshot.performance&&<section aria-label="Server performance">
    <h3 className="type-heading">Server performance</h3>
    <p className="type-caption">This server instance only · latest {snapshot.performance.window.count} of {snapshot.performance.window.capacity} retained requests. Not a deployment-wide sample. Storage durations may overlap.</p>
    <table><thead><tr><th>Action</th><th>Requests / errors</th><th>Median / p95 / max ms</th><th>Storage operations / pages</th><th>Range / unpartitioned queries</th><th>HTTP attempts / conflicts</th></tr></thead><tbody>
     {snapshot.performance.routes.map(route=><tr key={route.method+route.action}>
      <td>{route.method} {route.action}</td><td>{route.requests} / {route.errors}</td>
      <td>{route.durationMs.p50.toFixed(1)} / {route.durationMs.p95.toFixed(1)} / {route.durationMs.max.toFixed(1)}</td>
      <td>{Object.values(route.storage).reduce((n,op)=>n+op.count,0)} / {route.storage.list.pages}</td>
      <td>{route.storage.list.queryClasses?.range??0} / {route.storage.list.queryClasses?.unpartitioned??0}</td>
      <td>{route.transport.attempts} / {route.conflictRetries}</td>
     </tr>)}
    </tbody></table>
   </section>}
   <table><caption className="type-heading">Effective backend</caption><tbody>
    <tr><th scope="row">Settings source</th><td>{snapshot.settingsSource} · revision {snapshot.settingsRevision}</td></tr>
    <tr><th scope="row">Current event</th><td>{snapshot.currentEventId??'None'} · {snapshot.currentEventSource}</td></tr>
    <tr><th scope="row">Repository</th><td>{snapshot.repository} · {snapshot.configurationSource}{snapshot.tableName?` · table ${snapshot.tableName}`:''}</td></tr>
    <tr><th scope="row">Node runtime</th><td>{snapshot.nodeVersion}</td></tr>
    <tr><th scope="row">Clock / session duration</th><td>{snapshot.clockSource} · {snapshot.sessionDurationMs/3600000} hours</td></tr>
    <tr><th scope="row">Access-code status</th><td>Competitor: {snapshot.accessCodes.competitorConfigured?'configured':'missing'} · Teacher: {snapshot.accessCodes.teacherConfigured?'configured':'missing'}</td></tr>
    <tr><th scope="row">Legacy testing event</th><td>{snapshot.legacyTestingEventId??'Not set'} · not used for current-event selection</td></tr>
   </tbody></table>
   <table><caption className="type-heading">Environment / bootstrap configuration</caption><thead><tr><th>Setting</th><th>Value / status</th><th>Purpose</th></tr></thead><tbody>
    <tr><th scope="row">OLYMPIAD_STORAGE_CONNECTION_STRING</th><td>{snapshot.storageConfigured===null?'Not reported by this repository':snapshot.storageConfigured?'Configured (value omitted)':'Not configured'}</td><td>Storage connection</td></tr>
    <tr><th scope="row">OLYMPIAD_EVENT_ID</th><td>{snapshot.legacyBootstrap.eventId??snapshot.legacyBootstrap.eventIdStatus}</td><td rowSpan={2}>{snapshot.legacyBootstrap.purpose}</td></tr>
    <tr><th scope="row">OLYMPIAD_EVENT_END</th><td><Instant value={snapshot.legacyBootstrap.endsAt}/><span className="type-caption">{snapshot.legacyBootstrap.endStatus}</span></td></tr>
   </tbody></table>
   <h3 className="type-heading">Saved events</h3>
   {!snapshot.events.length&&<p className="type-caption">No events are configured.</p>}
   {snapshot.events.map(event=><section key={event.id} className="settings-diagnostic-event" aria-label={'Backend event '+event.name}>
    <h4 className="type-heading">{event.name} · {event.year} · {event.status} · revision {event.revision}</h4>
    <p className="type-caption">ID: {event.id} · previously active: {event.hasBeenActive?'yes':'no'}{event.previousEventId?` · previous event: ${event.previousEventId}`:''}</p>
    <table><thead><tr><th>Time</th><th>UTC / local / epoch</th><th>Source</th></tr></thead><tbody>
     <tr><th scope="row">Theory start</th><td><Instant value={event.theoryStartsAt}/></td><td>{event.timingSource.theoryStartsAt}</td></tr>
     <tr><th scope="row">Theory end</th><td><Instant value={event.theoryEndsAt}/></td><td>{event.timingSource.theoryEndsAt}</td></tr>
     <tr><th scope="row">Practical start</th><td><Instant value={event.practicalStartsAt}/></td><td rowSpan={2}>{event.timingSource.practical}</td></tr>
     <tr><th scope="row">Practical end</th><td><Instant value={event.practicalEndsAt}/></td></tr>
     <tr><th scope="row">Overall end</th><td><Instant value={event.endsAt}/></td><td>{event.timingSource.endsAt}</td></tr>
    </tbody></table>
   </section>)}
  </>}
 </div>;
}
