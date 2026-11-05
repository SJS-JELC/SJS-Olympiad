import { useEffect, useRef, useState } from 'react';
import { useCompetitionSecurity } from '../security';
import { request, type TeamRecord } from '../cloud/api';
import { CodePanels } from './CodePanels';
import { OlympiadLogo } from './OlympiadLogo';
import './CompetitorEntry.css';
import './LandingEntry.css';
import {TeacherCodeCooldown} from './TeacherCodeCooldown';
import {IllustratedActionButton} from './IllustratedActionButton';
import { eventTiming } from '../events/timing';
export function AccessGate({pilot=false,onPilot,checking=false}:{pilot?:boolean;onPilot?:()=>void;checking?:boolean}) {
    const security = useCompetitionSecurity();
    const [codes,setCodes]=useState({teacher:'',competitor:''}),[teacher,setTeacher]=useState(false),[busy,setBusy]=useState(false);
    const [available,setAvailable]=useState(false),[checkingEvent,setCheckingEvent]=useState(true),[availabilityError,setAvailabilityError]=useState('');
    const teacherInput=useRef<HTMLInputElement>(null),eagle=useRef<HTMLButtonElement>(null);
    const [teacherRetryAt,setTeacherRetryAt]=useState(0),[teacherRemaining,setTeacherRemaining]=useState(0);
    const teacherCooling=teacherRemaining>0;
    useEffect(()=>{
      if(security.invalidCode==='teacher'){setTeacherRetryAt(Date.now()+10000);setTeacherRemaining(10000);}
    },[security.invalidCode]);
    useEffect(()=>{
      if(!teacherRetryAt)return;
      const tick=()=>{const left=Math.max(0,teacherRetryAt-Date.now());setTeacherRemaining(left);if(!left)window.clearInterval(timer);};
      const timer=window.setInterval(tick,50);tick();return()=>window.clearInterval(timer);
    },[teacherRetryAt]);
    useEffect(()=>{if(teacher && !teacherCooling)teacherInput.current?.focus();},[teacher,teacherCooling]);
    useEffect(()=>{
        if(pilot){setCheckingEvent(false);return;}
        let live=true,generation=0;
        const check=()=>{const own=++generation;setCheckingEvent(true);setAvailable(false);
          void request<{competitorAvailable:boolean}>('availability').then(v=>{if(live && own===generation){setAvailable(v.competitorAvailable);setAvailabilityError('');}})
            .catch(()=>{if(live && own===generation)setAvailabilityError('Event availability could not be checked. Reload to retry.');})
            .finally(()=>{if(live && own===generation)setCheckingEvent(false);});};
        check();window.addEventListener('focus',check);return()=>{live=false;window.removeEventListener('focus',check);};
    },[pilot]);
    async function login(role:'teacher'|'competitor'){
      if(busy || codes[role].length!==4 || role==='teacher' && Date.now()<teacherRetryAt || role==='competitor' && !available)return;
      setBusy(true);const code=codes[role];setCodes({teacher:'',competitor:''});
      try{await security.login(code,role);}finally{setBusy(false);}
    }
    function closeTeacher(){setTeacher(false);setCodes(c=>({...c,teacher:''}));security.clearCodeError();eagle.current?.focus();}
    const pin=(role:'teacher'|'competitor')=><CodePanels digitsOnly id={'access-'+role} label={role==='teacher'?'Teacher code':'Competitor code'} value={codes[role]} invalid={security.invalidCode===role} inputRef={role==='teacher'?teacherInput:undefined} onChange={value=>{security.clearCodeError();setCodes(c=>({...c,[role]:value}));}} disabled={busy || role==='teacher' && teacherCooling}/>;
    return <main className="access-page access-page--redesign type-body">
      <div className="landing-logo"><OlympiadLogo/><button ref={eagle} type="button" className="landing-eagle-button" aria-label="Teacher sign in" aria-expanded={teacher} aria-controls="teacher-password" onClick={()=>teacher?closeTeacher():setTeacher(true)}/>
        {teacher && <section id="teacher-password" className={'teacher-password'+(teacherCooling?' teacher-password--cooling':'')} aria-label="Teacher sign in" onKeyDown={event=>{if(event.key==='Escape')closeTeacher();}}>
          {teacherCooling && <TeacherCodeCooldown remaining={teacherRemaining}/>}
          <button type="button" className="teacher-password-close type-heading" aria-label="Close teacher sign in" onClick={closeTeacher}>&#215;</button><p className="type-heading">What's the password?</p>
          <form autoComplete="off" onSubmit={event=>{event.preventDefault();void login('teacher');}}>{pin('teacher')}<button className="teacher-password-submit type-heading" type="submit" aria-label="Submit teacher code" disabled={busy || teacherCooling || codes.teacher.length!==4}>&gt;</button></form>
        </section>}
      </div>
      <div className="landing-entry" aria-busy={busy || checking || checkingEvent}>
        {pilot ? <><p className="pilot-welcome-copy type-body">Welcome to the Olympiad! By getting this far you have made sure the competition isn't blocked on your device. Well done. Hit go to get used to some of the controls and get some familiarity with a type of formulae you might not have seen much before...</p><IllustratedActionButton compact label="GO" icon="arrow" disabled={checking || busy} onClick={onPilot}/></> : <form autoComplete="off" onSubmit={event=>{event.preventDefault();void login('competitor');}}>{pin('competitor')}<IllustratedActionButton compact label="GO" icon="arrow" type="submit" disabled={busy || checking || checkingEvent || !available || codes.competitor.length!==4}/></form>}
        <div className="landing-progress" role="status">{(busy || checking || checkingEvent) && <><span className="landing-progress__bar"/><span className="sr-only">{busy?'Signing in...':'Checking availability...'}</span></>}</div>
        {!pilot && !checkingEvent && !checking && !available && !availabilityError && <p role="status">Waiting for an event.</p>}
        {availabilityError && !pilot && <p role="alert">{availabilityError}</p>}{security.error && <p role="alert">{security.error}</p>}
      </div>
    </main>;
}
export function CompetitorEntry() {
    const security = useCompetitionSecurity(), event = security.server?.activeEvent;
    const [teams, setTeams] = useState<TeamRecord[]>([]), [teamId, setTeamId] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const [loading,setLoading]=useState(true);
    const loadGeneration=useRef(0);
    async function load(clearMessage=true) { setLoading(true);const authority=security.captureAuthority(),generation=++loadGeneration.current;const current=()=>authority() && generation===loadGeneration.current;try {
        const result = await request<{
            teams: TeamRecord[];
        }>('teams');
        if(!current())return;
        setTeams(result.teams);
        setTeamId(previous => result.teams.some(team => team.id === previous && !team.claimed) ? previous : '');
        if(clearMessage)setMessage('');
    }
    catch (error) {
        if(!current())return;
        security.handleMutationError(error);
        setMessage(error instanceof Error ? error.message : 'Teams are unavailable.');
    } finally {if(current())setLoading(false);} }
    useEffect(() => { if (!security.server?.team && event)
        void load(); return ()=>{loadGeneration.current++;}; }, [event?.id, security.server?.team?.id]);
    async function claim() { if(busy || loading || !teams.some(team=>team.id===teamId && !team.claimed))return;const current=security.captureAuthority();setMessage('');setBusy(true); try {
        await security.claim(teamId);
    }
    catch (error) {
        if(!current())return;
        setMessage(error instanceof Error ? error.message : 'Team could not be claimed.');
        await load(false);
    }
    finally {
        if(current())setBusy(false);
    } }
    const closed = event && (event.status === 'ended' || security.serverNow() >= eventTiming(event).endsAt);
    const selectingTeam=!!event && !security.server?.team && !closed;
    const error=message || security.error;
    return <main className={'competitor-setup type-body'+(selectingTeam?' competitor-setup--selection':'')}><OlympiadLogo className="competitor-setup__logo" />
      <section className={'competitor-setup__pane'+(selectingTeam?' competitor-team-selection':'')+(event && security.server?.team?' competitor-rules':'')}>
        {closed ? <><h1 className="type-heading">Event complete</h1><p>Saved results are retained.</p></> : event ? security.server?.team ? <>
          <h1 className="type-heading">Competition rules</h1>
          <p className="competitor-rules__lead type-body">Press GO to enter fullscreen.</p>
          <p className="type-body">Once you begin, do not switch tabs, open another app or leave fullscreen. A member of staff will need to unlock your machine if you do.</p>
          <p className="competitor-rules__ready type-body">Get your team ready, then press GO. Good luck!</p>
          <button className="setup-action setup-go type-heading" disabled={security.phase!=='idle'} onClick={()=>void security.start()}>{security.phase==='entering'?'Entering...':'GO'}</button>
        </> : <>
          <button type="button" className="team-refresh" aria-label="Refresh teams" title="Refresh teams" disabled={busy} onClick={()=>void load()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.4 6.5M20 4v7h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <h1 className="type-heading">Choose your team</h1>
          <form onSubmit={event=>{event.preventDefault();void claim();}}>
            <fieldset className="team-grid" aria-label="Teams" aria-busy={loading} disabled={busy}>
              {teams.map(team=><label key={team.id} className={'team-tile'+(team.claimed?' team-tile--claimed':'')+(teamId===team.id?' team-tile--selected':'')}>
                <input type="radio" name="team" value={team.id} checked={teamId===team.id} disabled={team.claimed} onChange={()=>setTeamId(team.id)}/>
                <span className={"team-tile__name "+(teamId===team.id?"type-label":"type-body")}>{team.name}</span>{team.claimed && <><span className="team-tile__status type-caption">Claimed</span></>}
              </label>)}
            </fieldset>
            {loading && <p className="type-caption" role="status">Loading teams...</p>}
            {!loading && !teams.some(team=>!team.claimed) && <p role="status">No teams are available. Ask a teacher for help.</p>}
            <button className="setup-action type-heading" disabled={!teamId || busy || loading}><svg className="setup-lock-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{busy?'LOCKING IN...':'LOCK IN'}</span></button>
          </form>
        </> : <><h1 className="type-heading">Waiting for an event</h1><p>Your teacher will set up the event shortly.</p></>}
        {error && <p className="setup-error" role="alert">{error}</p>}
      </section>
    </main>;
}
