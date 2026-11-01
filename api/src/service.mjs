import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { attachPractice } from './practice.mjs';
import { questionInfo, reduceQuestion, validateAnswers, questionData } from './questions.mjs';
import { eventTiming, eventAvailable, theoryAvailable, updateTiming } from './event-timing.mjs';
import { practicalFields, emptyPractical, practicalChanges } from './practical.mjs';
export class ApiError extends Error { constructor(status,message) { super(message); this.status=status; } }
const hash = value => createHash('sha256').update(value).digest('hex');
const conflict = error => [409,412].includes(error.statusCode);
const empty = () => ({answers:{},feedback:{},retryAt:0,solvedAt:null});
const YEARS = new Set(['L5','U5','L6','U6']);
const SESSION_MS = 8*60*60*1000;
const SETTINGS = {partitionKey:'system',rowKey:'settings'};
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const canonical = value => {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value === 'object') return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
};
function password(value) {
  const salt=randomBytes(16).toString('hex');
  return salt+':'+scryptSync(value,salt,32,{N:16384,r:8,p:1}).toString('hex');
}
function verify(value,stored) {
  if(typeof value !== 'string' || value.length > 128 || !stored) return false;
  const [salt,key]=stored.split(':');
  const actual=scryptSync(value,salt,32,{N:16384,r:8,p:1});
  return /^[a-f0-9]{64}$/.test(key || '') && timingSafeEqual(actual,Buffer.from(key,'hex'));
}
const assert = (condition,status,message) => { if(!condition) throw new ApiError(status,message); };
function name(value) { assert(typeof value==='string' && value.trim().length>0 && value.trim().length<=80,400,'Enter a name of at most 80 characters.'); return value.trim(); }
function timings(event,input,create=false) { try { return updateTiming(event,input,create); } catch(error) { throw new ApiError(400,error.message); } }
const epoch = input => input.expectedEpoch ?? input.epoch;
const confirmed = input => input.confirm === true || input.confirmed === true;
function expectedRevision(expected,current) {
  assert(Number.isInteger(expected) && expected>=1,400,'Refresh settings before saving this change.');
  assert(expected===current,409,'These settings changed. Refresh settings before saving again.');
}
function answers(id,value) {
  try { const compact=validateAnswers(id,value);assert(Buffer.byteLength(JSON.stringify(compact))<=24000,400,'Answer state is too large.');return compact; } catch { throw new ApiError(400,'Invalid or oversized answer state.'); }
}
function semantic(value,depth=0) {
  assert(depth<=12,400,'Draft state is too deeply nested.');
  if (value===null || typeof value==='boolean' || typeof value==='string' && value.length<=24000 || typeof value==='number' && Number.isFinite(value)) return value;
  if(Array.isArray(value)) { assert(value.length<=300,400,'Draft state is too large.'); return value.map(item=>semantic(item,depth+1)); }
  assert(value && typeof value==='object' && Object.keys(value).length<=48,400,'Invalid draft state.');
  const result={};
  for(const [key,item] of Object.entries(value)) { assert(!['__proto__','prototype','constructor','history','undo','redo'].includes(key),400,'Only compact semantic state is accepted.'); result[key]=semantic(item,depth+1); }
  return result;
}
export function createService(repo,config={},now=Date.now) {
  let bootPromise;
  const partition=(eventId,teamId)=>eventId+'-'+teamId;
  const retry=async operation=>{ for(let n=0;n<8;n++) { try{return await operation();} catch(error){if(!conflict(error))throw error;} } throw new ApiError(409,'The event changed while saving. Retry the same request.'); };
  const write=entity=>repo.write(entity,entity.etag);
  const batch=operations=>repo.batch(operations.map(entity=>({entity,etag:entity.etag})));
  const lifecycleFence=(pk,old,values={})=>({...old,partitionKey:pk,rowKey:'deleted-team',kind:'team-fence',complete:true,revision:(old?.revision ?? 0)+1,...values});
  const bootstrap=async()=>{
    if(!bootPromise) bootPromise=(async()=>{
      let settings=await repo.get('system','settings');
      if(!settings) {
        const events=[];
        if(validId(config.eventId) && Number.isFinite(config.endsAt)) events.push({id:config.eventId,name:'Legacy L6 event',year:'L6',endsAt:config.endsAt,status:'active',revision:1});
        const initial={...SETTINGS,kind:'settings',revision:1,competitorHash:password(config.competitorCode || '1234'),teacherHash:password(config.teacherCode || '5678'),events};
        try{await repo.write(initial);}catch(error){if(!conflict(error))throw error;}
        settings=await repo.get('system','settings');
      }
      if(validId(config.eventId) && settings.events.some(event=>event.id===config.eventId)) {
        for(let i=1;i<=3;i++) await retry(async()=>{
          const teamId='test-'+i, pk=partition(config.eventId,teamId);
          const fence=await repo.get(pk,'deleted-team');
          if(fence && fence.kind!=='team-fence')return;
          const old=await repo.get(pk,'team');
          const {sessionHash:oldSessionHash,expires:oldExpires,...retained}=old || {};
          if(old?.schemaVersion===2) {
            // Retire only the old authentication surface on partial/rerun
            // migrations. Keep released ownership, generations and outcomes
            // exactly as stored; never resurrect a released legacy cookie.
            if(Object.hasOwn(old,'sessionHash') || Object.hasOwn(old,'expires'))await batch([lifecycleFence(pk,fence),{...retained,legacySessionHash:Object.hasOwn(old,'legacySessionHash')?old.legacySessionHash:oldSessionHash || null,legacyExpires:Object.hasOwn(old,'legacyExpires')?old.legacyExpires:oldExpires || 0}]);
            return;
          }
          // The same conditional transaction imports the question and removes
          // legacy auth fields. An old in-flight commit loses its ETag; its next
          // authentication cannot use the retired cookie to overwrite a score.
          const team={...retained,partitionKey:pk,rowKey:'team',kind:'team',schemaVersion:2,eventId:config.eventId,teamId,name:old?.name || 'Test team '+i,year:'L6',score:old?.score || 0,lastScoringAt:old?.solvedAt || null,claimGeneration:0,securityEpoch:0,securityStatus:oldSessionHash ? 'LOCKED':'NOT_STARTED',owner:null,legacySessionHash:oldSessionHash || null,legacyExpires:oldExpires || 0,recovery:null};
          // Guard even an absent fence transactionally. A deletion between the
          // reads and this import changes/creates this exact row and wins its CAS.
          const operations=[lifecycleFence(pk,fence),team];
          if(!await repo.get(pk,'q-L6P8')) operations.push({partitionKey:pk,rowKey:'q-L6P8',kind:'question',questionId:'L6P8',revision:0,state:{...empty(),retryAt:old?.retryAt || 0,solvedAt:old?.solvedAt || null,feedback:old?.solvedAt ? {answer:true}:{}},privateState:{}});
          await batch(operations);
        });
      }
    })().catch(error=>{bootPromise=undefined;throw error;});
    await bootPromise;
  };
  const settings=async()=>{await bootstrap();const value=await repo.get('system','settings');return {...value,events:value.events.map(eventTiming)};};
  const getActive=s=>s.events.find(event=>event.status==='active') || null;
  const eventById=(s,id)=>{const event=s.events.find(item=>item.id===id);assert(event,404,'Event not found.');return event;};
  const teamById=(eventId,id)=>repo.get(partition(eventId,id),'team');
  const submittedActivity=async team=>{
    if(team.hasSubmittedActivity===true || team.score>0 || team.lastScoringAt)return true;
    if(team.hasSubmittedActivity===false)return false;
    // Compatibility with records written before the atomic activity flag.
    const rows=await repo.list({partitionKey:team.partitionKey});
    return rows.some(row=>row.rowKey.startsWith('attempt-') || row.kind==='receipt' && (row.operation==='submit' || row.operation==='action' && row.actionType!=='tick') || row.kind==='question' && (row.state?.solvedAt!=null || row.state?.retryAt>0 || Object.keys(row.state?.feedback ?? {}).length>0 || row.state?.interaction?.kind==='timed' && !!row.state.interaction.deadline || row.privateState?.run?.length>0 || row.state?.interaction?.kind==='gc' && (row.state.interaction.activeRun || row.state.interaction.results?.length || row.state.interaction.analyses?.length)));
  };
  const finishDeletion=async(pk,receiptKey)=>{
    // Every cleanup chunk is fenced by the same marker ETag. Completing the
    // marker and removing the team are atomic, so a delayed cleanup cannot wipe
    // a recreated same-name team, even after a lost response or concurrent retry.
    let complete=false;
    while(!complete)complete=await retry(async()=>{
      const marker=await repo.get(pk,'deleted-team'),receipt=await repo.get(pk,receiptKey);
      assert(marker && receipt,409,'Team deletion changed.');
      if(receipt.complete)return true;
      assert(marker.receiptKey===receiptKey && !marker.complete,409,'Team deletion changed.');
      const rows=(await repo.list({partitionKey:pk})).filter(row=>row.rowKey!=='team' && !['team-deletion','admin-receipt'].includes(row.kind)).slice(0,99);
      if(rows.length) {
        await repo.batch([{entity:{...marker,cleanupRevision:(marker.cleanupRevision ?? 0)+1},etag:marker.etag},...rows.map(entity=>({entity,etag:entity.etag,remove:true}))]);
        return false;
      }
      const team=await repo.get(pk,'team');
      assert(team?.removed && team.deletionReceipt===receiptKey,409,'Team deletion changed.');
      await repo.batch([{entity:{...marker,complete:true},etag:marker.etag},{entity:{...receipt,complete:true},etag:receipt.etag},{entity:team,etag:team.etag,remove:true}]);
      return true;
    });
  };
  const publicTeam=team=>team ? {id:team.teamId,name:team.name,eventId:team.eventId,year:team.year,claimGeneration:team.claimGeneration}:null;
  const authenticate=async token=>{
    await bootstrap();
    assert(typeof token==='string' && /^[a-f0-9]{64}$/.test(token),401,'Sign in to continue.');
    const session=await repo.get('sessions',hash(token));
    assert(session && !session.revoked && now()<session.expiresAt,401,'Your session has expired. Sign in again.');
    return session;
  };
  const ownedTeam=async session=>{
    assert(session.role==='competitor' && session.teamId && session.eventId,403,'Choose a team first.');
    const team=await teamById(session.eventId,session.teamId);
    assert(team && !team.removed && team.owner===session.rowKey && team.claimGeneration===session.claimGeneration,401,'This team claim has been released. Sign in again.');
    assert((await settings()).events.some(event=>event.id===session.eventId),401,'This event was reset. Sign in again.');
    return team;
  };
  const teacher=session=>assert(session.role==='teacher',403,'Teacher access is required.');
  const snapshot=async(session,s,team,hydrate=false)=>{
    if(team===undefined && session.role==='competitor' && session.teamId) team=await ownedTeam(session);
    const attempts={};
    // Locked/not-started sessions expose no question answers or interaction.
    const event=team?s.events.find(item=>item.id===team.eventId):null;
    const rows=team?.securityStatus==='ACTIVE' && event && (hydrate || theoryAvailable(event,now())) ? await repo.list({partitionKey:team.partitionKey,kind:'question'}) : [];
    if(event && theoryAvailable(event,now())) for(const q of rows) attempts[q.questionId]={...q.state,revision:q.revision};
    const accessible=event && eventAvailable(event,now());
    return {role:session.role,expiresAt:session.expiresAt,serverNow:now(),configRevision:s.revision,activeEvent:getActive(s),...(session.role==='teacher'?{events:s.events}:!getActive(s)?{draftEvents:s.events.filter(event=>event.status==='draft').map(({id,name,year})=>({id,name,year}))}:{}),team:publicTeam(team),competition:{status:accessible?team.securityStatus:'NOT_STARTED',epoch:team?.securityEpoch || 0},score:team?.score || 0,attempts,...(hydrate && accessible && team.securityStatus==='ACTIVE'?{hydration:bulkView({event,team,pk:team.partitionKey},rows)}:{})};
  };
  const changeSettings=async(token,update)=>{
    const session=await authenticate(token);teacher(session);
    return retry(async()=>{const s=await settings();await update(s);s.revision++;await write(s);return snapshot(session,s,null);});
  };
  const activeForWrite=event=>assert(eventAvailable(event,now()),403,'This event is not accepting answers.');
  const theoryForWrite=event=>assert(theoryAvailable(event,now()),403,'The theory challenge is outside its scheduled times.');
  const questionContext=async(token,input,hydrating=false)=>{
    const session=await authenticate(token), s=await settings();
    if(session.role==='teacher') {
      const catalogueYear=typeof input.eventId==='string' && input.eventId.startsWith('catalogue-')?input.eventId.slice(10):null;
      const event=catalogueYear && YEARS.has(catalogueYear)?{id:input.eventId,name:catalogueYear+' question preview',year:catalogueYear,status:'draft',theoryStartsAt:null,theoryEndsAt:session.expiresAt,endsAt:session.expiresAt,revision:1}:input.eventId?eventById(s,input.eventId):getActive(s); assert(event,409,'Choose an event first.');
      return {session,s,event,team:null,pk:'preview-'+session.rowKey+'-'+event.id};
    }
    const team=await ownedTeam(session),event=eventById(s,team.eventId);
    assert(!input.eventId || input.eventId===event.id,403,'Your team belongs to a different event.');
    assert(team.securityStatus==='ACTIVE',423,'Competition mode is locked or has not started.');
    activeForWrite(event);
    assert(team.year===event.year,403,'Your team belongs to a different year.');
    if(!hydrating)theoryForWrite(event);
    return {session,s,event,team,pk:team.partitionKey};
  };
  const qView=(q,ctx,team=ctx.team)=>({attempt:q.state,revision:q.revision,score:team?.score || 0,serverNow:now(),eventEndsAt:ctx.event.theoryEndsAt,...(q.data===undefined?{}:{data:q.data})});
  // Practical has its own window and persistence, independent of theory marking.
  const practicalContext=async(token,input,write=false)=>{
    const session=await authenticate(token),s=await settings();
    if(session.role==='teacher') {
      const year=typeof input.eventId==='string' && input.eventId.startsWith('catalogue-')?input.eventId.slice(10):null;
      const event=year && practicalFields(year)?{id:input.eventId,year,practicalEndsAt:session.expiresAt}:input.eventId?eventById(s,input.eventId):getActive(s);
      assert(event && practicalFields(event.year),404,'This practical is unavailable for this event.');
      return {session,event,team:null,pk:'preview-'+session.rowKey+'-'+event.id};
    }
    const team=await ownedTeam(session),event=eventById(s,team.eventId);
    assert(!input.eventId || input.eventId===event.id,403,'Your team belongs to a different event.');
    assert(practicalFields(event.year) && event.practicalStartsAt!==null && event.practicalEndsAt!==null,404,'This practical is unavailable for this event.');
    assert(team.year===event.year,403,'Your team belongs to a different year.');
    assert(team.securityStatus==='ACTIVE',423,'Competition mode is locked or has not started.');
    activeForWrite(event);
    assert(now()>=event.practicalStartsAt && (!write || now()<event.practicalEndsAt),403,'The practical challenge is outside its scheduled times.');
    return {session,event,team,pk:team.partitionKey};
  };
  const practicalView=(value,ctx)=>({...value,serverNow:now(),eventEndsAt:ctx.event.practicalEndsAt ?? null,readOnly:!!ctx.team && now()>=ctx.event.practicalEndsAt});
  const loadPractical=async ctx=>await repo.get(ctx.pk,'practical') || {partitionKey:ctx.pk,rowKey:'practical',kind:'practical',...emptyPractical(ctx.event.year)};
  const practicalSummary=value=>({year:value.year,revision:value.revision,responses:value.responses,finalField:value.finalField,updatedAt:value.updatedAt});
  const savePractical=async(token,input)=>{
    assert(validId(input.requestId) && input.requestId.length>=8,400,'A request identifier is required.');
    assert(Number.isInteger(input.expectedRevision) && input.expectedRevision>=0,400,'Invalid practical revision.');
    const accepted=await practicalContext(token,input,true),acceptedAt=now();
    let changes;
    try{changes=practicalChanges(accepted.event.year,input.changes);}catch(error){throw new ApiError(400,error.message);}
    const fingerprint=hash(canonical({operation:'practical-save',expectedRevision:input.expectedRevision,changes}));
    return retry(async()=>{
      const ctx={...accepted,session:await authenticate(token)};
      if(ctx.team) {
        ctx.team=await ownedTeam(ctx.session);
        assert(ctx.team.securityStatus==='ACTIVE' && ctx.team.securityEpoch===accepted.team.securityEpoch,423,'Competition mode changed.');
        // Retain the accepted schedule snapshot, but never retry beyond its end.
        activeForWrite(ctx.event);
        assert(now()<ctx.event.practicalEndsAt,403,'The practical challenge is outside its scheduled times.');
      }
      const receipt=await repo.get(ctx.pk,'receipt-'+input.requestId);
      if(receipt) {assert(receipt.fingerprint===fingerprint,409,'This request identifier was used for different content.');return practicalView(receipt.response,ctx);}
      // Old theory receipts share this namespace, including the legacy receipt.
      assert(!ctx.team || !await repo.get(ctx.pk,'attempt-'+input.requestId),409,'This request identifier was used for different content.');
      const old=await loadPractical(ctx);
      assert(old.revision===input.expectedRevision,409,'This practical changed. Refresh before saving again.');
      const updated={...old,revision:old.revision+1,responses:{...old.responses,...changes},updatedAt:acceptedAt};
      const summary=practicalSummary(updated),team=ctx.team?{...ctx.team,practical:summary}:null;
      if(team && Object.values(changes).some(value=>value!==null))team.hasSubmittedActivity=true;
      await batch([...(team?[team]:[]),updated,{partitionKey:ctx.pk,rowKey:'receipt-'+input.requestId,kind:'receipt',operation:'practical-save',fingerprint,response:summary,createdAt:acceptedAt}]);
      return practicalView(summary,ctx);
    });
  };
  const validateQuestion=(id,event)=>{const info=questionInfo(id);assert(info && info.year===event.year,404,'This question is unavailable for this event.');return info;};
  const loadQuestion=async(ctx,id)=>await repo.get(ctx.pk,'q-'+id) || {partitionKey:ctx.pk,rowKey:'q-'+id,kind:'question',questionId:id,revision:0,state:empty(),privateState:{}};
  // Public state is initialized/projected without creating questions or receipts.
  // Timeout projection may reveal only the current expired timed prompt.
  const publicQuestion=(ctx,id,rows)=>{
    const q=rows.find(row=>row.questionId===id) ?? {state:empty(),privateState:{},revision:0};
    const projected=Number.isFinite(q.state.solvedAt)?null:reduceQuestion(id,q,{type:'tick'},now());
    const data=questionData(id);
    return {attempt:projected?.state ?? q.state,revision:q.revision,...(data?{data}:{})};
  };
  const bulkView=(ctx,rows)=>({eventId:ctx.event.id,year:ctx.event.year,serverNow:now(),eventEndsAt:ctx.event.theoryEndsAt,score:ctx.team?.score || 0,questions:Object.fromEntries(Array.from({length:9},(_,index)=>ctx.event.year+'P'+(index+1)).filter(id=>questionInfo(id)).map(id=>[id,publicQuestion(ctx,id,rows)]))});
  const mutateQuestion=async(token,input,operation)=>{
    assert(validId(input.requestId) && input.requestId.length>=8,400,'A request identifier is required.');
    let payload;
    if(operation==='action') {
      assert(input.action && typeof input.action==='object' && !Array.isArray(input.action) && typeof input.action.type==='string',400,'Invalid question action.');
      const action=semantic(input.action); delete action.now;delete action.random;
      assert(!['submit','edit'].includes(action.type),400,'Use the answer endpoint for this action.');
      assert(Buffer.byteLength(JSON.stringify(action))<=24000,400,'Question action is too large.');
      payload={action};
    } else {
      payload={answers:answers(input.questionId,input.answers)};
      if(operation==='draft') {
        assert(Number.isInteger(input.expectedRevision) && input.expectedRevision>=0,400,'Invalid question revision.');
        if(input.interaction!==undefined) {
          assert(input.interaction && typeof input.interaction==='object' && !Array.isArray(input.interaction),400,'Invalid interaction draft.');
          payload.interaction=semantic(input.interaction);
          assert(Buffer.byteLength(JSON.stringify(payload.interaction))<=24000,400,'Invalid interaction draft.');
        }
        payload.expectedRevision=input.expectedRevision;
      }
    }
    const fingerprint=hash(canonical({operation,questionId:input.questionId,...payload}));
    // Accepted event settings remain fixed for this operation. Team ETags and
    // security epoch are rechecked on every retry, preventing release/breach races.
    const accepted=await questionContext(token,input),info=validateQuestion(input.questionId,accepted.event),acceptedAt=now();
    return retry(async()=>{
      const ctx={...accepted,session:await authenticate(token)};
      if(ctx.team) {
        ctx.team=await ownedTeam(ctx.session);
        assert(ctx.team.securityStatus==='ACTIVE' && ctx.team.securityEpoch===accepted.team.securityEpoch,423,'Competition mode changed.');
        activeForWrite(ctx.event);theoryForWrite(ctx.event);
      }
      const receipt=await repo.get(ctx.pk,'receipt-'+input.requestId);
      if(receipt) { assert(receipt.fingerprint===fingerprint,409,'This request identifier was used for different content.');return {...receipt.response,score:ctx.team?.score || 0,serverNow:now()}; }
      const q=await loadQuestion(ctx,input.questionId);
      if(ctx.team) {
        const legacy=await repo.get(ctx.pk,'attempt-'+input.requestId);
        if(legacy) {assert(operation==='submit' && input.questionId==='L6P8' && payload.answers?.answer===legacy.answer,409,'This request identifier was used for different content.');return qView(q,ctx);}
      }
      let result;
      const completed=typeof q.state.solvedAt==='number' && Number.isFinite(q.state.solvedAt);
      if(completed) {
        // Freeze all saved interactions after completion, including GC runs.
        // New receipts still bind request IDs without changing the saved state.
        result={state:q.state,privateState:q.privateState,award:false};
      } else if(operation==='draft') {
        assert(Number.isInteger(input.expectedRevision) && input.expectedRevision===q.revision,409,'This question changed. Refresh before saving your draft.');
        result={state:q.state,privateState:q.privateState,award:false};
        if(q.state.solvedAt===null && acceptedAt>=q.state.retryAt) {
          result={...result,state:{...q.state,answers:payload.answers}};
          const draft=payload.interaction;
          const apply=action=>{result=reduceQuestion(input.questionId,{state:result.state,privateState:result.privateState},action,acceptedAt);};
          if(draft?.kind==='grouping') {
            assert(['L5P9','L6P1'].includes(input.questionId) && Array.isArray(draft.selected) && draft.selected.length<=9 && new Set(draft.selected).size===draft.selected.length && draft.selected.every(item=>typeof item==='string' && item.length<=16),400,'Invalid grouping draft.');
            apply({type:'reset'});for(const item of draft.selected)apply({type:'select',item});
          } else if(draft?.kind==='gc') {
            assert(input.questionId==='U5P5',400,'Invalid laboratory draft.');
            apply({type:'tick'});
            if(draft.entered===true)apply({type:'gc-enter'});
            for(const sample of ['citrus','floral','woody'])if(Number.isFinite(draft.concentrations?.[sample]))apply({type:'gc-dilute',sample,value:draft.concentrations[sample]});
            if(draft.reference!==undefined)apply({type:'gc-reference',accord:draft.reference});
            if(draft.interval!==undefined)apply({type:'gc-interval',interval:draft.interval});
            if(draft.results!==undefined) {
              assert(Array.isArray(draft.results) && draft.results.length<=8,400,'Invalid laboratory reports.');
              const existing=result.state.interaction.results;
              for(const report of existing)if(!draft.results.some(item=>item?.id===report.id))apply({type:'gc-delete-result',id:report.id});
              for(const report of draft.results)if(existing.some(item=>item.id===report?.id)) {
                if(report.position!==undefined)apply({type:'gc-result-position',id:report.id,position:report.position});
                if(report.interval!==undefined)apply({type:'gc-result-interval',id:report.id,interval:report.interval});
              }
            }
          } else assert(!draft || draft.kind==='timed' && input.questionId==='L6P3',400,'Invalid question draft.');
          // Timed prompts, GC runs, snapshots and measurement results are always
          // retained from server state; a draft never supplies authority fields.
        }
      } else {
        const action=operation==='submit'?{type:'submit',answers:payload.answers}:payload.action;
        try {result=reduceQuestion(input.questionId,{state:q.state,privateState:q.privateState},action,acceptedAt);}
        catch(error) {if(error instanceof TypeError || error instanceof RangeError)throw new ApiError(400,'Invalid question action.');throw error;}
        assert(result && result.state,400,'Unsupported question action.');
      }
      const updated=completed?q:{...q,state:result.state,privateState:result.privateState || {},revision:q.revision+1};
      const team=ctx.team?{...ctx.team}:null;
      if(team && (operation==='submit' || operation==='action' && payload.action.type!=='tick'))team.hasSubmittedActivity=true;
      if(team && result.award && q.state.solvedAt===null && result.state.solvedAt!==null) {team.score+=info.points;team.lastScoringAt=acceptedAt;}
      const response=qView(updated,ctx,team);
      const receiptRow={partitionKey:ctx.pk,rowKey:'receipt-'+input.requestId,kind:'receipt',fingerprint,response,operation,actionType:payload.action?.type ?? null,createdAt:acceptedAt};
      await batch([...(team?[team]:[]),updated,receiptRow]);
      return response;
    });
  };
  const api={
    async throttle(bucket,maximum=60) {
      await bootstrap();const rowKey=hash(bucket);
      return retry(async()=>{const old=await repo.get('limits',rowKey),live=old && now()<old.until;const count=live?old.count+1:1;assert(count<=maximum,429,'Too many requests. Please wait a minute.');await repo.write({partitionKey:'limits',rowKey,kind:'limit',count,until:live?old.until:now()+60000},old?.etag);});
    },
    async login({role,code,legacyToken}) {
      assert(['teacher','competitor'].includes(role),400,'Choose competitor or teacher.');
      const s=await settings();assert(verify(code,s[role+'Hash']),403,'Code not recognised.');
      const token=randomBytes(32).toString('hex');
      let session={partitionKey:'sessions',rowKey:hash(token),kind:'session',role,createdAt:now(),expiresAt:now()+SESSION_MS,revoked:false,teamId:null,eventId:null,claimGeneration:null};
      await repo.write(session);session=await repo.get('sessions',session.rowKey);
      if(role==='competitor' && typeof legacyToken==='string' && /^test-[1-3]\.[a-f0-9]{64}$/.test(legacyToken) && s.events.some(event=>event.id===config.eventId)) {
        const [id,secret]=legacyToken.split('.');
        await retry(async()=>{
          const old=await teamById(config.eventId,id);
          if(!old || old.removed || !old.legacySessionHash || old.legacySessionHash!==hash(secret) || now()>=old.legacyExpires || old.owner)return;
          session={...session,teamId:id,eventId:old.eventId,claimGeneration:old.claimGeneration};await write(session);session=await repo.get('sessions',session.rowKey);
          await write({...old,owner:session.rowKey,securityStatus:'LOCKED',securityEpoch:old.securityEpoch+1});
        });
      }
      return {token,state:await snapshot(session,s)};
    },
    async logout(token) {const session=await authenticate(token);await write({...session,revoked:true});return {ok:true};},
    async session(token,{restore=false,interrupt=false}={}) {
      const session=await authenticate(token),s=await settings();
      if(restore) {
        // Fresh boots always require the access code and another team choice.
        // Keep the old claim reserved until an explicit teacher release.
        await retry(async()=>{const current=await authenticate(token);await write({...current,revoked:true});});
        throw new ApiError(401,'Sign in to continue.');
      }
      if(interrupt && session.role==='competitor' && session.teamId) await retry(async()=>{const current=await authenticate(token),team=await ownedTeam(current);if(team.securityStatus==='ACTIVE')await write({...team,securityStatus:'LOCKED',securityEpoch:team.securityEpoch+1,recovery:null});});
      return snapshot(session,s);
    },
    async events(token) {const session=await authenticate(token);teacher(session);const s=await settings();return {events:s.events,activeEvent:getActive(s),configRevision:s.revision,serverNow:now()};},
    eventCreate(token,input) {const id=randomUUID();return changeSettings(token,s=>{assert(YEARS.has(input.year),400,'Choose a valid year.');s.events.push(timings({id,name:name(input.name),year:input.year,status:'draft',revision:1},input,true));}).then(state=>({...state,createdEventId:id}));},
    async eventChangeYear(token,input) {
      const session=await authenticate(token);teacher(session);
      assert(confirmed(input),400,'Confirm resetting results and team sessions for the new year.');
      assert(YEARS.has(input.year) && validId(input.requestId) && input.requestId.length>=8,400,'Choose a valid year and request identifier.');
      const replacementId='year-'+hash(input.eventId+'|'+input.requestId).slice(0,32),fingerprint=hash(canonical(input));
      return retry(async()=>{
        const s=await settings(),existing=s.events.find(event=>event.id===replacementId);
        if(existing){assert(existing.yearChangeFingerprint===fingerprint,409,'This reset request was already used.');return {...await snapshot(session,s,null),createdEventId:replacementId};}
        const event=eventById(s,input.eventId);expectedRevision(input.expectedRevision,event.revision);
        assert(event.status!=='ended',409,'Completed event results are read-only.');assert(event.year!==input.year,400,'Choose a different year.');
        const replacement={...event,...timings(event,input),id:replacementId,name:input.name===undefined?event.name:name(input.name),year:input.year,status:'draft',hasBeenActive:false,revision:1,previousEventId:event.id,yearChangeFingerprint:fingerprint};
        const teams=(await repo.list({kind:'team',eventId:event.id})).filter(team=>!team.removed);
        for(const old of teams){
          const pk=partition(replacementId,old.teamId);
          if(!await repo.get(pk,'team'))await repo.write({partitionKey:pk,rowKey:'team',kind:'team',schemaVersion:2,eventId:replacementId,teamId:old.teamId,name:old.name,year:input.year,score:0,lastScoringAt:null,hasSubmittedActivity:false,claimGeneration:0,securityEpoch:0,securityStatus:'NOT_STARTED',owner:null,legacySessionHash:null,legacyExpires:0,recovery:null});
        }
        // Publish the fresh data namespace with a single conditional settings write.
        // Old in-flight submissions can only reach the retired namespace.
        s.events=s.events.map(item=>item.id===event.id?replacement:item);s.revision++;await write(s);
        return {...await snapshot(session,s,null),createdEventId:replacementId};
      });
    },
    eventUpdate(token,input) {return changeSettings(token,s=>{const event=eventById(s,input.eventId);expectedRevision(input.expectedRevision,event.revision);assert(event.status!=='ended',409,'Ended events cannot be changed.');if(input.year!==undefined && input.year!==event.year){assert(false,409,'Confirm a year change using the reset action.');}if(input.name!==undefined)event.name=name(input.name);Object.assign(event,timings(event,input));event.revision++;});},
    eventActivate(token,input) {return changeSettings(token,s=>{const event=eventById(s,input.eventId);expectedRevision(input.expectedRevision,event.revision);assert(event.status==='draft',409,'Only a draft event can be activated.');assert(!getActive(s),409,'End the active event before activating another.');assert(event.endsAt>now(),400,'The event end must be in the future.');event.status='active';event.hasBeenActive=true;if(s.testingEventId===event.id)s.testingEventId=null;event.revision++;});},
    eventDraft(token,input) {return changeSettings(token,s=>{assert(confirmed(input),400,'Confirm returning this event to draft.');const event=eventById(s,input.eventId);expectedRevision(input.expectedRevision,event.revision);assert(event.status==='active',409,'Only an active event can return to draft.');event.status='draft';event.hasBeenActive=true;event.revision++;});},
    eventEnd(token,input) {return changeSettings(token,s=>{assert(confirmed(input),400,'Confirm ending this event.');const event=eventById(s,input.eventId);expectedRevision(input.expectedRevision,event.revision);assert(event.status==='active',409,'Only the active event can be ended.');event.status='ended';event.revision++;});},
    codesUpdate(token,input) {return changeSettings(token,s=>{
      expectedRevision(input.expectedConfigRevision,s.revision);
      const competitorCode=input.competitorCode,teacherCode=input.teacherCode;
      assert(competitorCode!==undefined || teacherCode!==undefined,400,'Enter a replacement code.');
      for(const value of [competitorCode,teacherCode])if(value!==undefined)assert(typeof value==='string' && value.trim().length>=4 && value.length<=128,400,'Codes must contain 4 to 128 characters.');
      assert(competitorCode===undefined || (teacherCode!==undefined ? competitorCode!==teacherCode : !verify(competitorCode,s.teacherHash)),400,'Teacher and competitor codes must differ.');
      assert(teacherCode===undefined || (competitorCode!==undefined ? teacherCode!==competitorCode : !verify(teacherCode,s.competitorHash)),400,'Teacher and competitor codes must differ.');
      if(competitorCode!==undefined)s.competitorHash=password(competitorCode);if(teacherCode!==undefined)s.teacherHash=password(teacherCode);
    });},
    async teams(token,input={}) {
      const session=await authenticate(token),s=await settings();
      const event=session.role==='teacher' && input.eventId?eventById(s,input.eventId):getActive(s);assert(event,409,'There is no active event.');
      const teams=await repo.list({kind:'team',eventId:event.id});
      const visible=teams.filter(team=>!team.removed);
      const result=await Promise.all(visible.map(async team=>({...publicTeam(team),year:event.year,claimed:!!(team.owner || team.legacySessionHash),...(session.role==='teacher'?{score:team.score,hasSubmittedActivity:await submittedActivity(team),practical:team.practical ?? null,competition:{status:team.securityStatus,epoch:team.securityEpoch}}:{})})));
      return {event,teams:result.sort((a,b)=>a.name.localeCompare(b.name))};
    },
    async teamAdd(token,input) {
      const session=await authenticate(token);teacher(session);const s=await settings(),event=eventById(s,input.eventId || getActive(s)?.id);assert(event.status!=='ended',409,'Teams cannot be added to an ended event.');
      const teamName=name(input.name),id=hash(teamName.normalize('NFKC').toLocaleLowerCase('en-GB')).slice(0,24);
      const existing=await repo.list({kind:'team',eventId:event.id});
      assert(!existing.some(team=>team.name.normalize('NFKC').trim().toLocaleLowerCase('en-GB')===teamName.normalize('NFKC').toLocaleLowerCase('en-GB')),409,'That team name already exists in this event.');
      await retry(async()=>{
        const pk=partition(event.id,id),fence=await repo.get(pk,'deleted-team');
        assert(!fence || fence.complete,409,'This team is still being deleted. Retry shortly.');
        const generation=fence?(fence.claimGeneration ?? 0)+1:0;
        const team={partitionKey:pk,rowKey:'team',kind:'team',schemaVersion:2,eventId:event.id,teamId:id,name:teamName,year:event.year,score:0,lastScoringAt:null,hasSubmittedActivity:false,claimGeneration:generation,securityEpoch:0,securityStatus:'NOT_STARTED',owner:null,legacySessionHash:null,recovery:null};
        // A stale creator must not reuse a generation after another full
        // create/delete cycle; team creation and the observed fence commit once.
        try{await batch([lifecycleFence(pk,fence,{claimGeneration:generation}),team]);}
        catch(error){if(conflict(error) && await teamById(event.id,id))throw new ApiError(409,'That team name already exists in this event.');throw error;}
      });
      return api.teams(token,{eventId:event.id});
    },
    async teamRelease(token,input) {
      const session=await authenticate(token);teacher(session);assert(confirmed(input),400,'Confirm releasing this team.');const s=await settings(),event=eventById(s,input.eventId || getActive(s)?.id);
      assert(event.status!=='ended',409,'Ended event results are read-only.');
      await retry(async()=>{const team=await teamById(event.id,input.teamId);assert(team && !team.removed,404,'Team not found.');await write({...team,owner:null,legacySessionHash:null,claimGeneration:team.claimGeneration+1,securityEpoch:team.securityEpoch+1,securityStatus:'NOT_STARTED',recovery:null});});
      return api.teams(token,{eventId:event.id});
    },
    async teamDelete(token,input) {
      const session=await authenticate(token);teacher(session);
      assert(confirmed(input),400,'Confirm deleting this team.');
      assert(validId(input.teamId) && validId(input.requestId) && input.requestId.length>=8,400,'A team and deletion request identifier are required.');
      const s=await settings(),event=eventById(s,input.eventId),pk=partition(event.id,input.teamId),receiptKey='delete-'+input.requestId;
      const outcome=await retry(async()=>{
        const receipt=await repo.get(pk,receiptKey);
        if(receipt) {assert(receipt.name===input.teamName,409,'This deletion identifier was used for another team name.');return receipt;}
        assert(event.status!=='ended',409,'Ended event results are read-only.');
        const team=await teamById(event.id,input.teamId);
        assert(team && !team.removed,404,'Team not found.');
        assert(input.teamName===team.name,409,'The team name changed. Check the selected team before deleting it.');
        const retained=(event.status==='active' || event.hasBeenActive) && await submittedActivity(team);
        const fenced={...team,removed:true,owner:null,legacySessionHash:null,legacyExpires:0,claimGeneration:team.claimGeneration+1,securityEpoch:team.securityEpoch+1,securityStatus:'NOT_STARTED',recovery:null,deletionReceipt:receiptKey};
        const receiptRow={partitionKey:pk,rowKey:receiptKey,kind:'admin-receipt',eventId:event.id,name:team.name,outcome:retained?'removed':'deleted',complete:retained};
        const marker=await repo.get(pk,'deleted-team');
        await batch([fenced,receiptRow,{...marker,partitionKey:pk,rowKey:'deleted-team',kind:'team-deletion',eventId:event.id,claimGeneration:fenced.claimGeneration,receiptKey,complete:retained,revision:(marker?.revision ?? 0)+1}]);
        return receiptRow;
      });
      if(!outcome.complete)await finishDeletion(pk,receiptKey);
      return {...await api.teams(token,{eventId:event.id}),outcome:outcome.outcome};
    },
    async claim(token,input) {
      const session=await authenticate(token);assert(session.role==='competitor',403,'Only competitors claim teams.');const s=await settings(),event=getActive(s);assert(event,409,'There is no active event.');activeForWrite(event);assert(validId(input.teamId),400,'Choose a team.');
      if(session.teamId) {assert(session.teamId===input.teamId && session.eventId===event.id,409,'This session already chose a team.');const current=await teamById(event.id,input.teamId);if(current?.owner===session.rowKey && current.claimGeneration===session.claimGeneration)return snapshot(session,s,current);}
      const available=await teamById(event.id,input.teamId);
      assert(available && !available.removed,404,'Team not found.');
      assert(!available.legacySessionHash && (!available.owner || available.owner===session.rowKey),409,'That team is already claimed.');
      // Pin the first choice before the conditional team claim. Concurrent
      // choices cannot leave one role session owning two teams.
      if(!session.teamId) {try{await write({...session,teamId:input.teamId,eventId:event.id,claimGeneration:null});}catch(error){if(conflict(error))return api.claim(token,input);throw error;}}
      try {return await retry(async()=>{
        const currentSession=await authenticate(token);assert(currentSession.teamId===input.teamId && currentSession.eventId===event.id,409,'This session already chose a team.');
        const team=await teamById(event.id,input.teamId);assert(team && !team.removed,404,'Team not found.');assert(!team.legacySessionHash && (!team.owner || team.owner===session.rowKey),409,'That team is already claimed.');
        // A released session cannot reclaim its prior team by replaying claim.
        assert(currentSession.claimGeneration===null || currentSession.claimGeneration===team.claimGeneration,401,'This team claim was released. Sign in again.');
        if(currentSession.claimGeneration===null)await write({...currentSession,claimGeneration:team.claimGeneration});
        if(team.owner!==session.rowKey)await write({...team,year:event.year,owner:session.rowKey,securityStatus:'NOT_STARTED',securityEpoch:team.securityEpoch+1,recovery:null});
        const bound=await authenticate(token),claimed=await ownedTeam(bound);
        return snapshot(bound,s,claimed);
      });}catch(error){
        // A losing claim releases only its pending role-session pointer. It
        // never releases a team, revokes another owner, or revives a released
        // generation. Conditional writes protect simultaneous retry choices.
        if(error instanceof ApiError && [404,409].includes(error.status)) {
          const pending=await authenticate(token),current=await teamById(event.id,input.teamId);
          if(pending.teamId===input.teamId && pending.eventId===event.id && current?.owner!==pending.rowKey && (pending.claimGeneration===null || pending.claimGeneration===current?.claimGeneration)) {
            try{await write({...pending,teamId:null,eventId:null,claimGeneration:null});}catch(cleanupError){if(!conflict(cleanupError))throw cleanupError;}
          }
        }
        throw error;
      }
    },
    async start(token) {
      const session=await authenticate(token),s=await settings();
      await retry(async()=>{const team=await ownedTeam(session);activeForWrite(eventById(s,team.eventId));assert(team.securityStatus==='NOT_STARTED',409,'Use teacher recovery to resume a locked competition.');await write({...team,securityStatus:'ACTIVE',securityEpoch:team.securityEpoch+1});});
      return snapshot(session,s,undefined,true);
    },
    async breach(token,input) {
      const session=await authenticate(token),s=await settings();
      await retry(async()=>{const team=await ownedTeam(session);assert(Number.isInteger(epoch(input)),400,'Security epoch is required.');if(team.securityEpoch!==epoch(input))return;if(team.securityStatus==='ACTIVE')await write({...team,securityStatus:'LOCKED',securityEpoch:team.securityEpoch+1,recovery:null});});
      return snapshot(session,s);
    },
    async recovery(token,input) {
      const session=await authenticate(token),s=await settings();assert(verify(input.code,s.teacherHash),403,'Teacher code not recognised.');const grant=randomBytes(32).toString('hex');
      await retry(async()=>{const team=await ownedTeam(session);activeForWrite(eventById(s,team.eventId));assert(team.securityStatus==='LOCKED' && team.securityEpoch===epoch(input),409,'The competition state changed.');await write({...team,recovery:{hash:hash(grant),epoch:team.securityEpoch,until:now()+60000}});});
      return {grant,expiresAt:now()+60000,expectedEpoch:epoch(input)};
    },
    async resume(token,input) {
      const session=await authenticate(token),s=await settings();
      await retry(async()=>{const team=await ownedTeam(session);activeForWrite(eventById(s,team.eventId));assert(typeof input.grant==='string' && team.securityStatus==='LOCKED' && team.securityEpoch===epoch(input) && team.recovery?.epoch===epoch(input) && now()<team.recovery.until && team.recovery.hash===hash(input.grant),403,'Recovery permission expired or was already used.');await write({...team,securityStatus:'ACTIVE',securityEpoch:team.securityEpoch+1,recovery:null});});
      return snapshot(session,s,undefined,true);
    },
    async hydrate(token,input={}) {
      const ctx=await questionContext(token,input,true);
      return bulkView(ctx,await repo.list({partitionKey:ctx.pk,kind:'question'}));
    },
    async question(token,input) {
      const ctx=await questionContext(token,input);validateQuestion(input.questionId,ctx.event);
      const q=await loadQuestion(ctx,input.questionId);
      return {...qView(q,ctx),...publicQuestion(ctx,input.questionId,[{...q,questionId:input.questionId}])};
    },
    async practical(token,input={}) {const ctx=await practicalContext(token,input);return practicalView(practicalSummary(await loadPractical(ctx)),ctx);},
    practicalSave:(token,input)=>savePractical(token,input),
    draft:(token,input)=>mutateQuestion(token,input,'draft'),
    submit:(token,input)=>mutateQuestion(token,input,'submit'),
    action:(token,input)=>mutateQuestion(token,input,'action'),
    async leaderboard(token) {
      const session=await authenticate(token);teacher(session);const s=await settings(),event=getActive(s);assert(event,409,'There is no active event.');
      const all=await repo.list({kind:'team',eventId:event.id});
      const entries=all.filter(team=>!team.removed && team.score>0).sort((a,b)=>b.score-a.score || (a.lastScoringAt || 0)-(b.lastScoringAt || 0) || a.teamId.localeCompare(b.teamId)).slice(0,3).map((team,index)=>({id:team.teamId,name:team.name,score:team.score,scoreReachedAt:team.lastScoringAt,position:index+1}));
      return {event,activeEvent:event,entries,rows:entries.map(row=>({teamId:row.id,name:row.name,score:row.score,lastScoreAt:row.scoreReachedAt})),serverNow:now(),configRevision:s.revision};
    },
  };
  return config.isolatedPractice ? api : attachPractice(api,{settings,createService,now,ApiError});
}
