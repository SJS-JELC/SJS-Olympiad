import { useEffect, useReducer, useState, type MutableRefObject, type ReactNode } from 'react';
import { request, type EventRecord, type PracticalField, type PracticalResult } from '../cloud/api';
import type { ContentStore } from '../cloud/content-store';
import { requirePresentation } from '../contracts/presentation';
import { useCompetitionSecurity } from '../security';
import { durationText, eventTiming, practicalPhase } from '../events/timing';
import { ArtworkBackButton } from '../components/SharedNavigation';
import { findPractical, validPracticalNumber, type PracticalDefinition, type PracticalPresentation } from './catalog';
import { theoryYears } from '../questions/years';
import { usePractical } from './usePractical';
import eagle from '../assets/powerapp/asset-30.svg';
import cuttlefish from './assets/cuttlefish.png';
import './practical.css';

/** Catalogue titles are available only after authenticated catalogue access. */
export function PracticalCatalogue({ onOpen }: { onOpen: (year: string) => void }) {
  const [titles,setTitles]=useState<Record<string,string>>({}),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{let current=true;setError('');void request<{practicals:{id:string;title:string}[]}>('content-catalogue',{}).then(value=>{if(current)setTitles(Object.fromEntries(value.practicals.map(item=>[item.id,item.title])));}).catch(()=>{if(current)setError('Unable to load practical titles.');});return()=>{current=false;};},[retry]);
  return <section className="practical-catalogue" aria-labelledby="practical-catalogue-title"><h3 id="practical-catalogue-title" className="type-heading">Practical</h3>{error && <p role="alert">{error}<button className="ui-button" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>}<div className="practical-catalogue-list">{theoryYears.map(year => { const item=findPractical(year),title=titles[year]; return item ? <button key={item.year} className="ui-button problem-testing-card" disabled={!title} onClick={() => onOpen(item.year)} aria-label={`${item.year} practical: ${title ?? 'Practical'}`}><span className="type-body problem-testing-title">{title ? title.toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase()) : 'Practical'}</span></button> : <div key={year} className="practical-catalogue-placeholder" aria-hidden="true"/>; })}</div></section>;
}

/** Subscribe to the existing router store; never allocate route-local content memory. */
function usePresentation(store:ContentStore,year:string,load=false) {
 const [,render]=useReducer(value=>value+1,0);
 useEffect(()=>store.subscribe(render),[store]);
 useEffect(()=>{if(load)void store.load('practical',year);},[store,year,load]);
 return store.get('practical',year);
}

export function PracticalShell({ definition, contentStore, onBack, backLabel, children }: { definition: PracticalDefinition; contentStore:ContentStore; onBack: () => void; backLabel: string; children: ReactNode }) {
  const content=usePresentation(contentStore,definition.year);
  const title=content.value?.record.presentation.title ?? definition.title;
  return <div className="splash-preview question-page practical-page"><main className="question-stage"><header className="question-header">{definition.year === 'L5' && <img className="practical-header-art" src={cuttlefish} alt="Cuttlefish" draggable={false}/>}<div className="question-identity"><img className="question-eagle" src={eagle} alt="St John’s Olympiad eagle" draggable={false}/><div className="question-title-panel"><h1 className="type-heading practical-title"><span className="type-caption">{definition.year} Practical</span>{title}</h1></div></div><div className="question-navigation"><ArtworkBackButton className="question-back" onClick={onBack} label={backLabel}/></div></header>{children}</main></div>;
}

type PracticalProps = { definition: PracticalDefinition; contentStore:ContentStore; event: EventRecord; flushRef: MutableRefObject<(() => Promise<boolean>) | null>; onTheory?: () => void; onNavigationReady?: () => void };
type PracticalModel = Omit<ReturnType<typeof usePractical>, 'status'> & { status: ReturnType<typeof usePractical>['status'] | 'preview' };

export function Practical(props: PracticalProps) {
  const security = useCompetitionSecurity();
  return security.server?.role === 'teacher' ? <LocalPractical {...props}/> : <SavedPractical {...props}/>;
}

/** Teacher inputs are disposable presentation state, with no save/read queue. */
function LocalPractical(props: PracticalProps) {
  const [values, setValues] = useState<Partial<Record<PracticalField, string>>>({});
  useEffect(() => { props.flushRef.current = null; return () => { props.flushRef.current = null; }; }, [props.flushRef]);
  const saved: PracticalModel = {
    view: { year: props.definition.year, revision: 0, responses: {}, finalField: 'numPracticalResponse4', updatedAt: null, serverNow: 0, eventEndsAt: null, readOnly: false },
    values, status: 'preview', error: '', edit: (key, text) => setValues(current => ({ ...current, [key]: text })),
    flush: async () => true, retry: async () => true, discardAndReload: async () => setValues({}),
  };
  return <PracticalContent {...props} saved={saved} teacher/>;
}

function SavedPractical(props: PracticalProps) {
  const security = useCompetitionSecurity(), { event, flushRef } = props;
  const saved = usePractical(event.id, security.canAccess, security.canAccessPractical, security.handleMutationError, security.captureAuthority);
  useEffect(() => { flushRef.current = saved.flush; return () => { flushRef.current = null; }; });
  // A successful retry or explicit discard resolves a previous navigation
  // failure. Do not leave that stale alert covering the navigation controls.
  useEffect(() => { if (saved.status === 'saved') props.onNavigationReady?.(); }, [saved.status, props.onNavigationReady]);
  return <PracticalContent {...props} saved={saved} teacher={false}/>;
}

function Protocol({ definition }: { definition: PracticalPresentation }) {
  const paragraphs = definition.html ? definition.protocol.split(/(?:\s*<br\s*\/?\s*>\s*){2,}/i) : definition.protocol.split(/\n\s*\n/);
  return <div className="practical-protocol-text">{paragraphs.filter(text => text.trim()).map((text, index) => definition.html
    ? <p key={index} dangerouslySetInnerHTML={{ __html: text.trim().replace(/\s*\n\s*/g, ' ').replace(/\s*<br\s*\/?\s*>\s*/gi, '<br/>') }}/>
    : <p key={index}>{text.trim().replace(/\s*\n\s*/g, ' ')}</p>)}</div>;
}

function PracticalContent({ definition, contentStore, event, onTheory, saved, teacher }: PracticalProps & { saved: PracticalModel; teacher: boolean }) {
  const security = useCompetitionSecurity();
  const [now, setNow] = useState(security.serverNow), [blurred, setBlurred] = useState<Record<string, boolean>>({});
  useEffect(() => { const timer = window.setInterval(() => setNow(security.serverNow()), 250); return () => window.clearInterval(timer); }, [security.serverNow]);
  const readOnly = !teacher && practicalPhase(event, now) !== 'open';
  const content=usePresentation(contentStore,definition.year,!readOnly);
  const loaded=content.value && !readOnly ? requirePresentation<PracticalPresentation>(content.value,definition.year) : undefined;
  const presentation=loaded?.record.presentation;
  const fields=presentation?.fields ?? (readOnly ? definition.fields.map((field,index)=>({...field,label:`Response ${index+1}`,unit:''})) : []);
  return <div className="practical-content type-body">
    {presentation && <section className="practical-protocol" aria-label="Practical protocol" tabIndex={0}>
      {presentation.image && <img className="practical-mohr" src={loaded!.assets[presentation.image.assetId]} alt={presentation.image.alt} style={{aspectRatio:`${presentation.image.width} / ${presentation.image.height}`}}/>}
      <Protocol definition={presentation}/>
    </section>}
    {!readOnly && !presentation && (content.error ? <div className="practical-content-error" role="alert"><p>{content.error}</p><button className="ui-button" onClick={()=>void contentStore.load('practical',definition.year)}>Retry content</button></div> : <p role="status">Loading practical content...</p>)}
    {saved.view ? <><fieldset className={`practical-responses${fields.length === 2 ? ' practical-responses--two' : ''}`} disabled={readOnly || saved.status === 'loading'} aria-label="Practical responses"><legend className="sr-only">Practical responses</legend>{fields.map(field => {
      const value = saved.values[field.key] ?? '', invalid = !!value.trim() && !validPracticalNumber(value);
      return <div key={field.key} className="practical-response">
        <label className="type-label" htmlFor={`practical-${field.key}`}>{field.label}{field.unit && <span className="practical-unit"> / {field.unit}</span>}</label>
        <input className="type-body" id={`practical-${field.key}`} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={80} value={value} aria-invalid={!teacher && invalid && blurred[field.key] || undefined} aria-describedby={!teacher && invalid && blurred[field.key] ? `practical-error-${field.key}` : undefined} onChange={event => saved.edit(field.key, event.target.value)} onBlur={() => { if (!teacher) { setBlurred(previous => ({ ...previous, [field.key]: true })); void saved.flush(); } }}/>
        {!teacher && invalid && blurred[field.key] && <p id={`practical-error-${field.key}`} className="type-caption" role="alert">Enter a finite number, for example 0.250 or 2.50e-4. This entry is not saved yet.</p>}
      </div>;
    })}</fieldset>
      {!teacher && <div className="practical-status type-caption" aria-live="polite">{readOnly && <span>The practical has finished. Saved responses are read-only.</span>}{saved.status === 'pending' && <span>Changes awaiting save…</span>}{saved.status === 'saved' && !readOnly && <span>Saved</span>}</div>}
      {readOnly && saved.status === 'pending' && <button className="ui-button" onClick={() => void saved.discardAndReload()}>Discard unsaved changes and reload</button>}
    </> : null}
    {saved.status === 'loading' && <p role="status">Loading saved responses…</p>}
    {saved.status === 'failed' && <div className="practical-save-error type-caption" role="alert"><p>{saved.error} Navigation is paused until your changes are saved.</p><button className="ui-button" onClick={() => void saved.retry()}>Retry save</button>{saved.view && <button className="ui-button" onClick={() => void saved.discardAndReload()}>Discard unsaved changes and reload</button>}</div>}
    {!teacher && saved.view && <div className="practical-navigation"><p className="practical-countdown type-label" role="timer">{readOnly ? 'Practical closed' : `Time remaining: ${durationText((eventTiming(event).practicalEndsAt ?? now) - now)}`}</p>{onTheory && <button className="ui-button" onClick={onTheory}>Theory challenge</button>}</div>}
  </div>;
}

/** Teacher results load labels under a teacher-only catalogue context, never via a static protocol import. */
export function PracticalTeamResult({ result }: { result?: PracticalResult | null }) {
  const security=useCompetitionSecurity(),year=result?.year;
  const hasResponses=Object.values(result?.responses ?? {}).some(response=>response != null && response.text.trim()!=='');
  const [presentation,setPresentation]=useState<PracticalPresentation>(),[retry,setRetry]=useState(0),[error,setError]=useState('');
  useEffect(()=>{let current=true;setPresentation(undefined);setError('');if(security.server?.role!=='teacher' || !year || !hasResponses)return;void request<{presentation:PracticalPresentation}>('practical-content',{contentId:year,eventId:'catalogue-'+year}).then(value=>{if(current)setPresentation(value.presentation);}).catch(()=>{if(current)setError('Unable to load response labels.');});return()=>{current=false;};},[security.server?.role,security.server?.expiresAt,year,hasResponses,retry]);
  const definition=findPractical(year),final=result?.responses.numPracticalResponse4;
  if(!definition || !hasResponses)return <>–</>;
  const fields=presentation?.fields ?? definition.fields.map((field,index)=>({...field,label:`Response ${index+1}`,unit:''}));
  const field=fields.find(item=>item.key==='numPracticalResponse4')!;
  return <div className="practical-team-result"><strong>{final != null ? `${final.text}${field.unit ? ' '+field.unit : ''}` : '–'}</strong>{error && <p role="alert">{error}<button className="ui-button" onClick={()=>setRetry(value=>value+1)}>Retry labels</button></p>}<details><summary>Working responses</summary><dl>{fields.map(item => <div key={item.key}><dt>{item.label}{item.unit ? ` / ${item.unit}` : ''}</dt><dd>{result?.responses[item.key]?.text ?? '–'}</dd></div>)}</dl></details></div>;
}
