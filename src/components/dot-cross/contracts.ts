/** Editor state describes chemical/user data, never DOM nodes or serialized pages. */
export interface Point {
  readonly x: number;
  readonly y: number;
}
export type OrbitalSpin = 0 | 1 | 2 | 3; // empty, up, down, opposite-spin pair
export type SubshellValues<T> = readonly [T, T, T, T, T, T, T, T]; // 1s through 4p
export interface ElectronConfigurationState {
  readonly kind: 'electron-configuration';
  readonly counts: SubshellValues<string>;
  readonly core: string;
  readonly boxes: SubshellValues<readonly OrbitalSpin[]>;
  readonly identity: string;
  readonly selectedSpeciesIds: readonly string[];
}
export type DotCrossElement =
  | 'H'
  | 'B'
  | 'C'
  | 'Si'
  | 'N'
  | 'O'
  | 'P'
  | 'S'
  | 'F'
  | 'Cl'
  | 'Br'
  | 'I'
  | 'Li'
  | 'K'
  | 'Na'
  | 'Mg'
  | 'Ca'
  | 'Al';
export type ElectronSymbol = 'dot' | 'cross' | 'triangle';
export type DotCrossAnchor =
  | Readonly<{ kind: 'atom'; atomId: string; slot: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 }>
  | Readonly<{ kind: 'bond'; a: string; b: string; slot: 0 | 1 | 2 | 3 | 4 | 5 }>;
export interface DotCrossSnapshot {
  readonly kind: 'dot-and-cross';
  readonly atoms: readonly (Point & Readonly<{ id: string; element: DotCrossElement }>)[];
  readonly electrons: readonly Readonly<{
    id: string;
    symbol: ElectronSymbol;
    anchor: DotCrossAnchor;
  }>[];
  readonly groups: readonly Readonly<{
    id: string;
    atomIds: readonly string[];
    charge: number;
    bracket: boolean;
  }>[];
}
export interface DotCrossState extends DotCrossSnapshot {
  /** Display preference only; absent historic drafts show circles. Not chemical history. */
  readonly circles?: boolean;
  /** Semantic snapshots only, bounded to 100. Snapshots cannot contain history. */
  readonly history?: readonly DotCrossSnapshot[];
  readonly future?: readonly DotCrossSnapshot[];
}

export type Level = string;
export interface EditorEngine<K, C> {
 kind: K; apply:(state:DotCrossState,command:C)=>DotCrossState;
 checkSubmission:(state:DotCrossState)=>unknown;
 validate:(state:DotCrossState)=>unknown;
}
