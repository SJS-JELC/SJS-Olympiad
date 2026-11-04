import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceQuestion, questionInfo } from '../src/questions.mjs';
const submit = (answer, now = 100, previous) => reduceQuestion('U5P4', previous, {type:'submit',answers:{answer}}, now);
for (const answer of ['1,4-oxazepine',' 1, 4 - OXAZEPINE ','1,4\u2013oxazepine','1,4\u2011oxazepine']) {
  test(`accepts ${answer}`, () => assert.equal(submit(answer).award,true));
}
for (const answer of ['', ' ', 'oxazepine', '1,3-oxazepine', '1,4-oxazine', '1,4-oxazepane', '14oxazepine', '1,4?oxazepine', '1,2-diazepine', '1,4-oxazepine extra']) {
  test(`rejects ${JSON.stringify(answer)}`, () => assert.equal(submit(answer).award,false));
}
test('blank cooldown boundary, repeat clicks, once-only completion and answer-free state', () => {
  assert.equal(questionInfo('U5P4').points,1);
  const wrong = submit('');
  assert.equal(wrong.state.retryAt,20100);
  const early = submit('1,4-oxazepine',20099,wrong);
  assert.equal(early.state,wrong.state);
  const solved = submit('1,4-oxazepine',20100,wrong);
  assert.equal(solved.award,true);
  assert.deepEqual(solved.state.answers,{});
  const replay = submit('wrong',30100,solved);
  assert.equal(replay.award,false);
  assert.equal(replay.state,solved.state);
});
