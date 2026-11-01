import { useEffect, useRef, useState } from 'react';
import { useCompetitionSecurity } from '../security';
import { request, type TeamRecord } from '../cloud/api';
import { CodePanels } from './CodePanels';
import { OlympiadLogo } from './OlympiadLogo';
import './CompetitorEntry.css';
import { eventTiming } from '../events/timing';
export function AccessGate() {
    const security = useCompetitionSecurity();
    const [codes, setCodes] = useState({teacher:'',competitor:''});
    const [busy, setBusy] = useState(false);
    return <main className="access-page"><OlympiadLogo /><section className="access-card access-entry-card type-body" aria-label="Choose teacher or competitor">
      <div className="access-options">{(['teacher','competitor'] as const).map(role => <form key={role} onSubmit={async event => {
        event.preventDefault(); if(busy)return; setBusy(true); const code=codes[role];setCodes({teacher:'',competitor:''});
        try { await security.login(code,role); } finally {setBusy(false);}
      }}><h2 className="type-heading">{role==='teacher'?'TEACHER':'COMPETITOR'}</h2>
      <CodePanels id={'access-'+role} label={role==='teacher'?'Teacher code':'Competitor code'} value={codes[role]} onChange={value=>setCodes({...codes,[role]:value})} disabled={busy}/>
      <button className="access-go type-heading" type="submit" disabled={busy || !codes[role].trim()}><span>{busy?'...':'GO'}</span></button></form>)}</div>
      {security.error && <p role="alert">{security.error}</p>}</section></main>;

}
export function CompetitorEntry() {
    const security = useCompetitionSecurity(), event = security.server?.activeEvent;
    const [teams, setTeams] = useState<TeamRecord[]>([]), [teamId, setTeamId] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const [draftId,setDraftId]=useState('');
    const drafts=security.server?.draftEvents ?? [];
    const chosenDraft=drafts.some(draft=>draft.id===draftId)?draftId:drafts[0]?.id ?? '';
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
    const closed = event && (event.status !== 'active' || security.serverNow() >= eventTiming(event).endsAt);
    const error=message || security.error;
    return <main className="competitor-setup type-body"><OlympiadLogo className="competitor-setup__logo" />
      <section className={'competitor-setup__pane'+(event && security.server?.team?' competitor-rules':'')}>
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
            <button className="setup-action type-heading" disabled={!teamId || busy || loading}>{busy?'LOCKING IN...':'LOCK IN'}</button>
          </form>
        </> : drafts.length ? <>
          <h1 className="type-heading">Choose a draft to test</h1>
          <form onSubmit={event=>{event.preventDefault();void security.chooseDraft(chosenDraft);}}><label htmlFor="draft-select">Draft event</label><select id="draft-select" value={chosenDraft} onChange={event=>setDraftId(event.target.value)} disabled={security.phase!=='idle'}>{drafts.map(draft=><option key={draft.id} value={draft.id}>{draft.name} ({draft.year})</option>)}</select><p>Practice results are temporary. Fullscreen competition rules apply.</p><button className="setup-action" disabled={!chosenDraft || security.phase!=='idle'}>Test draft</button></form>
        </> : <><h1 className="type-heading">Waiting for an event</h1><p>Your teacher will activate the event shortly.</p></>}
        {error && <p className="setup-error" role="alert">{error}</p>}
      </section>
    </main>;
}
