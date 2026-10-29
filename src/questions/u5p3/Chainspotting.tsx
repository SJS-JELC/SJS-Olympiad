import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p3Definition } from './definition';
import { readMoleculeAnswer, serializeMoleculeAnswer } from './moleculeAnswer';
import { MoleculeEditor } from '../../components/molecule/MoleculeEditor';
import { PolymerDiagram } from './PolymerDiagram';
import './Chainspotting.css';

export function Chainspotting({ attempt, onAction }: QuestionViewProps) {
  const drawing = readMoleculeAnswer(attempt.answers);
  return <div className="question-content question-content--aligned u5p3-question" data-testid="u5p3-content">
    <section className="question-brief" aria-label="Question">
      <p>A section of an addition polymer is shown below.</p>
      <figure className="u5p3-polymer"><PolymerDiagram /></figure>
      <p>This section was made from the fewest possible number of different alkene monomers. Decide how many and show the monomers below.</p>
    </section>
    <QuestionAnswerForm definition={u5p3Definition} attempt={attempt} onAction={onAction} layout="aligned" autoFocusAnswer={false} className="u5p3-form">
      {({ disabled, onEdit }) => <MoleculeEditor value={drawing} readOnly={disabled}
        elements={['C', 'H', 'F', 'Cl']} representations={['displayed']} explicitHydrogensOnly
        label="Alkene monomers" onChange={value => onEdit('drawing', serializeMoleculeAnswer(value))} />}
    </QuestionAnswerForm>
  </div>;
}
