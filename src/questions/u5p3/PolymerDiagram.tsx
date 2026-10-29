import { Structure } from '../../components/molecule/Structure';
import { polymerContinuations, polymerGraph } from './polymerGraph';
import '../../components/molecule/molecule.css';

export function PolymerDiagram() {
  return <svg viewBox="0 -10 1140 140" className="u5p3-polymer-diagram molecule-structure" role="img"
    aria-label="Section of an addition polymer, with all carbon, hydrogen, fluorine and chlorine atoms displayed">
    <g className="molecule-bonds">{polymerContinuations.map((line, index) =>
      <line key={index} className="bond-line" {...line} />)}</g>
    <Structure graph={polymerGraph} view="displayed" />
  </svg>;
}
