import { useRef, useState, type MouseEvent } from 'react';
import { OlympiadHeading } from './OlympiadHeading';

/** Local feedback with optional internal navigation; never starts a session. */
export function ChallengeButton({ subject, onClick, banner }: { subject: string; onClick?: () => void; banner?: string }) {
  const sequence = useRef(0);
  const [ripple, setRipple] = useState<{ id: number; x: number; y: number; size: number } | null>(null);
  function click(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left;
    const y = event.detail === 0 ? bounds.height / 2 : event.clientY - bounds.top;
    setRipple({ id: ++sequence.current, x, y, size: Math.hypot(bounds.width, bounds.height) * 2 });
    onClick?.();
  }
  return <button type="button" className="splash-challenge challenge-button" aria-label={subject + ' challenge'} disabled={!!banner || !onClick} onClick={click}>
    <OlympiadHeading lines={[subject, 'Challenge']} as="span" />
    {banner && <span className="challenge-banner type-heading">{banner}</span>}
    {ripple && <span key={ripple.id} className="challenge-button__ripple" aria-hidden="true"
      style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
      onAnimationEnd={() => setRipple(current => current?.id === ripple.id ? null : current)} />}
  </button>;
}
