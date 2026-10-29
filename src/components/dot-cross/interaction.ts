/** Source algorithms from both original dot-and-cross/app.js, without page state or persistence. */
import type { DotCrossElement, DotCrossState, Point } from './contracts';
import type { Layout } from './layout.js';
export interface CanvasBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}
export const bound = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function clampPoint(point: Point, bounds: CanvasBounds): Point {
  return {
    x: bound(point.x, bounds.left, bounds.right),
    y: bound(point.y, bounds.top, bounds.bottom),
  };
}
export function adaptiveView(width: number, height: number) {
  const w = Math.max(560, width * 0.95),
    h = (w * height) / Math.max(1, width);
  return { x: 500 - w / 2, y: 325 - h / 2, width: w, height: h };
}
export function snapPoint(
  state: DotCrossState,
  point: Point,
  exclude: readonly string[],
  element: DotCrossElement,
  layout: Layout,
  bounds: CanvasBounds,
): Point {
  const p = clampPoint(point, bounds),
    movingGroup = state.groups.find(
      (g) => g.bracket && g.atomIds.some((id) => exclude.includes(id)),
    );
  const others = state.atoms.filter((a) => !exclude.includes(a.id));
  const candidates = others
    .flatMap((a) => {
      const group = state.groups.find((g) => g.bracket && g.atomIds.includes(a.id));
      if (movingGroup && group && movingGroup.id !== group.id) return [];
      const d = Math.hypot(p.x - a.x, p.y - a.y),
        bondLength = layout.bondDistance(element, a);
      if (d < 35 || d > bondLength + 60) return [];
      const angle = (Math.round(Math.atan2(p.y - a.y, p.x - a.x) / (Math.PI / 6)) * Math.PI) / 6;
      const target = {
        x: a.x + bondLength * Math.cos(angle),
        y: a.y + bondLength * Math.sin(angle),
      };
      if (
        target.x < bounds.left ||
        target.x > bounds.right ||
        target.y < bounds.top ||
        target.y > bounds.bottom
      )
        return [];
      if (others.some((other) => Math.hypot(target.x - other.x, target.y - other.y) < 45))
        return [];
      return [{ ...target, d: Math.hypot(target.x - p.x, target.y - p.y) }];
    })
    .sort((a, b) => a.d - b.d);
  return candidates.length ? { x: candidates[0]!.x, y: candidates[0]!.y } : p;
}
export function connectedAtoms(state: DotCrossState, atomId: string): readonly string[] {
  const ids = new Set([atomId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const electron of state.electrons) {
      const a = electron.anchor;
      if (a.kind === 'bond' && (ids.has(a.a) || ids.has(a.b)))
        for (const id of [a.a, a.b])
          if (!ids.has(id)) {
            ids.add(id);
            changed = true;
          }
    }
  }
  return [...ids];
}
export interface ChargeDestination {
  readonly atomIds: readonly string[];
  readonly bracket: boolean;
}
export function chargeDestination(
  state: DotCrossState,
  point: Point,
  layout: Layout,
  hit: { atomId?: string | undefined; groupId?: string | undefined } = {},
): ChargeDestination | null {
  const existing = state.groups.find((g) => g.id === hit.groupId);
  if (existing)
    return {
      atomIds: [...existing.atomIds],
      bracket: existing.bracket || connectedAtoms(state, existing.atomIds[0]!).length === 1,
    };
  const atom =
    state.atoms.find((a) => a.id === hit.atomId) ||
    state.atoms
      .map((a) => ({ ...a, d: Math.hypot(point.x - a.x, point.y - a.y) }))
      .sort((a, b) => a.d - b.d)
      .find((a) => a.d <= layout.shellRadius(a) + 12);
  if (atom) {
    const ids = connectedAtoms(state, atom.id),
      local = ids.length > 1 && Math.hypot(point.x - atom.x, point.y - atom.y) <= 25;
    return { atomIds: local ? [atom.id] : ids, bracket: !local };
  }
  const group = state.groups.find((g) => {
    const b = layout.groupBounds(state, g.atomIds);
    return b && point.x >= b.x && point.x <= b.right + 28 && point.y >= b.y && point.y <= b.bottom;
  });
  return group ? { atomIds: [...group.atomIds], bracket: group.bracket } : null;
}
export function dragDelta(
  state: DotCrossState,
  ids: readonly string[],
  atomId: string,
  raw: Point,
  wholeGroup: boolean,
  layout: Layout,
  bounds: CanvasBounds,
): Point {
  const initial = state.atoms.find((a) => a.id === atomId);
  if (!initial) return { x: 0, y: 0 };
  const dest = wholeGroup
      ? clampPoint(raw, bounds)
      : snapPoint(state, raw, ids, initial.element, layout, bounds),
    moving = state.atoms.filter((a) => ids.includes(a.id));
  return {
    x: bound(
      dest.x - initial.x,
      bounds.left - Math.min(...moving.map((a) => a.x)),
      bounds.right - Math.max(...moving.map((a) => a.x)),
    ),
    y: bound(
      dest.y - initial.y,
      bounds.top - Math.min(...moving.map((a) => a.y)),
      bounds.bottom - Math.max(...moving.map((a) => a.y)),
    ),
  };
}
