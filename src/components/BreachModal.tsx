import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCompetitionSecurity } from '../security';
import { BreachBeacon } from './BreachBeacon';
import './BreachModal.css';

export function BreachModal({ onEnded }: { onEnded: () => void }) {
  const security = useCompetitionSecurity();
  const [pin, setPin] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = security.phase !== 'idle';
  useEffect(() => {
    const previous = document.activeElement;
    input.current?.focus();
    const keepFocus = (event: FocusEvent) => {
      if (!dialog.current?.contains(event.target as Node)) dialog.current?.focus();
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)') ?? []);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); dialog.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('focusin', keepFocus);
    document.addEventListener('keydown', keys, true);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      document.removeEventListener('keydown', keys, true);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  async function unlock(event: FormEvent) {
    event.preventDefault();
    const entered = pin; setPin('');
    await security.unlock(entered);
    input.current?.focus();
  }
  async function end() {
    const entered = pin; setPin('');
    if (await security.end(entered)) onEnded();
    else input.current?.focus();
  }
  return <div className="breach-overlay">
    <div ref={dialog} className="breach-dialog" role="dialog" aria-modal="true" aria-labelledby="breach-title" aria-describedby="breach-description" tabIndex={-1}>
      <BreachBeacon />
      <h1 id="breach-title">COMPETITION MODE BREACHED</h1>
      <p id="breach-description">A member of staff must enter the PIN to resume.</p>
      <form onSubmit={unlock}>
        <label htmlFor="breach-pin">Staff PIN</label>
        <div className="breach-pin">
          <div className="breach-pin-slots" aria-hidden="true">{[0, 1, 2, 3].map(index => <span key={index}>{pin.length > index ? '●' : ''}</span>)}</div>
          <input ref={input} id="breach-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} disabled={busy} aria-describedby="breach-pin-note" />
        </div>
        <p id="breach-pin-note" className="breach-note">Enter the four-digit staff PIN. Unlocking restores fullscreen.</p>
        <div className="breach-error" role="alert">{security.error || (!security.storageHealthy ? 'Session storage is unavailable. Staff recovery is required.' : '')}</div>
        <button className="breach-unlock" disabled={busy || pin.length !== 4 || !security.storageHealthy}>{busy ? 'Please wait…' : 'Staff unlock'}</button>
        <button type="button" className="breach-end" disabled={busy || pin.length !== 4 || !security.storageHealthy} onClick={() => void end()}>End Competition Mode</button>
      </form>
    </div>
  </div>;
}
