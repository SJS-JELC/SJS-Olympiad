import { useEffect, useReducer, type ReactNode } from 'react';
import { useCompetitionSecurity } from '../security';
import { durationText, eventTiming, theoryPhase, practicalPhase } from '../events/timing';

/** Allow ordinary access once restored; competition locks still unmount content. */
export function QuestionGate({ children, theory = true, practical = false }: { children: ReactNode; theory?: boolean; practical?: boolean }) {
  const security = useCompetitionSecurity();
    const [, render] = useReducer(value => value + 1, 0);
    const event = security.server?.activeEvent;
    const teacher = security.server?.role === 'teacher';
    const waiting = !teacher && (theory || practical) && security.canAccess() && (practical ? practicalPhase : theoryPhase)(event, security.serverNow()) === 'waiting';
    useEffect(() => {
      if (!waiting) return;
      const timer = window.setInterval(render, 1000);
      return () => window.clearInterval(timer);
    }, [waiting]);
  const practicalReadable = security.canAccess() && !waiting && !!event && eventTiming(event).practicalEndsAt !== null;
  if (practical ? teacher && security.canAccess() || practicalReadable : theory ? security.canAccessTheory() : security.canAccess()) return <>{children}</>;
  const scheduled = security.canAccess() && (theory || practical) && event;
  const phase = scheduled ? (practical ? practicalPhase : theoryPhase)(event, security.serverNow()) : null;
  const subject = practical ? 'Practical' : 'Theory';
  const opensAt = event ? (practical ? eventTiming(event).practicalStartsAt : eventTiming(event).theoryStartsAt) : null;
  return <section className="question-access" aria-label="Question access">
    <h2 className="type-heading">{phase === 'waiting' ? `${subject} opens in ${durationText((opensAt ?? 0) - security.serverNow())}` : phase === 'closed' ? `The ${subject.toLowerCase()} challenge has finished` : security.session.status === 'LOCKED' ? 'Question paused' : 'Restoring session…'}</h2>
    {security.error && <p role="alert">{security.error}</p>}
  </section>;
}
