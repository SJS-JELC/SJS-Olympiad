/** Molecular semantic state adapted from Masters of Chemistry; see component provenance. */
export interface Point { readonly x:number; readonly y:number; }
export type MoleculeElement = 'C' | 'O' | 'N' | 'Cl' | 'F' | 'H';
export interface MoleculeAtom extends Point {
  readonly id: number;
  readonly element: MoleculeElement;
  readonly charge?: -1 | 0 | 1;
  readonly h?: 0 | 1 | 2 | 3 | 4;
  readonly pairs?: readonly number[];
  readonly dipole?: -1 | 1;
  readonly chargeAngle?: number;
  readonly dipoleAngle?: number;
}
export type MoleculeAnchor =
  | Readonly<{ kind: 'bond'; a: number; b: number }>
  | Readonly<{ kind: 'atom' | 'charge'; id: number }>
  | Readonly<{ kind: 'pair'; id: number; index?: number }>;
/** Optional annotation data is preserved; mechanism prototype is not registered. */
export interface MoleculeGraph {
  readonly atoms: readonly MoleculeAtom[];
  readonly bonds: readonly Readonly<{ a: number; b: number; order: 1 | 2 | 3 }>[];
  readonly arrows?: readonly Readonly<{
    id: number;
    from: MoleculeAnchor;
    to: MoleculeAnchor;
    bend: number;
  }>[];
}
export interface MoleculeState {
  readonly kind: 'molecule';
  readonly graph: MoleculeGraph;
  readonly history: readonly MoleculeGraph[]; // bounded to 100 semantic edits
}
export interface ChemicalIssue {
  readonly code: string;
  readonly message: string;
  readonly objectIds: readonly (string | number)[];
}
export type EditorValidation =
  | Readonly<{ valid: true }>
  | Readonly<{ valid: false; issues: readonly ChemicalIssue[] }>;
/** Integrity/completion can block submission; chemical wrongness remains assessable. */
export type EditorSubmissionCheck =
  | Readonly<{ status: 'ready'; chemicalIssues: readonly ChemicalIssue[] }>
  | Readonly<{ status: 'incomplete' | 'malformed'; issues: readonly ChemicalIssue[] }>;

export interface MoleculeEngine<Command> {
 readonly kind:'molecule';
 readonly apply:(state:MoleculeState,command:Command)=>MoleculeState;
 readonly checkSubmission:(state:MoleculeState)=>EditorSubmissionCheck;
 readonly validate:(state:MoleculeState)=>EditorValidation;
}
