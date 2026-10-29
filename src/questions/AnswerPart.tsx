import './AnswerPart.css';
import { AnswerInput } from './AnswerInput';
import type { Answers, Part } from './attempts';

/** Paired-angle composition; field appearance is shared with other input types. */
export function AnswerPart({ part, answers, correct, wrong, disabled, onEdit }: {
  part: Part; answers: Answers; correct: boolean; wrong: boolean; disabled: boolean;
  onEdit: (field: string, value: string) => void;
}) {
  return <fieldset className={'answer-part' + (correct ? ' answer-part--correct' : '')} disabled={disabled || correct}>
    <legend><span className="answer-part-name">{part.label}</span> <span className="part-feedback" role="status">{correct ? '✓ Correct' : wrong ? '✕ Try again' : ''}</span></legend>
    {part.fields.map(field => <label key={field.id} htmlFor={field.id}>
      <span>{field.label}</span>
      <AnswerInput id={field.id} name={field.id} aria-label={part.label + ' ' + field.label + ' angle in degrees'}
        inputMode="numeric" pattern="[0-9]{1,3}" maxLength={3} required value={answers[field.id] ?? ''}
        onValueChange={value => onEdit(field.id, value)} unit="°" />
    </label>)}
  </fieldset>;
}
