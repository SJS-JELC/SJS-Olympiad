import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCompetitionSecurity } from '../security';
import { CodePanels } from './CodePanels';
import { BreachBeacon } from './BreachBeacon';
import './BreachModal.css';
export function BreachModal() {
    const security = useCompetitionSecurity();
    const [code, setCode] = useState('');
    const dialog = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
    const busy = security.phase !== 'idle';
    useEffect(() => {
        input.current?.focus();
        const focus = (event: FocusEvent) => { if (!dialog.current?.contains(event.target as Node))
            dialog.current?.focus(); };
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
            }
            if (event.key !== 'Tab')
                return;
            const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled)') ?? []), first = controls[0], last = controls.at(-1);
            if (!first) {
                event.preventDefault();
                dialog.current?.focus();
            }
            else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('focusin', focus);
        document.addEventListener('keydown', key, true);
        return () => { document.removeEventListener('focusin', focus); document.removeEventListener('keydown', key, true); };
    }, []);
    async function verify(event: FormEvent) { event.preventDefault(); const value = code; setCode(''); await security.unlock(value); }
    return <div className="breach-overlay"><div ref={dialog} className="breach-dialog" role="dialog" aria-modal="true" aria-labelledby="breach-title" aria-describedby="breach-description" tabIndex={-1}>
    <BreachBeacon /><h1 id="breach-title">COMPETITION MODE BREACHED</h1>
    <p id="breach-description">A member of staff must verify the teacher code before you can resume.</p>
    <form onSubmit={verify}>
      {!security.recoveryReady && <><CodePanels className="breach-pin" id="breach-pin" label="Teacher code" value={code} onChange={setCode} disabled={busy} inputRef={input}/><button className="breach-unlock" disabled={busy || !code.trim()}>{busy ? 'Verifying…' : 'CONFIRM'}</button></>}
      {security.recoveryReady && <><p>Staff verification accepted. Resume to enter fullscreen.</p><button autoFocus type="button" className="breach-unlock" disabled={busy} onClick={() => void security.resume()}>{busy ? 'Resuming…' : 'Resume competition'}</button></>}
      <div className="breach-error" role="alert">{security.error}</div>
    </form>
  </div></div>;
}
