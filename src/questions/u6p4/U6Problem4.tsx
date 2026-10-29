import { useLayoutEffect, useRef } from 'react';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p4 } from './definition';
import resonance from './assets/resonance.svg';
import './U6Problem4.css';

export function U6Problem4({ attempt, onAction }: QuestionViewProps) {
  const questionRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    // Align answers to the contained source image, including any side letterboxing.
    const measure = () => questionRef.current?.style.setProperty('--u6p4-diagram-width', `${Math.min(figure.clientWidth, figure.clientHeight * 1934.58 / 992.12)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);
  return <div ref={questionRef} className="question-content question-content--aligned u6p4-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">Ion stability depends on charge delocalisation. In the example below, the negative charge is delocalised over four atoms, shown in each of the 4 resonance structures. For each of the three molecules below, state how many atoms the charge can be delocalised over.</p>
      <figure ref={figureRef} className="u6p4-diagram"><img src={resonance} alt="Four resonance structures in the worked example, followed by molecules A, B and C." /></figure>
    </section>
    <QuestionAnswerForm layout="aligned" definition={u6p4} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p4-answers">
        {(['a', 'b', 'c'] as const).map(id => <label className="u6p4-answer type-label" key={id} htmlFor={'u6p4-' + id}>
          <AnswerInput aria-label={'Molecule ' + id.toUpperCase()} id={'u6p4-' + id} name={id} value={attempt.answers[id] ?? ''} inputMode="decimal" maxLength={3} disabled={disabled}
            onValueChange={value => onEdit(id, value)} />
        </label>)}
      </div>}
    </QuestionAnswerForm>
  </div>;
}
