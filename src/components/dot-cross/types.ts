import type { DotCrossState, Level } from './contracts';
export interface BankRecord {
  readonly id: string;
  readonly name: string;
  readonly formula: string;
  readonly displayFormula: string;
  readonly totalCharge: number;
  readonly namedSpecies: boolean;
  readonly category: string;
  readonly practiceCategory: 'ionic' | 'covalent';
  readonly extension: boolean;
  readonly scope: string;
  readonly grades: readonly Level[];
  readonly prompt: string;
  readonly explanation: string;
  readonly sourceRefs: readonly string[];
  readonly reference: Omit<DotCrossState, 'kind'>;
  readonly marking: Readonly<Record<string, unknown>>;
  readonly atlasEvidence:
    | readonly Readonly<{
        questionId: string;
        observedBand: string;
        basis: string;
        relationship: string;
      }>[]
    | null;
}
export interface CheckCriterion {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
  readonly message: string;
  readonly objectIds: readonly string[];
}
export interface CheckResult {
  readonly correct: boolean;
  readonly criteria: readonly CheckCriterion[];
  readonly errors?: readonly string[];
}
export type DotCrossDraftState = DotCrossState;
