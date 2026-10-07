import type { Page } from '@playwright/test';

/** Deterministic harness; real Fullscreen API smoke is tested separately. */
export async function mockFullscreen(page: Page, mode: 'success' | 'reject' | 'deferred' = 'success') {
  await page.addInitScript((initialMode) => {
    let element: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    const harness = {
      requests: 0,
      complete: () => {},
      exit: () => {
        element = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      },
    };
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: function (this: HTMLElement) {
        harness.requests += 1;
        if (initialMode === 'reject') return Promise.reject(new Error('Fullscreen denied by test'));
        return new Promise<void>((resolve) => {
          harness.complete = () => {
            element = this;
            document.dispatchEvent(new Event('fullscreenchange'));
            resolve();
          };
          if (initialMode === 'success') harness.complete();
        });
      },
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: () => { harness.exit(); return Promise.resolve(); },
    });
    Object.assign(window, { securityTestFullscreen: harness });
  }, mode);
}

export async function interrupt(page: Page, reason: 'blur' | 'hidden' | 'fullscreen') {
  await page.evaluate((eventReason) => {
    if (eventReason === 'blur') window.dispatchEvent(new Event('blur'));
    if (eventReason === 'hidden') {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
    if (eventReason === 'fullscreen') {
      (window as unknown as { securityTestFullscreen: { exit(): void } }).securityTestFullscreen.exit();
    }
  }, reason);
}
