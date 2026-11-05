// @ts-expect-error Node-only authorized scientific fixture.
import {u5p5Presentation} from '../../api/src/presentation/records/u5p5.mjs';
import {presentedDefinition} from '../../src/contracts/presentation';
import {CompetitionSecurityContext} from '../../src/security/CompetitionSecurityProvider';
﻿// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyAttempt, type Attempt, type QuestionDefinition } from '../../src/questions/attempts';
import { type QuestionHydration, type SessionState } from '../../src/cloud/api';
import { gcState, u5p5 } from '../../src/questions/u5p5/definition';
import { useServerQuestions, type ServerQuestions } from '../../src/cloud/CloudQuestion';
import { usePractical } from '../../src/practicals/usePractical';
import {questionCatalog} from '../../src/questions/catalog';
// Node-only independent private protocol fixture.
import {ordinaryDefinitions} from '../../api/src/private/ordinary.mjs';
// @ts-expect-error Node-only independent option fixture.
import {pointGroupOptions} from '../../api/src/private/u6p9.mjs';
const protocolPresentation=(id:string)=>{const source=ordinaryDefinitions.get(id)!;return {renderer:id,title:'Authorized protocol fixture',parts:source.parts.map((part:any)=>({id:part.id,label:part.label,fields:part.fields.map((field:any)=>({id:field.id,label:field.label}))})),options:pointGroupOptions};};

const security = vi.hoisted(() => ({ server: undefined as SessionState | undefined, generation: 0, session:{status:'ACTIVE'},phase:'idle',canAccessTheory: vi.fn(() => true), recordQuestion: vi.fn(), handleMutationError: vi.fn(), captureAuthority: vi.fn<() => (() => boolean)>(() => () => true) }));
vi.mock('../../src/security', () => ({ useCompetitionSecurity: () => security }));
const ordinary: QuestionDefinition = { id: 'L6P8', year: 'L6', number: 8, title: 'Test', points: 3, cooldownMs: 15000, parts: [{ id: 'answer', label: 'Answer', fields: [{ id: 'answer', label: 'Answer' }] }] };
let root: Root, host: HTMLDivElement, questions: ServerQuestions;
function hydration(eventId = 'event', entries: Record<string, Attempt> = { L6P8: emptyAttempt(), L6P6: emptyAttempt() }): QuestionHydration {
  return { eventId, year: 'L6', serverNow: Date.now(), eventEndsAt: Date.now() + 1000000, score: 0, questions: Object.fromEntries(Object.entries(entries).map(([id, attempt]) => [id, { attempt, revision: 0 }])) };
}
function Harness({ eventId }: { eventId: string }) { questions = useServerQuestions(eventId); return null; }
const contentController={getSnapshot:()=>({server:security.server,session:{status:'ACTIVE'},phase:'idle'}),subscribe:()=>()=>{},canAccessTheory:()=>security.canAccessTheory(),canAccessPractical:()=>false,handleMutationError:(error:unknown)=>security.handleMutationError(error)};
async function mount(eventId = 'event') { await act(async () => root.render(createElement(CompetitionSecurityContext.Provider,{value:contentController as any},createElement(Harness, { eventId })))); }
async function run(fn: () => unknown) { await act(async () => { await fn(); }); }
const response = (attempt: Attempt, revision = 1, score = 0) => ({ attempt, revision, score, serverNow: Date.now(), eventEndsAt: Date.now() + 1000000 });
const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  security.server = { role: 'competitor', expiresAt: Date.now() + 1000000, hydration: hydration() } as SessionState;
  security.canAccessTheory.mockReturnValue(true); security.recordQuestion.mockClear(); security.handleMutationError.mockClear();
  security.generation = 0; security.session.status='ACTIVE';
  security.captureAuthority.mockImplementation(() => { const generation = security.generation; return () => security.generation === generation; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await run(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('theory network policy', () => {
  for (const id of ['L6P3','U5P5']) for (const transition of ['recovery','context']) for (const oldOutcome of ['success','423','error']) for (const order of ['old-first','fresh-first']) {
    it(`starts a fresh ${id} selected read across ${transition}, ${oldOutcome}, ${order}`, async () => {
      security.server={...security.server!,role:'teacher',hydration:undefined};
      const held:{resolve:(value:Response)=>void;reject:(error:Error)=>void}[]=[];
      const fetcher=vi.fn(()=>new Promise<Response>((resolve,reject)=>held.push({resolve,reject})));
      vi.stubGlobal('fetch',fetcher);await mount('catalogue-L6');
      let old!:Promise<void>,fresh!:Promise<void>;
      await run(()=>{old=questions.load(id);});
      if(transition==='context'){await mount('other-event');await mount('catalogue-L6');}
      else {security.generation++;security.session.status='LOCKED';security.canAccessTheory.mockReturnValue(false);await mount('catalogue-L6');security.generation++;security.session.status='ACTIVE';security.canAccessTheory.mockReturnValue(true);await mount('catalogue-L6');}
      await run(()=>{fresh=questions.load(id);});
      expect(fetcher).toHaveBeenCalledTimes(2);
      const replacement=questions.get(id).loadFlight;
      const settleOld=async()=>{await run(()=>{if(oldOutcome==='error')held[0].reject(new Error('obsolete transport'));else held[0].resolve(oldOutcome==='423'?new Response(JSON.stringify({error:'obsolete authority'}),{status:423}):reply({...response(emptyAttempt(),1),data:{marker:'obsolete'}}));});await old;};
      const settleFresh=async()=>{await run(()=>held[1].resolve(reply({...response(emptyAttempt(),2),data:{marker:'fresh'}})));await fresh;};
      if(order==='old-first'){await settleOld();expect(questions.get(id).loadFlight).toBe(replacement);await run(()=>{void questions.load(id);});expect(fetcher).toHaveBeenCalledTimes(2);await settleFresh();}
      else {await settleFresh();await settleOld();}
      expect(questions.get(id).selectedLoaded).toBe(true);expect(questions.get(id).data).toEqual({marker:'fresh'});
      expect(questions.get(id).loadError).toBeUndefined();expect(questions.get(id).loadFlight).toBeUndefined();expect(security.handleMutationError).not.toHaveBeenCalled();
    });
  }
  for(const id of ['L6P3','U5P5'])it(`exposes fresh ${id} load failures for Retry after recovery while obsolete read stays held`,async()=>{
    security.server={...security.server!,role:'teacher',hydration:undefined};
    let oldResolve!:(value:Response)=>void;
    const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{oldResolve=resolve;})).mockRejectedValueOnce(new Error('fresh read unavailable')).mockResolvedValue(reply({...response(emptyAttempt()),data:{marker:'retry'}}));
    vi.stubGlobal('fetch',fetcher);await mount();let old!:Promise<void>;await run(()=>{old=questions.load(id);});
    security.generation++;security.canAccessTheory.mockReturnValue(false);await mount();security.generation++;security.canAccessTheory.mockReturnValue(true);await mount();
    await run(()=>questions.load(id));expect(questions.get(id).loadError).toBe('fresh read unavailable');expect(questions.get(id).selectedLoaded).toBeFalsy();
    await run(()=>questions.load(id));expect(questions.get(id).selectedLoaded).toBe(true);expect(questions.get(id).loadError).toBeUndefined();
    await run(()=>oldResolve(reply({...response(emptyAttempt()),data:{marker:'obsolete'}})));await old;
    expect(questions.get(id).data).toEqual({marker:'retry'});expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('edits genuine protected IDs through positional validators and retries the original private protocol payload', async () => {
    security.server={...security.server!,role:'teacher',hydration:undefined};
    const requests:unknown[]=[];
    const fetcher=vi.fn(async(_url:string,options:RequestInit)=>{requests.push(JSON.parse(options.body as string));if(requests.length===1)throw new Error('Lost response');return reply(response({...emptyAttempt(),feedback:{HOMO:false},retryAt:Date.now()+30000}));});
    vi.stubGlobal('fetch',fetcher);await mount('catalogue-L5');
    for(const [id,value,invalid]of [['L5P5','12','123'],['L5P6','CH3S','1234567890123'],['L5P7','4','1234'],['L6P4','1','3'],['U6P8','55.5','invalid'],['U6P9',pointGroupOptions[0],'invented option']]){
      const neutral=questionCatalog.find(entry=>entry.definition.id===id)!.definition;
      const definition=presentedDefinition(neutral,protocolPresentation(id));
      expect(definition.parts[0].fields[0].id).not.toBe(neutral.parts[0].fields[0].id);
      for(const field of definition.parts.flatMap(part=>part.fields)){
        await run(()=>questions.action(definition,{type:'edit',field:field.id,value,now:Date.now()}));
        expect(questions.get(id).attempt.answers[field.id]).toBe(value);
        await run(()=>questions.action(definition,{type:'edit',field:field.id,value:invalid,now:Date.now()}));
        expect(questions.get(id).attempt.answers[field.id]).toBe(value);
      }
    }
    const definition=presentedDefinition(questionCatalog.find(entry=>entry.definition.id==='L6P4')!.definition,protocolPresentation('L6P4'));
    await run(()=>questions.action(definition,{type:'submit',now:Date.now()}));
    const frozen=structuredClone(requests[0]);expect(questions.get('L6P4').pending).toBeDefined();
    await run(()=>questions.action(definition,{type:'edit',field:'HOMO1',value:'2',now:Date.now()}));
    await run(()=>questions.flush('L6P4'));
    expect(requests[1]).toEqual(frozen);expect((requests[1] as any).answers).toHaveProperty('HOMO1','1');
    expect(questions.get('L6P4').attempt.answers.HOMO1).toBe('2');
  });
  it('clears selected scientific data on theory closure and event replacement, preserving page working and fencing late reads', async () => {
    security.server={...security.server!,role:'teacher',hydration:undefined};
    const selected={...emptyAttempt(),interaction:{...gcState(emptyAttempt(),u5p5Presentation.presentation),entered:true}};
    let respond!:(value:Response)=>void;
    const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{respond=resolve;}));vi.stubGlobal('fetch',fetcher);
    await mount('catalogue-U5');
    let flight!:Promise<void>;await run(()=>{flight=questions.load('U5P5');});
    await mount('other-event');await mount('catalogue-U5');
    await run(()=>respond(reply({...response(selected),data:{gcTraces:{citrus:[{time:0,response:7.5}]}}})));await flight;
    expect(questions.get('U5P5').data).toBeUndefined();expect(questions.get('U5P5').selectedLoaded).toBeFalsy();
    fetcher.mockImplementation(async()=>reply({...response(selected),data:{gcTraces:{citrus:[{time:0,response:7.5}]}}}));
    await run(()=>questions.load('U5P5'));
    const definition=presentedDefinition(u5p5,u5p5Presentation.presentation);
    await run(()=>questions.action(definition,{type:'gc-enter',now:Date.now()}));
    await run(()=>questions.action(definition,{type:'edit',field:'composition',value:'[25,14,9,152]',now:Date.now()}));
    expect(questions.get('U5P5').data).toBeDefined();
    security.canAccessTheory.mockReturnValue(false);await mount('catalogue-U5');
    expect(questions.get('U5P5').data).toBeUndefined();expect(questions.get('U5P5').selectedLoaded).toBe(false);
    expect(questions.get('U5P5').attempt.answers.composition).toBe('[25,14,9,152]');
    security.canAccessTheory.mockReturnValue(true);await mount('catalogue-U5');await run(()=>questions.load('U5P5'));
    expect(questions.get('U5P5').data).toBeDefined();
    await mount('other-event');expect(questions.get('U5P5').data).toBeUndefined();
    await mount('catalogue-U5');expect(questions.get('U5P5').data).toBeUndefined();
    expect(questions.get('U5P5').attempt.answers.composition).toBe('[25,14,9,152]');
  });
  it('uses GO bulk state for opening, editing, navigation and 15 seconds of local time with zero requests', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); await mount();
    await run(() => questions.load('L6P8')); await run(() => questions.load('L6P6'));
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: '0.437', now: Date.now() }));
    await run(() => questions.flush()); await run(() => vi.advanceTimersByTimeAsync(16000));
    expect(questions.get('L6P8').attempt.answers.answer).toBe('0.437'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('CHECK makes one direct submit and uncertain retries keep the frozen request ID and answers', async () => {
    const bodies: unknown[] = [];
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => { bodies.push(JSON.parse(options.body as string)); if (bodies.length === 1) throw new Error('Response lost'); return reply(response({ ...emptyAttempt(), answers: { answer: '0.437' }, solvedAt: Date.now() }, 1, 3)); });
    vi.stubGlobal('fetch', fetcher); await mount();
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: '0.437', now: Date.now() }));
    await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() }));
    expect(fetcher).toHaveBeenCalledTimes(1); expect(String(fetcher.mock.calls[0][0])).toMatch(/\/submit$/); expect(questions.get('L6P8').completion).toBeUndefined(); expect(security.recordQuestion).not.toHaveBeenCalled();
    expect(await questions.flush()).toBe(true); // navigation does not retry or block
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: 'different', now: Date.now() }));
    await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() })); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => questions.flush('L6P8'));
    expect(fetcher).toHaveBeenCalledTimes(2); expect(bodies[1]).toEqual(bodies[0]); expect(questions.get('L6P8').completion?.solvedAt).toBe(Date.now());
  });
  it('starts ordinary teacher contexts blank without reads, retains unfinished edits on return and clears all contexts on auth change', async () => {
    security.server = { ...security.server!, role: 'teacher', hydration: undefined };
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => reply(hydration(JSON.parse(options.body as string).eventId)));
    vi.stubGlobal('fetch', fetcher); await mount('catalogue-L6'); await run(() => questions.load('L6P8'));
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: 'unfinished', now: Date.now() }));
    await mount('catalogue-U6'); await run(() => questions.load('L6P8')); await mount('catalogue-L6'); await run(() => questions.load('L6P8'));
    expect(fetcher).not.toHaveBeenCalled(); expect(questions.get('L6P8').attempt.answers.answer).toBe('unfinished');
    security.server = { ...security.server!, expiresAt: security.server!.expiresAt + 1 }; await mount('catalogue-L6'); await run(() => questions.load('L6P8'));
    expect(fetcher).not.toHaveBeenCalled(); expect(questions.get('L6P8').attempt.answers.answer).toBeUndefined();
    fetcher.mockImplementation(async()=>reply(response(emptyAttempt())));
    await run(()=>questions.load('U5P5'));await run(()=>questions.load('U5P5'));expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('loses unfinished edits on router reload while restoring confirmed completion from hydration', async () => {
    vi.stubGlobal('fetch', vi.fn()); await mount(); await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: 'unfinished', now: Date.now() }));
    await run(() => root.unmount()); root = createRoot(host); await mount(); expect(questions.get('L6P8').attempt.answers.answer).toBeUndefined();
    await run(() => root.unmount()); root = createRoot(host);
    security.server = { ...security.server!, hydration: hydration('event', { L6P8: { ...emptyAttempt(), answers: { answer: '0.437' }, solvedAt: Date.now() - 1000 } }) };
    await mount(); expect(questions.get('L6P8').completion).toEqual({ solvedAt: Date.now() - 1000, animate: false });
  });
  it('ignores a delayed authorization failure from an old authentication identity', async () => {
    let respond!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { respond = resolve; })));
    await mount(); await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() }));
    security.server = { ...security.server!, expiresAt: security.server!.expiresAt + 1 };
    await mount();
    await run(() => respond(new Response(JSON.stringify({ error: 'Old session expired' }), { status: 401 })));
    expect(security.handleMutationError).not.toHaveBeenCalled();
    expect(questions.get('L6P8').pending).toBeUndefined();
    expect(questions.get('L6P8').status).toBe('Saved');
  });
  it('fences a successful old response after authority changes, retaining a frozen retry without restoring protected state',async()=>{
    let respond!:(value:Response)=>void;
    vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{respond=resolve;})));
    await mount();await run(()=>questions.action(ordinary,{type:'submit',now:Date.now()}));
    const pending=questions.get('L6P8').pending;security.generation++;
    await run(()=>respond(reply(response({...emptyAttempt(),solvedAt:Date.now()}))));
    expect(questions.get('L6P8').completion).toBeUndefined();expect(questions.get('L6P8').pending).toBe(pending);expect(security.recordQuestion).not.toHaveBeenCalled();
  });
  it('does not relock a recovered authority generation after a delayed old 423, retaining the frozen retry', async () => {
    let respond!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { respond = resolve; })));
    await mount(); await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() }));
    const pending = questions.get('L6P8').pending;
    security.generation++;
    await run(() => respond(new Response(JSON.stringify({ error: 'Old breach response' }), { status: 423 })));
    expect(security.handleMutationError).not.toHaveBeenCalled();
    expect(questions.get('L6P8').pending).toBe(pending);
    expect(questions.get('L6P8').status).toContain('Not saved');
  });
  it('keeps GC setup and report edits local, sends captured load once, then reconciles its deadline once', async () => {
    const lab = { ...gcState(emptyAttempt(),u5p5Presentation.presentation), entered: false };
    security.server = { ...security.server!, hydration: hydration('event', { U5P5: emptyAttempt() }) };
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      if(_url.endsWith('/question'))return reply(response({...emptyAttempt(),interaction:lab}));
      const { action } = JSON.parse(options.body as string);
      if (!action) return reply(response({ ...emptyAttempt(), solvedAt: Date.now(), interaction: { ...lab, entered: true, results: [{ id: 1, sample: 'citrus', concentration: 20, interval: [0, 1] }] } }));
      return reply({...response({ ...emptyAttempt(), interaction: { ...lab, entered: true, nextRunId: 2, activeRun: action.type === 'gc-run' ? { id: 1, sample: action.sample, concentration: action.concentration, startedAt: Date.now(), deadline: Date.now() + 4000 } : null, results: [] } }),...(action.type==='tick'?{gcCompletedRunId:1}:{})});
    });
    vi.stubGlobal('fetch', fetcher); await mount();await run(()=>questions.load('U5P5'));expect(fetcher).toHaveBeenCalledTimes(1);fetcher.mockClear();
    await run(() => questions.action(presentedDefinition(u5p5,u5p5Presentation.presentation), { type: 'gc-enter', now: Date.now() }));
    await run(() => questions.action(presentedDefinition(u5p5,u5p5Presentation.presentation), { type: 'gc-load', sample: 'citrus', concentration: 20, now: Date.now() }));
    await run(() => questions.action(presentedDefinition(u5p5,u5p5Presentation.presentation), { type: 'gc-dilute', sample: 'citrus', value: 30, now: Date.now() })); expect(fetcher).not.toHaveBeenCalled();
    await run(() => questions.action(presentedDefinition(u5p5,u5p5Presentation.presentation), { type: 'gc-run', sample: 'citrus', now: Date.now() }));
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string).action).toEqual({ type: 'gc-run', sample: 'citrus', concentration: 20 });
    expect(gcState(questions.get('U5P5').attempt).concentrations?.citrus).toBe(30);
    await run(() => vi.advanceTimersByTimeAsync(4250)); expect(fetcher).toHaveBeenCalledTimes(2); expect(gcState(questions.get('U5P5').attempt).results).toHaveLength(1);
    await run(() => questions.action(presentedDefinition(u5p5,u5p5Presentation.presentation), { type: 'gc-delete-result', id: 1, now: Date.now() })); expect(fetcher).toHaveBeenCalledTimes(2);
    await run(() => questions.action(presentedDefinition(u5p5,u5p5Presentation.presentation), { type: 'submit', now: Date.now() }));
    expect(questions.get('U5P5').completion).toBeDefined(); expect(gcState(questions.get('U5P5').attempt).results).toHaveLength(0);
  });
  it('clears a timed wrong flash locally without a request, and reconciles the actual deadline once', async () => {
    const active:Attempt={...emptyAttempt(),interaction:{kind:'timed',formula:'SO4',step:0,deadline:Date.now()+75000,active:true,wrongUntil:Date.now()+500,revealed:null}};
    security.server = { ...security.server!, hydration: hydration('event', { L6P3: emptyAttempt() }) };
    const fetcher = vi.fn(async (url:string) => url.endsWith('/question')?reply(response(active)):reply(response({ ...emptyAttempt(), interaction: { kind: 'timed', formula: 'SO4', step: 0, deadline: Date.now(), active: false, wrongUntil: 0, revealed: 'sulfate' } })));
    vi.stubGlobal('fetch', fetcher); await mount();await run(()=>questions.load('L6P3'));expect(fetcher).toHaveBeenCalledTimes(1);fetcher.mockClear(); await run(() => vi.advanceTimersByTimeAsync(1000)); expect(fetcher).not.toHaveBeenCalled();
    await run(() => vi.advanceTimersByTimeAsync(75000)); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => vi.advanceTimersByTimeAsync(1000)); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('practical network policy', () => {
  it('retains one read and one 500ms autosave with local access checks and no preflight', async () => {
    let practical: ReturnType<typeof usePractical>;
    const canAccess = vi.fn(() => true), canEdit = vi.fn(() => true), failure = vi.fn();
    const view = { year: 'L6', revision: 0, responses: {}, finalField: 'numPracticalResponse4', updatedAt: null, serverNow: Date.now(), eventEndsAt: Date.now() + 1000000, readOnly: false };
    const fetcher = vi.fn(async (url: string) => reply({ ...view, revision: url.endsWith('practical-save') ? 1 : 0 })); vi.stubGlobal('fetch', fetcher);
    function PracticalHarness() { practical = usePractical('event', canAccess, canEdit, failure); return null; }
    await run(() => root.render(createElement(PracticalHarness))); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => practical.edit('numPracticalResponse3', '0.2500')); await run(() => vi.advanceTimersByTimeAsync(499)); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => vi.advanceTimersByTimeAsync(1)); expect(fetcher).toHaveBeenCalledTimes(2); expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/olympiad/practical', '/api/olympiad/practical-save']);
  });
});
