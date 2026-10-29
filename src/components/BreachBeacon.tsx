import { useId } from 'react';
import './BreachBeacon.css';

type BreachBeaconProps = {
  className?: string;
  /** Omit to keep the beacon decorative beside the breach message. */
  label?: string;
};

/** Original vector emergency beacon; motion is entirely CSS and respects reduced motion. */
export function BreachBeacon({ className = '', label }: BreachBeaconProps) {
  const id = 'breach-beacon-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const dome = 'M72 169V103C72 53 101 29 140 29S208 53 208 103V169Z';
  return (
    <svg className={`breach-beacon ${className}`.trim()} viewBox="0 0 280 240"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      focusable="false">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#64050b" /><stop offset=".23" stopColor="#db1422" />
          <stop offset=".5" stopColor="#ef2634" /><stop offset=".78" stopColor="#b50917" />
          <stop offset="1" stopColor="#4a0309" />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#393b3e" /><stop offset=".35" stopColor="#191a1c" />
          <stop offset="1" stopColor="#050507" />
        </linearGradient>
        <linearGradient id={`${id}-beam`}>
          <stop stopColor="#fff8d9" stopOpacity="0" />
          <stop offset=".48" stopColor="#fff8d9" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff8d9" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor="#ff3945" stopOpacity=".55" />
          <stop offset="1" stopColor="#ff182b" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}><path d={dome} /></clipPath>
      </defs>
      <ellipse className="breach-beacon__halo" cx="140" cy="116" rx="135" ry="110" fill={`url(#${id}-halo)`} />
      <ellipse cx="140" cy="219" rx="88" ry="11" fill="#000" opacity=".24" />
      <path d={dome} fill={`url(#${id}-glass)`} stroke="#390309" strokeWidth="4" />
      <g clipPath={`url(#${id}-clip)`}>
        <path d="M128 160V89Q140 77 152 89V160" fill="#6c0910" />
        <ellipse cx="140" cy="102" rx="28" ry="35" fill="#ff6e52" opacity=".4" />
        <g className="breach-beacon__rotor">
          <path d="M115 77Q140 67 165 77V141Q140 153 115 141Z" fill="#ffc6a4" opacity=".8" />
          <path d="M118 83Q140 76 162 83V135Q140 143 118 135Z" fill="#fff3ce" />
        </g>
        <rect className="breach-beacon__beam" x="92" y="37" width="96" height="134" fill={`url(#${id}-beam)`} />
        <path d="M82 155V103C82 63 103 42 132 39" fill="none" stroke="#ffbcc0" strokeWidth="8" strokeLinecap="round" opacity=".48" />
        <path d="M91 93C93 68 105 54 120 49" fill="none" stroke="#ffe6e4" strokeWidth="4" strokeLinecap="round" opacity=".65" />
        <path d="M198 106V155" fill="none" stroke="#f95862" strokeWidth="3" opacity=".3" />
      </g>
      <ellipse cx="140" cy="169" rx="71" ry="11" fill="#73090f" stroke="#350509" strokeWidth="3" />
      <path d="M64 177Q64 165 77 164H203Q216 165 216 177V202Q216 215 140 215T64 202Z"
        fill={`url(#${id}-base)`} stroke="#060607" strokeWidth="4" />
      <ellipse cx="140" cy="176" rx="75" ry="12" fill="#2c2d30" stroke="#09090b" strokeWidth="3" />
      <path d="M76 181Q140 198 204 181" fill="none" stroke="#63666b" strokeWidth="2" opacity=".55" />
      <path d="M77 202Q140 216 203 202" fill="none" stroke="#37393d" strokeWidth="2" />
      <circle cx="82" cy="195" r="3" fill="#85888b" /><circle cx="198" cy="195" r="3" fill="#85888b" />
      <path d="M80 195H84M196 195H200" stroke="#202124" strokeWidth="1.5" />
    </svg>
  );
}
