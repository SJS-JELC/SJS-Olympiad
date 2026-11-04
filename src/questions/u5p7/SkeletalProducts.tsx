import { Structure } from '../../components/molecule/Structure';
import { productGraphs } from './productGraphs';

export function SkeletalProducts() {
  return <svg className="cut-skeletal-products" viewBox="0 25 670 250" role="img"
    aria-label="Ozonolysis products: one methanal molecule, H2C=O, and the skeletal structure OHC-CH2-CH[C(=O)CH3]-CH2-CH2-C(=O)-CH3. Unlabelled corners and line ends are carbon atoms; hydrogens bonded to carbon are implied.">
    <g data-product="methanal"><Structure graph={productGraphs[0]} view="skeletal" /></g>
    <g data-product="nine-carbon-fragment"><Structure graph={productGraphs[1]} view="skeletal" /></g>
  </svg>;
}
