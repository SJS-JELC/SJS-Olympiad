import type {
  MoleculeEngine,
  MoleculeAnchor,
  MoleculeElement,
  MoleculeGraph,
  MoleculeState,
  Point,
} from '../../contracts/molecule';
import core from './core.js';
import { clean } from './layout';
export { core };
export const blankMolecule = (): MoleculeState => ({
  kind: 'molecule',
  graph: core.empty(),
  history: [],
});
export type MoleculeCommand =
  | { kind: 'commit-graph'; graph: MoleculeGraph }
  | { kind: 'clean' }
  | { kind: 'add'; element: MoleculeElement; point: Point; parent?: number; order: 1 | 2 | 3 }
  | { kind: 'element'; id: number; element: MoleculeElement }
  | { kind: 'bond'; a: number; b: number; order: 1 | 2 | 3 }
  | { kind: 'move'; id: number; point: Point }
  | { kind: 'delete-atom'; id: number }
  | { kind: 'delete-bond'; a: number; b: number }
  | { kind: 'charge'; id: number; charge: -1 | 0 | 1 }
  | { kind: 'hydrogens'; id: number; h: 0 | 1 | 2 | 3 | 4 | 'auto' }
  | { kind: 'undo' | 'clear' };
/** Validate reference/annotation integrity, never reject an assessable valence mistake. */
export function assertMoleculeGraph(value: unknown): MoleculeGraph {
  const graph = core.assertGraph(value);
  const fields = (v: object, allowed: readonly string[]) => {
    if (Object.keys(v).some((k) => !allowed.includes(k))) throw Error('Unknown molecule field.');
  };
  fields(graph, ['atoms', 'bonds', 'arrows']);
  if (graph.bonds.length > 150) throw Error('Too many bonds.');
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
    if (!Number.isSafeInteger(a.id) || a.id < 0) throw Error('Invalid atom ID.');
    if (
      a.pairs !== undefined &&
      (!Array.isArray(a.pairs) || a.pairs.length > 8 || a.pairs.some((p) => !Number.isFinite(p)))
    )
      throw Error('Invalid lone-pair annotation.');
    if (a.dipole !== undefined && ![-1, 1].includes(a.dipole))
      throw Error('Invalid dipole annotation.');
  }
  graph.bonds.forEach((b) => fields(b, ['a', 'b', 'order']));
  const anchorValid = (a: MoleculeAnchor) => {
    if (!a || typeof a !== 'object') return false;
    if (a.kind === 'bond') {
      fields(a, ['kind', 'a', 'b']);
      return graph.bonds.some((b) => (b.a === a.a && b.b === a.b) || (b.a === a.b && b.b === a.a));
    }
    fields(a, a.kind === 'pair' ? ['kind', 'id', 'index'] : ['kind', 'id']);
    if (!['atom', 'charge', 'pair'].includes(a.kind) || !atoms.has(a.id)) return false;
    return (
      a.kind !== 'pair' ||
      a.index === undefined ||
      (Number.isInteger(a.index) && a.index >= 0 && a.index < (atoms.get(a.id)?.pairs?.length ?? 0))
    );
  };
  if (graph.arrows !== undefined) {
    if (!Array.isArray(graph.arrows) || graph.arrows.length > 100)
      throw Error('Invalid annotation arrows.');
    const ids = new Set<number>();
    for (const a of graph.arrows) {
      fields(a, ['id', 'from', 'to', 'bend']);
      if (
        !Number.isSafeInteger(a.id) ||
        a.id < 0 ||
        ids.has(a.id) ||
        !Number.isFinite(a.bend) ||
        !anchorValid(a.from) ||
        !anchorValid(a.to)
      )
        throw Error('Broken annotation reference.');
      ids.add(a.id);
    }
  }
  return graph;
}
export function assertMoleculeState(value: unknown): MoleculeState {
  const state = value as MoleculeState;
  if (
    !state ||
    state.kind !== 'molecule' ||
    !Array.isArray(state.history) ||
    state.history.length > 100
  )
    throw Error('Invalid molecule state/history.');
  if (Object.keys(state).some((k) => !['kind', 'graph', 'history'].includes(k)))
    throw Error('Unknown molecule state field.');
  assertMoleculeGraph(state.graph);
  state.history.forEach(assertMoleculeGraph);
  return state;
}
function apply(state: MoleculeState, cmd: MoleculeCommand): MoleculeState {
  assertMoleculeState(state);
  if (cmd.kind === 'undo') {
    const g = state.history.at(-1);
    return g
      ? { kind: 'molecule', graph: structuredClone(g), history: state.history.slice(0, -1) }
      : state;
  }
  let graph = structuredClone(state.graph);
  switch (cmd.kind) {
    case 'commit-graph':
      graph = structuredClone(assertMoleculeGraph(cmd.graph));
      break;
    case 'clean':
      graph = clean(graph);
      break;
    case 'add':
      graph = core.addAtom(
        graph,
        cmd.element,
        cmd.point.x,
        cmd.point.y,
        cmd.parent ?? null,
        cmd.order,
      );
      break;
    case 'element':
      graph = core.setElement(graph, cmd.id, cmd.element);
      break;
    case 'bond':
      graph = graph.bonds.some(
        (b) => (b.a === cmd.a && b.b === cmd.b) || (b.a === cmd.b && b.b === cmd.a),
      )
        ? core.setBond(graph, cmd.a, cmd.b, cmd.order)
        : core.addBond(graph, cmd.a, cmd.b, cmd.order);
      break;
    case 'move':
      graph = {
        ...graph,
        atoms: graph.atoms.map((a) => (a.id === cmd.id ? { ...a, ...cmd.point } : a)),
      };
      break;
    case 'delete-atom':
      graph = core.remove(graph, { kind: 'atom', id: cmd.id });
      break;
    case 'delete-bond':
      graph = core.remove(graph, { kind: 'bond', a: cmd.a, b: cmd.b });
      break;
    case 'clear':
      graph = core.empty();
      break;
    case 'charge':
      graph = {
        ...graph,
        atoms: graph.atoms.map((a) => (a.id === cmd.id ? { ...a, charge: cmd.charge } : a)),
      };
      break;
    case 'hydrogens':
      graph = {
        ...graph,
        atoms: graph.atoms.map((a) => {
          if (a.id !== cmd.id) return a;
          const { h: _h, ...other } = a;
          return cmd.h === 'auto' ? other : { ...other, h: cmd.h };
        }),
      };
      break;
  }
  assertMoleculeGraph(graph);
  return JSON.stringify(graph) === JSON.stringify(state.graph)
    ? state
    : {
        kind: 'molecule',
        graph,
        history: [...state.history, structuredClone(state.graph)].slice(-100),
      };
}
export const moleculeEngine: MoleculeEngine<MoleculeCommand> = {
  kind: 'molecule',
  apply,
  validate(state) {
    try {
      assertMoleculeState(state);
      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        issues: [{ code: 'graph-integrity', message: String(e), objectIds: [] }],
      };
    }
  },
  checkSubmission(state) {
    try {
      assertMoleculeState(state);
    } catch (e) {
      return {
        status: 'malformed',
        issues: [{ code: 'graph-integrity', message: String(e), objectIds: [] }],
      };
    }
    if (!state.graph.atoms.length)
      return {
        status: 'incomplete',
        issues: [{ code: 'empty', message: 'Draw your molecule first.', objectIds: [] }],
      };
    const chemistry = core.validate(state.graph);
    return {
      status: 'ready',
      chemicalIssues:
        chemistry.kind === 'valid'
          ? []
          : [
              {
                code: chemistry.kind,
                message: chemistry.message ?? 'Check the drawing.',
                objectIds: chemistry.atoms ?? [],
              },
            ],
    };
  },
};
