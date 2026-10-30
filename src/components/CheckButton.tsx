import { IllustratedActionArtwork } from './IllustratedActionButton';
import './CheckButton.css';

/** Submission and cooldown semantics stay separate from reusable action artwork. */
export function CheckButton({ disabled = false, solved = false, remaining = 0, cooldownSeconds = 20 }: { disabled?: boolean; solved?: boolean; remaining?: number; cooldownSeconds?: number }) {
  const cooling = remaining > 0;
  const label = solved ? 'Solved' : cooling ? 'Time Out' : 'Check';
  const fraction = Math.max(0, Math.min(1, remaining / Math.max(1, cooldownSeconds)));
  return <button className={'question-check check-button' + (cooling ? ' check-button--cooldown' : '')} type="submit" disabled={disabled} aria-label={solved ? 'Solved' : cooling ? 'Retry in ' + Math.ceil(remaining) + ' seconds' : 'Check answers'}>
    <IllustratedActionArtwork label={label} cooling={cooling} fraction={fraction} />
  </button>;
}
