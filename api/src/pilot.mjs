import { createHash } from 'node:crypto';
import core from './private/molecule-core.mjs';
import { schoolColours } from './school-colours.mjs';

export const PILOT_LIMITS = Object.freeze({maxHeavyAtoms:250,maxAtoms:650,maxBonds:750});
const pk='readiness-pilot-v1';
const digest=value=>createHash('sha256').update(value).digest('hex');
const rejected={accepted:false,score:null};

/** Count constitutional isomers, never coordinates or stereochemical layouts. */
export function markPilot(serialized) {
  try {
    const graph=JSON.parse(serialized);
    if(Object.keys(graph).some(k=>!['atoms','bonds'].includes(k)))return rejected;
    core.assertGraph(graph,PILOT_LIMITS);
    if(!graph.atoms.length || graph.atoms.some(a=>!['C','H'].includes(a.element) || a.charge || Object.keys(a).some(k=>!['id','element','x','y','h','charge'].includes(k))) ||
      graph.bonds.some(b=>Object.keys(b).some(k=>!['a','b','order'].includes(k))))return rejected;
    const remaining=new Set(graph.atoms.map(a=>a.id)), unique=[];
    let count=0;
    while(remaining.size) {
      if(++count>50)return rejected;
      const ids=new Set(), todo=[remaining.values().next().value];
      while(todo.length) {const id=todo.pop();if(ids.has(id))continue;ids.add(id);remaining.delete(id);for(const n of core.neighbours(graph,id))todo.push(n.id);}
      const component={atoms:graph.atoms.filter(a=>ids.has(a.id)),bonds:graph.bonds.filter(b=>ids.has(b.a))};
      // Bound each isomorphism problem before performing any graph search.
      if(component.atoms.filter(a=>a.element==='C').length!==5 || component.atoms.length>13 || core.formula(component)!=='C5H8')return rejected;
      if(!unique.some(g=>core.check(component,g).kind==='correct'))unique.push(component);
    }
    return {accepted:true,score:unique.length};
  } catch {return rejected;}
}

export function createPilot({repo,retry,assert,schools,currentEvent,now}) {
  const row=(rowKey,values)=>({partitionKey:pk,rowKey,...values});
  const config=()=>retry(async()=>{
    let value=await repo.get(pk,'config');
    if(!value){await repo.write(row('config',{kind:'pilot-config',status:'off',revision:1}));value=await repo.get(pk,'config');}
    return value;
  });
  const status=c=>c.status==='open'?'open':'off';
  const names=async()=>(await schools.directory()).schools.map(s=>({id:s.id,name:s.name,deleted:!!s.deleted,colours:schoolColours(s)}));
  const eligible=async()=>{
    const event=await currentEvent();
    if(!event)return {eventId:null,schools:[]};
    const teams=await repo.list({kind:'team',eventId:event.id});
    const ids=new Set(teams.filter(t=>!t.removed && t.schoolId).map(t=>t.schoolId));
    return {eventId:event.id,schools:(await names()).filter(s=>!s.deleted && ids.has(s.id)).map(({deleted,...school})=>school)};
  };
  const state=async()=>{const c=await config();return {status:status(c),revision:c.revision};};
  const attempts=()=>repo.list({partitionKey:pk,kind:'pilot-attempt'});
  const best=a=>a.hasAccepted || a.best>0 ? a.best : null;
  const view=a=>({id:a.publicId,schoolId:a.schoolId,confirmedAt:a.confirmedAt ?? null,best:best(a)});
  const rankings=async()=>{
    const directory=await names(), grouped=new Map();
    for(const a of await attempts())if(best(a)!==null)grouped.set(a.schoolId,Math.max(grouped.get(a.schoolId) ?? 0,a.best));
    return [...grouped].map(([schoolId,score])=>({schoolId,score,name:directory.find(s=>s.id===schoolId)?.name ?? 'School'}))
      .sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name,'en-GB') || a.schoolId.localeCompare(b.schoolId))
      .slice(0,3).map(({schoolId,name},i)=>({schoolId,name,rank:i+1}));
  };
  const validate=input=>{
    assert(typeof input.credential==='string' && /^[a-f0-9]{64}$/.test(input.credential),400,'Invalid attempt credential.');
    assert(typeof input.requestId==='string' && /^[\w-]{8,80}$/.test(input.requestId),400,'Invalid request identifier.');
  };
  const requireSchool=async input=>assert((await eligible()).schools.some(s=>s.id===input.schoolId),409,'This school is not in the current event. Return to the landing page.');
  return {
    async bootstrap(){const s=await state();return {...s,...await eligible(),rankings:s.status==='open'?await rankings():[],snapshotAt:now()};},
    async report(){
      const directory=await names();
      return {...await state(),...await eligible(),readiness:(await attempts()).map(a=>({...view(a),name:directory.find(s=>s.id===a.schoolId)?.name ?? 'School'}))
        .sort((a,b)=>(b.confirmedAt ?? 0)-(a.confirmedAt ?? 0) || a.id.localeCompare(b.id))};
    },
    async mode(input){
      assert(['open','off','closed'].includes(input.status) && typeof input.requestId==='string' && /^[\w-]{8,80}$/.test(input.requestId),400,'Invalid pilot change.');
      const fingerprint=digest(JSON.stringify([input.status,input.expectedRevision,input.confirm]));
      return retry(async()=>{
        const c=await config(), old=await repo.get(pk,'mode-'+input.requestId);
        if(old){assert(old.fingerprint===fingerprint,409,'Request identifier already used.');return state();}
        assert(c.revision===input.expectedRevision,409,'Pilot settings changed. Close and reopen this panel before trying again.');
        await repo.batch([{entity:{...c,status:input.status==='open'?'open':'off',revision:c.revision+1},etag:c.etag},{entity:row('mode-'+input.requestId,{kind:'pilot-mode-receipt',fingerprint})}]);
        return state();
      });
    },
    async enter(input){
      validate(input);
      return retry(async()=>{
        const c=await config();assert(status(c)==='open',409,'The pilot is off. Return to the landing page.');
        await requireSchool(input);
        const id=digest(input.credential), old=await repo.get(pk,'attempt-'+id);
        assert(!old || old.schoolId===input.schoolId,409,'This attempt belongs to another school.');
        const attempt=old ?? row('attempt-'+id,{kind:'pilot-attempt',publicId:digest('public:'+id),schoolId:input.schoolId,confirmedAt:now(),best:0,hasAccepted:false});
        // Even resume checks the mode fence; retries return the original identity/time.
        await repo.batch([{entity:c,etag:c.etag},{entity:attempt,etag:attempt.etag}]);
        return view(attempt);
      });
    },
    async submit(input){
      validate(input);
      assert(typeof input.graph==='string' && Buffer.byteLength(input.graph)<=120000,400,'Drawing exceeds pilot capacity.');
      const id=digest(input.credential), fingerprint=digest(JSON.stringify([input.schoolId,input.graph]));
      const result=markPilot(input.graph);
      return retry(async()=>{
        const c=await config();assert(status(c)==='open',409,'The pilot is off. Return to the landing page.');
        await requireSchool(input);
        const receipt=await repo.get(pk,'receipt-'+id+'-'+input.requestId);
        if(receipt){assert(receipt.fingerprint===fingerprint,409,'Request identifier already used for another drawing.');return receipt.response;}
        const attempt=await repo.get(pk,'attempt-'+id);
        assert(attempt && attempt.schoolId===input.schoolId,409,'Enter the pilot with your school before submitting.');
        if(result.accepted){attempt.best=Math.max(attempt.best,result.score);attempt.hasAccepted=true;}
        attempt.lastContact=now();
        const response={...result,...view(attempt)};
        await repo.batch([c,attempt,row('receipt-'+id+'-'+input.requestId,{kind:'pilot-receipt',fingerprint,response})].map(entity=>({entity,etag:entity.etag})));
        return response;
      });
    },
  };
}
