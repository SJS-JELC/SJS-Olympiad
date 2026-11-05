import { Structure } from '../../components/molecule/Structure';
import type { CutPresentation } from './U5Problem7';

export function SkeletalProducts({content}:{content:CutPresentation}) {
  return <svg className="u5p9-structures" viewBox={content.viewBox} role="img"
    aria-label={content.diagramLabel}>
    <g data-product="product-1"><Structure graph={content.graphs[0]} view="skeletal" /></g>
    <g data-product="product-2"><Structure graph={content.graphs[1]} view="skeletal" /></g>
  </svg>;
}
