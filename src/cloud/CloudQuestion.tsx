import { useEffect, useRef, useState } from 'react';
import { emptyAttempt, type AttemptAction, type Attempt } from '../questions/attempts';
import { L6Problem8 } from '../questions/l6p8/L6Problem8';
import './cloud.css';
export type CloudState = { team: {id:string;name:string}; score:number; solvedAt:number|null; retryAt:number; serverNow:number; eventEndsAt:number; correct?:boolean };
class HttpError extends Error { constructor(public status:number,message:string) { super(message); } }
export async function request<T>(action:string, body?:unknown):Promise<T> {
  const response = await fetch('/api/olympiad/' + action, body === undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const value = await response.json().catch(() => { throw new Error('The score service is not available on this preview yet.'); });
  if (!response.ok) throw new HttpError(response.status,value.error || 'The request could not be saved.');
  return value;
}
export function CloudQuestion({state,onState}:{state:CloudState|null;onState:(state:CloudState)=>void}) {
  const [busy,setBusy] = useState(true);
  const [message,setMessage] = useState('Restoring your team…');
  const [code,setCode] = useState('');
  const [teams,setTeams] = useState<{id:string;name:string}[]>([]);
  const [team,setTeam] = useState('');
  const [attempt,setAttempt] = useState<Attempt>(emptyAttempt);
  const [pending,setPending] = useState<{questionId:string;requestId:string;answer:string}|null>(null);
  const claimRef = useRef<{teamId:string;claimSecret:string}|null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const onStateRef = useRef(onState); onStateRef.current = onState;
  function accept(value:CloudState) {
    onStateRef.current(value);
    setAttempt(previous => ({...previous,solvedAt:value.solvedAt,retryAt:value.retryAt ? Date.now()+Math.max(0,value.retryAt-value.serverNow) : 0,feedback:{answer:value.solvedAt !== null}}));
  }
  useEffect(() => {
    mounted.current = true;
    void request<CloudState>('session').then(value => { if (mounted.current) { accept(value); setMessage(value.team.name + ' · online score'); } })
      .catch(error => {if (mounted.current) setMessage(error instanceof HttpError && error.status === 401 ? 'Enter the event code to join a test team.' : error.message);})
      .finally(() => { if (mounted.current) setBusy(false); });
    return () => { mounted.current = false; };
  },[]);
  async function run(work:()=>Promise<void>) {
    if (inFlight.current) return;
    inFlight.current=true;setBusy(true);
    try { await work(); } catch(error) { if(mounted.current) setMessage(error instanceof Error ? error.message : 'The request could not be saved.'); }
    finally {inFlight.current=false;if(mounted.current)setBusy(false);}
  }
  const action = (action:AttemptAction) => {
    if(busy || inFlight.current || !state || attempt.solvedAt || attempt.retryAt>Date.now())return;
    if(action.type==='edit' && !pending) setAttempt(previous=>({...previous,answers:{...previous.answers,[action.field]:action.value}}));
    if(action.type==='submit') void run(async()=>{
      const body=pending ?? {questionId:'L6P8',requestId:crypto.randomUUID(),answer:attempt.answers.answer ?? ''};
      setPending(body);
      try {
        const value=await request<CloudState>('submit',body);
        if(!mounted.current)return;
        accept(value);setPending(null);setMessage(value.correct ? 'Correct — score saved.' : 'Incorrect — try again after the cooldown.');
      } catch(error) {
        if(mounted.current && error instanceof HttpError && error.status < 500 && error.status !== 409) setPending(null);
        throw new Error('Result not confirmed. ' + (error instanceof Error ? error.message : '') + ' Use Check to retry.');
      }
    });
  };
  return <div className="cloud-question">
    <p className="type-label cloud-status" role="status">{message}</p>
    {!state ? <section className="question-brief cloud-entry">
      <h2 className="type-heading">Join the online test</h2>
      <p className="type-body">Three test teams · L6 Problem 8 only</p>
      <form onSubmit={event=>{event.preventDefault();void run(async()=>{
        const value=await request<{teams:{id:string;name:string}[]}>('teams',{code});
        if(!mounted.current)return;
        setTeams(value.teams);setTeam(value.teams[0]?.id ?? '');setMessage(value.teams.length ? 'Choose an unclaimed team.' : 'All test teams are claimed.');
      });}}>
        <label className="type-label">Event code <input value={code} onChange={e=>setCode(e.target.value)} disabled={busy} maxLength={128} autoComplete="off" /></label>
        <button className="type-label" disabled={busy}>Find teams</button>
      </form>
      {teams.length>0 && <form onSubmit={event=>{event.preventDefault();void run(async()=>{
        if(claimRef.current?.teamId!==team) claimRef.current={teamId:team,claimSecret:Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('')};
        const value=await request<CloudState>('claim',{code,...claimRef.current});
        if(mounted.current){accept(value);setMessage(value.team.name + ' · online score');claimRef.current=null;}
      });}}>
        <label className="type-label">Team <select value={team} onChange={e=>setTeam(e.target.value)} disabled={busy}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <button className="type-label" disabled={busy}>Claim team</button>
      </form>}
    </section> : <fieldset className="cloud-fields" disabled={busy}>
      <L6Problem8 attempt={pending ? {...attempt,answers:{answer:pending.answer}} : attempt} onAction={action}/>
    </fieldset>}
  </div>;
}
