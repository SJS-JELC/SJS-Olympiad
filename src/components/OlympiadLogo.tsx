import { useId, type CSSProperties } from 'react';
import artwork from '../assets/olympiad-logo.svg?raw';
import './OlympiadLogo.css';

export type OlympiadLogoProps = {
  className?: string;
  label?: string;
  bubbling?: boolean;
};

// Trusted local artwork only; never accept SVG markup from runtime data.
const artworkBody = artwork.slice(artwork.indexOf('>') + 1, artwork.lastIndexOf('</svg>'));
// Source-art palettes, mouth positions and approximate bubble diameters.
const flasks = [
  { id: 'green', lanes: [282, 306], mouthY: 377, clipX: 250, diameters: [35, 29, 24], fill: '#4caf4f', highlight: '#78c55c', outline: '#131212', phase: 0 },
  { id: 'yellow', lanes: [732, 756], mouthY: 377, clipX: 700, diameters: [30, 29, 23], fill: '#e6b935', highlight: '#f1d968', outline: '#131212', phase: 2.5 },
  { id: 'blue', lanes: [44, 68], mouthY: 512, clipX: 10, diameters: [35, 24, 23], fill: '#3189cb', highlight: '#a4dbe0', outline: '#0d0f11', phase: 5 },
  { id: 'red', lanes: [974, 998], mouthY: 512, clipX: 938, diameters: [35, 24, 24], fill: '#9e1829', highlight: '#d2e6e4', outline: '#131212', phase: 7.5 },
] as const;
// Six evenly phased particles fill the whole loop, including its boundary.
const particleIndices = [0, 1, 2, 3, 4, 5] as const;

/** Individual bubbles emerge above each flask rim, rise, then burst. */
export function OlympiadLogo({ className, label = "St John's Chemistry Olympiad — eagle and wordmark", bubbling = false }: OlympiadLogoProps) {
  const instanceId = 'olympiad-logo-' + useId();
  return <svg className={className} viewBox="0 0 1039 697" width="1038" height="696"
    role="img" aria-label={label} focusable="false" data-bubbling={bubbling ? 'all' : undefined}>
    <g aria-hidden="true" dangerouslySetInnerHTML={{ __html: artworkBody }} />
    {bubbling && flasks.map(flask => {
      const mouthClipId = instanceId + '-' + flask.id + '-mouth';
      return <g key={flask.id} aria-hidden="true" data-bubble-flask={flask.id}>
        {/* These rim bars belong to the source bubble groups, which animation hides. */}
        {(flask.id === 'blue' || flask.id === 'red') && <rect
          x={flask.id === 'blue' ? 23 : 950} y="512" width="65" height="5" fill={flask.outline} />}
        <defs><clipPath id={mouthClipId} clipPathUnits="userSpaceOnUse">
          {/* Clip each stream at its own mouth; the hidden spawn is below it. */}
          <rect x={flask.clipX} y={flask.mouthY - 87} width="100" height="87" />
        </clipPath></defs>
        <g className="olympiad-logo__bubble-stream" clipPath={'url(#' + mouthClipId + ')'}>
          {particleIndices.map(index => <g key={index} transform={'translate(' + flask.lanes[index % 2] + ' ' + (flask.mouthY + 21) + ')'}>
            <g className="olympiad-logo__bubble-rise" style={{
              '--bubble-rise': '-57px',
              '--bubble-drift': '-2px',
              '--bubble-delay': -(index * 10 + flask.phase) + 's',
            } as CSSProperties}>
              <g transform={'scale(' + flask.diameters[index % 3] / 14 + ')'}>
                <g className="olympiad-logo__bubble-shell">
                  <path fill={flask.outline} d="M-3-7H3V-5H5V-3H7V3H5V5H3V7H-3V5H-5V3H-7V-3H-5V-5H-3Z" />
                  {/* Three-unit inset keeps a bold pixel border without enlarging the bubble. */}
                  <path fill={flask.fill} d="M-2-4H2V-2H4V2H2V4H-2V2H-4V-2H-2Z" />
                  <path fill={flask.highlight} d="M-2-2H1V-1H-1V1H-2Z" />
                </g>
                <g className="olympiad-logo__bubble-pop" fill={flask.highlight} stroke={flask.outline} strokeWidth="1">
                  <path d="M-1-10H1V-7H-1ZM7-1H10V1H7ZM-1 7H1V10H-1ZM-10-1H-7V1H-10Z" />
                </g>
              </g>
            </g>
          </g>)}
        </g>
      </g>;
    })}
  </svg>;
}
