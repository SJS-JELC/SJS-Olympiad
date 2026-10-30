export function memoryRepository(initial=[]) {
  const rows=new Map();let version=0;
  const key=(p,r)=>p+'/'+r;
  const save=entity=>rows.set(key(entity.partitionKey,entity.rowKey),structuredClone({...entity,etag:String(++version)}));
  const conflict=()=>{throw Object.assign(Error('Conflict'),{statusCode:412});};
  const check=({entity,etag})=>{const old=rows.get(key(entity.partitionKey,entity.rowKey));if(etag ? old?.etag!==etag : !!old)conflict();};
  for(const entity of initial)save(entity);
  const repo={rows,beforeBatch:null,failBatch:false,
    async get(p,r){return structuredClone(rows.get(key(p,r)) ?? null);},
    async write(entity,etag){check({entity,etag});save(entity);},
    async remove(p,r,etag){if(!etag || etag==='*')throw Error('A conditional deletion is required');const old=rows.get(key(p,r));if(!old)return;if(old.etag!==etag)conflict();rows.delete(key(p,r));},
    async batch(ops){
      if(repo.beforeBatch){const callback=repo.beforeBatch;repo.beforeBatch=null;await callback(ops);}
      if(repo.failBatch)throw Error('Storage transaction failed');
      if(new Set(ops.map(op=>op.entity.partitionKey)).size!==1)throw Error('Cross partition');
      for(const op of ops)check(op);
      for(const {entity,remove} of ops)if(remove)rows.delete(key(entity.partitionKey,entity.rowKey));else save(entity);
    },
    async commit(team,etag,attempt){return repo.batch([{entity:team,etag},{entity:attempt}]);},
    async list(filter={}){return structuredClone([...rows.values()].filter(row=>Object.entries(filter).every(([key,value])=>row[key]===value)));},
  };
  return repo;
}
