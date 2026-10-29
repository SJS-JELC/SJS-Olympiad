/** Source label, bond clipping and fit geometry from molecule-builder/editor.js. */
import type { MoleculeAtom, MoleculeGraph, Point } from '../../contracts/molecule';
import core from './core.js';
export type Representation = 'skeletal' | 'structural' | 'displayed';
export type Measure = (text: string, size: number) => number;
/** Depiction-only hydrogens have negative IDs and never enter saved state or marking. */
export function displayedGraph(graph: MoleculeGraph): MoleculeGraph {
  const atoms = [...graph.atoms], bonds = [...graph.bonds];
  let id = -1;
  for (const atom of graph.atoms) {
    const occupied = core.neighbours(graph, atom.id).map(edge => {
      const next = graph.atoms.find(a => a.id === edge.id)!;
      return Math.atan2(next.y - atom.y, next.x - atom.x);
    });
    for (let h = 0; h < Math.max(0, core.hydrogens(graph, atom)); h++) {
      const angles = Array.from({length: 12}, (_, i) => i * Math.PI / 6 - Math.PI / 2);
      const separation = (angle: number) => occupied.length
        ? Math.min(...occupied.map(other => Math.acos(Math.cos(angle - other))))
        : Math.PI;
      const angle = angles.reduce((best, candidate) => separation(candidate) > separation(best) + 0.001 ? candidate : best);
      occupied.push(angle);
      atoms.push({id, element: 'H', x: atom.x + 48 * Math.cos(angle), y: atom.y + 48 * Math.sin(angle)});
      bonds.push({a: atom.id, b: id, order: 1});
      id--;
    }
  }
  return { ...graph, atoms, bonds };
}
export function labelFor(
  atom: MoleculeAtom,
  graph: MoleculeGraph,
  view: Representation,
  measure: Measure,
) {
  const hs = view === 'displayed' ? 0 : core.hydrogens(graph, atom),
    edges = core.neighbours(graph, atom.id);
  if (view === 'skeletal' && atom.element === 'C' && edges.length && !atom.charge) return null;
  const left =
    (['O', 'Cl', 'F'].includes(atom.element) && !edges.length) ||
    (edges.length > 0 &&
      edges.reduce((n, e) => n + graph.atoms.find((a) => a.id === e.id)!.x - atom.x, 0) > 8);
  const h = hs > 0 ? 'H' : '',
    sub = hs > 1 ? String(hs) : '';
  const chunks = left
    ? [
        { text: h, sub: false },
        { text: sub, sub: true },
        { text: atom.element, sub: false },
      ]
    : [
        { text: atom.element + h, sub: false },
        { text: sub, sub: true },
      ];
  const width = chunks.reduce((n, c) => n + measure(c.text, c.sub ? 14 : 23), 0),
    elementWidth = measure(atom.element, 23);
  const x = left ? atom.x + elementWidth / 2 - width : atom.x - elementWidth / 2;
  return {
    chunks,
    x,
    width,
    box: { left: x - 5, right: x + width + 5, top: atom.y - 15, bottom: atom.y + 17 },
  };
}
export function endpoint(from: Point, to: Point, label: ReturnType<typeof labelFor>): Point {
  if (!label) return from;
  const dx = to.x - from.x,
    dy = to.y - from.y,
    b = label.box;
  const tx = dx > 0 ? (b.right - from.x) / dx : dx < 0 ? (b.left - from.x) / dx : Infinity,
    ty = dy > 0 ? (b.bottom - from.y) / dy : dy < 0 ? (b.top - from.y) / dy : Infinity;
  const t = Math.min(tx, ty, 0.44);
  return { x: from.x + dx * t, y: from.y + dy * t };
}
export function bondLines(from: Point, to: Point, order: number) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy) || 1;
  return (order === 3 ? [-5, 0, 5] : order === 2 ? [-3.2, 3.2] : [0]).map((offset) => ({
    x1: from.x - (dy / length) * offset,
    y1: from.y + (dx / length) * offset,
    x2: to.x - (dy / length) * offset,
    y2: to.y + (dx / length) * offset,
  }));
}
export function drawingViewBox(graph: MoleculeGraph, w: number, h: number, drawingScale = 0.55) {
  const extentX = Math.max(w / 2, ...graph.atoms.map((a) => Math.abs(a.x) + 85)),
    extentY = Math.max(h / 2, ...graph.atoms.map((a) => Math.abs(a.y) + 65));
  const scale = Math.max(1 / drawingScale, (extentX * 2) / w, (extentY * 2) / h);
  return { x: (-w * scale) / 2, y: (-h * scale) / 2, w: w * scale, h: h * scale };
}
export function thumbnailViewBox(graph: MoleculeGraph) {
  const xs = graph.atoms.map((a) => a.x),
    ys = graph.atoms.map((a) => a.y);
  const x = Math.min(...xs) - 48,
    y = Math.min(...ys) - 35,
    w = Math.max(...xs) - x + 48,
    h = Math.max(...ys) - y + 35;
  return graph.atoms.length ? `${x} ${y} ${w} ${h}` : '-100 -80 200 160';
}
