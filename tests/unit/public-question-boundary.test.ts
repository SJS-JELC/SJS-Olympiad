import {describe,it,expect} from 'vitest';
import {questionCatalog} from '../../src/questions/catalog';
import {emptyAttempt,transition} from '../../src/questions/attempts';

describe('public question definitions contain presentation only',()=>{
  for(const {definition} of questionCatalog){
    it(definition.id+' has no browser evaluator and cannot locally mark a submission',()=>{
      expect('evaluate' in definition).toBe(false);
      const state=emptyAttempt();
      const result=transition(definition,state,{type:'submit',now:1000});
      expect(result.solvedAt).toBeNull();expect(result.feedback).toEqual({});expect(result.retryAt).toBe(0);
    });
  }
  it('ordinary editing keeps field validation and respects authoritative cooldown/solved snapshots',()=>{
    const definition=questionCatalog.find(entry=>entry.definition.id==='L5P1')!.definition;
    const initial=emptyAttempt();
    const edited=transition(definition,initial,{type:'edit',field:'answer',value:'a permitted draft',now:100});
    expect(edited.answers.answer).toBe('a permitted draft');expect(edited.solvedAt).toBeNull();
    expect(transition(definition,edited,{type:'submit',now:100})).toBe(edited);
    for(const state of [{...edited,retryAt:200},{...edited,solvedAt:0}]){
      expect(transition(definition,state,{type:'edit',field:'answer',value:'changed',now:100})).toBe(state);
      expect(transition(definition,state,{type:'submit',now:100})).toBe(state);
    }
    for(const [field,value]of [['unknown','draft'],['answer','a'.repeat(41)]])expect(transition(definition,initial,{type:'edit',field,value,now:100})).toBe(initial);
  });
});
