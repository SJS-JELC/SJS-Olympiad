/** Source: molecule-builder/editor.js. Same 74px, 30° growth and collision policy. */
import type { MoleculeElement, MoleculeGraph, Point } from '../../contracts/molecule';
import core from './core.js';
export const LENGTH = 74,
  STEP = Math.PI / 6;
export type MoleculeTarget = { kind: 'atom'; id: number } | { kind: 'bond'; a: number; b: number };
export interface GrowthGesture {
  target: MoleculeTarget | null;
  start: Point;
}
export function destination(
  graph: MoleculeGraph,
  start: Point & { id?: number },
  raw: Point,
  scale = 1,
): Point & { id?: number } {
  const existing = graph.atoms
    .filter((a) => a.id !== start.id && Math.hypot(a.x - raw.x, a.y - raw.y) <= 24 / scale)
    .sort((a, b) => Math.hypot(a.x - raw.x, a.y - raw.y) - Math.hypot(b.x - raw.x, b.y - raw.y))[0];
  const angle = Math.round(Math.atan2(raw.y - start.y, raw.x - start.x) / STEP) * STEP;
  return (
    existing || { x: start.x + LENGTH * Math.cos(angle), y: start.y + LENGTH * Math.sin(angle) }
  );
}
export function gestureGraph(
  graph: MoleculeGraph,
  state: GrowthGesture,
  end: Point,
  element: MoleculeElement,
  order: 1 | 2 | 3,
  chain: boolean,
  scale = 1,
): MoleculeGraph {
  let draft = graph;
  if (state.target && state.target.kind !== 'atom') return draft;
  let start = state.target
    ? graph.atoms.find((a) => a.id === (state.target as { id: number }).id)
    : undefined;
  if (!start) {
    if (
      (element !== 'H' && core.heavyCount(graph) >= core.LIMIT) ||
      graph.atoms.length >= 100 ||
      graph.atoms.some((a) => Math.hypot(a.x - state.start.x, a.y - state.start.y) < 42)
    )
      return draft;
    draft = core.addAtom(draft, chain ? 'C' : element, state.start.x, state.start.y);
    start = draft.atoms.at(-1)!;
  }
  const distance = Math.hypot(end.x - start.x, end.y - start.y),
    count = chain ? Math.max(1, Math.round(distance / (LENGTH * Math.cos(STEP)))) : 1;
  const axis = Math.round(Math.atan2(end.y - start.y, end.x - start.x) / STEP) * STEP;
  for (let i = 0; i < Math.min(count, core.LIMIT); i++) {
    if ((element !== 'H' && core.heavyCount(draft) >= core.LIMIT) || draft.atoms.length >= 100)
      break;
    const angle = axis + (chain ? (i % 2 ? STEP : -STEP) : 0);
    const next = chain
      ? { x: start.x + LENGTH * Math.cos(angle), y: start.y + LENGTH * Math.sin(angle) }
      : destination(graph, start, end, scale);
    if ('id' in next && next.id !== undefined) return core.addBond(draft, start.id, next.id, order);
    if (draft.atoms.some((a) => Math.hypot(a.x - next.x, a.y - next.y) < 42)) break;
    draft = core.addAtom(draft, chain ? 'C' : element, next.x, next.y, start.id, chain ? 1 : order);
    start = draft.atoms.at(-1)!;
  }
  return draft;
}
export function applyTarget(
  graph: MoleculeGraph,
  target: MoleculeTarget | null,
  point: Point,
  element: MoleculeElement,
  erasing: boolean,
): MoleculeGraph {
  if (erasing) return target ? core.remove(graph, target) : graph;
  if (target?.kind === 'atom') return core.setElement(graph, target.id, element);
  if (target?.kind === 'bond') {
    const bond = graph.bonds.find(
      (b) => (b.a === target.a && b.b === target.b) || (b.b === target.a && b.a === target.b),
    );
    return bond
      ? core.setBond(graph, target.a, target.b, ((bond.order % 3) + 1) as 1 | 2 | 3)
      : graph;
  }
  if (graph.atoms.some((a) => Math.hypot(a.x - point.x, a.y - point.y) < 42)) return graph;
  return core.addAtom(graph, element, point.x, point.y);
}
