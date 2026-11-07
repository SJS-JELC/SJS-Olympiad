import { memoryRepository as createMemoryRepository } from '../src/memory-storage.mjs';
import { scopedKey, scopedRange, teamScope } from '../src/layout.mjs';

export const physicalEntity=entity=>typeof entity.partitionKey==='object'?{...entity,...scopedKey(entity.partitionKey,entity.rowKey)}:entity;
export const keyMatches=(partitionKey,rowKey,scope,logical)=>{
  const key=scopedKey(scope,logical);return partitionKey===key.partitionKey && rowKey===key.rowKey;
};

/** Test-only fault injection around the same adapter used by local preview. */
export function memoryRepository(initial = []) {
  const repo = createMemoryRepository(initial.map(physicalEntity),{allowBootstrap:true,allowLegacyBootstrap:true});
  const {get,write,remove,list,batch}=repo;
  // Test fixtures explicitly use teamScope objects. Runtime code and the rows
  // map always use real event partitions/RowKeys; old string keys are not aliases.
  repo.get=(scope,row)=>{const key=scopedKey(scope,row);return get(key.partitionKey,key.rowKey);};
  repo.write=(entity,etag)=>write(physicalEntity(entity),etag);
  repo.remove=(scope,row,etag)=>{const key=scopedKey(scope,row);return remove(key.partitionKey,key.rowKey,etag);};
  repo.list=async(filter={})=>{
    if(typeof filter.partitionKey!=='object')return list(filter);
    const {partitionKey:scope,...rest}=filter;
    const rows=await list({...scopedRange(scope),...rest});
    const key=scopedKey(scope,'team'),summary=await get(key.partitionKey,key.rowKey);
    if(summary && Object.entries(rest).every(([key,value])=>summary[key]===value))rows.unshift(summary);
    return rows;
  };
  repo.beforeBatch = null;
  repo.failBatch = false;
  repo.batch = async (operations,options) => {
    operations=operations.map(operation=>({...operation,entity:physicalEntity(operation.entity)}));
    if (repo.beforeBatch) {
      const callback = repo.beforeBatch;
      repo.beforeBatch = null;
      await callback(operations);
    }
    if (repo.failBatch) throw Error('Storage transaction failed');
    return batch(operations,options);
  };
  // Captured legacy handlers still use this method in write-fence regressions.
  repo.commit = (team, etag, attempt) => repo.batch([{ entity: team, etag }, { entity: attempt }]);
  return repo;
}

/** Run the captured legacy algorithm against explicit fixture addresses. This
 * does not provide any old-layout fallback to the production service/adapter. */
export function legacyRepository(repo,eventId) {
  const scope=partition=>partition.startsWith(eventId+'-test-')?teamScope(eventId,partition.slice(eventId.length+1)):partition;
  const entity=value=>({...value,partitionKey:scope(value.partitionKey)});
  return {
    get:async(p,r)=>{const value=await repo.get(scope(p),r);return value?{...value,partitionKey:p,rowKey:r}:null;},
    write:(value,etag)=>repo.write(entity(value),etag),
    commit:(team,etag,attempt)=>repo.batch([{entity:entity(team),etag},{entity:entity(attempt)}]),
  };
}
