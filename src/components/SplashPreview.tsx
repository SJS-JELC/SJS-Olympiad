import { ChallengeButton } from './ChallengeButton';
import { OlympiadLogo } from './OlympiadLogo';
import { TeacherSettingsButton } from './SharedNavigation';
import { useEffect, useState } from 'react';
import { durationText } from '../events/timing';
import equipment from '../assets/powerapp/14-equipment.png';
import '../styles.css';
import '../background.css';
import '../splash.css';

/** Landing template with internal navigation; no gameplay writes. */
export function SplashPreview({ onSettings, onTheory, onPractical, practicalStartsAt, practicalEndsAt, teacher = true, theoryStartsAt, theoryEndsAt, serverNow = Date.now }: { onSettings: () => void; onTheory: () => void; onPractical?: () => void; practicalStartsAt?: number|null; practicalEndsAt?: number|null; teacher?: boolean; theoryStartsAt?: number|null; theoryEndsAt?: number; serverNow?:()=>number }) {
  const [now,setNow] = useState(serverNow);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(serverNow()),1000);return()=>window.clearInterval(timer);},[serverNow]);
  const timing = !teacher && theoryStartsAt != null && now < theoryStartsAt ? `Theory opens in ${durationText(theoryStartsAt-now)}` : !teacher && theoryEndsAt != null && now >= theoryEndsAt ? 'The theory challenge has finished' : '';
  return <div className="splash-preview">
    <main className="splash-stage" aria-label="St John's Chemistry Olympiad">
      <h1 className="sr-only">St John's Chemistry Olympiad</h1>
      <OlympiadLogo className="splash-logo" bubbling />
      <div className="splash-challenges">
        <ChallengeButton subject="Practical" onClick={onPractical} />
        {teacher && <TeacherSettingsButton className="splash-settings" onClick={onSettings} />}
        <ChallengeButton subject="Theoretical" onClick={onTheory} />
        {!teacher && onPractical && practicalStartsAt != null && now < practicalStartsAt && <p className="splash-timing type-caption" role="status">Practical opens in {durationText(practicalStartsAt-now)}</p>}{!teacher && onPractical && practicalEndsAt != null && now >= practicalEndsAt && <p className="splash-timing type-caption">The practical challenge has finished</p>}{timing && <p className="splash-timing type-caption" role="status">{timing}</p>}
      </div>
      <img className="splash-equipment" src={equipment} alt="" width="225" height="162" />
    </main>
  </div>;
}
