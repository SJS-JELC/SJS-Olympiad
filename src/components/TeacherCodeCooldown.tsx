import {useId} from 'react';

/** Login feedback only; server authentication and rate limits remain authoritative. */
export function TeacherCodeCooldown({remaining}:{remaining:number}) {
  const clip='teacher-liquid-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const level=100*Math.max(0,Math.min(1,remaining/10000));
  return <>
    <svg className="teacher-password-liquid" viewBox="0 0 150 100" preserveAspectRatio="none" aria-hidden="true">
      <rect width="150" height="100" fill="#202733"/>
      <defs><clipPath id={clip}><rect x="0" y={level+2} width="150" height={Math.max(0,98-level)}/></clipPath></defs>
      <g className="check-button__liquid-level" style={{transform:`translateY(${level}px)`}}>
        <path className="check-button__liquid-wave" d="M-150 0 q15 -3 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V150 H-150 Z"/>
      </g>
      <g clipPath={`url(#${clip})`} className="check-button__bubbles">
        <circle className="check-button__bubble" cx="27" cy="100" r="1"/>
        <circle className="check-button__bubble check-button__bubble--two" cx="78" cy="100" r=".7"/>
        <circle className="check-button__bubble check-button__bubble--three" cx="126" cy="100" r="1.2"/>
      </g>
    </svg>
    <span className="sr-only" role="status">Teacher code time out. Try again in {Math.ceil(remaining/1000)} seconds.</span>
  </>;
}
