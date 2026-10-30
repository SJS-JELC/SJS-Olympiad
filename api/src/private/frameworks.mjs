import core from './molecule-core.mjs';
import { parseMoleculeAnswer } from './molecule-validation.mjs';

export const blank = () => ({ graphs: [{ atoms: [], bonds: [] }], selected: 0 });
export function valid(g) {
    return !!g && Array.isArray(g.atoms) && Array.isArray(g.bonds) &&
        Object.keys(g).every(key => ['atoms', 'bonds'].includes(key)) &&
        g.atoms.length <= 30 && g.bonds.length <= 60 &&
        g.atoms.every(a => !!a && Object.keys(a).every(key => ['id', 'x', 'y'].includes(key)) &&
            Number.isInteger(a.id) && Number.isFinite(a.x) && Number.isFinite(a.y)) &&
        new Set(g.atoms.map(a => a.id)).size === g.atoms.length &&
        g.bonds.every(b => !!b && Object.keys(b).every(key => ['a', 'b', 'order'].includes(key)) &&
            [1, 2].includes(b.order) && b.a !== b.b && g.atoms.some(a => a.id === b.a) && g.atoms.some(a => a.id === b.b)) &&
        new Set(g.bonds.map(b => [b.a, b.b].sort((a, b) => a - b).join(':'))).size === g.bonds.length &&
        g.atoms.every(a => valence(g, a.id) <= 4);
}
export const valence = (g, id) => g.bonds.filter(b => b.a === id || b.b === id).reduce((n, b) => n + b.order, 0);
export function read(value) { try {
    const d = JSON.parse(value ?? '');
    if (Array.isArray(d.graphs) && d.graphs.length > 0 && d.graphs.length <= 20 && d.graphs.every(valid) && Number.isInteger(d.selected) && d.selected >= 0 && d.selected < d.graphs.length)
        return d;
}
catch { } return blank(); }
const base = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [7, 8]].map(([a, b]) => ({ a, b, order: 1 }));
export const solutions = [[0, 7, 5], [7, 0, 5], [5, 0, 7]].map(([d, a, b]) => ({ atoms: Array.from({ length: 10 }, (_, id) => ({ id, x: id * 30, y: 100 })), bonds: [...base, { a: 9, b: d, order: 2 }, { a, b, order: 2 }] }));
export function equivalent(a, b) {
    if (!valid(a) || !valid(b) || a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length)
        return false;
    const edge = (g, x, y) => g.bonds.find(b => (b.a === x && b.b === y) || (b.a === y && b.b === x))?.order ?? 0;
    const mapping = new Map();
    const used = new Set();
    const search = (i) => { if (i === a.atoms.length)
        return true; const x = a.atoms[i].id; for (const atom of b.atoms) {
        const y = atom.id;
        if (used.has(y) || valence(a, x) !== valence(b, y) || [...mapping].some(([u, v]) => edge(a, x, u) !== edge(b, y, v)))
            continue;
        mapping.set(x, y);
        used.add(y);
        if (search(i + 1))
            return true;
        mapping.delete(x);
        used.delete(y);
    } return false; };
    return search(0);
}
const p7Limits = { maxHeavyAtoms: 40, maxAtoms: 100, maxBonds: 150 };
const moleculeSolutions = solutions.map(g => ({ atoms: g.atoms.map(a => ({ ...a, element: 'C' })), bonds: g.bonds }));

/** Match three complete molecules, retaining the approved carbon connectivity key. */
function correctMolecules(value) {
    const state = parseMoleculeAnswer(value, p7Limits);
    if (!state || state.graph.atoms.some(a => !['C', 'H'].includes(a.element) || a.charge) ||
        core.validate(state.graph, true, p7Limits).kind !== 'valid') return false;
    const graph = state.graph, unvisited = new Set(graph.atoms.map(a => a.id)), components = [];
    while (unvisited.size) {
        if (components.length === 3) return false;
        const pending = [unvisited.values().next().value], ids = new Set();
        while (pending.length) {
            const id = pending.pop();
            if (ids.has(id)) continue;
            ids.add(id); unvisited.delete(id);
            core.neighbours(graph, id).forEach(edge => pending.push(edge.id));
        }
        const component = { atoms: graph.atoms.filter(a => ids.has(a.id)), bonds: graph.bonds.filter(b => ids.has(b.a)) };
        if (component.atoms.filter(a => a.element === 'C').length !== 10) return false;
        components.push(component);
    }
    // core.check validates the original component and then folds terminal explicit H
    // into implicit hydrogen counts before exact element/bond-order isomorphism.
    return components.length === 3 && moleculeSolutions.every(reference =>
        components.filter(component => core.check(component, reference, p7Limits).kind === 'correct').length === 1);
}

export function correct(value) { try {
    const raw = JSON.parse(value ?? '');
    if (raw?.kind === 'molecule') return correctMolecules(value);
        if (!raw || !Array.isArray(raw.graphs) || raw.graphs.length > 20 || !raw.graphs.every(valid))
        return false;
    const graphs = raw.graphs.filter((g) => g.atoms.length);
    return graphs.length === 3 && solutions.every(s => graphs.filter(g => equivalent(g, s)).length === 1);
}
catch {
    return false;
} }
