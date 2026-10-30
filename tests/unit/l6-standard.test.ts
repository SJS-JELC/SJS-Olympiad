import { serverDefinition } from './server-markers';
import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition, type QuestionDefinition } from './server-markers';
import { l6p2 as public_l6p2 } from '../../src/questions/l6p2/definition';
import { l6p6 as public_l6p6 } from '../../src/questions/l6p6/definition';
import { l6p7 as public_l6p7 } from '../../src/questions/l6p7/definition';
import { l6p8 as public_l6p8 } from '../../src/questions/l6p8/definition';
import { l6p9 as public_l6p9 } from '../../src/questions/l6p9/definition';
const l6p2=serverDefinition(public_l6p2);
const l6p6=serverDefinition(public_l6p6);
const l6p7=serverDefinition(public_l6p7);
const l6p8=serverDefinition(public_l6p8);
const l6p9=serverDefinition(public_l6p9);

const definitions: QuestionDefinition[] = [l6p2, l6p6, l6p7, l6p8, l6p9];
const cases = {
  "2": {
    "accepted": [
      "V",
      "v",
      " V "
    ],
    "rejected": [
      "vanadium",
      "VV",
      "",
      " "
    ]
  },
  "6": {
    "accepted": [
      "30",
      "36",
      "30.0",
      "3.6e1",
      " 36 "
    ],
    "rejected": [
      "",
      " ",
      "29",
      "35",
      "30.001",
      "30x",
      "0x1e",
      "Infinity"
    ]
  },
  "7": {
    "accepted": [
      "(Z)-but-2-enedioic acid",
      "(Z)-butenedioic acid",
      "cis-but-2-enedioic acid",
      "cis-butenedioic acid",
      " maleic acid ",
      "(Z),but-2-enedioic acid"
    ],
    "rejected": [
      "",
      " ",
      "but-2-enedioic acid",
      "(E)-but-2-enedioic acid",
      "fumaric acid",
      "maleicacidx",
      "(Z)–but-2-enedioic acid"
    ]
  },
  "8": {
    "accepted": [
      "0.437",
      ".437",
      "0.4370",
      "4.37e-1",
      " 0.437 "
    ],
    "rejected": [
      "",
      " ",
      "0.436",
      "0.4371",
      "0.4370001",
      "437",
      "NaN",
      "0.437M"
    ]
  },
  "9": {
    "accepted": [
      "295",
      "295.0",
      "2.95e2",
      " 295 "
    ],
    "rejected": [
      "",
      " ",
      "294",
      "295.001",
      "295pm",
      "0x127",
      "Infinity"
    ]
  }
};
// L6P8 numeric fixtures and lifecycle now execute server-side in api/tests/service.test.mjs.
for (const definition of definitions.filter(d => d.id !== 'L6P8')) describe(definition.id + ' source marking and standard lifecycle', () => {
  const fixtures = cases[String(definition.number) as keyof typeof cases];
  it.each(fixtures.accepted)('accepts source-equivalent answer %j', answer => {
    expect(definition.evaluate({ answer })).toEqual({ answer: true });
  });
  it.each(fixtures.rejected)('rejects wrong/malformed answer %j', answer => {
    expect(definition.evaluate({ answer })).toEqual({ answer: false });
  });
  it('handles blank, cooldown boundary, repeat clicks, edits and once-only award', () => {
    const blank = transition(definition, emptyAttempt(), { type: 'submit', now: 1_000 });
    expect(blank.retryAt).toBe(1_000 + definition.cooldownMs); expect(blank.solvedAt).toBe(null);
    expect(transition(definition, blank, { type: 'submit', now: blank.retryAt - 1 })).toBe(blank);
    expect(transition(definition, blank, { type: 'edit', field: 'answer', value: fixtures.accepted[0], now: blank.retryAt - 1 })).toBe(blank);
    const edited = transition(definition, blank, { type: 'edit', field: 'answer', value: fixtures.accepted[0], now: blank.retryAt });
    const solved = transition(definition, edited, { type: 'submit', now: blank.retryAt });
    expect(solved.solvedAt).toBe(blank.retryAt); expect(score([definition], { [definition.id]: solved })).toBe(definition.points);
    expect(transition(definition, solved, { type: 'submit', now: blank.retryAt + 1 })).toBe(solved);
    expect(transition(definition, solved, { type: 'edit', field: 'answer', value: 'wrong', now: blank.retryAt + 1 })).toBe(solved);
    expect(definition.lockCorrectParts).toBe(false); expect(definition.allowIncompleteSubmission).toBe(true);
  });
  it('rejects unknown and too-long input edits', () => {
    const initial = emptyAttempt();
    expect(transition(definition, initial, { type: 'edit', field: 'unknown', value: 'V', now: 0 })).toBe(initial);
    expect(transition(definition, initial, { type: 'edit', field: 'answer', value: '1'.repeat(41), now: 0 })).toBe(initial);
  });
});
it('retains source point bands and question-specific retry periods', () => {
  expect(definitions.map(d => [d.number, d.points, d.cooldownMs])).toEqual([[2, 1, 30_000], [6, 2, 20_000], [7, 2, 20_000], [8, 3, 15_000], [9, 3, 30_000]]);
});
it('cannot award L6P8 points with the browser evaluator', () => {
  expect('evaluate' in public_l6p8).toBe(false);
  for (const answer of cases['8'].accepted) expect(l6p8.evaluate({answer})).toEqual({answer:true});
});
