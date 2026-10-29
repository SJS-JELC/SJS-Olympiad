import { OlympiadBackground } from './components/OlympiadBackground';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import App from './App';
import { SplashPreview } from './components/SplashPreview';
import { TheoryLanding } from './components/TheoryLanding';
import { TheoryQuestionPreview } from './components/TheoryQuestionPreview';
import { QuestionShell } from './questions/QuestionShell';
import { QuestionGate } from './questions/QuestionGate';
import { questionCatalog, findQuestion } from './questions/catalog';
import { readTheoryYear, rememberTheoryYear, routeYear, type TheoryYear } from './questions/years';
import type { QuestionDefinition } from './questions/attempts';
import { emptyAttempt, score, transition, type Attempt, type AttemptAction } from './questions/attempts';
import { CompetitionSecurityProvider, useCompetitionSecurity } from './security';
import './styles.css';
import { BreachModal } from './components/BreachModal';
import { CloudQuestion, request, type CloudState } from './cloud/CloudQuestion';

export function AppRouter() {
  const [search, setSearch] = useState(window.location.search);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [cloudState, setCloudState] = useState<CloudState|null>(null);
  useEffect(() => {
    let active = true;
    void request<CloudState>('session').then(value => { if(active) setCloudState(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const [selectedYear, setSelectedYear] = useState<TheoryYear>(readTheoryYear);
  const changeYear = (year: TheoryYear) => { setSelectedYear(year); rememberTheoryYear(year); };
  const options = new URLSearchParams(search);
  const year = routeYear(options, selectedYear);
  const effectiveAttempts: Record<string,Attempt> = {...attempts, L6P8:{...emptyAttempt(),solvedAt:cloudState?.solvedAt ?? null}};
  const solvedProblems = questionCatalog.filter(({ definition }) => definition.year === year && effectiveAttempts[definition.id]?.solvedAt != null).map(({ definition }) => definition.number);
  const currentScore = score(questionCatalog.filter(entry => entry.definition.year === year).map(entry => entry.definition), effectiveAttempts);
  const { session, phase, storageHealthy } = useCompetitionSecurity();
  const submitAction = (definition: QuestionDefinition, action: AttemptAction) => {
    if (session.status === 'LOCKED' || phase !== 'idle' || !storageHealthy) return;
    setAttempts(previous => ({ ...previous, [definition.id]: transition(definition, previous[definition.id] ?? emptyAttempt(), action) }));
  };
  useEffect(() => {
    // Deadlines advance even when views are unmounted by routing, year changes or locking.
    const timer = window.setInterval(() => setAttempts(previous => {
      let changed = false;
      const next = { ...previous };
      for (const { definition } of questionCatalog) {
        const attempt = previous[definition.id];
        if (!definition.reduce || !attempt) continue;
        const reconciled = transition(definition, attempt, { type: 'tick', now: Date.now() });
        if (reconciled !== attempt) { next[definition.id] = reconciled; changed = true; }
      }
      return changed ? next : previous;
    }), 100);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const update = () => {
      if (session.status === 'LOCKED') window.history.replaceState(null, '', window.location.pathname + search);
      else setSearch(window.location.search);
    };
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, [session.status, search]);
  function navigate(query: string) {
    window.history.pushState(null, '', window.location.pathname + query);
    setSearch(query);
    window.scrollTo(0, 0);
  }
  // One provider stays mounted across routes. A lock gates every screen.
  function page() {
  if (options.has('settings') || options.has('security-test')) {
    const problemTesting = options.has('settings') && options.get('view') === 'problems';
    return <App settings={!options.has('security-test')} problemTesting={problemTesting} selectedYear={selectedYear} onYearChange={changeYear}
      onBack={() => navigate(problemTesting ? '?settings' : '')}
      onOpenProblemTesting={() => navigate('?settings&view=problems')}
      onOpenProblem={(year, number) => navigate(`?theory&year=${year}&question=${number}&from=problem-testing`)} />;
  }
  if (options.has('theory')) {
    if (!year) return <main className="question-access type-body" role="status"><h1 className="type-heading">Theory year unavailable</h1><p>Choose L5, U5, L6 or U6 in Settings.</p><button type="button" onClick={() => navigate('?settings')}>Open Settings</button></main>;
    const question = Number(options.get('question'));
    const fromTesting = options.get('from') === 'problem-testing';
    const backToQuestions = () => navigate(fromTesting ? '?settings&view=problems' : '?theory&year=' + year);
    if (Number.isInteger(question) && question >= 1 && question <= 9) {
      const entry = findQuestion(year, question);
      if (entry) {
        const { definition, View } = entry;
        return <QuestionShell definition={definition} score={currentScore} onBack={backToQuestions} backLabel={fromTesting ? 'Back to problem testing' : 'Back to theory'}>
          <QuestionGate>{definition.id === 'L6P8' ? <CloudQuestion state={cloudState} onState={setCloudState}/> : <View key={definition.id} attempt={attempts[definition.id] ?? emptyAttempt()} onAction={action => submitAction(definition, action)} />}</QuestionGate>
        </QuestionShell>;
      }
      return <TheoryQuestionPreview question={question} onBack={backToQuestions} backLabel={fromTesting ? 'Back to problem testing' : 'Back to theory'} />;
    }
    return <TheoryLanding year={year} score={currentScore} solvedProblems={solvedProblems} onQuestion={question => navigate(`?theory&year=${year}&question=${question}`)} onBack={() => navigate('')} />;
  }
  return <SplashPreview onSettings={() => navigate('?settings')} onTheory={() => navigate('?theory&year=' + selectedYear)} />;
  }
  const locked = session.status === 'LOCKED';
  return <div className="olympiad-app-frame"><OlympiadBackground /><div className={`competition-page${locked ? ' competition-page--locked' : ''}`} inert={locked} aria-hidden={locked || undefined}>{page()}</div>{locked && <BreachModal onEnded={() => navigate('')} />}</div>;
}

if (document.getElementById('root')) createRoot(document.getElementById('root')!).render(
  <CompetitionSecurityProvider><AppRouter /></CompetitionSecurityProvider>,
);
