import { useRef, useState, useEffect } from 'react';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { gcState, u5p5 } from './definition';
import { getComposition, integrate, SAMPLE_LABELS } from './model';
import type { TraceDataset } from './model';
import type { GcAction } from './types';
import { sampleColour } from './sampleColour';
import { GcInstrument } from './GcInstrument';
import { Chromatogram } from './Chromatogram';
import { DraggablePrintout } from './DraggablePrintout';
import { FormulationBar } from './FormulationBar';
import { IllustratedActionButton } from '../../components/IllustratedActionButton';
import './ScentsAndScentsibility.css';
function MysteryBottle() {
  return <svg className="gc-mystery-bottle" viewBox="0 0 220 210" role="img" aria-label="A suspiciously grand mystery perfume bottle">
    <path d="M80 16h60v25H80z" fill="#263743" stroke="#152033" strokeWidth="4" />
    <path d="M94 40h32v20H94z M77 60h66l24 28v100q0 10-10 10H63q-10 0-10-10V88z" fill="#994cd2" stroke="#243749" strokeWidth="4" />
    <path d="M61 104h98v82q0 5-5 5H66q-5 0-5-5z" fill="#8651ac" fillOpacity=".7" />
    <path d="M70 78v102" stroke="white" strokeWidth="6" strokeLinecap="round" />
    <rect x="70" y="107" width="80" height="74" rx="4" fill="#fffaf0" stroke="#5b415b" strokeWidth="2" />
    <text x="110" y="146" textAnchor="middle" className="type-heading" fill="#5b415b">?</text>
    <text x="110" y="171" textAnchor="middle" className="type-caption" fill="#5b415b">MYSTERY</text>
  </svg>;
}


export function ScentsAndScentsibility({attempt,onAction,data}: QuestionViewProps) {
 const traces = (data as {gcTraces?:TraceDataset} | undefined)?.gcTraces ?? {};
 const state=gcState(attempt), [opened,setOpened]=useState<number|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const reportTrigger=useRef<HTMLElement|null>(null);
 const openReport=(id:number)=>{reportTrigger.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;setOpened(id);};
 const closeReport=()=>{setOpened(null);reportTrigger.current?.focus({preventScroll:true});};
 const send=(action:GcAction)=>onAction(action);
 const result=state.results?.find(row=>row.id===opened);
 useEffect(()=>{if(result && !dialog.current?.open) dialog.current?.showModal();},[result]);
 return <div data-testid="u5p5-content" className="question-content gc-question">
 <section className={'question-brief gc-pane' + (!state.entered ? ' gc-pane--intro' : '')}>
 {!state.entered ? <div className="gc-briefing"><div>
 <p>You are Chief Chemist at Leatherhead's third-most prestigious perfume house. Your boss, Mr Sniffington has acquired a rival's bestselling fragrance. He wants a copy. Immediately.</p>
 <p>The mystery perfume contains Citrus, Floral and Woody scents dissolved in ethanol. Each scent is a blend of several substances.</p>
 <p>Use gas chromatography to investigate the ingredients and recreate the perfume's formulation.</p>
 <IllustratedActionButton className="gc-enter-action" label="Enter Laboratory" icon="arrow" tone="lilac" wide onClick={()=>send({type:'gc-enter',now:Date.now()})}/></div><MysteryBottle/></div> :
 <div className="gc-workbench"><div className="gc-sample-bank">{(['mystery','citrus','floral','woody'] as const).map(sample=><div className={'gc-sample gc-sample--'+sample} key={sample}><span className="gc-vial" style={{background: `linear-gradient(to bottom, #364353 0 17%, white 17% 40%, ${sampleColour(sample, sample === 'mystery' ? 100 : state.concentrations?.[sample] ?? 100)} 40%)`}}/><div><span className="gc-sample-name type-body">{SAMPLE_LABELS[sample]}</span>
 {sample!=='mystery' && <><input aria-label={sample+' concentration'} type="range" min="0" max="100" step="0.5" value={state.concentrations?.[sample]??100} onChange={e=>send({type:'gc-dilute',sample,value:Number(e.target.value),now:Date.now()})}/><small>{state.concentrations?.[sample]??100}% scent / {100-(state.concentrations?.[sample]??100)}% ethanol</small></>}
 </div><button className="ui-button gc-load-button type-heading" aria-label={'Add ' + SAMPLE_LABELS[sample] + ' to injector'} title="Add to injector" disabled={!!state.activeRun} onClick={()=>send({type:'gc-load',sample,concentration:sample==='mystery'?100:state.concentrations?.[sample]??100,now:Date.now()})}>+</button></div>)}</div>
 <div className="gc-machine"><GcInstrument run={state.activeRun} loaded={state.loaded}/><div className="gc-run-control">{state.loaded || state.activeRun ? <IllustratedActionButton label={state.activeRun ? 'Running' : 'Run'} icon="arrow" tone="lilac" disabled={!!state.activeRun} onClick={()=>state.loaded&&send({type:'gc-run',sample:state.loaded.sample,now:Date.now()})}/> : <p className="type-label" role="status">Select a sample above to add it to the injector.</p>}</div></div>
 <div className="gc-printouts">{state.results?.map((row,i)=><DraggablePrintout key={row.id} runId={row.id} heading={'RUN ' + row.id + ' / ' + SAMPLE_LABELS[row.sample] + ' / ' + row.concentration + '%'} onDelete={()=>send({type:'gc-delete-result',id:row.id,now:Date.now()})} animate={!row.position} position={row.position ?? [1, .12 + ((row.id - 1) % 8) * .1]} layer={row.layer ?? row.id} angle={[-3,2,-1,4,-2,1,-4,3][i]} onMove={position=>send({type:'gc-result-position',id:row.id,position,now:Date.now()})} onOpen={()=>openReport(row.id)}><Chromatogram traces={traces} sample={row.sample} concentration={row.concentration} interval={row.interval} compact/></DraggablePrintout>)}</div></div>}
 </section>
 {state.entered&&<QuestionAnswerForm definition={u5p5} attempt={attempt} onAction={onAction} layout="inline">{({disabled,onEdit})=><FormulationBar units={getComposition(attempt.answers)} disabled={disabled} onChange={units=>onEdit('composition',JSON.stringify(units))}/>}</QuestionAnswerForm>}
 {result&&<dialog className="gc-sheet" aria-labelledby="gc-report-title" ref={dialog} onClose={closeReport}><button type="button" className="ui-button gc-sheet-close type-heading" aria-label="Close" title="Close report" onClick={()=>dialog.current?.close()}>X</button><header className="gc-report-header"><div><h2 id="gc-report-title">GAS CHROMATOGRAPHY REPORT</h2><p>RUN {result.id} / {SAMPLE_LABELS[result.sample]} / {result.concentration}%</p></div><figure className="gc-area-readout"><figcaption><span className="type-label">AREA UNDER PEAK</span><strong className="type-heading">{(integrate(result.sample,result.interval,traces)*result.concentration/100).toFixed(1)}</strong></figcaption></figure></header><Chromatogram traces={traces} sample={result.sample} concentration={result.concentration} interval={result.interval} onInterval={interval=>send({type:'gc-result-interval',id:result.id,interval,now:Date.now()})}/></dialog>}
 </div>;
}
