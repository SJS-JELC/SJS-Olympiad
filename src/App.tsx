import { theoryYears, type TheoryYear } from './questions/years';
import { useState } from 'react';
import { useCompetitionSecurity } from './hooks/useCompetitionSecurity';
import { CompetitionScreen, Diagnostics, LandingScreen, SecurityStatus } from './components/Screens';
import './styles.css';
import './background.css';
import './settings.css';
import { OlympiadHeading } from './components/OlympiadHeading';
import { ProblemTesting } from './components/ProblemTesting';
import { QuestionGate } from './questions/QuestionGate';

export default function App({ settings = false, problemTesting = false, onBack, selectedYear = 'L6', onYearChange, onOpenProblemTesting, onOpenProblem }: {
  settings?: boolean; problemTesting?: boolean; onBack: () => void;
  selectedYear?: TheoryYear; onYearChange?: (year: TheoryYear) => void;
  onOpenProblemTesting?: () => void; onOpenProblem?: (year: TheoryYear, number: number) => void;
}) {
  const security = useCompetitionSecurity();
  const { session, phase, error, storageHealthy } = security;
  const [showSnapshot, setShowSnapshot] = useState(false);
  const busy = phase !== 'idle';
  return (
    <div className={`app-shell ${settings ? 'settings-page' : ''} ${session.status === 'LOCKED' ? 'is-locked' : ''}`}>
      <header className="site-header">
        {settings ? <>{session.status !== 'LOCKED' ? <a className="settings-back" href={problemTesting ? '?settings' : './'} onClick={event => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onBack(); } }}><span aria-hidden="true">←</span> {problemTesting ? 'Back to Settings' : 'Back to landing'}</a> : <span>Staff assistance required</span>}<div className="settings-title"><OlympiadHeading lines={['Settings']} level={1} /></div></> : <>
        <a className="wordmark" href="#main"><span className="brand-symbol" aria-hidden="true">S</span><span>SJS <strong>Olympiad</strong><small>CHEMISTRY · CURIOSITY · CHALLENGE</small></span></a>
        <span className="test-badge"><span aria-hidden="true" />Competition security test</span>
        </>}
      </header>
      <main id="main">
        {problemTesting ? <QuestionGate><ProblemTesting onOpen={(year, number) => onOpenProblem?.(year, number)} /></QuestionGate> : <>
        <SecurityStatus session={session} />
        {settings && session.status !== 'LOCKED' && phase === 'idle' && storageHealthy && onOpenProblemTesting && <section className="settings-year" aria-labelledby="testing-entry-title">
          <h2 id="testing-entry-title" className="type-heading">Problem testing</h2>
          <p className="type-body">Browse every year group and jump straight to a problem.</p>
          <button type="button" className="button primary" onClick={onOpenProblemTesting}>Open problem testing</button>
        </section>}
        {settings && session.status !== 'LOCKED' && phase === 'idle' && storageHealthy && <section className="settings-year" aria-labelledby="year-title">
          <h2 id="year-title" className="type-heading">Theory year</h2>
          <label className="type-label" htmlFor="theory-year">Choose question set</label>
          <select id="theory-year" value={selectedYear} onChange={event => onYearChange?.(event.target.value as TheoryYear)}>
            {theoryYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <p className="type-body">Each year keeps its own score and attempts during this visit.</p>
        </section>}
        {error && <div className="error-banner" role="alert">{error}</div>}
        {!storageHealthy && <div className="error-banner" role="alert">Session storage is unavailable or invalid. Competition content remains locked. Ask a member of staff for help.</div>}
        {phase === 'loading' ? <section className="loading-card" role="status"><span className="spinner" />Restoring competition session…</section> :
          session.status === 'NOT_STARTED' ? (settings ? <section className="settings-security" aria-labelledby="security-title">
            <div><p className="eyebrow">COMPETITION CONTROLS</p><h2 id="security-title">Competition security</h2><p>Enter fullscreen to try the competition security controls with a demonstration question.</p><button className="button primary enter-button" disabled={busy || !storageHealthy} onClick={() => { void security.start(); }}>{busy ? 'Entering fullscreen…' : 'Enter Competition Mode'}</button><p className="button-note">The session starts only after fullscreen succeeds.</p></div>
            <aside><h3>During Competition Mode</h3><ul className="rules-list"><li>Stay in fullscreen</li><li>Keep this tab selected and the window focused</li><li>Leaving the session locks the question</li></ul><p>A member of staff must enter the unlock PIN to resume. You can navigate within the app, including back to the landing page, without leaving Competition Mode.</p></aside>
          </section> : <LandingScreen busy={busy} healthy={storageHealthy} onStart={security.start} />) :
          session.status === 'ACTIVE' && phase === 'idle' ? <CompetitionScreen /> :
          <section className="loading-card">Competition paused. Staff assistance required.</section>}
        <Diagnostics events={security.events} storageHealthy={storageHealthy}>
          {session.status === 'NOT_STARTED' && phase !== 'loading' && <div className="test-controls"><p>Before-start testing tools</p><button className="button subtle" disabled={busy} onClick={() => { void security.reset(); }}>Clear stored session</button><button className="button subtle" disabled={busy} onClick={() => setShowSnapshot(!showSnapshot)}>{showSnapshot ? 'Hide' : 'View'} session snapshot</button>{showSnapshot && <pre>{JSON.stringify(session, null, 2)}</pre>}</div>}
        </Diagnostics>
        </>}
      </main>
      <footer className="site-footer"><span>SJS Olympiad</span><span>Supervised browser test · No scores are recorded</span></footer>
    </div>
  );
}
