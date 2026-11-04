import test from 'node:test';
import assert from 'node:assert/strict';
import { questionInfo, reduceQuestion } from '../src/questions.mjs';
const key=['C2H6','C10H22O','C4H11N','C4H8','C5H10','C2H5N','C3H4O','C2H2O','C50H98'];
const submit=(groups,now=100,previous)=>reduceQuestion('U5P7',previous,{type:'submit',answers:{groups:groups.join(',')}},now);
test('Double Trouble rejects incomplete, duplicate, unknown and mixed partitions; cooldown cannot restart',()=>{
  assert.equal(questionInfo('U5P7').points,2);
  for(const groups of [[],key.slice(1),[...key,key[0]],key.map((v,i)=>i?v:key[1]),key.map((v,i)=>i?v:'unknown'),[key[3],...key.slice(1,3),key[0],...key.slice(4)]]) {
    assert.equal(submit(groups).award,false);
  }
  const wrong=submit([...key].sort());
  assert.equal(wrong.state.retryAt,20100);
  assert.equal(submit(key,20099,wrong).award,false);
  assert.equal(submit(key,20099,wrong).state.retryAt,20100);
  const solved=submit(key,20100,wrong);
  assert.equal(solved.award,true);
  assert.deepEqual(solved.state.answers,{});
  assert.equal(submit(key,21000,solved).award,false);
  assert.equal(submit(key,21000,solved).state,solved.state);
});
