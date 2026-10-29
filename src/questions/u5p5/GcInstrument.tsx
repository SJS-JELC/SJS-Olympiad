import { useEffect, useId, useState } from 'react';
import type { GcInteraction } from './types';
import { sampleColour } from './sampleColour';
import { RUN_MS, SAMPLE_LABELS } from './model';

/** Visual frames never mutate the question state or complete a run. */
export function GcInstrument({ run, loaded }: { run: GcInteraction['activeRun']; loaded?: GcInteraction['loaded'] }) {
  const sample = run ?? loaded;
  const colour = sample ? sampleColour(sample.sample, sample.concentration ?? 100) : '#e3f6ff';
  const id = useId().replaceAll(':', '');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const draw = () => { setNow(Date.now()); frame = requestAnimationFrame(draw); };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [run]);
  const progress = run ? Math.max(0, Math.min(1, (now - run.startedAt) / RUN_MS)) : 0;
  const travel = Math.max(0, Math.min(1, (progress - .14) / .76));
  const tube = 'M105 67 L105 105 Q105 123 130 123 L220 123 C250 123 250 50 290 50 C350 50 350 180 290 180 C230 180 230 50 310 50 C390 50 390 180 330 180 C270 180 270 50 350 50 C430 50 430 180 370 180 C310 180 310 50 390 50 C470 50 470 180 410 180 C350 180 350 50 430 50 C510 50 510 180 450 180 C390 180 390 50 470 50 C550 50 550 180 490 180 C430 180 430 50 510 50 C590 50 590 180 530 180 C470 180 470 50 550 50 C630 50 630 123 660 123 L780 123';
  return <figure className={'gc-instrument' + (run ? ' gc-instrument--running' : '')}>
    <svg viewBox="0 0 900 230" role="img" aria-label={run ? 'Gas chromatograph analysing ' + SAMPLE_LABELS[run.sample] : 'Gas chromatograph: injector, coiled column and detector'}>
      <defs><filter id={id + 'glow'} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <rect x="185" y="24" width="510" height="177" rx="22" fill="#112e45" stroke="#395b6f" strokeWidth="3" />
      <text x="440" y="222" textAnchor="middle" className="type-caption" fill="#152033">Coiled separation column</text>
      <path d={tube} fill="none" stroke="#081822" strokeWidth="14" strokeLinecap="round" />
      <path d={tube} fill="none" stroke="#59848c" strokeWidth="8" strokeLinecap="round" />
      {run && progress >= .14 && <g className="gc-travelling-light">
        {[150, 100, 55, 20].map((length, i) => <path key={length} d={tube} pathLength="1000" fill="none" stroke={colour} strokeOpacity={.1 + i * .23} strokeWidth={i === 3 ? 5 : 10} strokeLinecap="round" strokeDasharray={length + ' 1000'} strokeDashoffset={length - travel * 1000} filter={i === 0 ? 'url(#' + id + 'glow)' : undefined} />)}
      </g>}
      <path className="gc-reduced-coil" d={tube} fill="none" stroke={colour} strokeWidth="5" />
      <g className={run && progress < .14 ? 'gc-injecting' : ''}>
        <path d="M80 35 H130 M105 24 V41" stroke="#243749" strokeWidth="7" />
        <rect x="92" y="41" width="26" height="27" rx="4" fill={colour} stroke="#243749" strokeWidth="3" />
        <path d="M105 68 V92" stroke="#243749" strokeWidth="4" />
      </g>
      <text x="105" y="166" textAnchor="middle" className="type-caption" fill="#152033">Injector</text>
      <rect x="750" y="79" width="88" height="87" rx="12" fill="#e6eef2" stroke="#243749" strokeWidth="3" />
      <circle cx="794" cy="111" r="15" fill={run && progress > .9 ? colour : '#244b5b'} className={run && progress > .9 ? 'gc-detector-flash' : ''} />
      <path d="M766 146 H778 L784 130 L790 154 L799 139 H822" fill="none" stroke="#244b5b" strokeWidth="3" />
      <text x="794" y="193" textAnchor="middle" className="type-caption" fill="#152033">Detector</text>
    </svg>

  </figure>;
}
