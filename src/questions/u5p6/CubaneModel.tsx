import {useRef,useState} from 'react';
import {atoms,bonds,rotate,type Vec3} from './cubaneGeometry';
const initial={yaw:0.55,pitch:-0.35};
export function CubaneModel() {
 const [angles,setAngles]=useState(initial);
 const drag=useRef<{id:number;x:number;y:number}|null>(null);
 const positions=atoms.map(a=>rotate(a.position,angles.yaw,angles.pitch));
 const project=(p:Vec3)=>({x:250+p[0]*0.86,y:250-p[1]*0.86});
 // Subdivide bonds for depth sorting so intersecting near/far edges remain legible.
 const pieces=bonds.flatMap(([a,b],bond)=>Array.from({length:12},(_,i)=>{
  const at=(t:number)=>positions[a].map((v,k)=>v+(positions[b][k]-v)*t) as unknown as Vec3;
  const start=at(i/12),end=at((i+1)/12);
  return {kind:'bond' as const,id:'b'+bond+'-'+i,z:(start[2]+end[2])/2,start:project(start),end:project(end)};
 }));
 const shapes=[...pieces,...atoms.map((a,i)=>({kind:'atom' as const,id:a.id,z:positions[i][2],element:a.element,...project(positions[i])}))].sort((a,b)=>a.z-b.z);
 const turn=(dx:number,dy:number)=>setAngles(v=>({yaw:v.yaw+dx,pitch:v.pitch+dy}));
 return <div className="cubane-model">
 <svg viewBox="0 0 500 500" role="group" tabIndex={0} aria-label="Cubane molecule. Drag to rotate, or use the arrow keys. Home resets the view."
 onPointerDown={e=>{if(e.button!==0 || drag.current)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};}}
 onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const scale=4/Math.max(1,e.currentTarget.getBoundingClientRect().width);turn((e.clientX-d.x)*scale,(e.clientY-d.y)*scale);drag.current={id:d.id,x:e.clientX,y:e.clientY};}}
 onPointerUp={e=>{if(drag.current?.id===e.pointerId){drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}}}
 onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
 onKeyDown={e=>{const keys:Record<string,[number,number]>={ArrowLeft:[-0.12,0],ArrowRight:[0.12,0],ArrowUp:[0,-0.12],ArrowDown:[0,0.12]};if(e.key==='Home'){e.preventDefault();setAngles(initial);}else if(keys[e.key]){e.preventDefault();turn(...keys[e.key]);}}}>
 <title>Cubane: eight carbon atoms on a cube with eight outward hydrogen atoms</title>
 {shapes.map(s=>s.kind==='bond'?<g key={s.id} aria-hidden="true">
 <line x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y} stroke="white" strokeWidth="7"/>
 <line x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y} stroke="#253b50" strokeWidth="3" strokeLinecap="round"/>
 </g>:<g key={s.id} data-atom={s.id} aria-hidden="true">
 <circle cx={s.x} cy={s.y} r={s.element==='C'?13:12} fill="white"/>
 <text x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central" className="type-body cubane-atom">{s.element}</text>
 </g>)}
 </svg>
 <div className="cubane-view-controls type-caption"><span>Drag to rotate</span><button type="button" onClick={()=>setAngles(initial)}>Reset view</button></div>
 </div>;
}
