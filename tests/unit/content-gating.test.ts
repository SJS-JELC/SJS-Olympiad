// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { CompetitionSecurityProvider, SecurityController, TEST_STAFF_PIN, type SecuritySnapshot, type SnapshotAdapter } from '../../src/security';

let root: Root;
let container: HTMLDivElement;
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };
const content = () => container.querySelector('[data-testid="question-content"]');
function fullscreen() {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement });
}
function adapter(stored: SecuritySnapshot | null = null): SnapshotAdapter {
  return { load: vi.fn(async () => stored), save: vi.fn(async () => {}), clear: vi.fn(async () => {}) };
}
async function mount(controller: SecurityController) {
  await act(async () => {
    root.render(createElement(CompetitionSecurityProvider, { controller, children: createElement(App) }));
    await controller.initialize();
  });
}
async function clickStart() {
  const button = container.querySelector<HTMLButtonElement>('.enter-button');
  expect(button).not.toBeNull();
  await act(async () => { button!.click(); });
  expect(content()).not.toBeNull();
}
beforeEach(() => {
  vi.restoreAllMocks(); actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: vi.fn(async () => { fullscreen(); }) });
});
afterEach(async () => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => root.unmount()); container.remove();
});

it.each(['visibilitychange', 'blur', 'fullscreenchange', 'pagehide'] as const)('%s removes actual question DOM within the native event dispatch stack', async eventName => {
  const storage = adapter(); const controller = new SecurityController(storage); await mount(controller); await clickStart();
  // A never-completing save proves persistence cannot delay removal.
  storage.save = vi.fn(() => new Promise<void>(() => {}));
  if (eventName === 'visibilitychange') Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  if (eventName === 'fullscreenchange') Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
  // Disable only act's warning flag. Dispatch and assert outside act, with no await,
  // so act's batching/flush cannot manufacture the immediate removal result.
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  (eventName === 'visibilitychange' || eventName === 'fullscreenchange' ? document : window).dispatchEvent(new Event(eventName));
  expect(content()).toBeNull();
  expect(container.querySelector('#staff-pin')).not.toBeNull();
  expect(controller.getSnapshot().session.status).toBe('LOCKED');
});

it('persisted ACTIVE restoration never mounts question DOM', async () => {
  const initial = adapter(); const first = new SecurityController(initial); await first.initialize(); await first.start();
  const stored = vi.mocked(initial.save).mock.calls.at(-1)![0];
  const seenContent: boolean[] = [];
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node instanceof Element) seenContent.push(node.matches('[data-testid="question-content"]') || node.querySelector('[data-testid="question-content"]') !== null);
    }
  }); observer.observe(container, { subtree: true, childList: true });
  await mount(new SecurityController(adapter(stored)));
  observer.disconnect(); expect(seenContent).not.toContain(true); expect(content()).toBeNull(); expect(container.querySelector('#staff-pin')).not.toBeNull();
});

it('staff unlock keeps actual question DOM gated until fullscreen and atomic save complete', async () => {
  const storage = adapter(); const controller = new SecurityController(storage); await mount(controller); await clickStart();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false; window.dispatchEvent(new Event('blur'));
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  await act(async () => {}); // Finish the already-queued lock save before holding the unlock save.
  let finishFullscreen!: () => void;
  vi.mocked(document.documentElement.requestFullscreen).mockImplementation(() => new Promise<void>(resolve => { finishFullscreen = () => { fullscreen(); resolve(); }; }));
  let finishSave!: () => void;
  storage.save = vi.fn(() => new Promise<void>(resolve => { finishSave = resolve; }));
  let unlocking!: Promise<void>;
  await act(async () => { unlocking = controller.unlock(TEST_STAFF_PIN); });
  expect(content()).toBeNull();
  await act(async () => { finishFullscreen(); });
  expect(content()).toBeNull();
  const snapshot = vi.mocked(storage.save).mock.calls.at(-1)![0];
  expect(snapshot.session.status).toBe('ACTIVE'); expect(snapshot.events.at(-1)?.type).toBe('STAFF_UNLOCK');
  await act(async () => { finishSave(); await unlocking; });
  expect(content()).not.toBeNull();
});
