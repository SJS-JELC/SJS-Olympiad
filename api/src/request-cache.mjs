/** Reuse only immutable snapshots of the two control records within a request.
 * Sessions, ownership, manifests, gameplay and receipts are always fresh.
 * Callers opt out for post-read security checks and final roster readback.
 */
export function requestRepository(repository,context) {
  const invalidate=()=>context.getStore()?.reads.clear();
  const fresh=operation=>{
    const state=context.getStore();
    return state?context.run({...state,fresh:true},operation):operation();
  };
  const repo=Object.create(repository);
  repo.get=async(partitionKey,rowKey)=>{
    const state=context.getStore();
    if(!state || state.fresh || partitionKey!=='system' || !['settings','schools'].includes(rowKey))return repository.get(partitionKey,rowKey);
    let pending=state.reads.get(rowKey);
    if(!pending){
      pending=Promise.resolve().then(()=>repository.get(partitionKey,rowKey));
      state.reads.set(rowKey,pending);
    }
    try{return structuredClone(await pending);}
    catch(error){if(state.reads.get(rowKey)===pending)state.reads.delete(rowKey);throw error;}
  };
  for(const operation of ['write','remove','batch'])repo[operation]=async(...args)=>{
    invalidate();
    try{return await repository[operation](...args);}finally{invalidate();}
  };
  repo.list=(...args)=>repository.list(...args);
  return {repo,invalidate,fresh};
}
