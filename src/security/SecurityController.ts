import { LocalStorageSnapshotAdapter, validateSnapshot } from './securityStorage';
import { testStaffPinVerifier } from './securityEvents';
import type { SecurityEventType, SecuritySnapshot, SecurityView, SnapshotAdapter, StaffPinVerifier } from './securityTypes';

const initial = (): SecurityView => ({ session: { status: 'NOT_STARTED', eventCount: 0 }, events: [], phase: 'loading', error: null, storageHealthy: true });
export class SecurityController {
  private view = initial();
  private listeners = new Set<() => void>();
  private generation = 0;
  private queue: Promise<void> = Promise.resolve();
  private initPromise?: Promise<void>;
  private incidentAt = -Infinity;
  private incidentId: string | undefined;
  constructor(private adapter: SnapshotAdapter = new LocalStorageSnapshotAdapter(), private verifier: StaffPinVerifier = testStaffPinVerifier) {}
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(view: SecurityView) { this.view = view; this.listeners.forEach(listener => listener()); }
  private event(type: SecurityEventType) { return { id: crypto.randomUUID(), type, at: new Date().toISOString() }; }
  private snapshot(view = this.view): SecuritySnapshot { return structuredClone({ version: 1, session: view.session, events: view.events }); }
  private save(snapshot: SecuritySnapshot, guard?: () => boolean): Promise<boolean> {
    const operation = this.queue.then(async () => { if (guard && !guard()) return false; await this.adapter.save(snapshot); return true; });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  private failed() {
    this.generation++;
    const event = this.event('STORAGE_FAILURE');
    const active = this.view.session.status === 'ACTIVE';
    const events = active ? [...this.view.events, event] : this.view.events;
    this.publish({ ...this.view, session: active ? { ...this.view.session, status: 'LOCKED', lockedAt: event.at, lockReason: event.type, eventCount: events.length } : this.view.session, events, phase: 'idle', storageHealthy: false, error: 'Session storage is unavailable or invalid. Competition content remains locked.' });
  }
  initialize = (): Promise<void> => this.initPromise ??= this.restore();
  private async restore() {
    const token = this.generation;
    try {
      const loaded = await this.adapter.load();
      const stored = loaded === null ? null : validateSnapshot(loaded);
      if (token !== this.generation) throw new Error('Storage changed during restoration');
      if (stored?.session.status === 'ACTIVE') {
        const event = this.event('SESSION_INTERRUPTED');
        const events = [...stored.events, event];
        const restored: SecurityView = { ...this.view, session: { ...stored.session, status: 'LOCKED', lockedAt: event.at, lockReason: event.type, eventCount: events.length }, events, phase: 'idle' };
        // A persisted ACTIVE value is never published, even for one render.
        this.publish(restored);
        try { await this.save(this.snapshot()); } catch { this.failed(); }
      } else {
        this.publish({ ...this.view, ...(stored ? { session: stored.session, events: stored.events } : {}), phase: 'idle' });
      }
    } catch {
      const event = this.event('STORAGE_FAILURE');
      this.publish({ session: { status: 'LOCKED', eventCount: 1, lockedAt: event.at, lockReason: event.type }, events: [event], phase: 'idle', storageHealthy: false, error: 'Session storage is unavailable or invalid. Staff recovery is required.' });
    }
  }
  interrupt = (reason: SecurityEventType) => {
    const pending = this.view.phase === 'entering' || this.view.phase === 'unlocking';
    if (!pending && this.view.session.status === 'LOCKED' && performance.now() - this.incidentAt <= 500) {
      const incident = this.view.events.find(event => event.id === this.incidentId);
      if (incident && incident.type !== reason && !incident.relatedSignals?.includes(reason)) {
        const events = this.view.events.map(event => event.id === this.incidentId ? { ...event, relatedSignals: [...(event.relatedSignals ?? []), reason] } : event);
        this.publish({ ...this.view, events });
        void this.save(this.snapshot()).catch(() => this.failed());
      }
      return;
    }
    if (this.view.session.status !== 'ACTIVE' && !pending) return;
    this.generation++;
    const event = this.event(reason);
    const wasActive = this.view.session.status === 'ACTIVE';
    if (wasActive) { this.incidentAt = performance.now(); this.incidentId = event.id; }
    const events = wasActive ? [...this.view.events, event] : this.view.events;
    this.publish({ ...this.view, session: wasActive ? { ...this.view.session, status: 'LOCKED', lockedAt: event.at, lockReason: reason, eventCount: events.length } : this.view.session, events, phase: 'idle', error: pending ? 'Entry was interrupted. Try again when this page is visible and focused.' : null });
    void this.save(this.snapshot()).catch(() => this.failed());
  };
  externalChange = (incoming?: string | null) => {
    this.generation++;
    if (this.view.phase === 'loading') return;
    const newlyLocked = this.view.session.status !== 'LOCKED';
    const event = this.event('CROSS_TAB_CONFLICT');
    const events = newlyLocked ? [...this.view.events, event] : this.view.events;
    this.publish({ ...this.view, session: { ...this.view.session, status: 'LOCKED', lockedAt: this.view.session.lockedAt ?? event.at, lockReason: this.view.session.lockReason ?? event.type, eventCount: events.length }, events, phase: 'idle', error: 'Shared session storage changed in another tab. Staff recovery is required.' });
    let unsafeIncoming = incoming === null;
    if (typeof incoming === 'string') {
      try { unsafeIncoming = validateSnapshot(JSON.parse(incoming)).session.status !== 'LOCKED'; }
      catch { unsafeIncoming = true; }
    }
    // Repair cleared/unsafe storage even when already locked. Incoming locked
    // snapshots are never echoed, so lock repairs cannot produce ping-pong.
    if (newlyLocked || unsafeIncoming) void this.save(this.snapshot()).catch(() => this.failed());
  };
  private valid(token: number) { return token === this.generation && !document.hidden && document.hasFocus() && document.fullscreenElement === document.documentElement; }
  private async activate(unlock: boolean) {
    const token = ++this.generation;
    this.publish({ ...this.view, phase: unlock ? 'unlocking' : 'entering', error: null });
    try {
      if (!document.documentElement.requestFullscreen) throw new Error('Fullscreen is not supported on this browser.');
      // Called before the first await, preserving the start/unlock button's user gesture.
      await document.documentElement.requestFullscreen();
      if (!this.valid(token)) throw new Error('Entry was interrupted. Keep this page visible and focused.');
      const event = this.event(unlock ? 'STAFF_UNLOCK' : 'COMPETITION_STARTED');
      const events = [...this.view.events, event];
      const candidate: SecurityView = { ...this.view, session: { status: 'ACTIVE', startedAt: this.view.session.startedAt ?? event.at, eventCount: events.length }, events, phase: 'idle', error: null };
      let saved: boolean;
      try { saved = await this.save(this.snapshot(candidate), () => this.valid(token)); }
      catch { this.failed(); throw new Error('Session could not be saved. Competition remains gated.'); }
      if (!saved || !this.valid(token)) {
        // An interrupt already queues its gated snapshot. A stale attempt must
        // never append a compensating write behind a newer activation.
        if (token === this.generation) await this.save(this.snapshot(), () => token === this.generation);
        throw new Error('Entry was interrupted before completion.');
      }
      this.publish(candidate);
    } catch (error) {
      if (token === this.generation) this.publish({ ...this.view, phase: 'idle', error: error instanceof Error ? error.message : 'Fullscreen entry failed.' });
    }
  }
  start = async () => { if (this.view.phase !== 'idle' || this.view.session.status !== 'NOT_STARTED' || !this.view.storageHealthy) return; await this.activate(false); };
  unlock = async (pin: string) => {
    if (this.view.phase !== 'idle' || this.view.session.status !== 'LOCKED' || !this.view.storageHealthy) return;
    if (!this.verifier.verify(pin)) {
      const events = [...this.view.events, this.event('INVALID_STAFF_PIN')];
      this.publish({ ...this.view, events, session: { ...this.view.session, eventCount: events.length }, error: 'Incorrect staff PIN.' });
      try { await this.save(this.snapshot()); } catch { this.failed(); }
      return;
    }
    await this.activate(true);
  };
  reset = async () => {
    if (this.view.phase !== 'idle' || this.view.session.status !== 'NOT_STARTED') return;
    const token = ++this.generation;
    this.publish({ ...this.view, phase: 'entering', error: null });
    const events = [this.event('SESSION_RESET')];
    const view: SecurityView = { ...initial(), phase: 'idle', events, session: { status: 'NOT_STARTED', eventCount: events.length } };
    try { await this.save(this.snapshot(view), () => token === this.generation); if (token === this.generation) this.publish(view); } catch { this.publish({ ...this.view, phase: 'idle' }); this.failed(); }
  };
}
