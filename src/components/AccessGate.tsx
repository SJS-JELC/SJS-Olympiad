import { useEffect, useState } from 'react';
import { useCompetitionSecurity } from '../security';
import { request, type TeamRecord } from '../cloud/api';
import { OlympiadLogo } from './OlympiadLogo';
import { eventTiming, londonDateValue } from '../events/timing';
export function AccessGate() {
    const security = useCompetitionSecurity();
    const [role, setRole] = useState<'competitor' | 'teacher'>('competitor'), [code, setCode] = useState('');
    return <main className="access-page"><OlympiadLogo /><section className="access-card type-body"><h1 className="type-heading">Chemistry Olympiad</h1>
    {security.phase === 'loading' ? <p role="status">Restoring session…</p> : <form onSubmit={event => { event.preventDefault(); const entered = code; setCode(''); void security.login(entered, role); }}>
      <label className="type-label" htmlFor="access-role">Access</label><select id="access-role" value={role} onChange={event => setRole(event.target.value as typeof role)}><option value="competitor">Competitor</option><option value="teacher">Teacher</option></select>
      <label className="type-label" htmlFor="access-code">{role === 'teacher' ? 'Teacher code' : 'Competitor code'}</label><input id="access-code" type="password" autoComplete="off" value={code} onChange={event => setCode(event.target.value)} maxLength={128}/><button type="submit" disabled={!code.trim()}>Enter Olympiad</button>
    </form>}{security.error && <p role="alert">{security.error}</p>}</section></main>;
}
export function CompetitorEntry() {
    const security = useCompetitionSecurity(), event = security.server?.activeEvent;
    const [teams, setTeams] = useState<TeamRecord[]>([]), [teamId, setTeamId] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    async function load() { try {
        const result = await request<{
            teams: TeamRecord[];
        }>('teams');
        setTeams(result.teams);
        setTeamId(previous => result.teams.some(team => team.id === previous) ? previous : result.teams[0]?.id ?? '');
        setMessage('');
    }
    catch (error) {
        setMessage(error instanceof Error ? error.message : 'Teams are unavailable.');
    } }
    useEffect(() => { if (!security.server?.team && event)
        void load(); }, [event?.id, security.server?.team?.id]);
    async function claim() { setBusy(true); try {
        await security.claim(teamId);
    }
    catch (error) {
        setMessage(error instanceof Error ? error.message : 'Team could not be claimed.');
        void load();
    }
    finally {
        setBusy(false);
    } }
    const closed = event && (event.status !== 'active' || security.serverNow() >= eventTiming(event).endsAt);
    return <main className="access-page"><OlympiadLogo /><section className="access-card type-body"><h1 className="type-heading">{event?.name ?? 'Waiting for an event'}</h1>
    {closed ? <p>This event has finished. Saved results are retained.</p> : event ? <><p>{event.year} · Ends {londonDateValue(eventTiming(event).endsAt).replace('T', ' ')} (Europe/London)</p>{security.server?.team ? <><h2 className="type-heading">{security.server.team.name}</h2><p>Competition rules: GO enters fullscreen. Leaving fullscreen, switching tabs or apps, or refreshing locks the competition. A teacher must verify the current teacher code so you can resume.</p><button disabled={security.phase !== 'idle'} onClick={() => void security.start()}>{security.phase === 'entering' ? 'Entering fullscreen…' : 'GO'}</button></> : <><p>Competition rules: stay in fullscreen and keep this tab visible. Switching tabs or apps, leaving fullscreen, or refreshing locks access until a teacher helps you resume.</p><form onSubmit={event => { event.preventDefault(); void claim(); }}><label htmlFor="team-select">Choose your team</label><select id="team-select" value={teamId} onChange={event => setTeamId(event.target.value)} disabled={busy}>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button disabled={!teamId || busy}>Claim team</button></form><button type="button" onClick={() => void load()}>Refresh teams</button>{!teams.length && <p>No teams are available. Ask a teacher for help.</p>}</>}</> : <p>Your teacher will activate the event shortly.</p>}
    {(message || security.error) && <p role="alert">{message || security.error}</p>}
  </section></main>;
}
