// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CompetitionSecurityProvider, SecurityController } from '../../src/security';
import { QuestionGate } from '../../src/questions/QuestionGate';
import { HttpError, type request, type SessionState } from '../../src/cloud/api';
let root: Root, host: HTMLDivElement;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement('div'); document.body.append(host); root = createRoot(host); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null }); vi.spyOn(document, 'hasFocus').mockReturnValue(true); Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: vi.fn(async () => { Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement }); }) }); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const snapshot = (): SessionState => ({ role: 'competitor', expiresAt: Date.now() + 3600000, serverNow: Date.now(), configRevision: 1, activeEvent: { id: 'event', name: 'Event', year: 'L6', endsAt: Date.now() + 3600000, status: 'active', revision: 1 }, team: { id: 'team', name: 'Team', year: 'L6', eventId: 'event', claimGeneration: 1 }, competition: { status: 'NOT_STARTED', epoch: 1 }, score: 0, attempts: {} });
async function renderController(state = snapshot()) {
    const transport = vi.fn(async (action: string) => { if (action === 'start')
        state = { ...state, competition: { status: 'ACTIVE', epoch: 2 } }; return structuredClone(state); }) as unknown as typeof request;
    const controller = new SecurityController(transport);
    await act(async () => root.render(createElement(CompetitionSecurityProvider, { controller, children: createElement(QuestionGate, { children: createElement('div', { 'data-sensitive': true }, 'Question content') }) })));
    return { controller, transport };
}
it('unmounts competitor question content before start', async () => { await renderController(); expect(host.querySelector('[data-sensitive]')).toBeNull(); });
it('mounts only after fullscreen and acknowledged start', async () => { const { controller } = await renderController(); await act(() => controller.start()); expect(host.querySelector('[data-sensitive]')).not.toBeNull(); });
it.each(['blur', 'fullscreenchange', 'visibilitychange'] as const)('removes actual question content synchronously for %s', async (signal) => { const { controller } = await renderController(); await act(() => controller.start()); expect(host.querySelector('[data-sensitive]')).not.toBeNull(); await act(async () => { if (signal === 'blur')
    window.dispatchEvent(new Event('blur')); if (signal === 'fullscreenchange') {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    document.dispatchEvent(new Event(signal));
} if (signal === 'visibilitychange') {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event(signal));
} expect(host.querySelector('[data-sensitive]')).toBeNull(); }); });
it('anonymous restore errors expose no question content', async () => { const controller = new SecurityController((async () => { throw new HttpError(401, 'Sign in.'); }) as typeof request); await act(async () => root.render(createElement(CompetitionSecurityProvider, { controller, children: createElement(QuestionGate, { children: 'Sensitive question' }) }))); expect(host.textContent).not.toContain('Sensitive question'); });
it('teacher preview permits content without fullscreen', async () => { const state = snapshot(); state.role = 'teacher'; state.team = null; await renderController(state); expect(host.querySelector('[data-sensitive]')).not.toBeNull(); });
it('stored ACTIVE restoration never mounts a competitor view', async () => { const state = snapshot(); state.competition.status = 'ACTIVE'; await renderController(state); expect(host.querySelector('[data-sensitive]')).toBeNull(); });
it('offline interruption unmounts an active view without a session preflight', async () => { const { controller, transport } = await renderController(); await act(() => controller.start()); vi.mocked(transport).mockRejectedValueOnce(new Error('Offline')); const calls=vi.mocked(transport).mock.calls.length; await act(() => window.dispatchEvent(new Event('offline'))); expect(host.querySelector('[data-sensitive]')).toBeNull(); expect(vi.mocked(transport).mock.calls.slice(calls).map(([action])=>action)).toEqual(['breach']); });
it('unmounts real question content at theory end without locking the remaining event', async () => {
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    const state = snapshot(); Object.assign(state.activeEvent!, {theoryStartsAt:now-1000,theoryEndsAt:now+1000,practicalStartsAt:now+2000,practicalEndsAt:now+5000,endsAt:now+5000});
    const {controller,transport} = await renderController(state); await act(() => controller.start());
    expect(host.querySelector('[data-sensitive]')).not.toBeNull();
    now += 1000;
    await act(() => controller.checkBoundary());
    expect(host.querySelector('[data-sensitive]')).toBeNull(); expect(host.textContent).toContain('finished');
    expect(controller.getSnapshot().session.status).toBe('ACTIVE');
    expect(vi.mocked(transport).mock.calls.some(([action]) => action === 'breach')).toBe(false);
});
