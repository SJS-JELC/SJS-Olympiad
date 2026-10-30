import { randomInt } from 'node:crypto';
import { oxyanions } from './private-oxyanions.mjs';
import { getTrace, integrate, isCorrectComposition, RUN_MS, TIME_MAX } from './private-gc.mjs';

const groups = {
  L5P9: { year:'L5', points:3, cooldownMs:30000, items:['ZnO2','TiO2','Fe3O4','MgO2','Al2O3','V6O13','Na2O2','MgO','Ti4O7'], key:[['ZnO2','MgO2','Na2O2'],['Fe3O4','V6O13','Ti4O7'],['TiO2','Al2O3','MgO']] },
  L6P1: { year:'L6', points:1, cooldownMs:20000, items:['Ta','S','As','Cu','V','Zr','F','Th','Na'], key:[['S','Zr','Th'],['Cu','Na','F'],['V','As','Ta']] },
};
const accords = ['citrus','floral','woody'], samples = [...accords,'mystery'];
export function customInfo(id) {
  const info = (Object.hasOwn(groups,id) ? groups[id] : null) ?? (id === 'L6P3' ? {year:'L6',points:1,cooldownMs:20000} : id === 'U5P5' ? {year:'U5',points:2,cooldownMs:20000} : null);
  return info ? {id,year:info.year,points:info.points,cooldownMs:info.cooldownMs} : null;
}
export function matchesGroups(selected, items, key) {
  if (!Array.isArray(selected) || selected.length !== 9 || new Set(selected).size !== 9 || selected.some(item=>!items.includes(item))) return false;
  const actual = [selected.slice(0,3),selected.slice(3,6),selected.slice(6,9)];
  return key.every(expected=>actual.some(group=>expected.every(item=>group.includes(item))));
}
export function selectRun() {
  const pool=oxyanions.filter(row=>row.row>=16&&row.row<=60), final=oxyanions.filter(row=>row.row>=2&&row.row<=15);
  return [...Array.from({length:4},()=>pool.splice(randomInt(pool.length),1)[0]),final[randomInt(final.length)]];
}
export const normalizeName = value => typeof value==='string' ? value.trim().toLowerCase().replace(/ /g,'') : '';
const empty = () => ({answers:{},feedback:{},retryAt:0,solvedAt:null});
const initialGc = () => ({kind:'gc',entered:false,activeRun:null,nextRunId:1,analyses:[],reference:'citrus',interval:[.5,.7],measurements:[],results:[]});
const interval = value => Array.isArray(value)&&value.length===2&&value.every(Number.isFinite) ? [Math.max(0,Math.min(TIME_MAX,Math.min(...value))),Math.max(0,Math.min(TIME_MAX,Math.max(...value)))] : null;

export function reduceCustomQuestion(id, previous, action, now) {
  if (!customInfo(id)) return null;
  let state=previous?.state??empty(), privateState=previous?.privateState??{};
  const wasSolved=state.solvedAt!==null;
  const finish=()=>({state,privateState,award:!wasSolved&&state.solvedAt!==null});
  if (Object.hasOwn(groups,id)) {
    const info=groups[id], selected=state.interaction?.kind==='grouping'?state.interaction.selected:[];
    if (action.type==='reset') { state={...state,interaction:{kind:'grouping',selected:[]}}; return finish(); }
    if (wasSolved||now<state.retryAt) return finish();
    if (action.type==='select'&&info.items.includes(action.item)&&!selected.includes(action.item)&&selected.length<9) state={...state,interaction:{kind:'grouping',selected:[...selected,action.item]}};
    if (action.type==='submit') {
      const submitted=action.answers?.groups;
      const selection=typeof submitted==='string'?submitted.split(','):selected;
      if (selection.length!==9) return finish();
      const correct=matchesGroups(selection,info.items,info.key);
      state={...state,interaction:{kind:'grouping',selected:selection},feedback:{question:correct},retryAt:correct?0:now+info.cooldownMs,solvedAt:correct?now:null};
    }
    return finish();
  }
  if (id==='L6P3') {
    if (wasSolved) return finish();
    let run=state.interaction?.kind==='timed'?state.interaction:null;
    if (run?.active&&now>=run.deadline) {
      state={...state,answers:{},feedback:{},retryAt:run.deadline+20000,interaction:{...run,active:false,formula:null,wrongUntil:0,revealed:privateState.run?.[run.step]?.name??null}};
      // A late submit cannot become a new run or advance the expired prompt.
      return finish();
    }
    if (action.type==='start'&&!run?.active&&now>=state.retryAt) {
      const sequence=selectRun(); privateState={run:sequence};
      state={...state,answers:{},feedback:{},retryAt:0,interaction:{kind:'timed',formula:sequence[0].formula,step:0,deadline:now+75000,active:true,wrongUntil:0,revealed:null}};
      return finish();
    }
    if (!run?.active) return finish();
    if (action.type==='tick'&&run.wrongUntil>0&&now>=run.wrongUntil) state={...state,interaction:{...run,wrongUntil:0}};
    if (action.type==='submit') {
      const answer=action.answers?.answer??state.answers.answer??'';
      const expected=privateState.run?.[run.step]?.name;
      if (!expected || normalizeName(answer)!==normalizeName(expected)) state={...state,answers:{answer},interaction:{...run,wrongUntil:now+500}};
      else {
        const step=run.step+1, solved=step===5;
        state={...state,answers:{},feedback:{},solvedAt:solved?now:null,interaction:{...run,step,formula:solved?null:privateState.run[step].formula,active:!solved,wrongUntil:0,revealed:null}};
      }
    }
    return finish();
  }
  let lab=state.interaction?.kind==='gc'?state.interaction:initialGc();
  if (lab.activeRun&&now>=lab.activeRun.deadline) {
    const {id:runId,sample,concentration}=lab.activeRun;
    lab={...lab,activeRun:null,loaded:null,results:[...(lab.results??[]),{id:runId,sample,concentration,interval:[0,0]}].slice(-8),analyses:[...new Set([...lab.analyses,sample])]};
  }
  const save=next=>{lab=next;};
  switch(action.type) {
    case 'gc-enter': save({...lab,entered:true}); break;
    case 'gc-dilute': if(accords.includes(action.sample)&&Number.isFinite(action.value)) save({...lab,concentrations:{...lab.concentrations,[action.sample]:Math.max(0,Math.min(100,Math.round(action.value*2)/2))}}); break;
    case 'gc-load': {
      // Loading captures the chosen dilution when clicked, even if newer drafts save first.
      // Dilution is learner-controlled experimental input; IDs and deadlines remain server-owned.
      const concentration=action.sample==='mystery'?100:action.concentration??lab.concentrations?.[action.sample]??100;
      if(!lab.activeRun&&samples.includes(action.sample)&&Number.isFinite(concentration)&&concentration>=0&&concentration<=100&&Number.isInteger(concentration*2)) save({...lab,loaded:{sample:action.sample,concentration}});
      break;
    }
    case 'gc-run': if(lab.entered&&!lab.activeRun&&lab.loaded&&samples.includes(lab.loaded.sample)) save({...lab,activeRun:{id:lab.nextRunId,...lab.loaded,startedAt:now,deadline:now+RUN_MS},nextRunId:lab.nextRunId+1}); break;
    case 'gc-delete-result': save({...lab,results:lab.results?.filter(row=>row.id!==action.id)}); break;
    case 'gc-result-position': {
      if(action.position&&(!Array.isArray(action.position)||action.position.length!==2||!action.position.every(Number.isFinite))) break;
      const layer=Math.max(0,...(lab.results??[]).map(row=>row.layer??row.id))+1;
      save({...lab,results:lab.results?.map(row=>row.id===action.id?{...row,layer,position:action.position?.map(value=>Math.max(0,Math.min(1,value)))??row.position}:row)});break;
    }
    case 'gc-result-interval': {const range=interval(action.interval); if(range) save({...lab,results:lab.results?.map(row=>row.id===action.id?{...row,interval:range}:row)});break;}
    case 'gc-reference': if(accords.includes(action.accord)) save({...lab,reference:action.accord}); break;
    case 'gc-interval': {const range=interval(action.interval);if(range)save({...lab,interval:range});break;}
    case 'gc-record': if(lab.analyses.includes('mystery')&&lab.analyses.includes(lab.reference)) save({...lab,measurements:[...lab.measurements.filter(row=>row.accord!==lab.reference),{accord:lab.reference,interval:lab.interval,referenceArea:integrate(lab.reference,lab.interval),mysteryArea:integrate('mystery',lab.interval)}]}); break;
    case 'gc-remove': save({...lab,measurements:lab.measurements.filter(row=>row.accord!==action.accord)}); break;
    case 'submit': if(!wasSolved&&now>=state.retryAt) {
      const answers=action.answers??state.answers;let correct=false;
      try {correct=isCorrectComposition(JSON.parse(answers.composition??''));}catch { /* Invalid/blank is wrong. */ }
      state={...state,answers,feedback:{question:correct},retryAt:correct?0:now+20000,solvedAt:correct?now:null};
    } break;
  }
  state={...state,interaction:lab};return finish();
}

/** Computed only on authorized question reads; recipes and marking keys stay private. */
export function customData(id) {
  return id==='U5P5'?{gcTraces:Object.fromEntries(samples.map(sample=>[sample,getTrace(sample)]))}:undefined;
}
