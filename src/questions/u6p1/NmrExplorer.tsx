import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import spectrum from './assets/nmr.svg';

// Original spectrum geometry, not a replot. Only X is magnified; Y remains unchanged.
export const NMR_WIDTH = 321.8;
export const NMR_HEIGHT = 150.97;
export const NMR_DETAIL_WIDTH = 40;
export const clampNmrCenter = (value: number) => Math.max(NMR_DETAIL_WIDTH / 2, Math.min(NMR_WIDTH - NMR_DETAIL_WIDTH / 2, value));

export function NmrExplorer() {
  const id = useId();
  const [center, setCenter] = useState(248);
  const left = center - NMR_DETAIL_WIDTH / 2;
  const select = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCenter(clampNmrCenter((event.clientX - bounds.left) / bounds.width * NMR_WIDTH));
  };
  const selectWithKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -.25, ArrowRight: .25, PageUp: -10, PageDown: 10 };
    if (event.key === 'Home') setCenter(NMR_DETAIL_WIDTH / 2);
    else if (event.key === 'End') setCenter(NMR_WIDTH - NMR_DETAIL_WIDTH / 2);
    else if (event.key in steps) setCenter(value => clampNmrCenter(value + steps[event.key]));
    else return;
    event.preventDefault();
  };
  return <figure className="u6p1-nmr">
    <div className="u6p1-nmr-panels">
      <div>
        <p className="type-label u6p1-nmr-label">Full spectrum</p>
        <svg className="u6p1-nmr-overview" viewBox={`0 0 ${NMR_WIDTH} ${NMR_HEIGHT}`} role="slider" tabIndex={0}
          aria-label="NMR detail region. Use left and right arrows to move, Home and End for the boundaries."
          aria-orientation="horizontal" aria-valuemin={NMR_DETAIL_WIDTH / 2} aria-valuemax={NMR_WIDTH - NMR_DETAIL_WIDTH / 2} aria-valuenow={center} aria-controls={`${id}-detail`}
          onKeyDown={selectWithKeyboard}
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); select(event); }}
          onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) select(event); }}>
          <image href={spectrum} width={NMR_WIDTH} height={NMR_HEIGHT} />
          <defs><linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".48" /><stop offset=".5" stopColor="#8ac9ee" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity=".3" /></linearGradient></defs>
          <rect className="u6p1-nmr-selection" x={left} y="0" width={NMR_DETAIL_WIDTH} height={NMR_HEIGHT} rx="2.5" fill={`url(#${id}-glass)`} />
        </svg>
      </div>
      <div>
        <p className="type-label u6p1-nmr-label">Selected detail · 8× horizontal magnification</p>
        <svg id={`${id}-detail`} className="u6p1-nmr-detail" viewBox={`${left} 0 ${NMR_DETAIL_WIDTH} ${NMR_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Original NMR spectrum detail with horizontal magnification and unchanged vertical scale.">
          <image href={spectrum} width={NMR_WIDTH} height={NMR_HEIGHT} />
        </svg>
      </div>
    </div>
  </figure>;
}
