import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { MoleculeEditor } from '../../components/molecule/MoleculeEditor';
import { Structure } from '../../components/molecule/Structure';
import { SkeletalProducts } from './SkeletalProducts';
import { u5p7 } from './definition';
import { p7Limits, readP7Drawing, serializeP7Drawing, type Drawing } from './model';
import './U5Problem7.css';

/** An unusually large old draft stays intact instead of disappearing into a blank canvas. */
function LegacyDrawingPreview({ drawing }: { drawing: Drawing }) {
  return <section className="u5p9-legacy" aria-label="Saved molecular drawings">
    <p className="type-caption" role="status">Your saved structures exceed the canvas limit and are shown read-only. They have been preserved.</p>
    <div className="u5p9-legacy-grid">{drawing.graphs.filter(g => g.atoms.length).map((g, index) => {
      const left = Math.min(...g.atoms.map(a => a.x)) - 45, top = Math.min(...g.atoms.map(a => a.y)) - 35;
      const width = Math.max(...g.atoms.map(a => a.x)) - left + 45, height = Math.max(...g.atoms.map(a => a.y)) - top + 35;
      return <svg key={index} viewBox={`${left} ${top} ${width} ${height}`} role="img" aria-label={`Saved structure ${index + 1}`}>
        <Structure graph={{ atoms: g.atoms.map(atom => ({ ...atom, element: 'C' as const })), bonds: g.bonds }} view="skeletal" />
      </svg>;
    })}</div>
  </section>;
}

export interface CutPresentation extends PresentationPayload {renderer:'U5P9';paragraphs:string[];viewBox:string;representations:('displayed'|'skeletal')[];graphs:import('../../contracts/molecule').MoleculeGraph[];diagramLabel:string;editorLabel:string;elements:import('../../contracts/molecule').MoleculeElement[];}
export function U5Problem7({ attempt, onAction, presentation }: QuestionViewProps) {
 const {record:{presentation:content}}=requirePresentation<CutPresentation>(presentation,'U5P9');
  const drawing = readP7Drawing(attempt.answers.drawings);
  return <div className="question-content question-content--aligned u5p9-question" data-testid="u5p9-content">
    <section className="question-brief" aria-label="Question">
      <div className="u5p9-prompt">
        <p>{content.paragraphs[0]}</p>
        <p>{content.paragraphs[1]}</p>
        <p>{content.paragraphs[2]}</p>
        <p>{content.paragraphs[3]}</p>
      </div>
      <figure className="u5p9-products"><SkeletalProducts content={content} /></figure>
    </section>
    <QuestionAnswerForm definition={presentedDefinition(u5p7,content)} attempt={attempt} onAction={onAction} layout="aligned" autoFocusAnswer={false} className="u5p9-form">
      {({ disabled, onEdit }) => drawing.kind === 'legacy-readonly' ? <LegacyDrawingPreview drawing={drawing.drawing} /> :
        <MoleculeEditor value={drawing.state} readOnly={disabled} limits={p7Limits}
          elements={content.elements} representations={content.representations} initialZoomOutSteps={2}
          label={content.editorLabel} onChange={state => onEdit('drawings', serializeP7Drawing(state))} />}
    </QuestionAnswerForm>
  </div>;
}
