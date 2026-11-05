// Synthetic, loopback-only production-handler first-open evidence. No Azure I/O.
import http from 'node:http';
import {performance} from 'node:perf_hooks';
import {gzipSync,brotliCompressSync,constants} from 'node:zlib';
import {writeFileSync} from 'node:fs';
import {createService} from '../api/src/service.mjs';
import {memoryRepository} from '../api/src/memory-storage.mjs';
import {handle} from '../api/src/http.mjs';
import {presentationCatalogue} from '../api/src/presentation/registry.mjs';
const now=Date.parse('2026-11-05T12:00:00Z'),origin='https://olympiad.masters-of-chemistry.app';
const cookie=token=>'__Host-olympiad-session='+token;
const sizes=body=>({raw:body.length,gzip:gzipSync(body,{level:9}).length,brotli:brotliCompressSync(body,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length});
const sum=rows=>Object.fromEntries(['raw','gzip','brotli'].map(k=>[k,rows.reduce((n,v)=>n+v[k],0)]));
const contexts=new Map(),byToken=new Map();
for(const year of ['L5','U5','L6','U6']){
 const repo=memoryRepository(),service=createService(repo,{},()=>now),teacher=(await service.login({role:'teacher',code:'5678'})).token;
 const event=(await service.eventCreate(teacher,{name:'Synthetic local '+year,year,theoryStartsAt:now-60000,theoryEndsAt:now+3600000,...(year!=='U5'?{practicalStartsAt:now-60000,practicalEndsAt:now+3600000}:{})})).events[0];
 await service.eventActivate(teacher,{eventId:event.id,expectedRevision:1});
 const player=(await service.login({role:'competitor',code:'1234'})).token;
 await service.claim(player,{teamId:(await service.teams(player)).teams[0].id});await service.start(player);
 contexts.set(year,{service,teacher,player,event});byToken.set(teacher,service);byToken.set(player,service);
}
const direct=async(service,token,action,body)=>{
 const result=await handle({method:'POST',params:{action},headers:{origin,'content-type':'application/json',cookie:cookie(token)},body,rawBody:JSON.stringify(body)},()=>service);
 if(result.status!==200)throw Error(action+' failed '+result.status+' '+JSON.stringify(result.body));
 return {result,bytes:result.isRaw?result.body:Buffer.from(JSON.stringify(result.body))};
};
const contentIds=['question','practical'].flatMap(kind=>presentationCatalogue(kind).map(({id})=>({kind,id,year:kind==='question'?id.slice(0,2):id})));
const payloads=[];
for(const entry of contentIds){
 const {service,player}=contexts.get(entry.year),body=entry.kind==='question'?{questionId:entry.id}:{contentId:entry.id};
 const {result,bytes}=await direct(service,player,entry.kind+'-content',body);
 const record=result.body,assets=[];
 for(const asset of record.assets){const output=await direct(service,player,'content-asset',{...body,kind:entry.kind,version:record.version,assetId:asset.id});assets.push({id:asset.id,mimeType:asset.mimeType,...sizes(output.bytes)});}
 let selected=null;
 if(['U5P5','L6P3'].includes(entry.id)){const output=await direct(service,player,'question',{questionId:entry.id});selected={action:'question',...sizes(output.bytes)};}
 if(entry.kind==='practical'){const output=await direct(service,player,'practical',{});selected={action:'practical',...sizes(output.bytes)};}
 const staticTotal=sum([sizes(bytes),...assets]);
 payloads.push({...entry,version:record.version,record:sizes(bytes),assets,selected,staticTotal,total:sum([staticTotal,...(selected?[selected]:[])])});
}
// Keep heavy practical and selected GC in every cohort, followed by full-catalogue diversity.
const scenarios=[contentIds.find(v=>v.kind==='practical'&&v.id==='L6'),contentIds.find(v=>v.id==='U5P5'),contentIds.find(v=>v.id==='L5P1'),...contentIds.filter(v=>!(v.kind==='practical'&&v.id==='L6')&&!['U5P5','L5P1'].includes(v.id))];
const clients=[];
for(let i=0;i<100;i++){
 const entry=scenarios[i%scenarios.length],ctx=contexts.get(entry.year),token=(await ctx.service.login({role:'competitor',code:'1234'})).token;
 const team=(await ctx.service.teamAdd(ctx.teacher,{eventId:ctx.event.id,name:'Synthetic load '+(i+1)})).teams.find(t=>t.name==='Synthetic load '+(i+1));
 await ctx.service.claim(token,{teamId:team.id});await ctx.service.start(token);
 byToken.set(token,ctx.service);clients.push({entry,token});
}
let served=0;
const server=http.createServer(async(req,res)=>{
 try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const rawBody=Buffer.concat(chunks).toString(),body=JSON.parse(rawBody),token=/__Host-olympiad-session=([^;]+)/.exec(req.headers.cookie??'')?.[1],action=new URL(req.url,'http://127.0.0.1').pathname.split('/').at(-1),service=byToken.get(token);
  if(!service)throw Error('Unknown synthetic session');
  const result=await handle({method:req.method,params:{action},headers:req.headers,body,rawBody},()=>service),bytes=result.isRaw?result.body:Buffer.from(JSON.stringify(result.body));
  res.writeHead(result.status,{...result.headers,'Content-Length':bytes.length});res.end(bytes);served+=bytes.length;
 }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
async function post(token,action,body){const response=await fetch(`http://127.0.0.1:${port}/api/olympiad/${action}`,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookie(token)},body:JSON.stringify(body)}),bytes=Buffer.from(await response.arrayBuffer());if(response.status!==200)throw Error(action+' '+response.status+' '+bytes);return {bytes,json:response.headers.get('content-type')?.startsWith('application/json')?JSON.parse(bytes):undefined};}
const loads=[];
try{
 for(const concurrency of [25,50,100]){
  const start=performance.now(),bytesBefore=served;const outcomes=await Promise.all(clients.slice(0,concurrency).map(async({entry,token})=>{
   const begin=performance.now();let bytes=0,requests=0;
   try{
    const body=entry.kind==='question'?{questionId:entry.id}:{contentId:entry.id};
    const record=await post(token,entry.kind+'-content',body);bytes+=record.bytes.length;requests++;
    for(const asset of record.json.assets){const out=await post(token,'content-asset',{...body,kind:entry.kind,version:record.json.version,assetId:asset.id});bytes+=out.bytes.length;requests++;}
    if(['U5P5','L6P3'].includes(entry.id)){const out=await post(token,'question',{questionId:entry.id});bytes+=out.bytes.length;requests++;}
    if(entry.kind==='practical'){const out=await post(token,'practical',{});bytes+=out.bytes.length;requests++;}
    return {kind:entry.kind,id:entry.id,ms:performance.now()-begin,bytes,requests};
   }catch(error){return {kind:entry.kind,id:entry.id,ms:performance.now()-begin,bytes,requests,error:error.message};}
  }));
  const latency=outcomes.map(v=>v.ms).sort((a,b)=>a-b),percentile=p=>latency[Math.ceil(p*latency.length)-1];
  loads.push({concurrency,elapsedMs:performance.now()-start,requests:outcomes.reduce((n,v)=>n+v.requests,0),responseBodyBytes:outcomes.reduce((n,v)=>n+v.bytes,0),serverBodyBytes:served-bytesBefore,errors:outcomes.filter(v=>v.error).length,latencyMs:{min:latency[0],p50:percentile(.5),p95:percentile(.95),max:latency.at(-1)},outcomes});
 }
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
const result={timestamp:new Date().toISOString(),node:process.version,mode:'Loopback HTTP with production handle/service and synthetic in-memory repositories; real uncompressed response bodies; session setup excluded from latency',compression:'Per-response local gzip level 9 / Brotli quality 11; sums are individually compressed bodies. HTTP load uses identity encoding; excludes HTTP headers/TLS and browser render time.',limitations:'One local Node process/loopback and memory repository; no Azure runtime/storage/compression/capacity acceptance. Cohorts reuse warmed modules and sessions, but each opening transfers full record/assets/selected state without a client cache.',payloads,loads};
const target=process.argv[2];if(!target)throw Error('Provide an evidence JSON output path.');writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({payloads:payloads.length,loads:loads.map(({outcomes,...v})=>v)},null,2));
