import { questionCatalog } from '../questions/catalog';
import { theoryYears, type TheoryYear } from '../questions/years';

export function ProblemTesting({ onOpen }: { onOpen: (year: TheoryYear, number: number) => void }) {
  return <section className="problem-testing" aria-labelledby="problem-testing-title">
    <h3 id="problem-testing-title" className="type-heading">Theory</h3>
    <div className="problem-testing-years">
      {theoryYears.map(year => <section key={year} aria-labelledby={`testing-${year}`}>
        <h4 id={`testing-${year}`} className="type-heading">{year}</h4>
        <div className="problem-testing-list">
          {questionCatalog.filter(entry=>entry.definition.year===year).sort((a,b)=>a.definition.number-b.definition.number).map(entry => {
            const {number,title,points}=entry.definition;
            return <button key={number} type="button" className="ui-button problem-testing-card"
              aria-label={`${year} Problem ${number}: ${title}`}
              onClick={() => onOpen(year, number)}>
              <span className="type-body problem-testing-title">{number}. {title}</span>
              <span className={`type-label question-points question-points--${number<=4?1:number<=7?2:3}`}>{points} {points===1?'point':'points'}</span>
            </button>;
          })}
        </div>
      </section>)}
    </div>
  </section>;
}
