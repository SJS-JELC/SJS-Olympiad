import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { U6P1Presentation } from './U6Problem1';

// Only X is magnified; the protected source supplies the original geometry.
export const clampNmrCenter = (value: number, width: number, detailWidth: number) => Math.max(detailWidth / 2, Math.min(width - detailWidth / 2, value));

export function NmrExplorer({spectrum,config}:{spectrum:string;config:U6P1Presentation['detail']}) {
  const {width:NMR_WIDTH,height:NMR_HEIGHT,detailWidth:NMR_DETAIL_WIDTH,labels}=config;
  const clamp=(value:number)=>clampNmrCenter(value,NMR_WIDTH,NMR_DETAIL_WIDTH);
  const id = useId();
  const [center, setCenter] = useState(config.initialCenter);
  const left = center - NMR_DETAIL_WIDTH / 2;
  const select = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCenter(clamp((event.clientX - bounds.left) / bounds.width * NMR_WIDTH));
  };
  const selectWithKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -.25, ArrowRight: .25, PageUp: -10, PageDown: 10 };
    if (event.key === 'Home') setCenter(NMR_DETAIL_WIDTH / 2);
    else if (event.key === 'End') setCenter(NMR_WIDTH - NMR_DETAIL_WIDTH / 2);
    else if (event.key in steps) setCenter(value => clamp(value + steps[event.key]));
    else return;
    event.preventDefault();
  };
  return <figure className="u6p1-detail">
    <div className="u6p1-detail-panels">
      <div>
        <p className="type-label u6p1-detail-label">{labels[0]}</p>
        <svg className="u6p1-detail-overview" style={{aspectRatio:`${NMR_WIDTH} / ${NMR_HEIGHT}`}} viewBox={`0 0 ${NMR_WIDTH} ${NMR_HEIGHT}`} role="slider" tabIndex={0}
          aria-label={labels[2]}
          aria-orientation="horizontal" aria-valuemin={NMR_DETAIL_WIDTH / 2} aria-valuemax={NMR_WIDTH - NMR_DETAIL_WIDTH / 2} aria-valuenow={center} aria-controls={`${id}-detail`}
          onKeyDown={selectWithKeyboard}
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); select(event); }}
          onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) select(event); }}>
          <image href={spectrum} width={NMR_WIDTH} height={NMR_HEIGHT} />
          <defs><linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".48" /><stop offset=".5" stopColor="#8ac9ee" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity=".3" /></linearGradient></defs>
          <rect className="u6p1-detail-selection" x={left} y="0" width={NMR_DETAIL_WIDTH} height={NMR_HEIGHT} rx="2.5" fill={`url(#${id}-glass)`} />
        </svg>
      </div>
      <div>
        <p className="type-label u6p1-detail-label">{labels[1]}</p>
        <svg id={`${id}-detail`} className="u6p1-detail-detail" style={{aspectRatio:`${NMR_WIDTH} / ${NMR_HEIGHT}`}} viewBox={`${left} 0 ${NMR_DETAIL_WIDTH} ${NMR_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={labels[3]}>
          <image href={spectrum} width={NMR_WIDTH} height={NMR_HEIGHT} />
        </svg>
      </div>
    </div>
  </figure>;
}
