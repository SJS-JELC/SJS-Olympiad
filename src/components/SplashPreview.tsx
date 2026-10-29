import { ChallengeButton } from './ChallengeButton';
import { OlympiadLogo } from './OlympiadLogo';
import equipment from '../assets/powerapp/14-equipment.png';
import '../styles.css';
import '../background.css';
import '../splash.css';

/** Landing template with internal navigation; no gameplay writes. */
export function SplashPreview({ onSettings, onTheory }: { onSettings: () => void; onTheory: () => void }) {
  return <div className="splash-preview">
    <main className="splash-stage" aria-label="St John's Chemistry Olympiad">
      <h1 className="sr-only">St John's Chemistry Olympiad</h1>
      <OlympiadLogo className="splash-logo" bubbling />
      <div className="splash-challenges">
        <ChallengeButton subject="Practical" />
        <button className="splash-settings" type="button" onClick={onSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.4 7.4 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64l2.11 1.65c-.05.32-.09.66-.09.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.38.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.1-1.65ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
          </svg>
        </button>
        <ChallengeButton subject="Theoretical" onClick={onTheory} />
      </div>
      <img className="splash-equipment" src={equipment} alt="" width="225" height="162" />
    </main>
  </div>;
}
