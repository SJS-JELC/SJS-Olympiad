import {useEffect,useState} from 'react';
import eagle from './completion-eagle.json';
import './CompletionStamp.css';

const completionClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function completionTime(solvedAt:number):string {return completionClock.format(solvedAt);}

/** A presentation of confirmed server state; it never changes an attempt/score. */
export function CompletionStamp({solvedAt,animate=false,preview=false,onShown}:{solvedAt:number;animate?:boolean;preview?:boolean;onShown?:()=>void}) {
 const [entering]=useState(animate);
 useEffect(()=>{onShown?.();},[]);
 const time=completionTime(solvedAt);
 return <div className={'completion-stamp'+(entering?' completion-stamp--entering':'')} role="status" aria-label={`Complete at ${time} Europe/London${preview?' · teacher preview (unscored)':''}`} data-solved-at={solvedAt} data-animated={entering}>
  <svg viewBox="0 0 720 240" aria-hidden="true" focusable="false">
   <g fill="#ef202b" stroke="#ef202b">
    <rect x="8" y="8" width="704" height="224" fill="none" strokeWidth="12"/>
    <path d="M26 117H486M493 24V219" fill="none" strokeWidth="5" strokeDasharray="5 6"/>
    <text x="37" y="97" textLength="426" lengthAdjust="spacingAndGlyphs" stroke="none" className="type-display completion-stamp__time">{time}</text>
    <text x="34" y="200" textLength="432" lengthAdjust="spacingAndGlyphs" stroke="none" className="type-display completion-stamp__word">COMPLETE</text>
    {/* Source-derived coarse alpha silhouette; generator/hash retained beside it. */}
    <g className="completion-stamp__eagle" transform="translate(510 68) scale(5.625)" shapeRendering="crispEdges"><path d={eagle.path} stroke="none"/></g>
   </g>
  </svg>
 </div>;
}
