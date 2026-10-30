import { useRef, type PointerEvent, type ReactNode } from 'react';

type Position = readonly [number, number];
export function DraggablePrintout({position, layer, angle, animate, onMove, onOpen, onDelete, runId, heading, children}: {
 heading: string; runId: number; onDelete: () => void; animate: boolean; position: Position; layer: number; angle: number; onMove: (position?: Position) => void; onOpen: () => void; children: ReactNode;
}) {
 const drag = useRef<{pointer: number; x: number; y: number; origin: Position; moved: boolean} | null>(null);
 const suppressClick = useRef(false);
 const move = (event: PointerEvent<HTMLDivElement>) => {
  const current = drag.current;
  if (!current || current.pointer !== event.pointerId) return;
  const dx = event.clientX-current.x, dy = event.clientY-current.y;
  if (!current.moved && Math.hypot(dx,dy)<5) return;
  current.moved = true;
  const parent = event.currentTarget.parentElement!;
  const width = Math.max(1,parent.clientWidth-event.currentTarget.offsetWidth);
  const height = Math.max(1,parent.clientHeight-event.currentTarget.offsetHeight);
  onMove([Math.max(0,Math.min(1,current.origin[0]+dx/width)),Math.max(0,Math.min(1,current.origin[1]+dy/height))]);
 };
 return <div role="group" tabIndex={0} aria-label={'Run ' + runId + ' printout'} className={'gc-printout' + (animate ? ' gc-printout--new' : '')} title="Click or press Enter to enlarge. Drag or use arrow keys to move."
 style={{left:`${position[0]*100}%`,top:`${position[1]*100}%`,transform:`translate(${-position[0]*100}%, ${-position[1]*100}%) rotate(${angle}deg)`,zIndex:layer}}
 onPointerDown={event=>{
  if (event.button!==0 || drag.current || (event.target as Element).closest('button,[role="slider"]')) return;
  event.currentTarget.focus();
  suppressClick.current=false;
  drag.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,origin:position,moved:false};
  event.currentTarget.setPointerCapture(event.pointerId); onMove();
 }}
 onPointerMove={move}
 onPointerUp={event=>{if(drag.current?.pointer!==event.pointerId)return;move(event);suppressClick.current=drag.current.moved;drag.current=null;event.currentTarget.releasePointerCapture(event.pointerId);}}
 onPointerCancel={()=>{suppressClick.current=true;drag.current=null;}}
 onLostPointerCapture={()=>{drag.current=null;}}
 onClick={event=>{if((event.target as Element).closest('button,[role="slider"]'))return;if(suppressClick.current){suppressClick.current=false;return;}event.currentTarget.focus();onMove();onOpen();}}
 onKeyDown={event=>{
  if (event.target !== event.currentTarget) return;
  if(event.key==='Enter'||event.key===' '){event.preventDefault();onMove();onOpen();return;}
  const delta=event.shiftKey?.1:.02;
  const directions:Record<string,Position>={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};
  const direction=directions[event.key];if(!direction)return;
  event.preventDefault();onMove([Math.max(0,Math.min(1,position[0]+direction[0])),Math.max(0,Math.min(1,position[1]+direction[1]))]);
 }}><div className="gc-printout-header"><span className="gc-printout-title type-caption">{heading}</span><div className="gc-printout-tools" onPointerDown={event=>event.stopPropagation()} onPointerUp={event=>event.stopPropagation()}>
 <button className="ui-button" type="button" aria-label={'Enlarge run ' + runId} title="Enlarge report" onClick={event=>{event.stopPropagation();onMove();onOpen();}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/></svg></button>
 <button className="ui-button" type="button" aria-label={'Delete run ' + runId} title="Delete report" onClick={event=>{event.stopPropagation();onDelete();}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg></button>
 </div></div>{children}</div>;
}
