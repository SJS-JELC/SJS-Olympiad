import { useRef, useState, useEffect } from 'react';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { gcState, u5p5 } from './definition';
import { getComposition, SAMPLE_LABELS } from './model';
import type { GcAction } from './types';
import { sampleColour } from './sampleColour';
import { GcInstrument } from './GcInstrument';
import { Chromatogram } from './Chromatogram';
import { DraggablePrintout } from './DraggablePrintout';
import { FormulationBar } from './FormulationBar';
import './ScentsAndScentsibility.css';
function MysteryBottle() {
  return <svg className="gc-mystery-bottle" viewBox="0 0 220 210" role="img" aria-label="A suspiciously grand mystery perfume bottle">
    <path d="M80 16h60v25H80z" fill="#263743" stroke="#152033" strokeWidth="4" />
    <path d="M94 40h32v20H94z M77 60h66l24 28v100q0 10-10 10H63q-10 0-10-10V88z" fill="#b997da" stroke="#243749" strokeWidth="4" />
    <path d="M61 104h98v82q0 5-5 5H66q-5 0-5-5z" fill="#8651ac" fillOpacity=".7" />
    <path d="M70 78v102" stroke="white" strokeWidth="6" strokeLinecap="round" />
    <rect x="70" y="107" width="80" height="64" rx="4" fill="#fffaf0" stroke="#5b415b" strokeWidth="2" />
    <text x="110" y="134" textAnchor="middle" className="type-heading" fill="#5b415b">?</text>
    <text x="110" y="160" textAnchor="middle" className="type-caption" fill="#5b415b">MYSTERY</text>
  </svg>;
}


export function ScentsAndScentsibility({attempt,onAction}: QuestionViewProps) {
 const state=gcState(attempt), [opened,setOpened]=useState<number|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const send=(action:GcAction)=>onAction(action);
 const result=state.results?.find(row=>row.id===opened);
 useEffect(()=>{if(result && !dialog.current?.open) dialog.current?.showModal();},[result]);
 return <div data-testid="u5p5-content" className="question-content gc-question">
 <section className="question-brief gc-pane">
 {!state.entered ? <div className="gc-briefing"><div>
 <p>You are Chief Chemist at Leatherhead's third-most prestigious perfume house. Mr Sniffington has acquired a rival's bestselling fragrance. He wants a copy. Immediately.</p>
 <p>The mystery perfume contains Citrus, Floral and Woody scents dissolved in ethanol. Each scent is a blend of several substances.</p>
 <p>Use gas chromatography to investigate the ingredients and recreate the perfume's formulation.</p>
 <button className="gc-button gc-button--primary" onClick={()=>send({type:'gc-enter',now:Date.now()})}>Enter Laboratory</button></div><MysteryBottle/></div> :
 <div className="gc-workbench"><div className="gc-sample-bank">{(['mystery','citrus','floral','woody'] as const).map(sample=><div className={'gc-sample gc-sample--'+sample} key={sample}><span className="gc-vial" style={{background: `linear-gradient(to bottom, #364353 0 17%, white 17% 40%, ${sampleColour(sample, sample === 'mystery' ? 100 : state.concentrations?.[sample] ?? 100)} 40%)`}}/><div>{SAMPLE_LABELS[sample]}
 {sample!=='mystery' && <><input aria-label={sample+' concentration'} type="range" min="0" max="100" step="0.5" value={state.concentrations?.[sample]??100} onChange={e=>send({type:'gc-dilute',sample,value:Number(e.target.value),now:Date.now()})}/><small>{state.concentrations?.[sample]??100}% scent / {100-(state.concentrations?.[sample]??100)}% ethanol</small></>}
 </div><button className="gc-button gc-load-button" aria-label={'Add ' + SAMPLE_LABELS[sample] + ' to injector'} title="Add to injector" disabled={!!state.activeRun} onClick={()=>send({type:'gc-load',sample,now:Date.now()})}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div>)}</div>
 <div className="gc-machine"><GcInstrument run={state.activeRun} loaded={state.loaded}/><div className="gc-run-control">{state.loaded || state.activeRun ? <button className="gc-button gc-button--primary" disabled={!!state.activeRun} onClick={()=>state.loaded&&send({type:'gc-run',sample:state.loaded.sample,now:Date.now()})}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1l12 7-12 7z" fill="currentColor"/></svg>{state.activeRun ? 'Running' : 'Run'}</button> : <p className="type-label" role="status">Select a sample from the left to add it to the injector.</p>}</div></div>
 <div className="gc-printouts">{state.results?.map((row,i)=><DraggablePrintout key={row.id} runId={row.id} heading={'RUN ' + row.id + ' / ' + SAMPLE_LABELS[row.sample] + ' / ' + row.concentration + '%'} onDelete={()=>send({type:'gc-delete-result',id:row.id,now:Date.now()})} animate={!row.position} position={row.position ?? [1, .12 + ((row.id - 1) % 8) * .1]} layer={row.layer ?? row.id} angle={[-3,2,-1,4,-2,1,-4,3][i]} onMove={position=>send({type:'gc-result-position',id:row.id,position,now:Date.now()})} onOpen={()=>setOpened(row.id)}><Chromatogram sample={row.sample} concentration={row.concentration} interval={row.interval} compact/></DraggablePrintout>)}</div></div>}
 </section>
 {state.entered&&<QuestionAnswerForm definition={u5p5} attempt={attempt} onAction={onAction} layout="inline">{({disabled,onEdit})=><FormulationBar units={getComposition(attempt.answers)} disabled={disabled} onChange={units=>onEdit('composition',JSON.stringify(units))}/>}</QuestionAnswerForm>}
 {result&&<dialog className="gc-sheet" ref={dialog} onClose={()=>setOpened(null)}><button onClick={()=>dialog.current?.close()}>Close</button><h2>GAS CHROMATOGRAPHY REPORT</h2><p>RUN {result.id} / {SAMPLE_LABELS[result.sample]} / {result.concentration}%</p><Chromatogram sample={result.sample} concentration={result.concentration} interval={result.interval} onInterval={interval=>send({type:'gc-result-interval',id:result.id,interval,now:Date.now()})}/></dialog>}
 </div>;
}
