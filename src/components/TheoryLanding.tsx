import { Score } from './Score';
import {useEffect,useState} from 'react';
import { OlympiadHeading } from './OlympiadHeading';
import { theoryButtonArtwork } from './theoryButtonArtwork';
import { ArtworkBackButton, TeacherSettingsButton } from './SharedNavigation';
import { durationText } from '../events/timing';
import '../background.css';
import '../splash.css';
import './TheoryLanding.css';

// Point bands follow the original Power App TheorySplash, using local vector artwork.
const bands = [
  { points: 1, problems: [1, 2, 3, 4] },
  { points: 2, problems: [5, 6, 7] },
  { points: 3, problems: [8, 9] },
] as const;

export function TheoryLanding({ year = 'L6', onBack, onSettings, onQuestion, solvedProblems = [], score = 0, preview=false,eventStartsAt,eventEndsAt,serverNow=Date.now,available=true }: { year?: string; onBack: () => void; onSettings?: () => void; onQuestion: (question: number) => void; score?: number; solvedProblems?: readonly number[];preview?:boolean;eventStartsAt?:number|null;eventEndsAt?:number;serverNow?:()=>number;available?:boolean }) {
  const [now,setNow]=useState(serverNow);
  useEffect(()=>{setNow(serverNow());const timer=window.setInterval(()=>setNow(serverNow()),1000);return()=>window.clearInterval(timer);},[serverNow]);
  const remaining=Math.max(0,Math.ceil(((eventEndsAt??now)-now)/1000));
  return <div className="splash-preview theory-page score-page">
    <div className="score-position theory-score"><Score value={score} /></div>
    <main className="theory-stage">
      <header className="theory-header">
        <div className="theory-navigation">{onSettings && <TeacherSettingsButton onClick={onSettings} />}<ArtworkBackButton className="theory-back" onClick={onBack} label="Back to landing" /></div>
        <div className="theory-title"><OlympiadHeading lines={[year + ' Theoretical', 'Challenge']} level={1} /></div>
      </header>
      <div className="theory-bands">
        {bands.map(band => <section className={`theory-band theory-band--${band.points}`} key={band.points} aria-labelledby={`theory-band-${band.points}`}>
          <h2 className="sr-only" id={`theory-band-${band.points}`}>
            <strong>{band.points}</strong><span>{band.points === 1 ? 'point' : 'points'}</span>
          </h2>
          <div className="theory-problems">
            {band.problems.map(problem => <button className="theory-problem" key={problem} type="button"
              aria-label={`Problem ${problem}, ${band.points} ${band.points === 1 ? 'point' : 'points'}, ${solvedProblems.includes(problem) ? 'correct' : 'not yet solved'}`}
              disabled={!available} onClick={() => onQuestion(problem)}>
              <img src={theoryButtonArtwork[band.points - 1][solvedProblems.includes(problem) ? 'solved' : 'unsolved']} alt="" draggable={false} />
            </button>)}
          </div>
        </section>)}
      </div>
      <footer className="theory-timer">{preview ? 'Teacher preview · unscored' : eventStartsAt != null && now < eventStartsAt ? `Theory opens in ${durationText(eventStartsAt-now)}` : remaining > 0 ? `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} remaining` : 'The theory challenge has finished'}</footer>
    </main>
  </div>;
}
