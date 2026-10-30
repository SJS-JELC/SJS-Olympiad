import { useEffect, useRef, useState } from 'react';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { OlympiadHeading } from '../../components/OlympiadHeading';
import { GO_COOLDOWN_MS, RUN_MS, timedState } from './definition';
import go from './assets/GO.svg';
import cross from './assets/RedCross.svg';
import tick from './assets/Tick.svg';
import './L6Problem3.css';

/** One SVG image contains both rounded track and fill, matching the source controls. */
export function barImage(fraction: number, color: string): string {
  const width = Math.round(460 * Math.max(0, Math.min(1, fraction)));
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 14"><rect width="460" height="14" rx="7" fill="#E6EBF5" fill-opacity=".85"/><rect width="' + width + '" height="14" rx="7" fill="' + color + '"/></svg>');
}
export const timerColour = (elapsed: number) => elapsed < 60_000 ? '#ffff00' : elapsed < 70_000 ? '#ffa500' : '#ff3131';

export function L6Problem3({ attempt, onAction }: QuestionViewProps) {
  const [now, setNow] = useState(Date.now);
  const focusOnStart = useRef(false);
  const answerRef = useRef<HTMLInputElement>(null);
  const run = timedState(attempt);
  // Presentation only: the router also reconciles the reducer while away/locked.
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
    }, 50);
    return () => window.clearInterval(timer);
  }, []);
  const solved = attempt.solvedAt !== null;
  const active = !!run?.active && now < run.deadline;
  useEffect(() => {
    if (!focusOnStart.current || !active) return;
    focusOnStart.current = false;
    answerRef.current?.focus({ preventScroll: true });
  }, [active]);
  const elapsed = run ? Math.max(0, now - (run.deadline - RUN_MS)) : 0;
  const cooling = now < attempt.retryAt;
  const prompt = active ? run?.formula : null;
  return <div className="question-content question-content--compact l6p3-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">You need to name 5 oxyanions.<br />Clock's ticking.</p>
      <div className="l6p3-prompt">
        {prompt && <svg className="l6p3-formula" viewBox="0 0 460 100" role="img" aria-label={prompt}>
          <text className="type-body" x="226" y="81" textAnchor="middle" fill="black" stroke="black" strokeWidth="5" aria-hidden="true">{prompt}</text>
          <text className="type-body" x="230" y="75" textAnchor="middle" fill="white" stroke="black" strokeWidth="5" paintOrder="stroke fill" aria-hidden="true">{prompt}</text>
        </svg>}
        {!active && !solved && <button type="button" className="l6p3-go" aria-label="GO: start oxyanion challenge" disabled={cooling} onClick={() => { focusOnStart.current = true; onAction({ type: 'start', now: Date.now() }); }}>
          <img src={go} alt="" />
          {cooling && <span className="l6p3-go-cover" style={{ width: Math.min(1, Math.max(0, (attempt.retryAt - now) / GO_COOLDOWN_MS)) * 100 + '%' }} />}
        </button>}
        {run?.revealed && <p className="l6p3-reveal type-body" role="status">Unlucky. The answer was {run.revealed}</p>}
      </div>
    </section>
    <form className="l6p3-answer-form" noValidate onSubmit={event => { event.preventDefault(); onAction({ type: 'submit', now: Date.now() }); }}>
      <div className="l6p3-bars">
        {active && <img src={barImage(elapsed / RUN_MS, timerColour(elapsed))} alt="Elapsed challenge time" />}
        {(active || solved) && <img src={barImage(solved ? 1 : (run?.step ?? 0) / 5, '#39ff14')} alt={(solved ? 5 : run?.step ?? 0) + ' of 5 correct'} />}
      </div>
      <label className="l6p3-answer type-label" htmlFor="l6p3-answer"><span className="l6p3-visually-hidden">Oxyanion name</span>
        <AnswerInput ref={answerRef} id="l6p3-answer" name="answer" value={attempt.answers.answer ?? ''} disabled={!active || solved}
          onValueChange={value => onAction({ type: 'edit', field: 'answer', value, now: Date.now() })} />
      </label>
      <button className="l6p3-submit" type="submit" aria-label={solved ? 'Solved' : 'Submit oxyanion name'} disabled={!active || solved}>
        <OlympiadHeading lines={[solved ? 'SOLVED' : 'SUBMIT']} as="span" variant="score" />
      </button>
    </form>
    {run && now < run.wrongUntil && <img className="l6p3-feedback" src={cross} alt="Incorrect" />}
    {solved && <img className="l6p3-feedback" src={tick} alt="Correct" />}
  </div>;
}
