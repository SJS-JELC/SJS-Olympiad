import { Score } from './Score';
import { OlympiadHeading } from './OlympiadHeading';
import { theoryButtonArtwork } from './theoryButtonArtwork';
import backArrow from '../assets/powerapp/backarrow.svg';
import '../background.css';
import '../splash.css';
import './TheoryLanding.css';

// Point bands follow the original Power App TheorySplash, using local vector artwork.
const bands = [
  { points: 1, problems: [1, 2, 3, 4] },
  { points: 2, problems: [5, 6, 7] },
  { points: 3, problems: [8, 9] },
] as const;

export function TheoryLanding({ year = 'L6', onBack, onQuestion, solvedProblems = [], score = 0 }: { year?: string; onBack: () => void; onQuestion: (question: number) => void; score?: number; solvedProblems?: readonly number[] }) {
  return <div className="splash-preview theory-page score-page">
    <div className="score-position theory-score"><Score value={score} /></div>
    <main className="theory-stage">
      <header className="theory-header">
        <button className="theory-back" type="button" onClick={onBack} aria-label="Back to landing">
          <img src={backArrow} alt="" />
        </button>
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
              onClick={() => onQuestion(problem)}>
              <img src={theoryButtonArtwork[band.points - 1][solvedProblems.includes(problem) ? 'solved' : 'unsolved']} alt="" draggable={false} />
            </button>)}
          </div>
        </section>)}
      </div>
      <footer className="theory-timer">Local demonstration · No event timer</footer>
    </main>
  </div>;
}
