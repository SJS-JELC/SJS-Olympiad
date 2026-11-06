import {useState} from 'react';
import type {AdminBatchResult} from '../cloud/api';
import {parseSchoolImport,type SchoolImportRow} from './school-import';
import type {RosterCommand,RosterSnapshot} from './useRosterController';

type Props={eventId:string;disabled:boolean;snapshot:RosterSnapshot;start:(command:RosterCommand)=>void};
export function SchoolImport({eventId,disabled,snapshot,start}:Props){
 const [text,setText]=useState(''),[preview,setPreview]=useState<SchoolImportRow[]|null>(null),[error,setError]=useState('');
 function validate(){
  setError('');setPreview(null);
  try{setPreview(parseSchoolImport(text,snapshot.schools,snapshot.teams));}catch(error){setError(error instanceof Error?error.message:'Check the pasted table.');}
 }
 function apply(){
  if(disabled || !preview)return;
  const rows=preview.map(row=>({name:row.name,targetCount:row.targetCount,colours:row.colours,...(row.school?{schoolId:row.school.id,expectedRevision:row.school.revision,restore:!!row.school.deleted}:{})}));
  start({action:'schools-import',label:'Import schools',items:preview.map(row=>({id:row.school?.id ?? row.name,name:row.name})),body:{eventId,requestId:crypto.randomUUID(),rows},onConfirmed:(result:AdminBatchResult)=>{if(result.complete){setPreview(null);setText('');}}});
 }
 return <details className="settings-school-import"><summary>Bulk load schools, teams and colours</summary>
  <p>Copy columns from Excel: School, Team count, Colour 1, Colour 2 (optional). Colours use # followed by six hex digits. Existing teams and results are retained; lower counts never delete teams. Deleted school names restore the original school.</p>
  <label htmlFor="school-import">Paste school table</label><textarea id="school-import" rows={5} value={text} disabled={disabled} onChange={e=>{setText(e.target.value);setPreview(null);setError('');}} placeholder={'School\tTeam count\tColour 1\tColour 2\nExample Academy\t3\t#123456\t#FEDCBA'}/>
  <button type="button" className="ui-button" disabled={disabled || !text.trim()} onClick={validate}>Preview import</button>
  {error && <p role="alert">{error}</p>}
  {preview && <><table><caption>Import preview</caption><thead><tr><th>School</th><th>Action</th><th>Teams to add</th><th>Colours</th></tr></thead><tbody>{preview.map(row=><tr key={row.name}><td>{row.name}</td><td>{row.school?.deleted?'Restore':row.school?'Update':'Create'}</td><td>{row.addCount}</td><td>{row.colours.join(' / ')}</td></tr>)}</tbody></table><button type="button" className="ui-button" disabled={disabled} onClick={apply}>Apply import</button></>}
 </details>;
}
