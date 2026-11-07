import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createService} from '../src/service.mjs';
import {memoryRepository} from '../src/memory-storage.mjs';
import {handle} from '../src/http.mjs';
import {markPilot,PILOT_LIMITS} from '../src/pilot.mjs';
import core from '../src/private/molecule-core.mjs';

const molecule=(edges)=>({atoms:Array.from({length:5},(_,id)=>({id,element:'C',x:id*60,y:0})),bonds:edges.map(([a,b,order=1])=>({a,b,order}))});
const alkyne=molecule([[0,1,3],[1,2],[2,3],[3,4]]);
const ring=molecule([[0,1,2],[1,2],[2,3],[3,4],[4,0]]);
const diene=molecule([[0,1,2],[1,2],[2,3,2],[3,4]]);
function combine(...graphs){return {atoms:graphs.flatMap((g,i)=>g.atoms.map(a=>({...a,id:a.id+i*100,x:a.x+i*300}))),bonds:graphs.flatMap((g,i)=>g.bonds.map(b=>({...b,a:b.a+i*100,b:b.b+i*100})))};}
const mark=g=>markPilot(JSON.stringify(g));
async function fixture(){const repo=memoryRepository([],{allowBootstrap:true}),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token;await api.eventCreate(staff,{name:'Test pilot event',year:'U6',theoryStartsAt:200000,theoryEndsAt:300000});await api.pilotMode(staff,{status:'open',expectedRevision:1,requestId:'open-request'});const schoolId=(await api.pilot()).schools[0].id;return {repo,api,staff,schoolId};}
const input=(f,graph=alkyne)=>({schoolId:f.schoolId,credential:randomBytes(32).toString('hex'),requestId:'submit-request',graph:JSON.stringify(graph)});

test('marks chains, cycles, duplicates and explicit hydrogens by connectivity',()=>{
 assert.deepEqual(mark(combine(alkyne,ring,diene,alkyne)),{accepted:true,score:3});
 const explicit=structuredClone(alkyne);let id=5;
 for(const atom of alkyne.atoms)for(let n=0;n<core.hydrogens(alkyne,atom);n++){explicit.atoms.push({id,element:'H',x:id*10,y:50});explicit.bonds.push({a:atom.id,b:id++,order:1});}
 assert.deepEqual(mark(combine(explicit,alkyne)),{accepted:true,score:1});
 const rearranged={atoms:[...alkyne.atoms].reverse().map(a=>({...a,x:-a.x,y:100})),bonds:[...alkyne.bonds].reverse()};
 assert.deepEqual(mark(combine(alkyne,rearranged)),{accepted:true,score:1});
});
test('rejects the entire canvas for wrong formula, invalid valence, fragments or malformed chemistry',()=>{
 for(const g of [{atoms:[],bonds:[]},combine(alkyne,molecule([[0,1],[1,2],[2,3],[3,4]])),combine(alkyne,{atoms:[{id:0,element:'C',x:0,y:0}],bonds:[]}),molecule([[0,1,3],[1,2,3],[2,3],[3,4]]),{...alkyne,atoms:alkyne.atoms.map(a=>({...a,charge:1}))}, {...alkyne,bonds:[...alkyne.bonds,alkyne.bonds[0]]}])assert.equal(mark(g).accepted,false);
 assert.equal(markPilot('no json').accepted,false);
});
test('50 structures fit, default competition limits remain unchanged',()=>{
 const g=combine(...Array.from({length:50},()=>alkyne));
 assert.deepEqual(mark(g),{accepted:true,score:1});core.assertGraph(g,PILOT_LIMITS);
 assert.throws(()=>core.assertGraph(g));assert.equal(mark(combine(g,alkyne)).accepted,false);
 assert.deepEqual(core.DEFAULT_LIMITS,{maxHeavyAtoms:20,maxAtoms:100,maxBonds:150});
});
test('entry registers once before marking; no numbering, scores or credentials leak publicly',async()=>{
 const f=await fixture(),a=input(f),teams=[...f.repo.rows.values()].filter(row=>row.kind==='team');
 const [one,two]=await Promise.all([f.api.pilotEnter(null,a),f.api.pilotEnter(null,a)]);
 assert.deepEqual(one,two);assert.equal(one.confirmedAt,100000);assert.equal(one.best,null);
 assert.equal((await f.api.pilotReport(f.staff)).readiness.length,1);
 for(let n=0;n<51;n++)await f.api.pilotEnter(null,input(f));
 assert.equal((await f.api.pilotReport(f.staff)).readiness.length,52);
 assert.deepEqual([...f.repo.rows.values()].filter(row=>row.kind==='team'),teams);
 await f.api.pilotSubmit(null,a);
 const publicState=await f.api.pilot();assert.deepEqual(publicState.rankings,[{schoolId:f.schoolId,name:"St John's",rank:1}]);
 assert.ok(!JSON.stringify(publicState).includes('score'));assert.ok(!JSON.stringify(publicState).includes(one.id));
 assert.ok(!JSON.stringify(await f.repo.list({partitionKey:'readiness-pilot-v1'})).includes(a.credential));
});
test('current event roster filters schools; directory-only and removed teams are excluded',async()=>{
 const f=await fixture(),other=(await f.api.schoolCreate(f.staff,{name:'Other school',requestId:'other-school'})).school;
 assert.deepEqual((await f.api.pilot()).schools.map(s=>s.id),[f.schoolId]);
 await assert.rejects(f.api.pilotEnter(null,{...input(f),schoolId:other.id}),{status:409});
 for(const team of [...f.repo.rows.values()].filter(row=>row.kind==='team'))await f.repo.write({...team,removed:true},team.etag);
 assert.deepEqual((await f.api.pilot()).schools,[]);
 await assert.rejects(f.api.pilotEnter(null,input(f)),{status:409});
});
test('rejection retains access time; best never decreases; school ranking deduplicates attempts',async()=>{
 const f=await fixture(),a=input(f,{atoms:[],bonds:[]});await f.api.pilotEnter(null,a);
 assert.equal((await f.api.pilotSubmit(null,a)).best,null);
 assert.equal((await f.api.pilotSubmit(null,{...a,requestId:'accepted-request',graph:JSON.stringify(combine(alkyne,ring))})).best,2);
 assert.equal((await f.api.pilotSubmit(null,{...a,requestId:'lower-request',graph:JSON.stringify(alkyne)})).best,2);
 const b=input(f);await f.api.pilotEnter(null,b);await f.api.pilotSubmit(null,b);
 const report=await f.api.pilotReport(f.staff);assert.equal(report.readiness.length,2);assert.ok(report.readiness.every(a=>a.confirmedAt===100000));
 assert.equal((await f.api.pilot()).rankings.length,1);
 await f.api.schoolRename(f.staff,{schoolId:f.schoolId,name:'Renamed Example',expectedRevision:1,requestId:'rename-school'});
 assert.equal((await f.api.pilot()).rankings[0].name,'Renamed Example');
 const rows=JSON.stringify(await f.repo.list({partitionKey:'readiness-pilot-v1'}));assert.ok(!rows.includes('"atoms"'));
});
test('mode is teacher-only, revision guarded and reversible; off fences submissions and entry',async()=>{
 const f=await fixture(),a=input(f);await f.api.pilotEnter(null,a);
 await assert.rejects(f.api.pilotReport(null),{status:401});await assert.rejects(f.api.pilotMode(null,{}),{status:401});
 await assert.rejects(f.api.pilotMode(f.staff,{status:'off',expectedRevision:1,requestId:'off-stale'}),{status:409});
 const original=f.repo.batch;let switched=false;
 f.repo.batch=async (ops,options)=>{if(!switched && ops.some(o=>o.entity.kind==='pilot-receipt')){switched=true;await f.api.pilotMode(f.staff,{status:'off',expectedRevision:2,requestId:'off-racing'});}return original(ops,options);};
 await assert.rejects(f.api.pilotSubmit(null,a),{status:409});
 await assert.rejects(f.api.pilotEnter(null,input(f)),{status:409});
 assert.equal((await f.api.pilotReport(f.staff)).readiness[0].best,null);
 await f.api.pilotMode(f.staff,{status:'open',expectedRevision:3,requestId:'reopen-request'});
 assert.equal((await f.api.pilotSubmit(null,a)).best,1);
 assert.equal((await f.api.pilotEnter(null,a)).confirmedAt,100000);
});
test('lost entry/submission responses retry without duplicate records; persistence failures stay atomic',async()=>{
 const f=await fixture(),a=input(f),original=f.repo.batch;let fail=true;
 f.repo.batch=async (ops,options)=>{if(fail && ops.some(o=>o.entity.kind==='pilot-attempt')){fail=false;throw Error('Storage unavailable');}return original(ops,options);};
 await assert.rejects(f.api.pilotEnter(null,a),/Storage unavailable/);assert.equal((await f.api.pilotReport(f.staff)).readiness.length,0);
 await f.api.pilotEnter(null,a);
 let lost=true;f.repo.batch=async (ops,options)=>{await original(ops,options);if(lost && ops.some(o=>o.entity.kind==='pilot-receipt')){lost=false;throw Error('Lost response');}};
 await assert.rejects(f.api.pilotSubmit(null,a),/Lost response/);
 const restarted=createService(f.repo,{},()=>100001);assert.equal((await restarted.pilotSubmit(null,a)).best,1);
 assert.equal((await restarted.pilotEnter(null,a)).confirmedAt,100000);
 await assert.rejects(f.api.pilotSubmit(null,{...a,graph:JSON.stringify(ring)}),{status:409});
});
test('HTTP origin/body/rate guards apply and report remains teacher-only',async()=>{
 const f=await fixture(),body=input(f);await f.api.pilotEnter(null,body);
 const req={method:'POST',params:{action:'pilot-submit'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json'},body};
 assert.equal((await handle({...req,headers:{...req.headers,origin:'https://other.example'}},()=>f.api)).status,403);
 assert.equal((await handle({...req,body:{...body,graph:'x'.repeat(129000)}},()=>f.api)).status,400);
 for(let i=0;i<20;i++)assert.equal((await handle(req,()=>f.api)).status,200);
 assert.equal((await handle(req,()=>f.api)).status,429);
 assert.equal((await handle({method:'GET',params:{action:'pilot-report'}},()=>f.api)).status,401);
 const player=(await f.api.login({role:'competitor',code:'1234'})).token;
 await assert.rejects(f.api.pilotReport(player),{status:403});await assert.rejects(f.api.pilotMode(player,{status:'off'}),{status:403});
});
test('legacy closed pilot can resume without rewriting scores or inventing access times',async()=>{
 const f=await fixture(),a=input(f);await f.api.pilotEnter(null,a);await f.api.pilotSubmit(null,a);
 const c=await f.repo.get('readiness-pilot-v1','config');await f.repo.write({...c,status:'closed'},c.etag);
 const old=([...f.repo.rows.values()].filter(row=>row.kind==='pilot-attempt'))[0];delete old.confirmedAt;await f.repo.write(old,old.etag);
 await f.api.pilotMode(f.staff,{status:'open',expectedRevision:2,requestId:'legacy-reopen'});
 assert.equal((await f.api.pilotEnter(null,a)).confirmedAt,null);assert.equal((await f.api.pilotEnter(null,a)).best,1);
});
test('school rankings use best attempt, deterministic ties, and omit all public scores',async()=>{
 const f=await fixture(),eventId=(await f.api.pilot()).eventId;
 for(const name of ['Zeta','Alpha','Beta']){
   const school=(await f.api.schoolCreate(f.staff,{name,requestId:'create-'+name})).school;
   await f.api.schoolTeams(f.staff,{eventId,schoolId:school.id,targetCount:1,requestId:'allocate-'+name});
   const a={...input(f),schoolId:school.id};await f.api.pilotEnter(null,a);await f.api.pilotSubmit(null,a);
 }
 const a=input(f,combine(alkyne,ring));await f.api.pilotEnter(null,a);await f.api.pilotSubmit(null,a);
 assert.deepEqual((await f.api.pilot()).rankings.map(r=>r.name),["St John's",'Alpha','Beta']);
});
test('off fences in-flight entry and repeated on/off requests cannot replay a stale transition',async()=>{
 const f=await fixture(),a=input(f),original=f.repo.batch;let switched=false;
 const off={status:'off',expectedRevision:2,requestId:'entry-racing-off'};
 f.repo.batch=async (ops,options)=>{if(!switched && ops.some(o=>o.entity.kind==='pilot-attempt')){switched=true;await f.api.pilotMode(f.staff,off);}return original(ops,options);};
 await assert.rejects(f.api.pilotEnter(null,a),{status:409});assert.equal((await f.api.pilotReport(f.staff)).readiness.length,0);
 await f.api.pilotMode(f.staff,{status:'open',expectedRevision:3,requestId:'entry-reopen'});
 assert.equal((await f.api.pilotMode(f.staff,off)).status,'open');
 await assert.rejects(f.api.pilotMode(f.staff,{...off,status:'open'}),{status:409});
 let lost=true;f.repo.batch=async (ops,options)=>{await original(ops,options);if(lost && ops.some(o=>o.entity.kind==='pilot-attempt')){lost=false;throw Error('Lost entry response');}};
 await assert.rejects(f.api.pilotEnter(null,a),/Lost entry response/);await f.api.pilotEnter(null,a);
 assert.equal((await f.api.pilotReport(f.staff)).readiness.length,1);
});

test('entry returns mode and availability without roster or attempt scans',async()=>{
 const f=await fixture();
 f.repo.list=async()=>{throw new Error('Entry must not list storage rows');};
 assert.deepEqual(await f.api.entry(),{mode:'pilot',competitorAvailable:true});
 await f.api.pilotMode(f.staff,{status:'off',expectedRevision:2,requestId:'entry-switch-off'});
 assert.deepEqual(await f.api.entry(),{mode:'competition',competitorAvailable:true});
});
