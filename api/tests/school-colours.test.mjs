import { teamScope, scopedKey, summaryRange } from '../src/layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../src/service.mjs';
import {handle} from '../src/http.mjs';
import {memoryRepository} from './helpers.mjs';

async function fixture(){
 const repo=memoryRepository(),api=createService(repo,{},()=>100000),staff=(await api.login({role:'teacher',code:'5678'})).token;
 const state=await api.eventCreate(staff,{name:'Colour test event',year:'L6',theoryStartsAt:0,theoryEndsAt:900000,requestId:'colour-event-create'}),event=state.events[0];
 const school=(await api.schoolCreate(staff,{name:'Synthetic Academy',requestId:'colour-school-create'})).school;
 await api.schoolTeams(staff,{eventId:event.id,schoolId:school.id,targetCount:2,requestId:'colour-team-create'});
 return {repo,api,staff,school,event};
}
const change=(f,extra={})=>({schoolId:f.school.id,colours:['#d63327','#001758'],expectedRevision:f.school.revision,requestId:'colour-save-request',...extra});
test('colour reads use defaults without rewriting records; saved pairs propagate to teams and pilot without changing claims',async()=>{
 const f=await fixture(),before=await f.repo.get('system','schools');
 assert.deepEqual(f.school.colours,['#9224DB']);
 assert.deepEqual((await f.api.schools(f.staff)).schools.find(s=>s.isHostSchool).colours,['#024633']);
 assert.deepEqual(await f.repo.get('system','schools'),before);
 const player=await f.api.login({role:'competitor',code:'1234'}),team=(await f.api.teams(player.token)).teams.find(t=>t.schoolId===f.school.id);
 await f.api.claim(player.token,{teamId:team.id});
 const claimed=await f.repo.get(teamScope(f.event.id,team.id),'team');
 const saved=await f.api.schoolColours(f.staff,change(f));assert.equal(saved.school.revision,2);
 assert.deepEqual(saved.school.colours,['#D63327','#001758']);
 assert.deepEqual((await f.api.teams(player.token)).teams.find(t=>t.id===team.id).schoolColours,saved.school.colours);
 assert.deepEqual((await f.api.pilot()).schools.find(s=>s.id===f.school.id).colours,saved.school.colours);
 assert.deepEqual(await f.repo.get(claimed.partitionKey,claimed.rowKey),claimed);
 await f.api.schoolRename(f.staff,{schoolId:f.school.id,name:'Renamed Academy',expectedRevision:2,requestId:'colour-rename-test'});
 assert.deepEqual((await f.api.schools(f.staff)).schools.find(s=>s.id===f.school.id).colours,saved.school.colours);
});
test('colour updates reject malformed input, nonteachers, stale revisions and reused requests',async()=>{
 const f=await fixture(),player=await f.api.login({role:'competitor',code:'1234'});
 await assert.rejects(f.api.schoolColours(player.token,change(f)),{status:403});
 for(const colours of [[],['red'],['#123'],['#123456','#654321','#FFFFFF'],['#123456;fill:url(x)'],null,'#123456',[12]])await assert.rejects(f.api.schoolColours(f.staff,change(f,{colours})),{status:400});
 const first=await f.api.schoolColours(f.staff,change(f));
 assert.equal((await f.api.schoolColours(f.staff,change(f))).school.revision,first.school.revision);
 await assert.rejects(f.api.schoolColours(f.staff,change(f,{colours:['#FFFFFF']})),{status:409});
 await assert.rejects(f.api.schoolColours(f.staff,change(f,{requestId:'colour-stale-request'})),{status:409});
 const one=await f.api.schoolColours(f.staff,change(f,{colours:['#abcdef'],expectedRevision:2,requestId:'colour-one-request'}));assert.deepEqual(one.school.colours,['#ABCDEF']);
});
test('concurrent edits commit one revision and HTTP route enforces authentication',async()=>{
 const f=await fixture();
 const results=await Promise.allSettled([f.api.schoolColours(f.staff,change(f)),f.api.schoolColours(f.staff,change(f,{requestId:'colour-other-request',colours:['#FFFFFF']}))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 const school=(await f.api.schools(f.staff)).schools.find(s=>s.id===f.school.id);
 const req={method:'POST',params:{action:'school-colours'},headers:{origin:'https://olympiad.masters-of-chemistry.app','content-type':'application/json'},body:change(f,{expectedRevision:school.revision,requestId:'http-colour-request'})};
 assert.equal((await handle(req,()=>f.api)).status,401);
 const response=await handle({...req,headers:{...req.headers,cookie:'__Host-olympiad-session='+f.staff}},()=>f.api);assert.equal(response.status,200);
});
