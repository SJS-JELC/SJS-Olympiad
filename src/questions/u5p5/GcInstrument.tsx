import type {GcPresentation} from './presentation';
import { useEffect, useId, useState, type CSSProperties } from 'react';
import type { GcInteraction } from './types';
import { sampleColour } from './sampleColour';
import { RUN_MS } from './model';

const sampleTravelFraction = .76;
// Both streams use the exact same 1000-unit common path. Carrier gas travels
// 2% faster; the sample still reaches the detector at the original 90% stage.
const streamDurationMs = RUN_MS * sampleTravelFraction / 1.02;
// Tiny dots with an irregular 1000-unit repeat avoid a reverse wagon-wheel
// illusion: even at 20 fps, travel per frame is below half the shortest gap.
const streamSpacing = [26, 31, 39, 28, 35, 42, 30, 37, 32, 40,
  35, 28, 40, 31, 37, 26, 42, 32, 39, 30,
  32, 31, 39, 28, 35, 32, 30, 37, 26, 30];
const streamParticles = streamSpacing.flatMap(spacing => [2, spacing - 2]).join(' ');

/** Visual frames never mutate the question state or complete a run. */
export function RunGraphic({ run, loaded,content }: {content:GcPresentation; run: GcInteraction['activeRun']; loaded?: GcInteraction['loaded'] }) {
  const geometry=content.graphic, path1=geometry.path1, path2=geometry.path2;
  const sample = run ?? loaded;
  const colour = sample ? sampleColour(content.sampleColours[sample.sample], sample.concentration ?? 100) : '#e3f6ff';
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
  return <figure className={'gc-graphic' + (run ? ' gc-graphic--running' : '')} style={{'--gc-stream-duration':streamDurationMs+'ms'} as CSSProperties}>
    <svg viewBox={geometry.viewBox} role="img" aria-label={run ? content.words.analysing + content.sampleLabels[run.sample] : content.words.graphicLabel}>
      <defs><filter id={id + 'glow'} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <rect {...geometry.shape1} fill="#112e45" stroke="#395b6f" strokeWidth="3" />
      <text {...geometry.labels.label1} textAnchor="middle" className="type-caption" fill="#152033">{content.words.label1}</text>
      <path d={path1} fill="none" stroke="#081822" strokeWidth="14" strokeLinecap="round" />
      <path className="gc-path-inner" d={path1} fill="none" stroke="#e6eef2" strokeWidth="8" strokeLinecap="round" />
      {run && progress >= .14 && <g className="gc-travelling-light">
        {[150, 100, 55, 20].map((length, i) => <path key={length} d={path2} pathLength="1000" fill="none" stroke={colour} strokeOpacity={.1 + i * .23} strokeWidth={i === 3 ? 5 : 10} strokeLinecap="round" strokeDasharray={length + ' 1000'} strokeDashoffset={length - travel * 1000} filter={i === 0 ? 'url(#' + id + 'glow)' : undefined} />)}
      </g>}
      <path className="gc-reduced-path" d={path2} fill="none" stroke={colour} strokeWidth="5" />
      <g fill="none" stroke="#6f8995" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" strokeDasharray={streamParticles}>
        <path className="gc-stream-flow gc-stream-inlet" d={geometry.path3} pathLength="70" />
        <path className="gc-stream-flow gc-stream-common" d={path2} pathLength="1000" />
      </g>
      <g className="gc-stream-source" fill="#e6eef2" stroke="#243749" strokeWidth="3"><rect {...geometry.shape2}/><ellipse {...geometry.shape3}/></g>
      <text {...geometry.labels.label2} textAnchor="middle" className="type-caption" fill="#152033">{content.words.label2}</text>
      <path d={geometry.path4} stroke="#243749" strokeWidth="4" />
      <g className={run && progress < .14 ? 'gc-transfer' : ''}>
        <path d={geometry.path5} stroke="#243749" strokeWidth="7" />
        <rect {...geometry.shape4} fill={colour} stroke="#243749" strokeWidth="3" />
      </g>
      <text {...geometry.labels.label3} textAnchor="middle" className="type-caption" fill="#152033">{content.words.label3}</text>
      <rect {...geometry.shape5} fill="#e6eef2" stroke="#243749" strokeWidth="3" />
      <circle {...geometry.shape6} fill={run && progress > .9 ? colour : '#244b5b'} className={run && progress > .9 ? 'gc-indicator-flash' : ''} />
      <path d={geometry.path6} fill="none" stroke="#244b5b" strokeWidth="3" />
      <text {...geometry.labels.label4} textAnchor="middle" className="type-caption" fill="#152033">{content.words.label4}</text>
    </svg>

  </figure>;
}
