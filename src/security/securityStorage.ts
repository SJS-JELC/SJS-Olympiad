import type { SecuritySnapshot, SnapshotAdapter } from './securityTypes';
export const STORAGE_KEY = 'sjs-olympiad-security-v1';
const types = new Set(['COMPETITION_STARTED','PAGE_HIDDEN','WINDOW_BLUR','FULLSCREEN_EXIT','INVALID_STAFF_PIN','STAFF_UNLOCK','SESSION_RESET','SESSION_INTERRUPTED','CROSS_TAB_CONFLICT','STORAGE_FAILURE']);
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function validateSnapshot(value: unknown): SecuritySnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid stored snapshot');
  const s = value as SecuritySnapshot;
  if (s.version !== 1 || !s.session || !Array.isArray(s.events) || !['NOT_STARTED','ACTIVE','LOCKED'].includes(s.session.status) || s.session.eventCount !== s.events.length) throw new Error('Invalid stored session');
  const ids = new Set<string>();
  for (const e of s.events) {
    if (!e || typeof e.id !== 'string' || ids.has(e.id) || !types.has(e.type) || !date(e.at) || (e.reason !== undefined && typeof e.reason !== 'string')) throw new Error('Invalid stored events');
    ids.add(e.id);
    if (e.relatedSignals !== undefined && (!Array.isArray(e.relatedSignals) || e.relatedSignals.some(signal => !types.has(signal)) || new Set(e.relatedSignals).size !== e.relatedSignals.length)) throw new Error('Invalid related signals');
  }
  if (s.session.startedAt !== undefined && !date(s.session.startedAt)) throw new Error('Invalid start time');
  if (s.session.status === 'ACTIVE' && (!date(s.session.startedAt) || s.session.lockedAt !== undefined || s.session.lockReason !== undefined)) throw new Error('Inconsistent active session');
  if (s.session.status === 'LOCKED' && (!date(s.session.lockedAt) || !types.has(s.session.lockReason!))) throw new Error('Inconsistent locked session');
  if (s.session.status === 'LOCKED' && !s.events.some(event => event.type === s.session.lockReason && event.at === s.session.lockedAt)) throw new Error('Missing primary lock event');
  if (s.session.status === 'ACTIVE' && !['COMPETITION_STARTED','STAFF_UNLOCK'].includes(s.events.at(-1)?.type ?? '')) throw new Error('Missing activation event');
  if (s.session.status === 'NOT_STARTED' && (s.session.startedAt !== undefined || s.session.lockedAt !== undefined || s.session.lockReason !== undefined)) throw new Error('Inconsistent initial session');
  return structuredClone(s);
}
export class LocalStorageSnapshotAdapter implements SnapshotAdapter {
  async load() { const raw = localStorage.getItem(STORAGE_KEY); return raw === null ? null : validateSnapshot(JSON.parse(raw)); }
  async save(snapshot: SecuritySnapshot) { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); }
  async clear() { localStorage.removeItem(STORAGE_KEY); }
}
