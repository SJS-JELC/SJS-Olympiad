import { useId, type MouseEventHandler } from 'react';
import './CheckButton.css';

export interface IllustratedActionButtonProps {
  label: string;
  accessibleLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  wide?: boolean;
  icon?: 'check' | 'arrow';
  tone?: 'default' | 'lilac';
}

/** Shared original-asset actions default to buttons, never accidental submissions. */
export function IllustratedActionButton({ label, accessibleLabel, onClick, disabled = false, className = '', type = 'button', wide = false, icon = 'check', tone = 'default' }: IllustratedActionButtonProps) {
  return <button type={type} disabled={disabled} onClick={onClick}
    className={`illustrated-action-button${wide ? ' illustrated-action-button--wide' : ''}${tone === 'lilac' ? ' illustrated-action-button--lilac' : ''}${className ? ' ' + className : ''}`}
    aria-label={accessibleLabel ?? label}>
    <IllustratedActionArtwork label={label} wide={wide} icon={icon} />
  </button>;
}

/** CheckButton owns submit and cooldown state; this only draws that state. */
export function IllustratedActionArtwork({ label, wide = false, cooling = false, fraction = 0, icon = 'check' }: { label: string; wide?: boolean; cooling?: boolean; fraction?: number; icon?: 'check' | 'arrow' }) {
  const shadowId = 'action-shadow-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const liquidY = 1.7 + 39.76 * fraction;
  const liquidClipId = shadowId + '-liquid';
  const bubbleClipId = shadowId + '-bubbles';
  const width = wide ? 300.33 : 150.33;
  const right = width - 1.82;
  return <svg className="check-button__art" viewBox={`0 0 ${width} 42.52`} aria-hidden="true" focusable="false">
    <defs><filter id={shadowId} x="-10%" y="-15%" width="120%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="0" floodColor="#3b3b3b" /></filter>
      <clipPath id={liquidClipId}><rect x="1.82" y="1.74" width={width - 3.64} height="39.03" /></clipPath>
      <clipPath id={bubbleClipId}><rect x="1.82" y={liquidY + 2} width={width - 3.64} height={Math.max(0, 39.76 * (1 - fraction) - 2)} /></clipPath>
    </defs>
    <rect className="check-button__face" x="1.5" y="1.7" width={width - 3.32} height="39.76" />
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
    <path fill="#2d2832" d={`M${right},1.74H1.82v.02h0v38.98h0v.03h${width - 3.62}s-.02,0-.02,0V1.74ZM${right},0v.87h.9v.86h.91v39.03h-.89v.87h-.91v.88H1.82v-.9h-.91v-.84h-.91V1.75h.91v-.85h.91v-.89h${width - 3.63}Z`} />
    <g fill="#fff" stroke="#2d2832" strokeWidth="1" filter={'url(#' + shadowId + ')'}>
      {!cooling && icon === 'check' && <path d="M32.91,6.84l-13.93,15.12-4.33-4.11-6.95,7.31,8.04,7.64,3.71,3.53,3.47-3.77,17.4-18.89-7.42-6.83Z" />}
      <g transform={cooling || icon === 'arrow' ? 'translate(8 7.5) scale(.5)' : 'translate(44.68 7.5) scale(.5)'}><text className="type-outlined" x="0" y="55.5" textLength={icon === 'arrow' ? (width - 50) * 2 : wide ? (width - 53.25) * 2 : cooling ? 268.66 : 194.16} lengthAdjust="spacingAndGlyphs" strokeWidth="2">{label.toUpperCase()}</text></g>
      {icon === 'arrow' && <g transform={`translate(${width - 35} 7.5) scale(.5)`}><text className="type-outlined" x="0" y="55.5" strokeWidth="2">&gt;</text></g>}
    </g>
  </svg>;
}
