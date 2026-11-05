import {useEffect,useRef,useState} from 'react';
import {HttpError,request} from '../cloud/api';
import {MoleculeEditor} from '../components/molecule/MoleculeEditor';
import {assertMoleculeState,blankMolecule} from '../chemistry/molecule/engine';
import type {MoleculeState} from '../contracts/molecule';
import {AccessGate} from '../components/AccessGate';
import {OlympiadLogo} from '../components/OlympiadLogo';
import {IllustratedActionButton} from '../components/IllustratedActionButton';
import {QuestionShell} from '../questions/QuestionShell';
import {SkeletalHelp} from './SkeletalHelp';
import './pilot.css';
import {SchoolSelector,LockInButton} from '../components/SchoolSelector';

export const pilotLimits={maxHeavyAtoms:250,maxAtoms:650,maxBonds:750};
type Snapshot={status:'off'|'open';revision:number;eventId:string|null;schools:{id:string;name:string;colours?:string[]}[];rankings:{schoolId:string;name:string;rank:number}[]};
type Attempt={id:string;schoolId:string;confirmedAt:number|null;best:number|null};
type Result=Attempt & {accepted:boolean;score:number|null};
type Submission={schoolId:string;credential:string;requestId:string;graph:string};
type Saved={version:1;schoolId:string;credential:string;drawing:MoleculeState;result?:Attempt;pending?:Submission};
const storageKey='olympiad-readiness-pilot-v1';
const credential=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
function restore(raw:string|null):Saved|null {
  if(!raw)return null;
  const v=JSON.parse(raw) as Saved;
  if(v.version!==1 || typeof v.schoolId!=='string' || !/^[a-f0-9]{64}$/.test(v.credential))throw Error('The saved pilot attempt cannot be read.');
  assertMoleculeState(v.drawing,pilotLimits);
  if(v.pending && (v.pending.credential!==v.credential || v.pending.schoolId!==v.schoolId || typeof v.pending.graph!=='string' || typeof v.pending.requestId!=='string'))throw Error('The pending submission cannot be read.');
  return v;
}
export function PilotEntry() {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[started,setStarted]=useState(false);
  async function refresh(){try{const next=await request<Snapshot>('pilot');setSnapshot(next);setError('');if(next.status!=='open')setStarted(false);}catch(e){setError((e as Error).message);}}
  useEffect(()=>{void refresh();},[]);
  if(snapshot?.status==='open' && started)return <Pilot snapshot={snapshot} refresh={refresh} onBack={()=>{setStarted(false);void refresh();}} refreshError={error}/>;
  return <><AccessGate pilot={snapshot?.status==='open'} checking={!snapshot} onPilot={()=>setStarted(true)}/>{error && <div className="pilot-entry-error type-body" role="alert">{error}<button className="ui-button" onClick={()=>void refresh()}>Retry</button></div>}</>;
}
function Pilot({snapshot,refresh,onBack,refreshError}:{snapshot:Snapshot;refresh:()=>Promise<void>;onBack:()=>void;refreshError:string}) {
  const [saved,setSaved]=useState<Saved|null>(null),[school,setSchool]=useState(''),[loaded,setLoaded]=useState(false),[entered,setEntered]=useState(false);
  const [message,setMessage]=useState(''),[storageMessage,setStorageMessage]=useState(''),[conflict,setConflict]=useState(false),[busy,setBusy]=useState(false);
  const raw=useRef<string|null>(null),current=useRef<Saved|null>(null),sending=useRef(false),resumed=useRef(false);
  useEffect(()=>{
    try{raw.current=localStorage.getItem(storageKey);const value=restore(raw.current);current.current=value;setSaved(value);if(value)setSchool(value.schoolId);}catch(e){setStorageMessage('Local recovery is unavailable. '+(e as Error).message);}
    setLoaded(true);
    const changed=(e:StorageEvent)=>{if(e.key===storageKey || e.key===null){setConflict(true);setStorageMessage('This attempt changed in another tab. Reload to continue from its saved drawing.');}};
    window.addEventListener('storage',changed);return ()=>window.removeEventListener('storage',changed);
  },[]);
  function save(value:Saved):boolean {
    if(conflict)return false;
    try {
      if(localStorage.getItem(storageKey)!==raw.current){setConflict(true);setStorageMessage('Another tab changed this attempt. Reload before continuing.');return false;}
      const next=JSON.stringify({...value,drawing:{...value.drawing,history:value.drawing.history.slice(-20)}});
      localStorage.setItem(storageKey,next);raw.current=next;setStorageMessage('');
    }catch {setStorageMessage('This browser cannot save your drawing locally. Keep this tab open; reopening may lose your work.');}
    current.current=value;setSaved(value);return true;
  }
  async function enter(){
    if(sending.current || conflict || !loaded)return;
    if(!snapshot.schools.some(s=>s.id===(current.current?.schoolId ?? school))){if(current.current)setMessage('This school is not in the current event. Return to the landing page.');return;}
    const value=current.current ?? {version:1 as const,schoolId:school,credential:credential(),drawing:blankMolecule()};
    if(!save(value))return;
    sending.current=true;setBusy(true);setMessage('');
    try{const result=await request<Attempt>('pilot-enter',{schoolId:value.schoolId,credential:value.credential,requestId:crypto.randomUUID()});save({...value,result});setEntered(true);await refresh();}
    catch(e){setMessage((e as Error).message);await refresh();}
    finally{sending.current=false;setBusy(false);}
  }
  useEffect(()=>{if(loaded && current.current && !resumed.current){resumed.current=true;void enter();}},[loaded]);
  async function submit(){
    const value=current.current;if(!value || sending.current || conflict)return;
    const pending=value.pending ?? {schoolId:value.schoolId,credential:value.credential,requestId:crypto.randomUUID(),graph:JSON.stringify(value.drawing.graph)};
    if(!save({...value,pending}))return;
    sending.current=true;setBusy(true);setMessage('');
    try {
      const result=await request<Result>('pilot-submit',pending);save({...value,result,pending:undefined});
      setMessage(result.accepted?`This submission: ${result.score}. Personal best: ${result.best}.`:'Submission not accepted. Every separate structure must have formula C₅H₈ and valid bonds. Your previous best is unchanged.');
      await refresh();
    }catch(e){
      if(e instanceof HttpError && e.status<500 && e.status!==429)save({...value,pending:undefined});
      setMessage((e as Error).message);await refresh();
    }finally{sending.current=false;setBusy(false);}
  }
  const recovery=storageMessage && <p role="alert">{storageMessage} {conflict && <button className="ui-button" onClick={()=>window.location.reload()}>Reload saved attempt</button>}</p>;
  if(!entered || !saved)return <main className="competitor-setup competitor-setup--selection type-body">
    <OlympiadLogo className="competitor-setup__logo"/><section className="pilot-school-picker">
      {recovery}
      <form onSubmit={event=>{event.preventDefault();void enter();}}><SchoolSelector items={snapshot.schools} value={school} onChange={setSchool} label="Schools" disabled={busy || !!saved || conflict}/>

        {!snapshot.schools.length && <p role="status">No schools are available for the current event. Please ask your teacher.</p>}
        <LockInButton disabled={!loaded || !snapshot.schools.some(s=>s.id===school) || conflict} busy={busy}/>
      </form><p role="status">{busy?'Opening your drawing…':message}</p>{refreshError && <p role="alert">{refreshError}</p>}
    </section></main>;
  return <QuestionShell definition={{title:'Funny Bones'}} score={saved.result?.best ?? 0} onBack={onBack} backLabel="Back to landing">
    <div className="question-content pilot-question type-body"><div className="question-brief pilot-brief">
      {recovery}<p>Draw the skeletal formula for as many different molecules with the molecular formula C₅H₈ as you can.</p>
      <SkeletalHelp/>
      <div className="pilot-workspace"><section className="pilot-drawing" aria-label="Warm-up drawing workspace"><MoleculeEditor value={saved.drawing} onChange={drawing=>save({...saved,drawing})} limits={pilotLimits} elements={['C','H']} representations={['skeletal']} initialZoomOutSteps={2} readOnly={busy || conflict || !!saved.pending}/></section>
      </div>
      {saved.drawing.graph.atoms.filter(a=>a.element!=='H').length>=250 && <p role="status">Canvas carbon capacity reached. Remove a structure before adding another.</p>}
      <p className="pilot-feedback" role="status">{busy?'Submitting…':message}</p>
      {refreshError && <p role="alert">School rankings could not refresh: {refreshError}</p>}
    </div><div className="question-actions pilot-bottom-actions"><section className="pilot-leaderboard" aria-labelledby="pilot-leaderboard-title"><h2 id="pilot-leaderboard-title" className="type-heading">Leaderboard</h2><ol className="pilot-board">{Array.from({length:3},(_,i)=><li key={i} className={'pilot-place pilot-place--'+i}>
      <svg className="pilot-medal" viewBox="0 0 32 40" aria-hidden="true"><path d="M6 21h8v18l-4-4-4 4Zm12 0h8v18l-4-4-4 4Z" fill="currentColor" stroke="#2d2832" strokeWidth="1.5"/><path d="M9 2h14l7 7v14l-7 7H9l-7-7V9Z" fill="currentColor" stroke="#2d2832" strokeWidth="2"/><text className="type-label" x="16" y="22" textAnchor="middle" fill="#202733">{i+1}</text></svg>
      <span className="pilot-school-name type-body">{snapshot.rankings[i]?.name ?? '–'}</span>
    </li>)}</ol></section><IllustratedActionButton label="SUBMIT" accessibleLabel={saved.pending?'Retry submission':'Submit'} disabled={busy || conflict} onClick={()=>void submit()}/></div></div>
  </QuestionShell>;
}

type Report={status:'open'|'off';revision:number;readiness:(Attempt & {name:string})[]};
export function PilotSettings(){
  const [open,setOpen]=useState(false),[report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const pending=useRef<{status:'open'|'off';expectedRevision:number;requestId:string}|null>(null),running=useRef(false);
  async function refresh(){try{setReport(await request<Report>('pilot-report'));setError('');}catch(e){setError((e as Error).message);}}
  async function mode(){
    if(!report || running.current)return;running.current=true;setBusy(true);setError('');
    pending.current??={status:report.status==='open'?'off':'open',expectedRevision:report.revision,requestId:crypto.randomUUID()};
    try{await request('pilot-mode',pending.current);pending.current=null;await refresh();}
    catch(e){setError((e as Error).message);if(e instanceof HttpError && e.status<500 && e.status!==429)pending.current=null;}
    finally{running.current=false;setBusy(false);}
  }
  return <section className="settings-panel"><h2 className="type-heading"><button type="button" className="settings-panel-toggle" aria-expanded={open} aria-controls="pilot-settings" onClick={()=>{setOpen(!open);if(!open)void refresh();}}>Pilot<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2"/></svg></button></h2><div id="pilot-settings" hidden={!open}>
    {error && <p role="alert">{error} Close and reopen this panel to reload its status.</p>}
    {report ? <><button type="button" role="switch" aria-label="Pilot" aria-checked={report.status==='open'} className="pilot-toggle type-body" disabled={busy} onClick={()=>void mode()}><span className="pilot-toggle__track"/><span>Pilot {report.status==='open'?'on':'off'}</span></button><span role="status" className="type-caption">{busy?'Saving…':pending.current?'Change not confirmed. Use the toggle to retry.':''}</span>
      <h3 className="type-heading">School Readiness</h3><table><thead><tr><th scope="col">School</th><th scope="col">Access Confirmation Time</th><th scope="col">High Score</th></tr></thead><tbody>{report.readiness.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.confirmedAt==null?'–':new Date(r.confirmedAt).toLocaleString('en-GB',{timeZone:'Europe/London'})}</td><td>{r.best ?? '–'}</td></tr>)}</tbody></table>{!report.readiness.length && <p>No access confirmations yet.</p>}
    </> : !error && <p role="status">Loading pilot…</p>}
  </div></section>;
}
