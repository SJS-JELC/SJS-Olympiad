import type { MoleculeGraph } from '../../contracts/molecule';
import source from './assets/ozonolysis-products.source.json';

// Presentation-only positions keyed by the original fixed product atom IDs.
// Neither molecular connectivity nor any answer graph is defined here.
const positions: Readonly<Record<number, readonly [number, number]>> = {
  9: [110, 145], 13: [170, 145],
  0: [300, 150], 1: [352, 120], 2: [404, 150], 3: [456, 120],
  4: [508, 150], 5: [560, 120], 6: [612, 150],
  7: [404, 210], 8: [456, 240],
  10: [248, 120], 11: [352, 240], 12: [560, 60],
};
export const productGraphs: readonly MoleculeGraph[] = source.products.map(product => ({
  atoms: product.atoms.map(atom => {
    const [x, y] = positions[atom.id];
    if (atom.element !== 'C' && atom.element !== 'O') throw new Error('Unexpected product element');
    return { id: atom.id, element: atom.element, x, y };
  }),
  bonds: product.bonds.map(bond => {
    if (bond.order !== 1 && bond.order !== 2) throw new Error('Unexpected product bond');
    return { ...bond, order: bond.order };
  }),
}));
