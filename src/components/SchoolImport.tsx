import {useState} from 'react';
import {request,type SchoolRecord,type TeamRecord} from '../cloud/api';
import {parseSchoolImport,type SchoolImportRow} from './school-import';
type Row=SchoolImportRow & {createId:string;colourId:string;teamsId:string;stage:number;colourRevision?:number};
type Plan={rows:Row[];index:number};
type Props={eventId:string;disabled:boolean;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;refresh:()=>Promise<void>;onPending:(value:boolean)=>void};
export function SchoolImport({eventId,disabled,busy,run,refresh,onPending}:Props){
 const [text,setText]=useState(''),[preview,setPreview]=useState<SchoolImportRow[]|null>(null),[plan,setPlan]=useState<Plan|null>(null),[done,setDone]=useState(0),[error,setError]=useState('');
 async function validate(){
  setError('');setPreview(null);
  await run(async()=>{const [schools,teams]=await Promise.all([request<{schools:SchoolRecord[]}>('schools?eventId='+encodeURIComponent(eventId)),request<{teams:TeamRecord[]}>('teams?eventId='+encodeURIComponent(eventId))]);try{setPreview(parseSchoolImport(text,schools.schools,teams.teams));}catch(error){setError(error instanceof Error?error.message:'Check the pasted table.');}});
 }
 async function apply(current:Plan){
  setPlan(current);onPending(true);
  try{
   while(current.index<current.rows.length){
    const row=current.rows[current.index];
    if(row.stage===0){if(!row.school)row.school=(await request<{school:SchoolRecord}>('school-create',{name:row.name,requestId:row.createId})).school;row.colourRevision=row.school.revision;row.stage=1;}
    if(row.stage===1){row.school=(await request<{school:SchoolRecord}>('school-colours',{schoolId:row.school!.id,colours:row.colours,expectedRevision:row.colourRevision,requestId:row.colourId})).school;row.stage=2;}
    if(row.stage===2){if(row.addCount>0)await request('school-teams',{eventId,schoolId:row.school!.id,targetCount:row.targetCount,requestId:row.teamsId});row.stage=3;}
    current.index++;setDone(current.index);
   }
   await refresh();setPlan(null);setPreview(null);setText('');onPending(false);
  }catch(error){await refresh().catch(()=>{});throw error;}
 }
 function start(){if(!preview)return;setDone(0);const current:Plan={index:0,rows:preview.map(row=>({...row,stage:0,createId:crypto.randomUUID(),colourId:crypto.randomUUID(),teamsId:crypto.randomUUID()}))};void run(()=>apply(current));}
 return <details className="settings-school-import"><summary>Bulk load schools, teams and colours</summary>
  <p>Copy columns from Excel: School, Team count, Colour 1, Colour 2 (optional). Colours use # followed by six hex digits. Existing teams and results are retained; lower counts never delete teams.</p>
  <label htmlFor="school-import">Paste school table</label><textarea id="school-import" rows={5} value={text} disabled={disabled || !!plan} onChange={e=>{setText(e.target.value);setPreview(null);setError('');}} placeholder={'School\tTeam count\tColour 1\tColour 2\nExample Academy\t3\t#123456\t#FEDCBA'}/>
  <button type="button" className="ui-button" disabled={disabled || !text.trim()} onClick={()=>void validate()}>Preview import</button>
  {error && <p role="alert">{error}</p>}
  {preview && <><table><caption>Import preview</caption><thead><tr><th>School</th><th>Action</th><th>Teams to add</th><th>Colours</th></tr></thead><tbody>{preview.map(row=><tr key={row.name}><td>{row.name}</td><td>{row.school?'Update':'Create'}</td><td>{row.addCount}</td><td>{row.colours.join(' / ')}</td></tr>)}</tbody></table><button type="button" className="ui-button" disabled={disabled || !!plan} onClick={start}>Apply import</button></>}
  {plan && <><p role="status">{done} of {plan.rows.length} schools processed. Completed changes are retained.</p><button type="button" className="ui-button" disabled={busy} onClick={()=>void run(()=>apply(plan))}>Retry remaining import</button><button type="button" className="ui-button" disabled={busy} onClick={()=>{setPlan(null);setPreview(null);onPending(false);}}>Stop import</button></>}
 </details>;
}
