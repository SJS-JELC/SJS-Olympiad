/** Visibility-aware polling. A pending request always settles before its successor. */
export function createLeaderboardPoller<T>({ load, onValue, onError, isDocumentVisible, subscribeVisibility, intervalMs = 3000 }: {
  load: (signal: AbortSignal) => Promise<T>;
  onValue: (value: T) => void;
  onError: () => void;
  isDocumentVisible: () => boolean;
  subscribeVisibility: (listener: () => void) => () => void;
  intervalMs?: number;
}) {
  let screenVisible = false;
  let disposed = false;
  let inFlight = false;
  let refreshOnSettle = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const active = () => !disposed && screenVisible && isDocumentVisible();
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  async function refresh() {
    if (!active()) return;
    if (inFlight) { refreshOnSettle = true; return; }
    clearTimer();
    inFlight = true;
    const request = new AbortController();
    controller = request;
    try {
      const value = await load(request.signal);
      if (active() && !request.signal.aborted) onValue(value);
    } catch {
      if (active() && !request.signal.aborted) onError();
    } finally {
      inFlight = false;
      if (controller === request) controller = undefined;
      if (active()) {
        if (refreshOnSettle) { refreshOnSettle = false; void refresh(); }
        else timer = setTimeout(() => { void refresh(); }, intervalMs);
      }
    }
  }
  function reconcile() {
    clearTimer();
    if (active()) void refresh();
    else { refreshOnSettle = false; controller?.abort(); }
  }
  const unsubscribe = subscribeVisibility(reconcile);
  return {
    setVisible(value: boolean) { if (screenVisible !== value) { screenVisible = value; reconcile(); } },
    dispose() { disposed = true; clearTimer(); controller?.abort(); unsubscribe(); },
  };
}
