import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Attempt, AttemptAction, QuestionDefinition } from './attempts';
import { CheckButton } from '../components/CheckButton';
import { IncorrectFeedback } from '../components/IncorrectFeedback';

export type AnswerControls = { disabled: boolean; onEdit: (field: string, value: string) => void };
export type QuestionAnswerLayout = 'compact' | 'aligned' | 'dense' | 'inline';

/** Shared deadline display and submission UI. Marking remains in attempts.ts. */
export function QuestionAnswerForm({ definition, attempt, onAction, children, layout = 'compact', actions, autoFocusAnswer = true, showAwardMessage = true, className = '' }: {
  definition: QuestionDefinition;
  attempt: Attempt;
  onAction: (action: AttemptAction) => void;
  children: (controls: AnswerControls) => ReactNode;
  /** Inline places answer controls beside the shared bottom-aligned action. */
  layout?: QuestionAnswerLayout;
  /** Custom actions appear beside Check. Use type="button" for non-submit actions. */
  actions?: ReactNode | ((controls: AnswerControls) => ReactNode);
  /** Custom timed interactions can defer focus until their own start action. */
  autoFocusAnswer?: boolean;
  showAwardMessage?: boolean;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const focusedEntry = useRef<string | null>(null);
  useEffect(() => {
    if (focusedEntry.current === definition.id) return;
    focusedEntry.current = definition.id;
    if (!autoFocusAnswer) return;
    // One attempt on entry only: cooldown expiry and answer edits must never steal focus.
    formRef.current?.querySelector<HTMLElement>('input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled)')?.focus({ preventScroll: true });
  }, [definition.id, autoFocusAnswer]);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (attempt.retryAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= attempt.retryAt) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [attempt.retryAt]);
  const remainingMs = Math.min(definition.cooldownMs, Math.max(0, attempt.retryAt - now));
  const solved = attempt.solvedAt !== null;
  const controls: AnswerControls = {
    disabled: remainingMs > 0 || solved,
    onEdit: (field, value) => onAction({ type: 'edit', field, value, now: Date.now() }),
  };
  return <form ref={formRef} noValidate className={`question-answer-form question-answer-form--${layout} ${className}`} onSubmit={event => {
    event.preventDefault();
    onAction({ type: 'submit', now: Date.now() });
  }}>
    <IncorrectFeedback remainingMs={remainingMs} cooldownMs={definition.cooldownMs} />
    {children(controls)}
    <div className="question-actions">
      {solved && showAwardMessage && <p role="status">{definition.points} {definition.points === 1 ? 'point' : 'points'} awarded.</p>}
      <CheckButton remaining={remainingMs / 1000} cooldownSeconds={definition.cooldownMs / 1000} />
      {typeof actions === 'function' ? actions(controls) : actions}
    </div>
  </form>;
}
