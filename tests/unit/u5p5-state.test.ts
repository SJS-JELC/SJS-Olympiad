import { transition } from '../fixtures/custom-server';
import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, type Attempt } from '../../src/questions/attempts';
import { gcState, u5p5 } from '../../src/questions/u5p5/definition';
const act = (state: Attempt, action: Parameters<typeof transition>[2]) => transition(u5p5,state,action);
const enter = () => act(emptyAttempt(), { type:'gc-enter',now:0 });
describe('U5P5 retained laboratory and shared marking', () => {
  it('completes one run through deadline reconciliation exactly once and prevents simultaneous starts', () => {
    const started=act(enter(),{type:'gc-run',sample:'mystery',now:100});
    expect(gcState(started).activeRun?.deadline).toBe(6100);
    expect(act(started,{type:'gc-run',sample:'citrus',now:500})).toBe(started);
    expect(act(started,{type:'tick',now:6099})).toBe(started);
    const completed=act(started,{type:'tick',now:8000});
    expect(gcState(completed).analyses).toEqual(['mystery']);
    expect(gcState(completed).activeRun).toBeNull();
    expect(act(completed,{type:'tick',now:15000})).toBe(completed);
    const rerun=act(completed,{type:'gc-run',sample:'mystery',now:15000});
    expect(gcState(act(rerun,{type:'tick',now:21000})).analyses).toEqual(['mystery']);
  });
  it('shares ordinary cooldown/award semantics while allowing laboratory actions during cooldown and after solving', () => {
    const wrong=act(enter(),{type:'submit',now:100});
    expect(wrong.retryAt).toBe(20100);
    expect(act(wrong,{type:'submit',now:1000})).toBe(wrong);
    expect(act(wrong,{type:'edit',field:'composition',value:'[25,14,9,152]',now:1000})).toBe(wrong);
    const running=act(wrong,{type:'gc-run',sample:'citrus',now:1000});
    expect(gcState(running).activeRun?.sample).toBe('citrus');
    const edited=act(running,{type:'edit',field:'composition',value:'[25,14,9,152]',now:20100});
    const solved=act(edited,{type:'submit',now:20100});
    expect(solved.solvedAt).toBe(20100);
    expect(score([u5p5],{U5P5:solved})).toBe(2);
    expect(act(solved,{type:'submit',now:30000})).toBe(solved);
    expect(act(solved,{type:'edit',field:'composition',value:'[50,50,50,50]',now:30000})).toBe(solved);
    expect(gcState(act(solved,{type:'gc-run',sample:'woody',now:30000})).activeRun?.sample).toBe('woody');
  });
  it('records paired areas only for completed samples and replaces/removes notebook entries', () => {
    let s=enter();
    expect(act(s,{type:'gc-record',now:0})).toBe(s);
    s=act(s,{type:'gc-run',sample:'mystery',now:0});
    s=act(s,{type:'gc-run',sample:'citrus',now:6000});
    s=act(s,{type:'tick',now:12000});
    s=act(s,{type:'gc-interval',interval:[3.3,3.5],now:12000});
    s=act(s,{type:'gc-record',now:12000});
    expect(gcState(s).measurements).toHaveLength(1);
    expect(gcState(s).measurements[0].referenceArea).toBeCloseTo(400,0);
    expect(gcState(s).measurements[0].mysteryArea).toBeCloseTo(50,0);
    s=act(s,{type:'gc-record',now:12000});
    expect(gcState(s).measurements).toHaveLength(1);
    expect(gcState(act(s,{type:'gc-remove',accord:'citrus',now:12000})).measurements).toEqual([]);
  });
  it('rejects malformed/negative/unsnapped compositions and no default marker is selected', () => {
    expect(gcState(emptyAttempt()).interval).toEqual([.5,.7]);
    for(const value of ['[]','[25,14,9,153]','[-1,50,50,101]','[25.5,14,9,151.5]','null']) expect(act(enter(),{type:'edit',field:'composition',value,now:0}).answers).toEqual({});
    expect(act(enter(),{type:'submit',now:0}).feedback).toEqual({question:false});
  });
});

it('retains sheet positions, clamps bounds, raises selected sheets and evicts the oldest run',()=>{
 let state=enter();
 for(let id=1;id<=8;id++){
  state=act(state,{type:'gc-run',sample:'mystery',now:id*7000});
  state=act(state,{type:'tick',now:id*7000+6000});
 }
 state=act(state,{type:'gc-result-position',id:1,position:[-1,2],now:63000});
 const moved=gcState(state).results![0];
 expect(moved.position).toEqual([0,1]);expect(moved.layer).toBeGreaterThan(8);
 state=act(state,{type:'gc-result-position',id:2,now:63001});
 expect(gcState(state).results![1].layer).toBeGreaterThan(moved.layer!);
 expect(gcState(state).results![0].position).toEqual([0,1]);
 expect(act(state,{type:'gc-result-position',id:1,position:[NaN,0],now:63002})).toBe(state);
 state=act(state,{type:'gc-run',sample:'citrus',now:64000});
 state=act(state,{type:'tick',now:70000});
 expect(gcState(state).results).toHaveLength(8);
 expect(gcState(state).results!.some(row=>row.id===1)).toBe(false);
});

it('deletes only the selected local report and preserves scoring and the next run id',()=>{
 let state=act(enter(),{type:'gc-run',sample:'mystery',now:0});
 state=act(state,{type:'tick',now:6000});
 state=act(state,{type:'gc-run',sample:'citrus',now:7000});
 state=act(state,{type:'tick',now:13000});
 const next=act(state,{type:'gc-delete-result',id:1,now:13001});
 expect(gcState(next).results!.map(row=>row.id)).toEqual([2]);
 expect(gcState(next).nextRunId).toBe(3);
 expect(next.answers).toEqual(state.answers);
 expect(next.solvedAt).toBe(state.solvedAt);
});
