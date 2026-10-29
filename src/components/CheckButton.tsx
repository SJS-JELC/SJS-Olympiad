import { useId } from 'react';
import './CheckButton.css';

/** Live 04b_19 lettering with frame/tick geometry from the original Check Button asset. */
export function CheckButton({ disabled = false, solved = false, remaining = 0, cooldownSeconds = 20 }: { disabled?: boolean; solved?: boolean; remaining?: number; cooldownSeconds?: number }) {
  const shadowId = 'check-shadow-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const cooling = remaining > 0;
  const label = solved ? 'Solved' : cooling ? 'Time Out' : 'Check';
  const fraction = Math.max(0, Math.min(1, remaining / Math.max(1, cooldownSeconds)));
  const liquidY = 1.7 + 39.76 * fraction;
  const liquidClipId = shadowId + '-liquid';
  const bubbleClipId = shadowId + '-bubbles';
  return <button className={'question-check check-button' + (cooling ? ' check-button--cooldown' : '')} type="submit" disabled={disabled} aria-label={solved ? 'Solved' : cooling ? 'Retry in ' + Math.ceil(remaining) + ' seconds' : 'Check answers'}>
    <svg className="check-button__art" viewBox="0 0 150.33 42.52" aria-hidden="true" focusable="false">
      <defs><filter id={shadowId} x="-10%" y="-15%" width="120%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="0" floodColor="#3b3b3b" /></filter>
        <clipPath id={liquidClipId}><rect x="1.82" y="1.74" width="146.69" height="39.03" /></clipPath>
        <clipPath id={bubbleClipId}><rect x="1.82" y={liquidY + 2} width="146.69" height={Math.max(0, 39.76 * (1 - fraction) - 2)} /></clipPath>
      </defs>
      <rect className="check-button__face" x="1.5" y="1.7" width="147.01" height="39.76" />
      {cooling && <g clipPath={'url(#' + liquidClipId + ')'} opacity={Math.min(1, (1 - fraction) * 15)}>
        <g className="check-button__liquid-level" style={{ transform: 'translateY(' + liquidY + 'px)' }}>
          <path className="check-button__liquid-wave" d="M-150 0 q15 -3 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V80 H-150 Z" />
        </g>
        <g clipPath={'url(#' + bubbleClipId + ')'} className="check-button__bubbles">
          <circle className="check-button__bubble check-button__bubble--one" cx="27" cy="42" r=".9" />
          <circle className="check-button__bubble check-button__bubble--two" cx="78" cy="42" r=".65" />
          <circle className="check-button__bubble check-button__bubble--three" cx="126" cy="42" r="1.1" />
        </g>
      </g>}
      <path fill="#2d2832" d="M148.51,1.74H1.82v.02h0v38.98h0v.03h146.71s-.02,0-.02,0V1.74ZM148.51,0v.87h.9v.86h.91v39.03h-.89v.87h-.91v.88H1.82v-.9h-.91v-.84h-.91V1.75h.91v-.85h.91v-.89h146.7Z" />
      <g fill="#fff" stroke="#2d2832" strokeWidth="1" filter={'url(#' + shadowId + ')'}>
        {!cooling && <path d="M32.91,6.84l-13.93,15.12-4.33-4.11-6.95,7.31,8.04,7.64,3.71,3.53,3.47-3.77,17.4-18.89-7.42-6.83Z" />}
        <g transform={cooling ? "translate(8 7.5) scale(.5)" : "translate(44.68 7.5) scale(.5)"}><text className="type-outlined" x="0" y="55.5" textLength={cooling ? 268.66 : 194.16} lengthAdjust="spacingAndGlyphs" strokeWidth="2">{label.toUpperCase()}</text></g>
      </g>
    </svg>
  </button>;
}
