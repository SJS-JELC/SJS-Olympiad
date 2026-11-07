// Bounded real-storage sample. Never queries existing application records.
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {investigationBudget,tableClient,target} from './azure-table-tools.mjs';

const budget=await investigationBudget(),samples=[];let client,probe;
const cleanupOnly=process.argv.slice(2).includes('--cleanup');
async function sample(operation,run){const start=performance.now();await run();samples.push({operation,elapsedMs:+(performance.now()-start).toFixed(2)});}
try{
 const pending=budget.ledger.probes.find(item=>!item.cleaned);
 if(pending&&!cleanupOnly)throw Error('A prior probe needs cleanup before another sample.');
 if(!cleanupOnly&&budget.ledger.attempts>32)throw Error('Insufficient remaining budget for this complete sample; no calls made.');
 if(cleanupOnly&&(!pending||!/^performance-probe-[a-f0-9-]{36}$/.test(pending.partitionKey)||pending.rowKey!=='team:sample'))throw Error('No valid pending probe.');
 client=await tableClient({policy:budget.policy});
 if(cleanupOnly)probe=pending;
 else {
 probe={partitionKey:'performance-probe-'+randomUUID(),rowKey:'team:sample',cleaned:false};
 budget.ledger.probes.push(probe);await budget.save();
 await sample('create',()=>client.createEntity({partitionKey:probe.partitionKey,rowKey:probe.rowKey,kind:'performance-probe',value:1}));
 for(let i=0;i<5;i++)await sample('point-read',()=>client.getEntity(probe.partitionKey,probe.rowKey));
 await sample('partition-range',async()=>{for await(const ignored of client.listEntities({queryOptions:{filter:`PartitionKey eq '${probe.partitionKey}' and RowKey ge 'team:' and RowKey lt 'team;'`}})){void ignored;}});
 const current=await client.getEntity(probe.partitionKey,probe.rowKey);
 await sample('conditional-update',()=>client.updateEntity({partitionKey:probe.partitionKey,rowKey:probe.rowKey,kind:'performance-probe',value:2},'Replace',{etag:current.etag}));
 }
}catch{
 console.error('Probe could not complete. No application records were queried or changed; inspect the local operator ledger for cleanup status.');process.exitCode=1;
}finally{
 if(client&&probe){
  budget.startCleanup();
  try{
   let row;try{row=await client.getEntity(probe.partitionKey,probe.rowKey);}catch(error){if(error.statusCode!==404)throw error;}
   if(row)await sample('cleanup',()=>client.deleteEntity(probe.partitionKey,probe.rowKey,{etag:row.etag}));
   try{await client.getEntity(probe.partitionKey,probe.rowKey);throw Error('Probe still exists');}catch(error){if(error.statusCode!==404)throw error;}
   probe.cleaned=true;await budget.save();
  }catch{console.error('Probe cleanup remains pending in the local operator ledger. Do not rerun the sample.');process.exitCode=1;}
 }
 console.log(JSON.stringify({target,kind:'direct-Azure-storage-small-sample',samples,totalInvestigationAttempts:budget.ledger.attempts,limit:50,cleanupComplete:probe?.cleaned??null,limitations:'No application API, percentile or capacity claim. Azure CLI management calls are separate from this Table HTTP budget.'},null,2));
 await budget.close();
}
