import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition, type Answers, type QuestionDefinition } from '../../src/questions/attempts';
import { l5p6, formulaCounts, normaliseFormula } from '../../src/questions/l5p6/definition';
import { l6p4 } from '../../src/questions/l6p4/definition';
import { u6p9, pointGroupOptions, pointGroupKeys } from '../../src/questions/u6p9/definition';

const fragments = { mass47: 'CH3S', mass74: 'C2H4NO2', mass45: 'CHO2' };
const orbitals = (homo = '112211', lumo = '122112'): Answers => Object.fromEntries([
  ...[...homo].map((value, index) => ['HOMO' + (index + 1), value]),
  ...[...lumo].map((value, index) => ['LUMO' + (index + 1), value]),
]);
const complete = (definition: QuestionDefinition, answers: Answers, now = 0) => transition(definition, { ...emptyAttempt(), answers }, { type: 'submit', now });
describe('L5P6 source formula parser', () => {
  it('normalises ordinary/subscript digits, case and spaces for display and marking', () => {
    expect(normaliseFormula(' c2 h4 n o2 ', true)).toBe('C₂H₄NO₂');
    expect(normaliseFormula('c₂ h₄ n o₂')).toBe('C2H4NO2');
    expect(l5p6.evaluate({ mass47: 's h₃ c', mass74: 'o₂ n h₄ c₂', mass45: 'o₂hc' })).toEqual({ mass47: true, mass74: true, mass45: true });
  });
  it('sums repeated tokens and allows order changes and explicit zero counts like the source', () => {
    expect(l5p6.evaluate({ mass47: 'CHHHSN0O0', mass74: 'OONHHCCHH', mass45: 'OHCO' })).toEqual({ mass47: true, mass74: true, mass45: true });
    expect(formulaCounts('C01H03S01')).toEqual({ C: 1, H: 3, N: 0, O: 0, S: 1 });
  });
  it.each(['', ' ', 'CH3S+', 'CH3S−', 'CH3Se', 'CH3SO', '(CH3)S', 'CH3S1.0', 'CH3S-1', 'CH3S	O0', 'CH3S⁺', 'CH3S₂'])('rejects wrong or malformed 47.1 fragment %j', value => {
    expect(l5p6.evaluate({ ...fragments, mass47: value }).mass47).toBe(false);
  });
  it('requires every fragment and guards max length without filtering valid scientific symbols', () => {
    expect(complete(l5p6, { ...fragments, mass74: '' }).retryAt).toBe(20_000);
    const state = emptyAttempt();
    expect(transition(l5p6, state, { type: 'edit', field: 'mass74', value: 'C₂H₄NO₂', now: 0 }).answers.mass74).toBe('C₂H₄NO₂');
    expect(transition(l5p6, state, { type: 'edit', field: 'mass74', value: 'C'.repeat(13), now: 0 })).toBe(state);
  });
});
describe('L6P4 orbital phase selection', () => {
  it.each([['112211', '122112'], ['221122', '122112'], ['112211', '211221'], ['221122', '211221']])('accepts independently inverted orbitals %s/%s', (homo, lumo) => {
    expect(complete(l6p4, orbitals(homo, lumo)).solvedAt).toBe(0);
  });
  it('ignores incomplete Check like the original and rejects partial inversion, wrong patterns and invalid phases', () => {
    const partial = { ...emptyAttempt(), answers: orbitals('11221') };
    expect(transition(l6p4, partial, { type: 'submit', now: 1000 })).toBe(partial);
    for (const answers of [orbitals('112212'), orbitals('111111'), orbitals('112211', '112211'), { ...orbitals(), HOMO1: '0' }])
      expect(complete(l6p4, answers).solvedAt).toBe(null);
    const state = emptyAttempt();
    expect(transition(l6p4, state, { type: 'edit', field: 'HOMO1', value: '0', now: 0 })).toBe(state);
  });
  it('retains phase edits in the attempt and disables every orbital uniformly during cooldown', () => {
    let state = emptyAttempt();
    for (const [field, value] of Object.entries(orbitals())) state = transition(l6p4, state, { type: 'edit', field, value, now: 0 });
    expect(state.answers).toEqual(orbitals());
    const wrong = complete(l6p4, { ...state.answers, LUMO1: '2' }, 1000);
    expect(wrong.retryAt).toBe(31000);
    for (const field of ['HOMO1', 'LUMO1']) expect(transition(l6p4, wrong, { type: 'edit', field, value: '1', now: 30999 })).toBe(wrong);
  });
});
describe('U6P9 exact source dropdowns', () => {
  it('uses the twelve original scientific Unicode options and marks the exact source key', () => {
    expect(pointGroupOptions).toHaveLength(12);
    expect(pointGroupOptions[11]).toBe('D₃ₕ – E, C₃, 3 × C₂, σₕ, 3 × σᵥ');
    expect(complete(u6p9, pointGroupKeys).solvedAt).toBe(0);
    for (const id of ['HClO', 'SF4', 'PCl5']) expect(complete(u6p9, { ...pointGroupKeys, [id]: pointGroupOptions[0] }).solvedAt).toBe(null);
  });
  it('rejects arbitrary edits, shorthand text and blank choices', () => {
    const state = emptyAttempt();
    expect(transition(u6p9, state, { type: 'edit', field: 'HClO', value: 'Cs', now: 0 })).toBe(state);
    expect(u6p9.evaluate({ ...pointGroupKeys, HClO: 'Cₛ' }).HClO).toBe(false);
    expect(complete(u6p9, {}).retryAt).toBe(30_000);
  });
});
const lifecycleCases: readonly (readonly [QuestionDefinition, Answers])[] = [[l5p6, fragments], [l6p4, orbitals()], [u6p9, pointGroupKeys]];
for (const [definition, answers] of lifecycleCases) {
  it(definition.id + ' awards once, preserves navigation state and guards the cooldown boundary', () => {
    const first = definition.parts[0].fields[0].id;
    const wrongValue = definition === l6p4 ? '2' : definition === u6p9 ? pointGroupOptions[0] : 'CH2S';
    const wrong = complete(definition, { ...answers, [first]: wrongValue }, 1000);
    const retained = { [definition.id]: wrong }[definition.id];
    expect(transition(definition, retained, { type: 'submit', now: wrong.retryAt - 1 })).toBe(wrong);
    expect(transition(definition, retained, { type: 'edit', field: first, value: answers[first], now: wrong.retryAt - 1 })).toBe(wrong);
    const corrected = transition(definition, retained, { type: 'edit', field: first, value: answers[first], now: wrong.retryAt });
    const solved = transition(definition, corrected, { type: 'submit', now: wrong.retryAt });
    expect(score([definition], { [definition.id]: solved })).toBe(definition.points);
    expect(transition(definition, solved, { type: 'submit', now: solved.retryAt + 100000 })).toBe(solved);
    expect(transition(definition, solved, { type: 'edit', field: first, value: wrongValue, now: 100000 })).toBe(solved);
  });
}
