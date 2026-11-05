import { createHash, randomUUID } from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest('hex');
export const schoolNameKey=value=>value.normalize('NFKC').trim().replace(/\s+/gu,' ').replace(/[’‘]/gu,"'").toLocaleLowerCase('en-GB');
const HOST_ID='host-st-johns';
const schoolView=({id,name,isHostSchool,revision})=>({id,name,isHostSchool,revision});
const directoryKey={partitionKey:'system',rowKey:'schools'};
const journalKey=(eventId,schoolId)=>({partitionKey:'system',rowKey:'school-roster-'+eventId+'-'+schoolId});
const operationKey=(eventId,schoolId,requestId)=>({partitionKey:'system',rowKey:'school-operation-'+digest(JSON.stringify([eventId,schoolId,requestId]))});
const legacyNameKey=(eventId,teamId)=>({partitionKey:'system',rowKey:'legacy-team-name-'+digest(JSON.stringify([eventId,teamId]))});

/** Shared names and durable allocation plans. No score, claim or security authority lives here. */
export function schoolDirectory({repo,retry,assert,validId,settings,eventById,lifecycleFence}) {
  const write=entity=>repo.write(entity,entity.etag);
  // A roster fence changes only the revision. Never persist normalized legacy
  // timing fields merely because a roster operation read the event catalogue.
  const settingsGuard=async observed=>{const raw=await repo.get('system','settings');return {entity:{...raw,revision:raw.revision+1},etag:observed.etag};};
  const requestId=value=>assert(validId(value) && value.length>=8,400,'A request identifier is required.');
  const schoolName=value=>{assert(typeof value==='string' && value.trim().length>0 && value.trim().length<=70,400,'Enter a school name of at most 70 characters.');return value.trim().replace(/\s+/gu,' ');};
  const directory=()=>retry(async()=>{
    const old=await repo.get('system','schools');if(old)return old;
    await repo.write({...directoryKey,kind:'school-directory',revision:1,schools:[{id:HOST_ID,name:"St John's",isHostSchool:true,revision:1}]});
    return repo.get('system','schools');
  });
  const getSchool=(dir,id)=>{const school=dir.schools.find(s=>s.id===id);assert(school,404,'School not found.');return school;};
  const editable=async eventId=>{const event=eventById(await settings(),eventId);assert(event.status!=='ended',409,'Completed event rosters are read-only.');assert(!event.rosterResetRequestId,409,'Finish the pending year reset before changing this roster.');return event;};
  const display=(team,dir)=>team.schoolId?getSchool(dir,team.schoolId).name+' '+team.teamNumber:team.name;
  const collision=(dir,schoolId,number,ignoreId,teams,legacyNames)=>{
    const displayName=getSchool(dir,schoolId).name+' '+number;
    assert(Number.isSafeInteger(number) && displayName.length<=80,400,'The school name and team number must fit within 80 characters.');
    const candidate=schoolNameKey(displayName);
    assert(!teams.some(team=>team.teamId!==ignoreId && schoolNameKey(display(team,dir))===candidate),409,'A team already uses that display name. Rename the school or link the existing team.');
    assert(!legacyNames.some(row=>row.teamId!==ignoreId && schoolNameKey(row.name)===candidate),409,'An unlinked team name is already reserved. Link that team or choose another school name.');
  };
  const journal=async(eventId,schoolId)=>await repo.get('system',journalKey(eventId,schoolId).rowKey) || {...journalKey(eventId,schoolId),kind:'school-roster',eventId,schoolId,nextNumber:1,allocations:{},pendingRequestId:null};
  const operation=async(eventId,schoolId,requestId)=>repo.get('system',operationKey(eventId,schoolId,requestId).rowKey);
  const finish=async(op,failed=false)=>retry(async()=>{
    const row=await journal(op.eventId,op.schoolId),current=await operation(op.eventId,op.schoolId,op.requestId);
    if(current.complete)return;
    if(row.pendingRequestId===op.requestId)row.pendingRequestId=null;
    const legacy=op.operation==='link' && !failed?await repo.get('system',legacyNameKey(op.eventId,op.items[0].id).rowKey):null;
    await repo.batch([{entity:row,etag:row.etag},{entity:{...current,complete:true,failed},etag:current.etag},...(legacy?[{entity:legacy,etag:legacy.etag,remove:true}]:[])]);
  });
  const summary=async op=>{
    const complete=[];
    for(const item of op.items){const fence=await repo.get(op.eventId+'-'+item.id,'deleted-team');const team=await repo.get(op.eventId+'-'+item.id,'team');if(fence?.schoolRequestId===op.requestId || team?.schoolLinkRequestId===op.requestId)complete.push(item.id);}
    return {requestId:op.requestId,schoolId:op.schoolId,eventId:op.eventId,targetCount:op.targetCount,kind:op.operation,total:op.items.length,completed:complete.length,status:op.complete?'complete':'pending'};
  };
  const reserve=async(input,kind)=>retry(async()=>{
    const currentSettings=await settings(),event=eventById(currentSettings,input.eventId);assert(event.status!=='ended',409,'Completed event rosters are read-only.');assert(!event.rosterResetRequestId,409,'Finish the pending year reset before changing this roster.');requestId(input.requestId);
    const dir=await directory();getSchool(dir,input.schoolId);
    const row=await journal(input.eventId,input.schoolId),fingerprint=digest(JSON.stringify([kind,input.eventId,input.schoolId,input.targetCount ?? null,input.teamId ?? null,input.teamNumber ?? null]));
    const previous=await operation(input.eventId,input.schoolId,input.requestId);
    if(previous){assert(previous.fingerprint===fingerprint,409,'This request identifier was used for different roster changes.');assert(!previous.failed,409,'This team changed before linking. Choose an unlinked team and a new request.');return previous;}
    assert(!row.pendingRequestId,409,'Resume this school’s unfinished team setup before making another roster change.');
    const teams=await repo.list({kind:'team',eventId:input.eventId}),legacyNames=await repo.list({kind:'legacy-team-name',eventId:input.eventId});
    // Include historical allocations even when their team was permanently deleted.
    for(const team of teams.filter(t=>t.schoolId===input.schoolId))row.allocations[team.teamNumber] ??= team.teamId;
    for(const number of Object.keys(row.allocations))row.nextNumber=Math.max(row.nextNumber,Number(number)+1);
    let items;
    if(kind==='link'){
      assert(validId(input.teamId) && Number.isSafeInteger(input.teamNumber) && input.teamNumber>=1 && input.teamNumber<=1000000000,400,'Choose an unused positive team number.');
      const team=teams.find(t=>t.teamId===input.teamId && !t.removed);assert(team && !team.schoolId,409,'Choose an existing unlinked team.');
      assert(teams.filter(t=>!t.removed && t.schoolId===input.schoolId).length<50,409,'A school can have at most 50 current teams.');
      assert(!row.allocations[input.teamNumber],409,'That team number has already been allocated in this event.');
      collision(dir,input.schoolId,input.teamNumber,team.teamId,teams,legacyNames);
      items=[{id:team.teamId,number:input.teamNumber}];
    }else{
      assert(Number.isInteger(input.targetCount) && input.targetCount>=1 && input.targetCount<=50,400,'Choose a target count from 1 to 50.');
      const count=teams.filter(t=>!t.removed && t.schoolId===input.schoolId).length;
      assert(input.targetCount>=count,409,'Use the existing Delete actions to reduce a school’s team count.');
      items=Array.from({length:input.targetCount-count},(_,i)=>({id:randomUUID(),number:row.nextNumber+i}));
      for(const item of items)collision(dir,input.schoolId,item.number,undefined,teams,legacyNames);
    }
    for(const item of items){row.allocations[item.number]=item.id;row.nextNumber=Math.max(row.nextNumber,item.number+1);}
    const op={...operationKey(input.eventId,input.schoolId,input.requestId),kind:'school-operation',operation:kind,requestId:input.requestId,fingerprint,eventId:input.eventId,schoolId:input.schoolId,targetCount:input.targetCount ?? null,items,complete:items.length===0};
    row.pendingRequestId=items.length?input.requestId:null;
    // The directory ETag fences concurrent rename against name validation/reservation.
    await repo.batch([await settingsGuard(currentSettings),{entity:{...dir,revision:dir.revision+1},etag:dir.etag},{entity:row,etag:row.etag},{entity:op}]);
    return op;
  });
  const materialize=async op=>{
    if(op.complete)return summary(op);
    for(const item of op.items)await retry(async()=>{
      const event=await editable(op.eventId),pk=op.eventId+'-'+item.id;
      const team=await repo.get(pk,'team'),fence=await repo.get(pk,'deleted-team');
      if(op.operation==='link'){
        if(team?.schoolLinkRequestId===op.requestId)return;
        if(!team || team.removed || team.schoolId){await finish(op,true);assert(false,409,'The team changed before linking. Its reserved number will not be reused.');}
        const {name,...retained}=team;
        await write({...retained,schoolId:op.schoolId,teamNumber:item.number,schoolLinkRequestId:op.requestId});
      }else{
        // A deleted generated team must never be resurrected by a lost-response retry.
        if(fence?.schoolRequestId===op.requestId)return;
        assert(!team && !fence,409,'The allocated team already exists.');
        const fresh={partitionKey:pk,rowKey:'team',kind:'team',schemaVersion:2,eventId:event.id,teamId:item.id,schoolId:op.schoolId,teamNumber:item.number,year:event.year,score:0,lastScoringAt:null,hasSubmittedActivity:false,claimGeneration:0,securityEpoch:0,securityStatus:'NOT_STARTED',owner:null,legacySessionHash:null,recovery:null};
        await repo.batch([{entity:lifecycleFence(pk,null,{claimGeneration:0,schoolRequestId:op.requestId})},{entity:fresh}]);
      }
    });
    await finish(op);
    return summary({...op,complete:true});
  };
  return {
    directory,display,hostId:HOST_ID,
    async reserveLegacyName(eventId,teamId,value,generation){return retry(async()=>{
      const s=await settings(),event=eventById(s,eventId);assert(event.status!=='ended' && !event.rosterResetRequestId,409,'This event is not accepting roster changes.');
      const dir=await directory(),key=schoolNameKey(value),old=await repo.get('system',legacyNameKey(eventId,teamId).rowKey);
      assert(!await repo.get(eventId+'-'+teamId,'team') && (!old || old.generation<=generation),409,'That team name already exists in this event.');
      const names=await repo.list({kind:'legacy-team-name',eventId});assert(!names.some(row=>row.teamId!==teamId && schoolNameKey(row.name)===key),409,'That team name already exists in this event.');
      const rosters=await repo.list({kind:'school-roster',eventId});assert(!rosters.some(row=>Object.keys(row.allocations).some(number=>schoolNameKey(getSchool(dir,row.schoolId).name+' '+number)===key)),409,'That team name already exists in this event.');
      await repo.batch([await settingsGuard(s),{entity:{...dir,revision:dir.revision+1},etag:dir.etag},{entity:{...legacyNameKey(eventId,teamId),kind:'legacy-team-name',eventId,teamId,name:value,generation},etag:old?.etag}]);
    });},
    async releaseLegacyName(eventId,teamId,generation){return retry(async()=>{const old=await repo.get('system',legacyNameKey(eventId,teamId).rowKey);if(old && old.generation===generation)await repo.batch([{entity:old,etag:old.etag,remove:true}]);});},
    async list(eventId){const dir=await directory();const progress=[];if(eventId)for(const op of await repo.list({kind:'school-operation',eventId}))if(!op.complete)progress.push(await summary(op));return {schools:dir.schools.map(schoolView),progress};},
    async create(input){requestId(input.requestId);const value=schoolName(input.name);return retry(async()=>{const dir=await directory(),old=dir.schools.find(s=>s.createRequestId===input.requestId);if(old){assert(old.createName===value,409,'This school request was already used.');return {school:schoolView(old)};}assert(!dir.schools.some(s=>schoolNameKey(s.name)===schoolNameKey(value)),409,'That school already exists.');const school={id:randomUUID(),name:value,isHostSchool:false,revision:1,createRequestId:input.requestId,createName:value};dir.schools.push(school);dir.revision++;await write(dir);return {school:schoolView(school)};});},
    async rename(input){requestId(input.requestId);const value=schoolName(input.name),fingerprint=digest(JSON.stringify([input.schoolId,value,input.expectedRevision]));return retry(async()=>{const dir=await directory(),school=getSchool(dir,input.schoolId),receiptKey='school-rename-'+digest(input.requestId),receipt=await repo.get('system',receiptKey);if(receipt){assert(receipt.fingerprint===fingerprint,409,'This school rename request was already used.');return {school:schoolView(school)};}assert(Number.isInteger(input.expectedRevision) && input.expectedRevision===school.revision,409,'This school changed. Refresh before renaming it.');assert(!dir.schools.some(s=>s.id!==school.id && schoolNameKey(s.name)===schoolNameKey(value)),409,'That school already exists.');school.name=value;school.revision++;dir.revision++;const teams=[...await repo.list({kind:'team'}),...(await repo.list({kind:'legacy-team-name'})).map(row=>({...row,teamId:'reservation-'+row.teamId}))],rosters=await repo.list({kind:'school-roster'});for(const row of rosters.filter(r=>r.schoolId===school.id))for(const [number,id] of Object.entries(row.allocations)){assert((school.name+' '+number).length<=80,400,'The school name and team number must fit within 80 characters.');assert(!teams.some(t=>t.eventId===row.eventId && t.teamId!==id && schoolNameKey(display(t,dir))===schoolNameKey(school.name+' '+number)),409,'That school name conflicts with an existing team name.');}await repo.batch([{entity:dir,etag:dir.etag},{entity:{partitionKey:'system',rowKey:receiptKey,kind:'school-rename-receipt',fingerprint}}]);return {school:schoolView(school)};});},
    async nameReserved(eventId,value){const dir=await directory(),key=schoolNameKey(value);return (await repo.list({kind:'school-roster',eventId})).some(row=>Object.keys(row.allocations).some(number=>schoolNameKey(getSchool(dir,row.schoolId).name+' '+number)===key));},
    async ensure(input){return materialize(await reserve(input,'generate'));},
    async link(input){return materialize(await reserve(input,'link'));},
    async resume(input){requestId(input.requestId);const op=await operation(input.eventId,input.schoolId,input.requestId);assert(op,404,'Team setup request not found.');assert(!op.failed,409,'This team changed before linking. Choose an unlinked team and a new request.');return materialize(op);},
    async pending(eventId){return (await repo.list({kind:'school-operation',eventId})).some(op=>!op.complete);},
    async copyAllocations(oldEventId,newEventId){for(const old of await repo.list({kind:'school-roster',eventId:oldEventId})){const key=journalKey(newEventId,old.schoolId);if(!await repo.get(key.partitionKey,key.rowKey))await repo.write({...key,kind:'school-roster',eventId:newEventId,schoolId:old.schoolId,nextNumber:old.nextNumber,allocations:old.allocations,pendingRequestId:null});}},
  };
}
