import { useEffect, useLayoutEffect, useReducer, useRef, type SyntheticEvent } from 'react';
import { emptyAttempt, type Answers, type Attempt, type AttemptAction, type QuestionDefinition } from '../questions/attempts';
import type { QuestionEntry } from '../questions/catalog';
import { HttpError, request, type QuestionState } from './api';
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
function draftInteraction(attempt: Attempt): unknown {
    const value = attempt.interaction;
    if (value?.kind === 'grouping')
        return value;
    if (value?.kind === 'gc')
        return { kind: 'gc', entered: value.entered, concentrations: value.concentrations, reference: value.reference, interval: value.interval, results: value.results?.map(row => ({ id: row.id, position: row.position, layer: row.layer, interval: row.interval })) };
    return undefined;
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
/** Cache survives view unmounts; only compact server acknowledgements survive reload. */
export function useServerQuestions(eventId: string | undefined) {
    const security = useCompetitionSecurity();
    const identity = [eventId, security.server?.role, security.server?.team?.id, security.server?.team?.claimGeneration, security.server?.expiresAt].join('|');
    const records = useRef(new Map<string, RecordState>()), currentEvent = useRef(identity), timers = useRef(new Map<string, number>());
    const [, render] = useReducer(n => n + 1, 0);
    if (currentEvent.current !== identity) {
        records.current.clear();
        for (const timer of timers.current.values())
            window.clearTimeout(timer);
        timers.current.clear();
        currentEvent.current = identity;
    }
    const get = (id: string) => { let value = records.current.get(id); if (!value) {
        value = { attempt: emptyAttempt(), revision: 0, loaded: false, dirty: false, edits: 0, status: 'Restoring saved answer…' };
        records.current.set(id, value);
    } return value; };
    const bodyFor = (id: string) => ({ questionId: id, ...(security.server?.role === 'teacher' ? { eventId } : {}) });
    function accept(id: string, value: QuestionState, edits: number) {
        const record = get(id), previous = record.attempt, delta = Date.now() - value.serverNow;
        const solvedAt=value.attempt.solvedAt;
        record.completion=typeof solvedAt==='number' && Number.isFinite(solvedAt) && solvedAt>=0?{solvedAt,animate:record.loaded && !record.completion}:undefined;
        const attempt = { ...value.attempt, retryAt: value.attempt.retryAt ? value.attempt.retryAt + delta : 0 };
        if (attempt.interaction?.kind === 'timed')
            attempt.interaction = { ...attempt.interaction, deadline: attempt.interaction.deadline + delta, wrongUntil: attempt.interaction.wrongUntil ? attempt.interaction.wrongUntil + delta : 0 };
        if (attempt.interaction?.kind === 'gc' && attempt.interaction.activeRun)
            attempt.interaction = { ...attempt.interaction, activeRun: { ...attempt.interaction.activeRun, startedAt: attempt.interaction.activeRun.startedAt + delta, deadline: attempt.interaction.activeRun.deadline + delta } };
        record.revision = value.revision;
        if (value.data !== undefined)
            record.data = value.data;
        record.loaded = true;
        record.attempt = record.completion || record.edits === edits ? preserveHistory(attempt, previous) : { ...attempt, answers: previous.answers, interaction: previous.interaction };
        record.dirty = !record.completion && record.edits !== edits;
        record.status = record.dirty ? 'Saving answer…' : 'Saved';
        security.recordQuestion(id, value.attempt, value.score);
        render();
    }
    async function load(id: string) {
        const record = get(id);
        if (record.loaded || record.flight)
            return;
        const started = currentEvent.current;
        record.flight = (async () => { try {
            if (!await security.guardTheory())
                return false;
            const value = await request<QuestionState>('question', bodyFor(id));
            if (started !== currentEvent.current)
                return false;
            accept(id, value, record.edits);
            return true;
        }
        catch (error) {
            record.status = error instanceof Error ? error.message : 'Unable to restore answer.';
            render();
            return false;
        }
        finally {
            record.flight = undefined;
        } })();
        await record.flight;
    }
    async function send(id: string, pending: Pending): Promise<boolean> {
        const record = get(id);
        if(pending.endpoint!=='draft')record.focusTarget=document.activeElement instanceof HTMLElement?document.activeElement:null;
        record.pending = pending;
        record.status = 'Saving…';
        render();
        const started = currentEvent.current;
        try {
            if (!await security.guardTheory())
                throw new Error('Connection or session could not be verified.');
            const value = await request<QuestionState>(pending.endpoint, pending.body);
            if (started !== currentEvent.current)
                return false;
            record.pending = undefined;
            accept(id, value, pending.edits);
            return true;
        }
        catch (error) {
            if (error instanceof HttpError && error.status === 403) {
                // A changed theory schedule closes content without a breach.
                await security.refresh();
                if (security.canAccessTheory()) security.failClosed();
            } else if (error instanceof HttpError && [401, 423].includes(error.status)) {
                security.failClosed();
                void security.refresh();
            }
            record.status = 'Not saved. ' + (error instanceof Error ? error.message : 'Check the connection.') + ' Retry to confirm.';
            render();
            return false;
        }
    }
    async function flush(id?: string): Promise<boolean> {
        // Keep unsent local edits in the cache, but never write outside theory.
        // Navigation away from a closed challenge must remain possible.
        if (!security.canAccessTheory()) return true;
        const ids = id ? [id] : [...records.current.keys()];
        for (const key of ids) {
            const record = get(key);
            window.clearTimeout(timers.current.get(key));
            if (record.flight && !await record.flight)
                return false;
            while (record.dirty || record.pending) {
                const pending = record.pending ?? { endpoint: 'draft', edits: record.edits, body: { ...bodyFor(key), requestId: crypto.randomUUID(), expectedRevision: record.revision, answers: compactAnswers(record.attempt.answers), interaction: draftInteraction(record.attempt) } };
                record.flight = send(key, pending);
                const success = await record.flight;
                record.flight = undefined;
                if (!success)
                    return false;
            }
        }
        return true;
    }
    function action(definition: QuestionDefinition, action: AttemptAction) {
        if (!security.canAccessTheory())
            return;
        const record = get(definition.id);
        if (!record.loaded || record.completion)
            return;
        const remote = action.type === 'submit' || action.type === 'start' || action.type === 'gc-run' || action.type === 'gc-load' || action.type === 'gc-record' || action.type === 'tick';
        if (!remote) {
            const next = localEdit(definition, record.attempt, action);
            if (next === record.attempt)
                return;
            record.attempt = next;
            record.edits++;
            record.dirty = true;
            record.status = 'Saving answer…';
            render();
            window.clearTimeout(timers.current.get(definition.id));
            timers.current.set(definition.id, window.setTimeout(() => void flush(definition.id), 500));
            return;
        }
        if (record.command)
            return;
        record.command = true;
        void (async () => {
            try {
                const retrying = record.pending && record.pending.endpoint !== 'draft';
                if (!await flush(definition.id) || retrying)
                    return;
                const answers = { ...compactAnswers(record.attempt.answers) };
                if (record.attempt.interaction?.kind === 'grouping')
                    answers.groups = record.attempt.interaction.selected.join(',');
                const { now: _now, ...semantic } = action;
                const endpoint = action.type === 'submit' ? 'submit' : 'action';
                const pending: Pending = { endpoint, edits: record.edits, body: { ...bodyFor(definition.id), requestId: crypto.randomUUID(), ...(endpoint === 'submit' ? { answers } : { action: semantic }) } };
                record.flight = send(definition.id, pending);
                await record.flight;
                record.flight = undefined;
            }
            finally {
                record.command = false;
            }
        })();
    }
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (!security.canAccessTheory())
                return;
            for (const [id, record] of records.current) {
                if(record.completion)continue;
                const interaction = record.attempt.interaction;
                const due = interaction?.kind === 'timed' && interaction.active && (Date.now() >= interaction.deadline || (interaction.wrongUntil > 0 && Date.now() >= interaction.wrongUntil)) || interaction?.kind === 'gc' && interaction.activeRun && Date.now() >= interaction.activeRun.deadline;
                if (due && !record.flight && !record.pending)
                    action({ id } as QuestionDefinition, { type: 'tick', now: Date.now() });
            }
        }, 250);
        return () => window.clearInterval(timer);
    });
    useEffect(() => () => { for (const timer of timers.current.values())
        window.clearTimeout(timer); }, []);
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
    return <div className="cloud-question cloud-question--joined">{(security.server?.role!=='teacher' || record.status!=='Saved') && <p className="type-caption cloud-status" role="status">{record.status}{record.pending && <button type="button" onClick={() => void questions.flush(definition.id)}>Retry save</button>}</p>}
    {record.loaded ? <fieldset ref={fields} className={'cloud-fields'+(complete?' cloud-fields--complete':'')} disabled={complete || !!record.pending && record.pending.endpoint !== 'draft'} onClickCapture={blockCompleted} onDoubleClickCapture={blockCompleted} onPointerDownCapture={blockCompleted} onPointerMoveCapture={blockCompleted} onPointerUpCapture={blockCompleted} onDragStartCapture={blockCompleted} onKeyDownCapture={event=>{if(event.key!=='Tab')blockCompleted(event);}} onWheelCapture={event=>{if(complete)event.stopPropagation();}} onFocusCapture={event=>{if(complete)(event.target as HTMLElement).blur?.();}}><View attempt={record.attempt} onAction={action => {if(!complete)questions.action(definition, action);}} data={record.data}/></fieldset> : <div className="question-access" role="status">{record.status}<button type="button" onClick={() => void questions.load(definition.id)}>Retry</button></div>}
    {record.loaded && record.completion && security.canAccessTheory() && <CompletionStamp key={definition.id+'-'+record.completion.solvedAt} solvedAt={record.completion.solvedAt} animate={record.completion.animate} preview={security.server?.role==='teacher'} onShown={()=>{if(record.completion)record.completion.animate=false;}}/>}
  </div>;
}
export { request } from './api';
