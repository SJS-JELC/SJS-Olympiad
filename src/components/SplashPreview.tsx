import { ChallengeButton } from './ChallengeButton';
import { OlympiadLogo } from './OlympiadLogo';
import { useEffect, useState } from 'react';
import equipment from '../assets/powerapp/14-equipment.png';
import '../styles.css';
import '../background.css';
import '../splash.css';

/** Landing template with internal navigation; no gameplay writes. */
export function SplashPreview({ onTheory, onPractical, practicalStartsAt, practicalEndsAt, teacher = true, theoryStartsAt, theoryEndsAt, serverNow = Date.now }: { onTheory: () => void; onPractical?: () => void; practicalStartsAt?: number|null; practicalEndsAt?: number|null; teacher?: boolean; theoryStartsAt?: number|null; theoryEndsAt?: number; serverNow?:()=>number }) {
  const [now,setNow] = useState(serverNow);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(serverNow()),1000);return()=>window.clearInterval(timer);},[serverNow]);
  const banner = (start: number|null|undefined, end: number|null|undefined, available=true) => {
    if (!available) return 'UNAVAILABLE';
    if (teacher) return undefined;
    if (end != null && now >= end) return 'COMPLETE';
    if (start != null && now < start) {
      const seconds=Math.ceil((start-now)/1000),days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60);
      return `Opens in ${days?days+'d ':''}${hours?hours+'h ':''}${minutes}m ${seconds%60}s`;
    }
    return undefined;
  };
  return <div className="splash-preview">
    <main className="splash-stage" aria-label="St John's Chemistry Olympiad">
      <h1 className="sr-only">St John's Chemistry Olympiad</h1>
      <OlympiadLogo className="splash-logo" bubbling />
      <div className="splash-challenges">
        <ChallengeButton subject="Practical" onClick={onPractical} banner={banner(practicalStartsAt,practicalEndsAt,!!onPractical && (teacher || practicalStartsAt!=null))} />
        <ChallengeButton subject="Theoretical" onClick={onTheory} banner={banner(theoryStartsAt,theoryEndsAt)} />
      </div>
      <img className="splash-equipment" src={equipment} alt="" width="225" height="162" />
    </main>
  </div>;
}
