import core from './molecule-core.mjs';
export function assertMoleculeGraph(value, limits = core.DEFAULT_LIMITS) {
    if (!value || !Array.isArray(value.atoms) || !Array.isArray(value.bonds) || value.atoms.length > core.limitsFor(limits).maxAtoms || value.bonds.length > limits.maxBonds) throw Error('Unsupported graph.');
    const graph = core.assertGraph(value, limits);
    const fields = (v, allowed) => {
        if (Object.keys(v).some((k) => !allowed.includes(k)))
            throw Error('Unknown molecule field.');
    };
    fields(graph, ['atoms', 'bonds', 'arrows']);
    if (graph.bonds.length > limits.maxBonds)
        throw Error('Too many bonds.');
    const atoms = new Map(graph.atoms.map((a) => [a.id, a]));
    for (const a of graph.atoms) {
        fields(a, [
            'id',
            'element',
            'x',
            'y',
            'charge',
            'h',
            'pairs',
            'dipole',
            'chargeAngle',
            'dipoleAngle',
        ]);
        if (!Number.isSafeInteger(a.id) || a.id < 0)
            throw Error('Invalid atom ID.');
        if (a.pairs !== undefined &&
            (!Array.isArray(a.pairs) || a.pairs.length > 8 || a.pairs.some((p) => !Number.isFinite(p))))
            throw Error('Invalid lone-pair annotation.');
        if (a.dipole !== undefined && ![-1, 1].includes(a.dipole))
            throw Error('Invalid dipole annotation.');
    }
    graph.bonds.forEach((b) => fields(b, ['a', 'b', 'order']));
    const anchorValid = (a) => {
        if (!a || typeof a !== 'object')
            return false;
        if (a.kind === 'bond') {
            fields(a, ['kind', 'a', 'b']);
            return graph.bonds.some((b) => (b.a === a.a && b.b === a.b) || (b.a === a.b && b.b === a.a));
        }
        fields(a, a.kind === 'pair' ? ['kind', 'id', 'index'] : ['kind', 'id']);
        if (!['atom', 'charge', 'pair'].includes(a.kind) || !atoms.has(a.id))
            return false;
        return (a.kind !== 'pair' ||
            a.index === undefined ||
            (Number.isInteger(a.index) && a.index >= 0 && a.index < (atoms.get(a.id)?.pairs?.length ?? 0)));
    };
    if (graph.arrows !== undefined) {
        if (!Array.isArray(graph.arrows) || graph.arrows.length > 100)
            throw Error('Invalid annotation arrows.');
        const ids = new Set();
        for (const a of graph.arrows) {
            fields(a, ['id', 'from', 'to', 'bend']);
            if (!Number.isSafeInteger(a.id) ||
                a.id < 0 ||
                ids.has(a.id) ||
                !Number.isFinite(a.bend) ||
                !anchorValid(a.from) ||
                !anchorValid(a.to))
                throw Error('Broken annotation reference.');
            ids.add(a.id);
        }
    }
    return graph;
}
export function assertMoleculeState(value, limits = core.DEFAULT_LIMITS) {
    const state = value;
    if (!state ||
        state.kind !== 'molecule' ||
        !Array.isArray(state.history) ||
        state.history.length > 100)
        throw Error('Invalid molecule state/history.');
    if (Object.keys(state).some((k) => !['kind', 'graph', 'history'].includes(k)))
        throw Error('Unknown molecule state field.');
    assertMoleculeGraph(state.graph, limits);
    state.history.forEach(graph => assertMoleculeGraph(graph, limits));
    return state;
}
export function parseMoleculeAnswer(value, limits = core.DEFAULT_LIMITS) { try {
    if (typeof value !== 'string' || value.length > 100000)
        return null;
    const state = JSON.parse(value);
    if (state?.history?.length)
        return null;
    return assertMoleculeState(state, limits);
}
catch {
    return null;
} }
