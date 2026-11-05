import { useEffect, useRef, useState } from 'react';
import { useCompetitionSecurity } from './security';
import { request, HttpError, type EventRecord, type SessionState, type TeamRecord } from './cloud/api';
import { OlympiadHeading } from './components/OlympiadHeading';
import { eventTiming, londonDateValue, parseLondonDate } from './events/timing';
import { theoryYears } from './questions/years';
import { ProblemTesting } from './components/ProblemTesting';
import { PracticalCatalogue } from './practicals/Practical';
import {SchoolRoster} from './components/SchoolRoster';
import './settings.css';
import {BackendDiagnostics} from './components/BackendDiagnostics';
import {PilotSettings} from './pilot/Pilot';

type Confirmation = { title: string; description: string; run: () => Promise<void>; success?: string };
type EventForm = { name: string; year: string; theoryStart: string; theoryEnd: string; practicalStart: string; practicalEnd: string };
const blankEvent = (): EventForm => ({ name: '', year: 'L6', theoryStart: '', theoryEnd: '', practicalStart: '', practicalEnd: '' });
function eventForm(event: EventRecord): EventForm {
    const timing = eventTiming(event);
    return { name: event.name, year: event.year, theoryStart: londonDateValue(timing.theoryStartsAt), theoryEnd: londonDateValue(timing.theoryEndsAt), practicalStart: londonDateValue(timing.practicalStartsAt), practicalEnd: londonDateValue(timing.practicalEndsAt) };
}
const scheduleKeys = ['theoryStart', 'theoryEnd', 'practicalStart', 'practicalEnd'] as const;
const statusLabel = (status: EventRecord['status']) => ({ draft: 'Draft', active: 'Active', ended: 'Complete' })[status];
export type SettingsPanels={questions:boolean;events:boolean;diagnostics:boolean};

export default function App({ eventId, onEventChange, onLeaderboard, onQuestionPreview,onPracticalPreview,panels,onPanelsChange }: {
    eventId?: string; onEventChange: (id: string) => void; onLeaderboard: () => void; onQuestionPreview: (year:string,number:number)=>void; onPracticalPreview: (year?:string)=>void;panels:SettingsPanels;onPanelsChange:(value:SettingsPanels)=>void;
}) {
    const security = useCompetitionSecurity();
    const [events, setEvents] = useState<EventRecord[]>(security.server?.events ?? []);
    const [teams, setTeams] = useState<TeamRecord[]>([]), [teamsEvent, setTeamsEvent] = useState<string>();
    const [busy, setBusy] = useState(false), busyRef = useRef(false);
    const [message, setMessage] = useState(''), [confirm, setConfirm] = useState<Confirmation | null>(null);
    const [creating, setCreating] = useState(false), [draft, setDraft] = useState<EventForm>(blankEvent), [baseline, setBaseline] = useState<EventForm>(blankEvent);
    const {questions:questionsOpen,events:eventsOpen}=panels;
    const [formRevision, setFormRevision] = useState(0);
    const eventCreateRequest = useRef<{fingerprint:string;requestId:string}|null>(null);
    const teamsRequest = useRef(0), selectedId = useRef(eventId);
    selectedId.current = eventId;
    const selected = events.find(event => event.id === eventId);
    const currentEvent = events.find(event=>event.status==='active') ?? events.slice().reverse().find(event=>event.status==='draft');
    const ended = !creating && selected?.status === 'ended';
    const resetPending = !!selected?.rosterResetInput;
    const creationPending = creating && eventCreateRequest.current!==null;
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
        if (security.server) security.update({ ...security.server, ...result });
        const event = result.events.find(item => item.id === selectedId.current) ?? result.activeEvent ?? result.events.slice().reverse().find(event=>event.status==='draft') ?? result.events[0];
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
        return value;
    }
    useEffect(() => { void run(refresh, ''); }, []);
    useEffect(() => {
        setCreating(false); resetForm(selected); setTeams([]); setTeamsEvent(undefined);
        void refreshTeams(eventId).catch(error => { if (selectedId.current === eventId) setMessage(error.message); });
        return () => { teamsRequest.current++; };
    }, [eventId]);
    // Explicit server responses refresh clean forms. Keep typed changes
    // and their original revision when another teacher edits the same settings.
    useEffect(() => {
        const state=security.server;
        if(!state?.events || busyRef.current)return;
        setEvents(state.events);
        if(!dirty && !creating)resetForm(state.events.find(event=>event.id===eventId));
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
            const fingerprint=JSON.stringify(body);
            if(eventCreateRequest.current && eventCreateRequest.current.fingerprint!==fingerprint)throw new Error('Retry the original event creation before changing its values.');
            eventCreateRequest.current ??= {fingerprint,requestId:crypto.randomUUID()};
            try{
                const value = await eventCommand('event-create', {...body,requestId:eventCreateRequest.current.requestId}), created = value.events?.find(event => event.id === value.createdEventId);
                eventCreateRequest.current=null;
                if (created) { setCreating(false); resetForm(created); onEventChange(created.id); }
            }catch(error){if(error instanceof HttpError && error.status<500){eventCreateRequest.current=null;throw error;}throw new Error((error instanceof Error?error.message:'The creation response was not confirmed.')+' Use Save to retry this event creation.');}
        } else if (selected && draft.year!==selected.year) {
            const target=selected,requestId=crypto.randomUUID(),expectedRevision=formRevision;
            setConfirm({title:'Change year and reset this event?',description:`Change ${target.name} from ${target.year} to ${draft.year}? All theory scores, answers, practical responses and team sessions will reset. Team names are kept. The event returns to draft.`,run:async()=>{
                const value=await eventCommand('event-year-change',{...body,eventId:target.id,expectedRevision,requestId,confirm:true});
                const replacement=value.events?.find(event=>event.id===value.createdEventId);if(replacement){resetForm(replacement);onEventChange(replacement.id);}
            }});
        } else if (selected) {
            const value = await eventCommand('event-update', { ...body, eventId: selected.id, expectedRevision: formRevision });
            resetForm(value.events?.find(event => event.id === selected.id));
        }
    }
    async function resumeYearReset(){if(!selected?.rosterResetInput)return;const value=await eventCommand('event-year-change',selected.rosterResetInput),replacement=value.events?.find(event=>event.id===value.createdEventId);if(replacement){resetForm(replacement);onEventChange(replacement.id);}}
    function changeStatus(status:string) {
        if(!selected || creating || dirty || busy || resetPending)return;
        const target=selected;
        if(target.status==='draft' && status==='active') {
            setConfirm({title:'Activate this event?',description:`Activate ${target.name} for competitors?`,run:async()=>{const value=await eventCommand('event-activate',{eventId:target.id,expectedRevision:target.revision,confirm:true});resetForm(value.events?.find(event=>event.id===target.id));}});
        } else if(target.status==='active' && status==='draft')setConfirm({title:'Return this event to draft?',description:`Return ${target.name} to draft? Saved results and team claims will be preserved. Competitors can submit before challenge start times while in draft; configured end times still apply. Reactivation retains the existing results.`,run:async()=>{const value=await eventCommand('event-draft',{eventId:target.id,expectedRevision:target.revision,confirm:true});resetForm(value.events?.find(event=>event.id===target.id));}});
        else if(target.status!=='ended' && status==='ended')setConfirm({title:'End this event?',description:`End ${target.name}? Saved results will remain available. This event cannot restart.`,run:async()=>{const value=await eventCommand('event-end',{eventId:target.id,expectedRevision:target.revision,confirm:true});resetForm(value.events?.find(event=>event.id===target.id));}});
    }
    if (security.server?.role !== 'teacher') return <p role="alert">Teacher access required.</p>;
    const shownTeams = teamsEvent === selected?.id ? teams : [];
    const prefix = creating ? 'new-event' : 'event';
    return <main className="settings-page teacher-settings type-body">
        <header className="settings-header"><div className="settings-title"><OlympiadHeading lines={['Settings']} level={1} /></div></header>
        {message && !confirm && <p className="settings-message type-caption" role="alert">{message.replaceAll('Refresh settings before saving again.','Reload this page before saving again; your unsaved values are still shown.')}</p>}
        <section className="settings-panel settings-questions" aria-labelledby="settings-questions-heading"><h2 id="settings-questions-heading" className="type-heading"><PanelToggle label="Preview Questions" expanded={questionsOpen} controls="settings-question-catalogue" onClick={()=>onPanelsChange({...panels,questions:!questionsOpen})}/></h2><div id="settings-question-catalogue" hidden={!questionsOpen}><ProblemTesting onOpen={(year,number)=>{const open=async()=>onQuestionPreview(year,number);if(dirty)setConfirm({title:'Discard unsaved changes?',description:'Saved settings will stay unchanged.',run:open});else void open();}}/><PracticalCatalogue onOpen={year=>{const open=async()=>onPracticalPreview(year);if(dirty)setConfirm({title:'Discard unsaved changes?',description:'Saved settings will stay unchanged.',run:open});else void open();}}/></div></section>
        <section className="settings-panel settings-events" aria-labelledby="settings-events-heading">
            <div className="settings-section-heading"><h2 id="settings-events-heading" className="type-heading"><PanelToggle label="Events" expanded={eventsOpen} controls="settings-event-content" onClick={()=>onPanelsChange({...panels,events:!eventsOpen})}/></h2>{eventsOpen && <div className="settings-toolbar" role="toolbar" aria-label="Event actions">
                <button className="ui-button" disabled={busy || creating || !!currentEvent} title={currentEvent?'Complete the current event before creating another.':undefined} onClick={()=>changeMode(true)}>Create new event</button>
                <button className="ui-button settings-save" type="submit" form="settings-event-form" aria-label={creating?'Create draft event':'Save event'} title={creating?'Create draft event':'Save event'} disabled={busy || ended || resetPending || (!creating && !selected)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l4 4v14H3V3h1Zm3 0v7h10V3M7 21v-8h10v8" fill="none" stroke="currentColor" strokeWidth="2"/></svg></button>
                <button className="ui-button" disabled={busy || dirty || !security.server.activeEvent} onClick={onLeaderboard}>Open leaderboard</button>
            </div>}</div>
            <div id="settings-event-content" hidden={!eventsOpen}>
            <div className="settings-event-selector"><label htmlFor="event-select">Selected event:</label><select id="event-select" value={creating ? '' : eventId ?? ''} disabled={busy} onChange={event => changeMode(false, event.target.value)}><option value="" disabled>{creating ? 'New event' : 'Select an event'}</option>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select><select aria-label="Event status" className={`settings-event-status type-caption settings-event-status--${creating ? 'draft' : selected?.status ?? 'draft'}`} value={creating?'draft':selected?.status ?? 'draft'} disabled={busy || dirty || creating || !selected || ended || resetPending} onChange={event=>changeStatus(event.target.value)}>{(['draft','active','ended'] as const).map(status=><option key={status} value={status} disabled={status==='draft' && selected?.status==='ended'}>{statusLabel(status)}</option>)}</select></div>
            {(creating || selected) && <>
                <form id="settings-event-form" className="settings-event-form" onSubmit={event => { event.preventDefault(); void run(saveEvent); }}>
                    <div className="settings-event-identity"><div className="settings-field"><label htmlFor={`${prefix}-name`}>Event name</label><input id={`${prefix}-name`} value={draft.name} onChange={event => field('name', event.target.value)} required maxLength={80} disabled={busy || ended || resetPending || creationPending} /></div><div className="settings-field"><label htmlFor={`${prefix}-year`}>Year</label><select id={`${prefix}-year`} value={draft.year} onChange={event => field('year', event.target.value)} disabled={busy || ended || resetPending || creationPending}>{theoryYears.map(year => <option key={year}>{year}</option>)}</select></div></div>
                    <div className="settings-timing-tiles">
                        <fieldset className="settings-timing-tile"><legend className="type-label">Practical</legend><div className="settings-field"><label htmlFor={`${prefix}-practical-start`}>Start</label><input id={`${prefix}-practical-start`} type="datetime-local" value={draft.practicalStart} onChange={event => field('practicalStart', event.target.value)} disabled={busy || ended || resetPending || creationPending} /></div><div className="settings-field"><label htmlFor={`${prefix}-practical-end`}>End</label><input id={`${prefix}-practical-end`} type="datetime-local" value={draft.practicalEnd} onChange={event => field('practicalEnd', event.target.value)} disabled={busy || ended || resetPending || creationPending} /></div></fieldset>
                        <fieldset className="settings-timing-tile"><legend className="type-label">Theory</legend><div className="settings-field"><label htmlFor={`${prefix}-theory-start`}>Start</label><input id={`${prefix}-theory-start`} type="datetime-local" value={draft.theoryStart} onChange={event => field('theoryStart', event.target.value)} required={creating || !legacyStart || scheduleDirty} disabled={busy || ended || resetPending || creationPending} /></div><div className="settings-field"><label htmlFor={`${prefix}-theory-end`}>End</label><input id={`${prefix}-theory-end`} type="datetime-local" value={draft.theoryEnd} onChange={event => field('theoryEnd', event.target.value)} required disabled={busy || ended || resetPending || creationPending} /></div>{legacyStart && !scheduleDirty && <p className="type-caption">Legacy event: theory is available immediately until its end.</p>}</fieldset>
                    </div>
                    {creating && <div className="settings-actions"><button className="ui-button" type="button" disabled={busy || creationPending} onClick={() => changeMode(false, eventId)}>Cancel new event</button></div>}
                </form>
                {!creating && selected && <>
                    {resetPending && <div className="settings-setup-progress"><p role="status">The confirmed year reset is incomplete. Resume it before changing this event or its roster.</p><button className="ui-button" disabled={busy} onClick={()=>void run(resumeYearReset)}>Resume year reset</button></div>}
                    {ended && <p className="type-caption">This event is complete. Results are read-only.</p>}
                    <SchoolRoster key={selected.id} event={selected} teams={shownTeams} busy={busy} run={run} refresh={()=>refreshTeams(selected.id)} confirm={setConfirm} onError={setMessage} resumeEvent={async()=>{await eventCommand('event-setup',{eventId:selected.id});}}/>
                </>}
            </>}
            </div>
        </section>
        <PilotSettings/>
        <section className="settings-panel settings-diagnostics" aria-labelledby="settings-diagnostics-heading"><h2 id="settings-diagnostics-heading" className="type-heading"><PanelToggle label="Backend settings" expanded={panels.diagnostics} controls="settings-diagnostics-content" onClick={()=>onPanelsChange({...panels,diagnostics:!panels.diagnostics})}/></h2><BackendDiagnostics expanded={panels.diagnostics}/></section>
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
