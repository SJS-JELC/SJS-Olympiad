import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import {selectorArtwork,selectorName,unavailableArtwork} from './selector-art';
import lockIn from '../assets/selector/lock-in-hazard.svg';
import locked from '../assets/selector/lock-in-hazard-locked.svg';
import './SchoolSelector.css';

export type SelectorItem={id:string;name:string;colours?:string[];unavailable?:boolean};
export function selectorPlacement(count:number,columns:number,index:number){
 const rows=Math.ceil(count/columns),row=Math.floor(index/columns),remaining=count%columns;
 return {row:row+1,column:(index%columns)*2+1+(remaining && row===rows-1?columns-remaining:0)};
}
export function SchoolSelector({items,value,onChange,label,disabled=false,loading=false}:{items:SelectorItem[];value:string;onChange:(id:string)=>void;label:string;disabled?:boolean;loading?:boolean}){
 const ref=useRef<HTMLFieldSetElement>(null);
 const names=items.map(i=>i.id+i.name).join('|');
 useLayoutEffect(()=>{
  const grid=ref.current;if(!grid)return;
  let frame=0,live=true;
  function fit(){
   if(!grid || !live || !grid.children.length || grid.clientHeight<=0)return;
   const tiles=Array.from(grid.children) as HTMLElement[];
   function place(columns:number){
    const rows=Math.ceil(tiles.length/columns);
    grid!.style.setProperty('--selector-tracks',String(columns*2));grid!.style.setProperty('--selector-rows',String(rows));
    tiles.forEach((tile,index)=>{const pos=selectorPlacement(tiles.length,columns,index);tile.style.gridRow=String(pos.row);tile.style.gridColumn=pos.column+' / span 2';});
    const style=getComputedStyle(grid!),gap=parseFloat(style.rowGap)||0;
    const width=(grid!.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-(columns-1)*gap)/columns;
    const rowHeight=(grid!.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-(rows-1)*gap)/rows;
    const height=Math.max(1,Math.min(rowHeight,width*.48));
    grid!.style.setProperty('--selector-height',height+'px');grid!.style.setProperty('--selector-cap',height*32/76+'px');
    grid!.style.setProperty('--selector-stamp-size',Math.max(10,Math.min(height*.36,width*.11))+'px');
    return {width,height};
   }
   function fits(size:number){
    grid!.style.setProperty('--selector-name-size',size+'px');
    return tiles.every(tile=>{const name=tile.querySelector<HTMLElement>('.team-tile__name')!;return name.scrollHeight<=tile.clientHeight-8 && name.scrollWidth<=tile.clientWidth-8;});
   }
   let best:{columns:number;size:number;score:number}|undefined;
   const target=Math.max(22,window.innerHeight*.026);
   for(let columns=1;columns<=Math.min(12,tiles.length);columns++){
    const {width,height}=place(columns);if(width<100 || height<30)continue;
    let low=6,high=target;
    for(let pass=0;pass<7;pass++){const mid=(low+high)/2;if(fits(mid))low=mid;else high=mid;}
    const size=Math.floor(low*2)/2,unused=Math.ceil(tiles.length/columns)*columns-tiles.length;
    const score=size*100-Math.abs(width/height-3)*2-unused*.1;
    if(!best || score>best.score)best={columns,size,score};
   }
   place(best?.columns ?? 1);grid.style.setProperty('--selector-name-size',(best?.size ?? 10)+'px');
  }
  const schedule=()=>{if(live){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}};
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);observer?.observe(grid);
  document.fonts?.ready.then(schedule);window.addEventListener('resize',schedule);schedule();
  return()=>{live=false;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',schedule);};
 },[names]);
 return <fieldset ref={ref} className="team-grid school-selector" aria-label={label} aria-busy={loading} disabled={disabled}>
  {items.map(item=>{const art=selectorArtwork(item.colours);return <label key={item.id} className={'team-tile'+(item.unavailable?' team-tile--claimed':'')+(value===item.id?' team-tile--selected':'')} style={{'--tile-default':art.plain,'--tile-selected':art.selected,'--tile-unavailable':`url("${unavailableArtwork}")`} as CSSProperties}>
   <input type="radio" name={label==='Teams'?'team':'school'} value={item.id} checked={value===item.id} disabled={item.unavailable} onChange={()=>onChange(item.id)} aria-label={item.name+(item.unavailable?' — claimed':'')}/>
   <span className="team-tile__name type-label" aria-hidden="true">{selectorName(item.name)}</span>
   {item.unavailable && <span className="team-tile__stamp type-display" aria-hidden="true">CLAIMED</span>}
  </label>;})}
 </fieldset>;
}
export function LockInButton({disabled=false,busy=false,confirmed=false}:{disabled?:boolean;busy?:boolean;confirmed?:boolean}){
 return <button type="submit" className="hazard-lock" disabled={disabled || busy || confirmed} aria-label={confirmed?'LOCKED':busy?'LOCKING IN...':'LOCK IN'} aria-busy={busy}>
  <img src={confirmed?locked:lockIn} alt="" aria-hidden="true" width="720" height="230"/>
 </button>;
}
