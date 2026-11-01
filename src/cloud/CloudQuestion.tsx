import { useEffect, useLayoutEffect, useReducer, useRef, type SyntheticEvent } from 'react';
import { emptyAttempt, type Answers, type Attempt, type AttemptAction, type QuestionDefinition } from '../questions/attempts';
import type { QuestionEntry } from '../questions/catalog';
import { request, type QuestionHydration, type QuestionState } from './api';
import { useCompetitionSecurity } from '../security';
import './cloud.css';
import {CompletionStamp} from '../components/CompletionStamp';
type Pending = {
    endpoint: string;
    body: Record<string, unknown>;
    edits: number;
};
type RecordState = {
    attempt: Attempt;
    revision: number;
    data?: unknown;
    loaded: boolean;
    dirty: boolean;
    edits: number;
    status: string;
    pending?: Pending;
    flight?: Promise<boolean>;
    command?: boolean;
    focusTarget?: HTMLElement | null;
    completion?: {solvedAt:number;animate:boolean};
    serverResultIds?: Set<number>;
};
export function compactAnswers(answers: Answers): Answers {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(answers)) {
        if (key === 'history')
            continue;
        if (key === 'drawing' || key === 'drawings' || key === 'diagram') {
            try {
                const parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object') {
                    if ('history' in parsed)
                        parsed.history = [];
                    delete parsed.past;
                    delete parsed.future;
                    result[key] = JSON.stringify(parsed);
                    continue;
                }
            }
            catch { /* retain invalid semantic answer for server validation */ }
        }
        result[key] = value;
    }
    return result;
}
function localEdit(definition: QuestionDefinition, attempt: Attempt, action: AttemptAction): Attempt {
    if (action.type === 'edit') {
        if (attempt.solvedAt !== null || attempt.retryAt > Date.now())
            return attempt;
        const field = definition.parts.flatMap(part => part.fields).find(field => field.id === action.field);
        if (!field || (field.acceptsEdit && !field.acceptsEdit(action.value)))
            return attempt;
        return { ...attempt, answers: { ...attempt.answers, [action.field]: action.value } };
    }
    return definition.reduce?.(attempt, action) ?? attempt;
}
function preserveHistory(incoming: Attempt, local: Attempt): Attempt {
    const answers = { ...incoming.answers };
    if (local.answers.history)
        answers.history = local.answers.history;
    for (const key of ['drawing', 'drawings', 'diagram']) {
        try {
            const next = JSON.parse(answers[key]), old = JSON.parse(local.answers[key]);
            const semantic = (value: Record<string, unknown>) => { const { history: _history, past: _past, future: _future, ...rest } = value; return rest; };
            if (next && old && JSON.stringify(semantic(next)) === JSON.stringify(semantic(old)) && old.history)
                answers[key] = JSON.stringify({ ...next, history: old.history });
        }
        catch { /* ordinary answers */ }
    }
    return { ...incoming, answers };
}
/** Answers and presentation edits live only in this mounted router's memory. */
export function useServerQuestions(eventId: string | undefined) {
    const security = useCompetitionSecurity();
    const identity = [security.server?.role, security.server?.team?.id, security.server?.team?.claimGeneration, security.server?.expiresAt].join('|');
    type Context = { records: Map<string, RecordState>; hydrated: boolean; flight?: Promise<boolean>; error?: string };
    const cache = useRef({ identity, contexts: new Map<string, Context>() });
    const [, render] = useReducer(n => n + 1, 0);
    if (cache.current.identity !== identity) cache.current = { identity, contexts: new Map() };
    const owner = cache.current;
    const contextKey = eventId ?? '';
    let context = owner.contexts.get(contextKey);
    if (!context) { context = { records: new Map(), hydrated: false }; owner.contexts.set(contextKey, context); }
    const current = context;
    const stillAuthorized = () => cache.current === owner;
    const get = (id: string) => {
        let value = current.records.get(id);
        if (!value) {
            value = { attempt: emptyAttempt(), revision: 0, loaded: security.server?.role === 'teacher' && id !== 'U5P5', dirty: false, edits: 0, status: security.server?.role === 'teacher' && id !== 'U5P5' ? 'Saved' : current.error ?? 'Loading saved results...' };
            current.records.set(id, value);
        }
        return value;
    };
    const bodyFor = (id: string) => ({ questionId: id, ...(security.server?.role === 'teacher' ? { eventId } : {}) });
    function accept(id: string, value: QuestionState, edits: number, initial = false) {
        const record = get(id), previous = record.attempt, delta = Date.now() - value.serverNow;
        const solvedAt = value.attempt.solvedAt;
        record.completion = typeof solvedAt === 'number' && Number.isFinite(solvedAt) && solvedAt >= 0
            ? { solvedAt, animate: !initial && record.loaded && !record.completion } : undefined;
        const attempt = { ...value.attempt, retryAt: value.attempt.retryAt ? value.attempt.retryAt + delta : 0 };
        if (attempt.interaction?.kind === 'timed')
            attempt.interaction = { ...attempt.interaction, deadline: attempt.interaction.deadline + delta, wrongUntil: attempt.interaction.wrongUntil ? attempt.interaction.wrongUntil + delta : 0 };
        if (attempt.interaction?.kind === 'gc' && attempt.interaction.activeRun)
            attempt.interaction = { ...attempt.interaction, activeRun: { ...attempt.interaction.activeRun, startedAt: attempt.interaction.activeRun.startedAt + delta, deadline: attempt.interaction.activeRun.deadline + delta } };
        record.revision = value.revision;
        if (value.data !== undefined) record.data = value.data;
        const wasLoaded = record.loaded;
        record.loaded = true;
        record.attempt = record.completion || !wasLoaded || record.edits === edits
            ? preserveHistory(attempt, previous) : { ...attempt, answers: previous.answers, interaction: previous.interaction };
        // GC run/results are authoritative; its camera, report placement, dilution,
        // loaded snapshot and formulation remain local through action responses.
        if (wasLoaded && attempt.interaction?.kind === 'gc' && previous.interaction?.kind === 'gc') {
            const canonical = attempt.interaction, local = previous.interaction;
            record.attempt = { ...record.attempt, answers: record.completion ? record.attempt.answers : previous.answers, interaction: {
                ...canonical, entered: canonical.entered || local.entered, concentrations: local.concentrations,
                loaded: local.activeRun && !canonical.activeRun ? null : local.loaded,
                reference: local.reference, interval: local.interval, measurements: local.measurements,
                results: canonical.results?.filter(row => !record.serverResultIds?.has(row.id) || local.results?.some(old => old.id === row.id)).map(row => {
                    const display = local.results?.find(old => old.id === row.id);
                    return display ? { ...row, position: display.position, layer: display.layer, interval: display.interval } : row;
                }),
            } };
        }
        if (attempt.interaction?.kind === 'gc') record.serverResultIds = new Set(attempt.interaction.results?.map(row => row.id));
        record.dirty = !record.completion && record.edits !== edits;
        record.status = record.dirty ? 'Answer not submitted' : 'Saved';
        security.recordQuestion(id, value.attempt, value.score);
        render();
    }
    function hydrate(value: QuestionHydration) {
        if (value.eventId !== eventId || current.hydrated) return;
        current.hydrated = true;
        current.error = undefined;
        for (const [id, state] of Object.entries(value.questions))
            accept(id, { ...state, score: value.score, serverNow: value.serverNow, eventEndsAt: value.eventEndsAt }, get(id).edits, true);
    }
    // GO/resume carries the whole active year, so opening a question makes no read.
    const initial = security.server?.hydration;
    if (initial && initial.eventId === eventId && !current.hydrated) {
        // Seeding must not call React setters while the router renders.
        current.hydrated = true;
        for (const [id, state] of Object.entries(initial.questions)) {
            const delta = Date.now() - initial.serverNow, attempt = { ...state.attempt, retryAt: state.attempt.retryAt ? state.attempt.retryAt + delta : 0 };
            if (attempt.interaction?.kind === 'timed') attempt.interaction = { ...attempt.interaction, deadline: attempt.interaction.deadline + delta, wrongUntil: attempt.interaction.wrongUntil ? attempt.interaction.wrongUntil + delta : 0 };
            if (attempt.interaction?.kind === 'gc' && attempt.interaction.activeRun) attempt.interaction = { ...attempt.interaction, activeRun: { ...attempt.interaction.activeRun, startedAt: attempt.interaction.activeRun.startedAt + delta, deadline: attempt.interaction.activeRun.deadline + delta } };
            const solvedAt = attempt.solvedAt;
            current.records.set(id, { attempt, revision: state.revision, data: state.data, loaded: true, dirty: false, edits: 0, status: 'Saved', serverResultIds: attempt.interaction?.kind === 'gc' ? new Set(attempt.interaction.results?.map(row => row.id)) : undefined, completion: typeof solvedAt === 'number' && Number.isFinite(solvedAt) && solvedAt >= 0 ? { solvedAt, animate: false } : undefined });
        }
    }
    async function load(_id: string) {
        if (security.server?.role === 'teacher' && get(_id).loaded) return;
        if (current.hydrated) return;
        if (current.flight) { await current.flight; return; }
        current.flight = (async () => {
            const hasAuthority = security.captureAuthority();
            try {
                if (!security.canAccessTheory()) return false;
                if (security.server?.role === 'teacher') {
                    const value = await request<QuestionState>('question', {eventId,questionId:_id});
                    if (!stillAuthorized()) return false;
                    accept(_id,value,get(_id).edits,true); return true;
                }
                const value = await request<QuestionHydration>('hydrate', {});
                if (!stillAuthorized()) return false;
                hydrate(value);
                return current.hydrated;
            } catch (error) {
                if (!stillAuthorized()) return false;
                if (hasAuthority()) security.handleMutationError(error as { status?: number; message?: string });
                current.error = error instanceof Error ? error.message : 'Unable to load saved results.';
                for (const record of current.records.values()) record.status = current.error;
                render();
                return false;
            } finally { current.flight = undefined; }
        })();
        await current.flight;
    }
    async function send(id: string, pending: Pending): Promise<boolean> {
        const record = get(id);
        record.focusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        record.pending = pending;
        record.status = 'Checking...';
        render();
        const hasAuthority = security.captureAuthority();
        try {
            if (!security.canAccessTheory()) throw new Error('This question is not available.');
            const value = await request<QuestionState>(pending.endpoint, pending.body);
            if (!stillAuthorized()) return false;
            record.pending = undefined;
            accept(id, value, pending.edits);
            return true;
        } catch (error) {
            if (!stillAuthorized()) return false;
            if (hasAuthority()) security.handleMutationError(error as { status?: number; message?: string });
            record.status = 'Not saved. ' + (error instanceof Error ? error.message : 'Check the connection.') + ' Retry to confirm.';
            render();
            return false;
        }
    }
    // Retry only an existing frozen operation. Ordinary answers are never flushed.
    async function flush(id?: string): Promise<boolean> {
        if (!id) return true;
        const record = get(id);
        if (record.flight) return record.flight;
        if (!record.pending) return true;
        record.flight = send(id, record.pending);
        try { return await record.flight; } finally { record.flight = undefined; }
    }
    function action(definition: QuestionDefinition, action: AttemptAction) {
        if (!security.canAccessTheory()) return;
        const record = get(definition.id);
        if (!record.loaded || record.completion) return;
        const remote = action.type === 'submit' || action.type === 'start' || action.type === 'gc-run' || action.type === 'tick';
        if (!remote) {
            const next = localEdit(definition, record.attempt, action);
            if (next === record.attempt) return;
            record.attempt = next;
            record.edits++;
            record.dirty = true;
            record.status = 'Answer not submitted';
            render();
            return;
        }
        if (record.command || record.flight || record.pending) return;
        const answers = { ...compactAnswers(record.attempt.answers) };
        if (record.attempt.interaction?.kind === 'grouping') answers.groups = record.attempt.interaction.selected.join(',');
        const { now: _now, ...semantic } = action;
        let remoteAction: Record<string, unknown> = semantic;
        if (action.type === 'gc-run') {
            const lab = record.attempt.interaction;
            if (lab?.kind !== 'gc' || !lab.loaded || lab.activeRun) return;
            remoteAction = { type: 'gc-run', sample: lab.loaded.sample, concentration: lab.loaded.concentration };
        }
        const endpoint = action.type === 'submit' ? 'submit' : 'action';
        const pending: Pending = { endpoint, edits: record.edits, body: { ...bodyFor(definition.id), requestId: crypto.randomUUID(), ...(endpoint === 'submit' ? { answers } : { action: remoteAction }) } };
        record.command = true;
        record.flight = send(definition.id, pending);
        void record.flight.finally(() => { record.flight = undefined; record.command = false; });
    }
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (!security.canAccessTheory()) return;
            for (const [id, record] of current.records) {
                if (record.completion) continue;
                const interaction = record.attempt.interaction;
                const due = interaction?.kind === 'timed' && interaction.active && Date.now() >= interaction.deadline
                    || interaction?.kind === 'gc' && interaction.activeRun && Date.now() >= interaction.activeRun.deadline;
                if (due && !record.flight && !record.pending) action({ id } as QuestionDefinition, { type: 'tick', now: Date.now() });
            }
        }, 250);
        return () => window.clearInterval(timer);
    });
    return { get, load, action, flush };
}
export type ServerQuestions = ReturnType<typeof useServerQuestions>;
export function CloudQuestion({ entry, questions }: {
    entry: QuestionEntry;
    questions: ServerQuestions;
}) {
    const { definition, View } = entry, record = questions.get(definition.id),security=useCompetitionSecurity();
    const fields=useRef<HTMLFieldSetElement>(null),complete=!!record.completion;
    useLayoutEffect(()=>{
      const fieldset=fields.current;
      if(!complete || !fieldset)return;
      // Preserve readable scientific content while removing custom SVG/canvas
      // widgets from keyboard focus as well as disabling every native control.
      const controls=[...fieldset.querySelectorAll<HTMLElement>('[tabindex],a[href],[contenteditable]')].map(element=>({element,index:element.getAttribute('tabindex'),disabled:element.getAttribute('aria-disabled')}));
      for(const {element}of controls){element.setAttribute('tabindex','-1');element.setAttribute('aria-disabled','true');}
      if(fieldset.contains(document.activeElement))(document.activeElement as HTMLElement)?.blur?.();
      for(const dialog of fieldset.querySelectorAll<HTMLDialogElement>('dialog[open]'))dialog.close();
      return()=>{for(const {element,index,disabled}of controls){if(index===null)element.removeAttribute('tabindex');else element.setAttribute('tabindex',index);if(disabled===null)element.removeAttribute('aria-disabled');else element.setAttribute('aria-disabled',disabled);}};
    },[complete]);
    const blockCompleted=(event:SyntheticEvent)=>{if(complete){event.preventDefault();event.stopPropagation();}};
    useEffect(() => { void questions.load(definition.id); }, [definition.id]);
    useEffect(()=>{
      if(record.pending)return;
      const target=record.focusTarget;
      if(target?.isConnected&&!target.matches(':disabled'))target.focus({preventScroll:true});
      record.focusTarget=null;
    },[record.revision,record.pending]);
    return <div className="cloud-question cloud-question--joined">{(security.server?.role!=='teacher' || !['Saved','Answer not submitted'].includes(record.status)) && <p className="type-caption cloud-status" role="status">{record.status}{record.pending && <button type="button" onClick={() => void questions.flush(definition.id)}>Retry save</button>}</p>}
    {record.loaded ? <fieldset ref={fields} className={'cloud-fields'+(complete?' cloud-fields--complete':'')} disabled={complete || !!record.pending} onClickCapture={blockCompleted} onDoubleClickCapture={blockCompleted} onPointerDownCapture={blockCompleted} onPointerMoveCapture={blockCompleted} onPointerUpCapture={blockCompleted} onDragStartCapture={blockCompleted} onKeyDownCapture={event=>{if(event.key!=='Tab')blockCompleted(event);}} onWheelCapture={event=>{if(complete)event.stopPropagation();}} onFocusCapture={event=>{if(complete)(event.target as HTMLElement).blur?.();}}><View attempt={record.attempt} onAction={action => {if(!complete)questions.action(definition, action);}} data={record.data}/></fieldset> : <div className="question-access" role="status">{record.status}<button type="button" onClick={() => void questions.load(definition.id)}>Retry</button></div>}
    {record.loaded && record.completion && security.canAccessTheory() && <CompletionStamp key={definition.id+'-'+record.completion.solvedAt} solvedAt={record.completion.solvedAt} animate={record.completion.animate} preview={security.server?.role==='teacher'} onShown={()=>{if(record.completion)record.completion.animate=false;}}/>}
  </div>;
}
export { request } from './api';
