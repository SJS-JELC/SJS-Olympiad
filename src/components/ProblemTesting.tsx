import { findQuestion } from '../questions/catalog';
import { theoryYears, type TheoryYear } from '../questions/years';

export function ProblemTesting({ onOpen }: { onOpen: (year: TheoryYear, number: number) => void }) {
  return <section className="problem-testing" aria-labelledby="problem-testing-title">
    <h1 id="problem-testing-title" className="type-heading">Problem testing</h1>
    <p className="type-body">Open any available problem. Its back arrow returns here, keeping your answers and progress during this visit.</p>
    <div className="problem-testing-years">
      {theoryYears.map(year => <section key={year} aria-labelledby={`testing-${year}`}>
        <h2 id={`testing-${year}`} className="type-heading">{year}</h2>
        <div className="problem-testing-list">
          {Array.from({ length: 9 }, (_, index) => {
            const number = index + 1;
            const entry = findQuestion(year, number);
            return <button key={number} type="button" className="problem-testing-card" disabled={!entry}
              aria-label={`${year} Problem ${number}: ${entry?.definition.title ?? 'Not available'}`}
              onClick={() => onOpen(year, number)}>
              <span className="type-label">Problem {number}{entry ? ` · ${entry.definition.points} ${entry.definition.points === 1 ? 'point' : 'points'}` : ''}</span>
              <span className="type-body">{entry?.definition.title ?? 'Not available'}</span>
            </button>;
          })}
        </div>
      </section>)}
    </div>
  </section>;
}
