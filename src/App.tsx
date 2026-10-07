import { useState } from 'react';
import { useCompetitionSecurity } from './hooks/useCompetitionSecurity';
import { CompetitionScreen, Diagnostics, LandingScreen, LockScreen, SecurityStatus } from './components/Screens';
import './styles.css';

export default function App() {
  const security = useCompetitionSecurity();
  const { session, phase, error, storageHealthy } = security;
  const [showSnapshot, setShowSnapshot] = useState(false);
  const busy = phase !== 'idle';
  return (
    <div className={`app-shell ${session.status === 'LOCKED' ? 'is-locked' : ''}`}>
      <header className="site-header">
        <a className="wordmark" href="#main"><span className="brand-symbol" aria-hidden="true">S</span><span>SJS <strong>Olympiad</strong><small>CHEMISTRY · CURIOSITY · CHALLENGE</small></span></a>
        <span className="test-badge"><span aria-hidden="true" />Competition security test</span>
      </header>
      <main id="main">
        <SecurityStatus session={session} />
        {error && <div className="error-banner" role="alert">{error}</div>}
        {!storageHealthy && <div className="error-banner" role="alert">Session storage is unavailable or invalid. Competition content remains locked. Ask a member of staff for help.</div>}
        {phase === 'loading' ? <section className="loading-card" role="status"><span className="spinner" />Restoring competition session…</section> :
          session.status === 'NOT_STARTED' ? <LandingScreen busy={busy} healthy={storageHealthy} onStart={security.start} /> :
          session.status === 'ACTIVE' && phase === 'idle' ? <CompetitionScreen /> :
          <LockScreen session={session} busy={busy} onUnlock={security.unlock} />}
        <Diagnostics events={security.events} storageHealthy={storageHealthy}>
          {session.status === 'NOT_STARTED' && phase !== 'loading' && <div className="test-controls"><p>Before-start testing tools</p><button className="button subtle" disabled={busy} onClick={() => { void security.reset(); }}>Clear stored session</button><button className="button subtle" disabled={busy} onClick={() => setShowSnapshot(!showSnapshot)}>{showSnapshot ? 'Hide' : 'View'} session snapshot</button>{showSnapshot && <pre>{JSON.stringify(session, null, 2)}</pre>}</div>}
        </Diagnostics>
      </main>
      <footer className="site-footer"><span>SJS Olympiad</span><span>Supervised browser test · No scores are recorded</span></footer>
    </div>
  );
}
