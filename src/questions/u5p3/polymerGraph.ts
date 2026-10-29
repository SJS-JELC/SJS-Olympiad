import type { MoleculeAtom, MoleculeElement, MoleculeGraph } from '../../contracts/molecule';

/** Artist SVG, carbon by carbon from left to right; each pair is left/right on the page.
 * The first carbon points down, and successive carbons alternate up/down.
 * This is the complete illustrated sequence, not an arbitrary repeating unit.
 */
export const polymerSubstituentSequence: readonly (readonly [MoleculeElement, MoleculeElement])[] = [
  ['Cl', 'Cl'], ['H', 'H'], ['H', 'F'], ['H', 'Cl'], ['F', 'F'], ['F', 'Cl'],
  ['H', 'H'], ['H', 'F'], ['H', 'H'], ['F', 'H'], ['Cl', 'Cl'], ['F', 'F'],
  ['H', 'Cl'], ['Cl', 'Cl'], ['F', 'H'], ['H', 'H'], ['F', 'Cl'], ['H', 'Cl'],
  ['F', 'F'], ['H', 'F'], ['H', 'H'], ['Cl', 'Cl'],
];

const atoms: MoleculeAtom[] = [];
const bonds: { a: number; b: number; order: 1 }[] = [];
for (let index = 0; index < polymerSubstituentSequence.length; index++) {
  const id = index * 3 + 1;
  const x = 45 + index * 50;
  const down = index % 2 === 0;
  const y = down ? 70 : 50;
  // Explicit H labels preserve the artwork; h:0 avoids manufacturing end-group H.
  atoms.push({ id, element: 'C', x, y, h: 0 });
  polymerSubstituentSequence[index].forEach((element, side) => {
    atoms.push({ id: id + side + 1, element, x: x + (side === 0 ? -15 : 15), y: down ? 117 : 3, h: 0 });
    bonds.push({ a: id, b: id + side + 1, order: 1 });
  });
  if (index > 0) bonds.push({ a: id - 3, b: id, order: 1 });
}

/** Read-only depiction, including every original atom/bond; not an editor answer. */
export const polymerGraph: MoleculeGraph = { atoms, bonds };
export const polymerContinuations = [
  { x1: 7, y1: 48, x2: 31, y2: 62 },
  { x1: 1109, y1: 58, x2: 1133, y2: 72 },
] as const;
