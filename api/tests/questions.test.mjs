import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {questionInfo,reduceQuestion,validateAnswers} from '../src/questions.mjs';
const fixtures=JSON.parse(readFileSync(new URL('../../tests/fixtures/questions.json',import.meta.url),'utf8'));
const initial=()=>({state:{answers:{},feedback:{},retryAt:0,solvedAt:null},privateState:null});
const submit=(id,answers,now=1000,previous=initial())=>reduceQuestion(id,previous,{type:'submit',answers,now:999999999},now);
const answerObject=(id,value)=>typeof value==='string' ? id==='L6P4'
  ? Object.fromEntries(value.split('/').flatMap((orbital,i)=>[...orbital].map((phase,n)=>[(i?'LUMO':'HOMO')+(n+1),phase]))) : {answer:value} : value;

test('all33 identities initialize through the deployable plain JavaScript boundary',()=>{
  let count=0;
  for(const year of ['L5','L6','U5','U6'])for(let n=1;n<=9;n++){
    const id=year+'P'+n,info=questionInfo(id);
    if(year==='U5'&&[1,4,9].includes(n)){assert.equal(info,null);continue;}
    count++;assert.equal(info.id,id);assert.equal(info.year,year);
    const result=reduceQuestion(id,null,{type:'tick',now:-999999},500);
    assert.equal(result.award,false);assert.equal(result.state.solvedAt,null);
  }
  assert.equal(count,33);
  for(const bad of ['__proto__','constructor','L6P0','l6p8','L6P10',null,{},1])assert.equal(questionInfo(bad),null);
  for(const bad of ['__proto__','constructor','unknown'])assert.throws(()=>validateAnswers(bad,{}),TypeError);
  for(const id of ['L5P1','L5P9','L6P3','U5P5'])for(const action of [null,[],42,{},'submit'])assert.equal(reduceQuestion(id,null,action,0).award,false);
});

for(const [id,metadata] of Object.entries(fixtures).filter(([id])=>!['L5P9','L6P1','L6P3'].includes(id))) {
  const cases=metadata.fixtures, correct=(cases.correct??cases.accepted??[]).map(value=>answerObject(id,value));
  test(id+' independent source answers, whole feedback and once-only server award',()=>{
    for(const answers of correct){
      const result=submit(id,answers,0);
      assert.equal(result.award,true,JSON.stringify(answers));assert.equal(result.state.solvedAt,0);
      assert.deepEqual(result.state.feedback,{answer:true});
      const duplicate=submit(id,answers,1,result);assert.equal(duplicate.award,false);assert.equal(duplicate.state,result.state);
      const edit=reduceQuestion(id,result,{type:'edit',field:'answer',value:'wrong',now:999999},2);assert.equal(edit.state,result.state);
    }
    for(const answers of [...(cases.wrong??[]),...(cases.blank??[]),...(cases.rejected??[]).filter(value=>typeof value==='object')]){
      const result=submit(id,answers);assert.equal(result.award,false,JSON.stringify(answers));assert.equal(result.state.solvedAt,null);
    }
    const wrong=submit(id,{});
    if(id==='L6P4')assert.equal(wrong.state.retryAt,0); // Original orbital selector ignores incomplete Check.
    else{
      const retry=1000+questionInfo(id).cooldownMs;assert.equal(wrong.state.retryAt,retry);
      const blocked=submit(id,correct[0],retry-1,wrong);assert.equal(blocked.state,wrong.state);assert.equal(blocked.award,false);
      const ready=submit(id,correct[0],retry,wrong);assert.equal(ready.award,true);assert.equal(ready.state.solvedAt,retry);
    }
  });
}

test('malformed graph snapshots reject gracefully within fixed object limits',()=>{
  for(const [id,field,value]of [
    ['U5P2','diagram',{kind:'dot-and-cross',atoms:Array(500).fill({}),electrons:[],groups:[]}],
    ['U5P3','drawing',{kind:'molecule',graph:{atoms:Array(101).fill({}),bonds:[]},history:[]}],
    ['U5P7','drawings',{graphs:Array(21).fill({atoms:[],bonds:[]})}],
  ]){
    const result=submit(id,{[field]:JSON.stringify(value)});assert.equal(result.award,false);assert.equal(result.state.solvedAt,null);assert.equal(result.state.retryAt,21000);
  }
  for(const id of ['U5P2','U5P3','U5P7'])for(const value of ['null','{}','[]','{'])assert.equal(submit(id,{[id==='U5P2'?'diagram':id==='U5P3'?'drawing':'drawings']:value}).award,false);
});

test('semantic persistence removes undo history, rejects unknown/oversized fields, preserves approved chemistry',()=>{
  const source=fixtures.U5P3.fixtures.correct[0], drawing=JSON.parse(source.drawing);
  drawing.history=[structuredClone(drawing.graph)];
  const answers=validateAnswers('U5P3',{drawing:JSON.stringify(drawing)});
  assert.deepEqual(JSON.parse(answers.drawing).history,[]);assert.equal(submit('U5P3',answers).award,true);
  assert.deepEqual(validateAnswers('U5P7',{drawings:'{}',history:'arbitrary local undo text'}),{drawings:'{}'});
  for(const answers of [null,[],{unexpected:'x'},{answer:42},{answer:'x'.repeat(1001)}])assert.throws(()=>validateAnswers('L5P1',answers),TypeError);
  assert.throws(()=>validateAnswers('U5P3',{drawing:'x'.repeat(100001)}),TypeError);
  const malformed=submit('L5P1',{answer:5});assert.equal(malformed.award,false);assert.equal(malformed.state.retryAt,0);
});

test('multipart failures disclose one whole-question result and cannot award partial credit',()=>{
  const result=submit('L6P5',{...fixtures.L6P5.fixtures.correct[0],molecule2Maximum:'60'});
  assert.equal(result.award,false);assert.deepEqual(result.state.feedback,{answer:false});
  assert.equal(result.state.retryAt,21000);assert.equal(result.state.solvedAt,null);
});
