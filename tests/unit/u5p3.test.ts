import { serverDefinition } from './server-markers';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition, type Answers, type Attempt } from './server-markers';
import type { MoleculeAtom, MoleculeElement, MoleculeGraph, MoleculeState } from '../../src/contracts/molecule';
import { blankMolecule } from '../../src/chemistry/molecule/engine';
import { u5p3Definition as public_u5p3Definition } from '../../src/questions/u5p3/definition';
import { parseMoleculeAnswer, readMoleculeAnswer, serializeMoleculeAnswer } from '../../src/questions/u5p3/moleculeAnswer';
import { polymerContinuations, polymerGraph, polymerSubstituentSequence } from '../../src/questions/u5p3/polymerGraph';
const u5p3Definition=serverDefinition(public_u5p3Definition);


const monomers: readonly (readonly MoleculeElement[])[] = [
  ['H', 'H', 'H', 'F'], ['H', 'Cl', 'F', 'F'], ['H', 'H', 'F', 'Cl'], ['H', 'F', 'Cl', 'Cl'],
];
function drawing(molecules = monomers, explicitH = false): MoleculeState {
  const atoms: MoleculeAtom[] = [];
  const bonds: { a: number; b: number; order: 1 | 2 | 3 }[] = [];
  molecules.forEach((substituents, molecule) => {
    const start = molecule * 20 + 1;
    atoms.push({ id: start, element: 'C', x: molecule * 180, y: 0 }, { id: start + 1, element: 'C', x: molecule * 180 + 60, y: 0 });
    bonds.push({ a: start, b: start + 1, order: 2 });
    substituents.forEach((element, index) => {
      if (element === 'H' && !explicitH) return;
      const id = start + index + 2;
      atoms.push({ id, element, x: molecule * 180 + index * 20, y: index % 2 ? 50 : -50 });
      bonds.push({ a: start + (index < 2 ? 0 : 1), b: id, order: 1 });
    });
  });
  return { kind: 'molecule', graph: { atoms, bonds }, history: [] };
}
const answersFor = (state = drawing()): Answers => ({ drawing: serializeMoleculeAnswer(state) });
const mark = (state: MoleculeState): boolean => u5p3Definition.evaluate(answersFor(state)).monomers;
const submit = (state: Attempt, now = 1000) => transition(u5p3Definition, state, { type: 'submit', now });
const edit = (state: Attempt, value: string, now = 0, field = 'drawing') => transition(u5p3Definition, state, { type: 'edit', field, value, now });
function withGraph(state: MoleculeState, graph: MoleculeGraph): MoleculeState { return { ...state, graph }; }

describe('U5P3 free molecular drawing and ordinary attempt lifecycle', () => {
  it('has one ordinary serialized drawing field and shared one-point/20-second rules', () => {
    expect(u5p3Definition.parts).toEqual([{ id: 'monomers', label: 'Alkene monomers', fields: [expect.objectContaining({ id: 'drawing' })] }]);
    expect(u5p3Definition.reduce).toBeUndefined();
    expect(u5p3Definition).toMatchObject({ points: 1, cooldownMs: 20000, lockCorrectParts: false, allowIncompleteSubmission: true });
    expect(readMoleculeAnswer({})).toEqual(blankMolecule());
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/questions.json', import.meta.url), 'utf8')).U5P3;
    expect(fixture.fixtures.correct).toHaveLength(1);
    expect(u5p3Definition.evaluate(fixture.fixtures.correct[0])).toEqual({ monomers: true });
  });
  it('accepts all component orders, carbon orientations and substituent orders without using coordinates or IDs', () => {
    for (let rotation = 0; rotation < 4; rotation++) {
      const reordered = [...monomers.slice(rotation), ...monomers.slice(0, rotation)];
      for (let mask = 0; mask < 8; mask++) {
        const oriented = reordered.map(([a, b, c, d]) => {
          const left = mask & 1 ? [b, a] : [a, b], right = mask & 2 ? [d, c] : [c, d];
          return mask & 4 ? [...right, ...left] : [...left, ...right];
        });
        const state = drawing(oriented);
        const renumber = (id: number) => id * 17 + 300;
        const graph = {
          atoms: state.graph.atoms.map(atom => ({ ...atom, id: renumber(atom.id), x: atom.x * -2 + 78, y: atom.x + 22 })).reverse(),
          bonds: state.graph.bonds.map(bond => ({ ...bond, a: renumber(bond.b), b: renumber(bond.a) })).reverse(),
        };
        expect(mark(withGraph(state, graph))).toBe(true);
      }
    }
  });
  it('treats explicit, implicit, specified and mixed hydrogen representations equivalently', () => {
    expect(mark(drawing())).toBe(true);
    expect(mark(drawing(monomers, true))).toBe(true);
    const implicit = drawing();
    const graph = { ...implicit.graph, atoms: implicit.graph.atoms.map(atom => atom.element === 'C'
      ? { ...atom, h: (4 - implicit.graph.bonds.filter(bond => bond.a === atom.id || bond.b === atom.id).reduce((n, bond) => n + bond.order, 0)) as 0 | 1 | 2 }
      : atom) };
    expect(mark(withGraph(implicit, graph))).toBe(true);
    const explicit = drawing(monomers, true);
    const removed = new Set(explicit.graph.atoms.filter(atom => atom.element === 'H' && atom.id % 2 === 0).map(atom => atom.id));
    expect(mark(withGraph(explicit, { atoms: explicit.graph.atoms.filter(atom => !removed.has(atom.id)), bonds: explicit.graph.bonds.filter(bond => !removed.has(bond.a) && !removed.has(bond.b)) }))).toBe(true);
  });
  it('rejects positional isomers, duplicates, missing and extra monomers', () => {
    expect(mark(drawing([monomers[0], ['H', 'F', 'Cl', 'F'], monomers[2], monomers[3]]))).toBe(false);
    expect(mark(drawing([monomers[0], monomers[0], monomers[2], monomers[3]]))).toBe(false);
    expect(mark(drawing(monomers.slice(0, 3)))).toBe(false);
    expect(mark(drawing([...monomers, ['H', 'H', 'H', 'H']]))).toBe(false);
  });
  it('rejects every extra fragment, including an isolated explicit hydrogen', () => {
    for (const element of ['H', 'C', 'F', 'Cl'] as const) {
      const state = drawing();
      expect(mark(withGraph(state, { ...state.graph, atoms: [...state.graph.atoms, { id: 999, element, x: 0, y: 0 }] }))).toBe(false);
    }
  });
  it('rejects wrong bonds, cycles, overvalence, underfilled specified H and charged atoms', () => {
    const state = drawing();
    for (const order of [1, 3] as const)
      expect(mark(withGraph(state, { ...state.graph, bonds: state.graph.bonds.map((bond, i) => i === 0 ? { ...bond, order } : bond) }))).toBe(false);
    for (const changed of [{ h: 0 as const }, { h: 4 as const }, { charge: 1 as const }, { charge: -1 as const }])
      expect(mark(withGraph(state, { ...state.graph, atoms: state.graph.atoms.map((atom, i) => i === 0 ? { ...atom, ...changed } : atom) }))).toBe(false);
    const explicit = drawing(monomers, true);
    expect(mark(withGraph(explicit, { ...explicit.graph, bonds: [...explicit.graph.bonds, { a: 3, b: 4, order: 1 }] }))).toBe(false);
    expect(mark(withGraph(state, { ...state.graph, atoms: state.graph.atoms.map((atom, i) => i === 2 ? { ...atom, element: 'O' } : atom) }))).toBe(false);
  });
  it('rejects blank and malformed submissions including malformed undo snapshots', () => {
    const good = drawing();
    const invalid = [undefined, '', 'null', '[]', '{}', '{', JSON.stringify({ ...good, kind: 'other' }),
      JSON.stringify({ ...good, history: Array.from({ length: 101 }, () => good.graph) }),
      JSON.stringify({ ...good, history: [{ atoms: [], bonds: [{ a: 1, b: 2, order: 1 }] }] }),
      JSON.stringify({ ...good, graph: { ...good.graph, atoms: [...good.graph.atoms, good.graph.atoms[0]] } }),
      JSON.stringify({ ...good, graph: { ...good.graph, bonds: [...good.graph.bonds, good.graph.bonds[0]] } }),
      JSON.stringify({ ...good, graph: { ...good.graph, unexpected: 'field' } }),
      JSON.stringify({ ...good, graph: { ...good.graph, atoms: good.graph.atoms.map((a, i) => i ? a : { ...a, x: null }) } }),
    ];
    for (const serialized of invalid) {
      expect(parseMoleculeAnswer(serialized)).toBeNull();
      expect(u5p3Definition.evaluate(serialized === undefined ? {} : { drawing: serialized }).monomers).toBe(false);
      expect(readMoleculeAnswer(serialized === undefined ? {} : { drawing: serialized })).toEqual(blankMolecule());
    }
    expect(mark(blankMolecule())).toBe(false);
    expect(() => serializeMoleculeAnswer({ ...good, history: Array.from({ length: 101 }, () => good.graph) })).toThrow();
  });
  it('retains drawing and history in ordinary answers across navigation/lock unmounts', () => {
    const state = { ...drawing(), history: [blankMolecule().graph] };
    const attempt = edit(emptyAttempt(), serializeMoleculeAnswer(state));
    const routerAttempts = { U5P3: attempt };
    expect(readMoleculeAnswer(routerAttempts.U5P3.answers)).toEqual(state);
    expect(transition(u5p3Definition, attempt, { type: 'tick', now: 500 })).toBe(attempt);
  });
  it('does not restart cooldown or award twice, including at time zero', () => {
    const wrong = submit(emptyAttempt());
    expect(wrong.retryAt).toBe(21000);
    expect(wrong.feedback).toEqual({ answer: false });
    expect(edit(wrong, serializeMoleculeAnswer(drawing()), 20999)).toBe(wrong);
    expect(submit(wrong, 20999)).toBe(wrong);
    const fixed = edit(wrong, serializeMoleculeAnswer(drawing()), 21000);
    const solved = submit(fixed, 21000);
    expect(solved.solvedAt).toBe(21000);
    expect(score([u5p3Definition], { U5P3: solved })).toBe(1);
    expect(submit(solved, 22000)).toBe(solved);
    expect(edit(solved, serializeMoleculeAnswer(blankMolecule()), 22000)).toBe(solved);
    const timeZero = submit({ ...emptyAttempt(), answers: answersFor() }, 0);
    expect(score([u5p3Definition], { U5P3: timeZero })).toBe(1);
    expect(submit(timeZero, 1)).toBe(timeZero);
    expect(edit(emptyAttempt(), '{}')).toEqual(emptyAttempt());
    expect(edit(emptyAttempt(), serializeMoleculeAnswer(drawing()), 0, 'count')).toEqual(emptyAttempt());
  });
});

describe('U5P3 immutable artist polymer and displayed graph', () => {
  it('preserves the source hash and all 22 carbon substituent pairs', () => {
    const source = readFileSync(new URL('../../src/questions/u5p3/assets/polymer.svg', import.meta.url));
    expect(createHash('sha256').update(source).digest('hex')).toBe('97f00321f8a7a8daf9776cd48775697611755f66756147ca03bb9c67696824e6');
    // The original artist outlined its glyphs. Their distinct path shapes provide an
    // independent source cross-check rather than reusing the graph's answer key.
    const allGlyphs = [...source.toString('utf8').split('id="Layer_2-2"')[1].matchAll(/<g class="[^"]+">\s*<path class="cls-18" d="M([\d.]+),([\d.]+)([^\"]+)"\/>([\s\S]*?)<\/g>/g)]
      .map(match => ({ x: Number(match[1]), y: Number(match[2]), element: match[4].includes('<path') ? 'Cl' : match[3].includes('h16.54') ? 'F' : match[3].includes('h-7.09') ? 'H' : 'C' }));
    expect(allGlyphs).toHaveLength(66);
    expect(allGlyphs.filter(glyph => glyph.element === 'C')).toHaveLength(22);
    expect(source.toString('utf8').match(/<path class="cls-16"/g)).toHaveLength(67);
    const glyphs = allGlyphs.filter(glyph => glyph.y < 50 || glyph.y > 200);
    const top = glyphs.filter(glyph => glyph.y < 50).sort((a, b) => a.x - b.x).map(glyph => glyph.element);
    const bottom = glyphs.filter(glyph => glyph.y > 200).sort((a, b) => a.x - b.x).map(glyph => glyph.element);
    expect(top).toHaveLength(22);
    expect(bottom).toHaveLength(22);
    const sourcePairs = Array.from({ length: 22 }, (_, i) => (i % 2 === 0 ? bottom : top).slice(Math.floor(i / 2) * 2, Math.floor(i / 2) * 2 + 2));
    expect(polymerSubstituentSequence).toEqual(sourcePairs);
    const provenance = JSON.parse(readFileSync(new URL('../../src/questions/u5p3/assets/polymer.provenance.json', import.meta.url), 'utf8'));
    expect(provenance.carbonSubstituentSequence).toEqual(sourcePairs);
    expect(provenance.sourceSha256).toBe(createHash('sha256').update(source).digest('hex'));
    expect(polymerGraph.atoms).toHaveLength(66);
    expect(polymerGraph.bonds).toHaveLength(65);
    expect(polymerGraph.bonds.every(bond => bond.order === 1)).toBe(true);
    expect(polymerContinuations).toHaveLength(2);
    for (let i = 0; i < 22; i++) {
      const carbon = i * 3 + 1;
      expect(polymerGraph.atoms.find(atom => atom.id === carbon)?.element).toBe('C');
      expect(polymerGraph.atoms.filter(atom => atom.id === carbon + 1 || atom.id === carbon + 2).map(atom => atom.element)).toEqual(sourcePairs[i]);
      if (i > 0) expect(polymerGraph.bonds).toContainEqual({ a: carbon - 3, b: carbon, order: 1 });
    }
  });
});
