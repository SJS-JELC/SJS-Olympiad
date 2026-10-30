import { serverDefinition } from './server-markers';
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { emptyAttempt, score, transition, type Answers, type QuestionDefinition } from './server-markers';
import { u6p1 as public_u6p1 } from '../../src/questions/u6p1/definition';
import { u6p2 as public_u6p2 } from '../../src/questions/u6p2/definition';
import { u6p3 as public_u6p3 } from '../../src/questions/u6p3/definition';
import { u6p4 as public_u6p4 } from '../../src/questions/u6p4/definition';
import { u6p5 as public_u6p5 } from '../../src/questions/u6p5/definition';
import { u6p6 as public_u6p6 } from '../../src/questions/u6p6/definition';
import { u6p7 as public_u6p7 } from '../../src/questions/u6p7/definition';
import { u6p8 as public_u6p8 } from '../../src/questions/u6p8/definition';
const u6p1=serverDefinition(public_u6p1);
const u6p2=serverDefinition(public_u6p2);
const u6p3=serverDefinition(public_u6p3);
const u6p4=serverDefinition(public_u6p4);
const u6p5=serverDefinition(public_u6p5);
const u6p6=serverDefinition(public_u6p6);
const u6p7=serverDefinition(public_u6p7);
const u6p8=serverDefinition(public_u6p8);


const correct = { a: '4', b: '10', c: '8' };
describe('U6P4 source marking and shared form lifecycle', () => {
  it('preserves the source identity, points, cooldown and numeric equivalence', () => {
    expect([u6p4.id, u6p4.number, u6p4.title, u6p4.year, u6p4.points, u6p4.cooldownMs]).toEqual(['U6P4', 4, 'CHARGE HOPPER', 'U6', 1, 60000]);
    expect(u6p4.evaluate(correct)).toEqual({ answer: true });
    expect(u6p4.evaluate({ a: '4.0', b: '010', c: '8.0' })).toEqual({ answer: true });
    expect(u6p4.evaluate({ a: '4', b: '8', c: '10' })).toEqual({ answer: false });
  });
  it.each(['', ' ', '4x', '0x4', '4.01', 'NaN', 'Infinity'])('rejects blank, invalid or inexact A value %j', a => {
    expect(u6p4.evaluate({ ...correct, a })).toEqual({ answer: false });
  });
  it('marks the whole question together and blocks all fields during the exact retry period', () => {
    const wrong = transition(u6p4, { ...emptyAttempt(), answers: { ...correct, c: '' } }, { type: 'submit', now: 1000 });
    expect(wrong.feedback).toEqual({ answer: false }); expect(wrong.retryAt).toBe(61000);
    expect(transition(u6p4, wrong, { type: 'submit', now: 60999 })).toBe(wrong);
    for (const field of ['a', 'b', 'c']) expect(transition(u6p4, wrong, { type: 'edit', field, value: '8', now: 60999 })).toBe(wrong);
    const fixed = transition(u6p4, wrong, { type: 'edit', field: 'c', value: '8', now: 61000 });
    const solved = transition(u6p4, fixed, { type: 'submit', now: 61000 });
    expect(solved.solvedAt).toBe(61000); expect(score([u6p4], { U6P4: solved })).toBe(1);
    expect(transition(u6p4, solved, { type: 'submit', now: 62000 })).toBe(solved);
  });
  it('counts blank attempts and has no individual locking or feedback', () => {
    expect(transition(u6p4, emptyAttempt(), { type: 'submit', now: 0 }).retryAt).toBe(60000);
    expect(u6p4.lockCorrectParts).toBe(false); expect(u6p4.allowIncompleteSubmission).toBe(true);
    expect(u6p4.parts).toHaveLength(1); expect(u6p4.parts[0].fields).toHaveLength(3);
  });
  it('retains the original trusted scientific diagram byte for byte', () => {
    const svg = readFileSync(new URL('../../src/questions/u6p4/assets/resonance.svg', import.meta.url));
    expect(createHash('sha256').update(svg).digest('hex')).toBe('c7280818fee0628ab4c1b1b430fe8a1c665015ecd356a1bf29345fd3d85822c2');
    expect(svg.toString('utf8')).not.toMatch(/<script|<foreignObject|\son[a-z]+=|(?:href|src)=["']https?:/i);
  });
});

const migrated: { definition: QuestionDefinition; correct: Answers[]; wrong: Answers[] }[] = [
  { definition: u6p1, correct: [{ answer: '4-hydroxycyclohexanone' }, { answer: ' 4-HYDROXY CYCLOHEXANONE ' }], wrong: [{ answer: 'hydroxycyclohexanone' }, { answer: '4-hydroxycyclohexanol' }] },
  { definition: u6p2, correct: [{ answer: '28.5' }, { answer: '28.500' }], wrong: [{ answer: '28.49' }, { answer: '28.51' }, { answer: '28.5°C' }] },
  { definition: u6p3, correct: [{ answer: '6-methylspiro[2.3]hexan-4-ol' }, { answer: ' 6-METHYLSPIRO[2.3]HEXAN-4-OL ' }], wrong: [{ answer: '6-methyl spiro[2.3]hexan-4-ol' }, { answer: '6-methylspiro[3.2]hexan-4-ol' }] },
  { definition: u6p4, correct: [correct], wrong: [{ a: '4', b: '8', c: '10' }] },
  { definition: u6p5, correct: [{ first: 'B', second: 'D' }, { first: 'd', second: 'b' }], wrong: [{ first: 'B', second: 'B' }, { first: ' B', second: 'D' }, { first: 'A', second: 'C' }] },
  { definition: u6p6, correct: [{ answer: '29808' }, { answer: '29808.0' }], wrong: [{ answer: '29807' }, { answer: '29808x' }] },
  { definition: u6p7, correct: [{ answer: '192' }], wrong: [{ answer: '0192' }, { answer: '192.0' }, { answer: ' 192' }, { answer: '191' }] },
  { definition: u6p8, correct: [{ sn1: '60.3', sn2: '39.7' }, { sn1: '60.25', sn2: '39.65' }, { sn1: '60.349', sn2: '39.749' }], wrong: [{ sn1: '60.35', sn2: '39.7' }, { sn1: '60.3', sn2: '39.75' }, { sn1: '60.249', sn2: '39.7' }, { sn1: '60.3', sn2: '39.649' }, { sn1: '39.7', sn2: '60.3' }] },
];
for (const { definition, correct: accepted, wrong: rejected } of migrated) {
  describe(definition.id + ' regression fixtures', () => {
    it('accepts only source keys, normalization and precision', () => {
      for (const answers of accepted) expect(definition.evaluate(answers), JSON.stringify(answers)).toEqual({ answer: true });
      for (const answers of rejected) expect(definition.evaluate(answers), JSON.stringify(answers)).toEqual({ answer: false });
      expect(definition.evaluate({})).toEqual({ answer: false });
    });
    it('uses the source retry period for blank attempts and awards once', () => {
      const blank = transition(definition, emptyAttempt(), { type: 'submit', now: 1000 });
      expect(blank.retryAt).toBe(1000 + definition.cooldownMs);
      expect(transition(definition, blank, { type: 'submit', now: blank.retryAt - 1 })).toBe(blank);
      const solved = transition(definition, { ...emptyAttempt(), answers: accepted[0] }, { type: 'submit', now: 0 });
      expect(score([definition], { [definition.id]: solved })).toBe(definition.points);
      expect(transition(definition, solved, { type: 'submit', now: 1 })).toBe(solved);
    });
    it('preserves independent fixtures and trusted unchanged media', () => {
      const metadata = JSON.parse(readFileSync(new URL('../fixtures/questions.json', import.meta.url), 'utf8'))[definition.id];
      expect(metadata.identity).toEqual({ id: definition.id, year: 'U6', number: definition.number, title: definition.title });
      expect(metadata.points).toBe(definition.points); expect(metadata.cooldownMs).toBe(definition.cooldownMs);
      expect(metadata.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
      for (const answers of metadata.fixtures.correct) expect(definition.evaluate(answers)).toEqual({ answer: true });
      for (const answers of [...metadata.fixtures.wrong, ...metadata.fixtures.blank]) expect(definition.evaluate(answers)).toEqual({ answer: false });
      for (const asset of metadata.assets) {
        const svg = readFileSync(new URL('../../src/questions/' + definition.id.toLowerCase() + '/' + asset.file, import.meta.url));
        expect(createHash('sha256').update(svg).digest('hex')).toBe(asset.sha256);
        expect(svg.toString('utf8')).not.toMatch(/<script|<foreignObject|\son[a-z]+=|(?:href|src)=["']https?:/i);
      }
    });
  });
}
it('preserves every U6 standard source point and cooldown value', () => {
  expect(migrated.map(({ definition: d }) => [d.number, d.points, d.cooldownMs])).toEqual([[1,1,15000],[2,1,10000],[3,1,30000],[4,1,60000],[5,2,120000],[6,2,10000],[7,2,10000],[8,3,10000]]);
});
