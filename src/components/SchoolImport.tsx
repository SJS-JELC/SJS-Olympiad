import {useState} from 'react';
import {request,type SchoolRecord,type TeamRecord,type AdminBatchResult} from '../cloud/api';
import {parseSchoolImport,type SchoolImportRow} from './school-import';
type Plan={requestId:string;rows:SchoolImportRow[]};
type Props={eventId:string;disabled:boolean;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;refresh:()=>Promise<void>;onPending:(value:boolean)=>void};
export function SchoolImport({eventId,disabled,busy,run,refresh,onPending}:Props){
 const [text,setText]=useState(''),[preview,setPreview]=useState<SchoolImportRow[]|null>(null),[plan,setPlan]=useState<Plan|null>(null),[done,setDone]=useState(0),[error,setError]=useState('');
 async function validate(){
  setError('');setPreview(null);
  await run(async()=>{const [schools,teams]=await Promise.all([request<{schools:SchoolRecord[]}>('schools?eventId='+encodeURIComponent(eventId)),request<{teams:TeamRecord[]}>('teams?eventId='+encodeURIComponent(eventId))]);try{setPreview(parseSchoolImport(text,schools.schools,teams.teams));}catch(error){setError(error instanceof Error?error.message:'Check the pasted table.');}});
 }
 async function apply(current:Plan){
  setPlan(current);onPending(true);
  const rows=current.rows.map(row=>({name:row.name,targetCount:row.targetCount,colours:row.colours,...(row.school?{schoolId:row.school.id,expectedRevision:row.school.revision,restore:!!row.school.deleted}:{})}));
  const result=await request<AdminBatchResult>('schools-import',{eventId,requestId:current.requestId,rows});
  setDone(result.completed);await refresh();
  if(!result.complete)throw Error(result.results.filter(row=>!row.ok).map(row=>current.rows[row.index].name+': '+row.error).join(' '));
  setPlan(null);setPreview(null);setText('');onPending(false);
 }
 function start(){if(!preview)return;setDone(0);void run(()=>apply({requestId:crypto.randomUUID(),rows:preview}));}
 return <details className="settings-school-import"><summary>Bulk load schools, teams and colours</summary>
  <p>Copy columns from Excel: School, Team count, Colour 1, Colour 2 (optional). Colours use # followed by six hex digits. Existing teams and results are retained; lower counts never delete teams. Deleted school names restore the original school.</p>
  <label htmlFor="school-import">Paste school table</label><textarea id="school-import" rows={5} value={text} disabled={disabled || !!plan} onChange={e=>{setText(e.target.value);setPreview(null);setError('');}} placeholder={'School\tTeam count\tColour 1\tColour 2\nExample Academy\t3\t#123456\t#FEDCBA'}/>
  <button type="button" className="ui-button" disabled={disabled || !text.trim()} onClick={()=>void validate()}>Preview import</button>
  {error && <p role="alert">{error}</p>}
  {preview && <><table><caption>Import preview</caption><thead><tr><th>School</th><th>Action</th><th>Teams to add</th><th>Colours</th></tr></thead><tbody>{preview.map(row=><tr key={row.name}><td>{row.name}</td><td>{row.school?.deleted?'Restore':row.school?'Update':'Create'}</td><td>{row.addCount}</td><td>{row.colours.join(' / ')}</td></tr>)}</tbody></table><button type="button" className="ui-button" disabled={disabled || !!plan} onClick={start}>Apply import</button></>}
  {plan && <><p role="status">{done} of {plan.rows.length} schools processed. Completed changes are retained.</p><button type="button" className="ui-button" disabled={busy} onClick={()=>void run(()=>apply(plan))}>Retry remaining import</button><button type="button" className="ui-button" disabled={busy} onClick={()=>{setPlan(null);setPreview(null);onPending(false);}}>Stop retrying import</button></>}
 </details>;
}
