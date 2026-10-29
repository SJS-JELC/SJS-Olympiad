import cross from '../assets/powerapp/redcross.svg';
import './IncorrectFeedback.css';

/** Hold for five seconds, then fade over half a second without restarting on clicks. */
export function IncorrectFeedback({ remainingMs, cooldownMs }: { remainingMs: number; cooldownMs: number }) {
  const elapsed = Math.max(0, cooldownMs - remainingMs);
  if (remainingMs <= 0 || elapsed >= 5500) return null;
  return <div className="incorrect-feedback" role="status" aria-label="Incorrect answer">
    <img src={cross} alt="" style={{ animationDelay: '-' + elapsed + 'ms' }} />
  </div>;
}
