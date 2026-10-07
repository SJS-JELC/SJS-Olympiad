// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageSnapshotAdapter, SecurityController, STORAGE_KEY, TEST_STAFF_PIN, validateSnapshot, type SecuritySnapshot, type SnapshotAdapter } from '../../src/security';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function memory(stored: SecuritySnapshot | null = null) {
  const writes: SecuritySnapshot[] = [];
  const adapter: SnapshotAdapter = {
    load: vi.fn(async () => stored),
    save: vi.fn(async snapshot => { writes.push(structuredClone(snapshot)); }),
    clear: vi.fn(async () => {}),
  };
  return { adapter, writes };
}
function fullscreen() {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement });
}
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: vi.fn(async () => { fullscreen(); }) });
});

describe('security transitions', () => {
  it('ignores departure signals on the initial landing screen', async () => {
    const { adapter, writes } = memory(); const c = new SecurityController(adapter);
    await c.initialize(); c.interrupt('WINDOW_BLUR');
    expect(c.getSnapshot().session.status).toBe('NOT_STARTED'); expect(writes).toHaveLength(0);
  });
  it('persists start and its event before exposing active content', async () => {
    const { adapter, writes } = memory(); const gate = deferred();
    adapter.save = vi.fn(async snapshot => { writes.push(structuredClone(snapshot)); await gate.promise; });
    const c = new SecurityController(adapter); await c.initialize();
    const start = c.start(); await vi.waitFor(() => expect(writes).toHaveLength(1));
    expect(c.getSnapshot().session.status).toBe('NOT_STARTED');
    expect(writes[0].session.status).toBe('ACTIVE'); expect(writes[0].events.at(-1)?.type).toBe('COMPETITION_STARTED');
    gate.resolve(); await start; expect(c.getSnapshot().session.status).toBe('ACTIVE');
  });
  it.each(['PAGE_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT'] as const)('locks synchronously on %s, preserving the first reason', async reason => {
    const { adapter } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start();
    const gate = deferred(); adapter.save = vi.fn(() => gate.promise);
    c.interrupt(reason); c.interrupt('WINDOW_BLUR'); c.interrupt('FULLSCREEN_EXIT');
    expect(c.getSnapshot().session.status).toBe('LOCKED'); expect(c.getSnapshot().session.lockReason).toBe(reason);
    expect(c.getSnapshot().events).toHaveLength(2); gate.resolve();
  });
  it('rejects a wrong PIN without requesting fullscreen and saves no PIN', async () => {
    const { adapter, writes } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start(); c.interrupt('WINDOW_BLUR');
    const request = vi.mocked(document.documentElement.requestFullscreen); request.mockClear();
    await c.unlock('123456'); expect(request).not.toHaveBeenCalled(); expect(c.getSnapshot().session.status).toBe('LOCKED');
    expect(writes.at(-1)?.events.at(-1)?.type).toBe('INVALID_STAFF_PIN'); expect(JSON.stringify(writes)).not.toContain('123456');
  });
  it('commits staff unlock and event atomically, retaining original start time', async () => {
    const { adapter, writes } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start();
    const start = c.getSnapshot().session.startedAt; c.interrupt('WINDOW_BLUR'); await c.unlock(TEST_STAFF_PIN);
    expect(c.getSnapshot().session.status).toBe('ACTIVE'); expect(writes.at(-1)?.session.startedAt).toBe(start);
    expect(writes.at(-1)?.events.at(-1)?.type).toBe('STAFF_UNLOCK'); expect(JSON.stringify(writes)).not.toContain(TEST_STAFF_PIN);
  });
  it('keeps start gated after fullscreen rejection', async () => {
    vi.mocked(document.documentElement.requestFullscreen).mockRejectedValue(new Error('denied'));
    const { adapter, writes } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start();
    expect(c.getSnapshot().session.status).toBe('NOT_STARTED'); expect(writes).toHaveLength(0);
  });
  it.each([false, true])('gates content on persistence failure (unlock=%s)', async unlock => {
    const { adapter } = memory(); const c = new SecurityController(adapter); await c.initialize();
    if (unlock) { await c.start(); c.interrupt('WINDOW_BLUR'); await Promise.resolve(); }
    adapter.save = vi.fn(async () => { throw new Error('quota'); });
    await (unlock ? c.unlock(TEST_STAFF_PIN) : c.start());
    expect(c.getSnapshot().session.status).toBe(unlock ? 'LOCKED' : 'NOT_STARTED'); expect(c.getSnapshot().storageHealthy).toBe(false);
  });
  it.each([false, true])('invalidates interrupted fullscreen completion (unlock=%s)', async unlock => {
    const { adapter } = memory(); const c = new SecurityController(adapter); await c.initialize();
    if (unlock) { await c.start(); c.interrupt('WINDOW_BLUR'); }
    const gate = deferred(); vi.mocked(document.documentElement.requestFullscreen).mockImplementation(async () => { await gate.promise; fullscreen(); });
    const attempt = unlock ? c.unlock(TEST_STAFF_PIN) : c.start(); c.interrupt('PAGE_HIDDEN'); gate.resolve(); await attempt;
    expect(c.getSnapshot().session.status).toBe(unlock ? 'LOCKED' : 'NOT_STARTED');
  });
  it('cannot expose ACTIVE when interrupted during a pending save, and final persisted state stays gated', async () => {
    const { adapter, writes } = memory(); const c = new SecurityController(adapter); await c.initialize();
    const gate = deferred(); adapter.save = vi.fn(async snapshot => { writes.push(structuredClone(snapshot)); if (writes.length === 1) await gate.promise; });
    const attempt = c.start(); await vi.waitFor(() => expect(writes).toHaveLength(1)); c.interrupt('WINDOW_BLUR'); gate.resolve(); await attempt;
    expect(c.getSnapshot().session.status).toBe('NOT_STARTED'); expect(writes.at(-1)?.session.status).toBe('NOT_STARTED');
  });
  it('an interrupted older save cannot overwrite a successful immediate retry', async () => {
    const { adapter, writes } = memory(); const c = new SecurityController(adapter); await c.initialize();
    const gate = deferred(); adapter.save = vi.fn(async snapshot => { writes.push(structuredClone(snapshot)); if (writes.length === 1) await gate.promise; });
    const oldAttempt = c.start(); await vi.waitFor(() => expect(writes).toHaveLength(1));
    c.interrupt('WINDOW_BLUR'); const retry = c.start();
    gate.resolve(); await Promise.all([oldAttempt, retry]);
    expect(c.getSnapshot().session.status).toBe('ACTIVE'); expect(writes.at(-1)?.session.status).toBe('ACTIVE');
    expect(writes.at(-1)?.events).toEqual(c.getSnapshot().events);
  });
  it('blocks duplicate activation and reset during or after start', async () => {
    const { adapter } = memory(); const c = new SecurityController(adapter); await c.initialize(); const gate = deferred();
    vi.mocked(document.documentElement.requestFullscreen).mockImplementation(async () => { await gate.promise; fullscreen(); });
    const attempt = c.start(); await c.start(); await c.reset(); expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    gate.resolve(); await attempt; await c.reset(); expect(c.getSnapshot().session.status).toBe('ACTIVE'); c.interrupt('WINDOW_BLUR'); await c.reset(); expect(c.getSnapshot().session.status).toBe('LOCKED');
  });
  it('restores persisted ACTIVE directly to LOCKED without publishing ACTIVE', async () => {
    const m = memory(); const first = new SecurityController(m.adapter); await first.initialize(); await first.start();
    const c = new SecurityController(memory(m.writes.at(-1)!).adapter); const observed: string[] = [];
    c.subscribe(() => observed.push(c.getSnapshot().session.status)); await c.initialize();
    expect(observed).not.toContain('ACTIVE'); expect(c.getSnapshot().session.lockReason).toBe('SESSION_INTERRUPTED');
    expect(c.getSnapshot().session.startedAt).toBe(first.getSnapshot().session.startedAt);
  });
  it('never activates from external storage and preserves an existing lock reason', async () => {
    const { adapter } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start(); c.interrupt('WINDOW_BLUR');
    c.externalChange(); expect(c.getSnapshot().session.status).toBe('LOCKED'); expect(c.getSnapshot().session.lockReason).toBe('WINDOW_BLUR');
  });
  it('repairs cleared shared storage while locked without accepting activation', async () => {
    const { adapter, writes } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start(); c.interrupt('WINDOW_BLUR');
    await vi.waitFor(() => expect(writes.at(-1)?.session.status).toBe('LOCKED'));
    writes.length = 0; c.externalChange(null);
    await vi.waitFor(() => expect(writes.at(-1)?.session.status).toBe('LOCKED'));
    expect(c.getSnapshot().session.lockReason).toBe('WINDOW_BLUR');
    writes.length = 0; c.externalChange(JSON.stringify({ version: 1, session: { status: 'ACTIVE' }, events: [] }));
    await vi.waitFor(() => expect(writes.at(-1)?.session.status).toBe('LOCKED'));
  });
  it('aggregates related signals once while preserving incident time and count', async () => {
    const { adapter } = memory(); const c = new SecurityController(adapter); await c.initialize(); await c.start();
    c.interrupt('PAGE_HIDDEN'); const at = c.getSnapshot().session.lockedAt;
    c.interrupt('WINDOW_BLUR'); c.interrupt('WINDOW_BLUR'); c.interrupt('FULLSCREEN_EXIT');
    expect(c.getSnapshot().events.at(-1)?.relatedSignals).toEqual(['WINDOW_BLUR', 'FULLSCREEN_EXIT']);
    expect(c.getSnapshot().session.lockedAt).toBe(at); expect(c.getSnapshot().session.eventCount).toBe(2);
    vi.spyOn(performance, 'now').mockReturnValue(1e12); c.interrupt('SESSION_INTERRUPTED');
    expect(c.getSnapshot().events).toHaveLength(2);
  });
  it.each(['hidden', 'focus', 'wrong-root'] as const)('rejects a successful fullscreen promise with invalid %s conditions', async condition => {
    const c = new SecurityController(memory().adapter); await c.initialize();
    vi.mocked(document.documentElement.requestFullscreen).mockImplementation(async () => {
      fullscreen();
      if (condition === 'hidden') Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      if (condition === 'focus') vi.mocked(document.hasFocus).mockReturnValue(false);
      if (condition === 'wrong-root') Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body });
    });
    await c.start(); expect(c.getSnapshot().session.status).toBe('NOT_STARTED');
  });
});

describe('snapshot adapter', () => {
  it.each(['{bad', '{"version":2,"session":{},"events":[]}', '{"version":1,"session":{"status":"ACTIVE","eventCount":0},"events":[]}'])('fails closed for malformed or inconsistent persisted state %s', async raw => {
    localStorage.setItem(STORAGE_KEY, raw); const c = new SecurityController(); await c.initialize();
    expect(c.getSnapshot().session.status).toBe('LOCKED'); expect(c.getSnapshot().storageHealthy).toBe(false);
  });
  it('fails closed when storage cannot be read', async () => {
    const adapter = memory().adapter; adapter.load = vi.fn(async () => { throw new Error('blocked'); });
    const c = new SecurityController(adapter); await c.initialize(); expect(c.getSnapshot().session.status).toBe('LOCKED');
  });
  it('writes session and events with one storage operation', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem'); const adapter = new LocalStorageSnapshotAdapter();
    const snapshot: SecuritySnapshot = { version: 1, session: { status: 'NOT_STARTED', eventCount: 0 }, events: [] };
    await adapter.save(snapshot); expect(spy).toHaveBeenCalledTimes(1); expect(await adapter.load()).toEqual(snapshot);
  });
  it('rejects event count mismatch and duplicate diagnostic IDs', () => {
    const event = { id: 'same', type: 'SESSION_RESET', at: new Date().toISOString() };
    expect(() => validateSnapshot({ version: 1, session: { status: 'NOT_STARTED', eventCount: 1 }, events: [] })).toThrow();
    expect(() => validateSnapshot({ version: 1, session: { status: 'NOT_STARTED', eventCount: 2 }, events: [event, event] })).toThrow();
  });
});
