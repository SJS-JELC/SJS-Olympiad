import { useEffect, useState, type MutableRefObject, type ReactNode } from 'react';
import type { EventRecord, PracticalField, PracticalResult } from '../cloud/api';
import { useCompetitionSecurity } from '../security';
import { durationText, eventTiming, practicalPhase } from '../events/timing';
import { ArtworkBackButton } from '../components/SharedNavigation';
import { findPractical, practicalCatalog, validPracticalNumber, type PracticalDefinition } from './catalog';
import { usePractical } from './usePractical';
import eagle from '../assets/powerapp/asset-30.svg';
import mohr from './assets/mohr-crisps.svg';
import cuttlefish from './assets/cuttlefish.png';
import './practical.css';

export function PracticalCatalogue({ onOpen }: { onOpen: (year: string) => void }) {
  return <section className="practical-catalogue" aria-labelledby="practical-catalogue-title"><h3 id="practical-catalogue-title" className="type-heading">Practical</h3><div className="practical-catalogue-list">{practicalCatalog.map(item => <button key={item.year} className="ui-button" onClick={() => onOpen(item.year)} aria-label={`${item.year} practical: ${item.title}`}><span className="type-label">{item.year}</span> <span>{item.title}</span></button>)}</div></section>;
}

export function PracticalShell({ definition, onBack, backLabel, children }: { definition: PracticalDefinition; onBack: () => void; backLabel: string; children: ReactNode }) {
  return <div className="splash-preview question-page practical-page"><main className="question-stage"><header className="question-header">{definition.year === 'L5' && <img className="practical-header-art" src={cuttlefish} alt="Cuttlefish" draggable={false}/>}<div className="question-identity"><img className="question-eagle" src={eagle} alt="St John’s Olympiad eagle" draggable={false}/><div className="question-title-panel"><h1 className="type-heading practical-title"><span className="type-caption">{definition.year} Practical</span>{definition.title}</h1></div></div><div className="question-navigation"><ArtworkBackButton className="question-back" onClick={onBack} label={backLabel}/></div></header>{children}</main></div>;
}

type PracticalProps = { definition: PracticalDefinition; event: EventRecord; flushRef: MutableRefObject<(() => Promise<boolean>) | null>; onTheory?: () => void };
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
  const saved = usePractical(event.id, security.guard, security.canAccessPractical);
  useEffect(() => { flushRef.current = saved.flush; return () => { flushRef.current = null; }; });
  return <PracticalContent {...props} saved={saved} teacher={false}/>;
}

function Protocol({ definition }: { definition: PracticalDefinition }) {
  const paragraphs = definition.html ? definition.protocol.split(/(?:\s*<br\s*\/?\s*>\s*){2,}/i) : definition.protocol.split(/\n\s*\n/);
  return <div className="practical-protocol-text">{paragraphs.filter(text => text.trim()).map((text, index) => definition.html
    ? <p key={index} dangerouslySetInnerHTML={{ __html: text.trim().replace(/\s*\n\s*/g, ' ').replace(/\s*<br\s*\/?\s*>\s*/gi, '<br/>') }}/>
    : <p key={index}>{text.trim().replace(/\s*\n\s*/g, ' ')}</p>)}</div>;
}

function PracticalContent({ definition, event, onTheory, saved, teacher }: PracticalProps & { saved: PracticalModel; teacher: boolean }) {
  const security = useCompetitionSecurity();
  const [now, setNow] = useState(security.serverNow), [blurred, setBlurred] = useState<Record<string, boolean>>({});
  useEffect(() => { const timer = window.setInterval(() => setNow(security.serverNow()), 250); return () => window.clearInterval(timer); }, [security.serverNow]);
  const readOnly = !teacher && practicalPhase(event, now) !== 'open';
  return <div className="practical-content type-body">
    <section className="practical-protocol" aria-label="Practical protocol" tabIndex={0}>
      {definition.year === 'L6' && <img className="practical-mohr" src={mohr} alt="Mohr Crisps"/>}
      <Protocol definition={definition}/>
    </section>
    {saved.view ? <><fieldset className={`practical-responses${definition.fields.length === 2 ? ' practical-responses--two' : ''}`} disabled={readOnly || saved.status === 'loading'} aria-label="Practical responses"><legend className="sr-only">Practical responses</legend>{definition.fields.map(field => {
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

export function PracticalTeamResult({ result }: { result?: PracticalResult | null }) {
  const definition = findPractical(result?.year), final = result?.responses.numPracticalResponse4;
  if (!definition) return <>Final answer not submitted</>;
  const field = definition.fields.find(item => item.key === 'numPracticalResponse4')!;
  return <div className="practical-team-result"><strong>{final != null ? `${final.text} ${field.unit}` : 'Final answer not submitted'}</strong><details><summary>Working responses</summary><dl>{definition.fields.map(item => <div key={item.key}><dt>{item.label}{item.unit ? ` / ${item.unit}` : ''}</dt><dd>{result?.responses[item.key]?.text ?? 'Not submitted'}</dd></div>)}</dl></details></div>;
}
