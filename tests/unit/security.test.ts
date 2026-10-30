// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityController } from '../../src/security/SecurityController';
import { HttpError, type SessionState, type request } from '../../src/cloud/api';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const base = (): SessionState => ({ role: 'competitor', expiresAt: Date.now() + 3600000, serverNow: Date.now(), configRevision: 1, activeEvent: { id: 'event', name: 'Event', year: 'L6', endsAt: Date.now() + 3600000, status: 'active', revision: 1 }, team: { id: 'team', name: 'Team', year: 'L6', eventId: 'event', claimGeneration: 1 }, competition: { status: 'NOT_STARTED', epoch: 1 }, score: 0, attempts: {} });
function fixture(initial = base()) {
    let state = initial;
    const calls: {
        action: string;
        body: any;
    }[] = [];
    const transport = vi.fn(async (action: string, body?: any) => { calls.push({ action, body }); if (action === 'session?restore=1' && state.competition.status === 'ACTIVE')
        state = { ...state, competition: { status: 'LOCKED', epoch: state.competition.epoch + 1 } }; if (action === 'start' || action === 'resume')
        state = { ...state, competition: { status: 'ACTIVE', epoch: state.competition.epoch + 1 } }; if (action === 'breach')
        state = { ...state, competition: { status: 'LOCKED', epoch: state.competition.epoch + 1 } }; if (action === 'recovery') {
        if (body.code !== 'teacher-secret')
            throw new HttpError(403, 'Code not recognised.');
        return { grant: 'one-use-grant' };
    } return structuredClone(state); }) as unknown as typeof request;
    return { controller: new SecurityController(transport), transport, calls, get: () => state, set: (value: SessionState) => { state = value; } };
}
beforeEach(() => { vi.restoreAllMocks(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null }); vi.spyOn(document, 'hasFocus').mockReturnValue(true); Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: vi.fn(async () => { Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement }); }) }); });
describe('server-authoritative access', () => {
    it('starts gated and requests restoration exactly once', async () => { const f = fixture(); expect(f.controller.canAccess()).toBe(false); await Promise.all([f.controller.initialize(), f.controller.initialize()]); expect(f.calls.filter(c => c.action === 'session?restore=1')).toHaveLength(1); expect(f.controller.canAccess()).toBe(false); });
    it('requires fullscreen and server acknowledgement before access', async () => { const f = fixture(); await f.controller.initialize(); const gate = deferred<SessionState>(); vi.mocked(f.transport).mockImplementationOnce(() => gate.promise as never); const work = f.controller.start(); await vi.waitFor(() => expect(f.calls).toHaveLength(1)); expect(f.controller.canAccess()).toBe(false); gate.resolve({ ...base(), competition: { status: 'ACTIVE', epoch: 2 } }); await work; expect(f.controller.canAccess()).toBe(true); });
    it.each(['PAGE_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'CROSS_TAB_CONFLICT'] as const)('synchronously closes access on %s', async (reason) => { const f = fixture(); await f.controller.initialize(); await f.controller.start(); expect(f.controller.canAccess()).toBe(true); f.controller.interrupt(reason); expect(f.controller.getSnapshot().session.status).toBe('LOCKED'); expect(f.controller.canAccess()).toBe(false); await vi.waitFor(() => expect(f.calls.some(c => c.action === 'breach')).toBe(true)); });
    it('restores active server state as locked without content exposure', async () => { const state = base(); state.competition.status = 'ACTIVE'; const f = fixture(state); await f.controller.initialize(); expect(f.controller.getSnapshot().session.status).toBe('LOCKED'); expect(f.controller.canAccess()).toBe(false); });
    it('regular polls cannot unlock local lock', async () => { const f = fixture(); await f.controller.initialize(); await f.controller.start(); f.controller.interrupt('WINDOW_BLUR'); await Promise.resolve(); f.set({ ...base(), competition: { status: 'ACTIVE', epoch: 3 } }); await f.controller.refresh(); expect(f.controller.canAccess()).toBe(false); expect(f.controller.getSnapshot().session.status).toBe('LOCKED'); });
    it('teacher previews work without team/fullscreen and never become competitor', async () => { const state = base(); state.role = 'teacher'; state.team = null; const f = fixture(state); await f.controller.initialize(); expect(f.controller.canAccess()).toBe(true); f.controller.interrupt('WINDOW_BLUR'); expect(f.controller.getSnapshot().server?.role).toBe('teacher'); expect(f.controller.canAccess()).toBe(true); });
    it('rejects wrong recovery code without fullscreen request', async () => { const f = fixture(); await f.controller.initialize(); await f.controller.start(); f.controller.interrupt('WINDOW_BLUR'); await Promise.resolve(); vi.mocked(document.documentElement.requestFullscreen).mockClear(); await f.controller.unlock('wrong'); expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled(); expect(f.controller.getSnapshot().recoveryReady).toBe(false); expect(f.controller.canAccess()).toBe(false); });
    it('verification grants no access until explicit fullscreen resume and server acknowledgement', async () => { const f = fixture(); await f.controller.initialize(); await f.controller.start(); f.controller.interrupt('WINDOW_BLUR'); await Promise.resolve(); await f.controller.unlock('teacher-secret'); expect(f.controller.getSnapshot().recoveryReady).toBe(true); expect(f.controller.canAccess()).toBe(false); await f.controller.resume(); expect(f.controller.canAccess()).toBe(true); expect(f.controller.getSnapshot().server?.role).toBe('competitor'); });
    it('fullscreen rejection leaves content gated', async () => { const f = fixture(); await f.controller.initialize(); vi.mocked(document.documentElement.requestFullscreen).mockRejectedValue(new Error('Denied')); await f.controller.start(); expect(f.controller.canAccess()).toBe(false); expect(f.calls.some(c => c.action === 'start')).toBe(false); });
    it('interrupted deferred entry cannot activate from a stale acknowledgement', async () => { const f = fixture(); await f.controller.initialize(); const gate = deferred<void>(); vi.mocked(document.documentElement.requestFullscreen).mockReturnValue(gate.promise); const work = f.controller.start(); f.controller.interrupt('WINDOW_BLUR'); gate.resolve(); await work; expect(f.controller.canAccess()).toBe(false); expect(f.calls.some(c => c.action === 'start')).toBe(false); });
    it('offline protected action closes active content', async () => { const f = fixture(); await f.controller.initialize(); await f.controller.start(); vi.mocked(f.transport).mockRejectedValueOnce(new Error('Offline')); expect(await f.controller.guard()).toBe(false); expect(f.controller.canAccess()).toBe(false); expect(f.controller.getSnapshot().storageHealthy).toBe(false); });
    it('event ending, year mismatch and expiry synchronously gate access', async () => { for (const mutation of [(state: SessionState) => { state.activeEvent!.status = 'ended'; }, (state: SessionState) => { state.team!.year = 'U6'; }, (state: SessionState) => { state.activeEvent!.endsAt = Date.now() - 1; }]) {
        const f = fixture();
        await f.controller.initialize();
        await f.controller.start();
        const state = structuredClone(f.get());
        mutation(state);
        f.controller.update(state);
        expect(f.controller.canAccess()).toBe(false);
    } });
    it('rejects malformed sessions and fails closed', async () => { const f = fixture(); vi.mocked(f.transport).mockResolvedValueOnce({ role: 'administrator' } as never); await f.controller.initialize(); expect(f.controller.canAccess()).toBe(false); expect(f.controller.getSnapshot().storageHealthy).toBe(false); });
    it('a later restoration response cannot replace an interruption', async () => { const f = fixture(); await f.controller.initialize(); await f.controller.start(); const gate = deferred<SessionState>(); vi.mocked(f.transport).mockImplementationOnce(() => gate.promise as never); const poll = f.controller.refresh(); f.controller.interrupt('WINDOW_BLUR'); gate.resolve({ ...base(), competition: { status: 'ACTIVE', epoch: 2 } }); await poll; expect(f.controller.canAccess()).toBe(false); });
    it('keeps fullscreen entry before theory and closes only question access at the theory boundary', async () => {
        let now = 100000; vi.spyOn(Date, 'now').mockImplementation(() => now);
        const state = base(); Object.assign(state.activeEvent!, {theoryStartsAt:200000,theoryEndsAt:300000,practicalStartsAt:350000,practicalEndsAt:500000,endsAt:500000});
        const f = fixture(state); await f.controller.initialize(); await f.controller.start();
        expect(f.controller.canAccess()).toBe(true); expect(f.controller.canAccessTheory()).toBe(false);
        now = 200000; f.controller.checkBoundary(); expect(f.controller.canAccessTheory()).toBe(true);
        const epoch = f.controller.getSnapshot().server!.competition.epoch;
        now = 300000; f.controller.checkBoundary();
        expect(f.controller.canAccessTheory()).toBe(false); expect(f.controller.canAccess()).toBe(true);
        expect(f.controller.getSnapshot().session.status).toBe('ACTIVE');
        expect(f.controller.getSnapshot().server!.competition.epoch).toBe(epoch);
        expect(f.calls.some(call => call.action === 'breach')).toBe(false);
        now = 500000; f.controller.checkBoundary();
        expect(f.controller.getSnapshot().session.status).toBe('NOT_STARTED');
        expect(f.calls.some(call => call.action === 'breach')).toBe(false);
    });
    it('uses the server clock for theory boundaries when the device clock is skewed', async () => {
        let localNow = 10000000; vi.spyOn(Date, 'now').mockImplementation(() => localNow);
        const state = base(); state.serverNow = 100000;
        Object.assign(state.activeEvent!, {theoryStartsAt:110000,theoryEndsAt:120000,practicalEndsAt:130000,endsAt:130000});
        const f = fixture(state); await f.controller.initialize(); await f.controller.start();
        expect(f.controller.canAccess()).toBe(true); expect(f.controller.canAccessTheory()).toBe(false);
        localNow += 10000; f.controller.checkBoundary(); expect(f.controller.canAccessTheory()).toBe(true);
        localNow += 10000; f.controller.checkBoundary(); expect(f.controller.canAccessTheory()).toBe(false);
        expect(f.controller.getSnapshot().session.status).toBe('ACTIVE');
    });
});
