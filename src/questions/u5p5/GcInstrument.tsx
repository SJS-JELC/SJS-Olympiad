import { useEffect, useId, useState, type CSSProperties } from 'react';
import type { GcInteraction } from './types';
import { sampleColour } from './sampleColour';
import { RUN_MS, SAMPLE_LABELS } from './model';

// A separated serpentine keeps the continuous column legible without crossings.
const column = (() => {
  let path = 'H226 Q242 123 242 107 V76';
  for (let turn = 0; turn < 12; turn++) {
    const nextX = 274 + turn * 32, upper = turn % 2 === 0;
    path += ` A16 16 0 0 ${upper ? 1 : 0} ${nextX} ${upper ? 76 : 154}`;
    if (turn < 11) path += upper ? ' V154' : ' V76';
  }
  return path + ' V139 Q626 123 642 123 H780';
})();
const tube = 'M-23 123 H105 ' + column;
const sampleTube = 'M105 123 ' + column;
const sampleTravelFraction = .76;
// Both streams use the exact same 1000-unit common path. Carrier gas travels
// 2% faster; the sample still reaches the detector at the original 90% stage.
const carrierDurationMs = RUN_MS * sampleTravelFraction / 1.02;
// Tiny dots with an irregular 1000-unit repeat avoid a reverse wagon-wheel
// illusion: even at 20 fps, travel per frame is below half the shortest gap.
const carrierSpacing = [26, 31, 39, 28, 35, 42, 30, 37, 32, 40,
  35, 28, 40, 31, 37, 26, 42, 32, 39, 30,
  32, 31, 39, 28, 35, 32, 30, 37, 26, 30];
const carrierParticles = carrierSpacing.flatMap(spacing => [.2, spacing - .2]).join(' ');

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
  const travel = Math.max(0, Math.min(1, (progress - .14) / sampleTravelFraction));
  return <figure className={'gc-instrument' + (run ? ' gc-instrument--running' : '')} style={{'--gc-carrier-duration':carrierDurationMs+'ms'} as CSSProperties}>
    <svg viewBox="-110 -20 1010 255" role="img" aria-label={run ? 'Gas chromatograph analysing ' + SAMPLE_LABELS[run.sample] : 'Gas chromatograph: carrier gas flows through the injector, coiled column and detector'}>
      <defs><filter id={id + 'glow'} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <rect x="185" y="24" width="510" height="177" rx="22" fill="#112e45" stroke="#395b6f" strokeWidth="3" />
      <text x="440" y="222" textAnchor="middle" className="type-caption" fill="#152033">Coiled separation column</text>
      <path d={tube} fill="none" stroke="#081822" strokeWidth="14" strokeLinecap="round" />
      <path className="gc-tube-inner" d={tube} fill="none" stroke="#e6eef2" strokeWidth="8" strokeLinecap="round" />
      {run && progress >= .14 && <g className="gc-travelling-light">
        {[150, 100, 55, 20].map((length, i) => <path key={length} d={sampleTube} pathLength="1000" fill="none" stroke={colour} strokeOpacity={.1 + i * .23} strokeWidth={i === 3 ? 5 : 10} strokeLinecap="round" strokeDasharray={length + ' 1000'} strokeDashoffset={length - travel * 1000} filter={i === 0 ? 'url(#' + id + 'glow)' : undefined} />)}
      </g>}
      <path className="gc-reduced-coil" d={sampleTube} fill="none" stroke={colour} strokeWidth="5" />
      <g fill="none" stroke="#91a8b2" strokeOpacity=".75" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={carrierParticles}>
        <path className="gc-carrier-flow gc-carrier-inlet" d="M-23 123 H105" pathLength="70" />
        <path className="gc-carrier-flow gc-carrier-common" d={sampleTube} pathLength="1000" />
      </g>
      <g className="gc-carrier-source" fill="#e6eef2" stroke="#243749" strokeWidth="3"><rect x="-78" y="86" width="55" height="74" rx="10"/><ellipse cx="-50.5" cy="86" rx="27.5" ry="8"/></g>
      <text x="-50.5" y="66" textAnchor="middle" className="type-caption" fill="#152033">Carrier gas</text>
      <path d="M105 68 V123" stroke="#243749" strokeWidth="4" />
      <g className={run && progress < .14 ? 'gc-injecting' : ''}>
        <path d="M80 35 H130 M105 24 V41" stroke="#243749" strokeWidth="7" />
        <rect x="92" y="41" width="26" height="27" rx="4" fill={colour} stroke="#243749" strokeWidth="3" />
      </g>
      <text x="105" y="8" textAnchor="middle" className="type-caption" fill="#152033">Injector</text>
      <rect x="750" y="79" width="88" height="87" rx="12" fill="#e6eef2" stroke="#243749" strokeWidth="3" />
      <circle cx="794" cy="111" r="15" fill={run && progress > .9 ? colour : '#244b5b'} className={run && progress > .9 ? 'gc-detector-flash' : ''} />
      <path d="M766 146 H778 L784 130 L790 154 L799 139 H822" fill="none" stroke="#244b5b" strokeWidth="3" />
      <text x="794" y="193" textAnchor="middle" className="type-caption" fill="#152033">Detector</text>
    </svg>

  </figure>;
}
