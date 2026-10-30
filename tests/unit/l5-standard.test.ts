import { serverDefinition } from './server-markers';
import questionFixtures from '../fixtures/questions.json';
import { l5p8 as public_l5p8 } from '../../src/questions/l5p8/definition';
import { l5p7 as public_l5p7 } from '../../src/questions/l5p7/definition';
import { l5p5 as public_l5p5 } from '../../src/questions/l5p5/definition';
import { l5p4 as public_l5p4 } from '../../src/questions/l5p4/definition';
import { l5p3 as public_l5p3 } from '../../src/questions/l5p3/definition';
import { l5p2 as public_l5p2 } from '../../src/questions/l5p2/definition';
import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition, type Answers, type QuestionDefinition } from './server-markers';
import { l5p1 as public_l5p1 } from '../../src/questions/l5p1/definition';
const l5p8=serverDefinition(public_l5p8);
const l5p7=serverDefinition(public_l5p7);
const l5p5=serverDefinition(public_l5p5);
const l5p4=serverDefinition(public_l5p4);
const l5p3=serverDefinition(public_l5p3);
const l5p2=serverDefinition(public_l5p2);
const l5p1=serverDefinition(public_l5p1);


const case8 = questionFixtures.L5P8;
const case7 = questionFixtures.L5P7;
const case5 = questionFixtures.L5P5;
const case4 = questionFixtures.L5P4;
const case3 = questionFixtures.L5P3;
const case2 = questionFixtures.L5P2;

describe('L5P1 source marking and standard lifecycle', () => {
  it.each(['vanadium', ' VANADIUM ', 'van adium'])('accepts source-normalized name %j', answer => {
    expect(l5p1.evaluate({ answer })).toEqual({ answer: true });
  });
  it.each(['V', 'vanadium oxide', 'vanadum', 'van\tadium', '', '   '])('rejects non-key answer %j', answer => {
    expect(l5p1.evaluate({ answer })).toEqual({ answer: false });
  });
  it('treats absent/blank input as a wrong attempt and enforces the exact 30-second boundary', () => {
    const wrong = transition(l5p1, emptyAttempt(), { type: 'submit', now: 1000 });
    expect(wrong.retryAt).toBe(31000);
    expect(wrong.solvedAt).toBeNull();
    expect(transition(l5p1, wrong, { type: 'submit', now: 30999 })).toBe(wrong);
    expect(transition(l5p1, wrong, { type: 'edit', field: 'answer', value: 'vanadium', now: 30999 })).toBe(wrong);
    const edited = transition(l5p1, wrong, { type: 'edit', field: 'answer', value: 'vanadium', now: 31000 });
    const solved = transition(l5p1, edited, { type: 'submit', now: 31000 });
    expect(solved.solvedAt).toBe(31000);
    expect(score([l5p1], { L5P1: solved })).toBe(1);
    expect(transition(l5p1, solved, { type: 'submit', now: 32000 })).toBe(solved);
  });
  it('preserves the source 40-character field limit', () => {
    const empty = emptyAttempt();
    expect(transition(l5p1, empty, { type: 'edit', field: 'answer', value: 'a'.repeat(41), now: 0 })).toBe(empty);
  });
});

// Source fixtures cover all standard L5 questions; the bespoke builders have separate tests.
const standardCases: { definition: QuestionDefinition; fixture: { points: number; cooldownMs: number; fixtures: { correct: Readonly<Record<string, string | undefined>>[]; wrong: Readonly<Record<string, string | undefined>>[]; blank: Readonly<Record<string, string | undefined>>[] } } }[] = [
  { definition: l5p2, fixture: case2 },
  { definition: l5p3, fixture: case3 },
  { definition: l5p4, fixture: case4 },
  { definition: l5p5, fixture: case5 },
  { definition: l5p7, fixture: case7 },
  { definition: l5p8, fixture: case8 },
];
const fixtureAnswers = (fixture: Readonly<Record<string, string | undefined>>): Answers =>
  Object.fromEntries(Object.entries(fixture).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
for (const { definition, fixture } of standardCases) describe(definition.id + ' source fixtures', () => {
  it.each(fixture.fixtures.correct)('accepts source key %j', answers => {
    expect(definition.evaluate(fixtureAnswers(answers))).toEqual({ answer: true });
  });
  it.each([...fixture.fixtures.wrong, ...fixture.fixtures.blank])('rejects wrong/incomplete key %j', answers => {
    expect(definition.evaluate(fixtureAnswers(answers))).toEqual({ answer: false });
  });
  it('preserves points and cooldown, rejects blank/repeat attempts, and awards once at expiry', () => {
    expect(definition.points).toBe(fixture.points);
    expect(definition.cooldownMs).toBe(fixture.cooldownMs);
    const wrong = transition(definition, emptyAttempt(), { type: 'submit', now: 1000 });
    const deadline = 1000 + fixture.cooldownMs;
    expect(wrong.retryAt).toBe(deadline);
    expect(score([definition], { [definition.id]: wrong })).toBe(0);
    expect(transition(definition, wrong, { type: 'submit', now: deadline - 1 })).toBe(wrong);
    const solved = transition(definition, { ...wrong, answers: fixtureAnswers(fixture.fixtures.correct[0]) }, { type: 'submit', now: deadline });
    expect(solved.solvedAt).toBe(deadline);
    expect(score([definition], { [definition.id]: solved })).toBe(fixture.points);
    expect(transition(definition, solved, { type: 'submit', now: deadline + 1 })).toBe(solved);
  });
});
