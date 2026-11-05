import {useEffect,useRef,useState} from 'react';
import {request,HttpError,type EventRecord,type SchoolRecord,type SchoolProgress,type TeamRecord} from '../cloud/api';
import {PracticalTeamResult} from '../practicals/Practical';
import {SchoolImport} from './SchoolImport';
import {TeamBulkActions} from './TeamBulkActions';
import {SchoolColourSettings} from './SchoolColourSettings';

type Confirmation={title:string;description:string;run:()=>Promise<void>};
type Pending={action:string;body:Record<string,unknown>;label:string};
type Props={event:EventRecord;teams:TeamRecord[];busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;refresh:()=>Promise<void>;confirm:(value:Confirmation)=>void;onError:(message:string)=>void;resumeEvent:()=>Promise<void>};

export function SchoolRoster({event,teams,busy,run,refresh,confirm,onError,resumeEvent}:Props){
  const [schools,setSchools]=useState<SchoolRecord[]>([]),[progress,setProgress]=useState<SchoolProgress[]>([]);
  const [schoolId,setSchoolId]=useState(''),[count,setCount]=useState('2'),[newName,setNewName]=useState(''),[rename,setRename]=useState(false),[renameName,setRenameName]=useState('');
  const [linkTeam,setLinkTeam]=useState(''),[linkSchool,setLinkSchool]=useState(''),[linkNumber,setLinkNumber]=useState('1');
  const [pending,setPending]=useState<Pending|null>(null),pendingRef=useRef<Pending|null>(null),generation=useRef(0);
  const [deleting,setDeleting]=useState<string[]>([]),[selectedTeams,setSelectedTeams]=useState<string[]>([]),[bulkPending,setBulkPending]=useState(false),[importPending,setImportPending]=useState(false);
  const selectAllRef=useRef<HTMLInputElement>(null);
  const selectable=teams.filter(team=>!deleting.includes(team.id));
  const selectedCount=selectable.filter(team=>selectedTeams.includes(team.id)).length;
  useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=selectedCount>0 && selectedCount<selectable.length;},[selectedCount,selectable.length]);
  useEffect(()=>{setSelectedTeams(ids=>ids.filter(id=>teams.some(team=>team.id===id)));},[teams]);
  const ended=event.status==='ended',selected=schools.find(s=>s.id===schoolId && !s.deleted),disabled=busy || !!pending || bulkPending || importPending || !!event.rosterResetInput;
  const hostProgress=progress.find(p=>p.requestId===event.hostSetup?.requestId && p.schoolId===event.hostSetup?.schoolId);
  async function load(){const current=++generation.current;const value=await request<{schools:SchoolRecord[];progress:SchoolProgress[]}>('schools?eventId='+encodeURIComponent(event.id));if(current===generation.current){setSchools(value.schools);setProgress(value.progress);}}
  useEffect(()=>{setSchoolId('');setCount('2');setLinkTeam('');setNewName('');setRename(false);pendingRef.current=null;setPending(null);void load().catch(error=>onError(error.message));return()=>{generation.current++;};},[event.id]);
  function selectSchool(id:string){setSchoolId(id);setRename(false);const school=schools.find(s=>s.id===id),current=teams.filter(t=>t.schoolId===id).length;setCount(String(Math.max(current,school?.isHostSchool?4:2)));}
  async function execute(command:Pending){
    pendingRef.current=command;setPending(command);
    const deletingId=command.action==='team-delete'?String(command.body.teamId):null;
    if(deletingId)setDeleting(ids=>[...ids,deletingId]);
    try{await run(async()=>{
      try{const value=await request<{school?:SchoolRecord}>(command.action,command.body);pendingRef.current=null;setPending(null);if(value.school){setSchoolId(value.school.id);if(command.action==='school-create')setCount(String(value.school.isHostSchool?4:2));}setNewName('');setRename(false);setLinkTeam('');}
      catch(error){if(error instanceof HttpError && error.status<500){pendingRef.current=null;setPending(null);}throw error;}
      finally{await Promise.all([load(),refresh()]);}
    });}finally{if(deletingId)setDeleting(ids=>ids.filter(id=>id!==deletingId));}
  }
  const command=(action:string,body:Record<string,unknown>,label:string)=>void execute({action,body:{requestId:crypto.randomUUID(),...body},label});
  function releaseTeam(team:TeamRecord){
    const body={eventId:event.id,teamId:team.id,confirm:true,requestId:crypto.randomUUID(),expectedClaimGeneration:team.claimGeneration};
    confirm({title:'Allow team reselection?',description:`Allow reselection for ${team.name}? The current device will lose access. Saved results and answers will be retained.`,run:async()=>{await request('team-release',body);await refresh();}});
  }
  function deleteTeam(team:TeamRecord){
    const body={eventId:event.id,teamId:team.id,teamName:team.name,requestId:crypto.randomUUID(),confirm:true};
    if(event.status==='draft'){void execute({action:'team-delete',body,label:'Delete team'});return;}
    confirm({title:'Delete this team?',description:team.hasSubmittedActivity?`Remove ${team.name} from this event and leaderboard? Its submitted activity and saved records will be retained; its current device will lose access.`:`Delete ${team.name}? If it still has no submitted activity, all team data will be permanently deleted. Any activity submitted before deletion is confirmed will instead be retained and the team removed from lists. Its current device will lose access.`,run:async()=>{setDeleting(ids=>[...ids,team.id]);try{await request('team-delete',body);await refresh();await load();}finally{setDeleting(ids=>ids.filter(id=>id!==team.id));}}});
  }
  const groups=[...[...new Set(teams.flatMap(t=>t.schoolId?[t.schoolId]:[]))].map(id=>({id,name:schools.find(s=>s.id===id)?.name ?? 'School unavailable',teams:teams.filter(t=>t.schoolId===id).sort((a,b)=>(a.teamNumber ?? 0)-(b.teamNumber ?? 0))})),...(teams.some(t=>!t.schoolId)?[{id:'unlinked',name:'Unlinked teams',teams:teams.filter(t=>!t.schoolId)}]:[])];
  return <section className="settings-teams" aria-labelledby="settings-teams-heading">
    <h3 id="settings-teams-heading" className="type-heading">Teams · {event.name}</h3>
    <p className="type-caption">Select a school and its target number of teams. To reduce a count, use the individual or selected-team Delete actions. Releasing a team disconnects its device and retains saved results and answers.</p>
    {event.hostSetup?.status==='pending' && !ended && <div className="settings-setup-progress"><p role="status">Host team setup is incomplete. {hostProgress && `${hostProgress.completed} of ${hostProgress.total} host teams saved. `}Finish setup before activating this event.</p><button className="ui-button" disabled={busy} onClick={()=>void run(async()=>{await resumeEvent();await load();await refresh();})}>Resume host setup</button></div>}
    {!ended && <SchoolImport eventId={event.id} disabled={disabled} busy={busy} run={run} refresh={async()=>{await Promise.all([load(),refresh()]);}} onPending={setImportPending}/>}
    {!ended && <form className="settings-school-create" onSubmit={e=>{e.preventDefault();command('school-create',{name:newName},'Create school');}}><div className="settings-field"><label htmlFor="new-school-name">New school name</label><input id="new-school-name" value={newName} maxLength={70} required disabled={disabled} onChange={e=>setNewName(e.target.value)}/></div><button className="ui-button" disabled={disabled || !newName.trim()}>Create school</button></form>}
    <div className="settings-school-controls"><div className="settings-field"><label htmlFor="school-select">School</label><select id="school-select" value={schoolId} disabled={disabled} onChange={e=>selectSchool(e.target.value)}><option value="">Select a school</option>{schools.filter(s=>!s.deleted).map(s=><option key={s.id} value={s.id}>{s.name}{s.isHostSchool?' (host)':''}</option>)}</select></div>
    <button className="ui-button" disabled={busy || !!pending} onClick={()=>void run(load)}>Refresh schools</button>
    {!ended && <form className="settings-school-target" onSubmit={e=>{e.preventDefault();command('school-teams',{eventId:event.id,schoolId,targetCount:Number(count)},'Set team count');}}><div className="settings-field"><label htmlFor="school-team-count">Target team count</label><input id="school-team-count" type="number" min={1} max={50} step={1} required value={count} disabled={disabled || !selected} onChange={e=>setCount(e.target.value)}/></div><button className="ui-button" disabled={disabled || !selected}>Set team count</button></form>}
    <button className="ui-button" disabled={disabled || !selected} onClick={()=>{setRename(!rename);setRenameName(selected?.name ?? '');}}>Rename selected school</button></div>
    {selected && <button type="button" className="ui-button" disabled={disabled || selected.isHostSchool} onClick={()=>{const body={schoolId:selected.id,expectedRevision:selected.revision,requestId:crypto.randomUUID(),confirm:true};confirm({title:'Delete this school?',description:'Remove '+selected.name+' from future school selection? Delete its teams from unfinished events first. Historical results and the school name will be retained.',run:async()=>{try{await request('school-delete',body);setSchoolId('');}finally{await load();}}});}}>Delete selected school</button>}
    {rename && selected && <form className="settings-school-create" onSubmit={e=>{e.preventDefault();command('school-rename',{schoolId:selected.id,name:renameName,expectedRevision:selected.revision},'Rename school');}}><div className="settings-field"><label htmlFor="rename-school-name">School name</label><input id="rename-school-name" required maxLength={70} value={renameName} disabled={disabled} onChange={e=>setRenameName(e.target.value)}/></div><p className="type-caption">Renaming updates linked team names in every event, including completed results and claimed teams.</p><button className="ui-button" disabled={disabled}>Save school name</button></form>}
    {selected && <SchoolColourSettings key={selected.id} school={selected} disabled={disabled} run={run} refresh={async()=>{await Promise.all([load(),refresh()]);}}/>}
    {pending && <p className="settings-setup-progress"><button className="ui-button" disabled={busy} onClick={()=>void execute(pendingRef.current ?? pending)}>Retry {pending.label.toLowerCase()}</button></p>}
    {progress.filter(p=>!(event.hostSetup?.status==='pending' && p.schoolId===event.hostSetup.schoolId)).map(p=><div key={p.requestId} className="settings-setup-progress"><p role="status">{schools.find(s=>s.id===p.schoolId)?.name}: {p.completed} of {p.total} {p.kind==='link'?'team links':'new teams'} saved. Setup is incomplete.</p>{!ended && <button className="ui-button" disabled={busy} onClick={()=>command('school-resume',{eventId:event.id,schoolId:p.schoolId,requestId:p.requestId},'Resume team setup')}>Resume team setup</button>}</div>)}
    {!ended && <TeamBulkActions event={event} teams={teams} selected={selectedTeams} disabled={disabled} busy={busy} run={run} confirm={confirm} refresh={refresh} onPending={setBulkPending} onDone={id=>setSelectedTeams(ids=>ids.filter(value=>value!==id))} onDeleting={(id,hidden)=>setDeleting(ids=>hidden?[...ids,id]:ids.filter(value=>value!==id))}/>}
    <table><caption className="sr-only">Event teams and results</caption><thead><tr>{!ended && <th scope="col"><input ref={selectAllRef} type="checkbox" aria-label="Select all teams" checked={!!selectable.length && selectedCount===selectable.length} disabled={disabled || !selectable.length} onChange={e=>setSelectedTeams(e.target.checked?selectable.map(team=>team.id):[])}/></th>}<th scope="col">School</th><th scope="col">Team</th><th scope="col">Practical answer</th><th scope="col">Theory score</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{groups.flatMap(group=>group.teams.filter(team=>!deleting.includes(team.id)).map(team=><tr key={team.id}>{!ended && <td><input type="checkbox" aria-label={'Select team '+team.name} checked={selectedTeams.includes(team.id)} disabled={disabled} onChange={e=>setSelectedTeams(ids=>e.target.checked?[...ids,team.id]:ids.filter(id=>id!==team.id))}/></td>}<td>{team.schoolId?group.name:'–'}</td><td>{team.schoolId?team.teamNumber:team.name}</td><td><PracticalTeamResult result={team.practical}/></td><td>{team.score ?? 0}</td><td>{team.claimed?'Taken':'Available'}</td><td><div className="settings-team-actions">
      {!team.schoolId && !ended && <button className="ui-button" disabled={disabled} aria-label={'Link school for '+team.name} onClick={()=>{setLinkTeam(team.id);setLinkSchool(schoolId);setLinkNumber('1');}}>Link school</button>}
      <button className="ui-button" disabled={disabled || ended || !team.claimed} aria-label={'Allow reselection for '+team.name} onClick={()=>releaseTeam(team)}>Allow reselection</button>
      <button className="ui-button" disabled={disabled || ended} aria-label={'Delete team '+team.name} onClick={()=>deleteTeam(team)}>Delete</button>
    </div></td></tr>))}</tbody></table>
    {linkTeam && !ended && <form className="settings-school-link" onSubmit={e=>{e.preventDefault();command('school-link',{eventId:event.id,schoolId:linkSchool,teamId:linkTeam,teamNumber:Number(linkNumber)},'Link team');}}><h4 className="type-label">Link {teams.find(t=>t.id===linkTeam)?.name}</h4><div className="settings-field"><label htmlFor="link-school">Team school</label><select id="link-school" required value={linkSchool} disabled={disabled} onChange={e=>setLinkSchool(e.target.value)}><option value="">Select a school</option>{schools.filter(s=>!s.deleted).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="settings-field"><label htmlFor="link-team-number">Unused team number</label><input id="link-team-number" type="number" required min={1} max={1000000000} step={1} value={linkNumber} disabled={disabled} onChange={e=>setLinkNumber(e.target.value)}/></div><button className="ui-button" disabled={disabled || !linkSchool}>Link team</button><button type="button" className="ui-button" disabled={disabled} onClick={()=>setLinkTeam('')}>Cancel link</button></form>}
  </section>;
}
