import type { MoleculeGraph, MoleculeState } from '../../../src/contracts/molecule';
import type { MoleculeLimits } from '../../../src/chemistry/molecule/core.js';
export function assertMoleculeGraph(value:unknown, limits?:MoleculeLimits):MoleculeGraph;
export function assertMoleculeState(value:unknown, limits?:MoleculeLimits):MoleculeState;
export function parseMoleculeAnswer(value:unknown, limits?:MoleculeLimits):MoleculeState|null;
