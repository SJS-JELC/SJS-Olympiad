// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Leaderboard, loadLeaderboard } from '../../src/components/Leaderboard';

let root: Root;
let container: HTMLDivElement;
const activeEvent = { id: 'event-1', name: 'Autumn Olympiad', year: 12 };
const response = (rows: {teamId: string; name: string; score: number}[] = []) => ({ ok: true, json: async () => ({ activeEvent, rows }) });
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('renders authoritative ranking, point grammar and blank missing positions without a year selector', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response([{ teamId: 'a', name: 'Eagles', score: 3 }, { teamId: 'b', name: 'Atoms', score: 1 }])));
  await act(async () => root.render(createElement(Leaderboard, { activeEvent, onBack: () => {} })));
  expect(container.querySelector('.leaderboard-place--1')?.textContent).toContain('Eagles3 Points');
  expect(container.querySelector('.leaderboard-place--2')?.textContent).toContain('Atoms1 Point');
  expect(container.querySelector('.leaderboard-place--3 .leaderboard-team')?.textContent).toBe('');
  expect(container.querySelector('.leaderboard-place--3 .leaderboard-points')?.textContent).toBe('');
  expect(container.querySelector('select')).toBeNull();
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Live results');
});

it('retains the previous results and labels them stale after a failed refresh, then recovers', async () => {
  const fetch = vi.fn(async () => response([{ teamId: 'a', name: 'Eagles', score: 3 }])); vi.stubGlobal('fetch', fetch);
  await act(async () => root.render(createElement(Leaderboard, { activeEvent, onBack: () => {} })));
  fetch.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(container.querySelector('[role="status"]')?.textContent).toContain('showing last received results');
  expect(container.querySelector('.leaderboard-team')?.textContent).toBe('Eagles');
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Live results');
});

it('rejects invalid rows rather than presenting zero or malformed scores', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response([{ teamId: 'a', name: 'Eagles', score: 0 }])));
  await expect(loadLeaderboard(new AbortController().signal)).rejects.toThrow('Invalid leaderboard');
});
