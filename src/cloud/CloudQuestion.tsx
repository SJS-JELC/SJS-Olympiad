import {presentedDefinition} from '../contracts/presentation';
import { useContentStore } from './useContentStore';
import { useEffect, useLayoutEffect, useReducer, useRef, type SyntheticEvent } from 'react';
import { emptyAttempt, type Answers, type Attempt, type AttemptAction, type QuestionDefinition } from '../questions/attempts';
import type { QuestionEntry } from '../questions/catalog';
import { request, type QuestionHydration, type QuestionState } from './api';
import { useCompetitionSecurity } from '../security';
import './cloud.css';
import {CompletionStamp} from '../components/CompletionStamp';
import { reconcileQuestion } from './question-state';
export { restoredAttempt } from './question-state';
type Pending = {
    endpoint: string;
    body: Record<string, unknown>;
    edits: number;
};
type RecordState = {
    attempt: Attempt;
    revision: number;
    data?: unknown;
    stateLoaded: boolean;
    selectedLoaded?: boolean;
    loadFlight?:{promise:Promise<void>};
    dirty: boolean;
    edits: number;
    status: string;
    pending?: Pending;
    flight?: Promise<boolean>;
    command?: boolean;
    focusTarget?: HTMLElement | null;
    completion?: {solvedAt:number;animate:boolean};
    loadError?: string;
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
/** Answers and presentation edits live only in this mounted router's memory. */
export function useServerQuestions(eventId: string | undefined) {
    const security = useCompetitionSecurity();
    const content = useContentStore(eventId);
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
    const activeContext=useRef(contextKey);activeContext.current=contextKey;
    const selectedAuthority=[eventId,security.server?.competition?.epoch,security.session.status,security.phase,security.canAccessTheory()].join('|');
    const selectedGeneration=useRef(selectedAuthority),selectedRevision=useRef(0);
    if(selectedGeneration.current!==selectedAuthority){
      selectedGeneration.current=selectedAuthority;selectedRevision.current++;
      for(const saved of owner.contexts.values())for(const [id,record] of saved.records)if(['L6P3','U5P5'].includes(id)){record.loadFlight=undefined;record.loadError=undefined;record.selectedLoaded=false;record.data=undefined;if(record.attempt.interaction?.kind==='timed')record.attempt={...record.attempt,interaction:{...record.attempt.interaction,formula:null,revealed:null}};}
    }
    const selectedVersion=selectedRevision.current;
    const stillAuthorized = () => cache.current === owner && activeContext.current===contextKey && selectedRevision.current===selectedVersion;
    const get = (id: string) => {
        let value = current.records.get(id);
        if (!value) {
            value = { attempt: emptyAttempt(), revision: 0, stateLoaded: security.server?.role === 'teacher' && id !== 'U5P5', dirty: false, edits: 0, status: security.server?.role === 'teacher' && id !== 'U5P5' ? 'Saved' : current.error ?? 'Loading saved results...' };
            current.records.set(id, value);
        }
        return value;
    };
    const bodyFor = (id: string) => ({ questionId: id, ...(security.server?.role === 'teacher' ? { eventId } : {}) });
    function accept(id: string, value: QuestionState, edits: number, initial = false, pending?: Pending) {
        const record = get(id);
        const next = reconcileQuestion(!initial && record.stateLoaded ? record : undefined, value, Date.now(), pending?.body.action);
        record.attempt = next.attempt;
        record.completion = next.completion;
        record.revision = value.revision;
        if (value.data !== undefined) record.data = value.data;
        record.stateLoaded = true;
        record.loadError = undefined;
        record.dirty = !record.completion && record.edits !== edits;
        record.status = record.pending ? 'The previous check was not confirmed. Retry to confirm.' : record.dirty ? 'Answer not submitted' : 'Saved';
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
    // GO/resume carries status only. Selected custom state loads under theory gates.
    const initial = security.server?.hydration;
    if (initial && initial.eventId === eventId && !current.hydrated) {
        // Seeding must not call React setters while the router renders.
        current.hydrated = true;
        for (const [id, state] of Object.entries(initial.questions)) {
            const next = reconcileQuestion(undefined, { ...state, serverNow: initial.serverNow }, Date.now());
            current.records.set(id, { ...next, revision: state.revision, data: state.data, stateLoaded: true, dirty: false, edits: 0, status: 'Saved' });
        }
    }
    async function load(id: string) {
        const record=get(id);
        const selected=['L6P3','U5P5'].includes(id);
        if(record.stateLoaded && (!selected || record.selectedLoaded))return;
        if(record.loadFlight)return record.loadFlight.promise;
        const hasAuthority=security.captureAuthority();
        record.loadError=undefined;record.status='Loading saved results...';render();
        // The flight belongs to this authority/context generation. An obsolete
        // finalizer must never clear a replacement read started after recovery.
        const flight={promise:Promise.resolve()};
        record.loadFlight=flight;
        flight.promise=(async()=>{
         try {
          if(!security.canAccessTheory())return;
          if(!record.stateLoaded && security.server?.role!=='teacher' && !current.hydrated){
           if(!current.flight)current.flight=(async()=>{try{const value=await request<QuestionHydration>('hydrate',{});if(stillAuthorized() && hasAuthority() && security.canAccessTheory())hydrate(value);return current.hydrated;}finally{current.flight=undefined;}})();
           await current.flight;
          }
          if((selected && !record.selectedLoaded) || (!record.stateLoaded && security.server?.role==='teacher')){
           const value=await request<QuestionState>('question',bodyFor(id));
           if(!stillAuthorized() || !hasAuthority() || !security.canAccessTheory())return;
           accept(id,value,record.edits,!record.stateLoaded);record.selectedLoaded=true;
          }
         }catch(error){
          if(!stillAuthorized() || !hasAuthority())return;
          security.handleMutationError(error);
          record.loadError=error instanceof Error?error.message:'Unable to load saved results.';
          record.status=record.loadError;render();
         }finally{if(record.loadFlight===flight)record.loadFlight=undefined;if(stillAuthorized())render();}
        })();
        await flight.promise;
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
            if (!hasAuthority() || !security.canAccessTheory()) {record.status='The previous check was not confirmed. Retry to confirm.';render();return false;}
            record.pending = undefined;
            accept(id, value, pending.edits, false, pending);
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
        if (!record.stateLoaded || record.completion) return;
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
                if (record.completion || ['L6P3','U5P5'].includes(id) && !record.selectedLoaded) continue;
                const interaction = record.attempt.interaction;
                const due = interaction?.kind === 'timed' && interaction.active && Date.now() >= interaction.deadline
                    || interaction?.kind === 'gc' && interaction.activeRun && Date.now() >= interaction.activeRun.deadline;
                if (due && !record.flight && !record.pending) action({ id } as QuestionDefinition, { type: 'tick', now: Date.now() });
            }
        }, 250);
        return () => window.clearInterval(timer);
    });
    return { get, load, action, flush, content };
}
export type ServerQuestions = ReturnType<typeof useServerQuestions>;
export function CloudQuestion({ entry, questions }: {
    entry: QuestionEntry;
    questions: ServerQuestions;
}) {
    const { definition, View } = entry, record = questions.get(definition.id),security=useCompetitionSecurity();
    const presentation=questions.content.get('question',definition.id);
    const contentLoaded=!!presentation.value;
    const selectedLoaded=!['L6P3','U5P5'].includes(definition.id) || !!record.selectedLoaded;
    const ready=record.stateLoaded && selectedLoaded && contentLoaded && security.canAccessTheory();
    const loadError=record.loadError ?? presentation?.error;
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
    },[complete,ready]);
    const blockCompleted=(event:SyntheticEvent)=>{if(complete){event.preventDefault();event.stopPropagation();}};
    useEffect(() => { void questions.load(definition.id);void questions.content.load('question',definition.id); }, [definition.id,questions.content,security.session.status,security.server?.competition?.epoch]);
    useEffect(()=>{
      if(record.pending)return;
      const target=record.focusTarget;
      if(target?.isConnected&&!target.matches(':disabled'))target.focus({preventScroll:true});
      record.focusTarget=null;
    },[record.revision,record.pending]);
    return <div className="cloud-question cloud-question--joined">{!ready && !loadError && <div className="cloud-load-progress" role="progressbar" aria-label="Loading question" />} {ready && (security.server?.role!=='teacher' || !['Saved','Answer not submitted'].includes(record.status)) && <p className="type-caption cloud-status" role="status">{record.status}{record.pending && <button type="button" onClick={() => void questions.flush(definition.id)}>Retry save</button>}</p>}
    {ready ? <fieldset ref={fields} className={'cloud-fields'+(complete?' cloud-fields--complete':'')} disabled={complete || !!record.pending} onClickCapture={blockCompleted} onDoubleClickCapture={blockCompleted} onPointerDownCapture={blockCompleted} onPointerMoveCapture={blockCompleted} onPointerUpCapture={blockCompleted} onDragStartCapture={blockCompleted} onKeyDownCapture={event=>{if(event.key!=='Tab')blockCompleted(event);}} onWheelCapture={event=>{if(complete)event.stopPropagation();}} onFocusCapture={event=>{if(complete)(event.target as HTMLElement).blur?.();}}><View attempt={record.attempt} onAction={action => {if(!complete && presentation.value)questions.action(presentedDefinition(definition,presentation.value.record.presentation), action);}} data={record.data} presentation={presentation?.value}/></fieldset> : <>{loadError && <div className="cloud-load-error type-caption" role="alert">{loadError}<button className="ui-button" type="button" onClick={() => {void questions.load(definition.id);void questions.content.load('question',definition.id);}}>Retry</button></div>}</>}
    {ready && record.completion && security.canAccessTheory() && <CompletionStamp key={definition.id+'-'+record.completion.solvedAt} solvedAt={record.completion.solvedAt} animate={record.completion.animate} preview={security.server?.role==='teacher'} onShown={()=>{if(record.completion)record.completion.animate=false;}}/>}
  </div>;
}
export { request } from './api';
