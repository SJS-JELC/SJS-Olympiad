import {useEffect,useRef,useState} from 'react';
import {type EventRecord,type TeamRecord,type SessionState} from '../cloud/api';
import {PracticalTeamResult} from '../practicals/Practical';
import {SchoolImport} from './SchoolImport';
import {TeamBulkActions} from './TeamBulkActions';
import {SchoolColourSettings} from './SchoolColourSettings';
import {useRosterController,RosterOperationStatus,type RosterCommand} from './useRosterController';

type Confirmation={title:string;description:string;run:()=>Promise<void>};
type Props={event:EventRecord;busy:boolean;confirm:(value:Confirmation)=>void;onBusy:(busy:boolean)=>void;onEventSaved:(value:SessionState)=>void};

export function SchoolRoster({event,busy,confirm,onBusy,onEventSaved}:Props){
  const controller=useRosterController(event.id,event.revision,onBusy);
  const {schools,progress,teams,removedTeams}=controller.snapshot;
  const [selectedRemoved,setSelectedRemoved]=useState<string[]>([]),[selectedTeams,setSelectedTeams]=useState<string[]>([]);
  const [schoolId,setSchoolId]=useState(''),[count,setCount]=useState('2'),[newName,setNewName]=useState(''),[rename,setRename]=useState(false),[renameName,setRenameName]=useState('');
  const [linkTeam,setLinkTeam]=useState(''),[linkSchool,setLinkSchool]=useState(''),[linkNumber,setLinkNumber]=useState('1');
  const selectAllRef=useRef<HTMLInputElement>(null);
  const selectable=teams;
  const selectedCount=selectable.filter(team=>selectedTeams.includes(team.id)).length;
  useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=selectedCount>0 && selectedCount<selectable.length;},[selectedCount,selectable.length]);
  useEffect(()=>{setSelectedTeams(ids=>ids.filter(id=>teams.some(team=>team.id===id)));setSelectedRemoved(ids=>ids.filter(id=>removedTeams.some(team=>team.id===id)));},[teams,removedTeams]);
  const ended=event.status==='ended',selected=schools.find(s=>s.id===schoolId && !s.deleted),disabled=busy || controller.working || controller.blocked || !!event.rosterResetInput;
  const hostProgress=progress.find(p=>p.requestId===event.hostSetup?.requestId && p.schoolId===event.hostSetup?.schoolId);
  function selectSchool(id:string){setSchoolId(id);setRename(false);const school=schools.find(s=>s.id===id),current=teams.filter(t=>t.schoolId===id).length;setCount(String(Math.max(current,school?.isHostSchool?4:2)));}
  function command(action:string,body:Record<string,unknown>,label:string,onConfirmed?:RosterCommand['onConfirmed']){
    if(disabled)return;
    controller.start({action,body:{requestId:crypto.randomUUID(),...body},label,onConfirmed:onConfirmed ?? ((value)=>{
      if(value.school){setSchoolId(value.school.id);if(action==='school-create')setCount(String(value.school.isHostSchool?4:2));}
      if(action==='school-create')setNewName('');if(action==='school-rename')setRename(false);if(action==='school-link')setLinkTeam('');
    })});
  }
  function releaseTeam(team:TeamRecord){
    const operation:RosterCommand={action:'team-release',body:{eventId:event.id,teamId:team.id,confirm:true,requestId:crypto.randomUUID(),expectedClaimGeneration:team.claimGeneration},label:'Allow team reselection'};
    confirm({title:'Allow team reselection?',description:`Allow reselection for ${team.name}? The current device will lose access. Saved results and answers will be retained.`,run:async()=>controller.start(operation)});
  }
  function removeTeam(team:TeamRecord){
    const operation:RosterCommand={action:'team-remove',body:{eventId:event.id,teamId:team.id,expectedEntryRevision:team.entryRevision ?? 0,requestId:crypto.randomUUID(),confirm:true},label:'Remove team'};
    if(event.status==='draft'){controller.start(operation);return;}
    confirm({title:'Remove this team from event?',description:`Remove ${team.name} from this event and leaderboard? Saved results will be retained for restoration. Its current device will lose access.`,run:async()=>controller.start(operation)});
  }
  const groups=[...[...new Set(teams.flatMap(t=>t.schoolId?[t.schoolId]:[]))].map(id=>({id,name:schools.find(s=>s.id===id)?.name ?? 'School unavailable',teams:teams.filter(t=>t.schoolId===id).sort((a,b)=>(a.teamNumber ?? 0)-(b.teamNumber ?? 0))})),...(teams.some(t=>!t.schoolId)?[{id:'unlinked',name:'Unlinked teams',teams:teams.filter(t=>!t.schoolId)}]:[])];
  return <section className="settings-teams" aria-labelledby="settings-teams-heading">
    <RosterOperationStatus controller={controller}/>
    <h3 id="settings-teams-heading" className="type-heading">Teams · {event.name}</h3>
    <p className="type-caption">Select an existing school and its target count to create fresh teams for this event, using the school’s colours. Remove teams to reduce the count; restore them below to recover their saved results. Allow reselection disconnects a device without removing its team.</p>
    {event.hostSetup?.status==='pending' && !ended && <div className="settings-setup-progress"><p role="status">Host team setup is incomplete. {hostProgress && `${hostProgress.completed} of ${hostProgress.total} host teams saved. `}Finish setup before activating this event.</p><button className="ui-button" disabled={disabled} onClick={()=>command('event-setup',{eventId:event.id},'Resume host setup',onEventSaved)}>Resume host setup</button></div>}
    {!ended && <SchoolImport eventId={event.id} disabled={disabled} snapshot={controller.snapshot} start={controller.start}/>}
    {!ended && <form className="settings-school-create" onSubmit={e=>{e.preventDefault();command('school-create',{name:newName},'Create school');}}><div className="settings-field"><label htmlFor="new-school-name">New school name</label><input id="new-school-name" value={newName} maxLength={70} required disabled={disabled} onChange={e=>setNewName(e.target.value)}/></div><button className="ui-button" disabled={disabled || !newName.trim()}>Create school</button></form>}
    <div className="settings-school-controls"><div className="settings-field"><label htmlFor="school-select">School</label><select id="school-select" value={schoolId} disabled={disabled} onChange={e=>selectSchool(e.target.value)}><option value="">Select a school</option>{schools.filter(s=>!s.deleted).map(s=><option key={s.id} value={s.id}>{s.name}{s.isHostSchool?' (host)':''}</option>)}</select></div>
    <button className="ui-button" disabled={busy || controller.working || !!controller.operation && controller.operation.outcome!=='rejected'} onClick={()=>void controller.refresh()}>Refresh schools</button>
    {!ended && <form className="settings-school-target" onSubmit={e=>{e.preventDefault();command('school-teams',{eventId:event.id,schoolId,targetCount:Number(count)},'Set team count');}}><div className="settings-field"><label htmlFor="school-team-count">Target team count</label><input id="school-team-count" type="number" min={1} max={50} step={1} required value={count} disabled={disabled || !selected} onChange={e=>setCount(e.target.value)}/></div><button className="ui-button" disabled={disabled || !selected}>Set team count</button></form>}
    <button className="ui-button" disabled={disabled || !selected} onClick={()=>{setRename(!rename);setRenameName(selected?.name ?? '');}}>Rename selected school</button></div>
    {selected && <button type="button" className="ui-button" disabled={disabled || selected.isHostSchool} onClick={()=>{const body={schoolId:selected.id,expectedRevision:selected.revision,requestId:crypto.randomUUID(),confirm:true};confirm({title:'Delete this school?',description:'Remove '+selected.name+' from future school selection? Remove its teams from unfinished events first. Historical results and the school name will be retained.',run:async()=>controller.start({action:'school-delete',body,label:'Delete school',onConfirmed:()=>setSchoolId('')})});}}>Delete selected school</button>}
    {rename && selected && <form className="settings-school-create" onSubmit={e=>{e.preventDefault();command('school-rename',{schoolId:selected.id,name:renameName,expectedRevision:selected.revision},'Rename school');}}><div className="settings-field"><label htmlFor="rename-school-name">School name</label><input id="rename-school-name" required maxLength={70} value={renameName} disabled={disabled} onChange={e=>setRenameName(e.target.value)}/></div><p className="type-caption">Renaming updates linked team names in every event, including completed results and claimed teams.</p><button className="ui-button" disabled={disabled}>Save school name</button></form>}
    {selected && <SchoolColourSettings key={selected.id} school={selected} disabled={disabled} start={controller.start}/>}
    {progress.filter(p=>!(event.hostSetup?.status==='pending' && p.schoolId===event.hostSetup.schoolId)).map(p=><div key={p.requestId} className="settings-setup-progress"><p role="status">{schools.find(s=>s.id===p.schoolId)?.name}: {p.completed} of {p.total} {p.kind==='link'?'team links':p.kind==='restore'?'team restorations':'new teams'} saved. Setup is incomplete.</p>{!ended && <button className="ui-button" disabled={disabled} onClick={()=>command('school-resume',{eventId:event.id,schoolId:p.schoolId,requestId:p.requestId},'Resume team setup')}>Resume team setup</button>}</div>)}
    {!ended && <TeamBulkActions event={event} teams={teams} selected={selectedTeams} disabled={disabled} start={controller.start} confirm={confirm} onDone={done=>setSelectedTeams(ids=>ids.filter(id=>!done.includes(id)))}/>}
    <table><caption className="sr-only">Event teams and results</caption><thead><tr>{!ended && <th scope="col"><input ref={selectAllRef} type="checkbox" aria-label="Select all teams" checked={!!selectable.length && selectedCount===selectable.length} disabled={disabled || !selectable.length} onChange={e=>setSelectedTeams(e.target.checked?selectable.map(team=>team.id):[])}/></th>}<th scope="col">School</th><th scope="col">Team</th><th scope="col">Practical answer</th><th scope="col">Theory score</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{groups.flatMap(group=>group.teams.map(team=><tr key={team.id}>{!ended && <td><input type="checkbox" aria-label={'Select team '+team.name} checked={selectedTeams.includes(team.id)} disabled={disabled} onChange={e=>setSelectedTeams(ids=>e.target.checked?[...ids,team.id]:ids.filter(id=>id!==team.id))}/></td>}<td>{team.schoolId?group.name:'–'}</td><td>{team.schoolId?team.teamNumber:team.name}</td><td><PracticalTeamResult result={team.practical}/></td><td>{team.score ?? 0}</td><td>{team.claimed?'Taken':'Available'}</td><td><div className="settings-team-actions">
      {!team.schoolId && !ended && <button className="ui-button" disabled={disabled} aria-label={'Link school for '+team.name} onClick={()=>{setLinkTeam(team.id);setLinkSchool(schoolId);setLinkNumber('1');}}>Link school</button>}
      <button className="ui-button" disabled={disabled || ended || !team.claimed} aria-label={'Allow reselection for '+team.name} onClick={()=>releaseTeam(team)}>Allow reselection</button>
      <button className="ui-button" disabled={disabled || ended} aria-label={'Remove team '+team.name} onClick={()=>removeTeam(team)}>Remove from event</button>
    </div></td></tr>))}</tbody></table>
    {!!removedTeams.length && <details className="settings-setup-progress"><summary>Removed teams ({removedTeams.length})</summary><p className="type-caption">These teams retain their results in this event. Restore a deleted school before restoring its teams.</p>
      {!ended && <><label><input type="checkbox" aria-label="Select all removed teams" disabled={disabled} checked={removedTeams.every(team=>selectedRemoved.includes(team.id))} onChange={e=>setSelectedRemoved(e.target.checked?removedTeams.map(team=>team.id):[])}/> Select all removed teams</label><TeamBulkActions restoreOnly event={event} teams={removedTeams} selected={selectedRemoved} disabled={disabled} start={controller.start} confirm={confirm} onDone={done=>setSelectedRemoved(ids=>ids.filter(id=>!done.includes(id)))}/></>}
      <ul>{removedTeams.map(team=><li key={team.id}>{!ended && <input type="checkbox" aria-label={'Select removed team '+team.name} disabled={disabled} checked={selectedRemoved.includes(team.id)} onChange={e=>setSelectedRemoved(ids=>e.target.checked?[...ids,team.id]:ids.filter(id=>id!==team.id))}/>} {team.name} · {team.score ?? 0} points</li>)}</ul>
    </details>}
    {linkTeam && !ended && <form className="settings-school-link" onSubmit={e=>{e.preventDefault();command('school-link',{eventId:event.id,schoolId:linkSchool,teamId:linkTeam,teamNumber:Number(linkNumber)},'Link team');}}><h4 className="type-label">Link {teams.find(t=>t.id===linkTeam)?.name}</h4><div className="settings-field"><label htmlFor="link-school">Team school</label><select id="link-school" required value={linkSchool} disabled={disabled} onChange={e=>setLinkSchool(e.target.value)}><option value="">Select a school</option>{schools.filter(s=>!s.deleted).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="settings-field"><label htmlFor="link-team-number">Unused team number</label><input id="link-team-number" type="number" required min={1} max={1000000000} step={1} value={linkNumber} disabled={disabled} onChange={e=>setLinkNumber(e.target.value)}/></div><button className="ui-button" disabled={disabled || !linkSchool}>Link team</button><button type="button" className="ui-button" disabled={disabled} onClick={()=>setLinkTeam('')}>Cancel link</button></form>}
  </section>;
}
