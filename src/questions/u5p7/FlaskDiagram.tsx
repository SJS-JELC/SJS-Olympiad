import { useId, type CSSProperties } from 'react';

/** Original vector illustration: the circular internal body is 10 cm across. */
export function FlaskDiagram() {
  const id = useId();
  const vessel = 'M156 18V42.424A120 120 0 1 0 204 42.424V18';
  return <svg className="u5p7-flask scientific-diagram" viewBox="35 0 370 310" role="img"
    aria-label="Round-bottomed flask, internal diameter 10.0 cm, containing a 2.0 cm deep layer of pure propyl propanoate above a 1.4 cm deep layer of aqueous sodium hydroxide.">
    <defs>
      <clipPath id={`${id}-glass`}><path d={`${vessel}Z`} /></clipPath>
      <linearGradient id={`${id}-shine`}><stop stopColor="#d4eff8" stopOpacity=".28" /><stop offset=".4" stopColor="#fff" stopOpacity=".05" /><stop offset="1" stopColor="#b9dce8" stopOpacity=".3" /></linearGradient>
      <marker id={`${id}-arrow`} markerWidth="7" markerHeight="7" refX="7" refY="3.5" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0 7 3.5 0 7Z" fill="#152033" /></marker>
    </defs>
    <g clipPath={`url(#${id}-glass)`}>
      <path d={`${vessel}Z`} fill={`url(#${id}-shine)`} />
      <path d="M55 198.4H305V246.4H55Z" fill="#f5d58c" fillOpacity=".68" />
      <path d="M55 246.4H305V285H55Z" fill="#91cce7" fillOpacity=".76" />
      <path d="M55 198.4H305M55 246.4H305" stroke="#687e86" strokeWidth="1.2" />
      <path d="M89 105Q64 160 94 212" fill="none" stroke="#fff" strokeWidth="7" strokeOpacity=".7" strokeLinecap="round" />
    </g>
    <path d={vessel} fill="none" stroke="#526d7b" strokeWidth="3" />
    <path d="M151 18H209M156 25H204" fill="none" stroke="#526d7b" strokeWidth="2" />
    <g stroke="#152033" strokeWidth="1.2" fill="none" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`}>
      <path data-dimension="diameter" d="M60 160H300" />
      <path data-dimension="ester-depth" d="M325 198.4V246.4" />
      <path data-dimension="aqueous-depth" d="M325 246.4V280" />
    </g>
    <g stroke="#7b858b" strokeWidth="1"><path d="M288 198.4H332M268 246.4H332M180 280H332" /></g>
    <g className="type-body" style={{ '--text-size': '14px' } as CSSProperties}>
      <text x="180" y="148">10.0 cm</text>
      <text x="180" y="223">Propyl propanoate</text>
      <text x="180" y="263">NaOH(aq)</text>
      <text x="360" y="223">2.0 cm</text>
      <text x="360" y="264">1.4 cm</text>
    </g>
  </svg>;
}

export function CapSketch() {
  return <svg className="u5p7-cap scientific-diagram" viewBox="0 0 210 125" role="img" aria-label="A spherical cap. R is the sphere radius and h is the cap height.">
    <circle cx="75" cy="58" r="45" fill="none" stroke="#6a7984" strokeWidth="1.5" />
    <path d="M36.35 81A45 45 0 0 0 113.65 81Z" fill="#c3dfea" stroke="#526d7b" strokeWidth="1.5" />
    <path d="M75 58 43 89.6M75 58h2M122 81H149M75 103H149M140 81V103" fill="none" stroke="#152033" strokeWidth="1.5" />
    <g className="type-body" style={{ '--text-size': '15px' } as CSSProperties}>
      <text x="48" y="67">R</text><text x="154" y="95">h</text>
    </g>
  </svg>;
}
