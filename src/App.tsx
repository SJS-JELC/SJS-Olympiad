import { useEffect, useRef, useState } from 'react';
import { useCompetitionSecurity } from './security';
import { request, type EventRecord, type SessionState, type TeamRecord } from './cloud/api';
import { OlympiadHeading } from './components/OlympiadHeading';
import { ArtworkBackButton } from './components/SharedNavigation';
import { eventTiming, londonDateValue, parseLondonDate } from './events/timing';
import { theoryYears } from './questions/years';
import { ProblemTesting } from './components/ProblemTesting';
import { PracticalCatalogue, PracticalTeamResult } from './practicals/Practical';
import { findPractical } from './practicals/catalog';
import './settings.css';

type Confirmation = { title: string; description: string; run: () => Promise<void>; success?: string };
type EventForm = { name: string; year: string; theoryStart: string; theoryEnd: string; practicalStart: string; practicalEnd: string };
const blankEvent = (): EventForm => ({ name: '', year: 'L6', theoryStart: '', theoryEnd: '', practicalStart: '', practicalEnd: '' });
function eventForm(event: EventRecord): EventForm {
    const timing = eventTiming(event);
    return { name: event.name, year: event.year, theoryStart: londonDateValue(timing.theoryStartsAt), theoryEnd: londonDateValue(timing.theoryEndsAt), practicalStart: londonDateValue(timing.practicalStartsAt), practicalEnd: londonDateValue(timing.practicalEndsAt) };
}
const scheduleKeys = ['theoryStart', 'theoryEnd', 'practicalStart', 'practicalEnd'] as const;
const statusLabel = (status: EventRecord['status']) => ({ draft: 'Draft', active: 'Active', ended: 'Complete' })[status];
export type SettingsPanels={questions:boolean;events:boolean;codes:boolean};

export default function App({ eventId, onEventChange, onBack, onPreview, onLeaderboard, onQuestionPreview,onPracticalPreview,panels,onPanelsChange }: {
    eventId?: string; onEventChange: (id: string) => void; onBack: () => void; onPreview: () => void; onLeaderboard: () => void; onQuestionPreview: (year:string,number:number)=>void; onPracticalPreview: (year?:string)=>void;panels:SettingsPanels;onPanelsChange:(value:SettingsPanels)=>void;
}) {
    const security = useCompetitionSecurity();
    const [events, setEvents] = useState<EventRecord[]>(security.server?.events ?? []);
    const [teams, setTeams] = useState<TeamRecord[]>([]), [teamsEvent, setTeamsEvent] = useState<string>();
    const [busy, setBusy] = useState(false), busyRef = useRef(false);
    const [message, setMessage] = useState(''), [confirm, setConfirm] = useState<Confirmation | null>(null);
    const [codeRevision, setCodeRevision] = useState(security.server?.configRevision ?? 0);
    const [creating, setCreating] = useState(false), [draft, setDraft] = useState<EventForm>(blankEvent), [baseline, setBaseline] = useState<EventForm>(blankEvent);
    const {questions:questionsOpen,events:eventsOpen,codes:codesOpen}=panels;
    const [formRevision, setFormRevision] = useState(0);
    const [teamName, setTeamName] = useState(''), [competitorCode, setCompetitorCode] = useState(''), [teacherCode, setTeacherCode] = useState('');
    const teamsRequest = useRef(0), selectedId = useRef(eventId);
    selectedId.current = eventId;
    const selected = events.find(event => event.id === eventId);
    const ended = !creating && selected?.status === 'ended';
    const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
    const scheduleDirty = scheduleKeys.some(key => draft[key] !== baseline[key]);
    const legacyStart = !creating && selected && eventTiming(selected).theoryStartsAt === null;

    function resetForm(event?: EventRecord) {
        const value = event ? eventForm(event) : blankEvent();
        setDraft(value); setBaseline(value); setFormRevision(event?.revision ?? 0);
    }
    async function refreshTeams(id = eventId) {
        const generation = ++teamsRequest.current;
        if (!id) { setTeams([]); setTeamsEvent(undefined); return; }
        const result = await request<{ teams: TeamRecord[] }>('teams?eventId=' + encodeURIComponent(id));
        if (generation === teamsRequest.current && selectedId.current === id) { setTeams(result.teams); setTeamsEvent(id); }
    }
    async function refresh() {
        const result = await request<{ events: EventRecord[]; activeEvent: EventRecord | null; configRevision: number }>('events');
        setEvents(result.events); setCodeRevision(result.configRevision);
        if (security.server) security.update({ ...security.server, ...result });
        const event = result.events.find(item => item.id === selectedId.current) ?? result.activeEvent ?? result.events[0];
        if (event && event.id !== selectedId.current) onEventChange(event.id);
        if (!creating) resetForm(event);
        await refreshTeams(event?.id);
    }
    async function run(work: () => Promise<void>, success = '') {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setMessage('');
        try { await work(); setMessage(success); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'The request could not be completed.'); }
        finally { busyRef.current = false; setBusy(false); }
    }
    async function eventCommand(action: string, body: unknown) {
        const value = await request<SessionState & {createdEventId?: string}>(action, body);
        security.update(value); setEvents(value.events ?? []);
        if (!competitorCode && !teacherCode) setCodeRevision(value.configRevision);
        return value;
    }
    useEffect(() => { void run(refresh, ''); }, []);
    useEffect(() => {
        setCreating(false); resetForm(selected); setTeamName(''); setTeams([]); setTeamsEvent(undefined);
        void refreshTeams(eventId).catch(error => { if (selectedId.current === eventId) setMessage(error.message); });
        return () => { teamsRequest.current++; };
    }, [eventId]);
    // Session polling refreshes clean forms automatically. Keep typed changes
    // and their original revision when another teacher edits the same settings.
    useEffect(() => {
        const state=security.server;
        if(!state?.events || busyRef.current)return;
        setEvents(state.events);
        if(!dirty && !creating)resetForm(state.events.find(event=>event.id===eventId));
        if(!competitorCode && !teacherCode)setCodeRevision(state.configRevision);
        if(!creating)void refreshTeams(eventId).catch(error=>setMessage(error.message));
    }, [security.server]);

    function changeMode(create: boolean, id?: string) {
        const change = async () => {
            setCreating(create); setMessage('');
            if (create) resetForm();
            else if (id) { if (id === eventId) resetForm(selected); else onEventChange(id); }
        };
        if (dirty) setConfirm({ title: 'Discard unsaved event changes?', description: 'The saved event will stay unchanged.', run: change, success: '' });
        else void change();
    }
    function field(key: keyof EventForm, value: string) { setDraft(current => ({ ...current, [key]: value })); }
    function scheduleInput() {
        if (!creating && !scheduleDirty) return {};
        const instant = (value: string, label: string) => { try { return parseLondonDate(value); } catch (error) { throw new Error(`${label}: ${(error as Error).message}`); } };
        const theoryStartsAt = instant(draft.theoryStart, 'Theory start'), theoryEndsAt = instant(draft.theoryEnd, 'Theory end');
        if (theoryStartsAt >= theoryEndsAt) throw new Error('Theory start must be before theory end.');
        if (!!draft.practicalStart !== !!draft.practicalEnd) throw new Error('Enter both practical times or leave both blank.');
        const practicalStartsAt = draft.practicalStart ? instant(draft.practicalStart, 'Practical start') : null;
        const practicalEndsAt = draft.practicalEnd ? instant(draft.practicalEnd, 'Practical end') : null;
        if (practicalStartsAt !== null && practicalEndsAt !== null && practicalStartsAt >= practicalEndsAt) throw new Error('Practical start must be before practical end.');
        return { theoryStartsAt, theoryEndsAt, practicalStartsAt, practicalEndsAt };
    }
    async function saveEvent() {
        const body = { name: draft.name, year: draft.year, ...scheduleInput() };
        if (creating) {
            const value = await eventCommand('event-create', body), created = value.events?.find(event => event.id === value.createdEventId);
            if (created) { setCreating(false); resetForm(created); onEventChange(created.id); }
        } else if (selected) {
            const value = await eventCommand('event-update', { ...body, eventId: selected.id, expectedRevision: formRevision });
            resetForm(value.events?.find(event => event.id === selected.id));
        }
    }
    function changeStatus(status:string) {
        if(!selected || creating || dirty || busy)return;
        const target=selected;
        if(target.status==='draft' && status==='active') {
            const previous=security.server?.activeEvent;
            setConfirm({title:'Activate this event?',description:previous?`This ends ${previous.name} and activates ${target.name}. Complete events cannot restart.`:`Activate ${target.name} for competitors?`,run:async()=>{if(previous && previous.id!==target.id)await eventCommand('event-end',{eventId:previous.id,expectedRevision:previous.revision,confirm:true});const value=await eventCommand('event-activate',{eventId:target.id,expectedRevision:target.revision,confirm:true});resetForm(value.events?.find(event=>event.id===target.id));}});
        } else if(target.status==='active' && status==='ended')setConfirm({title:'End this event?',description:`End ${target.name}? Saved results will remain available. This event cannot restart.`,run:async()=>{const value=await eventCommand('event-end',{eventId:target.id,expectedRevision:target.revision,confirm:true});resetForm(value.events?.find(event=>event.id===target.id));}});
    }
    if (security.server?.role !== 'teacher') return <p role="alert">Teacher access required.</p>;
    const shownTeams = teamsEvent === selected?.id ? teams : [];
    const prefix = creating ? 'new-event' : 'event';
    return <main className="settings-page teacher-settings type-body">
        <header className="settings-header"><div className="settings-title"><OlympiadHeading lines={['Settings']} level={1} /></div><ArtworkBackButton onClick={() => {if(dirty || competitorCode || teacherCode)setConfirm({title:'Discard unsaved changes?',description:'Saved settings will stay unchanged.',run:async()=>onBack()});else onBack();}} label="Back to landing" /></header>
        {message && !confirm && <p className="settings-message type-caption" role="alert">{message.replaceAll('Refresh settings before saving again.','Reload this page before saving again; your unsaved values are still shown.')}</p>}
        <section className="settings-panel settings-questions" aria-labelledby="settings-questions-heading"><h2 id="settings-questions-heading" className="type-heading"><PanelToggle label="Questions Preview" expanded={questionsOpen} controls="settings-question-catalogue" onClick={()=>onPanelsChange({...panels,questions:!questionsOpen})}/></h2><div id="settings-question-catalogue" hidden={!questionsOpen}><ProblemTesting onOpen={(year,number)=>{const open=async()=>onQuestionPreview(year,number);if(dirty || competitorCode || teacherCode)setConfirm({title:'Discard unsaved changes?',description:'Saved settings will stay unchanged.',run:open});else void open();}}/><PracticalCatalogue onOpen={year=>{const open=async()=>onPracticalPreview(year);if(dirty || competitorCode || teacherCode)setConfirm({title:'Discard unsaved changes?',description:'Saved settings will stay unchanged.',run:open});else void open();}}/></div></section>
        <section className="settings-panel settings-events" aria-labelledby="settings-events-heading">
            <div className="settings-section-heading"><h2 id="settings-events-heading" className="type-heading"><PanelToggle label="Events" expanded={eventsOpen} controls="settings-event-content" onClick={()=>onPanelsChange({...panels,events:!eventsOpen})}/></h2>{eventsOpen && <div className="settings-toolbar" role="toolbar" aria-label="Event actions">
                <button className="ui-button" disabled={busy || creating} onClick={()=>changeMode(true)}>Create new event</button>
                <button className="ui-button settings-save" type="submit" form="settings-event-form" aria-label={creating?'Create draft event':'Save event'} title={creating?'Create draft event':'Save event'} disabled={busy || ended || (!creating && !selected)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l4 4v14H3V3h1Zm3 0v7h10V3M7 21v-8h10v8" fill="none" stroke="currentColor" strokeWidth="2"/></svg></button>
                {!creating && selected?.status==='draft' && <button className="ui-button" disabled={busy || dirty} onClick={()=>changeStatus('active')}>Activate event</button>}
                {!creating && selected?.status==='active' && <button className="ui-button" disabled={busy || dirty} onClick={()=>changeStatus('ended')}>End event</button>}
                <button className="ui-button" disabled={busy || dirty || creating || !selected} onClick={onPreview}>Preview theory</button>
                <button className="ui-button" disabled={busy || dirty || creating || !findPractical(selected?.year)} onClick={()=>onPracticalPreview()}>Preview practical</button>
                <button className="ui-button" disabled={busy || dirty || !!competitorCode || !!teacherCode || !security.server.activeEvent} onClick={onLeaderboard}>Open leaderboard</button>
            </div>}</div>
            <div id="settings-event-content" hidden={!eventsOpen}>
            <div className="settings-event-selector"><label htmlFor="event-select">Selected event:</label><select id="event-select" value={creating ? '' : eventId ?? ''} disabled={busy} onChange={event => changeMode(false, event.target.value)}><option value="" disabled>{creating ? 'New event' : 'Select an event'}</option>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select><select aria-label="Event status" className={`settings-event-status type-caption settings-event-status--${creating ? 'draft' : selected?.status ?? 'draft'}`} value={creating?'draft':selected?.status ?? 'draft'} disabled={busy || dirty || creating || !selected || ended} onChange={event=>changeStatus(event.target.value)}>{(['draft','active','ended'] as const).map(status=><option key={status} value={status} disabled={status==='draft' && selected?.status!=='draft' || status==='ended' && selected?.status!=='active'}>{statusLabel(status)}</option>)}</select></div>
            {(creating || selected) && <>
                <form id="settings-event-form" className="settings-event-form" onSubmit={event => { event.preventDefault(); void run(saveEvent); }}>
                    <div className="settings-event-identity"><div className="settings-field"><label htmlFor={`${prefix}-name`}>Event name</label><input id={`${prefix}-name`} value={draft.name} onChange={event => field('name', event.target.value)} required maxLength={80} disabled={busy || ended} /></div><div className="settings-field"><label htmlFor={`${prefix}-year`}>Year</label><select id={`${prefix}-year`} value={draft.year} onChange={event => field('year', event.target.value)} disabled={busy || ended || (!creating && selected?.status !== 'draft')}>{theoryYears.map(year => <option key={year}>{year}</option>)}</select></div></div>
                    <div className="settings-timing-tiles">
                        <fieldset className="settings-timing-tile"><legend className="type-label">Practical</legend><div className="settings-field"><label htmlFor={`${prefix}-practical-start`}>Start</label><input id={`${prefix}-practical-start`} type="datetime-local" value={draft.practicalStart} onChange={event => field('practicalStart', event.target.value)} disabled={busy || ended} /></div><div className="settings-field"><label htmlFor={`${prefix}-practical-end`}>End</label><input id={`${prefix}-practical-end`} type="datetime-local" value={draft.practicalEnd} onChange={event => field('practicalEnd', event.target.value)} disabled={busy || ended} /></div></fieldset>
                        <fieldset className="settings-timing-tile"><legend className="type-label">Theory</legend><div className="settings-field"><label htmlFor={`${prefix}-theory-start`}>Start</label><input id={`${prefix}-theory-start`} type="datetime-local" value={draft.theoryStart} onChange={event => field('theoryStart', event.target.value)} required={creating || !legacyStart || scheduleDirty} disabled={busy || ended} /></div><div className="settings-field"><label htmlFor={`${prefix}-theory-end`}>End</label><input id={`${prefix}-theory-end`} type="datetime-local" value={draft.theoryEnd} onChange={event => field('theoryEnd', event.target.value)} required disabled={busy || ended} /></div>{legacyStart && !scheduleDirty && <p className="type-caption">Legacy event: theory is available immediately until its end.</p>}</fieldset>
                    </div>
                    {creating && <div className="settings-actions"><button className="ui-button" type="button" disabled={busy} onClick={() => changeMode(false, eventId)}>Cancel new event</button></div>}
                </form>
                {!creating && selected && <>
                    {ended && <p className="type-caption">This event is complete. Results are read-only.</p>}
                    <section className="settings-teams" aria-labelledby="settings-teams-heading"><h3 id="settings-teams-heading" className="type-heading">Teams · {selected.name}</h3><p className="type-caption">Releasing a team disconnects its device and retains saved results and answers.</p>
                        {!ended && <form className="settings-team-add" onSubmit={event => { event.preventDefault(); const id = selected.id; void run(async () => { await request('team-add', { eventId: id, name: teamName }); setTeamName(''); await refreshTeams(id); }); }}><div className="settings-field"><label htmlFor="new-team-name">New team name</label><input id="new-team-name" value={teamName} onChange={event => setTeamName(event.target.value)} required maxLength={80} disabled={busy} /></div><button className="ui-button" disabled={busy || !teamName.trim()}>Add team</button></form>}
                        <table><caption className="sr-only">Event teams and results</caption><thead><tr><th>Team</th><th>Practical answer</th><th>Theory score</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shownTeams.map(team => <tr key={team.id}><td>{team.name}</td><td><PracticalTeamResult result={team.practical}/></td><td>{team.score ?? 0}</td><td>{team.claimed ? 'Taken' : 'Available'}</td><td><div className="settings-team-actions"><button className="ui-button" disabled={busy || ended || !team.claimed} aria-label={'Allow reselection for '+team.name} onClick={() => { const id = selected.id; setConfirm({ title: 'Allow team reselection?', description: `Allow reselection for ${team.name}? The current device will lose access. Saved results and answers will be retained.`, run: async () => { await request('team-release', { eventId: id, teamId: team.id, confirm: true }); await refreshTeams(id); } }); }}>Allow reselection</button><button className="ui-button" disabled={busy || ended} aria-label={'Delete team '+team.name} onClick={()=>{const id=selected.id,requestId=crypto.randomUUID();setConfirm({title:'Delete this team?',description:selected.status==='draft'?`Permanently delete ${team.name} and all its saved team data?`:team.hasSubmittedActivity?`Remove ${team.name} from this event and leaderboard? Its submitted activity and saved records will be retained; its current device will lose access.`:`Delete ${team.name}? If it still has no submitted activity, all team data will be permanently deleted. Any activity submitted before deletion is confirmed will instead be retained and the team removed from lists. Its current device will lose access.`,run:async()=>{await request('team-delete',{eventId:id,teamId:team.id,teamName:team.name,requestId,confirm:true});await refreshTeams(id);}});}}>Delete</button></div></td></tr>)}</tbody></table>
                    </section>
                </>}
            </>}
            </div>
        </section>
        <section className="settings-panel settings-codes" aria-labelledby="settings-codes-heading"><h2 id="settings-codes-heading" className="type-heading"><PanelToggle label="Access codes" expanded={codesOpen} controls="settings-codes-content" onClick={()=>onPanelsChange({...panels,codes:!codesOpen})}/></h2><div id="settings-codes-content" hidden={!codesOpen}><p className="type-caption">Changing codes preserves existing sessions.</p><form onSubmit={event => { event.preventDefault(); void run(async () => { const value = await request<SessionState>('codes-update', { expectedConfigRevision: codeRevision, ...(competitorCode ? { competitorCode } : {}), ...(teacherCode ? { teacherCode } : {}) }); security.update(value); setCodeRevision(value.configRevision); setCompetitorCode(''); setTeacherCode(''); }); }}><div className="settings-field"><label htmlFor="competitor-code">New competitor code</label><input id="competitor-code" type="password" autoComplete="new-password" value={competitorCode} onChange={event => setCompetitorCode(event.target.value)} disabled={busy} maxLength={128} /></div><div className="settings-field"><label htmlFor="teacher-code">New teacher code</label><input id="teacher-code" type="password" autoComplete="new-password" value={teacherCode} onChange={event => setTeacherCode(event.target.value)} disabled={busy} maxLength={128} /></div><button className="ui-button" disabled={busy || (!competitorCode && !teacherCode)}>Save codes</button></form></div></section>
        {confirm && <SettingsConfirmation confirmation={confirm} error={message} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void run(async () => { await confirm.run(); setConfirm(null); }, confirm.success)} />}
    </main>;
}

function PanelToggle({label,expanded,controls,onClick}:{label:string;expanded:boolean;controls:string;onClick:()=>void}) {
    return <button type="button" className="settings-panel-toggle" aria-expanded={expanded} aria-controls={controls} onClick={onClick}>{label}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2"/></svg></button>;
}

function SettingsConfirmation({ confirmation, error, busy, onCancel, onConfirm }: { confirmation: Confirmation; error?:string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
    const dialog = useRef<HTMLElement>(null);
    useEffect(() => {
        const previous = document.activeElement;
        const focus = (event: FocusEvent) => { if (!dialog.current?.contains(event.target as Node)) dialog.current?.focus(); };
        const keys = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busy) { event.preventDefault(); onCancel(); }
            if (event.key !== 'Tab') return;
            const controls = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []), first = controls[0], last = controls.at(-1);
            if (!first) { event.preventDefault(); dialog.current?.focus(); }
            else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('focusin', focus); document.addEventListener('keydown', keys, true);
        return () => { document.removeEventListener('focusin', focus); document.removeEventListener('keydown', keys, true); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
    }, [busy, onCancel]);
    return <div className="settings-confirm-overlay"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="settings-confirm-title" aria-describedby="settings-confirm-description" tabIndex={-1} className="settings-confirm"><h2 id="settings-confirm-title" className="type-heading">{confirmation.title}</h2><p id="settings-confirm-description">{confirmation.description}</p>{error && <p role="alert">{error}</p>}<div className="settings-actions"><button className="ui-button" autoFocus disabled={busy} onClick={onCancel}>Cancel</button><button className="ui-button" disabled={busy} onClick={onConfirm}>Confirm</button></div></section></div>;
}
