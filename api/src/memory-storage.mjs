import { instrumentRepository } from './telemetry.mjs';
import { validateListFilter, validateDeleteGuard } from './storage.mjs';
/** In-memory repository adapter for local preview and isolated tests.
 * Rows are cloned on read/write; a batch validates every ETag before mutation.
 * The rows map is available for fixture seeding/inspection, not app authority.
 */
export function memoryRepository(initial=[],{allowBootstrap=false,allowLegacyBootstrap=false}={}) {
  const rows=new Map();let version=0;
  const key=(p,r)=>p+'/'+r;
  const save=entity=>rows.set(key(entity.partitionKey,entity.rowKey),structuredClone({...entity,etag:String(++version)}));
  const conflict=()=>{throw Object.assign(Error('Conflict'),{statusCode:412});};
  const check=({entity,etag})=>{const old=rows.get(key(entity.partitionKey,entity.rowKey));if(etag ? old?.etag!==etag : !!old)conflict();};
  for(const entity of initial)save(entity);
  const repo={rows,allowBootstrap,allowLegacyBootstrap,
    async get(p,r){return structuredClone(rows.get(key(p,r)) ?? null);},
    async write(entity,etag){check({entity,etag});save(entity);},
    async remove(p,r,etag){if(!etag || etag==='*')throw Error('A conditional deletion is required');const old=rows.get(key(p,r));if(!old)return;if(old.etag!==etag)conflict();rows.delete(key(p,r));},
    async batch(ops,options){
      if(new Set(ops.map(op=>op.entity.partitionKey)).size!==1)throw Error('Cross partition');
      validateDeleteGuard(ops,options);
      for(const op of ops)check(op);
      for(const {entity,remove} of ops)if(remove)rows.delete(key(entity.partitionKey,entity.rowKey));else save(entity);
    },
    async list(filter={}){
      validateListFilter(filter);
      const {rowKeyFrom,rowKeyTo,...equal}=filter;
      return structuredClone([...rows.values()].filter(row=>Object.entries(equal).every(([key,value])=>row[key]===value) && (rowKeyFrom===undefined || row.rowKey>=rowKeyFrom) && (rowKeyTo===undefined || row.rowKey<rowKeyTo)));
    },
  };
  return instrumentRepository(repo);
}
