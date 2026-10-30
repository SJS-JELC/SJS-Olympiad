import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createLeaderboardPoller } from '../../src/components/leaderboard/polling';

let visible: boolean;
let notify: () => void;
const disposals: (() => void)[] = [];
function fixture(load = vi.fn(async (_signal: AbortSignal) => 'results')) {
  const onValue = vi.fn(); const onError = vi.fn();
  const unsubscribe = vi.fn();
  const poller = createLeaderboardPoller({ load, onValue, onError, isDocumentVisible: () => visible, subscribeVisibility: listener => { notify = listener; return unsubscribe; } });
  disposals.push(() => poller.dispose());
  return { load, onValue, onError, poller, unsubscribe };
}
beforeEach(() => { vi.useFakeTimers(); visible = true; });
afterEach(() => { for (const dispose of disposals.splice(0)) dispose(); vi.useRealTimers(); });

it('fetches immediately on screen entry and then every three seconds', async () => {
  const { poller, load, onValue } = fixture();
  expect(load).not.toHaveBeenCalled();
  poller.setVisible(true);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(2999);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(load).toHaveBeenCalledTimes(2);
  expect(onValue).toHaveBeenLastCalledWith('results');
});

it('does not fetch while hidden, and fetches immediately after visibility returns', async () => {
  const { poller, load } = fixture();
  visible = false; poller.setVisible(true);
  await vi.advanceTimersByTimeAsync(12000);
  expect(load).not.toHaveBeenCalled();
  visible = true; notify();
  await vi.advanceTimersByTimeAsync(0);
  expect(load).toHaveBeenCalledTimes(1);
  visible = false; notify();
  await vi.advanceTimersByTimeAsync(9000);
  expect(load).toHaveBeenCalledTimes(1);
  visible = true; notify();
  expect(load).toHaveBeenCalledTimes(2);
  poller.setVisible(false);
  await vi.advanceTimersByTimeAsync(9000);
  expect(load).toHaveBeenCalledTimes(2);
});

it('never overlaps requests, including hide/resume while an aborted request settles', async () => {
  let finish!: (value: string) => void;
  const load = vi.fn((_signal: AbortSignal) => new Promise<string>(resolve => { finish = resolve; }));
  const { poller, onValue } = fixture(load);
  poller.setVisible(true);
  await vi.advanceTimersByTimeAsync(12000);
  expect(load).toHaveBeenCalledTimes(1);
  visible = false; notify();
  expect(load.mock.calls[0][0].aborted).toBe(true);
  visible = true; notify();
  expect(load).toHaveBeenCalledTimes(1);
  finish('old results');
  await vi.advanceTimersByTimeAsync(0);
  expect(load).toHaveBeenCalledTimes(2);
  expect(onValue).not.toHaveBeenCalled();
});

it('reports errors without removing results, retries and disposes listeners and requests', async () => {
  const load = vi.fn(async (_signal: AbortSignal) => 'results');
  const { poller, onValue, onError, unsubscribe } = fixture(load);
  poller.setVisible(true);
  await vi.advanceTimersByTimeAsync(0);
  load.mockRejectedValueOnce(new Error('offline'));
  await vi.advanceTimersByTimeAsync(3000);
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onValue).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(3000);
  expect(onValue).toHaveBeenCalledTimes(2);
  poller.dispose();
  expect(unsubscribe).toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(9000);
  expect(load).toHaveBeenCalledTimes(3);
});
