import { describe, expect, it } from 'vitest';
import { compactAnswers } from '../../src/cloud/CloudQuestion';
describe('compact answer transport', () => {
    it('removes undo history while preserving molecular graph and scientific labels', () => { const graph = { atoms: [{ id: 1, element: 'Cl', x: 1, y: 2 }], bonds: [] }; const answers = { drawing: JSON.stringify({ kind: 'molecule', graph, history: [{ atoms: [], bonds: [] }] }), history: 'local-only', answer: 'SO₄²⁻' }; expect(compactAnswers(answers)).toEqual({ drawing: JSON.stringify({ kind: 'molecule', graph, history: [] }), answer: 'SO₄²⁻' }); expect(JSON.parse(answers.drawing).history).toHaveLength(1); });
    it('preserves assessable malformed answers without creating browser correctness', () => { expect(compactAnswers({ drawing: 'not a graph', answer: '' })).toEqual({ drawing: 'not a graph', answer: '' }); });
});
