import {useEffect,useState} from 'react';
import {request} from '../cloud/api';
import { questionCatalog } from '../questions/catalog';
import { theoryYears, type TheoryYear } from '../questions/years';

export function ProblemTesting({ onOpen, enabled=true }: { enabled?:boolean; onOpen: (year: TheoryYear, number: number) => void }) {
  const [titles,setTitles]=useState<Record<string,string>>({}),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{if(!enabled)return;let current=true;setError('');void request<{schemaVersion:number;questions:{id:string;title:string}[]}>('content-catalogue',{}).then(value=>{if(current)setTitles(Object.fromEntries(value.questions.map(item=>[item.id,item.title])));}).catch(()=>{if(current)setError('Unable to load question titles.');});return()=>{current=false;};},[enabled,retry]);
  return <section className="problem-testing" aria-labelledby="problem-testing-title">
    <h3 id="problem-testing-title" className="type-heading">Theory</h3>
    {error && <p role="alert" className="type-caption">{error}<button type="button" className="ui-button" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>}
    <div className="problem-testing-years">
      {theoryYears.map(year => <section key={year} aria-labelledby={`testing-${year}`}>
        <h4 id={`testing-${year}`} className="type-heading">{year}</h4>
        <div className="problem-testing-list">
          {questionCatalog.filter(entry=>entry.definition.year===year).sort((a,b)=>a.definition.number-b.definition.number).map(entry => {
            const {number,points}=entry.definition;
            const title=titles[entry.definition.id] ?? entry.definition.title;
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
