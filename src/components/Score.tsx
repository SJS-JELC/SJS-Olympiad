import { useEffect, useRef, useState } from 'react';
import { OlympiadHeading } from './OlympiadHeading';
import './Score.css';

function FlipDigit({ digit }: { digit: string }) {
  const previous = useRef(digit);
  const [flip, setFlip] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    if (previous.current === digit) return;
    setFlip({ from: previous.current, to: digit });
    previous.current = digit;
    const timer = window.setTimeout(() => setFlip(null), 440);
    return () => window.clearTimeout(timer);
  }, [digit]);
  const half = (value: string, className: string) => <span className={className}><span>{value}</span></span>;
  return <span className="score-digit" aria-hidden="true">
    {half(digit, 'score-half score-half--top')}
    {half(flip?.from ?? digit, 'score-half score-half--bottom')}
    {flip && <span key={flip.from + flip.to} className="score-flip">
      {half(flip.from, 'score-half score-half--top score-leaf--out')}
      {half(flip.to, 'score-half score-half--bottom score-leaf--in')}
    </span>}
    <span className="score-digit__seam" />
  </span>;
}

/** Shared score display. Presentation only: never mutates the actual score. */
export function Score({ value }: { value: number }) {
  const text = Number.isInteger(value) && value >= 0 && value <= 99 ? String(value).padStart(2, '0') : '--';
  return <div className="score">
    <div className="score__label"><OlympiadHeading lines={['Score']} as="span" variant="score" /></div>
    <output className="score__display" aria-label={'Score: ' + text} aria-live="polite" aria-atomic="true">
      <span className="sr-only">{text}</span>
      <span className="score__cards" aria-hidden="true"><FlipDigit digit={text[0]} /><FlipDigit digit={text[1]} /></span>
    </output>
  </div>;
}
