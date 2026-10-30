import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readTheoryYear, rememberTheoryYear, routeYear } from '../../src/questions/years';
import { emptyAttempt, score, transition, type QuestionDefinition } from '../../src/questions/attempts';

describe('theory year routing and score isolation', () => {
  beforeEach(() => {
    const stored = new Map<string,string>();
    vi.stubGlobal('localStorage', { getItem: (key:string) => stored.get(key) ?? null, setItem: (key:string,value:string) => stored.set(key,value) });
  });
  it('defaults to L6 and remembers only a valid local year', () => {
    expect(readTheoryYear()).toBe('L6'); rememberTheoryYear('U6'); expect(readTheoryYear()).toBe('U6');
    rememberTheoryYear('U5'); expect(readTheoryYear()).toBe('U5');
    localStorage.setItem('sjs-olympiad-theory-year', 'U4'); expect(readTheoryYear()).toBe('L6');
  });
  it('legacy links use selected year and explicit invalid years remain unavailable', () => {
    expect(routeYear(new URLSearchParams('theory&question=1'), 'L5')).toBe('L5');
    expect(routeYear(new URLSearchParams('theory&year=U6'), 'L5')).toBe('U6');
    expect(routeYear(new URLSearchParams('theory&year=U5&question=5'), 'L6')).toBe('U5');
    for (const invalid of ['U4', 'l6', '', '12']) expect(routeYear(new URLSearchParams('year='+invalid), 'L6')).toBeNull();
  });
  it('year-specific identities isolate attempts and award totals', () => {
    const definitions: QuestionDefinition[] = ['L5','L6','U6'].map(year => ({ id: year+'P1',year,number:1,title:'fixture',points:1,cooldownMs:20000,lockCorrectParts:false,allowIncompleteSubmission:true,parts:[{id:'answer',label:'Answer',fields:[{id:'answer',label:'Answer'}]}] }));
    const draft = transition(definitions[0], emptyAttempt(), {type:'edit',field:'answer',value:'ok',now:1});
    expect(transition(definitions[0],draft,{type:'submit',now:1})).toBe(draft);
    // A server-confirmed solved snapshot contributes only to its full year/question identity.
    const state = {...draft,solvedAt:1};
    const attempts = { L5P1: state };
    expect(score(definitions.filter(q=>q.year==='L5'), attempts)).toBe(1);
    expect(score(definitions.filter(q=>q.year==='L6'), attempts)).toBe(0);
    expect(score(definitions.filter(q=>q.year==='U6'), attempts)).toBe(0);
  });
});
