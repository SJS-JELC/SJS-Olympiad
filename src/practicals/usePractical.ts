import { useEffect, useRef, useState } from 'react';
import { request, type PracticalField, type PracticalView } from '../cloud/api';
import { validPracticalNumber } from './catalog';

type Values = Partial<Record<PracticalField, string>>;
const fromView = (view: PracticalView): Values => Object.fromEntries(Object.entries(view.responses).map(([key, value]) => [key, value?.text ?? '']));

/** A single sequential queue. An uncertain response retries its original receipt ID. */
export function usePractical(eventId: string, guard: () => Promise<boolean>, canEdit: () => boolean) {
  const [view, setView] = useState<PracticalView | null>(null), [values, setValues] = useState<Values>({});
  const [status, setStatus] = useState<'loading' | 'saved' | 'pending' | 'failed'>('loading'), [error, setError] = useState('');
  const state = useRef({ generation: 0, loadNonce: 0, loading: false, view: null as PracticalView | null, values: {} as Values, acknowledged: {} as Values, timer: 0, running: null as Promise<boolean> | null, receipt: null as { requestId: string; expectedRevision: number; changes: Partial<Record<PracticalField, string | null>> } | null });
  const guardRef = useRef(guard); guardRef.current = guard;
  const canEditRef = useRef(canEdit); canEditRef.current = canEdit;
  const load = async () => {
    const current = state.current, generation = current.generation, nonce = ++current.loadNonce;
    const latest = () => state.current === current && current.generation === generation && current.loadNonce === nonce;
    current.loading = true; window.clearTimeout(current.timer);
    setStatus('loading'); setError('');
    try {
      if (!await guardRef.current()) throw new Error('The session could not be verified.');
      const next = await request<PracticalView>('practical', { eventId });
      if (!latest()) return;
      current.view = next; current.values = fromView(next); current.acknowledged = { ...current.values };
      setView(next); setValues({ ...current.values }); setStatus('saved');
    } catch (error) { if (latest()) { setStatus('failed'); setError(error instanceof Error ? error.message : 'Practical responses could not be loaded.'); } }
    finally { if (latest()) current.loading = false; }
  };
  useEffect(() => {
    void load();
    return () => { state.current.generation++; window.clearTimeout(state.current.timer); };
  }, [eventId]);
  function changes(current: typeof state.current) {
    return Object.fromEntries(Object.entries(current.values).filter(([key, text]) => text !== (current.acknowledged[key as PracticalField] ?? '') && (!text.trim() || validPracticalNumber(text))).map(([key, text]) => [key, text.trim() ? text : null])) as Partial<Record<PracticalField, string | null>>;
  }
  function invalid(current: typeof state.current) {
    return Object.values(current.values).some(text => !!text?.trim() && !validPracticalNumber(text));
  }
  async function flush(): Promise<boolean> {
    const current = state.current;
    window.clearTimeout(current.timer);
    if (current.loading) return false;
    if (current.running) { if (!await current.running) return false; return flush(); }
    if (!current.view) return false;
    const pending = changes(current);
    if (!current.receipt && !Object.keys(pending).length) { setStatus(invalid(current) ? 'pending' : 'saved'); return !invalid(current); }
    // The latest verified event schedule can reopen a previously closed view.
    if (!canEditRef.current()) return false;
    const generation = current.generation;
    current.running = (async () => {
      setStatus('pending'); setError('');
      try {
        if (!await guardRef.current() || !canEditRef.current()) throw new Error('The session or practical window could not be verified. Your changes have not been saved.');
        current.receipt ??= { requestId: crypto.randomUUID(), expectedRevision: current.view!.revision, changes: pending };
        const receipt = current.receipt;
        const next = await request<PracticalView>('practical-save', { eventId, ...receipt });
        if (state.current !== current || generation !== current.generation) return false;
        if (next.revision < current.view!.revision) throw new Error('An older save response was ignored. Retry to verify your responses.');
        for (const [key, text] of Object.entries(receipt.changes)) current.acknowledged[key as PracticalField] = text ?? '';
        current.view = next; current.receipt = null; setView(next); setStatus('saved'); return true;
      } catch (error) {
        if (state.current === current && generation === current.generation) { setStatus('failed'); setError(error instanceof Error ? error.message : 'Your changes have not been saved.'); }
        return false;
      } finally { current.running = null; }
    })();
    if (!await current.running) return false;
    return flush();
  }
  function edit(key: PracticalField, text: string) {
    const current = state.current;
    if (current.loading || !canEditRef.current()) return;
    current.values = { ...current.values, [key]: text }; setValues(current.values);
    window.clearTimeout(current.timer);
    setStatus(previous => previous === 'failed' ? 'failed' : 'pending');
    // Invalid/incomplete input stays local. Clearing explicitly saves null.
    if (!text.trim() || validPracticalNumber(text)) current.timer = window.setTimeout(() => void flush(), 500);
  }
  async function discardAndReload() {
    if (state.current.running) return;
    window.clearTimeout(state.current.timer); state.current.receipt = null;
    await load();
  }
  return { view, values, status, error, edit, flush, discardAndReload, retry: () => view ? flush() : load() };
}
