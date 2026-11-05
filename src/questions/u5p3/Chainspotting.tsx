import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p3Definition } from './definition';
import { readMoleculeAnswer, serializeMoleculeAnswer } from './moleculeAnswer';
import { MoleculeEditor } from '../../components/molecule/MoleculeEditor';
import { PolymerDiagram } from './PolymerDiagram';
import './Chainspotting.css';

export interface ChainspottingPresentation extends PresentationPayload {renderer:'U5P3';paragraphs:string[];viewBox:string;representations:('displayed'|'skeletal')[];explicitHydrogensOnly:boolean;graph:import('../../contracts/molecule').MoleculeGraph;continuations:{x1:number;y1:number;x2:number;y2:number}[];diagramLabel:string;editorLabel:string;elements:import('../../contracts/molecule').MoleculeElement[];}
export function Chainspotting({ attempt, onAction, presentation }: QuestionViewProps) {
 const {record:{presentation:content}}=requirePresentation<ChainspottingPresentation>(presentation,'U5P3');
  const drawing = readMoleculeAnswer(attempt.answers);
  return <div className="question-content question-content--aligned u5p3-question" data-testid="u5p3-content">
    <section className="question-brief" aria-label="Question">
      <p>{content.paragraphs[0]}</p>
      <figure className="u5p3-diagram"><PolymerDiagram content={content} /></figure>
      <p>{content.paragraphs[1]}</p>
    </section>
    <QuestionAnswerForm definition={presentedDefinition(u5p3Definition,content)} attempt={attempt} onAction={onAction} layout="aligned" autoFocusAnswer={false} className="u5p3-form">
      {({ disabled, onEdit }) => <MoleculeEditor initialZoomOutSteps={2} value={drawing} readOnly={disabled}
        elements={content.elements} representations={content.representations} explicitHydrogensOnly={content.explicitHydrogensOnly}
        label={content.editorLabel} onChange={value => onEdit('drawing', serializeMoleculeAnswer(value))} />}
    </QuestionAnswerForm>
  </div>;
}
