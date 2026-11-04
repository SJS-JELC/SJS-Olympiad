const {test,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLFieldSetElement','Element','Node','Event'])global[key]=dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React;
const {createRoot}=require('react-dom/client');
const {useServerQuestions,restoredAttempt}=require('../../src/cloud/CloudQuestion.tsx');
const {CompetitionSecurityContext}=require('../../src/security/CompetitionSecurityProvider.tsx');
const {SecurityController}=require('../../src/security/SecurityController.ts');
const {HttpError}=require('../../src/cloud/api.ts');
const {CodePanels}=require('../../src/components/CodePanels.tsx');
const {renderToStaticMarkup}=require('react-dom/server');
const empty=()=>({answers:{},feedback:{},retryAt:0,solvedAt:null});
let root,host,questions,controller,requests,answerResponse;
const view=()=>({role:'teacher',expiresAt:Date.now()+3600000,serverNow:Date.now(),configRevision:1,activeEvent:{id:'event',year:'U5',name:'Synthetic event',status:'active',revision:1,theoryEndsAt:Date.now()+3600000,endsAt:Date.now()+3600000},team:null,competition:{status:'NOT_STARTED',epoch:0},score:0,attempts:{}});
beforeEach(async()=>{
 requests=[];answerResponse=null;
 controller=new SecurityController(async action=>{if(action==='session?restore=1')throw new HttpError(401,'Sign in');return view();});
 await controller.login('synthetic','teacher');
 global.fetch=async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});if(answerResponse instanceof Error)throw answerResponse;return new Response(JSON.stringify(answerResponse),{status:200,headers:{'Content-Type':'application/json'}});};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 function Harness(){questions=useServerQuestions('event');return null;}
 await act(async()=>root.render(React.createElement(CompetitionSecurityContext.Provider,{value:controller},React.createElement(Harness))));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function send(definition,action){await act(async()=>{questions.action(definition,action);await questions.get(definition.id).flight;});}
const ordinary={id:'U5P3',parts:[{id:'drawing',fields:[{id:'drawing'}]}]};
test('server outcomes do not wipe local drawings/undo, navigation cache or a completed answer',async()=>{
 const drawing=JSON.stringify({kind:'molecule',graph:{atoms:[{id:1,element:'C'}],bonds:[]},history:[{atoms:[],bonds:[]}]});
 await send(ordinary,{type:'edit',field:'drawing',value:drawing});
 answerResponse={attempt:{...empty(),feedback:{answer:false},retryAt:Date.now()+20000},revision:1,score:0,serverNow:Date.now(),eventEndsAt:Date.now()+3600000};
 await send(ordinary,{type:'submit'});
 assert.equal(questions.get(ordinary.id).attempt.answers.drawing,drawing);
 assert.deepEqual(JSON.parse(requests[0].body.answers.drawing).history,[]);
 assert.equal(questions.get('U5P9').attempt.solvedAt,null);
 assert.equal(questions.get(ordinary.id).attempt.answers.drawing,drawing);
 assert.ok(questions.get(ordinary.id).attempt.retryAt>Date.now());
 questions.get(ordinary.id).attempt.retryAt=0;
 answerResponse={...answerResponse,attempt:{...empty(),feedback:{answer:true},solvedAt:Date.now()},revision:2};
 await send(ordinary,{type:'submit'});
 assert.equal(questions.get(ordinary.id).attempt.answers.drawing,drawing);
 assert.ok(questions.get(ordinary.id).completion);
});
test('uncertain CHECK retries its frozen request and accepts only confirmed success',async()=>{
 await send(ordinary,{type:'edit',field:'drawing',value:'synthetic drawing'});
 answerResponse=new Error('Connection failed');await send(ordinary,{type:'submit'});
 const original=structuredClone(requests[0].body);
 assert.equal(questions.get(ordinary.id).completion,undefined);
 answerResponse={attempt:{...empty(),solvedAt:Date.now()},revision:1,score:0,serverNow:Date.now(),eventEndsAt:Date.now()+3600000};
 await act(async()=>{await questions.flush(ordinary.id);});
 assert.deepEqual(requests[1].body,original);assert.ok(questions.get(ordinary.id).completion);
 assert.equal(questions.get(ordinary.id).attempt.answers.drawing,'synthetic drawing');
});
test('fresh restore strips old drawings/groupings/formulations/reports but retains active deadlines/results',()=>{
 const wrong=restoredAttempt({...empty(),answers:{drawing:'legacy'},retryAt:12345,interaction:{kind:'grouping',selected:['A','B']}});
 assert.deepEqual(wrong.answers,{});assert.deepEqual(wrong.interaction.selected,[]);assert.equal(wrong.retryAt,12345);
 const activeRun={id:5,sample:'citrus',concentration:12.5,startedAt:1000,deadline:5000};
 const restored=restoredAttempt({...empty(),answers:{composition:'legacy'},interaction:{kind:'gc',entered:true,activeRun,nextRunId:6,results:[{id:1}],concentrations:{citrus:20},measurements:[{}]}});
 assert.deepEqual(restored.answers,{});assert.deepEqual(restored.interaction.results,[]);assert.equal(restored.interaction.concentrations,undefined);assert.deepEqual(restored.interaction.activeRun,activeRun);
 const complete=restoredAttempt({...empty(),answers:{answer:'485'},solvedAt:1000});assert.equal(complete.solvedAt,1000);assert.deepEqual(complete.answers,{});
});
test('GC keeps reports locally, reconstructs captured inputs on retry and never resurrects old reports',async()=>{
 const {u5p5}=require('../../src/questions/u5p5/definition.ts');
 const record=questions.get(u5p5.id);record.loaded=true;
 await send(u5p5,{type:'gc-enter',now:Date.now()});await send(u5p5,{type:'gc-load',sample:'citrus',concentration:12.5,now:Date.now()});
 const now=Date.now(),activeRun={id:4,startedAt:now,deadline:now+4000};
 const canonical={kind:'gc',entered:true,activeRun,nextRunId:5,analyses:[],reference:'citrus',interval:[.5,.7],measurements:[],results:[{id:1,sample:'mystery',concentration:100,interval:[0,0]}]};
 answerResponse={attempt:{...empty(),interaction:canonical},revision:1,score:0,serverNow:now,eventEndsAt:now+3600000};
 await send(u5p5,{type:'gc-run',sample:'citrus',now});
 assert.equal(record.attempt.interaction.activeRun.sample,'citrus');assert.equal(record.attempt.interaction.activeRun.concentration,12.5);assert.deepEqual(record.attempt.interaction.results,[]);
 answerResponse={...answerResponse,attempt:{...empty(),interaction:{...canonical,activeRun:null}},revision:2,gcCompletedRunId:4};
 await send(u5p5,{type:'tick',now:now+4000});
 assert.deepEqual(record.attempt.interaction.results.map(row=>row.id),[4]);
 assert.equal(record.attempt.interaction.results[0].concentration,12.5);
 await send(u5p5,{type:'gc-delete-result',id:4,now:now+4001});
 answerResponse={...answerResponse,gcCompletedRunId:undefined,revision:3};await send(u5p5,{type:'tick',now:now+4002});
 assert.deepEqual(record.attempt.interaction.results,[]);
});
test('entry/recovery distinguish wrong-code invalid state from operational errors',async()=>{
 let failure=new HttpError(403,'Code not recognised.','INVALID_CODE');
 const security=new SecurityController(async action=>{if(action==='session?restore=1')throw new HttpError(401,'Sign in');throw failure;});
 await security.login('wrong','teacher');assert.equal(security.getSnapshot().invalidCode,'teacher');assert.equal(security.getSnapshot().error,null);
 security.clearCodeError();assert.equal(security.getSnapshot().invalidCode,null);
 failure=new HttpError(429,'Please wait');await security.login('wrong','competitor');assert.equal(security.getSnapshot().invalidCode,null);assert.equal(security.getSnapshot().error,'Please wait');
 const markup=renderToStaticMarkup(React.createElement(CodePanels,{id:'pin',label:'Teacher code',value:'',invalid:true,onChange(){}}));
 assert.match(markup,/aria-invalid="true"/);assert.match(markup,/code-panels--invalid/);
});
test('recovery rejects only the code visually, keeps operational errors actionable and never unlocks early',async()=>{
 const locked={...view(),role:'competitor',team:{id:'team',eventId:'event',year:'U5',claimGeneration:1},competition:{status:'LOCKED',epoch:2}};
 let outcome=new HttpError(403,'Teacher code not recognised.','INVALID_CODE');
 const security=new SecurityController(async action=>{
  if(action==='session?restore=1')throw new HttpError(401,'Sign in');
  if(action==='recovery'){if(outcome instanceof Error)throw outcome;return outcome;}
  return locked;
 });
 await security.login('synthetic');await security.unlock('wrong');
 assert.equal(security.getSnapshot().invalidCode,'recovery');assert.equal(security.getSnapshot().error,null);assert.equal(security.canAccessTheory(),false);
 security.clearCodeError();outcome=new HttpError(503,'Service unavailable');await security.unlock('synthetic');
 assert.equal(security.getSnapshot().invalidCode,null);assert.equal(security.getSnapshot().error,'Service unavailable');assert.equal(security.getSnapshot().session.status,'LOCKED');
 outcome={grant:'synthetic-grant'};await security.unlock('synthetic');
 assert.equal(security.getSnapshot().recoveryReady,true);assert.equal(security.canAccessTheory(),false);assert.equal(security.getSnapshot().server.role,'competitor');
});
test('interruption, cross-tab changes and lost activation responses keep access gated',async()=>{
 Object.defineProperty(document,'hidden',{configurable:true,value:false});document.hasFocus=()=>true;
 document.documentElement.requestFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:document.documentElement});};
 const bound={...view(),role:'competitor',team:{id:'team',eventId:'event',year:'U5',claimGeneration:1},competition:{status:'NOT_STARTED',epoch:0}};
 let status='NOT_STARTED',lose=false,delay;
 const security=new SecurityController(async action=>{
  if(action==='session?restore=1')throw new HttpError(401,'Sign in');
  if(action==='start'){status='ACTIVE';if(lose)throw new Error('Lost response');if(delay)return await new Promise(resolve=>{delay=resolve;});}
  if(action==='session?interrupt=1'||action==='breach')status='LOCKED';
  return {...bound,competition:{status,epoch:status==='NOT_STARTED'?0:1}};
 });
 await security.login('synthetic');await security.start();assert.equal(security.canAccessTheory(),true);
 security.externalChange();assert.equal(security.canAccessTheory(),false);assert.equal(security.getSnapshot().session.status,'LOCKED');
 status='NOT_STARTED';await security.login('synthetic');lose=true;await security.start();
 assert.equal(security.canAccessTheory(),false);assert.equal(security.getSnapshot().session.status,'LOCKED');
 lose=false;status='NOT_STARTED';await security.login('synthetic');delay=true;
 const pending=security.start();await Promise.resolve();await Promise.resolve();
 security.interrupt('WINDOW_BLUR');delay({...bound,competition:{status:'ACTIVE',epoch:1}});await pending;
 assert.equal(security.canAccessTheory(),false);assert.equal(security.getSnapshot().session.status,'LOCKED');
 Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});
});
test('fresh initialization discards prior session content even if a stale snapshot is returned',async()=>{
 const security=new SecurityController(async()=>({...view(),attempts:{U5P6:{...empty(),answers:{answer:'old'}}}}));
 await security.initialize();assert.equal(security.getSnapshot().server,null);assert.equal(security.canAccessTheory(),false);
});
