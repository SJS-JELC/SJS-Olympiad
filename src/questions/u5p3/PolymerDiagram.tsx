import { Structure } from '../../components/molecule/Structure';
import type { ChainspottingPresentation } from './Chainspotting';
import '../../components/molecule/molecule.css';

export function PolymerDiagram({content}:{content:ChainspottingPresentation}) {
  return <svg viewBox={content.viewBox} className="u5p3-diagram-diagram molecule-structure" role="img"
    aria-label={content.diagramLabel}>
    <g className="molecule-bonds">{content.continuations.map((line, index) =>
      <line key={index} className="bond-line" {...line} />)}</g>
    <Structure graph={content.graph} view="displayed" />
  </svg>;
}
