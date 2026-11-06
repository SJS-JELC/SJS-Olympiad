import {useState} from 'react';
import type {SchoolRecord} from '../cloud/api';
import type {RosterCommand} from './useRosterController';
import {safeColours} from './selector-art';

export function SchoolColourSettings({school,disabled,start}:{school:SchoolRecord;disabled:boolean;start:(command:RosterCommand)=>void}){
 const initial=safeColours(school.colours);
 const [count,setCount]=useState(initial.length),[left,setLeft]=useState(initial[0]),[right,setRight]=useState(initial[1] ?? initial[0]);
 const [revision,setRevision]=useState(school.revision);
 const stale=revision!==school.revision;
 const field=(number:number,value:string,change:(value:string)=>void)=><div className="settings-field"><label htmlFor={'school-colour-'+number}>Colour {number} hex{count===2?(number===1?' (left)':' (right)'):''}</label><div className="school-colour-input"><span className="school-colour-swatch" aria-hidden="true" style={{background:/^#[\da-f]{6}$/i.test(value)?value:'transparent'}}/><input id={'school-colour-'+number} value={value} onChange={e=>change(e.target.value)} pattern="#[0-9A-Fa-f]{6}" maxLength={7} required spellCheck={false} disabled={disabled} title="A # followed by six hexadecimal digits, for example #024633"/></div></div>;
 return <form className="settings-school-colours" aria-label="School colours" onSubmit={event=>{event.preventDefault();if(!disabled && !stale)start({action:'school-colours',label:'Save school colours',body:{schoolId:school.id,colours:count===1?[left]:[left,right],expectedRevision:revision,requestId:crypto.randomUUID()},onConfirmed:(result:{school:SchoolRecord})=>setRevision(result.school.revision)});}}>
  <div className="settings-field"><label htmlFor="school-colour-count">Number of colours</label><select id="school-colour-count" value={count} disabled={disabled} onChange={e=>setCount(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></div>
  {field(1,left,setLeft)}{count===2 && field(2,right,setRight)}
  <button className="ui-button" disabled={disabled || stale}>Save school colours</button>
  {stale && <p role="status">This school changed. <button type="button" className="ui-button" disabled={disabled} onClick={()=>setRevision(school.revision)}>Use latest school revision</button></p>}
  <p className="type-caption">Shared by this school’s competition teams and pilot selection. Two colours set the left and right ends.</p>
 </form>;
}
