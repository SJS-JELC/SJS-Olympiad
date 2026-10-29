import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p9, pointGroupOptions } from './definition';
import './U6Problem9.css';

const operations = [
  ['E', 'Identity – do nothing.'],
  ['C₂', 'Rotate the molecule 180° about a particular line.'],
  ['C₃', 'Rotate the molecule 120° and 240° about a particular axis.'],
  ['σᵥ', 'A mirror plane that contains the highest-order rotation axis.'],
  ['σₕ', 'A mirror plane perpendicular to the highest-order rotation axis.'],
  ['i', 'Inversion – from a central point, every atom has an identical partner the same distance away in the opposite direction.'],
];
export function U6Problem9({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact u6p9-question" data-testid="u6p9-content">
    <section className="question-brief" aria-label="Question and symmetry operations">
      <p>The symmetry of molecules is especially important to spectroscopy. Different molecules can be classified by how symmetrical they are. Molecules that share the same symmetry operations can be grouped into groups called point groups. Choose the right point group for each molecule below.</p>
      <h2 className="type-heading text-heading-small">Symmetry Operations</h2>
      <p>(a molecule has this symmetry operation if it is unchanged after this is applied to it)</p>
      <dl className="u6p9-operations type-body">{operations.map(([symbol, description]) => <div key={symbol}><dt>{symbol}</dt><dd>{description}</dd></div>)}</dl>
    </section>
    <QuestionAnswerForm layout="inline" definition={u6p9} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p9-selections">{u6p9.parts.map(part => <label key={part.id} className="type-label" htmlFor={'u6p9-' + part.id}>
        <span>{part.label}</span><select id={'u6p9-' + part.id} name={part.id} disabled={disabled} value={attempt.answers[part.id] ?? ''}
          onChange={event => onEdit(part.id, event.target.value)}>
          <option value="">Select a point group</option>{pointGroupOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>)}</div>}
    </QuestionAnswerForm>
  </div>;
}
