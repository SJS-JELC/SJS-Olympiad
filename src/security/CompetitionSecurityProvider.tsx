import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { SecurityController } from './SecurityController';
import { STORAGE_KEY } from './securityStorage';
import { SECURITY_RULES } from './securityEvents';

export const CompetitionSecurityContext = createContext<SecurityController | null>(null);
export function CompetitionSecurityProvider({ children, controller: supplied }: { children: ReactNode; controller?: SecurityController }) {
  const [controller] = useState(() => supplied ?? new SecurityController());
  useEffect(() => {
    const lock = (reason: Parameters<SecurityController['interrupt']>[0]) => flushSync(() => controller.interrupt(reason));
    const visibility = () => { if (SECURITY_RULES.pageHidden === 'LOCK' && document.hidden) lock('PAGE_HIDDEN'); };
    const blur = () => { if (SECURITY_RULES.windowBlur === 'LOCK') lock('WINDOW_BLUR'); };
    const fullscreen = () => { if (SECURITY_RULES.fullscreenExit === 'LOCK' && document.fullscreenElement !== document.documentElement) lock('FULLSCREEN_EXIT'); };
    const pagehide = () => lock('SESSION_INTERRUPTED');
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) lock('SESSION_INTERRUPTED'); };
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) flushSync(() => controller.externalChange(event.newValue)); };
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fullscreen);
    window.addEventListener('blur', blur);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('storage', storage);
    void controller.initialize();
    if (import.meta.env.DEV) {
      // Separate console-only recovery; deliberately stripped from production builds.
      Object.assign(window, { sjsSecurityRecovery: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); } });
    }
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fullscreen);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('storage', storage);
      if (import.meta.env.DEV) delete (window as Window & { sjsSecurityRecovery?: () => void }).sjsSecurityRecovery;
    };
  }, [controller]);
  return <CompetitionSecurityContext.Provider value={controller}>{children}</CompetitionSecurityContext.Provider>;
}
export function useCompetitionSecurity() {
  const controller = useContext(CompetitionSecurityContext);
  if (!controller) throw new Error('CompetitionSecurityProvider is required');
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return { ...view, start: controller.start, unlock: controller.unlock, reset: controller.reset };
}
