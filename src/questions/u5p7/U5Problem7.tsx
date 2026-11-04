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
  return <section className="cut-legacy" aria-label="Saved molecular drawings">
    <p className="type-caption" role="status">Your saved structures exceed the canvas limit and are shown read-only. They have been preserved.</p>
    <div className="cut-legacy-grid">{drawing.graphs.filter(g => g.atoms.length).map((g, index) => {
      const left = Math.min(...g.atoms.map(a => a.x)) - 45, top = Math.min(...g.atoms.map(a => a.y)) - 35;
      const width = Math.max(...g.atoms.map(a => a.x)) - left + 45, height = Math.max(...g.atoms.map(a => a.y)) - top + 35;
      return <svg key={index} viewBox={`${left} ${top} ${width} ${height}`} role="img" aria-label={`Saved structure ${index + 1}`}>
        <Structure graph={{ atoms: g.atoms.map(atom => ({ ...atom, element: 'C' as const })), bonds: g.bonds }} view="skeletal" />
      </svg>;
    })}</div>
  </section>;
}

export function U5Problem7({ attempt, onAction }: QuestionViewProps) {
  const drawing = readP7Drawing(attempt.answers.drawings);
  return <div className="question-content question-content--aligned cut-question" data-testid="u5p9-content">
    <section className="question-brief" aria-label="Question">
      <div className="cut-prompt">
        <p>Ozonolysis cuts a C=C bond and replaces it with two C=O bonds. The attached groups stay in place; cutting a double bond in a ring can open the ring.</p>
        <p>X has formula C₁₀H₁₆, two C=C bonds and no triple bonds. Cutting both double bonds gives one molecule of each product shown.</p>
        <p>In skeletal formulae, each unlabelled corner or line end is a carbon atom. Hydrogens on carbon are implied to give each carbon four bonds; other atoms are labelled.</p>
        <p>Draw all possible structures of X using skeletal formulae.</p>
      </div>
      <figure className="cut-products"><SkeletalProducts /></figure>
    </section>
    <QuestionAnswerForm definition={u5p7} attempt={attempt} onAction={onAction} layout="aligned" autoFocusAnswer={false} className="cut-form">
      {({ disabled, onEdit }) => drawing.kind === 'legacy-readonly' ? <LegacyDrawingPreview drawing={drawing.drawing} /> :
        <MoleculeEditor value={drawing.state} readOnly={disabled} limits={p7Limits}
          elements={['C', 'H', 'O']} representations={['skeletal']} initialZoomOutSteps={2}
          label="Structures of X" onChange={state => onEdit('drawings', serializeP7Drawing(state))} />}
    </QuestionAnswerForm>
  </div>;
}
