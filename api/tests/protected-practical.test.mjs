import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createService} from '../src/service.mjs';
import {memoryRepository} from './helpers.mjs';
import {presentationRecord} from '../src/presentation/registry.mjs';
import {validateRecord} from '../src/presentation/record.mjs';
import {handle} from '../src/http.mjs';

async function fixture(year='L6',status='active') {
 const repo=memoryRepository();let time=100000;
 const api=createService(repo,{},()=>time),teacher=(await api.login({role:'teacher',code:'5678'})).token;
 const event=(await api.eventCreate(teacher,{name:'Synthetic practical fixture',year,theoryStartsAt:200000,theoryEndsAt:300000,practicalStartsAt:350000,practicalEndsAt:400000})).events[0];
 if(status==='active')await api.eventActivate(teacher,{eventId:event.id,expectedRevision:1});
 const player=(await api.login({role:'competitor',code:'1234'})).token,team=(await api.teams(player)).teams[0];await api.claim(player,{teamId:team.id});
 return {api,repo,teacher,player,event,team,setTime:value=>time=value};
}
for(const year of ['L5','L6','U6'])for(const status of ['draft','active'])test(`${year} ${status} protocol exact independent opening and closing; results remain numeric read-only`,async()=>{
 const f=await fixture(year,status),input={contentId:year};
 await assert.rejects(f.api.practicalContent(f.player,input),{status:423});await f.api.start(f.player);
 for(const time of [100000,200000,300000,349999,400000,400001]){
  f.setTime(time);await assert.rejects(f.api.practicalContent(f.player,input),{status:403});
  if(year==='L6')await assert.rejects(f.api.contentAsset(f.player,{kind:'practical',...input,version:'1',assetId:'protocol-image'}),{status:403});
 }
 for(const time of [350000,399999]){
  f.setTime(time);const before=JSON.stringify([...f.repo.rows]);const value=await f.api.practicalContent(f.player,input);
  assert.equal(value.presentation.renderer,year);assert.ok(value.presentation.protocol.length>100);assert.equal(value.serverNow,time);
  if(year==='L6')assert.ok((await f.api.contentAsset(f.player,{kind:'practical',...input,version:'1',assetId:'protocol-image'})).body.length>1000);
  assert.equal(JSON.stringify([...f.repo.rows]),before,'presentation reads cannot save responses or score');
 }
 await f.api.practicalSave(f.player,{requestId:'synthetic-precision-save',expectedRevision:0,changes:{numPracticalResponse4:'0.000'}});
 f.setTime(400000);const result=await f.api.practical(f.player,{});assert.equal(result.readOnly,true);assert.deepEqual(result.responses.numPracticalResponse4,{text:'0.000',value:0});
 for(const field of ['presentation','protocol','title','fields','assets'])assert.equal(result[field],undefined);
});

test('all practical records preserve original UTF-8 protocol and labels; raster provenance is source-hashed',()=>{
 const original=JSON.parse(readFileSync(new URL('../../src/practicals/protocols.json',import.meta.url),'utf8'));
 for(const year of ['L5','L6','U6']){
  const record=presentationRecord('practical',year);assert.equal(record.presentation.title,original[year].title);assert.equal(record.presentation.protocol,original[year].protocol);assert.equal(record.presentation.html,original[year].html);
  assert.equal(record.presentation.fields.at(-1).key,'numPracticalResponse4');assert.throws(()=>validateRecord({...record,presentation:{...record.presentation,protocol:''}}));assert.throws(()=>validateRecord({...record,presentation:{...record.presentation,fields:[]}}));
 }
 assert.deepEqual(presentationRecord('practical','L6').presentation.fields.map(field=>field.key),['numPracticalResponse3','numPracticalResponse4']);
 const provenance=JSON.parse(readFileSync(new URL('../src/presentation/assets/l6/provenance.json',import.meta.url),'utf8'));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');assert.equal(hash(readFileSync(new URL('../../src/practicals/assets/mohr-crisps.svg',import.meta.url))),provenance.sourceSha256);assert.equal(hash(presentationRecord('practical','L6').assets[0].body),provenance.assetSha256);
 assert.equal(presentationRecord('practical','U5'),undefined);
});

test('anonymous/pilot/wrong-year/event/version/path reject; teacher catalogue previews bypass times without writes',async()=>{
 const f=await fixture();await f.api.start(f.player);f.setTime(350000);
 for(const token of [undefined,'pilot-private-credential'])for(const read of [()=>f.api.practicalContent(token,{contentId:'L6'}),()=>f.api.contentAsset(token,{kind:'practical',contentId:'L6',version:'1',assetId:'protocol-image'})])await assert.rejects(read(),{status:401});
 for(const contentId of ['L5','U6','U5','../L6'])await assert.rejects(f.api.practicalContent(f.player,{contentId}),{status:404});
 await assert.rejects(f.api.practicalContent(f.player,{contentId:'L6',eventId:'wrong'}),{status:403});
 for(const override of [{version:'2'},{assetId:'../../mohr-crisps.png'},{contentId:'L5'}])await assert.rejects(f.api.contentAsset(f.player,{kind:'practical',contentId:'L6',version:'1',assetId:'protocol-image',...override}),error=>[400,404].includes(error.status));
 f.setTime(100000);
 for(const year of ['L5','L6','U6']){const before=JSON.stringify([...f.repo.rows]);assert.equal((await f.api.practicalContent(f.teacher,{contentId:year,eventId:'catalogue-'+year})).id,year);assert.equal(JSON.stringify([...f.repo.rows]),before);}
 assert.deepEqual((await f.api.contentCatalogue(f.teacher)).practicals.map(item=>item.id),['L5','L6','U6']);
 await assert.rejects(f.api.practicalContent(f.teacher,{contentId:'L6',eventId:'catalogue-L5'}),{status:404});
});
for(const change of ['locked','release','ended','logout','expired'])test(`practical record and PNG reject ${change} authority`,async()=>{
 const f=await fixture();await f.api.start(f.player);f.setTime(350000);
 if(change==='locked')await f.api.breach(f.player,{epoch:2});
 if(change==='release')await f.api.teamRelease(f.teacher,{eventId:f.event.id,teamId:f.team.id,confirm:true});
 if(change==='ended')await f.api.eventEnd(f.teacher,{eventId:f.event.id,expectedRevision:2,confirm:true});
 if(change==='logout')await f.api.logout(f.player);
 if(change==='expired')f.setTime(100000+8*60*60*1000);
 for(const read of [()=>f.api.practicalContent(f.player,{contentId:'L6'}),()=>f.api.contentAsset(f.player,{kind:'practical',contentId:'L6',version:'1',assetId:'protocol-image'})])await assert.rejects(read(),error=>[401,403,423].includes(error.status));
});
test('protected practical PNG transport is real bytes, no-store and nosniff',async()=>{
 const f=await fixture();const response=await handle({method:'POST',params:{action:'content-asset'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json',cookie:'__Host-olympiad-session='+f.teacher},body:{kind:'practical',contentId:'L6',version:'1',assetId:'protocol-image',eventId:'catalogue-L6'}},()=>f.api);
 assert.equal(response.status,200);assert.equal(response.isRaw,true);assert.equal(response.headers['Cache-Control'],'no-store');assert.equal(response.headers['X-Content-Type-Options'],'nosniff');assert.equal(response.headers['Content-Type'],'image/png');assert.deepEqual([...response.body.subarray(0,8)],[137,80,78,71,13,10,26,10]);
});
