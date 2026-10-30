import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { SecurityController } from './SecurityController';
import { SECURITY_RULES } from './securityEvents';
import { breachSiren } from './breachSiren';

export const CompetitionSecurityContext = createContext<SecurityController | null>(null);
export function CompetitionSecurityProvider({ children, controller: supplied }: { children: ReactNode; controller?: SecurityController }) {
  const [controller] = useState(() => supplied ?? new SecurityController());
  useEffect(() => {
    const updateSiren = () => breachSiren.setLocked(controller.getSnapshot().session.status === 'LOCKED');
    updateSiren();
    const unsubscribeSiren = controller.subscribe(updateSiren);
    const lock = (reason: Parameters<SecurityController['interrupt']>[0]) => flushSync(() => controller.interrupt(reason));
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sjs-olympiad-security') : null;
    let signal = '';
    const unsubscribeSignal = controller.subscribe(() => {
      const view = controller.getSnapshot();
      const next = [view.server?.role, view.server?.team?.id, view.server?.team?.claimGeneration, view.server?.competition.epoch, view.session.status].join('|');
      if (next !== signal) { signal = next; channel?.postMessage({ type: 'security-changed' }); }
    });
    if (channel) channel.onmessage = () => lock('CROSS_TAB_CONFLICT');
    const visibility = () => { if (SECURITY_RULES.pageHidden === 'LOCK' && document.hidden) lock('PAGE_HIDDEN'); };
    const blur = () => { if (SECURITY_RULES.windowBlur === 'LOCK') lock('WINDOW_BLUR'); };
    const fullscreen = () => { if (SECURITY_RULES.fullscreenExit === 'LOCK' && document.fullscreenElement !== document.documentElement) lock('FULLSCREEN_EXIT'); };
    const pagehide = () => lock('SESSION_INTERRUPTED');
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) lock('SESSION_INTERRUPTED'); };
    const storage = () => flushSync(() => controller.externalChange());
    const offline = () => lock('SESSION_INTERRUPTED');
    const poll = window.setInterval(() => { void controller.refresh(); }, 15000);
    const boundary = window.setInterval(() => flushSync(()=>controller.checkBoundary()),250);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fullscreen);
    window.addEventListener('blur', blur);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('storage', storage);
    window.addEventListener('offline', offline);
    void controller.initialize();
    return () => {
      unsubscribeSiren();
      unsubscribeSignal();
      channel?.close();
      breachSiren.dispose();
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fullscreen);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('storage', storage);
      window.removeEventListener('offline', offline);
      window.clearInterval(poll);
      window.clearInterval(boundary);
    };
  }, [controller]);
  return <CompetitionSecurityContext.Provider value={controller}>{children}</CompetitionSecurityContext.Provider>;
}
export function useCompetitionSecurity() {
  const controller = useContext(CompetitionSecurityContext);
  if (!controller) throw new Error('CompetitionSecurityProvider is required');
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const start = () => { breachSiren.prepare(); return controller.start(); };
  const resume = () => { breachSiren.prepare(); return controller.resume(); };
  return { ...view, start, resume, unlock: controller.unlock,
    login:controller.login, claim:controller.claim, refresh:controller.refresh, guard:controller.guard, guardTheory:controller.guardTheory, guardPractical:controller.guardPractical, update:controller.update, recordQuestion:controller.recordQuestion, canAccess:controller.canAccess, canAccessTheory:controller.canAccessTheory, canAccessPractical:controller.canAccessPractical, serverNow:controller.serverNow,
    failClosed:()=>flushSync(()=>controller.interrupt('SESSION_INTERRUPTED')) };
}
