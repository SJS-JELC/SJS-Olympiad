import type { Answers, QuestionDefinition } from '../attempts';
import type { MoleculeGraph } from '../../contracts/molecule';
import { core } from '../../chemistry/molecule/engine';
import { parseMoleculeAnswer } from './moleculeAnswer';

/** Each key retains the two substituent pairs, rather than only a formula. */
const expectedMonomers = ['H,H=F,H', 'Cl,H=F,F', 'H,H=Cl,F', 'F,H=Cl,Cl']
  .map(key => key.split('=').sort().join('='))
  .sort().join('|');

export function matchesMonomers(graph: MoleculeGraph): boolean {
  // Reuse the source engine's closed-shell/valence checks before reading topology.
  if (core.validate(graph, true).kind !== 'valid' || graph.atoms.some(atom => atom.charge)) return false;
  const atoms = new Map(graph.atoms.map(atom => [atom.id, atom]));
  const unvisited = new Set(atoms.keys());
  const keys: string[] = [];
  while (unvisited.size) {
    const pending = [unvisited.values().next().value!];
    const component = new Set<number>();
    while (pending.length) {
      const id = pending.pop()!;
      if (component.has(id)) continue;
      component.add(id);
      unvisited.delete(id);
      core.neighbours(graph, id).forEach(edge => pending.push(edge.id));
    }
    if (keys.length === 4) return false;
    const carbons = [...component].map(id => atoms.get(id)!).filter(atom => atom.element === 'C');
    if (carbons.length !== 2) return false;
    const doubleBond = graph.bonds.find(bond =>
      (bond.a === carbons[0].id && bond.b === carbons[1].id) ||
      (bond.b === carbons[0].id && bond.a === carbons[1].id));
    if (doubleBond?.order !== 2) return false;
    const pairs: string[] = [];
    for (const carbon of carbons) {
      const substituents: string[] = Array.from({ length: core.hydrogens(graph, carbon) }, () => 'H');
      for (const edge of core.neighbours(graph, carbon.id)) {
        const neighbour = atoms.get(edge.id)!;
        if (neighbour.element === 'C') continue;
        if (!['H', 'F', 'Cl'].includes(neighbour.element) || edge.order !== 1 ||
          core.neighbours(graph, neighbour.id).length !== 1 || core.hydrogens(graph, neighbour) !== 0) return false;
        substituents.push(neighbour.element);
      }
      if (substituents.length !== 2) return false;
      pairs.push(substituents.sort().join(','));
    }
    // Every remaining vertex must be a terminal substituent of these carbons.
    if ([...component].some(id => !carbons.some(carbon => carbon.id === id) &&
      !core.neighbours(graph, id).some(edge => carbons.some(carbon => carbon.id === edge.id)))) return false;
    keys.push(pairs.sort().join('='));
  }
  return keys.length === 4 && keys.sort().join('|') === expectedMonomers;
}

export const u5p3Definition: QuestionDefinition = {
  id: 'U5P3', number: 3, title: 'Chainspotting', year: 'U5', points: 1, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'monomers', label: 'Alkene monomers', fields: [
    { id: 'drawing', label: 'Molecular drawing', acceptsEdit: value => parseMoleculeAnswer(value) !== null },
  ] }],
  evaluate: (answers: Answers) => {
    const state = parseMoleculeAnswer(answers.drawing);
    return { monomers: state !== null && matchesMonomers(state.graph) };
  },
};
