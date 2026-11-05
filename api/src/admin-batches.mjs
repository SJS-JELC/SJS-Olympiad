import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value && typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);

/** Durable item checkpoints; callers own authorization and the operation allowlist. */
export function adminBatches({repo,retry,assert,validId}){
 return async function run({requestId,eventId,kind,items,concurrency=3},execute){
  assert(validId(requestId) && requestId.length>=8,400,'A batch request identifier is required.');
  assert(Array.isArray(items) && items.length>0 && items.length<=100,400,'Choose between 1 and 100 batch items.');
  const payload=canonical({eventId,kind,items});assert(Buffer.byteLength(payload)<=48000,400,'This batch is too large. Split it into smaller groups.');
  const partitionKey='admin-batch-'+hash(requestId),fingerprint=hash(payload);
  await retry(async()=>{
   const old=await repo.get(partitionKey,'manifest');
   if(old){assert(old.fingerprint===fingerprint,409,'This batch request was already used for different changes.');return;}
   await repo.write({partitionKey,rowKey:'manifest',kind:'admin-batch',eventId,operation:kind,fingerprint,total:items.length});
  });
  const results=new Array(items.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
   while(cursor<items.length){
    const index=cursor++,rowKey='item-'+index;
    try{
     const old=await repo.get(partitionKey,rowKey);
     if(!old?.complete){
      const checkpoint=async state=>retry(async()=>{
       const current=await repo.get(partitionKey,rowKey);
       if(current?.complete || (current?.state?.stage ?? -1)>=state.stage)return current.state;
       await repo.write({partitionKey,rowKey,kind:'admin-batch-item',state,complete:false},current?.etag);return state;
      });
      const childId=step=>'batch-'+hash(requestId+'|'+index+'|'+step);
      await execute(items[index],{index,state:old?.state ?? {stage:0},checkpoint,childId});
      await retry(async()=>{const current=await repo.get(partitionKey,rowKey);if(!current?.complete)await repo.write({partitionKey,rowKey,kind:'admin-batch-item',state:current?.state ?? {stage:0},complete:true},current?.etag);});
     }
     results[index]={index,ok:true};
    }catch(error){results[index]={index,ok:false,status:error.status ?? 503,error:error.status?error.message:'This item could not be saved. Retry the same batch.'};}
   }
  }));
  const completed=results.filter(result=>result.ok).length;
  return {requestId,total:items.length,completed,complete:completed===items.length,results};
 };
}
