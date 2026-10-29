import type {
  DotCrossState,
  DotCrossSnapshot,
  DotCrossElement,
  DotCrossAnchor,
  ElectronSymbol,
  EditorEngine,
  Point,
} from './contracts';
import { validateState } from './core.js';
import type { CanvasBounds } from './interaction';
type DiagramCommand =
  | Readonly<{ type: 'atom'; element: DotCrossElement; point: Point }>
  | Readonly<{
      type: 'move';
      ids: readonly string[];
      dx: number;
      dy: number;
      bounds?: CanvasBounds;
    }>
  | Readonly<{ type: 'electron'; symbol: ElectronSymbol; anchor: DotCrossAnchor }>
  | Readonly<{ type: 'relocate-electron'; id: string; anchor: DotCrossAnchor }>
  | Readonly<{ type: 'electron-symbol'; id: string; symbol: ElectronSymbol }>
  | Readonly<{ type: 'circles'; visible: boolean }>
  | Readonly<{ type: 'delete'; ids: readonly string[] }>
  | Readonly<{ type: 'group'; atomIds: readonly string[]; charge: number; bracket: boolean }>
  | Readonly<{ type: 'undo' | 'redo' | 'clear' }>;
/** Presentation organisation is command-local and never enters diagrams or history. */
export type DotCrossCommand = DiagramCommand & Readonly<{ organisation?: 'alevel' | 'igcse' }>;
export const emptyDiagram = (): DotCrossState => ({
  kind: 'dot-and-cross',
  atoms: [],
  electrons: [],
  groups: [],
});
export const snapshot = (state: DotCrossSnapshot): DotCrossSnapshot => ({
  kind: 'dot-and-cross',
  atoms: structuredClone(state.atoms),
  electrons: structuredClone(state.electrons),
  groups: structuredClone(state.groups),
});
function nextId(state: DotCrossState, prefix: string) {
  const ids = new Set([...state.atoms, ...state.electrons, ...state.groups].map((item) => item.id));
  let index = 1;
  while (ids.has(`${prefix}${index}`)) index++;
  return `${prefix}${index}`;
}
/** Source app.js organise(): pack regions and alternate shared-pair origin queues. */
function organise(state: DotCrossSnapshot, organisation: 'alevel' | 'igcse'): DotCrossSnapshot {
  const electrons = structuredClone(state.electrons) as {
    id: string;
    symbol: ElectronSymbol;
    anchor: DotCrossAnchor;
  }[];
  const regions = new Map<string, typeof electrons>();
  for (const e of electrons) {
    const a = e.anchor,
      key = a.kind === 'atom' ? `a:${a.atomId}` : `b:${[a.a, a.b].sort().join(':')}`;
    const region = regions.get(key) || [];
    region.push(e);
    regions.set(key, region);
  }
  for (const es of regions.values()) {
    es.sort((a, b) => a.anchor.slot - b.anchor.slot);
    let ordered = es;
    if (es[0]!.anchor.kind === 'bond') {
      // A Level app.js preserves first-symbol queue order; IGCSE app.js always dot then cross.
      const queues = new Map<ElectronSymbol, typeof electrons>(
        organisation === 'igcse'
          ? [
              ['dot', []],
              ['cross', []],
            ]
          : [],
      );
      for (const e of es) {
        const queue = queues.get(e.symbol) || [];
        queue.push(e);
        queues.set(e.symbol, queue);
      }
      ordered = [];
      while (ordered.length < es.length)
        for (const queue of queues.values()) {
          const next = queue.shift();
          if (next) ordered.push(next);
        }
    }
    ordered.forEach((e, i) => {
      e.anchor = { ...e.anchor, slot: i } as DotCrossAnchor;
    });
  }
  return { ...state, electrons };
}
function apply(state: DotCrossState, command: DotCrossCommand): DotCrossState {
  const history = state.history ?? [],
    future = state.future ?? [];
  const preference = state.circles === undefined ? {} : { circles: state.circles };
  if (command.type === 'circles')
    return typeof command.visible === 'boolean' && (state.circles ?? true) !== command.visible
      ? { ...state, circles: command.visible }
      : state;
  if (command.type === 'undo') {
    const previous = history.at(-1);
    return previous
      ? {
          ...snapshot(previous),
          ...preference,
          history: history.slice(0, -1),
          future: [snapshot(state), ...future].slice(0, 100),
        }
      : state;
  }
  if (command.type === 'redo') {
    const next = future[0];
    return next
      ? {
          ...snapshot(next),
          ...preference,
          history: [...history, snapshot(state)].slice(-100),
          future: future.slice(1),
        }
      : state;
  }
  let changed: DotCrossSnapshot = snapshot(state);
  switch (command.type) {
    case 'atom':
      if (
        state.atoms.length >= 30 ||
        !Number.isFinite(command.point.x) ||
        !Number.isFinite(command.point.y) ||
        state.atoms.some((a) => Math.hypot(a.x - command.point.x, a.y - command.point.y) < 45)
      )
        return state;
      changed = {
        ...changed,
        atoms: [
          ...changed.atoms,
          {
            id: nextId(state, 'a'),
            element: command.element,
            x: command.point.x,
            y: command.point.y,
          },
        ],
      };
      break;
    case 'move': {
      const limits = command.bounds ?? { left: 75, right: 925, top: 75, bottom: 575 };
      const moving = state.atoms.filter((a) => command.ids.includes(a.id));
      if (!moving.length || !Number.isFinite(command.dx) || !Number.isFinite(command.dy))
        return state;
      const dx = Math.max(
        limits.left - Math.min(...moving.map((a) => a.x)),
        Math.min(limits.right - Math.max(...moving.map((a) => a.x)), command.dx),
      );
      const dy = Math.max(
        limits.top - Math.min(...moving.map((a) => a.y)),
        Math.min(limits.bottom - Math.max(...moving.map((a) => a.y)), command.dy),
      );
      changed = {
        ...changed,
        atoms: changed.atoms.map((atom) =>
          command.ids.includes(atom.id)
            ? {
                ...atom,
                x: atom.x + dx,
                y: atom.y + dy,
              }
            : atom,
        ),
      };
      break;
    }
    case 'electron':
      changed = {
        ...changed,
        electrons: [
          ...changed.electrons,
          { id: nextId(state, 'e'), symbol: command.symbol, anchor: command.anchor },
        ],
      };
      break;
    case 'delete':
      changed = {
        ...changed,
        atoms: changed.atoms.filter((atom) => !command.ids.includes(atom.id)),
        electrons: changed.electrons.filter(
          (e) =>
            !command.ids.includes(e.id) &&
            (e.anchor.kind === 'atom'
              ? !command.ids.includes(e.anchor.atomId)
              : !command.ids.includes(e.anchor.a) && !command.ids.includes(e.anchor.b)),
        ),
        groups: changed.groups.filter(
          (g) => !command.ids.includes(g.id) && !g.atomIds.some((id) => command.ids.includes(id)),
        ),
      };
      break;
    case 'relocate-electron':
      changed = {
        ...changed,
        electrons: changed.electrons.map((e) =>
          e.id === command.id ? { ...e, anchor: command.anchor } : e,
        ),
      };
      break;
    case 'electron-symbol':
      changed = {
        ...changed,
        electrons: changed.electrons.map((e) =>
          e.id === command.id ? { ...e, symbol: command.symbol } : e,
        ),
      };
      break;
    case 'group': {
      if (
        !command.atomIds.length ||
        !Number.isSafeInteger(command.charge) ||
        command.charge < -9 ||
        command.charge > 9
      )
        return state;
      const existing = changed.groups.find(
        (g) =>
          g.bracket === command.bracket &&
          g.atomIds.length === command.atomIds.length &&
          g.atomIds.every((id) => command.atomIds.includes(id)),
      );
      changed = {
        ...changed,
        groups: [
          ...changed.groups.filter(
            (g) =>
              g.id !== existing?.id &&
              (!command.bracket || !g.atomIds.some((id) => command.atomIds.includes(id))),
          ),
          {
            id: existing?.id ?? nextId(state, 'g'),
            atomIds: [...command.atomIds],
            charge: command.charge,
            bracket: command.bracket,
          },
        ],
      };
      break;
    }
    case 'clear':
      changed = emptyDiagram();
      break;
  }
  // Reject malformed commands before organisation could hide duplicate slots.
  if (validateState(changed).length) return state;
  changed = organise(changed, command.organisation ?? 'alevel');
  if (validateState(changed).length || JSON.stringify(snapshot(state)) === JSON.stringify(changed))
    return state;
  return {
    ...changed,
    ...preference,
    history: [...history, snapshot(state)].slice(-100),
    future: [],
  };
}
export const dotCrossEngine: EditorEngine<'dot-and-cross', DotCrossCommand> = {
  kind: 'dot-and-cross',
  apply,
  checkSubmission(state) {
    const errors = validateState(state);
    if (errors.length)
      return {
        status: 'malformed',
        issues: errors.map((message) => ({ code: 'reference-integrity', message, objectIds: [] })),
      };
    if (!state.atoms.length)
      return {
        status: 'incomplete',
        issues: [{ code: 'empty', message: 'Place atoms to begin the diagram.', objectIds: [] }],
      };
    // Excessive valence, wrong bonds, missing electrons and charges are assessable chemistry.
    return { status: 'ready', chemicalIssues: [] };
  },
  validate(state) {
    const errors = validateState(state);
    return errors.length
      ? {
          valid: false,
          issues: errors.map((message) => ({
            code: 'reference-integrity',
            message,
            objectIds: [],
          })),
        }
      : { valid: true };
  },
};
