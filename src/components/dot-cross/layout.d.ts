import type { DotCrossState, DotCrossAnchor, Point } from './contracts';
type State = Omit<DotCrossState, 'kind'>;
type Atom = DotCrossState['atoms'][number];
export type ElectronRegion =
  | Readonly<{ kind: 'atom'; atomId: string }>
  | Readonly<{ kind: 'bond'; a: string; b: string }>;
export interface Layout {
  point(state: State, anchor: DotCrossAnchor): Point | null;
  targets(
    state: State,
    selected?: readonly string[],
    pair?: readonly string[],
    excludeElectron?: string,
  ): readonly Readonly<Point & { anchor: DotCrossAnchor }>[];
  key(anchor: DotCrossAnchor): string;
  bondPairs(state: State): readonly (readonly [string, string])[];
  nearbyPairs(state: State): readonly (readonly [string, string])[];
  chargeText(charge: number): string;
  shellRadius(atom: Atom | string): number;
  bondDistance(a: Atom | string, b: Atom | string): number;
  groupBounds(
    state: State,
    ids: readonly string[],
  ): { x: number; y: number; right: number; bottom: number } | null;
  regionAt(state: State, point: Point, excludeElectron?: string): DotCrossAnchor | null;
  freeAnchor(state: State, region: ElectronRegion, excludeElectron?: string): DotCrossAnchor | null;
  lensPath(a: Atom, b: Atom): string;
  regionData(anchor: ElectronRegion): ElectronRegion;
  regionKey(anchor: ElectronRegion | null): string;
}
export function createLayout(questionId?: string): Layout;
