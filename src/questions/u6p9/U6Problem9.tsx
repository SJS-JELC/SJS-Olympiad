export interface U6P9Presentation extends PresentationPayload { renderer:'U6P9';text:string[];operations:[string,string][];options:string[]; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p9 } from './definition';
import './U6Problem9.css';


export function U6Problem9({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content}}=requirePresentation<U6P9Presentation>(presentation,'U6P9');
  const presented=presentedDefinition(u6p9,content);
  const definition={...presented,parts:presented.parts.map(part=>({...part,fields:part.fields.map(field=>({...field,acceptsEdit:(value:string)=>value===''||content.options.includes(value)}))}))};
  return <div className="question-content question-content--compact u6p9-question" data-testid="u6p9-content">
    <section className="question-brief" aria-label={content.text[0]}>
      <p>{content.text[1]}</p>
      <h2 className="type-heading text-heading-small">{content.text[2]}</h2>
      <p>{content.text[3]}</p>
      <dl className="u6p9-operations type-body">{content.operations.map(([symbol, description]) => <div key={symbol}><dt>{symbol}</dt><dd>{description}</dd></div>)}</dl>
    </section>
    <QuestionAnswerForm layout="inline" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p9-selections">{definition.parts.map(part => <label key={part.id} className="type-label" htmlFor={'u6p9-' + part.id}>
        <span>{part.label}</span><select id={'u6p9-' + part.id} name={part.id} disabled={disabled} value={attempt.answers[part.id] ?? ''}
          onChange={event => onEdit(part.id, event.target.value)}>
          <option value="">{content.text[4]}</option>{content.options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>)}</div>}
    </QuestionAnswerForm>
  </div>;
}
