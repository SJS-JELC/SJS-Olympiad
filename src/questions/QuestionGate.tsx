import type { ReactNode } from 'react';
import { useCompetitionSecurity } from '../security';

/** Allow ordinary access once restored; competition locks still unmount content. */
export function QuestionGate({ children }: { children: ReactNode }) {
  const security = useCompetitionSecurity();
  if (security.session.status !== 'LOCKED' && security.phase === 'idle' && security.storageHealthy) return <>{children}</>;
  return <section className="question-access" aria-label="Question access">
    <h2>{security.session.status === 'LOCKED' ? 'Question paused' : 'Restoring session…'}</h2>
    {security.error && <p role="alert">{security.error}</p>}
  </section>;
}
