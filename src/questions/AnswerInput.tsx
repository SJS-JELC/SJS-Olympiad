import type { ComponentProps } from 'react';
import './AnswerInput.css';

type AnswerInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Display-only numeric suffix; never stored or submitted. */
  unit?: string;
};

/** Shared field appearance; the question definition controls accepted edits. */
export function AnswerInput({ value, onValueChange, unit, ...props }: AnswerInputProps) {
  return <span className={'answer-input' + (unit === '°' ? ' angle-input' : '')}>
    <input autoComplete="off" {...props} value={value} onChange={event => onValueChange(event.target.value)} />
    {unit && /^[0-9]+$/.test(value.trim()) && <span className="answer-input__unit type-body" style={{ left: 'calc(50% + ' + value.length / 2 + 'ch)' }} aria-hidden="true">{unit}</span>}
  </span>;
}
