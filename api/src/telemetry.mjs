import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

// Only code-owned dimensions may enter telemetry. Never accept request IDs,
// URLs, keys, exception text, or other caller-provided labels.
const actions = new Set(('roster removed-teams pilot pilot-report availability session events teams schools leaderboard diagnostics entry team-remove team-restore teams-batch schools-import login logout event-create event-setup school-create school-delete school-colours school-rename school-teams school-link school-resume event-update event-year-change event-activate event-draft event-end codes-update practice-start team-add team-release team-delete claim start breach recovery resume hydrate question draft submit action practical practical-save question-content practical-content content-asset content-catalogue pilot-enter pilot-submit pilot-mode').split(' '));
const phaseNames = new Set(['validation','getService','operation','bootstrap','settings','authenticate','ownership','throttle','presentation']);
const operations = ['get','list','write','remove','batch'];
const requests = new AsyncLocalStorage();
const capacity = 256;
const recent = [];
let next = 0, totalRequests = 0;
const elapsed = start => Math.max(0, performance.now() - start);
const rounded = value => Math.round(value * 100) / 100;
const metric = () => ({count:0,errors:0,durationMs:0,pages:0,rows:0,transactionEntities:0,maxTransactionEntities:0});
const storageMetrics = () => Object.fromEntries(operations.map(name => [name,{
  ...metric(),...(name==='list'?{queryClasses:{point:0,partition:0,range:0,unpartitioned:0}}:{}),
}]));
const active = () => { const state=requests.getStore(); return state && !state.finished ? state : null; };

export function startPhase(name) {
  const state=active();
  if(!state || !phaseNames.has(name))return ()=>{};
  const start=performance.now();let stopped=false;
  return () => {
    if(stopped || state.finished)return;
    stopped=true;
    const phase=state.phases[name] ??= {count:0,totalMs:0};
    phase.count++;phase.totalMs+=elapsed(start);
  };
}
export async function measurePhase(name,operation) {
  const stop=startPhase(name);
  try{return await operation();}finally{stop();}
}
export function recordConflictRetry() { const state=active();if(state)state.conflictRetries++; }

/** Count completed SDK pages, including empty pages; never retain continuation tokens. */
export function recordListPage(rows,completedPage=true) {
  const state=active();
  if(state && Number.isSafeInteger(rows) && rows>=0){if(completedPage)state.storage.list.pages++;state.storage.list.rows+=rows;}
}

/** Wrap each adapter once. In-memory lists have rows but no transport pages.
 * Batch rows are successful entities; transactionEntities also includes failures.
 * Missing reads/removes are normal logical successes, even if HTTP returned 404.
 */
export function instrumentRepository(repo,{pagedList=false}={}) {
  for(const name of operations) {
    const original=repo[name];
    repo[name]=async function(...args) {
      const state=active();
      if(!state)return original.apply(this,args);
      const value=state.storage[name],start=performance.now();
      const size=name==='batch' && Array.isArray(args[0]) ? args[0].length : 0;
      value.count++;value.transactionEntities+=size;
      value.maxTransactionEntities=Math.max(value.maxTransactionEntities,size);
      // Classify only explicit key constraints. Rejected unpartitioned calls
      // remain visible as errors; arbitrary property filters are never ranges.
      if(name==='list')value.queryClasses[args[0]?.partitionKey===undefined?'unpartitioned':args[0]?.rowKeyFrom!==undefined || args[0]?.rowKeyTo!==undefined?'range':'partition']++;
      try {
        const result=await original.apply(this,args);
        if(!state.finished) {
          if(name==='get')value.rows+=result==null?0:1;
          else if(name==='list' && !pagedList)value.rows+=result.length;
          else if(name==='write' || name==='remove')value.rows++;
          else if(name==='batch')value.rows+=size;
        }
        return result;
      } catch(error) {if(!state.finished)value.errors++;throw error;}
      finally {if(!state.finished)value.durationMs+=elapsed(start);}
    };
  }
  return repo;
}

/** The SDK places perRetry policies after Sign, below its retry policy. This
 * counts actual sends, including createTable, paging, retry and batch envelopes.
 * Transport failures count non-2xx/3xx HTTP attempts and thrown transport errors.
 */
export function tableTelemetryOptions() {
  return {additionalPolicies:[{position:'perRetry',policy:{name:'olympiadTransportTelemetry',
    async sendRequest(request,nextPolicy) {
      const state=active();
      if(!state)return nextPolicy(request);
      const start=performance.now();state.transport.attempts++;
      try {
        const response=await nextPolicy(request);
        if(!state.finished && response.status>=400)state.transport.failures++;
        return response;
      } catch(error) {if(!state.finished)state.transport.failures++;throw error;}
      finally {if(!state.finished)state.transport.durationMs+=elapsed(start);}
    },
  }}]};
}

function snapshot(state,status) {
  return {action:state.action,method:state.method,status,durationMs:rounded(elapsed(state.start)),
    phases:Object.entries(state.phases).map(([name,value])=>({name,count:value.count,totalMs:rounded(value.totalMs)})),
    storage:Object.fromEntries(operations.map(name=>[name,{...state.storage[name],
      ...(name==='list'?{queryClasses:{...state.storage.list.queryClasses}}:{}),durationMs:rounded(state.storage[name].durationMs)}])),
    conflictRetries:state.conflictRetries,transport:{...state.transport,durationMs:rounded(state.transport.durationMs)}};
}

/** The logger is best-effort and receives only this module's explicit projection.
 * A broken logger must never turn an accepted write into a failed response.
 */
export async function withRequestTelemetry(action,method,operation,log) {
  const state={action:actions.has(action)?action:'unknown',method:['GET','POST'].includes(method)?method:'OTHER',
    requestId:randomUUID(),start:performance.now(),phases:{},storage:storageMetrics(),
    conflictRetries:0,transport:{attempts:0,failures:0,durationMs:0},finished:false};
  return requests.run(state,async()=>{
    let response;
    try {response=await operation();return response;}
    finally {
      const status=Number.isInteger(response?.status) && response.status>=100 && response.status<=599?response.status:503;
      const sample=snapshot(state,status);
      state.finished=true;
      const completedAt=Date.now();
      recent[next]={...sample,completedAt};next=(next+1)%capacity;
      totalRequests=Math.min(Number.MAX_SAFE_INTEGER,totalRequests+1);
      if(response) {
        const coarse=value=>Math.ceil(value/10)*10;
        const phase=name=>sample.phases.find(item=>item.name===name)?.totalMs ?? 0;
        response.headers={...response.headers,'X-Request-Id':state.requestId,
          'Server-Timing':`total;dur=${coarse(sample.durationMs)}, init;dur=${coarse(phase('getService'))}, app;dur=${coarse(phase('operation'))}`};
      }
      try {const result=log?.({event:'olympiad.request',schemaVersion:1,requestId:state.requestId,...structuredClone(sample)});
        // Also contain asynchronous logger failures without awaiting network I/O.
        if(result && typeof result.catch==='function')result.catch(()=>{});
      } catch { /* Observability cannot change API behaviour. */ }
    }
  });
}

/** Rolling completed requests from this Node process only. No durable writes,
 * IDs, or unbounded route maps. Nested/parallel phase durations are inclusive;
 * their sum (and summed storage latency) may exceed total wall time.
 */
export function performanceSnapshot() {
  const samples=recent.filter(Boolean),groups=new Map();
  for(const sample of samples) {
    const key=sample.method+' '+sample.action;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(sample);
  }
  const routes=[...groups.values()].map(items=>{
    const durations=items.map(item=>item.durationMs).sort((a,b)=>a-b);
    const phases=new Map(),storage=storageMetrics(),transport={attempts:0,failures:0,durationMs:0};
    let errors=0,conflictRetries=0;
    for(const item of items) {
      if(item.status>=400)errors++;
      conflictRetries+=item.conflictRetries;
      for(const phase of item.phases) {
        const value=phases.get(phase.name) ?? {name:phase.name,count:0,totalMs:0};
        value.count+=phase.count;value.totalMs+=phase.totalMs;phases.set(phase.name,value);
      }
      for(const name of operations)for(const field of Object.keys(storage[name])) {
        if(field==='queryClasses')for(const kind of Object.keys(storage[name].queryClasses))storage[name].queryClasses[kind]+=item.storage[name].queryClasses[kind];
        else if(field==='maxTransactionEntities')storage[name][field]=Math.max(storage[name][field],item.storage[name][field]);
        else storage[name][field]+=item.storage[name][field];
      }
      for(const field of Object.keys(transport))transport[field]+=item.transport[field];
    }
    for(const name of operations)storage[name].durationMs=rounded(storage[name].durationMs);
    transport.durationMs=rounded(transport.durationMs);
    return {action:items[0].action,method:items[0].method,requests:items.length,errors,
      durationMs:{mean:rounded(durations.reduce((sum,value)=>sum+value,0)/items.length),
        p50:durations[Math.ceil(items.length*.5)-1],p95:durations[Math.ceil(items.length*.95)-1],max:durations.at(-1)},
      phases:[...phases.values()].map(value=>({...value,totalMs:rounded(value.totalMs)})).sort((a,b)=>a.name.localeCompare(b.name)),
      storage,conflictRetries,transport};
  }).sort((a,b)=>(a.method+' '+a.action).localeCompare(b.method+' '+b.action));
  return {schemaVersion:1,scope:'instance',window:{capacity,count:samples.length,
    startedAt:samples.length?Math.min(...samples.map(item=>item.completedAt)):null,
    endedAt:samples.length?Math.max(...samples.map(item=>item.completedAt)):null},totalRequests,routes};
}
