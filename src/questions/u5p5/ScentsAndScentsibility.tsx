import {requirePresentation,presentedDefinition} from '../../contracts/presentation';
import type {GcPresentation} from './presentation';
import {BottleDiagram} from './BottleDiagram';
import { useRef, useState, useEffect } from 'react';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { gcState, u5p5 } from './definition';
import { getComposition, integrate } from './model';
import type { TraceDataset } from './model';
import type { AccordId, GcAction } from './types';
import { sampleColour } from './sampleColour';
import { RunGraphic } from './GcInstrument';
import { TraceChart } from './Chromatogram';
import { DraggablePrintout } from './DraggablePrintout';
import { FormulationBar } from './FormulationBar';
import { IllustratedActionButton } from '../../components/IllustratedActionButton';
import './ScentsAndScentsibility.css';


export function ScentsAndScentsibility({attempt,onAction,data,presentation}: QuestionViewProps) {
 const {record:{presentation:content}}=requirePresentation<GcPresentation>(presentation,'U5P5');
 const traces = (data as {gcTraces?:TraceDataset} | undefined)?.gcTraces ?? {};
 const state=gcState(attempt,content), [opened,setOpened]=useState<number|null>(null);
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
 <p>{content.paragraphs[0]}</p>
 <p>{content.paragraphs[1]}</p>
 <p>{content.paragraphs[2]}</p>
 <IllustratedActionButton className="gc-enter-action" label={content.words.enter} icon="arrow" tone="lilac" wide onClick={()=>send({type:'gc-enter',now:Date.now()})}/></div><BottleDiagram node={content.bottle}/></div> :
 <div className="gc-workbench"><div className="gc-sample-bank">{content.samples.map(sample=><div className={'gc-sample gc-sample--'+sample} key={sample}><span className="gc-vial" style={{background: `linear-gradient(to bottom, #364353 0 17%, white 17% 40%, ${sampleColour(content.sampleColours[sample], content.dilutableSamples.includes(sample) ? state.concentrations?.[sample as AccordId] ?? content.dilution.default : content.dilution.default)} 40%)`}}/><div><span className="gc-sample-name type-body">{content.sampleLabels[sample]}</span>
 {content.dilutableSamples.includes(sample) && <><input aria-label={content.concentrationLabels[sample]} type="range" min={content.dilution.min} max={content.dilution.max} step={content.dilution.step} value={state.concentrations?.[sample as AccordId]??content.dilution.default} onChange={e=>send({type:'gc-dilute',sample:sample as AccordId,value:Number(e.target.value),now:Date.now()})}/><small>{state.concentrations?.[sample as AccordId]??content.dilution.default}{content.words.scent}{content.dilution.max-(state.concentrations?.[sample as AccordId]??content.dilution.default)}{content.words.ethanol}</small></>}
 </div><button className="ui-button gc-load-button type-heading" aria-label={content.words.add + content.sampleLabels[sample] + content.words.addSuffix} title={content.words.addTitle} disabled={!!state.activeRun} onClick={()=>send({type:'gc-load',sample,concentration:content.dilutableSamples.includes(sample)?state.concentrations?.[sample as AccordId]??content.dilution.default:content.dilution.default,now:Date.now()})}>+</button></div>)}</div>
 <div className="gc-machine"><RunGraphic content={content} run={state.activeRun} loaded={state.loaded}/><div className="gc-run-control">{state.loaded || state.activeRun ? <IllustratedActionButton label={state.activeRun ? content.words.running : content.words.run} icon="arrow" tone="lilac" disabled={!!state.activeRun} onClick={()=>state.loaded&&send({type:'gc-run',sample:state.loaded.sample,now:Date.now()})}/> : <p className="type-label" role="status">{content.words.loadPrompt}</p>}</div></div>
 <div className="gc-printouts">{state.results?.map((row,i)=><DraggablePrintout key={row.id} runId={row.id} heading={content.words.runPrefix + row.id + ' / ' + content.sampleLabels[row.sample] + ' / ' + row.concentration + '%'} onDelete={()=>send({type:'gc-delete-result',id:row.id,now:Date.now()})} animate={!row.position} position={row.position ?? [1, .12 + ((row.id - 1) % 8) * .1]} layer={row.layer ?? row.id} angle={[-3,2,-1,4,-2,1,-4,3][i]} onMove={position=>send({type:'gc-result-position',id:row.id,position,now:Date.now()})} onOpen={()=>openReport(row.id)}><TraceChart content={content} traces={traces} sample={row.sample} concentration={row.concentration} interval={row.interval} compact/></DraggablePrintout>)}</div></div>}
 </section>
 {state.entered&&<QuestionAnswerForm definition={presentedDefinition(u5p5,content)} attempt={attempt} onAction={onAction} layout="inline">{({disabled,onEdit})=><FormulationBar content={content} units={getComposition(attempt.answers,content.initialComposition)} disabled={disabled} onChange={units=>onEdit('composition',JSON.stringify(units))}/>}</QuestionAnswerForm>}
 {result&&<dialog className="gc-sheet" aria-labelledby="gc-report-title" ref={dialog} onClose={closeReport}><button type="button" className="ui-button gc-sheet-close type-heading" aria-label="Close" title="Close report" onClick={()=>dialog.current?.close()}>X</button><header className="gc-report-header"><div><h2 id="gc-report-title">{content.words.reportTitle}</h2><p>{content.words.runPrefix}{result.id} / {content.sampleLabels[result.sample]} / {result.concentration}%</p></div><figure className="gc-area-readout"><figcaption><span className="type-label">{content.words.area}</span><strong className="type-heading">{(integrate(result.sample,result.interval,traces)*result.concentration/100).toFixed(1)}</strong></figcaption></figure></header><TraceChart content={content} traces={traces} sample={result.sample} concentration={result.concentration} interval={result.interval} onInterval={interval=>send({type:'gc-result-interval',id:result.id,interval,now:Date.now()})}/></dialog>}
 </div>;
}
