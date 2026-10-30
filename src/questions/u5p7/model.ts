import type { MoleculeState } from '../../contracts/molecule';
import { assertMoleculeState, blankMolecule, type MoleculeLimits } from '../../chemistry/molecule/engine';

/** Legacy carbon-only snapshots remain readable; no saved record is rewritten on load. */
export type Atom = { id: number; x: number; y: number };
export type Bond = { a: number; b: number; order: 1 | 2 };
export type Graph = { atoms: Atom[]; bonds: Bond[] };
export type Drawing = { graphs: Graph[]; selected: number };
export const p7Limits: MoleculeLimits = { maxHeavyAtoms: 40, maxAtoms: 100, maxBonds: 150 };
export const blank = (): Drawing => ({ graphs: [{ atoms: [], bonds: [] }], selected: 0 });
export const valence = (g: Graph, id: number): number =>
  g.bonds.filter(b => b.a === id || b.b === id).reduce((n, b) => n + b.order, 0);

export function valid(g: Graph): boolean {
  return !!g && Array.isArray(g.atoms) && Array.isArray(g.bonds) &&
    Object.keys(g).every(key => ['atoms', 'bonds'].includes(key)) &&
    g.atoms.length <= 30 && g.bonds.length <= 60 &&
    g.atoms.every(a => !!a && Object.keys(a).every(key => ['id', 'x', 'y'].includes(key)) &&
      Number.isInteger(a.id) && Number.isFinite(a.x) && Number.isFinite(a.y)) &&
    new Set(g.atoms.map(a => a.id)).size === g.atoms.length &&
    g.bonds.every(b => !!b && Object.keys(b).every(key => ['a', 'b', 'order'].includes(key)) && [1, 2].includes(b.order) && b.a !== b.b &&
      g.atoms.some(a => a.id === b.a) && g.atoms.some(a => a.id === b.b)) &&
    new Set(g.bonds.map(b => [b.a, b.b].sort((a, b) => a - b).join(':'))).size === g.bonds.length &&
    g.atoms.every(a => valence(g, a.id) <= 4);
}

export function parseLegacyDrawing(value: unknown): Drawing | null {
  const d = value as Drawing;
  return d && Array.isArray(d.graphs) && d.graphs.length > 0 && d.graphs.length <= 20 &&
    d.graphs.every(valid) && Number.isInteger(d.selected) && d.selected >= 0 && d.selected < d.graphs.length ? d : null;
}

/** Compatibility helper for old callers. Marking never uses this blank fallback. */
export function read(value?: string): Drawing {
  try { return parseLegacyDrawing(JSON.parse(value ?? '')) ?? blank(); } catch { return blank(); }
}

export type P7Drawing =
  | { kind: 'editable'; state: MoleculeState }
  | { kind: 'legacy-readonly'; drawing: Drawing };

function convertLegacy(drawing: Drawing): MoleculeState | null {
  const atoms: { id: number; element: 'C'; x: number; y: number }[] = [];
  const bonds: Bond[] = [];
  let offset = 0;
  for (const g of drawing.graphs) {
    if (!g.atoms.length) continue;
    const ids = new Map(g.atoms.map((a, i) => [a.id, atoms.length + i]));
    const left = Math.min(...g.atoms.map(a => a.x)), right = Math.max(...g.atoms.map(a => a.x));
    const top = Math.min(...g.atoms.map(a => a.y)), bottom = Math.max(...g.atoms.map(a => a.y));
    const centreY = top / 2 + bottom / 2;
    atoms.push(...g.atoms.map(a => ({ id: ids.get(a.id)!, element: 'C' as const,
      x: a.x - left + offset, y: a.y - centreY })));
    bonds.push(...g.bonds.map(b => ({ ...b, a: ids.get(b.a)!, b: ids.get(b.b)! })));
    offset += right - left + 148;
  }
  try { return assertMoleculeState({ kind: 'molecule', graph: { atoms, bonds }, history: [] }, p7Limits); }
  catch { return null; }
}

export function parseP7Drawing(serialized: unknown): P7Drawing | null {
  // Local bounded undo is deliberately larger than the compact transport budget.
  // CloudQuestion removes history before either network boundary sees the value.
  if (typeof serialized !== 'string' || !serialized.length || serialized.length > 2_000_000) return null;
  try {
    const value = JSON.parse(serialized);
    if (value?.kind === 'molecule') return { kind: 'editable', state: assertMoleculeState(value, p7Limits) };
    const legacy = parseLegacyDrawing(value);
    if (!legacy) return null;
    const state = convertLegacy(legacy);
    return state ? { kind: 'editable', state } : { kind: 'legacy-readonly', drawing: legacy };
  } catch { return null; }
}

export const readP7Drawing = (value?: string): P7Drawing =>
  parseP7Drawing(value) ?? { kind: 'editable', state: blankMolecule() };
export const serializeP7Drawing = (state: MoleculeState): string => JSON.stringify(assertMoleculeState(state, p7Limits));
