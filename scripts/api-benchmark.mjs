// Local-only controlled benchmark. This module never imports an Azure client.
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {createService} from '../api/src/service.mjs';
import {memoryRepository} from '../api/src/memory-storage.mjs';
import {handle} from '../api/src/http.mjs';

const delayMs=Number(process.env.BENCHMARK_STORAGE_DELAY_MS??2);
if(!Number.isFinite(delayMs)||delayMs<0||delayMs>100)throw Error('Invalid simulated storage delay');
const repo=memoryRepository([],{allowBootstrap:true});let measuring=false,counts={};
for(const method of ['get','write','remove','batch','list']){
 const original=repo[method].bind(repo);
 repo[method]=async(...args)=>{
  if(measuring){counts[method]=(counts[method]??0)+1;if(method==='list'){const kind=args[0]?.partitionKey?'partitionQueries':'unpartitionedQueries';counts[kind]=(counts[kind]??0)+1;}if(delayMs)await sleep(delayMs);}
  const result=await original(...args);
  if(measuring&&method==='list')counts.returnedRows=(counts.returnedRows??0)+result.length;
  return result;
 };
}
const now=Date.now(),api=createService(repo,{},()=>now);
const staff=(await api.login({role:'teacher',code:'5678'})).token;
const created=await api.eventCreate(staff,{name:'Synthetic benchmark',year:'L6',theoryStartsAt:now-10000,theoryEndsAt:now+3600000,practicalStartsAt:now-10000,practicalEndsAt:now+3600000,requestId:'benchmark-event'});
const eventId=created.createdEventId;
for(let n=1;n<50;n++){
 const {school}=await api.schoolCreate(staff,{name:`Synthetic school ${n}`,requestId:`benchmark-school-${n}`});
 await api.schoolTeams(staff,{eventId,schoolId:school.id,targetCount:4,requestId:`benchmark-teams-${n}`});
}
const teams=(await api.teams(staff,{eventId})).teams;
const pupils=[];
for(let i=0;i<100;i++){
 const token=(await api.login({role:'competitor',code:'1234'})).token;
 await api.claim(token,{teamId:teams[i].id});await api.start(token);pupils.push(token);
}
const pupil=pupils[0];
const scenarios=[];
async function sample(name,operation){
 counts={};measuring=true;const started=performance.now();let result;
 try{result=await operation();}finally{measuring=false;}
 scenarios.push({name,elapsedMs:+(performance.now()-started).toFixed(2),repository:{...counts}});return result;
}
async function call(action,body,token=staff){
 const response=await handle({method:body===undefined?'GET':'POST',params:{action},query:{eventId},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:`__Host-olympiad-session=${token}`},body},()=>api);
 if(response.status!==200)throw Error(`Benchmark ${action} failed (${response.status})`);
 return response.body;
}
await sample('entry',()=>call('entry'));
await sample('leaderboard',()=>call('leaderboard'));
await sample('question',()=>call('question',{questionId:'L6P8'},pupil));
await sample('hydrate',()=>call('hydrate',{},pupil));
await sample('practical',()=>call('practical',{},pupil));
await sample('remove-through-complete-roster',async()=>{
 const result=await call('team-remove',{eventId,rosterEventId:eventId,teamId:teams.at(-1).id,expectedEntryRevision:0,confirm:true,requestId:'benchmark-remove'});
 if(result.roster?.status==='complete')return;
 // Baseline client flow before the single-response contract exists.
 await Promise.all([call('schools'),call('teams'),call('removed-teams')]);
});
await sample('100-concurrent-question-reads',()=>Promise.all(pupils.map(token=>call('question',{questionId:'L6P8'},token))));
console.log(JSON.stringify({kind:'local-simulated-storage',schoolCount:50,teamCount:teams.length,concurrency:100,delayPerRepositoryCallMs:delayMs,azureAttempts:0,scenarios},null,2));
