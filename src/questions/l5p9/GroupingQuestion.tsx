import type { QuestionViewProps } from '../catalog';
import type { QuestionDefinition } from '../attempts';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import clearButton from '../../assets/powerapp/reset-button.svg';
import './GroupingQuestion.css';

type GroupingItem = { id: string; label: string; image: string; presentation?: 'element' };

/** Bespoke grouping UI; the shared form owns feedback and the retry deadline display. */
export function GroupingQuestion({ attempt, onAction, definition, wording, items }: QuestionViewProps & {
  definition: QuestionDefinition; wording: string; items: readonly GroupingItem[];
}) {
  const selected = attempt.interaction?.kind === 'grouping' ? attempt.interaction.selected : [];
  return <div className="question-content grouping-question" data-testid={definition.id.toLowerCase() + '-content'}>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction} layout="dense"
      actions={<button type="button" className="question-clear grouping-reset" aria-label="Reset / clear groups"
        onClick={() => onAction({ type: 'reset', now: Date.now() })}><img src={clearButton} alt="" draggable={false} /></button>}>
      {({ disabled }) => <>
        <section className="question-brief" aria-label="Question and grouping grid">
          <p>{wording}</p>
          <div className="grouping-grid" role="group" aria-label="Select three items for each group">
            {items.map(item => {
              const index = selected.indexOf(item.id);
              const group = index < 0 ? 0 : Math.floor(index / 3) + 1;
              return <button key={item.id} type="button" className="grouping-item"
                data-group={group} aria-label={item.label + (group ? ', group ' + group : ', unselected')}
                aria-pressed={group > 0} disabled={disabled || group > 0}
                onClick={() => onAction({ type: 'select', item: item.id, now: Date.now() })}>
                <img src={item.image} className={item.presentation === 'element' ? 'grouping-element' : undefined} alt="" />
              </button>;
            })}
          </div>
        </section>
      </>}
    </QuestionAnswerForm>
  </div>;
}
