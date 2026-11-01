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
import { ArtworkBackButton } from './components/SharedNavigation';
import { eventTiming } from './events/timing';
import { Practical, PracticalShell } from './practicals/Practical';
import { findPractical } from './practicals/catalog';
import './styles.css';
import './background.css';
import './settings.css';
export function AppRouter() {
    const [search, setSearch] = useState(''), [selectedId, setSelectedId] = useState<string>();
    const [navigationError, setNavigationError] = useState('');
    const [settingsPanels,setSettingsPanels]=useState<SettingsPanels>({questions:false,events:false});
    const security = useCompetitionSecurity(), server = security.server, teacher = server?.role === 'teacher';
    const signedIn = useRef(false);
    useEffect(() => {
        if (!server) { signedIn.current=false; window.history.replaceState(null,'',window.location.pathname); setSearch(''); return; }
        if (!signedIn.current) { signedIn.current=true; setSettingsPanels({questions:false,events:false}); const query=teacher?'?settings':''; window.history.replaceState(null,'',window.location.pathname+query);setSearch(query); }
    }, [!!server,teacher]);
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
        if (server?.role === 'competitor' && security.session.status === 'NOT_STARTED' && search) {
            window.history.replaceState(null, '', window.location.pathname);
            setSearch('');
        }
    }, [server?.role, security.session.status, search]);
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
        if (server && !localPractical && practicalFlush.current && !await practicalFlush.current()) {
            setNavigationError('Navigation paused. Save or discard the practical changes before continuing.');
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
    useEffect(()=>{
        if (!teacher && server?.team && server.activeEvent && security.session.status!=='LOCKED' &&
          (options.has('theory') && security.serverNow()>=eventTiming(server.activeEvent).theoryEndsAt ||
           options.has('practical') && security.serverNow()>=(eventTiming(server.activeEvent).practicalEndsAt ?? Infinity))) void navigate('',true);
    },[teacher,server,security.session.status,search,security.canAccessTheory(),security.canAccessPractical()]);
    function page() {
        if (!server)
            return <AccessGate />;
        if (!teacher && security.session.status === 'NOT_STARTED' && !(server.team && server.activeEvent && security.serverNow() >= eventTiming(server.activeEvent).endsAt))
            return <CompetitorEntry />;
        if (teacher && (options.has('settings') || !(options.has('practical') || options.has('leaderboard') || options.has('theory') && Number.isInteger(Number(options.get('question'))) && Number(options.get('question'))>=1 && Number(options.get('question'))<=9)))
            return <App panels={settingsPanels} onPanelsChange={setSettingsPanels} eventId={selectedRealEvent?.id} onEventChange={id => { setSelectedId(id); void navigate('?settings&eventId=' + encodeURIComponent(id)); }} onLeaderboard={() => void navigate('?leaderboard')} onPracticalPreview={year => void navigate(year ? `?practical&catalogue&year=${year}` : '?practical')} onQuestionPreview={(year,number)=>void navigate(`?theory&catalogue&year=${year}&question=${number}`)}/>;
        if (options.has('leaderboard'))
            return teacher ? <Leaderboard activeEvent={server.activeEvent} onBack={() => void navigate('?settings')} onSettings={() => void navigate('?settings')}/> : <CompetitorEntry />;
        if (options.has('practical')) {
            const definition = findPractical(selectedEvent?.year);
            if (!selectedEvent || !definition) return <main className="question-access type-body"><h1 className="type-heading">No practical available for this year</h1><ArtworkBackButton onClick={() => void navigate(teacher ? '?settings' : '')} label="Back"/></main>;
            return <PracticalShell definition={definition} onBack={() => void navigate(teacher ? '?settings' : '')} backLabel={teacher ? 'Back to settings' : 'Back to landing'}><QuestionGate practical theory={false}><Practical key={selectedEvent.id} definition={definition} event={selectedEvent} flushRef={practicalFlush} onTheory={!teacher ? () => void navigate('?theory') : undefined}/></QuestionGate></PracticalShell>;
        }
        if (options.has('theory')) {
            if (!selectedEvent)
                return <main className="question-access type-body"><h1 className="type-heading">No event selected</h1><p>Choose an event in Settings to preview its questions.</p>{teacher && <button onClick={() => void navigate('?settings')}>Open Settings</button>}</main>;
            const year = selectedEvent.year, number = Number(options.get('question'));
            const score = teacher ? 0 : server.score;
            const solved = questionCatalog.filter(entry => entry.definition.year === year && questions.get(entry.definition.id).attempt.solvedAt != null).map(entry => entry.definition.number);
            if (Number.isInteger(number) && number >= 1 && number <= 9) {
                const entry = findQuestion(year, number), back = () => void navigate(teacher?'?settings':'?theory');
                if (entry)
                    return <QuestionShell definition={entry.definition} score={score} onBack={back} backLabel={teacher?'Back to settings':'Back to theory'}><QuestionGate><CloudQuestion key={selectedEvent.id + entry.definition.id} entry={entry} questions={questions}/></QuestionGate></QuestionShell>;
                return <TheoryQuestionPreview question={number} onBack={back}/>;
            }
            const timing = eventTiming(selectedEvent);
            return <QuestionGate theory={false}><TheoryLanding year={year} score={score} solvedProblems={solved} preview={teacher} eventStartsAt={timing.theoryStartsAt} eventEndsAt={timing.theoryEndsAt} serverNow={security.serverNow} available={security.canAccessTheory()} onQuestion={number => void navigate(`?theory&question=${number}`)} onBack={() => void navigate('')}/></QuestionGate>;
        }
        return <SplashPreview teacher={teacher} theoryStartsAt={selectedEvent ? eventTiming(selectedEvent).theoryStartsAt : null} theoryEndsAt={selectedEvent ? eventTiming(selectedEvent).theoryEndsAt : undefined} serverNow={security.serverNow} onTheory={() => void navigate('?theory')} onPractical={findPractical(selectedEvent?.year) ? () => void navigate('?practical') : undefined} practicalStartsAt={selectedEvent ? eventTiming(selectedEvent).practicalStartsAt : null} practicalEndsAt={selectedEvent ? eventTiming(selectedEvent).practicalEndsAt : null}/>;
    }
    const locked = server?.role === 'competitor' && security.session.status === 'LOCKED';
    const requestedQuestion=Number(options.get('question'));
    const teacherQuestion=teacher && (options.has('practical') || options.has('theory') && Number.isInteger(requestedQuestion) && requestedQuestion>=1 && requestedQuestion<=9);
    return <div className="olympiad-app-frame"><OlympiadBackground /><div className={`competition-page${server && !teacher?' competition-page--competitor':''}${locked ? ' competition-page--locked' : ''}`} inert={locked} aria-hidden={locked || undefined}>
    {page()}{server?.role==='competitor' && server.team && <div className="competitor-team-pill type-body" aria-label={'Team: '+server.team.name} title={server.team.name}><span className="competitor-team-pill__name">{server.team.name}</span>{server.practice && <span className="competitor-team-pill__practice type-caption">Practice</span>}</div>}{server && teacher && !teacherQuestion && <p className="event-status type-caption">{teacher ? 'Teacher preview · unscored' : server.practice ? 'Practice game ? temporary results' : server.team?.name ?? 'Choose a team'}{selectedEvent ? ` · ${selectedEvent.name} · ${selectedEvent.year}` : ''}</p>}{navigationError && <p className="navigation-error type-caption" role="alert">{navigationError}</p>}
  </div>{locked && <BreachModal />}</div>;
}
if (document.getElementById('root'))
    createRoot(document.getElementById('root')!).render(<CompetitionSecurityProvider><AppRouter /></CompetitionSecurityProvider>);
