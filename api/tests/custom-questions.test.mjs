import test from 'node:test';
import assert from 'node:assert/strict';
import { customInfo, customData, reduceCustomQuestion } from '../src/custom-questions.mjs';
const initial=()=>({state:{answers:{},feedback:{},retryAt:0,solvedAt:null},privateState:{}});
const act=(id,previous,action,now)=>reduceCustomQuestion(id,previous,action,now);
test('custom registry and unsupported question boundary',()=>{
  for(const [id,points] of [['L5P9',3],['L6P1',1],['L6P3',1],['U5P5',2]])assert.equal(customInfo(id).points,points);
  assert.equal(customInfo('unknown'),null);assert.equal(act('unknown',initial(),{},0),null);
});
test('grouping exact partition validation and reset cannot erase score/penalty',()=>{
  const correct=['S','Zr','Th','Cu','Na','F','V','As','Ta'];
  for(const bad of [correct.slice(1),correct.map((v,i)=>i? v:'Na'),correct.map((v,i)=>i?v:'X'),['Ta','S','As','Cu','V','Zr','F','Th','Na']]) {
    const result=act('L6P1',initial(),{type:'submit',answers:{groups:bad.join(',')}},50);
    assert.equal(result.award,false);assert.equal(result.state.solvedAt,null);
  }
  let result=act('L6P1',initial(),{type:'submit',answers:{groups:['Ta','S','As','Cu','V','Zr','F','Th','Na'].join(',')}},50);
  result=act('L6P1',result,{type:'reset',now:999999},51);assert.equal(result.state.retryAt,20050);
  result=act('L6P1',result,{type:'submit',answers:{groups:correct.join(',')}},20050);assert.equal(result.award,true);
  result=act('L6P1',result,{type:'reset'},20051);assert.equal(result.state.solvedAt,20050);assert.equal(result.award,false);
});
test('timed server sequence stays private, ignores client RNG/time and reveals only timeout prompt',()=>{
  let result=act('L6P3',initial(),{type:'start',now:0,random:[0,0,0,0,0],run:[]},1000);
  assert.equal(result.state.interaction.deadline,76000);
  const run=result.privateState.run;
  assert.equal(new Set(run.slice(0,4).map(row=>row.row)).size,4);
  assert.ok(run.slice(0,4).every(row=>row.row>=16&&row.row<=60));assert.ok(run[4].row>=2&&run[4].row<=15);
  assert.equal(result.state.interaction.formula,run[0].formula);
  assert.equal(result.state.interaction.run,undefined);assert.equal(result.state.interaction.revealed,null);
  assert.equal(customData('L6P3'),undefined);
  result=act('L6P3',result,{type:'submit',answers:{answer:'wrong'},now:999999},1050);
  assert.equal(result.state.interaction.wrongUntil,1550);assert.equal(result.state.interaction.revealed,null);
  result=act('L6P3',result,{type:'submit',answers:{answer:run[0].name}},1060);assert.equal(result.state.interaction.step,1);
  result=act('L6P3',result,{type:'submit',answers:{answer:run[1].name}},76000);
  assert.equal(result.state.interaction.revealed,run[1].name);assert.equal(result.state.retryAt,96000);assert.equal(result.award,false);
  assert.equal(result.state.interaction.formula,null);
  const restarted=act('L6P3',result,{type:'start'},96000);assert.equal(restarted.state.interaction.deadline,171000);
});
test('five server-marked names award once with no future public names',()=>{
  let result=act('L6P3',initial(),{type:'start'},0);
  for(let step=0;step<5;step++) {
    result=act('L6P3',result,{type:'submit',answers:{answer:result.privateState.run[step].name}},step+1);
    assert.equal(result.award,step===4);assert.equal(result.state.interaction.run,undefined);
  }
  assert.equal(act('L6P3',result,{type:'submit',answers:{}},10).award,false);
});
test('GC load precedes run, captures immutable concentrations and keeps eight compact snapshots',()=>{
  let result=act('U5P5',initial(),{type:'gc-enter'},0);
  result=act('U5P5',result,{type:'gc-run',sample:'mystery'},0);assert.equal(result.state.interaction.activeRun,null);
  for(let index=0;index<9;index++) {
    result=act('U5P5',result,{type:'gc-dilute',sample:'citrus',value:25.5},index*7000);
    result=act('U5P5',result,{type:'gc-load',sample:'citrus'},index*7000);
    result=act('U5P5',result,{type:'gc-run',sample:'mystery',now:-999},index*7000);
    assert.equal(result.state.interaction.activeRun.deadline,index*7000+6000);
    result=act('U5P5',result,{type:'gc-dilute',sample:'citrus',value:80},index*7000+1);
    result=act('U5P5',result,{type:'tick'},index*7000+6000);
  }
  assert.equal(result.state.interaction.results.length,8);assert.equal(result.state.interaction.results[0].id,2);
  assert.ok(result.state.interaction.results.every(row=>row.concentration===25.5));
  assert.ok(JSON.stringify(result.state).length<5000);
  const data=customData('U5P5');assert.ok(data.gcTraces.mystery.length>2000);assert.equal(data.RECIPE,undefined);
  const solved=act('U5P5',initial(),{type:'submit',answers:{composition:'[25,14,9,152]'}},50);
  assert.equal(solved.award,true);assert.equal(act('U5P5',solved,{type:'submit',answers:{composition:'[25,14,9,152]'}},51).award,false);
});
test('GC load preserves click-time dilution through newer drafts and validates snapshots',()=>{
  let result=act('U5P5',initial(),{type:'gc-enter'},0);
  result=act('U5P5',result,{type:'gc-dilute',sample:'citrus',value:20},1);
  const clicked={type:'gc-load',sample:'citrus',concentration:20};
  // A slider edit can be saved while the earlier Load action awaits its draft flush.
  result=act('U5P5',result,{type:'gc-dilute',sample:'citrus',value:50},2);
  result=act('U5P5',result,clicked,3);
  assert.equal(result.state.interaction.loaded.concentration,20);
  assert.equal(result.state.interaction.concentrations.citrus,50);
  for(const concentration of [-.5,100.5,20.25,NaN,Infinity,'20']) {
    result=act('U5P5',result,{type:'gc-load',sample:'citrus',concentration},4);
    assert.equal(result.state.interaction.loaded.concentration,20);
  }
  result=act('U5P5',result,{type:'gc-run',sample:'citrus'},5);
  assert.equal(result.state.interaction.activeRun.concentration,20);
  result=act('U5P5',result,{type:'tick'},6005);
  assert.equal(result.state.interaction.results[0].concentration,20);
  result=act('U5P5',result,{type:'gc-load',sample:'mystery',concentration:20},6006);
  assert.equal(result.state.interaction.loaded.concentration,100);
});
