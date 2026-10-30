import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import App, {type SettingsPanels} from './App';
import { OlympiadBackground } from './components/OlympiadBackground';
import { SplashPreview } from './components/SplashPreview';
import { TheoryLanding } from './components/TheoryLanding';
import { TheoryQuestionPreview } from './components/TheoryQuestionPreview';
import { QuestionShell } from './questions/QuestionShell';
import { QuestionGate } from './questions/QuestionGate';
import { findQuestion, questionCatalog } from './questions/catalog';
import { CompetitionSecurityProvider, useCompetitionSecurity } from './security';
import { BreachModal } from './components/BreachModal';
import { AccessGate, CompetitorEntry } from './components/AccessGate';
import { Leaderboard } from './components/Leaderboard';
import { CloudQuestion, useServerQuestions } from './cloud/CloudQuestion';
import { ArtworkBackButton, TeacherModeBadge } from './components/SharedNavigation';
import { eventTiming } from './events/timing';
import { Practical, PracticalShell } from './practicals/Practical';
import { findPractical } from './practicals/catalog';
import './styles.css';
import './background.css';
import './settings.css';
export function AppRouter() {
    const [search, setSearch] = useState(window.location.search), [selectedId, setSelectedId] = useState<string>();
    const [navigationError, setNavigationError] = useState('');
    const [settingsPanels,setSettingsPanels]=useState<SettingsPanels>({questions:false,events:true,codes:false});
    const security = useCompetitionSecurity(), server = security.server, teacher = server?.role === 'teacher';
    const options = new URLSearchParams(search);
    const hintedEvent = server?.events?.find(event => event.id === options.get('eventId')) ?? server?.events?.find(event => event.year === options.get('year'));
    const selectedRealEvent = teacher ? (options.has('catalogue')?server?.events?.find(event=>event.id===selectedId) ?? server?.activeEvent ?? server?.events?.[0]:hintedEvent ?? server?.events?.find(event => event.id === selectedId) ?? server?.activeEvent ?? server?.events?.[0]) : server?.activeEvent;
    const catalogueYear=teacher && options.has('catalogue') && ['L5','U5','L6','U6'].includes(options.get('year') ?? '')?options.get('year')!:null;
    const selectedEvent=catalogueYear?{id:'catalogue-'+catalogueYear,name:catalogueYear+' question preview',year:catalogueYear,status:'draft' as const,revision:1,endsAt:server!.expiresAt,theoryEndsAt:server!.expiresAt}:selectedRealEvent;
    useEffect(() => { if (teacher && selectedRealEvent)
        setSelectedId(selectedRealEvent.id); }, [teacher, selectedRealEvent?.id]);
    const questions = useServerQuestions(selectedEvent?.id);
    const practicalFlush = useRef<(() => Promise<boolean>) | null>(null);
    useEffect(() => {
        const update = () => {
            if (security.session.status === 'LOCKED')
                window.history.replaceState(null, '', window.location.pathname + search);
            else {
                const incoming = window.location.search;
                window.history.replaceState(null, '', window.location.pathname + search);
                void navigate(incoming, true);
            }
        };
        window.addEventListener('popstate', update);
        return () => window.removeEventListener('popstate', update);
    });
    async function navigate(query: string, replace = false) {
        if (security.session.status === 'LOCKED')
            return;
        const localPractical = teacher && options.has('practical');
        const openingTeacherPractical = teacher && new URLSearchParams(query).has('practical');
        if (server && !localPractical && (practicalFlush.current && !await practicalFlush.current() || !await questions.flush() || !openingTeacherPractical && !await security.guard())) {
            setNavigationError('Navigation paused. Confirm the saved answer and connection before continuing.');
            return;
        }
        if (replace)
            window.history.replaceState(null, '', window.location.pathname + query);
        else
            window.history.pushState(null, '', window.location.pathname + query);
        setNavigationError('');
        setSearch(query);
        window.scrollTo(0, 0);
    }
    function page() {
        if (!server)
            return <AccessGate />;
        if (!teacher && security.session.status === 'NOT_STARTED')
            return <CompetitorEntry />;
        if (teacher && options.has('settings'))
            return <App panels={settingsPanels} onPanelsChange={setSettingsPanels} eventId={selectedRealEvent?.id} onEventChange={id => { setSelectedId(id); void navigate('?settings&eventId=' + encodeURIComponent(id)); }} onBack={() => void navigate('')} onPreview={() => void navigate('?theory')} onLeaderboard={() => void navigate('?leaderboard')} onPracticalPreview={year => void navigate(year ? `?practical&catalogue&year=${year}` : '?practical')} onQuestionPreview={(year,number)=>void navigate(`?theory&catalogue&year=${year}&question=${number}`)}/>;
        if (options.has('leaderboard'))
            return teacher ? <Leaderboard activeEvent={server.activeEvent} onBack={() => void navigate('?settings')} onSettings={() => void navigate('?settings')}/> : <CompetitorEntry />;
        if (options.has('practical')) {
            const definition = findPractical(selectedEvent?.year);
            if (!selectedEvent || !definition) return <main className="question-access type-body"><h1 className="type-heading">No practical available for this year</h1><ArtworkBackButton onClick={() => void navigate(teacher ? '?settings' : '')} label="Back"/></main>;
            return <PracticalShell definition={definition} onBack={() => void navigate(catalogueYear ? '?settings' : '')} backLabel={catalogueYear ? 'Back to settings' : 'Back to landing'}><QuestionGate practical theory={false}><Practical key={selectedEvent.id} definition={definition} event={selectedEvent} flushRef={practicalFlush} onTheory={!teacher ? () => void navigate('?theory') : undefined}/></QuestionGate></PracticalShell>;
        }
        if (options.has('theory')) {
            if (!selectedEvent)
                return <main className="question-access type-body"><h1 className="type-heading">No event selected</h1><p>Choose an event in Settings to preview its questions.</p>{teacher && <button onClick={() => void navigate('?settings')}>Open Settings</button>}</main>;
            const year = selectedEvent.year, number = Number(options.get('question'));
            const score = teacher ? 0 : server.score;
            const solved = questionCatalog.filter(entry => entry.definition.year === year && (questions.get(entry.definition.id).attempt.solvedAt != null || server.attempts?.[entry.definition.id]?.solvedAt != null)).map(entry => entry.definition.number);
            if (Number.isInteger(number) && number >= 1 && number <= 9) {
                const entry = findQuestion(year, number), back = () => void navigate(catalogueYear?'?settings':'?theory');
                if (entry)
                    return <QuestionShell definition={entry.definition} score={score} onBack={back} backLabel={catalogueYear?'Back to settings':'Back to theory'}><QuestionGate><CloudQuestion key={selectedEvent.id + entry.definition.id} entry={entry} questions={questions}/></QuestionGate></QuestionShell>;
                return <TheoryQuestionPreview question={number} onBack={back}/>;
            }
            const timing = eventTiming(selectedEvent);
            return <QuestionGate theory={false}><TheoryLanding year={year} score={score} solvedProblems={solved} preview={teacher} eventStartsAt={timing.theoryStartsAt} eventEndsAt={timing.theoryEndsAt} serverNow={security.serverNow} available={security.canAccessTheory()} onQuestion={number => void navigate(`?theory&question=${number}`)} onBack={() => void navigate('')} onSettings={teacher ? () => void navigate('?settings') : undefined}/></QuestionGate>;
        }
        return <SplashPreview teacher={teacher} theoryStartsAt={selectedEvent ? eventTiming(selectedEvent).theoryStartsAt : null} theoryEndsAt={selectedEvent ? eventTiming(selectedEvent).theoryEndsAt : undefined} serverNow={security.serverNow} onSettings={() => { if (teacher)
            void navigate('?settings'); }} onTheory={() => void navigate('?theory')} onPractical={findPractical(selectedEvent?.year) ? () => void navigate('?practical') : undefined} practicalStartsAt={selectedEvent ? eventTiming(selectedEvent).practicalStartsAt : null} practicalEndsAt={selectedEvent ? eventTiming(selectedEvent).practicalEndsAt : null}/>;
    }
    const locked = server?.role === 'competitor' && security.session.status === 'LOCKED';
    const requestedQuestion=Number(options.get('question'));
    const teacherQuestion=teacher && (options.has('practical') || options.has('theory') && Number.isInteger(requestedQuestion) && requestedQuestion>=1 && requestedQuestion<=9);
    return <div className="olympiad-app-frame"><OlympiadBackground /><div className={`competition-page${locked ? ' competition-page--locked' : ''}`} inert={locked} aria-hidden={locked || undefined}>
    {page()}{teacher && !teacherQuestion && <div className="teacher-mode-position"><TeacherModeBadge /></div>}{server && !teacherQuestion && <p className="event-status type-caption">{teacher ? 'Teacher preview · unscored' : server.team?.name ?? 'Choose a team'}{selectedEvent ? ` · ${selectedEvent.name} · ${selectedEvent.year}` : ''}</p>}{navigationError && <p className="navigation-error type-caption" role="alert">{navigationError}</p>}
  </div>{locked && <BreachModal />}</div>;
}
if (document.getElementById('root'))
    createRoot(document.getElementById('root')!).render(<CompetitionSecurityProvider><AppRouter /></CompetitionSecurityProvider>);
