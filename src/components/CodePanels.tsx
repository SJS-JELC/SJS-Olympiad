import type {Ref} from 'react';
import './CodePanels.css';
export function CodePanels({id,label,value,onChange,disabled=false,inputRef,className=''}:{id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;inputRef?:Ref<HTMLInputElement>;className?:string}) {
 return <div className={'code-panels '+className}>
  <label className="sr-only" htmlFor={id}>{label}</label>
  <span className="code-panels__cards" aria-hidden="true">{Array.from({length:Math.max(4,value.length)},(_,index)=><span key={index} className="score-digit code-panels__card">{index<value.length && <svg viewBox="-12 -12 24 24"><path d="M0 -8V8M-7 -4L7 4M-7 4L7 -4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}</span>)}</span>
  <input ref={inputRef} id={id} type="password" autoComplete="off" maxLength={128} value={value} onChange={event=>onChange(event.target.value)} disabled={disabled}/>
 </div>;
}
