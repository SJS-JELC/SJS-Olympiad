import type { MoleculeState } from '../../contracts/molecule';
import { assertMoleculeState, blankMolecule } from '../../chemistry/molecule/engine';
import type { Answers } from '../attempts';

/** Strict submission boundary; never reinterpret a malformed answer as a drawing. */
export function parseMoleculeAnswer(serialized: unknown): MoleculeState | null {
  if (typeof serialized !== 'string' || !serialized.length || serialized.length > 2_000_000) return null;
  try {
    return assertMoleculeState(JSON.parse(serialized));
  } catch {
    return null;
  }
}

/** A damaged/absent draft opens an empty editor, but is still rejected by marking. */
export const readMoleculeAnswer = (answers: Answers): MoleculeState =>
  parseMoleculeAnswer(answers.drawing) ?? blankMolecule();

export const serializeMoleculeAnswer = (state: MoleculeState): string =>
  JSON.stringify(assertMoleculeState(state));
