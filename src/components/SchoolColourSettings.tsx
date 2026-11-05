import {useState} from 'react';
import {HttpError,request,type SchoolRecord} from '../cloud/api';
import {safeColours} from './selector-art';

type Change={schoolId:string;colours:string[];expectedRevision:number;requestId:string};
export function SchoolColourSettings({school,disabled,run,refresh}:{school:SchoolRecord;disabled:boolean;run:(work:()=>Promise<void>)=>Promise<void>;refresh:()=>Promise<void>}){
 const initial=safeColours(school.colours);
 const [count,setCount]=useState(initial.length),[left,setLeft]=useState(initial[0]),[right,setRight]=useState(initial[1] ?? initial[0]);
 const [revision,setRevision]=useState(school.revision),[pending,setPending]=useState<Change|null>(null);
 const stale=revision!==school.revision;
 function reload(){const colours=safeColours(school.colours);setCount(colours.length);setLeft(colours[0]);setRight(colours[1] ?? colours[0]);setRevision(school.revision);}
 async function save(input:Change){
  setPending(input);
  await run(async()=>{
   try{const result=await request<{school:SchoolRecord}>('school-colours',input);setRevision(result.school.revision);setPending(null);const colours=safeColours(result.school.colours);setCount(colours.length);setLeft(colours[0]);setRight(colours[1] ?? colours[0]);}
   catch(error){if(error instanceof HttpError && error.status<500)setPending(null);throw error;}
   finally{await refresh();}
  });
 }
 const field=(number:number,value:string,change:(value:string)=>void)=><div className="settings-field"><label htmlFor={'school-colour-'+number}>Colour {number} hex{count===2?(number===1?' (left)':' (right)'):''}</label><div className="school-colour-input"><span className="school-colour-swatch" aria-hidden="true" style={{background:/^#[\da-f]{6}$/i.test(value)?value:'transparent'}}/><input id={'school-colour-'+number} value={value} onChange={e=>change(e.target.value)} pattern="#[0-9A-Fa-f]{6}" maxLength={7} required spellCheck={false} disabled={disabled || !!pending} title="A # followed by six hexadecimal digits, for example #024633"/></div></div>;
 return <form className="settings-school-colours" aria-label="School colours" onSubmit={event=>{event.preventDefault();if(!disabled && !pending && !stale)void save({schoolId:school.id,colours:count===1?[left]:[left,right],expectedRevision:revision,requestId:crypto.randomUUID()});}}>
  <div className="settings-field"><label htmlFor="school-colour-count">Number of colours</label><select id="school-colour-count" value={count} disabled={disabled || !!pending} onChange={e=>setCount(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></div>
  {field(1,left,setLeft)}{count===2 && field(2,right,setRight)}
  <button className="ui-button" disabled={disabled || !!pending || stale}>Save school colours</button>
  {pending && <button type="button" className="ui-button" disabled={disabled} onClick={()=>void save(pending)}>Retry saving colours</button>}
  {stale && !pending && <p role="status">This school changed. <button type="button" className="ui-button" disabled={disabled} onClick={reload}>Reload colours</button></p>}
  <p className="type-caption">Shared by this school’s competition teams and pilot selection. Two colours set the left and right ends.</p>
 </form>;
}
